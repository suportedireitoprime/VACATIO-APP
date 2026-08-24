import { createClient } from "npm:@supabase/supabase-js@2";
import { evolution, toE164 } from "../_shared/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    console.log("[location-reminder-webhook] Received:", JSON.stringify(body));

    // Capgo webhook might send a single object or an array
    const events = Array.isArray(body) ? body : [body];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let processedCount = 0;

    for (const event of events) {
      const identifier = event?.identifier || event?.id || event?.geofence?.identifier;
      const action = String(event?.action || event?.transition || "").toUpperCase();

      if (!identifier) continue;
      
      // Apenas transições de entrada nos interessam (ENTER ou 1)
      if (action !== "ENTER" && action !== "1") {
        continue;
      }

      // Busca o lembrete
      const { data: reminder } = await supabase
        .from('location_reminders')
        .select('id, user_id, label, message, address, channel, last_triggered_at, active')
        .eq('id', identifier)
        .eq('active', true)
        .maybeSingle();

      if (!reminder) continue;

      // Check cooldown (10 minutos)
      if (reminder.last_triggered_at) {
        const last = new Date(reminder.last_triggered_at).getTime();
        const now = Date.now();
        if (now - last < 10 * 60 * 1000) {
          console.log(`[location-reminder-webhook] Cooldown ativo para ${identifier}`);
          continue;
        }
      }

      // Atualiza last_triggered_at
      await supabase
        .from('location_reminders')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', reminder.id);

      const ch = reminder.channel || 'push';

      // Dispara Push (App)
      if (ch === 'push' || ch === 'both') {
        try {
          await supabase.functions.invoke('send-push', {
            body: {
              title: `📍 ${reminder.label}`,
              body: reminder.message,
              audience: { user_ids: [reminder.user_id] },
              personalize: false,
              mirror_canal: false // Já enviaremos via horus separadamente se precisar
            }
          });
        } catch (e) {
          console.warn("[location-reminder-webhook] Erro ao disparar push:", e);
        }
      }

      // Dispara WhatsApp (Horus)
      if (ch === 'horus' || ch === 'both') {
        try {
          const { data: wa } = await supabase
            .from("horus_whatsapp_users")
            .select("phone_e164, verified")
            .eq("user_id", reminder.user_id)
            .maybeSingle();
            
          if (wa?.verified && wa.phone_e164) {
            const phone = toE164(wa.phone_e164);
            const text = `📍 *${reminder.label}*\n${reminder.message}${reminder.address ? `\n\n_${reminder.address}_` : ""}`;
            await evolution.sendText(phone, text);
          }
        } catch (e) {
          console.warn("[location-reminder-webhook] Erro ao disparar horus:", e);
        }
      }

      processedCount++;
    }

    return new Response(JSON.stringify({ ok: true, processed: processedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[location-reminder-webhook] Erro global:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
