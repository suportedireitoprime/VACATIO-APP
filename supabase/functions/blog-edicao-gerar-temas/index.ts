import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, callGemini } from "../_shared/blog-edicao.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const quantidade = Math.min(Math.max(Number(body?.quantidade) || 30, 1), 60);
    const substituir = Boolean(body?.substituir);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return json({ error: "GEMINI_API_KEY ausente" }, 500);

    const prompt = `Você é editor-chefe de um blog jurídico brasileiro chamado "OAB na Risca", voltado para estudantes de Direito, concurseiros e advogados jovens.

Gere ${quantidade} temas variados e envolventes para posts do blog. Distribua ENTRE AS CINCO CATEGORIAS ABAIXO de forma equilibrada (≈20% cada):
- "Filosofia" (filosofia do direito, pensadores clássicos, ética)
- "STF" (decisões marcantes, ministros, casos históricos, jurisprudência recente)
- "Curiosidades" (curiosidades jurídicas, casos famosos, história do direito no Brasil)
- "Clássicos" (livros e autores que todo estudante de direito deveria ler)
- "Leis" (explicações sobre leis específicas, hierarquia normativa, código civil/penal/trabalhista, novidades legislativas)

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) no formato:
{
  "temas": [
    {
      "titulo": "Título persuasivo e específico (máx 90 chars)",
      "categoria": "Filosofia" | "STF" | "Curiosidades" | "Clássicos" | "Leis",
      "briefing": "1-2 frases explicando o ângulo do post e por que interessa ao estudante de direito",
      "tags": ["tag1","tag2","tag3"]
    }
  ]
}

Regras CRÍTICAS:
- Os temas serão publicados 3 por dia, então em cada bloco de 3 posts consecutivos (posições 1-2-3, 4-5-6, 7-8-9, ...) as CATEGORIAS DEVEM SER DIFERENTES. Nunca repita categoria dentro de um mesmo bloco.
- Distribua as 5 categorias de forma equilibrada ao longo dos ${quantidade} temas.
- Títulos variados: nenhum começando igual, nenhum genérico ("O que é X").
- Prefira ganchos: perguntas provocativas, casos concretos, personagens, comparações.
- Evite repetir temas dos últimos 30 dias.
- Todo o conteúdo em português do Brasil.`;

    const raw = await callGemini(geminiKey, prompt, "gemini-flash-latest", 6000, {
      functionName: "blog-edicao-gerar-temas",
      triggerType: "manual",
    });
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }
    const temas: Array<any> = Array.isArray(parsed?.temas) ? parsed.temas : [];
    if (!temas.length) return json({ error: "IA não retornou temas válidos" }, 500);

    if (substituir) {
      await supabase
        .from("blog_edicao_temas")
        .delete()
        .eq("status", "pendente");
    }

    const { data: existing } = await supabase
      .from("blog_edicao_temas")
      .select("ordem")
      .order("ordem", { ascending: false })
      .limit(1);
    const baseOrdem = existing?.[0]?.ordem ?? 0;

    const CATS_VALIDAS = ["Filosofia", "STF", "Curiosidades", "Clássicos", "Leis"];
    const normalizados = temas.map((t) => ({
      titulo_sugerido: String(t.titulo || "").slice(0, 200),
      categoria: CATS_VALIDAS.includes(t.categoria) ? t.categoria : "Curiosidades",
      resumo_briefing: String(t.briefing || "").slice(0, 500),
      tags: Array.isArray(t.tags) ? t.tags.slice(0, 6) : [],
    }));

    // Round-robin determinístico entre as categorias: garante que a fila nunca
    // fique com uma sequência de temas da mesma categoria (era o motivo de o
    // blog publicar só "Leis"). Cada bloco de 3 sai com categorias diferentes.
    const filas = new Map<string, typeof normalizados>();
    for (const cat of CATS_VALIDAS) filas.set(cat, []);
    for (const t of normalizados) filas.get(t.categoria)!.push(t);
    const intercalados: typeof normalizados = [];
    let catIdx = 0;
    while (intercalados.length < normalizados.length) {
      let avancou = false;
      for (let i = 0; i < CATS_VALIDAS.length; i++) {
        const cat = CATS_VALIDAS[(catIdx + i) % CATS_VALIDAS.length];
        const fila = filas.get(cat)!;
        if (fila.length) {
          intercalados.push(fila.shift()!);
          avancou = true;
          catIdx = (CATS_VALIDAS.indexOf(cat) + 1) % CATS_VALIDAS.length;
          break;
        }
      }
      if (!avancou) break;
    }

    const rows = intercalados.map((t, i) => ({
      ...t,
      ordem: baseOrdem + i + 1,
      status: "pendente",
    }));

    const { data: inserted, error } = await supabase
      .from("blog_edicao_temas")
      .insert(rows)
      .select();
    if (error) throw error;

    return json({ ok: true, inseridos: inserted?.length ?? 0 });
  } catch (e) {
    console.error("gerar-temas error", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});
