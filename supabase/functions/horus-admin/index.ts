import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evolution, INSTANCE } from "../_shared/evolution.ts";
import { handleCanalAction } from "../_shared/horusCanal.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const internalToken = Deno.env.get("HORUS_INTERNAL_TOKEN");
    const providedInternal = req.headers.get("x-horus-internal");
    const authHeader = req.headers.get("Authorization");
    if (internalToken && providedInternal && providedInternal === internalToken) {
      const adminDb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const res = await handleCanalAction(String(body?.action || ""), body, adminDb);
      if (res) {
        const status = Number((res as any).status || 200);
        delete (res as any).status;
        return json(res, status);
      }
      return json({ error: "Unknown action" }, 400);
    }
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const bearer = authHeader.replace("Bearer ", "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Cron / chamadas internas usam a service role key.
    if (bearer === serviceKey) {
      const adminDb = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
      const internalBody = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const internalAction = String(internalBody?.action || "");
      const canalRes = await handleCanalAction(internalAction, internalBody, adminDb);
      if (canalRes) {
        const status = Number((canalRes as any).status || 200);
        delete (canalRes as any).status;
        return json(canalRes, status);
      }
      return json({ error: "Unknown action" }, 400);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: cErr } = await supabase.auth.getClaims(bearer);
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("is_admin_user", { _user_id: claims.claims.sub });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || new URL(req.url).searchParams.get("action") || "status";
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/horus-webhook`;

    if (action === "status") {
      let exists = true;
      let state: any = null;
      try {
        state = sanitizeState(await evolution.connectionState());
      } catch {
        exists = false;
      }
      // Auto-heal: se a instância está conectada, garante que o webhook
      // aponta pro nosso endpoint. Isso resolve o caso do usuário reconectar
      // a API do WhatsApp (ex.: novo QR) e perder o registro do webhook.
      let webhook_reapplied = false;
      const stateName = state?.instance?.state || state?.state;
      if (exists && stateName === "open") {
        try {
          await evolution.setWebhook(webhookUrl);
          webhook_reapplied = true;
        } catch (e) {
          console.warn("auto set_webhook failed", e);
        }
      }
      const { count: users } = await admin.from("horus_whatsapp_users").select("*", { count: "exact", head: true });
      const { count: msgs } = await admin.from("horus_conversations").select("*", { count: "exact", head: true });
      return json({ instance: INSTANCE, exists, state, users_count: users || 0, messages_count: msgs || 0, webhook_url: webhookUrl, webhook_reapplied });
    }

    if (action === "create") {
      try {
        const r = await evolution.createInstance(webhookUrl);
        return json({ ok: true, result: r });
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (/already exists/i.test(msg)) {
          try { await evolution.setWebhook(webhookUrl); } catch {}
          return json({ ok: true, already: true });
        }
        throw e;
      }
    }

    if (action === "connect") {
      await evolution.startConnection(webhookUrl);
      const r = await getCurrentQr(admin);
      return json({ ok: true, qr: r });
    }

    if (action === "reset_connect") {
      await admin.from("horus_qr_cache").delete().eq("instance_name", INSTANCE);
      await evolution.resetInstance(webhookUrl);
      const r = await getCurrentQr(admin);
      return json({ ok: true, reset: true, qr: r });
    }

    if (action === "qr_status") {
      const r = await getCurrentQr(admin);
      return json({ ok: true, qr: r });
    }

    if (action === "set_webhook") {
      const r = await evolution.setWebhook(webhookUrl);
      return json({ ok: true, result: r });
    }

    const canalRes = await handleCanalAction(action, body, admin);
    if (canalRes) {
      const status = Number((canalRes as any).status || 200);
      delete (canalRes as any).status;
      return json(canalRes, status);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("horus-admin error", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeState(state: any) {
  if (!state || typeof state !== "object") return state;
  const clean = JSON.parse(JSON.stringify(state));
  delete clean.token;
  delete clean.apikey;
  delete clean.instanceToken;
  if (clean.instance) {
    delete clean.instance.token;
    delete clean.instance.apikey;
    delete clean.instance.instanceToken;
  }
  return clean;
}

async function getCurrentQr(admin: ReturnType<typeof createClient>) {
  const now = new Date().toISOString();

  const { data: cached } = await admin
    .from("horus_qr_cache")
    .select("qrcode, code, event_name, status, received_at, expires_at")
    .eq("instance_name", INSTANCE)
    .gt("expires_at", now)
    .maybeSingle();

  if (cached?.qrcode || cached?.code) {
    return { pending: false, source: "webhook-cache", ...cached };
  }

  const qr = await evolution.getQr();
  if (!qr.pending && (qr.qrcode || qr.code)) {
    await admin.from("horus_qr_cache").upsert({
      instance_name: INSTANCE,
      qrcode: qr.qrcode,
      code: qr.code,
      event_name: "instance/qr",
      status: "qr",
      payload: qr.raw || {},
      received_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 70_000).toISOString(),
    });
  }

  return qr;
}