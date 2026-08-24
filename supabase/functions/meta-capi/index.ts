// Meta Conversions API — envia os mesmos eventos do Pixel pelo servidor.
// Deduplicação: o cliente manda `event_id` igual ao usado no Pixel.
// Se META_CAPI_ACCESS_TOKEN não estiver configurado, responde 200 e não faz nada.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIXEL_ID = Deno.env.get("META_PIXEL_ID") ?? "2069588673817892";
const TOKEN = Deno.env.get("META_CAPI_ACCESS_TOKEN") ?? "";
const TEST_CODE = Deno.env.get("META_CAPI_TEST_CODE") ?? "";

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!TOKEN) {
      return new Response(JSON.stringify({ skipped: "capi_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      event_name,
      event_id,
      event_source_url,
      custom_data = {},
      user = {},
      action_source: rawActionSource,
      app_data,
    } = body ?? {};
    const action_source = rawActionSource === "app" ? "app" : "website";
    if (!event_name) {
      return new Response(JSON.stringify({ error: "event_name obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user_data: Record<string, unknown> = {
      client_user_agent: req.headers.get("user-agent") ?? undefined,
      client_ip_address:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    };
    if (user.email) user_data.em = [await sha256(String(user.email).trim().toLowerCase())];
    if (user.phone) user_data.ph = [await sha256(String(user.phone).replace(/\D/g, ""))];
    if (user.id) user_data.external_id = [await sha256(String(user.id))];

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          event_source_url,
          action_source,
          user_data,
          custom_data,
          ...(action_source === "app" && app_data ? { app_data } : {}),
        },
      ],
    };
    if (TEST_CODE) payload.test_event_code = TEST_CODE;

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${TOKEN}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const json = await res.json();

    return new Response(JSON.stringify(json), {
      status: res.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
