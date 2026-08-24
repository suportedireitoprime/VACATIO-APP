// Gera desafios de "Praticar" para um artigo específico e salva em cache.
// Entrada: { artigo_id, texto, numero, epigrafe? }
// Saída: { payload: {...}, cached: boolean }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MODEL = "google/gemini-2.5-flash-lite";

function hashTexto(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { artigo_id, texto, numero, epigrafe } = await req.json();
    if (!artigo_id || !texto) {
      return new Response(
        JSON.stringify({ error: "artigo_id e texto são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const versaoTexto = hashTexto(texto);

    // Verifica cache existente antes de gerar
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/praticar_desafios_cache?artigo_id=eq.${artigo_id}&versao_texto=eq.${versaoTexto}&select=payload`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      );
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0]?.payload) {
        return new Response(
          JSON.stringify({ payload: rows[0].payload, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Você prepara desafios de memorização de LEI SECA em português. Receberá o texto de um artigo. Devolva JSON estrito no formato:
{
  "pegadinhas": [ { "trecho_correto": string, "trecho_incorreto": string, "explicacao": string } ],
  "vf": [ { "afirmacao": string, "resposta": true|false, "explicacao": string } ]
}
Regras:
- Gere de 3 a 5 pegadinhas: troque UMA palavra por seu OPOSTO (nunca sinônimos difíceis). Use linguagem simples.
- Gere de 3 a 5 afirmações V/F baseadas fielmente no texto do artigo.
- Nunca invente conteúdo fora do artigo.
- Não escreva nada fora do JSON.`;

    const user = `Artigo ${numero ?? "?"}${epigrafe ? ` — ${epigrafe}` : ""}\n\nTexto:\n${texto}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`gateway ${resp.status}: ${body}`);
      return new Response(
        JSON.stringify({ error: "AI gateway failed", status: resp.status }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let payload: any = {};
    try { payload = JSON.parse(raw); } catch { payload = { raw }; }

    // Upsert no cache
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/praticar_desafios_cache?on_conflict=artigo_id`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            artigo_id,
            versao_texto: versaoTexto,
            payload,
            gerado_em: new Date().toISOString(),
          }),
        },
      );
    }

    return new Response(
      JSON.stringify({ payload, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
