import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { geminiFetch } from "../_shared/geminiFetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_API_KEY_RESERVA = Deno.env.get("GEMINI_API_KEY_RESERVA") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function resolveLeiId(tabelaNome: string): Promise<string | null> {
  const parts = tabelaNome.split("_");
  const head = (parts[0] || "").toLowerCase();
  const tail = parts.slice(1).join("-").toLowerCase();
  const headNoDigits = head.replace(/\d+$/, "");
  const candidates = Array.from(
    new Set(
      [
        tabelaNome.toLowerCase(),
        head,
        headNoDigits,
        tail,
        tail ? `estatuto-${tail.replace(/^estatuto-?/, "")}` : "",
      ].filter(Boolean),
    ),
  );

  const { data } = await supabase
    .from("vade_mecum_leis")
    .select("id, slug")
    .in("slug", candidates)
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function fetchArticleText(
  tabelaNome: string,
  artigoNumero: string,
): Promise<string> {
  const leiId = await resolveLeiId(tabelaNome);
  if (!leiId) throw new Error(`Lei não encontrada para tabela: ${tabelaNome}`);

  const normalized = String(artigoNumero)
    .replace(/^art\.?\s*/i, "")
    .trim();
  const withoutOrdinal = normalized.replace(/[º°]$/, "").trim();
  const candidates = Array.from(
    new Set(
      [
        String(artigoNumero).trim(),
        normalized,
        withoutOrdinal,
        `${normalized}º`,
        `${withoutOrdinal}º`,
      ].filter(Boolean),
    ),
  );

  const { data, error } = await supabase
    .from("vade_mecum_artigos")
    .select("numero, texto, epigrafe")
    .eq("lei_id", leiId)
    .in("numero", candidates)
    .order("ordem", { ascending: true })
    .limit(1);

  const row = data?.[0];
  if (error || !row)
    throw new Error(`Artigo não encontrado: ${tabelaNome}.${artigoNumero}`);

  let text = `Art. ${row.numero}`;
  if (row.epigrafe) text += ` — ${row.epigrafe}`;
  text += `\n${row.texto || ""}`;
  return text;
}

async function callAi(prompt: string): Promise<string> {
  const model = "gemini-flash-latest";
  const keys = [GEMINI_API_KEY, GEMINI_API_KEY_RESERVA].filter(Boolean);

  // 1. Tenta Gemini (Principal e Reserva)
  for (const key of keys) {
    try {
      const res = await geminiFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 16384,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (res.ok) {
        const json = await res.json();
        const raw =
          json?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part.text ?? "")
            .join("")
            .trim() ?? "";
        if (raw) return raw;
      }
    } catch (_e) {
      // continua para fallback
    }
  }

  // 2. Tenta Lovable Gateway
  if (LOVABLE_API_KEY) {
    try {
      const resp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Lovable-API-Key": LOVABLE_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Você é um jurista e professor de Direito. Retorne exclusivamente JSON estrito.",
              },
              { role: "user", content: prompt },
            ],
          }),
        },
      );
      if (resp.ok) {
        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content ?? "";
        if (text) return text;
      }
    } catch (_e) {
      // continua para fallback
    }
  }

  throw new Error("Provedores de IA indisponíveis no momento");
}

function extractJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const hasArray = cleaned.includes("[");
  const hasObj = cleaned.includes("{");
  const startChar =
    hasArray && (!hasObj || cleaned.indexOf("[") < cleaned.indexOf("{"))
      ? "["
      : "{";
  const start = cleaned.indexOf(startChar);
  const end =
    startChar === "[" ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      "Não foi possível extrair JSON da resposta: " + raw.slice(0, 300),
    );
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function gerarQuestoesFallback(artigoNum: string, texto: string, lei: string) {
  const clean = texto.replace(/\n+/g, " ").trim();
  const trecho =
    clean.slice(0, 160) || `O artigo estabelece preceito vinculante aplicável.`;

  const qList = [
    {
      tipo: "multipla_escolha",
      dispositivo: "Caput",
      enunciado: `Em conformidade expressa com o caput do Art. ${artigoNum} de ${lei}, assinale a afirmativa correta:`,
      alternativas: {
        A: `${trecho}.`,
        B: "A eficácia do dispositivo é meramente opinativa, inexistindo vinculação prática.",
        C: "A aplicação da norma depende de anuência discricionária e expressa de terceiro.",
        D: "A regra foi tacitamente revogada sem qualquer subsistência de seus comandos.",
      },
      gabarito: "A",
      comentario: `Correta a alternativa A. Reflete o núcleo normativo expressamente estipulado no dispositivo.`,
      exemplo_pratico:
        "Aplicação imediata em caso concreto regulado pelo diploma legal.",
    },
    {
      tipo: "multipla_escolha",
      dispositivo: "Hermenêutica e Eficácia",
      enunciado: `Diante da interpretação sistemática do Art. ${artigoNum}, é correto afirmar que:`,
      alternativas: {
        A: "As normas expressas no dispositivo gozam de imperatividade e aplicação obrigatória.",
        B: "O particular pode dispensar a incidência da norma de ordem pública por convenção tácita.",
        C: "O comando só produz efeitos após dez anos da sua promulgação legislativa.",
        D: "A regra é de aplicação restrita aos litigantes formalmente cadastrados.",
      },
      gabarito: "A",
      comentario: `Correta a alternativa A. Pelo princípio da legalidade, a norma tem eficácia vinculante aos destinatários da jurisdição.`,
      exemplo_pratico:
        "Respeito ao princípio da legalidade nas relações jurídicas.",
    },
    {
      tipo: "multipla_escolha",
      dispositivo: "Caso Prático",
      enunciado: `Em situação fática submetida a julgamento envolvendo o Art. ${artigoNum}, uma das partes sustenta que a regra legal não se aplica por simples conveniência. Nessa hipótese:`,
      alternativas: {
        A: "A alegação não procede, pois a norma jurídica cogente vincula os atos sob sua regência.",
        B: "A alegação procede integralmente, afastando a lei de plano.",
        C: "A controvérsia deve ser anulada sem resolução de mérito.",
        D: "A lei perde eficácia automática caso haja discordância unilateral.",
      },
      gabarito: "A",
      comentario: `Correta a alternativa A. A cogência da legislação impede seu afastamento discricionário desprovido de suporte legal.`,
      exemplo_pratico:
        "Atuação de órgãos públicos e privados em conformidade com o regramento.",
    },
    {
      tipo: "multipla_escolha",
      dispositivo: "Requisitos de Validade",
      enunciado: `Quanto aos pressupostos de incidência do Art. ${artigoNum}, assinale a opção verdadeira:`,
      alternativas: {
        A: "A subsunção jurídica exige a presença dos elementos e suporte fático previstos na norma.",
        B: "A aplicação do artigo independe de qualquer correlação fática.",
        C: "Apenas entidades estatais estão subordinadas às regras do diploma.",
        D: "Exige dolo específico em toda e qualquer modalidade de incidência.",
      },
      gabarito: "A",
      comentario: `Correta a alternativa A. A correlação necessária entre fato e norma fundamenta a eficácia legal.`,
      exemplo_pratico:
        "Constatação dos requisitos fáticos antes de exigir a obrigação.",
    },
    {
      tipo: "multipla_escolha",
      dispositivo: "Exceções e Alcance",
      enunciado: `Eventuais exceções e ressalvas contidas no Art. ${artigoNum} devem ser interpretadas:`,
      alternativas: {
        A: "Estritamente, nos limites expressos pela legislação, vedada a ampliação restritiva de direitos.",
        B: "Extensivamente para alcançar hipóteses arbitrárias não contempladas.",
        C: "Como revogação tácita de todo o capítulo em que se insere.",
        D: "Apenas se houver decisão unânime de tribunal superior.",
      },
      gabarito: "A",
      comentario: `Correta a alternativa A. É cânone fundamental de hermenêutica que normas de exceção interpretam-se estritamente.`,
      exemplo_pratico:
        "Análise restrita de hipóteses de isenção ou impedimento.",
    },
  ];

  return qList;
}

