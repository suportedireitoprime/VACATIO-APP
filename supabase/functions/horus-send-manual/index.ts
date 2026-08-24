import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evolution } from "../_shared/evolution.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Require admin caller
    const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!auth) return json({ error: "unauthenticated" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${auth}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "unauthenticated" }, 401);
    const { data: isAdmin } = await admin.rpc("is_admin_user", { _user_id: uid });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const phone = String(body?.phone || "").trim();
    const text = String(body?.text || "").trim();
    if (!phone || !text) return json({ error: "phone and text required" }, 400);

    try {
      const result = await evolution.sendText(phone, text);
      await admin.from("horus_outbound_log").insert({
        phone_e164: phone.replace(/\D/g, ""),
        kind: "manual",
        tipo: "manual",
        status: "sent",
        sent_at: new Date().toISOString(),
        payload: { result, text },
      });
      await admin.from("horus_conversations").insert({
        phone_e164: phone.replace(/\D/g, ""),
        role: "assistant",
        content: text,
      });
      return json({ ok: true });
    } catch (e) {
      await admin.from("horus_outbound_log").insert({
        phone_e164: phone.replace(/\D/g, ""),
        kind: "manual",
        tipo: "manual",
        status: "failed",
        error: String(e?.message || e),
        payload: { text },
      });
      return json({ error: String(e?.message || e) }, 500);
    }
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}