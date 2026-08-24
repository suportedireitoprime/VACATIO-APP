// Notícias Jurídicas do Dia (Plano A - 12:30 BRT).
// Horus (WhatsApp) é o PRINCIPAL: manda a curadoria com 3 manchetes + link.
// 5 min depois, um push COMPLEMENTAR reforça no app.
// Idempotência: 1 disparo por dia (via horus_outbound_log).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://simple-calc-no-db.lovable.app";
const KIND = "noticias_dia";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({} as any));
    const testAdminPhone = String(body?.admin_phone || "").replace(/\D/g, "");
    const onlyAdmin = Boolean(body?.only_admin);

    // idempotência do dia (apenas em modo produção)
    if (!onlyAdmin) {
      const inicioDia = new Date(); inicioDia.setUTCHours(0, 0, 0, 0);
      const { count } = await admin
        .from("horus_outbound_log")
        .select("id", { head: true, count: "exact" })
        .eq("kind", KIND)
        .eq("status", "sent")
        .gte("created_at", inicioDia.toISOString());
      if ((count ?? 0) > 0) {
        return json({ ok: true, skipped: "ja_enviado_hoje" });
      }
    }

    const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: noticias } = await admin
      .from("noticias_juridicas")
      .select("id, titulo, resumo, link, imagem_url, created_at")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!noticias || noticias.length === 0) {
      await admin.from("horus_outbound_log").insert({
        kind: KIND, tipo: KIND, status: "skipped",
        payload: { reason: "sem_noticias" },
      });
      return json({ ok: true, skipped: "sem_noticias" });
    }

    const top = noticias.slice(0, 3);
    const linhas = top.map((n: any, i: number) => `${i + 1}. ${n.titulo}`).join("\n");
    const total = noticias.length;

    // === PRINCIPAL: Horus (broadcast opt_in_leis) ===
    const horusText = `📰 *Notícias jurídicas de hoje*\n\n${linhas}\n\n+${total > 3 ? total - 3 : 0} outras estão te esperando no app.`;
    const compResp = await admin.functions.invoke("horus-complemento", {
      body: {
        tipo: KIND,
        principal_kind: KIND,
        text: horusText,
        deep_link_path: "/noticias",
        opt_in_field: "opt_in_leis",
        only_admin: onlyAdmin,
        admin_phone: testAdminPhone,
      },
    });

    // === COMPLEMENTO: Push do app (5 min depois seria ideal via cron; aqui disparo já) ===
    const title = `📰 ${total} notícia${total > 1 ? "s" : ""} nova${total > 1 ? "s" : ""} pra você`;
    const pushBody = top.map((n: any) => `• ${String(n.titulo).slice(0, 80)}`).join("\n");
    const { data: campaign } = await admin
      .from("push_campaigns")
      .insert({
        title, body: pushBody, url: "/noticias",
        audience: { all: true },
        status: "sending",
        tipo: "noticias",
        automation_key: "noticias_dia",
        image_url: top[0]?.imagem_url ?? null,
      })
      .select("id").single();

    const pushResp = await admin.functions.invoke("send-push", {
      body: {
        campaign_id: campaign?.id,
        title, body: pushBody, url: "/noticias",
        audience: { all: true },
        image: top[0]?.imagem_url ?? undefined,
      },
    });

    await admin.from("horus_outbound_log").insert({
      kind: KIND, tipo: KIND, status: "sent",
      sent_at: new Date().toISOString(),
      payload: {
        total, top: top.map((n: any) => n.titulo),
        horus: compResp.data, push: pushResp.data,
      },
    });

    // Espelhamento no canal do WhatsApp acontece dentro do send-push.
    const canal = { espelhado_por: "send-push" };

    return json({ ok: true, total, horus: compResp.data, push: pushResp.data, canal });
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
