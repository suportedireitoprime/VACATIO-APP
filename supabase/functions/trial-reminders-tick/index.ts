// Tick a cada 15min. Envia lembretes de fim de trial via WhatsApp (Horus) e
// registra a saída para o app exibir banner in-app.
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
    const nowIso = new Date().toISOString();
    const { data: due } = await admin
      .from("trial_reminders")
      .select("*")
      .eq("status", "scheduled")
      .lte("reminder_at", nowIso)
      .limit(200);

    const sent: any[] = [];
    for (const row of due || []) {
      try {
        // Nome + telefone
        const { data: wa } = await admin
          .from("horus_whatsapp_users")
          .select("telefone, nome_preferido")
          .eq("user_id", row.user_id)
          .maybeSingle();

        const endsAt = new Date(row.trial_ends_at);
        const horas = Math.max(1, Math.round((endsAt.getTime() - Date.now()) / 3600000));
        const label = horas <= 36 ? `${horas}h` : `${Math.round(horas / 24)} dia(s)`;

        const primeiroNome = (wa?.nome_preferido || "").split(" ")[0];
        const oi = primeiroNome ? `Oi ${primeiroNome}` : "Ei";

        const planoLabel = row.plano === "anual_parcelado" ? "Anual (12x)" : "Mensal";
        const msg =
`${oi}! Aqui é o Horus 🦉

Seu teste grátis do Vacatio termina em ${label}. Se quiser continuar sem interrupção, seu plano ${planoLabel} entra em vigor automaticamente — nada que precise fazer.

Se preferir não continuar, é só cancelar antes pelo próprio Google Play (Assinaturas) e não haverá cobrança.

Estou aqui pra qualquer dúvida 💛`;

        if (wa?.telefone && row.channels?.whatsapp !== false) {
          await evolution.sendText(wa.telefone, msg);
        }

        await admin.from("trial_reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);

        sent.push({ id: row.id, telefone: wa?.telefone || null });
      } catch (e) {
        console.error("trial-reminders-tick row fail", row.id, String(e));
      }
    }

    return json({ ok: true, processed: (due || []).length, sent: sent.length });
  } catch (e) {
    console.error("trial-reminders-tick error", e);
    return json({ ok: false, error: String((e as any)?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
