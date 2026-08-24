// radar-leis-notify: gera headline/subheadline persuasivas para os novos atos
// da resenha diária e dispara push (send-push) + registra o campaign_id no run.
//
// Body: { run_id: string, atos: Array<{ tipo_ato: string; numero_ato: string; ementa: string; url?: string }> }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Ato { tipo_ato: string; numero_ato: string; ementa: string; url?: string }

function emojiFor(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("emenda")) return "📜";
  if (t.includes("lei complementar")) return "🏛️";
  if (t.includes("lei")) return "⚖️";
  if (t.includes("decreto")) return "📃";
  if (t.includes("medida provisória") || t.includes("mp ")) return "⚡";
  if (t.includes("portaria")) return "📋";
  if (t.includes("resolução")) return "📢";
  if (t.includes("projeto")) return "📝";
  return "⚖️";
}

async function gerarHeadlines(atos: Ato[]): Promise<{ push_titulo: string; push_subtitulo: string; preview_headline: string; emoji: string }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const emojiBase = emojiFor(atos[0]?.tipo_ato ?? "");
  const fallback = () => {
    const grupos: Record<string, number> = {};
    for (const a of atos) grupos[a.tipo_ato] = (grupos[a.tipo_ato] ?? 0) + 1;
    const partes = Object.entries(grupos).map(([t, n]) => `${n} ${t}${n > 1 ? "s" : ""}`);
    const titulo = atos.length === 1 ? "Nova lei publicada hoje" : "Novidades no Diário Oficial";
    const sub = partes.slice(0, 3).join(" · ").slice(0, 85);
    const preview = (atos[0]?.ementa || sub).slice(0, 60);
    return { push_titulo: titulo.slice(0, 38), push_subtitulo: sub, preview_headline: preview, emoji: emojiBase };
  };
  if (!key) return fallback();

  const contexto = atos.slice(0, 8).map(a => `- ${a.tipo_ato} ${a.numero_ato}: ${a.ementa}`).join("\n");
  const prompt = `Você é editor jurídico. Foram publicadas hoje ${atos.length} normas no Diário Oficial da União. Gere headlines para notificar leitores no app.

REGRAS RÍGIDAS (não pode passar dos limites):
- "push_titulo": até 38 caracteres, punchy, SEM emoji, SEM reticências, SEM aspas.
- "push_subtitulo": até 85 caracteres, persuasivo, SEM emoji, SEM reticências.
- "preview_headline": até 60 caracteres, chamada para o card no app.
- "emoji": UM ÚNICO emoji jurídico apropriado (⚖️ 📜 🏛️ 📃 ⚡ 📋 📢 📝 💼 🇧🇷).

Retorne SOMENTE JSON no formato:
{"push_titulo":"...","push_subtitulo":"...","preview_headline":"...","emoji":"⚖️"}

Normas publicadas hoje:
${contexto}`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) { console.error("gateway", resp.status, await resp.text()); return fallback(); }
    const j = await resp.json();
    const txt = j?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(txt);
    return {
      push_titulo: String(parsed.push_titulo || "").slice(0, 40) || fallback().push_titulo,
      push_subtitulo: String(parsed.push_subtitulo || "").slice(0, 90) || fallback().push_subtitulo,
      preview_headline: String(parsed.preview_headline || "").slice(0, 60) || fallback().preview_headline,
      emoji: String(parsed.emoji || emojiBase).slice(0, 4) || emojiBase,
    };
  } catch (e) {
    console.error("headline gen failed", e);
    return fallback();
  }
}

