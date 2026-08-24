import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { geminiFetch } from "../_shared/geminiFetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch cron jobs and their recent runs
    const { data: cronJobs, error: cronErr } = await supabaseAdmin.rpc(
      "admin_get_cron_status"
    ).maybeSingle();

    // Fallback: query cron schema directly
    let jobs: any[] = [];
    try {
      const { data: rawJobs } = await supabaseAdmin
        .from("cron.job" as any)
        .select("jobid, schedule, active, jobname, command")
        .order("jobid");

      if (!rawJobs || rawJobs.length === 0) {
        // Use direct SQL via pg
        const pgRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/admin_get_cron_jobs`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
              "Content-Type": "application/json",
            },
          }
        );
        if (pgRes.ok) {
          jobs = await pgRes.json();
        }
      } else {
        jobs = rawJobs;
      }
    } catch {
      // cron schema not accessible, will return empty
    }

    // 2. Parse edge function names from cron commands
    const parsedJobs = jobs.map((j: any) => {
      const fnMatch = j.command?.match(/functions\/v1\/([a-z0-9-]+)/i);
      return {
        jobid: j.jobid,
        jobname: j.jobname || fnMatch?.[1] || "unknown",
        schedule: j.schedule,
        active: j.active,
        functionName: fnMatch?.[1] || null,
      };
    });

    // 3. Test API keys
    const apiKeyResults: Record<string, { status: string; message: string }> = {};

    // Gemini
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey) {
      try {
        const r = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
          { signal: AbortSignal.timeout(5000) }
        );
        apiKeyResults.Gemini = r.ok
          ? { status: "ok", message: "Conectado" }
          : { status: "error", message: `HTTP ${r.status}` };
      } catch (e: any) {
        apiKeyResults.Gemini = { status: "error", message: e.message || "Timeout" };
      }
    } else {
      apiKeyResults.Gemini = { status: "missing", message: "Chave não configurada" };
    }

    // YouTube
    const ytKey = Deno.env.get("YOUTUBE_API_KEY");
    if (ytKey) {
      try {
        const r = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${ytKey}`,
          { signal: AbortSignal.timeout(5000) }
        );
        apiKeyResults.YouTube = r.ok
          ? { status: "ok", message: "Conectado" }
          : { status: r.status === 403 ? "warning" : "error", message: `HTTP ${r.status} — cota pode estar esgotada` };
      } catch (e: any) {
        apiKeyResults.YouTube = { status: "error", message: e.message || "Timeout" };
      }
    } else {
      apiKeyResults.YouTube = { status: "missing", message: "Chave não configurada" };
    }

    // TinyPNG
    const tinyKey = Deno.env.get("TINIFY_API_KEY");
    if (tinyKey) {
      try {
        const r = await fetch("https://api.tinify.com/shrink", {
          method: "POST",
          headers: { Authorization: `Basic ${btoa(`api:${tinyKey}`)}` },
          body: new Uint8Array(0),
          signal: AbortSignal.timeout(5000),
        });
        // 400 = bad input but key works; 401 = bad key; 429 = rate limit
        apiKeyResults.TinyPNG =
          r.status === 401
            ? { status: "error", message: "Chave inválida" }
            : r.status === 429
            ? { status: "warning", message: "Rate limit atingido" }
            : { status: "ok", message: "Conectado" };
      } catch (e: any) {
        apiKeyResults.TinyPNG = { status: "error", message: e.message || "Timeout" };
      }
    } else {
      apiKeyResults.TinyPNG = { status: "missing", message: "Chave não configurada" };
    }

    // Perplexity
    const perpKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (perpKey) {
      apiKeyResults.Perplexity = { status: "ok", message: "Configurada" };
    } else {
      apiKeyResults.Perplexity = { status: "missing", message: "Chave não configurada" };
    }

    // Browserless
    const brKey = Deno.env.get("BROWSERLESS_API_KEY");
    if (brKey) {
      apiKeyResults.Browserless = { status: "ok", message: "Configurada" };
    } else {
      apiKeyResults.Browserless = { status: "missing", message: "Chave não configurada" };
    }

    // Mistral
    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    if (mistralKey) {
      apiKeyResults.Mistral = { status: "ok", message: "Configurada" };
    } else {
      apiKeyResults.Mistral = { status: "missing", message: "Chave não configurada" };
    }

    // 4. List known edge functions
    const edgeFunctions = [
      "assistente-juridica", "buscar-videoaulas", "gerar-artigo-educacional",
      "gerar-estudo", "gerar-resumo", "narrar-artigo",
      "otimizar-imagem", "popular-constituicao-estadual", "popular-decretos",
      "popular-explicacoes", "popular-legislacao", "popular-leis-ordinarias",
      "popular-radar-deputados", "popular-radar-proposicoes", "popular-radar-ranking",
      "popular-radar-senadores", "popular-radar-votacoes", "popular-sumulas",
      "popular-texto-decretos", "popular-texto-leis", "popular-texto-resenha",
      "processar-pdf", "scrape-inteiro-teor",
      "scrape-legislacao", "scrape-noticias", "scrape-resenha-diaria", "admin-monitor",
    ];

    return new Response(
      JSON.stringify({
        cronJobs: parsedJobs,
        apiKeys: apiKeyResults,
        edgeFunctions,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
