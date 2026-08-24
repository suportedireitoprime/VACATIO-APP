// Aprender — push diário personalizado.
// Roda 1x/dia via pg_cron. Para cada usuário: se tem uma área com domínio < 60
// e não estuda há >= 3 dias, dispara push chamando `send-push`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE);

    // Todos os registros de domínio; agrupa por usuário depois em memória
    const { data: dominios, error } = await sb
      .from("aprender_dominio_area")
      .select("user_id, area_id, score, atualizado_em, aprender_areas!inner(nome)")
      .lt("score", 60);
    if (error) throw error;

    // Preferência de opt-out
    const { data: prefs } = await sb
      .from("user_reminder_preferences")
      .select("user_id, enabled")
      .eq("category", "aprender");
    const optOut = new Set((prefs ?? []).filter((p: any) => p.enabled === false).map((p: any) => p.user_id));

    const agora = Date.now();
    const trêsDias = 3 * 24 * 60 * 60 * 1000;

    // Escolhe menor domínio por usuário, elegível
    const escolhas = new Map<string, { area_id: string; area_nome: string; score: number }>();
    for (const d of dominios ?? []) {
      if (optOut.has(d.user_id)) continue;
      const at = d.atualizado_em ? Date.parse(d.atualizado_em) : 0;
      if (agora - at < trêsDias) continue; // estudou nos últimos 3 dias
      const atual = escolhas.get(d.user_id);
      if (!atual || Number(d.score) < atual.score) {
        escolhas.set(d.user_id, {
          area_id: d.area_id,
          area_nome: (d.aprender_areas as any)?.nome || "Direito",
          score: Number(d.score) || 0,
        });
      }
    }

    let enviados = 0;
    const errosMsg: string[] = [];
    for (const [user_id, info] of escolhas) {
      const title = `Volte para ${info.area_nome}`;
      const body = `${Math.round(info.score)}% de domínio — 5 minutos hoje já sobem a barra.`;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
        body: JSON.stringify({
          title,
          body,
          url: "/aprender",
          personalize: true,
          audience: { user_ids: [user_id] },
        }),
      });
      if (resp.ok) enviados++;
      else errosMsg.push(`${user_id}:${resp.status}`);
    }

    return new Response(
      JSON.stringify({ ok: true, alvos: escolhas.size, enviados, erros: errosMsg.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
