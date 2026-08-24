import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { geminiFetch } from "../_shared/geminiFetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchArticleText(tabelaNome: string, artigoNumero: string): Promise<string> {
  const normalized = artigoNumero.replace(/^art\.?\s*/i, "").trim();
  const withoutOrdinal = normalized.replace(/[º°]$/, "").trim();

  const candidates = Array.from(new Set([
    artigoNumero.trim(),
    normalized,
    withoutOrdinal,
    `Art. ${normalized}`,
    `Art ${normalized}`,
    `Art. ${withoutOrdinal}`,
  ].filter(Boolean)));

  const { data, error } = await supabase
    .from(tabelaNome)
    .select("numero, caput, texto, incisos, paragrafos, rotulo, capitulo, titulo")
    .in("numero", candidates)
    .order("ordem_numero", { ascending: true })
    .limit(1);

  const row = data?.[0];
  if (error || !row) throw new Error(`Artigo não encontrado: ${tabelaNome}.${artigoNumero}`);

  let text = `${row.numero}`;
  if (row.rotulo) text += ` (${row.rotulo})`;
  text += `\n${row.caput || row.texto}`;
  if (row.incisos?.length) text += "\n" + row.incisos.join("\n");
  if (row.paragrafos?.length) text += "\n" + row.paragrafos.join("\n");
  return text;
}

async function callGemini(prompt: string): Promise<string> {
  const { logAiCall } = await import("../_shared/ai-log.ts");
  const model = "gemini-flash-latest";
  const startedAt = Date.now();
  let success = true, errMsg: string | undefined;
  let inputUnits = 0, outputUnits = 0;
  try {
    const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const json = await res.json();
    if (!res.ok) throw new Error(`Erro Gemini ${res.status}: ${JSON.stringify(json).slice(0, 1000)}`);

    inputUnits  = Number(json?.usageMetadata?.promptTokenCount ?? 0) || 0;
    outputUnits = Number(json?.usageMetadata?.candidatesTokenCount ?? 0) || 0;

    const raw = json?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim() ?? "";

    if (!raw) throw new Error(`IA retornou resposta vazia`);
    return raw;
  } catch (e) {
    success = false;
    errMsg = String((e as Error)?.message ?? e).slice(0, 500);
    throw e;
  } finally {
    await logAiCall({
      functionName: "gerar-resumo",
      kind: "text",
      model,
      triggerType: "manual",
      inputUnits, outputUnits,
      durationMs: Date.now() - startedAt,
      success, error: errMsg,
    });
  }
}

function extractJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("JSON inválido");
  return JSON.parse(cleaned.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tabela_nome, artigo_numero, tipo } = await req.json();
    if (!tabela_nome || !artigo_numero || !tipo) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios: tabela_nome, artigo_numero, tipo (cornell ou feynman)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!["cornell", "feynman"].includes(tipo)) {
      return new Response(JSON.stringify({ error: "tipo deve ser 'cornell' ou 'feynman'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const modo = `resumo_${tipo}`;

    // Check cache
    const { data: cached } = await supabase
      .from("artigo_ai_cache")
      .select("conteudo")
      .eq("tabela_nome", tabela_nome)
      .eq("artigo_numero", artigo_numero)
      .eq("modo", modo)
      .maybeSingle();

    if (cached?.conteudo) {
      try {
        const parsed = JSON.parse(cached.conteudo);
        return new Response(JSON.stringify({ data: parsed, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {}
    }

    const articleText = await fetchArticleText(tabela_nome, artigo_numero);

    let prompt: string;

    if (tipo === "cornell") {
      prompt = `Você é um professor de Direito brasileiro especialista no Método Cornell de anotações. Com base no artigo de lei abaixo, crie um resumo completo no formato Cornell.

Retorne um objeto JSON com esta estrutura EXATA:
{
  "titulo": "Art. X - Título resumido do artigo",
  "palavras_chave": ["palavra1", "palavra2", "palavra3", ...],
  "perguntas": [
    { "pergunta": "Pergunta 1?", "resposta": "Resposta detalhada da pergunta 1..." },
    { "pergunta": "Pergunta 2?", "resposta": "Resposta detalhada da pergunta 2..." }
  ],
  "anotacoes": [
    { "topico": "Tópico 1", "conteudo": "Explicação detalhada do tópico..." },
    { "topico": "Tópico 2", "conteudo": "Explicação detalhada..." }
  ],
  "resumo_geral": "Resumo consolidado de todo o artigo em 2-3 frases."
}

## REGRAS:
1. Gere entre 5 e 10 palavras-chave relevantes
2. Gere entre 5 e 8 perguntas que cubram todos os aspectos do artigo
3. CADA PERGUNTA DEVE TER SUA RESPOSTA DETALHADA (mínimo 2 frases por resposta)
4. Gere uma anotação detalhada para CADA palavra-chave listada. O tópico da anotação deve ser a própria palavra-chave. O número de anotações deve ser igual ao número de palavras-chave.
5. Cada anotação deve ter explicação detalhada com exemplos práticos
6. O resumo geral deve ser conciso mas abrangente
7. Use linguagem clara e acessível

ARTIGO:
${articleText}`;
    } else {
      prompt = `Você é um professor de Direito brasileiro especialista na Técnica Feynman de aprendizado. Com base no artigo de lei abaixo, crie um resumo usando a Técnica Feynman (explicar como se ensinasse a uma criança).

Retorne um objeto JSON com esta estrutura EXATA:
{
  "titulo": "Art. X - Título resumido do artigo",
  "conceito": "Descrição objetiva do que este artigo estabelece (1-2 frases)",
  "explicacao_simples": "Explicação do artigo inteiro em linguagem ultra simples, como se explicasse para uma criança de 10 anos. Use analogias do cotidiano, exemplos concretos. Seja detalhado (mínimo 150 palavras).",
  "lacunas": ["Ponto difícil 1 que costuma confundir", "Ponto difícil 2", ...],
  "analogia": "Uma analogia completa comparando o artigo com algo do cotidiano (ex: condomínio, escola, família). Mínimo 100 palavras.",
  "pontos_chave": ["Ponto-chave 1", "Ponto-chave 2", ...]
}

## REGRAS:
1. A explicação simples deve ser como uma conversa informal, sem juridiquês
2. Cubra TODOS os incisos, parágrafos e alíneas na explicação
3. Identifique 3-5 lacunas/pontos confusos comuns
4. A analogia deve ser criativa e memorável
5. Liste 4-8 pontos-chave para revisão rápida
6. Use exemplos do dia a dia brasileiro
7. Use **negrito** (markdown) para destacar termos jurídicos importantes, conceitos-chave e palavras essenciais ao longo de toda a explicação_simples e analogia. Exemplo: "O **Estado Democrático de Direito** significa que..."
8. Quebre a explicacao_simples e a analogia em parágrafos com \\n\\n para facilitar a leitura

ARTIGO:
${articleText}`;
    }

    const raw = await callGemini(prompt);
    const parsed = extractJson(raw);

    // Save to cache
    await supabase.from("artigo_ai_cache").upsert({
      tabela_nome,
      artigo_numero,
      modo,
      conteudo: JSON.stringify(parsed),
    }, { onConflict: "tabela_nome,artigo_numero,modo" });

    return new Response(JSON.stringify({ data: parsed, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("gerar-resumo error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
