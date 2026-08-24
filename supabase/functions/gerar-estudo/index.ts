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

async function resolveLeiId(tabelaNome: string): Promise<string | null> {
  // Slug candidates derived from legacy tabela_nome (ex.: EI_ESTATUTO_IDOSO)
  const parts = tabelaNome.split("_");
  const head = (parts[0] || "").toLowerCase();
  const tail = parts.slice(1).join("-").toLowerCase();
  const headNoDigits = head.replace(/\d+$/, "");
  const candidates = Array.from(new Set([
    tabelaNome.toLowerCase(),
    head,
    headNoDigits,
    tail,
    tail ? `estatuto-${tail.replace(/^estatuto-?/, "")}` : "",
  ].filter(Boolean)));

  const { data } = await supabase
    .from("vade_mecum_leis")
    .select("id, slug")
    .in("slug", candidates)
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function fetchArticleText(tabelaNome: string, artigoNumero: string): Promise<string> {
  const leiId = await resolveLeiId(tabelaNome);
  if (!leiId) throw new Error(`Lei não encontrada para tabela: ${tabelaNome}`);

  const normalized = artigoNumero.replace(/^art\.?\s*/i, "").trim();
  const withoutOrdinal = normalized.replace(/[º°]$/, "").trim();
  const candidates = Array.from(new Set([
    artigoNumero.trim(),
    normalized,
    withoutOrdinal,
    `${normalized}º`,
    `${withoutOrdinal}º`,
  ].filter(Boolean)));

  const { data, error } = await supabase
    .from("vade_mecum_artigos")
    .select("numero, texto, epigrafe")
    .eq("lei_id", leiId)
    .in("numero", candidates)
    .order("ordem", { ascending: true })
    .limit(1);

  const row = data?.[0];
  if (error || !row) throw new Error(`Artigo não encontrado: ${tabelaNome}.${artigoNumero} (tentou: ${candidates.join(", ")})`);

  let text = `Art. ${row.numero}`;
  if (row.epigrafe) text += ` — ${row.epigrafe}`;
  text += `\n${row.texto || ""}`;
  return text;
}

async function callGemini(prompt: string): Promise<string> {
  const { logAiCall } = await import("../_shared/ai-log.ts");
  const model = "gemini-flash-latest";
  const keys = [GEMINI_API_KEY].filter(Boolean);
  const startedAt = Date.now();
  let success = true, errMsg: string | undefined;
  let inputUnits = 0, outputUnits = 0;
  try {
    for (const key of keys) {
      const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
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

      if (res.status === 429) {
        console.warn("Gemini 429, trying fallback key...");
        continue;
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(`Erro Gemini ${res.status}: ${JSON.stringify(json).slice(0, 1000)}`);
      }

      inputUnits  = Number(json?.usageMetadata?.promptTokenCount ?? 0) || 0;
      outputUnits = Number(json?.usageMetadata?.candidatesTokenCount ?? 0) || 0;

      const raw = json?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("")
        .trim() ?? "";

      if (!raw) {
        throw new Error(`IA retornou resposta vazia: ${JSON.stringify(json).slice(0, 1000)}`);
      }

      return raw;
    }
    throw new Error("Todas as chaves Gemini falharam");
  } catch (e) {
    success = false;
    errMsg = String((e as Error)?.message ?? e).slice(0, 500);
    throw e;
  } finally {
    await logAiCall({
      functionName: "gerar-estudo",
      kind: "text",
      model,
      triggerType: "manual",
      inputUnits, outputUnits,
      durationMs: Date.now() - startedAt,
      success, error: errMsg,
    });
  }

  throw new Error("All Gemini API keys exhausted (rate limited)");
}

function extractJson(raw: string): unknown {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const hasArray = cleaned.includes("[");
  const hasObj = cleaned.includes("{");
  const startChar = hasArray && (!hasObj || cleaned.indexOf("[") < cleaned.indexOf("{")) ? "[" : "{";
  const start = cleaned.indexOf(startChar);
  const end = startChar === "[" ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Não foi possível extrair JSON da resposta da IA: " + raw.slice(0, 300));
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tabela_nome, artigo_numero, mode } = await req.json();
    if (!tabela_nome || !artigo_numero || !mode) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios: tabela_nome, artigo_numero, mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // For mapa_mental, use artigo_ai_cache; for others use study_questions/study_flashcards
    if (mode === "mapa_mental") {
      const { data: cached } = await supabase
        .from("artigo_ai_cache")
        .select("conteudo")
        .eq("tabela_nome", tabela_nome)
        .eq("artigo_numero", artigo_numero)
        .eq("modo", "mapa_mental")
        .maybeSingle();

      if (cached?.conteudo) {
        try {
          const parsed = JSON.parse(cached.conteudo);
          return new Response(JSON.stringify({ data: parsed, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch {}
      }
    } else {
      const cacheTable = mode === "questoes" ? "study_questions" : "study_flashcards";
      const cacheCol = mode === "questoes" ? "questions" : "cards";
      const { data: cached } = await supabase
        .from(cacheTable)
        .select(cacheCol)
        .eq("tabela_nome", tabela_nome)
        .eq("artigo_numero", artigo_numero)
        .limit(1)
        .maybeSingle();

      if (cached?.[cacheCol]) {
        return new Response(JSON.stringify({ data: cached[cacheCol], cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Fetch article text
    const articleText = await fetchArticleText(tabela_nome, artigo_numero);

    let prompt: string;
    if (mode === "questoes") {
      prompt = `Você é um professor de Direito brasileiro. Com base no artigo de lei abaixo, gere EXATAMENTE 40 questões distribuídas em 6 tipos diferentes. Retorne um array JSON com objetos, cada um tendo um campo "tipo" que identifica o tipo.

## TIPOS E QUANTIDADES:

### 1. "multipla_escolha" (8 questões)
Campos: tipo, enunciado, alternativas (objeto {A,B,C,D}), gabarito (letra), comentario, exemplo_pratico

### 2. "certo_errado" (8 questões)
Uma afirmação que o aluno marca CERTO ou ERRADO.
Campos: tipo, afirmacao, gabarito ("certo" ou "errado"), comentario, exemplo_pratico

### 3. "completar_palavra" (8 questões)
Dá duas palavras/expressões e o aluno escolhe qual completa corretamente a frase.
Campos: tipo, frase (com "___" no lugar da lacuna), opcao_a, opcao_b, gabarito ("a" ou "b"), comentario, exemplo_pratico

### 4. "preencher_lacuna" (6 questões)
Uma frase do artigo com uma palavra-chave removida. O aluno deve digitar a palavra correta.
Campos: tipo, frase (com "___"), resposta (a palavra correta), dica (uma dica curta), comentario

### 5. "associar_colunas" (5 questões)
Ligar conceitos (coluna A) com definições (coluna B). Cada questão tem 3-4 pares.
Campos: tipo, pares (array de {conceito, definicao}), comentario
Os pares já devem vir na ordem correta; o frontend embaralha a coluna B.

### 6. "ordenar_itens" (5 questões)
Colocar incisos, etapas ou elementos na ordem correta.
Campos: tipo, enunciado, itens (array de strings NA ORDEM CORRETA), comentario
O frontend embaralha os itens; o aluno reordena.

Cubra TODOS os incisos, parágrafos e alíneas do artigo. Retorne APENAS um array JSON válido.

ARTIGO:
${articleText}`;
    } else if (mode === "mapa_mental") {
      prompt = `Você é um professor de Direito brasileiro especialista em mapas mentais didáticos. Com base no artigo de lei abaixo, gere um mapa mental hierárquico completo.

Retorne um objeto JSON com a seguinte estrutura:
{
  "label": "Art. X - Título resumido",
  "explicacao": "Breve explicação do artigo inteiro (1-2 frases)",
  "exemplo": "Exemplo prático do artigo no dia a dia",
  "children": [
    {
      "label": "Conceito-chave 1",
      "explicacao": "Explicação curta deste conceito (1 frase)",
      "exemplo": "Exemplo prático deste conceito",
      "children": [
        { "label": "Detalhe A", "explicacao": "Explicação do detalhe", "exemplo": "Exemplo prático" }
      ]
    }
  ]
}

## REGRAS:
1. O nó raiz deve conter o número do artigo e um resumo curto (max 8 palavras)
2. Os ramos de primeiro nível devem ser os CONCEITOS PRINCIPAIS do artigo (3-7 ramos)
3. Cada ramo pode ter sub-ramos com detalhes, incisos, parágrafos ou exemplos
4. Use linguagem curta e direta no "label" de cada nó (max 12 palavras)
5. TODOS os nós devem ter "explicacao" (1 frase explicativa) e "exemplo" (caso prático concreto)
6. Cubra TODOS os incisos, parágrafos e alíneas do artigo
7. Inclua um ramo "Palavras-chave" com os termos jurídicos importantes
8. Se houver exceções ou ressalvas, crie um ramo específico para elas
9. Profundidade máxima: 4 níveis

Retorne APENAS o objeto JSON válido, sem texto antes ou depois.

ARTIGO:
${articleText}`;
    } else {
      prompt = `Você é um professor de Direito brasileiro. Com base no artigo de lei abaixo, gere entre 10 e 25 flashcards para estudo. Gere mais flashcards para artigos mais longos, cobrindo TODOS os incisos, parágrafos e alíneas.

Para cada flashcard inclua:
- "frente": o conceito, pergunta ou termo jurídico (curto e direto)
- "verso": a resposta completa com o fundamento legal
- "exemplo_pratico": um caso concreto do dia a dia que ilustra o conceito

Retorne APENAS um array JSON válido. Sem texto antes ou depois.

ARTIGO:
${articleText}`;
    }

    const raw = await callGemini(prompt);
    const parsed = extractJson(raw);

    // Save to cache
    if (mode === "mapa_mental") {
      await supabase.from("artigo_ai_cache").upsert({
        tabela_nome,
        artigo_numero,
        modo: "mapa_mental",
        conteudo: JSON.stringify(parsed),
      }, { onConflict: "tabela_nome,artigo_numero,modo" });
    } else {
      const cacheTable = mode === "questoes" ? "study_questions" : "study_flashcards";
      const cacheCol = mode === "questoes" ? "questions" : "cards";
      await supabase.from(cacheTable).upsert({
        tabela_nome,
        artigo_numero,
        [cacheCol]: parsed,
      }, { onConflict: "tabela_nome,artigo_numero" });
    }

    return new Response(JSON.stringify({ data: parsed, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("gerar-estudo error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
