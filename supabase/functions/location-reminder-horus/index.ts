// Envia lembrete de local via Horus (WhatsApp) para o próprio usuário autenticado.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evolution, toE164 } from "../_shared/evolution.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!auth) return json({ error: "unauthenticated" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${auth}` } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const label = String(body?.label || "Lembrete").trim();
    const message = String(body?.message || "").trim();
    const address = String(body?.address || "").trim();
    if (!message) return json({ error: "message required" }, 400);

    // Fetch the user's own verified WhatsApp phone
    const { data: wa } = await admin
      .from("horus_whatsapp_users")
      .select("phone_e164, verified")
      .eq("user_id", uid)
      .maybeSingle();

    const phone = toE164(wa?.phone_e164 || "");
    if (!phone || !wa?.verified) {
      return json({ error: "no_verified_phone" }, 400);
    }

    const text = `📍 *${label}*\n${message}${address ? `\n\n_${address}_` : ""}`;
    await evolution.sendText(phone, text);

    return json({ ok: true });
  } catch (e: any) {
    console.error("[location-reminder-horus]", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
