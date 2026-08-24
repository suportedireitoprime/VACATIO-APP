// Boletim de Leis matinal (07h BRT). Consulta a resenha diária das últimas 24h.
// Se não houver leis novas, apenas loga skipped (aparece como "não enviado" na timeline).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: leis } = await admin
      .from("resenha_diaria")
      .select("id, tipo_ato, numero_ato, ementa, created_at")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!leis || leis.length === 0) {
      await admin.from("horus_outbound_log").insert({
        kind: "boletim_leis_matinal",
        tipo: "boletim_leis_matinal",
        status: "skipped",
        payload: { reason: "sem_leis_novas" },
      });
      return json({ ok: true, skipped: true, reason: "sem_leis_novas" });
    }

    const total = leis.length;
    const title = `📜 ${total} lei${total > 1 ? "s" : ""} nova${total > 1 ? "s" : ""} pra você ler`;
    const body = leis.slice(0, 3).map((l: any) => `• ${l.tipo_ato} ${l.numero_ato || ""}`.trim()).join("\n");

    const { data: campaign } = await admin
      .from("push_campaigns")
      .insert({
        title,
        body,
        url: "/radar-360",
        audience: { all: true },
        status: "sending",
        tipo: "boletim_leis_matinal",
        automation_key: "boletim_leis_matinal",
      })
      .select("id")
      .single();

    const res = await admin.functions.invoke("send-push", {
      body: {
        campaign_id: campaign?.id,
        title,
        body,
        url: "/radar-360",
        audience: { all: true },
        personalize: true,
      },
    });

    await admin.from("horus_outbound_log").insert({
      kind: "boletim_leis_matinal",
      tipo: "boletim_leis_matinal",
      status: "sent",
      sent_at: new Date().toISOString(),
      payload: { total, sample: leis.slice(0, 3), send: res.data },
    });

    // Complemento no WhatsApp (Horus reforça o push com um link que abre o app).
    const horusText =
      `☀️ Bom dia! O *Boletim de Leis* de hoje já está no app com ${total} lei${total > 1 ? "s" : ""} nova${total > 1 ? "s" : ""}.\n\nToque no link pra abrir direto no Radar 360.`;
    const compResp = await admin.functions.invoke("horus-complemento", {
      body: {
        tipo: "boletim_leis",
        principal_kind: "boletim_leis_matinal",
        text: horusText,
        deep_link_path: "/radar-360",
        opt_in_field: "opt_in_leis",
      },
    }).catch((e) => ({ error: String(e?.message || e) }));

    // O espelhamento no canal do WhatsApp roda dentro do send-push.
    const canal = { espelhado_por: "send-push" };

    return json({ ok: true, total, campaign_id: campaign?.id, horus_complemento: (compResp as any)?.data ?? compResp, canal });
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
