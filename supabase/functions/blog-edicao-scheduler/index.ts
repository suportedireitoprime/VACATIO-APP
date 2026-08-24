// Scheduler: chamado a cada 5 minutos por pg_cron.
// Verifica se algum tema deve ser gerado agora (com base em posts_por_dia / horários / intervalo),
// invoca o runner para o próximo tema pendente e atualiza contadores.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/blog-edicao.ts";

function hoursInTz(date: Date, tz: string): { hour: number; minute: number; ymd: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cfg } = await supabase.from("blog_edicao_config").select("*").limit(1).single();
    if (!cfg) return json({ error: "sem config" }, 500);

    const now = new Date();
    const tz = cfg.timezone || "America/Sao_Paulo";
    const { hour, minute, ymd } = hoursInTz(now, tz);
    const nowMin = hour * 60 + minute;

    // Contagem de posts já gerados hoje
    const startOfDay = new Date(`${ymd}T00:00:00`);
    // Conta apenas posts JÁ PUBLICADOS hoje (posts pré-gerados aguardam liberação)
    const { count: postsHoje } = await supabase
      .from("blog_edicao_posts")
      .select("id", { count: "exact", head: true })
      .eq("publicado", true)
      .gte("data_publicacao", startOfDay.toISOString());

    if ((postsHoje ?? 0) >= (cfg.posts_por_dia ?? 3)) {
      return json({ ok: true, skipped: "quota diária atingida", postsHoje });
    }

    // Decidir se é hora de gerar
    let deveGerar = false;
    let motivo = "";
    if (cfg.intervalo_minutos && cfg.intervalo_minutos > 0) {
      // Modo intervalo
      const { data: last } = await supabase
        .from("blog_edicao_posts")
        .select("data_publicacao")
        .eq("publicado", true)
        .order("data_publicacao", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastMs = last ? new Date(last.data_publicacao).getTime() : 0;
      if (Date.now() - lastMs >= cfg.intervalo_minutos * 60_000) {
        deveGerar = true; motivo = "intervalo";
      }
    } else {
      const horarios: string[] = cfg.horarios || [];
      const alvos = horarios.map((h) => {
        const [hh, mm] = h.split(":").map(Number);
        return hh * 60 + (mm || 0);
      });
      // dispara se estamos até 6 minutos após um horário-alvo
      const proximo = alvos.find((a) => nowMin >= a && nowMin - a < 6);
      if (proximo != null) {
        // e ainda não geramos naquele slot (baseado em quantidade do dia)
        if ((postsHoje ?? 0) < alvos.filter((a) => a <= nowMin).length) {
          deveGerar = true; motivo = `slot ${proximo}`;
        }
      }
    }

    if (!deveGerar) {
      return json({ ok: true, skipped: "fora do horário", nowMin, postsHoje });
    }

    // 1) Tenta LIBERAR um tema já pré-gerado (status='pronto') com agendado_para vencido
    const nowIso = new Date().toISOString();
    const { data: prontos } = await supabase
      .from("blog_edicao_temas")
      .select("id, agendado_para, post_id")
      .eq("status", "pronto")
      .lte("agendado_para", nowIso)
      .order("agendado_para", { ascending: true })
      .limit(1);
    const pronto = (prontos || [])[0];
    if (pronto?.post_id) {
      const { data: runRes, error } = await supabase.functions.invoke("blog-edicao-runner", {
        body: { publicar_tema_id: pronto.id },
      });
      if (error) throw error;
      return json({ ok: true, motivo: motivo + " (publicando pré-gerado)", runRes });
    }

    // 2) Fallback: se não houver pré-gerado, gera+publica na hora (comportamento antigo)
    const { data: runRes, error } = await supabase.functions.invoke("blog-edicao-runner", {
      body: {},
    });
    if (error) throw error;
    return json({ ok: true, motivo: motivo + " (fallback: gerando)", runRes });
  } catch (e) {
    console.error("scheduler error", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});
