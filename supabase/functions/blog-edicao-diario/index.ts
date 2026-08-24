// Pré-geração diária: chamado às 00:05 no fuso do config.
// Para cada horário programado do dia, gera o artigo com antecedência
// (post fica com publicado=false, tema fica com status='pronto') para que o admin
// possa revisar antes da liberação automática pelo scheduler.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/blog-edicao.ts";

function ymdInTz(date: Date, tz: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Converte "YYYY-MM-DD" + "HH:MM" no fuso `tz` para um Date UTC.
 * Usa o offset resolvido para o próprio timestamp para lidar com DST.
 */
function localToUtc(ymd: string, hhmm: string, tz: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  // Palpite: monta como se fosse UTC e ajusta pelo offset do tz nesse instante.
  const naive = new Date(`${ymd}T${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(naive).map((p) => [p.type, p.value]));
  const asIfLocal = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), 0,
  );
  const offset = asIfLocal - naive.getTime();
  return new Date(naive.getTime() - offset);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cfg } = await supabase.from("blog_edicao_config").select("*").limit(1).single();
    if (!cfg) return json({ error: "config ausente" }, 500);

    const tz = cfg.timezone || "America/Sao_Paulo";
    const ymd = ymdInTz(new Date(), tz);
    const horarios: string[] = cfg.horarios || [];
    const quantidade = Math.min(cfg.posts_por_dia ?? 3, horarios.length || (cfg.posts_por_dia ?? 3));

    // Quantos posts já foram pré-gerados/publicados hoje
    const inicioDia = localToUtc(ymd, "00:00", tz).toISOString();
    const { data: preHoje } = await supabase
      .from("blog_edicao_posts")
      .select("id, data_publicacao")
      .gte("data_publicacao", inicioDia);
    const jaHoje = (preHoje || []).length;
    if (jaHoje >= quantidade) {
      return json({ ok: true, skipped: "dia já com quota", jaHoje });
    }

    const alvos = horarios.slice(0, quantidade).map((h) => ({
      hhmm: h.slice(0, 5),
      when: localToUtc(ymd, h.slice(0, 5), tz).toISOString(),
    }));

    const gerados: any[] = [];
    for (let i = jaHoje; i < alvos.length; i++) {
      const slot = alvos[i];
      try {
        const { data, error } = await supabase.functions.invoke("blog-edicao-runner", {
          body: { pre_gerar: true, publicar_em: slot.when },
        });
        if (error) throw error;
        gerados.push({ slot: slot.hhmm, res: data });
      } catch (e) {
        console.warn("diario: falha no slot", slot.hhmm, (e as Error).message);
        gerados.push({ slot: slot.hhmm, error: (e as Error).message });
      }
    }

    return json({ ok: true, ymd, gerados });
  } catch (e) {
    console.error("diario error", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});