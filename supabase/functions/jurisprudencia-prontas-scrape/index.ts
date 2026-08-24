// Raspa acórdãos de uma Pesquisa Pronta (STF/STJ) via Firecrawl e cacheia.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface Acordao {
  ordem: number;
  titulo: string;
  orgao: string | null;
  relator: string | null;
  data_julgamento: string | null;
  data_publicacao: string | null;
  ementa: string | null;
  url_inteiro_teor: string | null;
  observacao: string | null;
  url_pdf: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function firecrawlScrape(url: string, waitFor = 15000): Promise<string> {
  const resp = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: false,
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

// Limpa artefatos do markdown do portal STF (Firecrawl):
// - remove ícones do Material Icons (arrow_drop_up/down, view_list, picture_as_pdf, etc.)
// - remove escapes de underscore ("\\_")
// - converte "#### Foo" em "**Foo**"
// - preserva o texto de links mas descarta a URL
function cleanSTF(s: string): string {
  const out = s
    // 1º: desescapa underscores/pontos (markdown do STF escapa \_ e \.)
    .replace(/\\_/g, '_')
    .replace(/\\\./g, '.')
    // strip material icon tokens (may appear repeated on the same line separated by spaces)
    .replace(/(?:arrow_drop_up|arrow_drop_down|view_list|picture_as_pdf|file_copy|format_quote|content_copy|expand_more|expand_less|open_in_new|chevron_right|chevron_left|help_outline|info_outline|share|print|download|more_vert|keyboard_arrow_up|keyboard_arrow_down)/gi, '')
    // remove linhas que ficaram só com espaços após a limpeza dos ícones
    .replace(/^[ \t]+$/gm, '')
    // "#### Tema" -> "**Tema**"
    .replace(/^#{1,6}\s*([^\n]+?)\s*$/gm, '**$1**')
    // link markdown -> apenas texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // links vazios [](url) -> remove
    .replace(/\[\]\([^)]*\)/g, '')
    // linhas horizontais decorativas
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    // colapsa espaços/linhas
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return out;
}

// Parser STF: markdown tem blocos que começam com [**<TITULO>**](<url>) e
// seguem com "#### Órgão julgador: ...", "#### Relator(a): ...", etc., até
// o próximo item ou a seção de "Observação".
function parseSTF(md: string): Acordao[] {
  const acordaos: Acordao[] = [];
  // Regex robusta pro título — link em negrito iniciando um bloco.
  const re = /\[\*\*([^\]]+?)\*\*\]\(([^)]+)\)/g;
  const matches: { titulo: string; url: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const url = m[2];
    // filtrar só links de acórdãos (contêm /pages/search/ ou sjur)
    if (!/sjur|pages\/search\//i.test(url)) continue;
    matches.push({ titulo: m[1].trim(), url, index: m.index });
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const nextIdx = i + 1 < matches.length ? matches[i + 1].index : md.length;
    const block = md.slice(cur.index, nextIdx);
    const orgao = block.match(/####\s*Órgão julgador:\s*([^\n]+)/)?.[1]?.trim() ?? null;
    const relator = block.match(/####\s*Relator\(a\):\s*([^\n]+)/)?.[1]?.trim() ?? null;
    const dtj = block.match(/####\s*Julgamento:\s*([^\n]+)/)?.[1]?.trim() ?? null;
    const dtp = block.match(/####\s*Publicação:\s*([^\n]+)/)?.[1]?.trim() ?? null;

    // Corpo do acórdão: pega TUDO após "#### Publicação: ..." (ou após o
    // metadata) até o fim do bloco. Isso inclui Ementa, Decisão, Indexação,
    // Acórdão, Tema, Tese — o portal renderiza tudo inline.
    const metaEnd = (() => {
      const anchors = [
        /####\s*Publicação:[^\n]*\n/,
        /####\s*Julgamento:[^\n]*\n/,
        /####\s*Relator\(a\):[^\n]*\n/,
        /####\s*Órgão julgador:[^\n]*\n/,
      ];
      let best = -1;
      for (const r of anchors) {
        const mm = block.match(r);
        if (mm && mm.index !== undefined) {
          const end = mm.index + mm[0].length;
          if (end > best) best = end;
        }
      }
      return best === -1 ? 0 : best;
    })();

    const body = block.slice(metaEnd);

    // Observação: extrai antes de limpar
    let observacao: string | null = null;
    const obs = body.match(
      /####\s*Observação\s*\n+([\s\S]+?)(?=\n####\s*(?:Ementa|Decisão|Indexação|Acórdão|Tema|Tese|Órgão|Relator|Julgamento|Publicação)|\n\[\*\*|$)/,
    );
    if (obs) {
      observacao = cleanSTF(obs[1]);
      if (observacao.length > 6000) observacao = observacao.slice(0, 6000) + '…';
    }

    let ementa = cleanSTF(body);
    // Remove PDF/link icons finais que não fazem parte do texto
    ementa = ementa.replace(/\n?\s*Inteiro Teor\s*$/i, '').trim();
    if (ementa.length > 20000) ementa = ementa.slice(0, 20000) + '…';
    if (!ementa) ementa = null as unknown as string;

    // PDF do inteiro teor (paginadorpub, .pdf ou link marcado como "picture_as_pdf")
    let url_pdf: string | null = null;
    const pdfMatch =
      block.match(/\((https?:\/\/[^)]*paginadorpub[^)]+)\)/i) ||
      block.match(/\((https?:\/\/[^)]+\.pdf[^)]*)\)/i) ||
      block.match(/picture_as_pdf[^\(]*\((https?:\/\/[^)]+)\)/i);
    if (pdfMatch) url_pdf = pdfMatch[1];

    acordaos.push({
      ordem: i,
      titulo: cur.titulo,
      orgao,
      relator,
      data_julgamento: dtj,
      data_publicacao: dtp,
      ementa: ementa || null,
      url_inteiro_teor: cur.url,
      observacao,
      url_pdf,
    });
  }
  return acordaos;
}

