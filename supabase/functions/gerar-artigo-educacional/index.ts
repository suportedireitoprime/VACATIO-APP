import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { geminiFetch } from "../_shared/geminiFetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, titulo, categoria } = await req.json();
    if (!slug || !titulo) {
      return new Response(JSON.stringify({ error: "slug e titulo obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const { data: cached } = await supabase
      .from("artigo_educacional_cache")
      .select("conteudo_md, fontes")
      .eq("slug", slug)
      .maybeSingle();

    if (cached?.conteudo_md) {
      return new Response(JSON.stringify({
        conteudo_md: cached.conteudo_md,
        fontes: cached.fontes || [],
        from_cache: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Perplexity search for sources
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    let searchContent = "";
    let citations: string[] = [];

    if (perplexityKey) {
      try {
        const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${perplexityKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              {
                role: "system",
                content: "Você é um pesquisador jurídico brasileiro especialista. Forneça informações detalhadas, precisas e atualizadas sobre o tema solicitado, citando fontes confiáveis como legislação, doutrina e jurisprudência brasileiras.",
              },
              {
                role: "user",
                content: `Pesquise sobre "${titulo}" no contexto do direito brasileiro. Categoria: ${categoria}. Forneça informações completas incluindo: conceito, fundamento legal, exemplos práticos, jurisprudência relevante e referências doutrinárias.`,
              },
            ],
          }),
        });

        if (perplexityRes.ok) {
          const perplexityData = await perplexityRes.json();
          searchContent = perplexityData.choices?.[0]?.message?.content || "";
          citations = perplexityData.citations || [];
        }
      } catch (e) {
        console.error("Perplexity error:", e);
      }
    }

    // Step 2: Gemini generates structured article
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextBlock = searchContent
      ? `\n\n## Pesquisa de Fontes (use como base factual):\n${searchContent}\n\nFontes encontradas:\n${citations.map((c, i) => `[${i + 1}] ${c}`).join("\n")}`
      : "";

    const geminiRes = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Você é um professor de Direito brasileiro renomado escrevendo um artigo educacional completo e acessível.

TÍTULO DO ARTIGO: "${titulo}"
CATEGORIA: ${categoria}
${contextBlock}

INSTRUÇÕES OBRIGATÓRIAS:
1. Escreva em Markdown estruturado com hierarquia clara (## para seções, ### para subseções)
2. Use linguagem acessível mas tecnicamente precisa
3. Inclua tabelas comparativas quando houver conceitos para comparar
4. Adicione exemplos práticos do dia a dia
5. Cite os artigos de lei relevantes (ex: "Art. 5º da CF/88")
6. Inclua uma seção "Na Prática" com situações reais
7. Inclua uma seção "Resumo" no final com os pontos principais
8. O artigo deve ter pelo menos 1500 palavras
9. Use emojis moderadamente nos títulos de seção para tornar visual (📜, ⚖️, 📋, 💡, etc.)
10. Se houver jurisprudência relevante, cite brevemente
11. NÃO inclua título H1 no início (o app já renderiza o título)
12. Comece direto com uma introdução envolvente

BLOCOS VISUAIS ESPECIAIS (USE OBRIGATORIAMENTE pelo menos 2 destes):

A) LINHA DO TEMPO — para evolução histórica ou cronologia. Use um bloco de código com linguagem "timeline":
\`\`\`timeline
[{"ano":"1824","titulo":"Constituição Imperial","desc":"Primeira constituição do Brasil"},{"ano":"1988","titulo":"CF/88","desc":"Constituição cidadã atual"}]
\`\`\`

B) PIRÂMIDE — para hierarquias (normas, tribunais, competências). Use bloco "pyramid":
\`\`\`pyramid
["Constituição Federal","Leis Complementares","Leis Ordinárias","Decretos","Portarias"]
\`\`\`

C) FLUXOGRAMA — para processos e procedimentos. Use bloco "flowchart":
\`\`\`flowchart
["Petição Inicial","Citação do Réu","Contestação","Audiência","Sentença"]
\`\`\`

D) TABELA COMPARATIVA — para comparar conceitos lado a lado. Use bloco "comparison":
\`\`\`comparison
{"headers":["Aspecto","Direito Público","Direito Privado"],"rows":[["Partes","Estado vs Cidadão","Particular vs Particular"],["Exemplo","Direito Penal","Direito Civil"]]}
\`\`\`

E) CALLOUT — para destaques. Use blockquote com prefixo [!tipo]:
> [!dica] Macete para prova
> Lembre-se: norma superior sempre prevalece.

Tipos de callout: dica, atencao, exemplo, jurisprudencia, nota, important

IMPORTANTE: Os blocos visuais devem conter JSON válido. Escolha os blocos mais adequados ao tema. Use pelo menos uma timeline OU pirâmide OU fluxograma, e pelo menos um callout.

FORMATO DE SAÍDA: Markdown puro, sem blocos de código envolvendo o markdown.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini error:", err);
      return new Response(JSON.stringify({ error: "Erro ao gerar artigo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const conteudo_md =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!conteudo_md) {
      return new Response(JSON.stringify({ error: "Artigo vazio gerado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Save to cache
    const fontes = citations.length > 0 ? citations : [];
    await supabase.from("artigo_educacional_cache").upsert(
      {
        slug,
        titulo,
        categoria,
        conteudo_md,
        fontes,
      },
      { onConflict: "slug" }
    );

    return new Response(
      JSON.stringify({ conteudo_md, fontes, from_cache: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
