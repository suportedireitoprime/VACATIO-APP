// Indexa TODAS as Pesquisas Prontas do STF via Firecrawl.
// Executa em background (EdgeRuntime.waitUntil) e responde 202 imediatamente.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STF_URL = 'https://portal.stf.jus.br/jurisprudencia/pesquisarJurisprudenciaFavorita.asp';

function slugify(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 180);
}
function clean(s: string): string { return (s || '').replace(/\s+/g, ' ').trim(); }

async function firecrawlHtml(url: string): Promise<string> {
  const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['html'], onlyMainContent: false, waitFor: 8000 }),
  });
  if (!r.ok) throw new Error(`Firecrawl ${r.status}: ${(await r.text()).slice(0, 400)}`);
  const j = await r.json();
  return (j?.data?.html ?? j?.html ?? '') as string;
}

interface Item {
  tribunal: 'STF'; ramo: string; assunto: string | null; titulo: string;
  slug: string; query_url: string; query_string: string | null; ordem: number;
}

function parseStf(html: string): Item[] {
  const itens: Item[] = [];
  const used = new Set<string>();
  let ordem = 0;

  // Cada header .pesquisas-header id="ramo-XX" + painel id="painel-subramo-XX"
  const headerRe = /<div[^>]*class="[^"]*pesquisas-header[^"]*"[^>]*id="(ramo-[^"]+)"[^>]*>([\s\S]*?)<\/div>/g;
  const headers: { id: string; ramo: string }[] = [];
  let hm: RegExpExecArray | null;
  while ((hm = headerRe.exec(html)) !== null) {
    const inner = hm[2];
    const btn = inner.match(/<button[^>]*>([\s\S]*?)<\/button>/i);
    const ramo = clean((btn?.[1] ?? '').replace(/<[^>]+>/g, ''));
    if (ramo) headers.push({ id: hm[1], ramo });
  }

  for (let hi = 0; hi < headers.length; hi++) {
    const h = headers[hi];
    const painelId = h.id.replace('ramo-', 'painel-subramo-');
    const startIdx = html.indexOf(`id="${painelId}"`);
    if (startIdx < 0) continue;
    // fim do painel: próximo header ou fim do documento
    const nextHeaderIdx = hi + 1 < headers.length ? html.indexOf(`id="${headers[hi + 1].id}"`, startIdx) : html.length;
    const painel = html.slice(startIdx, nextHeaderIdx > 0 ? nextHeaderIdx : html.length);

    // sub-itens dentro do painel
    const subRe = /<div[^>]*class="[^"]*ramo-subitem[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*ramo-subitem|<\/section|<\/main|$)/g;
    let sm: RegExpExecArray | null;
    while ((sm = subRe.exec(painel)) !== null) {
      const subHtml = sm[1];
      const assuntoBtn = subHtml.match(/subitem-titulo[\s\S]*?<button[^>]*>([\s\S]*?)<\/button>/i);
      const assunto = clean((assuntoBtn?.[1] ?? '').replace(/<[^>]+>/g, '')) || null;

      const sub2 = subHtml.match(/subitem2[\s\S]*/i)?.[0] ?? subHtml;
      const linkRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      let am: RegExpExecArray | null;
      while ((am = linkRe.exec(sub2)) !== null) {
        const href = am[1].replace(/&amp;/g, '&');
        const titulo = clean(am[2].replace(/<[^>]+>/g, ''));
        if (!titulo || !href) continue;
        if (!/queryString|pages\/search/i.test(href)) continue;
        const base = [slugify(h.ramo), assunto ? slugify(assunto) : '', slugify(titulo)].filter(Boolean).join('/');
        let slug = base; let i = 2;
        while (used.has(slug)) slug = `${base}-${i++}`;
        used.add(slug);
        let qs: string | null = null;
        try { qs = new URL(href).searchParams.get('queryString'); } catch {}
        itens.push({ tribunal: 'STF', ramo: h.ramo, assunto, titulo, slug, query_url: href, query_string: qs, ordem: ordem++ });
      }
    }
  }
  return itens;
}

async function runIndex(): Promise<void> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  console.log('[STF] iniciando fetch via Firecrawl');
  const html = await firecrawlHtml(STF_URL);
  console.log(`[STF] html recebido ${html.length} bytes`);
  const itens = parseStf(html);
  console.log(`[STF] parseou ${itens.length} temas`);
  if (itens.length === 0) { console.error('[STF] nenhum item extraído'); return; }
  await admin.from('jurisprudencia_prontas').delete().eq('tribunal', 'STF');
  const CHUNK = 200;
  for (let i = 0; i < itens.length; i += CHUNK) {
    const slice = itens.slice(i, i + CHUNK);
    const { error } = await admin.from('jurisprudencia_prontas').upsert(slice, { onConflict: 'slug' });
    if (error) { console.error('[STF] upsert err', error.message, 'em chunk', i); return; }
  }
  console.log(`[STF] concluído: ${itens.length} temas`);
}

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY ausente' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // @ts-ignore EdgeRuntime disponível no Supabase Edge
  EdgeRuntime.waitUntil(runIndex().catch((e) => console.error('[STF] fatal', e)));
  return new Response(JSON.stringify({ started: true, tribunal: 'STF' }), {
    status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
