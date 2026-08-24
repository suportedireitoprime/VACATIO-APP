// Envia lembrete de local via Horus (WhatsApp) para o próprio usuário autenticado.
// Agora também atua como webhook para transições de geofence em background do Capgo.
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
    
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    
    // CASO 1: Webhook do Capgo (sem auth, baseado na estrutura do body)
    const events = Array.isArray(body) ? body : [body];
    const isWebhook = events.some(e => e?.identifier || e?.action || e?.transition);

    if (!auth && isWebhook) {
      console.log("[location-reminder-horus] Processando como Webhook do Capgo");
      let processedCount = 0;

      for (const event of events) {
        const identifier = event?.identifier || event?.id || event?.geofence?.identifier;
        const action = String(event?.action || event?.transition || "").toUpperCase();

        if (!identifier) continue;
        
        // Apenas transições de entrada
        if (action !== "ENTER" && action !== "1") {
          continue;
        }

        const { data: reminder } = await admin
          .from('location_reminders')
          .select('id, user_id, label, message, address, channel, last_triggered_at, active')
          .eq('id', identifier)
          .eq('active', true)
          .maybeSingle();

        if (!reminder) continue;

        // Check cooldown
        if (reminder.last_triggered_at) {
          const last = new Date(reminder.last_triggered_at).getTime();
          const now = Date.now();
          if (now - last < 10 * 60 * 1000) {
            console.log(`[location-reminder-horus] Cooldown ativo para ${identifier}`);
            continue;
          }
        }

        await admin
          .from('location_reminders')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', reminder.id);

        const ch = reminder.channel || 'push';

        if (ch === 'push' || ch === 'both') {
          try {
            await admin.functions.invoke('send-push', {
              body: {
                title: `📍 ${reminder.label}`,
                body: reminder.message,
                audience: { user_ids: [reminder.user_id] },
                personalize: false,
                mirror_canal: false
              }
            });
          } catch (e) {
            console.warn("[location-reminder-horus] Erro push (webhook):", e);
          }
        }

        if (ch === 'horus' || ch === 'both') {
          try {
            const { data: wa } = await admin
              .from("horus_whatsapp_users")
              .select("phone_e164, verified")
              .eq("user_id", reminder.user_id)
              .maybeSingle();
              
            if (wa?.verified && wa.phone_e164) {
              const text = `📍 *${reminder.label}*\n${reminder.message}${reminder.address ? `\n\n_${reminder.address}_` : ""}`;
              await evolution.sendText(toE164(wa.phone_e164), text);
            }
          } catch (e) {
            console.warn("[location-reminder-horus] Erro horus (webhook):", e);
          }
        }
        processedCount++;
      }
      return json({ ok: true, processed: processedCount });
    }

    // CASO 2: Requisição originada no App (foreground), com auth do usuário
    if (!auth) return json({ error: "unauthenticated" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${auth}` } } },
    );

    const { data: userData } = await userClient.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "unauthenticated" }, 401);

    const label = String(body?.label || "Lembrete").trim();
    const message = String(body?.message || "").trim();
    const address = String(body?.address || "").trim();
    if (!message) return json({ error: "message required" }, 400);

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
