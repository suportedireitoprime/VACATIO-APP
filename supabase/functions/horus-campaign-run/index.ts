import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { evolution } from "../_shared/evolution.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const campaignId = String(body?.campaign_id || "");
    if (!campaignId) return json({ error: "campaign_id required" }, 400);

    const { data: campaign, error: cErr } = await admin.from("horus_campaigns").select("*").eq("id", campaignId).maybeSingle();
    if (cErr || !campaign) return json({ error: "campaign not found" }, 404);

    // Build target list from horus_whatsapp_users filtered by publico_alvo
    const query = admin.from("horus_whatsapp_users").select("phone_e164, user_id").eq("blocked", false);
    const { data: users } = await query;
    let targets = (users || []).filter((u: any) => u.phone_e164);

    if (campaign.publico_alvo === "premium" || campaign.publico_alvo === "free") {
      const ids = targets.map((t: any) => t.user_id).filter(Boolean);
      if (ids.length) {
        const { data: subs } = await admin.from("play_subscriptions").select("user_id, status, expires_at").in("user_id", ids);
        const premiumIds = new Set(
          (subs || [])
            .filter((s: any) => ["SUBSCRIPTION_STATE_ACTIVE","SUBSCRIPTION_STATE_IN_GRACE_PERIOD"].includes(s.status) && (!s.expires_at || new Date(s.expires_at) > new Date()))
            .map((s: any) => s.user_id),
        );
        targets = targets.filter((t: any) =>
          campaign.publico_alvo === "premium" ? premiumIds.has(t.user_id) : !premiumIds.has(t.user_id),
        );
      } else if (campaign.publico_alvo === "premium") {
        targets = [];
      }
    }

    // Insert targets rows (skip if already inserted from previous run)
    if (targets.length) {
      const rows = targets.map((t: any) => ({ campaign_id: campaignId, phone: t.phone_e164, status: "pendente" }));
      await admin.from("horus_campaign_targets").insert(rows);
    }

    await admin.from("horus_campaigns").update({
      status: "enviando",
      total_alvo: targets.length,
      total_enviado: 0,
      total_falha: 0,
    }).eq("id", campaignId);

    // Fire-and-forget the actual send loop
    processCampaign(admin, campaignId, campaign).catch((e) => console.error("campaign loop error", e));

    return json({ ok: true, total: targets.length });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

async function processCampaign(admin: any, campaignId: string, campaign: any) {
  const { data: pending } = await admin.from("horus_campaign_targets").select("id, phone").eq("campaign_id", campaignId).eq("status", "pendente").limit(5000);
  let enviado = 0, falha = 0, consecFail = 0;
  for (const t of (pending || [])) {
    try {
      await evolution.sendText(t.phone, campaign.mensagem);
      await admin.from("horus_campaign_targets").update({ status: "enviado", enviado_em: new Date().toISOString() }).eq("id", t.id);
      await admin.from("horus_outbound_log").insert({
        phone_e164: t.phone.replace(/\D/g, ""),
        kind: "campanha",
        tipo: "campanha",
        status: "sent",
        sent_at: new Date().toISOString(),
        campaign_id: campaignId,
        payload: { titulo: campaign.titulo },
      });
      enviado++; consecFail = 0;
    } catch (e) {
      const err = String(e?.message || e);
      await admin.from("horus_campaign_targets").update({ status: "falha", erro: err }).eq("id", t.id);
      await admin.from("horus_outbound_log").insert({
        phone_e164: t.phone.replace(/\D/g, ""),
        kind: "campanha",
        tipo: "campanha",
        status: "failed",
        error: err,
        campaign_id: campaignId,
        payload: { titulo: campaign.titulo },
      });
      falha++; consecFail++;
    }
    await admin.from("horus_campaigns").update({ total_enviado: enviado, total_falha: falha }).eq("id", campaignId);
    if (consecFail >= 5) {
      await admin.from("horus_campaigns").update({ status: "falha" }).eq("id", campaignId);
      return;
    }
    await sleep(1500);
  }
  await admin.from("horus_campaigns").update({ status: "concluida" }).eq("id", campaignId);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}