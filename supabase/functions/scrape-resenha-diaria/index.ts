import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AtoExtraido {
  tipo_ato: string; numero_ato: string; ementa: string;
  url: string; data_publicacao: string; data_dou: string;
}

const MESES_URL: Record<string, string> = {
  "01":"janeiro-resenha-diaria","02":"fevereiro-resenha-diaria",
  "03":"marco-resenha-diaria","04":"abril-resenha-diaria",
  "05":"maio-resenha-diaria","06":"junho-resenha-diaria",
  "07":"julho-resenha-diaria","08":"agosto-resenha-diaria",
  "09":"setembro-resenha-diaria","10":"outubro-resenha-diaria",
  "11":"novembro-resenha-diaria","12":"dezembro-resenha-diaria",
};

function classificarTipo(t: string): string | null {
  // Projetos de Lei do Congresso Nacional / Complementar (páginas de índice do portal)
  if (/Projetos?\s+de\s+Lei\s+Complementar|\bPLP\b/i.test(t)) return "Projeto de Lei Complementar (PLP)";
  if (/Projetos?\s+de\s+Lei\s+do\s+Congresso\s+Nacional|\bPLN\b/i.test(t)) return "Projeto de Lei do Congresso Nacional (PLN)";
  if (/Lei\s+Complementar/i.test(t)) return "Lei Complementar";
  if (/Medida\s+Provis[oó]ria/i.test(t)) return "Medida Provisória";
  if (/Decreto\s/i.test(t)) return "Decreto";
  if (/Lei\s/i.test(t)) return "Lei";
  return null;
}