// Parser STJ (best-effort). O portal SCON renderiza resultados via JS; se o
// markdown não trouxer nada reconhecível, retornamos vazio e o frontend cai
// no link externo.
function parseSTJ(md: string): Acordao[] {
  const acordaos: Acordao[] = [];
  // Padrão comum no SCON: "Processo\n\n<TITULO>" seguido de "Relator(a)", "Órgão Julgador", "Data do Julgamento", "Ementa"
  const chunks = md.split(/\n(?=(?:Processo|RECURSO|AGRAVO|HABEAS|MANDADO|CONFLITO)\b)/i);
  let ordem = 0;
  for (const chunk of chunks) {
    const titMatch = chunk.match(/^(?:Processo\s*\n+)?([A-Z][A-Z\s\d\-\.\/]{3,80})/);
    const relator = chunk.match(/Relator\(a\)[:\s]*([^\n]+)/i)?.[1]?.trim() ?? null;
    const orgao = chunk.match(/Órgão Julgador[:\s]*([^\n]+)/i)?.[1]?.trim() ?? null;
    const dtj = chunk.match(/Data do Julgamento[:\s]*([^\n]+)/i)?.[1]?.trim() ?? null;
    const dtp = chunk.match(/Data da Publicação[/\w\s]*[:\s]*([^\n]+)/i)?.[1]?.trim() ?? null;
    const em = chunk.match(/Ementa[:\s]*\n+([\s\S]{40,4000}?)(?=\n(?:Acórdão|Processo|$))/i);
    if (!titMatch || !relator) continue;
    acordaos.push({
      ordem: ordem++,
      titulo: titMatch[1].trim(),
      orgao,
      relator,
      data_julgamento: dtj,
      data_publicacao: dtp,
      ementa: em?.[1]?.trim() ?? null,
      url_inteiro_teor: null,
      observacao: null,
      url_pdf: null,
    });
  }
  return acordaos;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    if (!FIRECRAWL_API_KEY) return json({ error: 'FIRECRAWL_API_KEY ausente' }, 500);

    const { pesquisa_id, force } = await req.json().catch(() => ({}));
    if (!pesquisa_id) return json({ error: 'pesquisa_id obrigatório' }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: pesquisa, error: pErr } = await supabase
      .from('jurisprudencia_prontas')
      .select('id, tribunal, query_url, titulo')
      .eq('id', pesquisa_id)
      .maybeSingle();
    if (pErr || !pesquisa) return json({ error: 'Pesquisa não encontrada' }, 404);

    // Cache: se já tem resultados recentes, retorna.
    if (!force) {
      const { data: cached } = await supabase
        .from('jurisprudencia_prontas_resultados')
        .select('*')
        .eq('pesquisa_id', pesquisa_id)
        .order('ordem', { ascending: true });
      if (cached && cached.length > 0) {
        const age = Date.now() - new Date(cached[0].fetched_at as string).getTime();
        if (age < CACHE_TTL_MS) {
          return json({ cached: true, tribunal: pesquisa.tribunal, acordaos: cached });
        }
      }
    }

    const tribunal = String(pesquisa.tribunal).toUpperCase();
    const md = await firecrawlScrape(pesquisa.query_url as string, tribunal === 'STJ' ? 12000 : 15000);
    const acordaos = tribunal === 'STJ' ? parseSTJ(md) : parseSTF(md);

    if (acordaos.length === 0) {
      return json({ cached: false, tribunal, acordaos: [], warning: 'Nenhum acórdão extraído' });
    }

    // Substitui cache
    await supabase.from('jurisprudencia_prontas_resultados').delete().eq('pesquisa_id', pesquisa_id);
    const rows = acordaos.map((a) => ({ ...a, pesquisa_id, fetched_at: new Date().toISOString() }));
    const { data: inserted, error: insErr } = await supabase
      .from('jurisprudencia_prontas_resultados')
      .insert(rows)
      .select('*');
    if (insErr) console.error('insert cache', insErr);

    return json({ cached: false, tribunal, acordaos: inserted ?? rows });
  } catch (e) {
    console.error('scrape error', e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});