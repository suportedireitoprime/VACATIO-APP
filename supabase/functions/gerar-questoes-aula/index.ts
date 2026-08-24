// Gera MUITAS questões de múltipla escolha a partir de uma aula existente.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAILS = new Set([
  "wn7corporation@gmail.com",
  "suporte.vacatio@gmail.com",
  "wn7juridico@gmail.com",
]);
const MODEL = "google/gemini-2.5-flash";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SYSTEM_PROMPT = `Você é um examinador de concursos jurídicos criando QUESTÕES de múltipla escolha para revisão de uma aula.

Recebe:
- Título e objetivo da aula
- Conteúdo integral da aula

Missão: gerar MUITAS questões cobrindo TODA a extensão do conteúdo, variando a taxonomia (definição, aplicação, exceção, exceção da exceção, comparação entre institutos, prazo/competência, jurisprudência, pegadinha de banca).

REGRAS:
- Meta: 15 a 25 questões.
- Cada questão tem EXATAMENTE 4 alternativas (a, b, c, d) e UMA correta.
- Distratores plausíveis (não invente absurdos óbvios).
- Explicação didática de POR QUE a certa acerta E POR QUE cada erra (curto para as erradas, forte na certa).
- Nunca pergunte algo que não está no conteúdo.

Devolva UM JSON:
{
  "questoes": [
    {
      "enunciado": "...",
      "opcoes": [
        { "id": "a", "texto": "..." },
        { "id": "b", "texto": "..." },
        { "id": "c", "texto": "..." },
        { "id": "d", "texto": "..." }
      ],
      "id_correto": "a|b|c|d",
      "explicacao": "3-6 frases: por que a correta acerta e por que as demais erram"
    }
  ]
}

PT-BR jurídico. Responda APENAS com o JSON.`;

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} ausente`);
  return v;
}
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = requireEnv("SUPABASE_URL");
    const SERVICE_ROLE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = requireEnv("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = requireEnv("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "não autenticado" }, 401);
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr) return json({ error: "token inválido" }, 401);
    const email = userRes?.user?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.has(email)) return json({ error: "apenas administradores" }, 403);

    const body = await req.json().catch(() => null);
    const aula_id = typeof body?.aula_id === "string" ? body.aula_id : "";
    if (!UUID_RE.test(aula_id)) return json({ error: "aula_id obrigatório" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: aula } = await admin
      .from("aprender_aulas")
      .select("id, titulo, objetivo")
      .eq("id", aula_id)
      .maybeSingle();
    if (!aula) return json({ error: "aula não encontrada" }, 404);

    const { data: blocos } = await admin
      .from("aprender_blocos")
      .select("ordem, tipo, payload")
      .eq("aula_id", aula_id)
      .order("ordem");

    const contexto = (blocos ?? [])
      .filter((b: any) => b.tipo !== "flashcard" && b.tipo !== "pergunta")
      .map((b: any) => {
        const p = b.payload || {};
        if (b.tipo === "leitura") return `${p.titulo ? `## ${p.titulo}\n` : ""}${p.conteudo || ""}`;
        if (b.tipo === "citacao") return `> ${p.texto || ""} — ${p.autor || ""}`;
        if (b.tipo === "artigo_lei") return `[${p.lei || ""} art. ${p.numero || ""}] ${p.texto || ""}`;
        if (b.tipo === "destaque") return `**${p.titulo || "Destaque"}**: ${p.texto || ""}`;
        return JSON.stringify(p).slice(0, 800);
      })
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 45000);

    const userContent = [
      `AULA: ${aula.titulo}`,
      aula.objetivo ? `OBJETIVO: ${aula.objetivo}` : "",
      "",
      "CONTEÚDO DA AULA:",
      contexto,
    ].filter(Boolean).join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      return json(
        { error: "IA falhou", status: aiRes.status, detail },
        aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502,
      );
    }
    const aiJson = await aiRes.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }
    const questoes = Array.isArray(parsed.questoes) ? parsed.questoes : [];
    if (questoes.length < 3) return json({ error: "IA retornou poucas questões", parsed }, 502);

    await admin.from("aprender_blocos").delete().eq("aula_id", aula_id).eq("tipo", "pergunta");

    const { data: maxRow } = await admin
      .from("aprender_blocos")
      .select("ordem")
      .eq("aula_id", aula_id)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    let ordem = (maxRow?.ordem ?? -1) + 1;

    const rows: any[] = [];
    for (const q of questoes) {
      const enunciado = String(q?.enunciado || "").trim();
      const opcoes = Array.isArray(q?.opcoes) ? q.opcoes : [];
      const idCorreto = String(q?.id_correto || "").toLowerCase();
      if (!enunciado || opcoes.length < 2 || !idCorreto) continue;
      const opcoesClean = opcoes
        .map((o: any) => ({ id: String(o?.id || "").toLowerCase(), texto: String(o?.texto || "").trim() }))
        .filter((o: any) => o.id && o.texto);
      if (!opcoesClean.some((o: any) => o.id === idCorreto)) continue;
      rows.push({
        aula_id,
        ordem: ordem++,
        tipo: "pergunta",
        payload: { enunciado, opcoes: opcoesClean },
        resposta_correta: { id_correto: idCorreto, explicacao: String(q?.explicacao || "").trim() },
        markdown: null,
      });
    }

    if (rows.length > 0) {
      const { error: iErr } = await admin.from("aprender_blocos").insert(rows);
      if (iErr) throw iErr;
    }

    return json({ ok: true, total: rows.length });
  } catch (e: any) {
    console.error("[gerar-questoes-aula]", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
