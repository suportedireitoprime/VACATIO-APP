// Push personalizado (via app) no horário-pico do usuário.
// Título SEMPRE começa com o primeiro nome do usuário.
// Cap: 1 envio por usuário por dia (controle via horus_outbound_log).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const nowBRT = new Date(Date.now() - 3 * 3600 * 1000);
    const horaBRT = nowBRT.getUTCHours();
    if (horaBRT < 8 || horaBRT > 22) return json({ ok: true, skipped: "quiet_hours" });

    const { data: candidatos } = await admin
      .from("horus_user_stats")
      .select("user_id, nome_preferido, horarios_pico_app")
      .contains("horarios_pico_app", [horaBRT])
      .limit(500);

    const enviados: string[] = [];
    for (const c of candidatos ?? []) {
      if (!c.user_id) continue;
      // idempotência diária
      const inicioDia = new Date(); inicioDia.setUTCHours(0, 0, 0, 0);
      const { count } = await admin
        .from("horus_outbound_log")
        .select("id", { head: true, count: "exact" })
        .eq("tipo", "personalizada_app")
        .eq("user_id", c.user_id)
        .gte("created_at", inicioDia.toISOString());
      if ((count ?? 0) > 0) continue;

      // Descobre um artigo/lei recente pra sugerir
      const { data: recente } = await admin
        .from("artigos_visualizacoes")
        .select("tabela_codigo, numero_artigo")
        .eq("user_id", c.user_id)
        .order("visualizado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      const primeiroNome = (c.nome_preferido || "").split(" ")[0] || "Estudante";
      const artigoLabel = recente ? `Art. ${recente.numero_artigo}` : "seu estudo";
      const title = `${primeiroNome}, o ${artigoLabel} te espera 👀`;
      const body = recente
        ? `Continue de onde você parou em ${recente.tabela_codigo?.toUpperCase()}.`
        : "Separei um conteúdo pra você continuar hoje.";
      const url = recente
        ? `/legislacao/${recente.tabela_codigo}?art=${recente.numero_artigo}`
        : "/aprender";

      try {
        await admin.functions.invoke("send-push", {
          body: { title, body, url, audience: { user_ids: [c.user_id] } },
        });
        await admin.from("horus_outbound_log").insert({
          user_id: c.user_id,
          kind: "personalizada",
          tipo: "personalizada_app",
          status: "sent",
          sent_at: new Date().toISOString(),
          payload: { title, body, url, hora: horaBRT },
        });
        enviados.push(c.user_id);
      } catch (e) {
        await admin.from("horus_outbound_log").insert({
          user_id: c.user_id,
          kind: "personalizada",
          tipo: "personalizada_app",
          status: "failed",
          error: String((e as Error)?.message || e),
          payload: { title, body, url },
        });
      }
    }

    return json({ ok: true, enviados: enviados.length, hora: horaBRT });
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
