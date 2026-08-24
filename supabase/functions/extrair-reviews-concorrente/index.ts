// Concorrentes: extrai reviews do Google Play via Browserless com progresso em tempo real.
// Modos:
//   { mode: "extrair",  concorrente_id, max_scrolls? }
//   { mode: "analisar", concorrente_id }
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function parseDataBR(txt?: string | null): { data: string | null; ano: number | null } {
  if (!txt) return { data: null, ano: null };
  const t = txt.trim().toLowerCase();
  const m = t.match(/(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  if (m) {
    const dia = parseInt(m[1], 10);
    const mes = MESES[m[2]] || 1;
    const ano = parseInt(m[3], 10);
    return { data: `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`, ano };
  }
  const y = t.match(/(20\d{2})/);
  if (y) return { data: null, ano: parseInt(y[1], 10) };
  return { data: null, ano: null };
}

// Script único: metadata + reviews em uma chamada.
const BROWSER_SCRIPT = `
export default async function ({ page, context }) {
  const { url, maxScrolls } = context;
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Metadata: nome, desenvolvedor, ícone, downloads, categoria, total avaliações, descrição
  const meta = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const nomeApp = (q('h1[itemprop="name"] span')?.textContent || q('h1 span')?.textContent || '').trim() || null;

    let icon = null;
    const imgs = Array.from(document.querySelectorAll('img'));
    for (const img of imgs) {
      const src = img.getAttribute('src') || '';
      const w = img.naturalWidth || img.width;
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      if (src.includes('play-lh.googleusercontent.com') && (w >= 96 || alt.includes('ícone') || alt.includes('icon'))) {
        icon = src.replace(/=w\\d+[^"]*/, '=w512-h512').replace(/=s\\d+[^"]*/, '=s512');
        break;
      }
    }

    let dev = null;
    for (const a of Array.from(document.querySelectorAll('a[href*="/store/apps/dev"], a[href*="developer"]'))) {
      const t = (a.textContent || '').trim();
      if (t && t.length < 80) { dev = t; break; }
    }

    // Métricas — Downloads / Avaliações / Categoria — buscar pelo texto
    let downloads = null, totalAval = null, categoria = null;
    const bodyTxt = document.body.innerText || '';
    const dm = bodyTxt.match(/([\\d.,]+\\s*(?:mil|mi|milh(?:ão|ões)|bilh(?:ão|ões))\\+?)\\s*\\n?\\s*downloads/i);
    if (dm) downloads = dm[1].replace(/\\s+/g, ' ').trim();
    const am = bodyTxt.match(/([\\d.,]+\\s*(?:mil|mi|milh(?:ão|ões))?)\\s*avalia(?:ç|c)(?:ão|ões|oes)/i);
    if (am) {
      const raw = am[1].toLowerCase().replace(/\\s+/g, '');
      let n = parseFloat(raw.replace(',', '.').replace(/mil|mi|milhão|milhões|milhoes/g, '')) || null;
      if (n) {
        if (/mil/.test(raw)) n = Math.round(n * 1000);
        else if (/mi|milh/.test(raw)) n = Math.round(n * 1_000_000);
        totalAval = Math.round(n);
      }
    }

    // Descrição — meta description ou primeiro parágrafo grande
    const md = q('meta[name="description"]')?.getAttribute('content');
    let descricao = md || null;
    if (!descricao) {
      const p = Array.from(document.querySelectorAll('div')).find((d) => (d.textContent || '').length > 300);
      descricao = p ? (p.textContent || '').slice(0, 3000) : null;
    }

    return { nomeApp, icon, dev, downloads, totalAval, categoria, descricao };
  });

  // Abrir modal "Ver todas as avaliações"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a, span[role="button"]'));
    const cands = ['ver todas as avaliações', 'see all reviews', 'ver todas as avaliacoes'];
    for (const b of btns) {
      const t = (b.textContent || '').trim().toLowerCase();
      if (cands.some((c) => t === c)) { (b).click(); return; }
    }
  });
  await new Promise((r) => setTimeout(r, 1500));

  const hasModal = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div'));
    let best = null; let bestCount = 0;
    for (const d of all) {
      const st = getComputedStyle(d);
      if ((st.overflowY === 'auto' || st.overflowY === 'scroll') && d.scrollHeight > d.clientHeight + 50) {
        const c = d.querySelectorAll('header').length;
        if (c > bestCount) { bestCount = c; best = d; }
      }
    }
    if (best) { best.setAttribute('data-reviews-scroller', '1'); return true; }
    return false;
  });

  let lastH = 0; let stable = 0;
  for (let i = 0; i < maxScrolls; i++) {
    const h = await page.evaluate((hm) => {
      if (hm) {
        const el = document.querySelector('[data-reviews-scroller="1"]');
        if (el) { el.scrollTop = el.scrollHeight; return el.scrollHeight; }
      }
      window.scrollTo(0, document.body.scrollHeight);
      return document.body.scrollHeight;
    }, hasModal);
    await new Promise((r) => setTimeout(r, 900));
    if (h === lastH) { stable++; if (stable >= 2) break; } else { stable = 0; lastH = h; }
  }

  const reviews = await page.evaluate(() => {
    const out = [];
    const nodes = Array.from(document.querySelectorAll('[aria-label*="estrela"], [aria-label*="star"]'));
    const seen = new Set();
    for (const star of nodes) {
      let parent = star.closest('div');
      for (let i = 0; i < 6 && parent; i++) {
        if (parent.querySelector('header') && (parent.textContent || '').length > 40) break;
        parent = parent.parentElement;
      }
      if (!parent) continue;
      const key = parent.getBoundingClientRect().top + ':' + (parent.textContent || '').slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      const aria = star.getAttribute('aria-label') || '';
      const rm = aria.match(/(\\d)/);
      const rating = rm ? parseInt(rm[1], 10) : null;
      const header = parent.querySelector('header');
      const autor = header ? (header.textContent || '').trim().split('\\n')[0].trim() : null;
      let dataTxt = null;
      for (const s of parent.querySelectorAll('span, time, div')) {
        const t = (s.textContent || '').trim();
        if (/\\d{1,2}\\s+de\\s+[a-zç]+\\s+de\\s+\\d{4}/i.test(t) && t.length < 40) { dataTxt = t; break; }
      }
      let texto = '';
      for (const c of parent.querySelectorAll('div, span, p')) {
        const t = (c.textContent || '').trim();
        if (t.length > texto.length && t.length > 40 && !/^\\d/.test(t) && !t.includes(autor || '_____')) texto = t;
      }
      let resposta = null;
      const idx = (parent.textContent || '').indexOf('Resposta do desenvolvedor');
      if (idx !== -1) resposta = (parent.textContent || '').slice(idx + 'Resposta do desenvolvedor'.length).trim().slice(0, 4000);
      out.push({ autor, rating, dataTxt, texto: texto.slice(0, 8000), resposta });
    }
    return out;
  });

  return { data: { meta, reviews } };
}
`;

// Log em memória, escrito no banco a cada setProgress (evita race conditions)
type LogEntry = { t: string; msg: string; level?: "info" | "warn" | "error" };
const runLogs = new Map<string, LogEntry[]>();

function pushLog(id: string, msg: string, level: LogEntry["level"] = "info") {
  const arr = runLogs.get(id) || [];
  arr.push({ t: new Date().toISOString(), msg, level });
  // manter últimos 200
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  runLogs.set(id, arr);
  console.log(`[${level}] ${msg}`);
}

async function setProgress(supabase: any, id: string, pct: number, etapa: string, extra: Record<string, any> = {}) {
  pushLog(id, etapa);
  await supabase
    .from("concorrentes")
    .update({
      job_status: pct >= 100 ? "done" : pct < 0 ? "error" : "running",
      job_progresso: { pct: Math.max(0, Math.min(100, pct)), etapa, ...extra },
      job_atualizado_em: new Date().toISOString(),
      job_logs: runLogs.get(id) || [],
    })
    .eq("id", id);
}

// Otimiza URL do Google Play CDN para WebP compacto (~4–8 KB).
function otimizarIcone(src: string | null | undefined): string | null {
  if (!src) return null;
  // Google Play CDN aceita "=w{px}-h{px}-rw" (rw = WebP responsive).
  return src.replace(/=w\d+[^"]*/, "=w192-h192-rw").replace(/=s\d+[^"]*/, "=s192-rw");
}

async function extrair(supabase: any, concorrente_id: string, max_scrolls: number) {
  runLogs.set(concorrente_id, []); // reset log da execução
  const { data: conc, error: e0 } = await supabase.from("concorrentes").select("*").eq("id", concorrente_id).single();
  if (e0 || !conc) throw new Error("Concorrente não encontrado");

  const brKey = Deno.env.get("BROWSERLESS_API_KEY");
  if (!brKey) throw new Error("BROWSERLESS_API_KEY não configurado");

  await setProgress(supabase, concorrente_id, 5, "Iniciando extração…");

  const url = conc.url || `https://play.google.com/store/apps/details?id=${conc.package_id}&hl=${conc.hl || "pt_BR"}`;
  await setProgress(supabase, concorrente_id, 12, "Abrindo página no Browserless…");

  const controller = new AbortController();
  const tick = (async () => {
    const marks = [
      [20, "Coletando metadados do app…"],
      [30, "Abrindo lista de avaliações…"],
      [45, "Carregando reviews (rolagem 1/3)…"],
      [58, "Carregando reviews (rolagem 2/3)…"],
      [72, "Carregando reviews (rolagem 3/3)…"],
    ] as const;
    for (const [pct, etapa] of marks) {
      if (controller.signal.aborted) return;
      await setProgress(supabase, concorrente_id, pct, etapa);
      await new Promise((r) => setTimeout(r, 4500));
    }
  })();

  const brResp = await fetch(`https://production-sfo.browserless.io/function?token=${brKey}&timeout=60000`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: BROWSER_SCRIPT, context: { url, maxScrolls: Math.min(Math.max(max_scrolls, 5), 25) } }),
  });
  controller.abort();
  await tick.catch(() => {});

  if (!brResp.ok) {
    const t = await brResp.text();
    await setProgress(supabase, concorrente_id, -1, `Falha Browserless: ${brResp.status}`);
    throw new Error(`Browserless ${brResp.status}: ${t.slice(0, 500)}`);
  }
  const brJson = await brResp.json();
  const payload = brJson?.data || brJson || {};
  const meta = payload.meta || {};
  const reviews: any[] = payload.reviews || [];
  pushLog(concorrente_id, `Browserless retornou ${reviews.length} reviews · logo=${meta.icon ? "sim" : "não"}`);

  // ⚡ Salva META imediatamente — logo aparece na UI ANTES do processamento das reviews.
  const iconOtimizado = otimizarIcone(meta.icon) || conc.icon_url;
  await supabase.from("concorrentes").update({
    icon_url: iconOtimizado,
    nome_app: meta.nomeApp || conc.nome_app,
    desenvolvedor: meta.dev || conc.desenvolvedor,
    downloads_texto: meta.downloads || conc.downloads_texto,
    total_avaliacoes_play: meta.totalAval || conc.total_avaliacoes_play,
    categoria_play: meta.categoria || conc.categoria_play,
    descricao: meta.descricao || conc.descricao,
  }).eq("id", concorrente_id);

  await setProgress(supabase, concorrente_id, 82, `Metadados salvos. Preparando ${reviews.length} avaliações…`, { extraidos: reviews.length });

  // Prepara todas as rows (com hash) — em paralelo pra ser rápido.
  let somaRating = 0, contRating = 0;
  const rows = await Promise.all(reviews.map(async (r) => {
    if (!r || (!r.texto && !r.autor)) return null;
    const { data: dt, ano } = parseDataBR(r.dataTxt);
    const rating = typeof r.rating === "number" ? r.rating : null;
    if (rating) { somaRating += rating; contRating++; }
    const hash = await sha256(`${r.autor || ""}|${dt || r.dataTxt || ""}|${(r.texto || "").slice(0, 200)}`);
    return {
      concorrente_id, review_hash: hash, autor: r.autor || null, rating,
      data_publicacao: dt, ano, texto: r.texto || null, resposta_dev: r.resposta || null,
    };
  }));
  const validRows = rows.filter(Boolean) as any[];

  // Upsert em chunks para não estourar CPU/memória do worker
  const CHUNK = 100;
  let processados = 0;
  for (let i = 0; i < validRows.length; i += CHUNK) {
    const chunk = validRows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("concorrente_reviews")
      .upsert(chunk, { onConflict: "concorrente_id,review_hash", ignoreDuplicates: false });
    if (error) pushLog(concorrente_id, `Erro chunk ${i}: ${error.message}`, "warn");
    processados += chunk.length;
    const pct = 82 + Math.round(((processados / Math.max(validRows.length, 1)) * 17));
    await setProgress(supabase, concorrente_id, pct, `Salvando ${processados}/${validRows.length}…`, { extraidos: reviews.length });
  }

  const { count: total } = await supabase
    .from("concorrente_reviews").select("id", { count: "exact", head: true }).eq("concorrente_id", concorrente_id);
  const avg = contRating > 0 ? Number((somaRating / contRating).toFixed(2)) : null;

  await supabase.from("concorrentes").update({
    total_reviews: total ?? reviews.length,
    avg_rating: avg,
    ultima_extracao_em: new Date().toISOString(),
  }).eq("id", concorrente_id);

  await setProgress(supabase, concorrente_id, 100, "Concluído", { extraidos: reviews.length, total: total ?? reviews.length });

  return { ok: true, extraidos: reviews.length, total: total ?? reviews.length, avg_rating: avg, meta };
}