function normalizeDateToISO(dateStr: string): string {
  const meses: Record<string,string> = {
    janeiro:"01",fevereiro:"02","março":"03",marco:"03",
    abril:"04",maio:"05",junho:"06",julho:"07",
    agosto:"08",setembro:"09",outubro:"10",novembro:"11",dezembro:"12",
  };
  const m = dateStr.match(/(\d{1,2})[ºª°]?\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (!m) return "";
  return `${m[3]}-${meses[m[2].toLowerCase()]||"01"}-${m[1].padStart(2,"0")}`;
}

async function fetchPage(url: string): Promise<string | null> {
  // Considera conteúdo válido quando temos ao menos 1 link para ccivil_03
  // (as tabelas da resenha listam os atos apontando pra ccivil_03/_Ato...).
  const hasContent = (html: string) =>
    /planalto\.gov\.br\/ccivil_03\/_[Aa]to/i.test(html);

  // Strategy 1 (PRIORITÁRIA): Browserless /content — renderiza JS e resolve
  // Strategy 1 (PRIORITÁRIA): Browserless /unblock — resolve o desafio F5
  // BIG-IP Bot Defense do Planalto. O /content puro devolve 500 porque o
  // Chrome trava no script anti-bot; o /unblock foi feito justamente pra isso.
  const key = Deno.env.get("BROWSERLESS_API_KEY");
  if (key) {
    try {
      const brUrl = `https://production-sfo.browserless.io/unblock?token=${key}`;
      console.log(`Trying Browserless /unblock...`);
      const resp = await fetch(brUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          content: true,
          waitForTimeout: 15000,
          ttl: 75000,
        }),
      });
      if (resp.ok) {
        const json = await resp.json().catch(() => null);
        const t = json?.content || "";
        console.log(`Browserless /unblock: ${t.length} chars`);
        if (hasContent(t)) { console.log(`Browserless OK`); return t; }
      } else {
        console.log(`Browserless ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      }
    } catch (e) { console.log(`Browserless /unblock failed: ${e}`); }
  }

  // Strategy 2: Direct fetch (funciona só se o Planalto não estiver com o desafio ativo)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
      });
      if (resp.ok) {
        const t = await resp.text();
        if (hasContent(t)) { console.log(`Direct OK: ${t.length} chars`); return t; }
      }
  } catch (e) { console.log(`Direct attempt ${attempt} failed: ${e}`); }
  }

  // Strategy 3: Jina Reader (renders JS) — fallback
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    console.log(`Trying Jina Reader...`);
    const resp = await fetch(jinaUrl, {
      headers: { "Accept": "text/html", "X-Return-Format": "html" },
    });
    if (resp.ok) {
      const t = await resp.text();
      console.log(`Jina response: ${t.length} chars`);
      if (hasContent(t)) { console.log(`Jina OK`); return t; }
    }
  } catch (e) { console.log(`Jina failed: ${e}`); }

  return null;
}

function parseResenhaHTML(html: string): AtoExtraido[] {
  const atos: AtoExtraido[] = [];

  // Extract all <a> tags pointing to planalto
  const allLinks: { url: string; text: string; pos: number }[] = [];
  const linkRe = /<a[^>]*href="(https?:\/\/[^"]*planalto\.gov\.br[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let lm;
  while ((lm = linkRe.exec(html)) !== null) {
    const text = lm[2].replace(/<[^>]+>/g, "").trim();
    if (text && !(/Mensagem\s+de\s+veto/i.test(text))) {
      allLinks.push({ url: lm[1], text, pos: lm.index });
    }
  }

  // Extract all date occurrences
  const dateRe = /(\d{1,2}[ºª°]?\s+de\s+(?:janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4})/gi;
  const dates: { raw: string; iso: string; pos: number }[] = [];
  let dm;
  while ((dm = dateRe.exec(html)) !== null) {
    const iso = normalizeDateToISO(dm[1]);
    if (iso) dates.push({ raw: dm[1], iso, pos: dm.index });
  }

  for (const link of allLinks) {
    const tipo = classificarTipo(link.text);
    if (!tipo) continue;
    // Atos individuais (Leis/Decretos/MPs) precisam ser ccivil_03. Já os
    // Projetos de Lei (PLP/PLN) são páginas de portal — aceitos como estão
    // e sua raspagem é feita no popular-texto-resenha via Browserless.
    const ehProjeto = /^Projeto\s+de\s+Lei/i.test(tipo);
    if (!ehProjeto && !/ccivil_03\/_?[Aa]to|ccivil_03\/(leis|decreto|mpv|constituicao)/i.test(link.url)) continue;
    if (ehProjeto && !/planalto\.gov\.br/i.test(link.url)) continue;

    let bestDate = dates[0];
    for (const d of dates) { if (d.pos <= link.pos) bestDate = d; else break; }
    if (!bestDate) continue;

    const ementaMatch = link.text.match(/\s+-\s+(.+)/);
    const ementa = ementaMatch ? ementaMatch[1].trim() : link.text;

    atos.push({
      tipo_ato: tipo, numero_ato: link.text.substring(0, 200),
      ementa: ementa.substring(0, 500), url: link.url,
      data_publicacao: bestDate.raw, data_dou: bestDate.iso,
    });
  }
  console.log(`Parsed ${atos.length} atos`);
  return atos;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Parse body para conhecer origem/notify
  let origem = "cron";
  let notify = true;
  try {
    const b = await req.json();
    if (b?.origem) origem = String(b.origem);
    if (b?.notify === false) notify = false;
  } catch { /* body opcional */ }

  // Cria linha de run
  const { data: runRow } = await supabase
    .from("radar_leis_runs")
    .insert({ origem, status: "ok", novos_count: 0 })
    .select("id")
    .single();
  const runId: string | undefined = runRow?.id;

  try {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const curMonth = String(now.getMonth() + 1).padStart(2, "0");
    const prevMonth = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0");
    const curYear = now.getFullYear();
    const prevYear = now.getMonth() === 0 ? curYear - 1 : curYear;

    const allAtos: AtoExtraido[] = [];

    // O URL genérico (mês sem ano) é o que o Planalto mantém atualizado.
    // Os URLs com ano explícito costumam ser stubs vazios; ficam como fallback.
    const monthSlugCur = MESES_URL[curMonth];
    const monthSlugPrev = MESES_URL[prevMonth];
    const urlsCur = [
      `https://www4.planalto.gov.br/legislacao/portal-legis/resenha-diaria/${monthSlugCur}`,
      `https://www4.planalto.gov.br/legislacao/portal-legis/resenha-diaria/${curYear}/${monthSlugCur}-${curYear}`,
    ];
    for (const u of urlsCur) {
      const html = await fetchPage(u);
      if (html) { allAtos.push(...parseResenhaHTML(html)); break; }
    }

    if (now.getDate() <= 5 || allAtos.length === 0) {
      const urlsPrev = [
        `https://www4.planalto.gov.br/legislacao/portal-legis/resenha-diaria/${monthSlugPrev}`,
        `https://www4.planalto.gov.br/legislacao/portal-legis/resenha-diaria/${prevYear}/${monthSlugPrev}-${prevYear}`,
      ];
      for (const u of urlsPrev) {
        const html = await fetchPage(u);
        if (html) { allAtos.push(...parseResenhaHTML(html)); break; }
      }
    }

    // (sem filtro de data — depende do que o Planalto expõe naquele momento)

    const seen = new Set<string>();
    const unique = allAtos.filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; });

    // Descobrir quais URLs ainda não existiam (novos reais)
    let novosIds: string[] = [];
    let novosAtos: AtoExtraido[] = [];
    if (unique.length > 0) {
      const urls = unique.map(a => a.url);
      const { data: existentes } = await supabase
        .from("resenha_diaria")
        .select("url")
        .in("url", urls);
      const existSet = new Set((existentes ?? []).map((r: any) => r.url));
      novosAtos = unique.filter(a => !existSet.has(a.url));

      const { data: inserted, error } = await supabase.from("resenha_diaria").upsert(
        unique.map(a => ({ tipo_ato: a.tipo_ato, numero_ato: a.numero_ato, ementa: a.ementa, url: a.url, data_publicacao: a.data_publicacao, data_dou: a.data_dou })),
        { onConflict: "url", ignoreDuplicates: true }
      ).select("id,url");
      if (error) throw error;
      const urlToId = new Map((inserted ?? []).map((r: any) => [r.url, r.id]));
      // Para atos novos, pega o id via select por segurança
      if (novosAtos.length > 0) {
        const { data: idsRows } = await supabase
          .from("resenha_diaria")
          .select("id,url")
          .in("url", novosAtos.map(a => a.url));
        for (const r of (idsRows ?? []) as any[]) urlToId.set(r.url, r.id);
        novosIds = novosAtos.map(a => urlToId.get(a.url)).filter(Boolean);
      }
    }

    // Encadeia popular-texto-resenha (busca texto integral + explicação IA)
    if (novosAtos.length > 0) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/popular-texto-resenha`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({ limit: 20 }),
        }).then(r => r.json()).then(j => console.log("popular-texto-resenha:", JSON.stringify(j)));
      } catch (chainErr) {
        console.error("Failed to chain popular-texto-resenha:", chainErr);
      }
    }

    // Notifica se houver novidades
    if (notify && novosAtos.length > 0) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/radar-leis-notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          body: JSON.stringify({
            run_id: runId,
            atos: novosAtos.map(a => ({ tipo_ato: a.tipo_ato, numero_ato: a.numero_ato, ementa: a.ementa, url: a.url })),
          }),
        });
      } catch (nErr) {
        console.error("radar-leis-notify chain failed:", nErr);
      }
    }

    // Finaliza run
    const status = novosAtos.length > 0 ? "ok" : "sem_novidades";
    if (runId) {
      await supabase.from("radar_leis_runs")
        .update({
          concluido_em: new Date().toISOString(),
          status,
          novos_count: novosAtos.length,
          atos_ids: novosIds,
        })
        .eq("id", runId);
    }

    return new Response(JSON.stringify({ message: `Scraped ${unique.length} atos`, count: unique.length, novos: novosAtos.length, run_id: runId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Error:", err);
    if (runId) {
      await supabase.from("radar_leis_runs")
        .update({ concluido_em: new Date().toISOString(), status: "erro", erro: String(err) })
        .eq("id", runId);
    }
    return new Response(JSON.stringify({ error: String(err), run_id: runId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
