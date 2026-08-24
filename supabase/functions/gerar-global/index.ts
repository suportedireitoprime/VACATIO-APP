import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { geminiFetch } from "../_shared/geminiFetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABELAS = [
  "CF88_CONSTITUICAO_FEDERAL","CP_CODIGO_PENAL","CC_CODIGO_CIVIL",
  "CPC_CODIGO_PROCESSO_CIVIL","CPP_CODIGO_PROCESSO_PENAL",
  "CTN_CODIGO_TRIBUTARIO_NACIONAL","CDC_CODIGO_DEFESA_CONSUMIDOR",
  "CLT_CONSOLIDACAO_LEIS_TRABALHO","ECA_ESTATUTO_CRIANCA_ADOLESCENTE",
  "CTB_CODIGO_TRANSITO_BRASILEIRO","EI_ESTATUTO_IDOSO",
  "EPD_ESTATUTO_PESSOA_DEFICIENCIA","EOAB_ESTATUTO_OAB",
  "CE_CODIGO_ELEITORAL","CFLOR_CODIGO_FLORESTAL",
  "CPM_CODIGO_PENAL_MILITAR","CPPM_CODIGO_PROCESSO_PENAL_MILITAR",
  "CBA_CODIGO_BRASILEIRO_AERONAUTICA","CCOM_CODIGO_COMERCIAL",
  "CMIN_CODIGO_MINAS","CTEL_CODIGO_TELECOMUNICACOES",
  "CAGUA_CODIGO_AGUAS","EC_ESTATUTO_CIDADE",
  "ED_ESTATUTO_DESARMAMENTO","EIND_ESTATUTO_INDIO",
  "EIR_ESTATUTO_IGUALDADE_RACIAL","EJ_ESTATUTO_JUVENTUDE",
  "EM_ESTATUTO_MILITARES","EME_ESTATUTO_MICROEMPRESA",
  "EMET_ESTATUTO_METROPOLE","EMIG_ESTATUTO_MIGRACAO",
  "EMUS_ESTATUTO_MUSEUS","EPC_ESTATUTO_PESSOA_CANCER",
  "EREF_ESTATUTO_REFUGIADO","ET_ESTATUTO_TORCEDOR",
  "ETERRA_ESTATUTO_TERRA",
  "LEP_EXECUCAO_PENAL","LMP_MARIA_PENHA","LD_LEI_DROGAS",
  "LOC_ORGANIZACAO_CRIMINOSA","LAA_ABUSO_AUTORIDADE",
  "LIT_INTERCEPTACAO_TELEFONICA","L8112_SERVIDORES_FEDERAIS",
  "LIA_IMPROBIDADE_ADMINISTRATIVA","NLL_LICITACOES",
  "LMS_MANDADO_SEGURANCA","LACP_ACAO_CIVIL_PUBLICA",
  "LJE_JUIZADOS_ESPECIAIS","LGPD_PROTECAO_DADOS",
  "MCI_MARCO_CIVIL_INTERNET","LF_FALENCIAS",
  "LA_ARBITRAGEM","LI_INQUILINATO",
  "LRP_REGISTROS_PUBLICOS","LOMAN_LEI_ORGANICA_MAGISTRATURA",
  "LAT_ANTITERRORISMO",
  "LBPS_BENEFICIOS_PREVIDENCIA","LCSS_CUSTEIO_SEGURIDADE",
  "LPC_PREVIDENCIA_COMPLEMENTAR",
  "CES_CODIGO_ETICA_SERVIDOR",
];

const MODOS = ["explicacao", "exemplo", "termos", "sugerir_perguntas"];
const MAX_RETRIES = 3;

function buildPrompt(modo: string, artigo: { numero: string; caput: string; texto: string }, tabela: string) {
  const ctx = `Lei/Código: ${tabela.replace(/_/g, " ")}\n${artigo.numero}\n${artigo.caput || artigo.texto}`;
  switch (modo) {
    case "explicacao":
      return { system: "Você é um professor de Direito Brasileiro. Explique artigos de forma clara, didática e completa em português.", prompt: `Explique o seguinte artigo de lei de forma completa, clara e didática. Inclua contexto, finalidade e aplicação prática.\n\n${ctx}` };
    case "exemplo":
      return { system: "Você é um professor de Direito que cria exemplos práticos e realistas para ilustrar artigos de lei.", prompt: `Crie 2-3 exemplos práticos e realistas que ilustrem a aplicação do seguinte artigo:\n\n${ctx}` };
    case "termos":
      return { system: "Você é um glossarista jurídico especializado em terminologia legal brasileira.", prompt: `Identifique e defina os termos jurídicos técnicos presentes no seguinte artigo. Forneça definições claras e acessíveis.\n\n${ctx}` };
    case "sugerir_perguntas":
      return { system: "Você é um tutor jurídico que cria perguntas de estudo sobre artigos de lei.", prompt: `Gere 5 perguntas de estudo relevantes sobre o seguinte artigo, variando entre conceituais, práticas e de interpretação:\n\n${ctx}\n\nRetorne APENAS um JSON array de strings, ex: ["Pergunta 1?", "Pergunta 2?"]` };
    default:
      return { system: "", prompt: ctx };
  }
}