async function analisar(supabase: any, concorrente_id: string) {
  const { data: reviews, error } = await supabase
    .from("concorrente_reviews")
    .select("autor, rating, data_publicacao, texto")
    .eq("concorrente_id", concorrente_id)
    .not("texto", "is", null)
    .order("data_publicacao", { ascending: false })
    .limit(500);
  if (error) throw error;
  if (!reviews?.length) throw new Error("Nenhuma review para analisar. Extraia primeiro.");

  const lista = reviews.map((r: any, i: number) => `#${i + 1} [${r.rating || "?"}★ ${r.data_publicacao || ""}] ${r.autor || "anon"}: ${(r.texto || "").slice(0, 500)}`).join("\n");
  // Política: sempre gemini-2.5-flash-lite. Ver docs/gemini-2.5-flash-lite.md
  const modelo = "google/gemini-2.5-flash-lite";
  const NOSSO_APP = `NOSSO APP (Vade Mecum Pro / Vacatio) — funcionalidades já existentes:
- Vade Mecum completo (Constituição, Códigos, Estatutos, Leis Federais) com hierarquia (Livro/Título/Capítulo/Seção)
- Busca por número de artigo, número de lei, nome/apelido/tag da lei; busca por voz
- Favoritar artigos, anotações pessoais (texto + áudio), grifos coloridos
- Narração dos artigos (TTS) e narração de blog posts
- Explicação didática do artigo com IA, jurisprudência, questões de estudo
- Blog jurídico com posts diários gerados por IA, comentários, likes, "Em Alta"
- Notícias jurídicas com resenha diária
- Boletins jurídicos (áudio/vídeo)
- Radar de leis (monitora alterações no Planalto)
- Biblioteca (clássicos, OAB, português, liderança, pesquisa científica, fora da toga)
- Temática jurídica (filmes/séries com contexto jurídico)
- Videoaulas e reels
- Chat com IA (Mentor/Horus) para dúvidas jurídicas, também via WhatsApp
- Assinatura Google Play (Premium)
- Modo escuro, ajuste de tamanho de fonte, compartilhamento`;

  const prompt = `Você é analista de produto sênior. A seguir estão ${reviews.length} avaliações reais do Google Play de um app JURÍDICO concorrente. Sua tarefa: identificar padrões e comparar com o NOSSO APP para gerar plano de ação.

${NOSSO_APP}

Retorne APENAS JSON válido (sem markdown) com esta estrutura EXATA:
{
  "resumo_geral": "1-2 parágrafos sobre a percepção geral do concorrente",
  "elogios": [{ "tema": "...", "count": N, "citacoes": ["trecho", "trecho"], "temos": true|false, "obs": "como nosso app entrega isso ou o que falta" }],
  "criticas": [{ "tema": "...", "count": N, "citacoes": ["...", "..."], "risco_pra_nos": "alto|medio|baixo", "obs": "por que devemos nos preocupar / como já mitigamos" }],
  "funcionalidades_pedidas": [{ "tema": "...", "count": N, "citacoes": ["..."], "temos": true|false, "obs": "..." }],
  "bugs_recorrentes": [{ "tema": "...", "count": N, "citacoes": ["...", "..."] }],
  "dores": [{ "tema": "...", "count": N, "citacoes": ["...", "..."] }],
  "vantagens_nossas": ["pontos em que o nosso app é superior baseado nas críticas ao concorrente"],
  "riscos_nossos": ["coisas que o concorrente faz bem que nosso app não faz ou faz pior"],
  "oportunidades": ["ideia acionável 1 baseada nas dores/pedidos", "ideia 2", "..."]
}

Regras:
- Máx. 8 itens em cada lista, ordenados por count desc.
- "count" = número aproximado de reviews que citam o tema.
- "citacoes" = 2 a 4 trechos curtos (máx 160 chars) literais das reviews.
- "temos" = true se o NOSSO APP já tem essa função (baseado na lista acima), false caso contrário.
- "obs" = frase curta e concreta comparando com nosso app.
- "elogios" foca no que os USUÁRIOS elogiam do concorrente.
- "criticas" foca no que os USUÁRIOS reclamam — categorize risco pra nós.
- "oportunidades" = 4 a 8 ideias práticas SÓ do que ainda não temos.

AVALIAÇÕES:
${lista}`;

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify({
      model: modelo,
      messages: [
        { role: "system", content: "Você retorna apenas JSON válido, sem markdown." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!aiResp.ok) {
    const t = await aiResp.text();
    throw new Error(`AI ${aiResp.status}: ${t.slice(0, 400)}`);
  }
  const raw = (await aiResp.json())?.choices?.[0]?.message?.content || "{}";
  let resumo: any;
  try { resumo = JSON.parse(raw); } catch { resumo = { erro_parse: true, raw }; }

  const { data: inserted, error: e2 } = await supabase
    .from("concorrente_analises")
    .insert({ concorrente_id, resumo, total_analisado: reviews.length, modelo })
    .select().single();
  if (e2) throw e2;
  return { ok: true, analise: inserted };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { mode, concorrente_id, max_scrolls = 20 } = body || {};
    if (!concorrente_id) throw new Error("concorrente_id obrigatório");
    if (!mode || (mode !== "extrair" && mode !== "analisar")) throw new Error("mode deve ser 'extrair' ou 'analisar'");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (mode === "extrair") {
      // Fire-and-forget: cliente acompanha via Realtime em `concorrentes.job_progresso`.
      await setProgress(supabase, concorrente_id, 2, "Enfileirado…");
      // @ts-ignore EdgeRuntime global
      EdgeRuntime.waitUntil(
        extrair(supabase, concorrente_id, max_scrolls).catch(async (e: any) => {
          console.error("extrair bg:", e);
          await setProgress(supabase, concorrente_id, -1, `Erro: ${e?.message || e}`);
        })
      );
      return new Response(JSON.stringify({ ok: true, queued: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await analisar(supabase, concorrente_id);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
