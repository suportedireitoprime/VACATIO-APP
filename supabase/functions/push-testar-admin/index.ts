// Envia um push + WhatsApp de teste APENAS para os admins cadastrados.
// Usado no botão "Testar admin" da linha do tempo de notificações programadas.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evolution } from "../_shared/evolution.ts";

const ADMIN_EMAILS = ["wn7corporation@gmail.com", "suporte.vacatio@gmail.com"];
const ADMIN_PHONE = "+5511991897603";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!auth) return json({ error: "unauthenticated" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${auth}` } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "unauthenticated" }, 401);
    const { data: isAdmin } = await admin.rpc("is_admin_user", { _user_id: uid });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const automation_key = String(body?.automation_key || "manual");
    const title = String(body?.title || "🧪 Teste admin");
    const message = String(body?.body || "Este é um teste para o admin.");
    const url = body?.url ? String(body.url) : undefined;

    const results: Record<string, unknown> = {};

    // 1) Push somente para os admins
    try {
      const pushRes = await admin.functions.invoke("send-push", {
        body: {
          title: `[TESTE] ${title}`,
          body: message,
          url,
          audience: { emails: ADMIN_EMAILS },
          personalize: true,
        },
      });
      results.push = pushRes.error ? { error: String(pushRes.error) } : pushRes.data;
    } catch (e) {
      results.push = { error: String((e as Error)?.message || e) };
    }

    // 2) WhatsApp via Evolution para número admin
    try {
      const texto = `🧪 *TESTE — ${automation_key}*\n\n*${title}*\n${message}${url ? `\n${url}` : ""}`;
      const result = await evolution.sendText(ADMIN_PHONE, texto);
      await admin.from("horus_outbound_log").insert({
        phone_e164: ADMIN_PHONE.replace(/\D/g, ""),
        kind: "admin_test",
        tipo: automation_key,
        status: "sent",
        sent_at: new Date().toISOString(),
        payload: { title, message, url, result },
      });
      results.whatsapp = { ok: true };
    } catch (e) {
      results.whatsapp = { error: String((e as Error)?.message || e) };
      await admin.from("horus_outbound_log").insert({
        phone_e164: ADMIN_PHONE.replace(/\D/g, ""),
        kind: "admin_test",
        tipo: automation_key,
        status: "failed",
        error: String((e as Error)?.message || e),
        payload: { title, message, url },
      });
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