function gerarFlashcardsFallback(
  artigoNum: string,
  texto: string,
  lei: string,
) {
  const clean = texto.replace(/\n+/g, " ").trim();
  const trecho =
    clean.slice(0, 180) || `Preceito do Art. ${artigoNum} de ${lei}.`;

  return [
    {
      frente: `Qual é o preceito central do Art. ${artigoNum} da ${lei}?`,
      verso: `${trecho}.`,
      exemplo_pratico: `No cotidiano jurídico, esse comando orienta a correta aplicação dos deveres e prerrogativas estabelecidos.`,
    },
    {
      frente: `Qual é a natureza jurídica dos comandos do Art. ${artigoNum}?`,
      verso: `Trata-se de norma de eficácia direta e imperativa, integrando o arcabouço normativo vigente.`,
      exemplo_pratico: `Um advogado invoca a regra em petição inicial para comprovar o direito subjetivo da parte.`,
    },
    {
      frente: `É admitido afastar o Art. ${artigoNum} por simples acordo tácito?`,
      verso: `Não. As normas cogentes e de ordem pública prevalecem sobre estipulações particulares contrárias.`,
      exemplo_pratico: `Um contrato que contrarie diretamente o dispositivo legal é considerado nulo ou ineficaz nessa cláusula.`,
    },
    {
      frente: `Como devem ser interpretadas eventuais exceções previstas no Art. ${artigoNum}?`,
      verso: `De forma estrita (regra geral de hermenêutica), não cabendo interpretação extensiva para restringir direitos.`,
      exemplo_pratico: `O magistrado aplica a exceção tão somente aos casos que se enquadrem com exatidão na hipótese legal.`,
    },
    {
      frente: `A quem se aplicam as disposições do Art. ${artigoNum}?`,
      verso: `A todos os destinatários e relações jurídicas abrangidos pelo âmbito de incidência da ${lei}.`,
      exemplo_pratico: `Empresas, cidadãos e poder público devem pautar suas condutas nos limites normativos do artigo.`,
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { tabela_nome, artigo_numero, mode, artigo_texto, lei_nome } = body;
    if (!tabela_nome || !artigo_numero || !mode) {
      return new Response(
        JSON.stringify({
          error: "Parâmetros obrigatórios: tabela_nome, artigo_numero, mode",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const numLimpo =
      String(artigo_numero)
        .replace(/^[^\d]*/, "")
        .trim() || String(artigo_numero);
    const friendlyLei = lei_nome || tabela_nome;

    // 1. Verifica cache no Supabase primeiro
    if (mode === "mapa_mental") {
      const { data: cached } = await supabase
        .from("artigo_ai_cache")
        .select("conteudo")
        .eq("tabela_nome", tabela_nome)
        .eq("artigo_numero", numLimpo)
        .eq("modo", "mapa_mental")
        .maybeSingle();

      if (cached?.conteudo) {
        try {
          const parsed = JSON.parse(cached.conteudo);
          return new Response(JSON.stringify({ data: parsed, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {}
      }
    } else {
      const cacheTable =
        mode === "questoes" || mode === "licoes"
          ? "study_questions"
          : "study_flashcards";
      const cacheCol =
        mode === "questoes" || mode === "licoes" ? "questions" : "cards";

      const { data: cached } = await supabase
        .from(cacheTable)
        .select(cacheCol)
        .eq("tabela_nome", tabela_nome)
        .eq("artigo_numero", numLimpo)
        .limit(1)
        .maybeSingle();

      if (cached?.[cacheCol]) {
        return new Response(
          JSON.stringify({ data: cached[cacheCol], cached: true }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // 2. Obtém texto do artigo com resiliência total
    let articleText = (artigo_texto || "").trim();
    if (!articleText) {
      try {
        articleText = await fetchArticleText(tabela_nome, numLimpo);
      } catch (_e) {
        try {
          const { data: rows } = await supabase
            .from(tabela_nome)
            .select("texto, caput, numero")
            .or(
              `numero.eq.${numLimpo},numero.eq.Art. ${numLimpo},numero.eq.${artigo_numero}`,
            )
            .limit(1);
          if (rows?.[0]) {
            articleText = `Art. ${rows[0].numero}\n${
              rows[0].texto || rows[0].caput || ""
            }`;
          }
        } catch {}
      }
    }

    if (!articleText) {
      articleText = `Art. ${numLimpo} da legislação ${friendlyLei}`;
    }

    // 3. Monta prompt para geração
    let prompt: string;
    if (mode === "questoes" || mode === "licoes") {
      prompt = `Você é um jurista e professor de Direito sênior (padrão OAB e concursos). Com base no artigo abaixo, gere exatamente 10 questões didáticas comentadas de múltipla escolha.

RETORNE EXCLUSIVAMENTE UM ARRAY JSON com objetos contendo:
- "tipo": "multipla_escolha"
- "dispositivo": parte testada (ex: "Caput", "§ 1º")
- "enunciado": texto claro da questão
- "alternativas": objeto com chaves "A", "B", "C", "D"
- "gabarito": letra correta ("A", "B", "C" ou "D")
- "comentario": fundamentação detalhada do gabarito
- "exemplo_pratico": caso concreto ilustrativo

LEGISLAÇÃO: ${friendlyLei}
ARTIGO:
${articleText}`;
    } else if (mode === "mapa_mental") {
      prompt = `Você é um professor de Direito brasileiro especialista em mapas mentais. Com base no artigo abaixo, gere um mapa mental hierárquico em JSON:
{
  "label": "Art. ${numLimpo} - Resumo",
  "explicacao": "Breve explicação do artigo (1-2 frases)",
  "exemplo": "Exemplo prático concreto",
  "children": [
    {
      "label": "Conceito 1",
      "explicacao": "Explicação curta",
      "exemplo": "Exemplo",
      "children": []
    }
  ]
}

ARTIGO:
${articleText}`;
    } else {
      prompt = `Você é um jurista e professor de Direito. Com base no artigo abaixo, gere exatamente entre 8 e 15 flashcards de alto rendimento para memorização e fixação da lei.

RETORNE EXCLUSIVAMENTE UM ARRAY JSON com objetos contendo:
- "frente": pergunta ou conceito direto
- "verso": resposta fundamentada no texto da lei
- "exemplo_pratico": caso hipotético concreto

LEGISLAÇÃO: ${friendlyLei}
ARTIGO:
${articleText}`;
    }

    let parsed: any = null;
    try {
      const raw = await callAi(prompt);
      parsed = extractJson(raw);
    } catch (_aiErr) {
      // Fallback robusto garantido: nunca deixa a tela do aluno sem questões/cards
      if (mode === "questoes" || mode === "licoes") {
        parsed = gerarQuestoesFallback(numLimpo, articleText, friendlyLei);
      } else if (mode === "flashcards") {
        parsed = gerarFlashcardsFallback(numLimpo, articleText, friendlyLei);
      } else {
        parsed = {
          label: `Art. ${numLimpo} - Síntese`,
          explicacao: `Regramento geral previsto no Art. ${numLimpo} de ${friendlyLei}.`,
          exemplo: `Aplicação prática do dispositivo legal.`,
          children: [
            {
              label: "Núcleo da Norma",
              explicacao: "Comando principal da lei",
              exemplo: "Caso concreto",
              children: [],
            },
            {
              label: "Eficácia e Aplicação",
              explicacao: "Vinculação direta às partes",
              exemplo: "Observância obrigatória",
              children: [],
            },
          ],
        };
      }
    }

    // 4. Salva no cache do Supabase
    try {
      if (mode === "mapa_mental") {
        await supabase.from("artigo_ai_cache").upsert(
          {
            tabela_nome,
            artigo_numero: numLimpo,
            modo: "mapa_mental",
            conteudo: JSON.stringify(parsed),
          },
          { onConflict: "tabela_nome,artigo_numero,modo" },
        );
      } else {
        const cacheTable =
          mode === "questoes" || mode === "licoes"
            ? "study_questions"
            : "study_flashcards";
        const cacheCol =
          mode === "questoes" || mode === "licoes" ? "questions" : "cards";
        await supabase.from(cacheTable).upsert(
          {
            tabela_nome,
            artigo_numero: numLimpo,
            [cacheCol]: parsed,
          },
          { onConflict: "tabela_nome,artigo_numero" },
        );
      }
    } catch (_saveErr) {
      console.warn("Aviso ao salvar cache no Supabase:", _saveErr);
    }

    return new Response(JSON.stringify({ data: parsed, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("gerar-estudo error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
