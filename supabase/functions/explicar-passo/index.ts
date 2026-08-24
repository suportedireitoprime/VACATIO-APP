import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const MODEL = "google/gemini-2.5-flash-lite";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { store, faseTitulo, passoTitulo, passoDescricao, referencias } = await req.json();
    if (!store || !passoTitulo) {
      return new Response(JSON.stringify({ error: "store and passoTitulo required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Você é um mentor que explica passos de publicação em lojas de app (Apple App Store e Google Play) de forma DESCOMPLICADA para quem não é técnico.
Escreva em português brasileiro, tom amigável, direto. Estrutura:
1. **O que é** — 1-2 frases explicando o conceito em linguagem simples (nada de jargão sem traduzir).
2. **Por que importa** — 1 frase sobre para que serve.
3. **Como preencher / o que fazer** — passos numerados curtos.
4. **Dica** — 1 armadilha comum ou boa prática.

Nunca invente URLs. Se referenciar docs oficiais, use apenas as URLs em "Referências" abaixo.`;

    const user = `Loja: ${store === "apple" ? "Apple App Store" : "Google Play"}
Fase: ${faseTitulo || "-"}
Passo: ${passoTitulo}
Descrição no roteiro: ${passoDescricao || "-"}
Referências oficiais:
${(referencias || []).map((r: string) => `- ${r}`).join("\n") || "(sem referências)"}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`gateway ${resp.status}: ${body}`);
      return new Response(JSON.stringify({ error: "AI gateway failed", status: resp.status, details: body }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
