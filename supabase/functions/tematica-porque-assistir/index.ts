// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { geminiFetch } from "../_shared/geminiFetch.ts";
import { MODELS } from "../_shared/ai-models.ts";
import { logAiCall, detectTrigger } from "../_shared/ai-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

async function fetchWikipedia(title: string, ano: number | null): Promise<string | null> {
  // Tenta pt.wikipedia primeiro; cai para en.wikipedia.
  for (const lang of ["pt", "en"]) {
    try {
      const q = ano ? `${title} ${ano}` : title;
      const search = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*&srlimit=1`,
      );
      const sj: any = await search.json();
      const first = sj?.query?.search?.[0];
      if (!first?.title) continue;
      const summary = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(first.title)}`,
      );
      if (!summary.ok) continue;
      const sm: any = await summary.json();
      if (sm?.extract) return sm.extract as string;
    } catch {
      // ignora
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { obra_id, force } = await req.json().catch(() => ({}));
    if (!obra_id) {
      return new Response(JSON.stringify({ error: "obra_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: obra, error } = await supa
      .from("tematica_juridica_obras")
      .select("id, tipo, titulo, titulo_original, ano, sinopse, categorias_juridicas, generos, porque_assistir")
      .eq("id", obra_id)
      .maybeSingle();

    if (error || !obra) {
      return new Response(JSON.stringify({ error: "obra não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (obra.porque_assistir && !force) {
      return new Response(JSON.stringify({ porque_assistir: obra.porque_assistir, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wikiTitle = obra.titulo_original || obra.titulo;
    const wikiExtract = await fetchWikipedia(wikiTitle, obra.ano ?? null);

    const tipoLabel = obra.tipo === "movie" ? "filme" : "série";
    const categorias = (obra.categorias_juridicas ?? []).join(", ") || "temas jurídicos gerais";
    const generos = (obra.generos ?? []).join(", ");

    const prompt = `Você é um professor de Direito criando um guia de estudo para universitários brasileiros.

Sobre o ${tipoLabel} "${obra.titulo}"${obra.ano ? ` (${obra.ano})` : ""}:
- Sinopse oficial: ${obra.sinopse || "(não informada)"}
- Áreas do Direito relacionadas: ${categorias}
${generos ? `- Gêneros: ${generos}\n` : ""}${wikiExtract ? `- Contexto/enredo (Wikipedia): ${wikiExtract}\n` : ""}

Escreva um texto em português brasileiro, em Markdown, respondendo:
"Por que um estudante de Direito deveria assistir?"

Estrutura obrigatória (use exatamente estes títulos):

## Contexto da obra
Um parágrafo curto situando época, país e enredo (sem spoilers pesados).

## Temas jurídicos centrais
Lista com 4 a 6 pontos, cada item destacando um instituto jurídico, direito fundamental ou dilema ético abordado. Cite artigos, princípios ou institutos brasileiros equivalentes quando fizer sentido (ex.: art. 5º CF, contraditório, presunção de inocência, tribunal do júri, devido processo legal, etc.).

## O que o estudante ganha assistindo
Lista com 3 a 5 pontos concretos de aprendizado: raciocínio de advogado, retórica em plenário, estratégia probatória, ética profissional, etc.

## Conexão com o Direito brasileiro
2 a 4 linhas mostrando paralelos entre a obra e o ordenamento nacional (CF/88, CPP, CPC, CLT, ECA, Estatuto do Idoso — o que couber).

## Momentos-chave para observar
Lista com 2 a 4 cenas/arcos que valem pausa e reflexão (sem revelar desfechos).

Regras:
- NÃO use saudações, introduções ou "Espero ter ajudado".
- NÃO invente dados. Se não souber, omita.
- Máximo ~450 palavras.
- Não repita a sinopse literalmente.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.text}:generateContent?key=${GEMINI_KEY}`;
    const _t0 = Date.now();
    const gRes = await geminiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 900 },
      }),
    });

    if (!gRes.ok) {
      const t = await gRes.text();
      console.error("[porque-assistir] gemini erro", gRes.status, t);
      await logAiCall({ functionName: "tematica-porque-assistir", kind: "text", model: MODELS.text, triggerType: detectTrigger({ force }, req), success: false, error: t.slice(0, 200), durationMs: Date.now() - _t0, refId: obra_id });
      return new Response(JSON.stringify({ error: "IA indisponível", details: t }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gj: any = await gRes.json();
    const texto = (gj?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text ?? "")
      .join("")
      .trim();
    const usage = gj?.usageMetadata ?? {};
    await logAiCall({ functionName: "tematica-porque-assistir", kind: "text", model: MODELS.text, triggerType: detectTrigger({ force }, req), inputUnits: usage.promptTokenCount ?? 0, outputUnits: usage.candidatesTokenCount ?? 0, durationMs: Date.now() - _t0, refId: obra_id });

    if (!texto) {
      return new Response(JSON.stringify({ error: "IA retornou vazio" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supa
      .from("tematica_juridica_obras")
      .update({ porque_assistir: texto })
      .eq("id", obra_id);

    return new Response(JSON.stringify({ porque_assistir: texto, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[porque-assistir] erro", e);
    return new Response(JSON.stringify({ error: e?.message ?? "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});