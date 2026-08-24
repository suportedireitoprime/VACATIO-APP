// Edge Function: horus-click (público)
// Redirect rastreado usado pelos botões URL do Horus (WhatsApp).
// Ao tocar no botão, o WhatsApp abre esta URL, que registra o clique
// em push_events (platform='horus', event_type='opened') e responde 302
// para o destino real.
//
// Uso: GET /horus-click?c=<campaign_id>&p=<phone_digits>&to=<url_base64>
//   ou: GET /horus-click?c=<campaign_id>&p=<phone_digits>&url=<url_encoded>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function decodeTarget(u: URL): string | null {
  const raw = u.searchParams.get("url");
  if (raw) {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const b64 = u.searchParams.get("to");
  if (b64) {
    try {
      // base64url → base64
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      const norm = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
      return atob(norm);
    } catch {
      return null;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const target = decodeTarget(url);
  const campaignId = url.searchParams.get("c");
  const phone = url.searchParams.get("p");

  const fallbackTarget =
    Deno.env.get("HORUS_APP_URL") ||
    Deno.env.get("HORUS_PLAY_STORE_URL") ||
    "https://vade-mecum-comentado.lovable.app";

  const finalTarget = target && /^https?:\/\//i.test(target) ? target : fallbackTarget;

  // Fire-and-forget: registra o clique sem bloquear o redirect.
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (campaignId) {
      const metadata: Record<string, unknown> = {
        source: "horus_whatsapp",
        url: finalTarget,
        phone: phone || null,
        user_agent: req.headers.get("user-agent") || null,
      };

      // Dedupe: mesma campanha + mesmo phone só conta 1x
      let alreadyLogged = false;
      if (phone) {
        const { data: existing } = await supabase
          .from("push_events")
          .select("id")
          .eq("campaign_id", campaignId)
          .eq("event_type", "opened")
          .eq("platform", "horus")
          .contains("metadata", { phone })
          .limit(1)
          .maybeSingle();
        alreadyLogged = !!existing;
      }

      if (!alreadyLogged) {
        await supabase.from("push_events").insert({
          campaign_id: campaignId,
          event_type: "opened",
          platform: "horus",
          metadata,
        });
        // Incrementa opened_count na campanha
        const { data: c } = await supabase
          .from("push_campaigns")
          .select("opened_count")
          .eq("id", campaignId)
          .single();
        await supabase
          .from("push_campaigns")
          .update({ opened_count: ((c as any)?.opened_count ?? 0) + 1 })
          .eq("id", campaignId);
      }
    }
  } catch (e) {
    console.warn("horus-click: log failed", String((e as Error).message));
  }

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: finalTarget,
      "Cache-Control": "no-store",
    },
  });
});
