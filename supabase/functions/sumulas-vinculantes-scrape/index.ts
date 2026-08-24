// Raspa as Súmulas Vinculantes do STF via Firecrawl e popula
// public.sumulas_vinculantes. Actions:
//   - seed: baixa o índice e faz upsert dos 63 stubs (numero + url + situacao)
//   - fetch_one: raspa uma SV específica (?numero=N)
//   - fetch_all: itera todas (concorrência limitada)
//   - seed_and_fetch_all: seed + fetch_all em uma única chamada

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const INDEX_URL = 'https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=26';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function firecrawlScrape(url: string, waitFor = 8000): Promise<string> {
  if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');
  const resp = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Firecrawl ${resp.status}: ${err.slice(0, 400)}`);
  }
  const data = await resp.json();
  return (data?.data?.markdown ?? data?.markdown ?? '') as string;
}

// Limpa artefatos do markdown do portal STF mas PRESERVA links.
function cleanSTFPreserveLinks(s: string): string {
  return s
    .replace(/\\_/g, '_')
    .replace(/\\\./g, '.')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/(?:arrow_drop_up|arrow_drop_down|view_list|picture_as_pdf|file_copy|format_quote|content_copy|expand_more|expand_less|open_in_new|chevron_right|chevron_left|help_outline|info_outline|share|print|download|more_vert|keyboard_arrow_up|keyboard_arrow_down)/gi, '')
    .replace(/^[ \t]+$/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface SumulaStub {
  numero: number;
  referencia: string;
  situacao: 'vigente' | 'cancelada';
}

function parseIndex(md: string): SumulaStub[] {
  const stubs: SumulaStub[] = [];
  // Ex.: [Súmula Vinculante 9 _(cance​lada)_](https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=26&sumula=1212)
  const re = /\[S[uú]mula\s+Vinculante\s+(\d+)([^\]]*)\]\((https:\/\/portal\.stf\.jus\.br\/jurisprudencia\/sumariosumulas\.asp\?base=26&sumula=\d+)\)/gi;
  const seen = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const numero = parseInt(m[1], 10);
    if (seen.has(numero)) continue;
    seen.add(numero);
    const tail = (m[2] || '').toLowerCase();
    const situacao: 'vigente' | 'cancelada' = /cance.?lada/.test(tail) ? 'cancelada' : 'vigente';
    stubs.push({ numero, referencia: m[3], situacao });
  }
  return stubs.sort((a, b) => a.numero - b.numero);
}

interface Sections {
  enunciado: string;
  precedentes_representativos: string[];
  teses_repercussao_geral: string[];
  jurisprudencia_selecionada: string[];
  observacao: string[];
  data_publicacao: string | null;
}

// Cabeçalhos fixos que o portal usa. A ordem NÃO é garantida entre SVs, então
// procuramos as posições e usamos elas como delimitadores.
const HEADINGS: Array<{ key: keyof Sections | 'ignore'; re: RegExp }> = [
  { key: 'precedentes_representativos', re: /^\s*Precedentes?\s+Representativos?\s*$/im },
  { key: 'teses_repercussao_geral', re: /^\s*Teses?\s+de\s+Repercuss[aã]o\s+Geral\s*$/im },
  { key: 'jurisprudencia_selecionada', re: /^\s*Jurisprud[eê]ncia\s+selecionada\s*$/im },
  { key: 'observacao', re: /^\s*Observa[çc][aã]o\s*$/im },
];

function splitParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function parseDetail(md: string, numero: number): Sections {
  const clean = cleanSTFPreserveLinks(md);

  const enunciadoHeadingRe = new RegExp(`^\\s*S[uú]mula\\s+Vinculante\\s+${numero}\\b[^\\n]*$`, 'im');
  const eMatch = clean.match(enunciadoHeadingRe);
  const enunciadoStart = eMatch ? (eMatch.index! + eMatch[0].length) : 0;

  // Encontrar índices de cada seção (a partir de enunciadoStart)
  const cuts: Array<{ key: keyof Sections; start: number; headerEnd: number }> = [];
  const scope = clean.slice(enunciadoStart);
  for (const h of HEADINGS) {
    const m = scope.match(h.re);
    if (m && m.index !== undefined) {
      cuts.push({
        key: h.key as keyof Sections,
        start: enunciadoStart + m.index,
        headerEnd: enunciadoStart + m.index + m[0].length,
      });
    }
  }
  cuts.sort((a, b) => a.start - b.start);

  const firstSectionStart = cuts.length > 0 ? cuts[0].start : clean.length;
  const enunciado = clean.slice(enunciadoStart, firstSectionStart).trim();

  const sections: Sections = {
    enunciado,
    precedentes_representativos: [],
    teses_repercussao_geral: [],
    jurisprudencia_selecionada: [],
    observacao: [],
    data_publicacao: null,
  };

  for (let i = 0; i < cuts.length; i++) {
    const cur = cuts[i];
    const end = i + 1 < cuts.length ? cuts[i + 1].start : clean.length;
    const body = clean.slice(cur.headerEnd, end).trim();
    sections[cur.key] = splitParagraphs(body) as never;
  }

  // Data de publicação: costuma aparecer em "Data de publicação do enunciado: DJE de ..."
  const dp = clean.match(/Data de publica[çc][aã]o[^\n]*?:\s*([^\n]+)/i);
  if (dp) sections.data_publicacao = dp[1].trim();

  return sections;
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx]);
      } catch (e) {
        out[idx] = { error: (e as Error).message, item: items[idx] } as unknown as R;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const action = (body.action ?? url.searchParams.get('action') ?? 'seed_and_fetch_all') as string;

    if (action === 'seed' || action === 'seed_and_fetch_all') {
      const md = await firecrawlScrape(INDEX_URL, 6000);
      const stubs = parseIndex(md);
      if (stubs.length === 0) return json({ error: 'no stubs parsed from index', preview: md.slice(0, 400) }, 500);

      const rows = stubs.map((s) => ({
        numero: s.numero,
        referencia: s.referencia,
        situacao: s.situacao,
        enunciado: '',
        extras: {},
      }));
      // upsert sem sobrescrever enunciado/extras já preenchidos
      const { error } = await supabase
        .from('sumulas_vinculantes')
        .upsert(rows, { onConflict: 'numero', ignoreDuplicates: false });
      if (error) return json({ step: 'seed', error: error.message }, 500);

      if (action === 'seed') return json({ ok: true, seeded: stubs.length });

      // fetch_all abaixo usa as próprias referências
      const targets = stubs;
      const results = await pool(targets, 4, async (s) => {
        const detailMd = await firecrawlScrape(s.referencia, 8000);
        const parsed = parseDetail(detailMd, s.numero);
        const { error: upErr } = await supabase
          .from('sumulas_vinculantes')
          .update({
            enunciado: parsed.enunciado,
            situacao: s.situacao,
            data_publicacao: parsed.data_publicacao,
            referencia: s.referencia,
            extras: {
              precedentes_representativos: parsed.precedentes_representativos,
              teses_repercussao_geral: parsed.teses_repercussao_geral,
              jurisprudencia_selecionada: parsed.jurisprudencia_selecionada,
              observacao: parsed.observacao,
            },
          })
          .eq('numero', s.numero);
        if (upErr) return { numero: s.numero, error: upErr.message };
        return { numero: s.numero, enunciado_len: parsed.enunciado.length };
      });
      const ok = results.filter((r) => !(r as { error?: string }).error).length;
      return json({ ok: true, seeded: stubs.length, fetched: ok, results });
    }

    if (action === 'fetch_one') {
      const numero = Number(body.numero ?? url.searchParams.get('numero'));
      if (!numero) return json({ error: 'numero is required' }, 400);
      const { data: row } = await supabase
        .from('sumulas_vinculantes')
        .select('numero, referencia, situacao')
        .eq('numero', numero)
        .maybeSingle();
      if (!row?.referencia) return json({ error: 'seed first (missing referencia)' }, 400);
      const detailMd = await firecrawlScrape(row.referencia as string, 8000);
      const parsed = parseDetail(detailMd, numero);
      const { error: upErr } = await supabase
        .from('sumulas_vinculantes')
        .update({
          enunciado: parsed.enunciado,
          data_publicacao: parsed.data_publicacao,
          extras: {
            precedentes_representativos: parsed.precedentes_representativos,
            teses_repercussao_geral: parsed.teses_repercussao_geral,
            jurisprudencia_selecionada: parsed.jurisprudencia_selecionada,
            observacao: parsed.observacao,
          },
        })
        .eq('numero', numero);
      if (upErr) return json({ error: upErr.message }, 500);
      return json({ ok: true, numero, enunciado_preview: parsed.enunciado.slice(0, 240) });
    }

    if (action === 'fetch_all') {
      const { data: rows, error } = await supabase
        .from('sumulas_vinculantes')
        .select('numero, referencia, situacao')
        .order('numero');
      if (error) return json({ error: error.message }, 500);
      const targets = (rows ?? []).filter((r) => r.referencia);
      return await runFetch(supabase, targets);
    }

    if (action === 'fetch_missing') {
      const { data: rows, error } = await supabase
        .from('sumulas_vinculantes')
        .select('numero, referencia, situacao, enunciado')
        .order('numero');
      if (error) return json({ error: error.message }, 500);
      const targets = (rows ?? []).filter((r) => r.referencia && (!r.enunciado || (r.enunciado as string).length < 30));
      return await runFetch(supabase, targets);
    }

    return json({ error: `unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

async function runFetch(supabase: ReturnType<typeof createClient>, targets: Array<{ numero: number | string; referencia: string | null; situacao?: string }>) {
      const results = await pool(targets, 4, async (s) => {
        const detailMd = await firecrawlScrape(s.referencia as string, 8000);
        const parsed = parseDetail(detailMd, s.numero as number);
        const { error: upErr } = await supabase
          .from('sumulas_vinculantes')
          .update({
            enunciado: parsed.enunciado,
            data_publicacao: parsed.data_publicacao,
            extras: {
              precedentes_representativos: parsed.precedentes_representativos,
              teses_repercussao_geral: parsed.teses_repercussao_geral,
              jurisprudencia_selecionada: parsed.jurisprudencia_selecionada,
              observacao: parsed.observacao,
            },
          })
          .eq('numero', s.numero);
        if (upErr) return { numero: s.numero, error: upErr.message };
        return { numero: s.numero, enunciado_len: parsed.enunciado.length };
      });
  return json({ ok: true, count: targets.length, results });
}