async function callGemini(keys: string[], prompt: string, system: string): Promise<{ text: string | null; rateLimited: boolean }> {
  const { logAiCall } = await import("../_shared/ai-log.ts");
  const model = "gemini-flash-latest";
  const startedAt = Date.now();
  let success = false, errMsg: string | undefined;
  let inputUnits = 0, outputUnits = 0;
  let rateLimited = false;
  try {
    for (const apiKey of keys) {
      try {
        const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            }),
            signal: AbortSignal.timeout(30000),
          }
        );
        if (res.status === 429) {
          console.warn(`Gemini 429 on key, trying fallback...`);
          errMsg = "429 rate limited";
          continue;
        }
        if (!res.ok) {
          errMsg = `HTTP ${res.status}`;
          console.error(`Gemini HTTP ${res.status}`);
          return { text: null, rateLimited: false };
        }
        const json = await res.json();
        inputUnits  = Number(json?.usageMetadata?.promptTokenCount ?? 0) || 0;
        outputUnits = Number(json?.usageMetadata?.candidatesTokenCount ?? 0) || 0;
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
        success = !!text;
        return { text, rateLimited: false };
      } catch (e: any) {
        errMsg = String(e?.message ?? e).slice(0, 300);
        console.error(`Gemini error: ${errMsg}`);
        return { text: null, rateLimited: false };
      }
    }
    rateLimited = true;
    return { text: null, rateLimited: true };
  } finally {
    await logAiCall({
      functionName: "gerar-global",
      kind: "text",
      model,
      triggerType: "auto",
      inputUnits, outputUnits,
      durationMs: Date.now() - startedAt,
      success, error: success ? undefined : (rateLimited ? "all keys rate limited" : errMsg),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
  const geminiKeys = [GEMINI_KEY].filter(Boolean) as string[];
  if (!geminiKeys.length) return new Response(JSON.stringify({ error: "No API key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // GET — return current state
  if (req.method === "GET") {
    const { data } = await supabase.from("geracao_global").select("*").limit(1).single();
    return json(data);
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  // STOP — pause the queue
  if (action === "stop") {
    await supabase.from("geracao_global").update({ status: "paused", updated_at: new Date().toISOString() }).neq("status", "idle");
    return json({ ok: true, status: "paused" });
  }

  // START — count pending and set running
  if (action === "start") {
    console.log("[gerar-global] START — counting...");
    let totalArticles = 0;
    for (const tabela of TABELAS) {
      const { count } = await supabase.from(tabela as any).select("*", { count: "exact", head: true });
      totalArticles += (count || 0);
    }
    const totalPossible = totalArticles * MODOS.length;
    const { count: cachedCount } = await supabase.from("artigo_ai_cache").select("*", { count: "exact", head: true }).in("modo", MODOS);
    const totalPending = totalPossible - (cachedCount || 0);

    await supabase.from("geracao_global").update({
      status: "running",
      total_pendentes: totalPending,
      total_processadas: 0,
      total_erros: 0,
      current_tabela: null,
      current_artigo: null,
      current_modo: null,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cooldown_until: null,
      retry_count: 0,
      last_error: null,
      cursor_tabela_idx: 0,
      cursor_modo_idx: 0,
    }).not("id", "is", null);

    console.log(`[gerar-global] Pending: ${totalPending}`);
    return json({ ok: true, status: "running", totalPending });
  }

  // TICK — process one item (called by cron every minute)
  if (action === "tick") {
    const { data: state } = await supabase.from("geracao_global").select("*").limit(1).single();
    if (!state || state.status !== "running") {
      return json({ ok: true, stopped: true });
    }

    // Respect cooldown
    if (state.cooldown_until && new Date(state.cooldown_until) > new Date()) {
      console.log(`[tick] In cooldown until ${state.cooldown_until}`);
      return json({ ok: true, cooldown: true, cooldown_until: state.cooldown_until });
    }

    // Deterministic cursor: start from saved position
    const tIdx = state.cursor_tabela_idx || 0;
    const mIdx = state.cursor_modo_idx || 0;

    // Iterate from cursor position through all tabelas/modos
    for (let ti = tIdx; ti < TABELAS.length; ti++) {
      const tabela = TABELAS[ti];
      const startModo = (ti === tIdx) ? mIdx : 0;

      for (let mi = startModo; mi < MODOS.length; mi++) {
        const modo = MODOS[mi];

        // Get all cached article numbers for this tabela+modo
        const { data: cached } = await supabase
          .from("artigo_ai_cache")
          .select("artigo_numero")
          .eq("tabela_nome", tabela)
          .eq("modo", modo);
        const cachedSet = new Set((cached || []).map((c: any) => c.artigo_numero));

        // Get ALL articles (no limit)
        const { data: artigos } = await supabase
          .from(tabela as any)
          .select("numero, caput, texto")
          .order("ordem_numero", { ascending: true });

        const artigo = (artigos || []).find((a: any) => !cachedSet.has(a.numero));
        if (!artigo) continue; // all done for this tabela+modo, move on

        // Found an uncached article — process it
        console.log(`[tick] ${tabela} → ${artigo.numero} [${modo}]`);
        await supabase.from("geracao_global").update({
          current_tabela: tabela,
          current_artigo: artigo.numero,
          current_modo: modo,
          cursor_tabela_idx: ti,
          cursor_modo_idx: mi,
          updated_at: new Date().toISOString(),
        }).not("id", "is", null);

        const { prompt, system } = buildPrompt(modo, artigo, tabela);
        const { text: result, rateLimited } = await callGemini(geminiKeys, prompt, system);

        if (result) {
          // Success
          await supabase.from("artigo_ai_cache").upsert(
            { tabela_nome: tabela, artigo_numero: artigo.numero, modo, conteudo: result },
            { onConflict: "tabela_nome,artigo_numero,modo" }
          );
          await supabase.from("geracao_global").update({
            total_processadas: (state.total_processadas || 0) + 1,
            retry_count: 0,
            last_error: null,
            last_success_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).not("id", "is", null);
          console.log(`[tick] ✓ ${tabela} ${artigo.numero} [${modo}]`);
          return json({ ok: true, done: false, item: `${tabela}/${artigo.numero}/${modo}` });

        } else if (rateLimited) {
          const retries = (state.retry_count || 0) + 1;
          if (retries >= MAX_RETRIES) {
            // Skip this item after too many retries
            console.log(`[tick] ✗ Skipping ${tabela} ${artigo.numero} [${modo}] after ${retries} retries`);
            await supabase.from("geracao_global").update({
              total_erros: (state.total_erros || 0) + 1,
              retry_count: 0,
              last_error: `429 rate limited ${retries}x — skipped`,
              // Set cooldown of 3 minutes before trying next item
              cooldown_until: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }).not("id", "is", null);
            // Mark this specific item in cache as error so we skip it
            await supabase.from("artigo_ai_cache").upsert(
              { tabela_nome: tabela, artigo_numero: artigo.numero, modo, conteudo: "__ERROR_SKIPPED__" },
              { onConflict: "tabela_nome,artigo_numero,modo" }
            );
            return json({ ok: true, done: false, skipped: true });
          } else {
            // Cooldown 2 minutes and retry same item next time
            const cooldownMinutes = 2;
            console.log(`[tick] ⏳ Rate limited (attempt ${retries}/${MAX_RETRIES}), cooldown ${cooldownMinutes}min`);
            await supabase.from("geracao_global").update({
              retry_count: retries,
              last_error: `429 rate limited (attempt ${retries}/${MAX_RETRIES})`,
              cooldown_until: new Date(Date.now() + cooldownMinutes * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }).not("id", "is", null);
            return json({ ok: true, done: false, rateLimited: true, cooldown_until: new Date(Date.now() + cooldownMinutes * 60 * 1000).toISOString() });
          }

        } else {
          // Other error — skip item
          console.log(`[tick] ✗ Error on ${tabela} ${artigo.numero} [${modo}]`);
          await supabase.from("geracao_global").update({
            total_erros: (state.total_erros || 0) + 1,
            last_error: `Generation failed for ${artigo.numero} [${modo}]`,
            updated_at: new Date().toISOString(),
          }).not("id", "is", null);
          // Skip by marking as error
          await supabase.from("artigo_ai_cache").upsert(
            { tabela_nome: tabela, artigo_numero: artigo.numero, modo, conteudo: "__ERROR_SKIPPED__" },
            { onConflict: "tabela_nome,artigo_numero,modo" }
          );
          return json({ ok: true, done: false, error: true });
        }
      }
    }

    // No more pending items
    await supabase.from("geracao_global").update({ status: "done", updated_at: new Date().toISOString() }).not("id", "is", null);
    return json({ ok: true, done: true });
  }

  return json({ error: "Unknown action" }, 400);
});
