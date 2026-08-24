// Dispara push do próximo post do blog ainda não notificado hoje.
// Body: { slot: "manha"|"tarde"|"noite", automation_key: string }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { slot = "manha", automation_key = "blog_post_manha" } = await req.json().catch(() => ({}));
    const hoje = new Date().toISOString().slice(0, 10);

    const { data: posts } = await admin
      .from("blog_edicao_posts")
      .select("id, titulo, resumo, headline_push, data_publicacao, push_campaign_id, publicado")
      .eq("publicado", true)
      .gte("data_publicacao", `${hoje}T00:00:00`)
      .order("data_publicacao", { ascending: true })
      .limit(10);

    const proximo = (posts ?? []).find((p: any) => !p.push_campaign_id);
    if (!proximo) {
      await admin.from("horus_outbound_log").insert({
        kind: automation_key,
        tipo: automation_key,
        status: "skipped",
        payload: { reason: "sem_post_pendente", slot },
      });
      return json({ ok: true, skipped: true });
    }

    const title = proximo.headline_push || `📰 ${proximo.titulo}`;
    const body = proximo.resumo || "Novo post no Blog Vacatio.";
    const url = `/blog/${proximo.id}`;

    const { data: campaign } = await admin
      .from("push_campaigns")
      .insert({
        title,
        body,
        url,
        audience: { all: true },
        status: "sending",
        tipo: "blog",
        automation_key,
      })
      .select("id")
      .single();

    await admin.functions.invoke("send-push", {
      body: {
        campaign_id: campaign?.id,
        title,
        body,
        url,
        audience: { all: true },
        personalize: true,
      },
    });

    await admin.from("blog_edicao_posts").update({ push_campaign_id: campaign?.id }).eq("id", proximo.id);

    // Complemento: Horus reforça no WhatsApp com link que abre o app no post.
    const horusText =
      `📰 *Novo post no Blog Vacatio*\n\n_${proximo.titulo}_\n\nAbre no app pra ler completo.`;
    const compResp = await admin.functions.invoke("horus-complemento", {
      body: {
        tipo: "blog",
        principal_kind: automation_key,
        text: horusText,
        deep_link_path: `/blog/${proximo.id}`,
        opt_in_field: "opt_in_blog",
      },
    }).catch((e) => ({ error: String(e?.message || e) }));

    // O espelhamento no canal do WhatsApp é feito dentro do send-push
    // (card rico com capa + prévia + link para posts de blog).
    const canal = { espelhado_por: "send-push" };

    return json({ ok: true, post_id: proximo.id, slot, horus_complemento: (compResp as any)?.data ?? compResp, canal });
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