async function gerarCapa(supabase: any, atos: Ato[], slug: string): Promise<string | null> {
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return null;
    const tipo = atos[0]?.tipo_ato ?? "Diário Oficial";
    const prompt = `Capa vertical minimalista para notificação push jurídica. Tema: "${tipo}". Estilo: gradiente escuro azul-índigo com detalhes dourados, símbolo jurídico central (balança, martelo ou brasão), sem texto. Cinemático, alto contraste, 1024x1024.`;
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-image", prompt, size: "1024x1024", n: 1 }),
    });
    if (!resp.ok) { console.error("capa gen fail", resp.status); return null; }
    const j = await resp.json();
    const b64 = j?.data?.[0]?.b64_json;
    const url = j?.data?.[0]?.url;
    let bytes: Uint8Array | null = null;
    if (b64) bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    else if (url) {
      const r = await fetch(url); const buf = new Uint8Array(await r.arrayBuffer()); bytes = buf;
    }
    if (!bytes) return null;
    const path = `${new Date().toISOString().slice(0,10)}/${slug}-${crypto.randomUUID()}.png`;
    const up = await supabase.storage.from("push-covers").upload(path, bytes, { contentType: "image/png", upsert: true });
    if (up.error) { console.error("upload cover", up.error); return null; }
    const signed = await supabase.storage.from("push-covers").createSignedUrl(path, 60 * 60 * 24 * 365);
    return signed?.data?.signedUrl ?? null;
  } catch (e) { console.error("gerarCapa", e); return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { run_id, atos } = await req.json() as { run_id?: string; atos: Ato[] };
    if (!Array.isArray(atos) || atos.length === 0) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Ler configuração da automação
    const { data: auto } = await supabase
      .from("push_automations")
      .select("*")
      .eq("key", "radar_leis_novas")
      .maybeSingle();
    if (auto && auto.enabled === false) {
      console.log("radar_leis_novas desligada — pulando push");
      return new Response(JSON.stringify({ skipped: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Quiet hours (America/Sao_Paulo)
    if (auto) {
      const hourStr = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date());
      const h = Number(hourStr);
      const q1 = auto.quiet_hours_inicio ?? 22;
      const q2 = auto.quiet_hours_fim ?? 7;
      const inQuiet = q1 < q2 ? (h >= q1 && h < q2) : (h >= q1 || h < q2);
      if (inQuiet) {
        console.log("dentro de quiet hours — pulando push");
        return new Response(JSON.stringify({ skipped: "quiet_hours" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Cooldown
      if (auto.last_run_at && auto.cooldown_minutos > 0) {
        const last = new Date(auto.last_run_at).getTime();
        if (Date.now() - last < auto.cooldown_minutos * 60_000) {
          console.log("dentro do cooldown — pulando push");
          return new Response(JSON.stringify({ skipped: "cooldown" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // 2) Idempotência: já existe campanha para esse run_id?
    if (run_id) {
      const { data: exists } = await supabase
        .from("push_campaigns")
        .select("id")
        .eq("automation_key", "radar_leis_novas")
        .contains("audience", { run_id })
        .maybeSingle();
      if (exists) {
        return new Response(JSON.stringify({ skipped: "already_sent", campaign_id: exists.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const heads = await gerarHeadlines(atos);

    // Capa: só gera se automação permitir
    const imageUrl = (auto?.usa_capa ?? true)
      ? await gerarCapa(supabase, atos, "radar-leis")
      : null;

    const clickUrl = auto?.default_url || "/radar-360";
    const audienceCfg = auto?.audience ?? { all: true, platforms: ["android", "ios", "web"], premium: "all" };
    const audienceWithRun = { ...audienceCfg, run_id: run_id ?? null };

    // cria campanha
    const { data: camp, error: campErr } = await supabase
      .from("push_campaigns")
      .insert({
        title: heads.push_titulo,
        body: heads.push_subtitulo,
        url: clickUrl,
        audience: audienceWithRun,
        recurrence: null,
        status: "sending",
        tipo: "radar_leis",
        automation_key: "radar_leis_novas",
        image_url: imageUrl,
        emoji: heads.emoji,
      })
      .select("id")
      .single();
    if (campErr) throw campErr;

    // atualiza run com preview headline e campaign
    if (run_id) {
      await supabase.from("radar_leis_runs")
        .update({
          push_campaign_id: camp.id,
          push_titulo: heads.push_titulo,
          push_subtitulo: heads.push_subtitulo,
        })
        .eq("id", run_id);
    }

    // dispara send-push
    const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
      body: JSON.stringify({
        campaign_id: camp.id,
        title: heads.push_titulo,
        body: heads.push_subtitulo,
        url: clickUrl,
        emoji: heads.emoji,
        image: imageUrl ?? undefined,
        audience: audienceCfg,
        personalize: true,
        data: {
          tipo: "radar_leis",
          run_id: run_id ?? "",
          preview_headline: heads.preview_headline,
        },
      }),
    });
    const sendJson = await sendResp.json().catch(() => ({}));

    // Marca last_run
    if (auto) {
      await supabase.from("push_automations")
        .update({ last_run_at: new Date().toISOString() })
        .eq("key", "radar_leis_novas");
    }

    return new Response(JSON.stringify({
      ok: true, campaign_id: camp.id, headlines: heads, send: sendJson,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("radar-leis-notify error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
