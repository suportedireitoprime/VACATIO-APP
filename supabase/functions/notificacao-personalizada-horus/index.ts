// Mensagem personalizada via WhatsApp (Horus) no horário-pico do usuário.
// Sempre começa com o primeiro nome. Cap 1 por dia por usuário.
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
    const nowBRT = new Date(Date.now() - 3 * 3600 * 1000);
    const horaBRT = nowBRT.getUTCHours();
    if (horaBRT < 8 || horaBRT > 21) return json({ ok: true, skipped: "quiet_hours" });

    const { data: candidatos } = await admin
      .from("horus_user_stats")
      .select("user_id, nome_preferido, telefone, horarios_pico_app, notificacoes_permitidas")
      .contains("horarios_pico_app", [horaBRT])
      .not("telefone", "is", null)
      .eq("notificacoes_permitidas", true)
      .limit(500);

    const enviados: string[] = [];
    for (const c of candidatos ?? []) {
      if (!c.telefone) continue;
      const inicioDia = new Date(); inicioDia.setUTCHours(0, 0, 0, 0);
      const { count } = await admin
        .from("horus_outbound_log")
        .select("id", { head: true, count: "exact" })
        .eq("tipo", "personalizada_horus")
        .eq("phone_e164", String(c.telefone).replace(/\D/g, ""))
        .gte("created_at", inicioDia.toISOString());
      if ((count ?? 0) > 0) continue;

      const { data: recente } = await admin
        .from("artigos_visualizacoes")
        .select("tabela_codigo, numero_artigo")
        .eq("user_id", c.user_id)
        .order("visualizado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      const primeiroNome = (c.nome_preferido || "").split(" ")[0] || "";
      const artigoLabel = recente ? `Art. ${recente.numero_artigo}` : "seu estudo";
      const texto = primeiroNome
        ? `${primeiroNome}, separei o ${artigoLabel} pra você retomar hoje 👀 Quer que eu te mande a videoaula complementar?`
        : `Separei ${artigoLabel} pra você retomar hoje 👀`;

      try {
        await evolution.sendText(c.telefone, texto);
        await admin.from("horus_outbound_log").insert({
          user_id: c.user_id,
          phone_e164: String(c.telefone).replace(/\D/g, ""),
          kind: "personalizada",
          tipo: "personalizada_horus",
          status: "sent",
          sent_at: new Date().toISOString(),
          payload: { texto, hora: horaBRT },
        });
        enviados.push(c.user_id);
      } catch (e) {
        await admin.from("horus_outbound_log").insert({
          user_id: c.user_id,
          phone_e164: String(c.telefone).replace(/\D/g, ""),
          kind: "personalizada",
          tipo: "personalizada_horus",
          status: "failed",
          error: String((e as Error)?.message || e),
          payload: { texto },
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
