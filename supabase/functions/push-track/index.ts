// Edge Function: push-track (público)
// Registra eventos delivered / opened / converted vindos do dispositivo.
// Body: {
//   campaign_id: string,
//   event_type: "delivered"|"opened"|"converted",
//   token?: string,
//   metadata?: any   // pode conter { install_id, url, foreground, ... }
// }
//
// Dedupe: mesma (campaign_id, event_type) só conta 1x por token OU install_id,
// evitando duplicatas em cold-start (recuperação de notificações entregues) e
// múltiplos listeners.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const { campaign_id, event_type, token, metadata } = await req.json();
    if (!campaign_id || !["delivered", "opened", "converted"].includes(event_type)) {
      return new Response(JSON.stringify({ error: "invalid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user_id do JWT do chamador (se logado)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data } = await supabase.auth.getUser(authHeader.slice(7));
        userId = data.user?.id ?? null;
      } catch { /* token inválido — segue anônimo */ }
    }

    const enrichedMeta = metadata ?? null;
    const installId = enrichedMeta && typeof enrichedMeta === "object"
      ? String((enrichedMeta as any).install_id || "") || null
      : null;
    const platform = enrichedMeta && typeof enrichedMeta === "object"
      ? String((enrichedMeta as any).platform || "") || null
      : null;

    // Dedupe por token
    if (token) {
      const { data: existing } = await supabase.from("push_events")
        .select("id").eq("campaign_id", campaign_id)
        .eq("event_type", event_type).eq("token", token).limit(1).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ok: true, deduped: "token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    // Dedupe por install_id (recupera cold-start ou eventos sem token)
    if (installId) {
      const { data: existing } = await supabase.from("push_events")
        .select("id").eq("campaign_id", campaign_id)
        .eq("event_type", event_type)
        .contains("metadata", { install_id: installId })
        .limit(1).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ok: true, deduped: "install_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    await supabase.from("push_events").insert({
      campaign_id, event_type, token: token ?? null, metadata: enrichedMeta,
      user_id: userId, platform,
    });

    // Uma abertura implica entrega. Como o Android/iOS não devolvem recibo
    // quando o app está fechado, registramos o `delivered` derivado aqui —
    // senão o funil fica furado (opened > delivered).
    if (event_type === "opened") {
      let jaEntregue = false;
      if (installId) {
        const { data: d } = await supabase.from("push_events")
          .select("id").eq("campaign_id", campaign_id).eq("event_type", "delivered")
          .contains("metadata", { install_id: installId }).limit(1).maybeSingle();
        jaEntregue = Boolean(d);
      }
      if (!jaEntregue) {
        await supabase.from("push_events").insert({
          campaign_id, event_type: "delivered", token: token ?? null,
          metadata: { ...(enrichedMeta as any ?? {}), derived_from: "opened" },
          user_id: userId, platform,
        });
        const { data: cd } = await supabase.from("push_campaigns")
          .select("delivered_count").eq("id", campaign_id).single();
        await supabase.from("push_campaigns").update({
          delivered_count: ((cd as any)?.delivered_count ?? 0) + 1,
        }).eq("id", campaign_id);
      }
    }

    // Se abertura, grava click_url na campanha
    if (event_type === "opened" && enrichedMeta && (enrichedMeta as any).url) {
      await supabase.from("push_campaigns")
        .update({ click_url: (enrichedMeta as any).url })
        .eq("id", campaign_id);
    }

    const field = event_type === "delivered" ? "delivered_count"
      : event_type === "opened" ? "opened_count" : "converted_count";
    const { data: c } = await supabase.from("push_campaigns")
      .select(field).eq("id", campaign_id).single();
    await supabase.from("push_campaigns").update({
      [field]: ((c as any)?.[field] ?? 0) + 1,
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
