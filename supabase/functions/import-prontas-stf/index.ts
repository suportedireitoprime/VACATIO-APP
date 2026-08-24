// Edge function: importa o catálogo de Pesquisas Prontas do STF.
// Faz scrape do HTML público e faz upsert em public.jurisprudencia_prontas.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { DOMParser, Element } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts';

const STF_URL = 'https://portal.stf.jus.br/jurisprudencia/pesquisarJurisprudenciaFavorita.asp';
// Fallbacks: alguns hosts do STF entregam cadeia TLS incompleta que o runtime
// do Deno recusa. Tentamos direto e, em caso de erro TLS, via proxies públicos.
const STF_FETCH_URLS = [
  STF_URL,
  `https://api.allorigins.win/raw?url=${encodeURIComponent(STF_URL)}`,
  `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(STF_URL)}`,
  `https://corsproxy.io/?${encodeURIComponent(STF_URL)}`,
];

async function fetchStfHtml(): Promise<string> {
  let lastErr: unknown = null;
  for (const url of STF_FETCH_URLS) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Vacatio/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (!r.ok) { lastErr = new Error(`HTTP ${r.status} em ${url}`); continue; }
      const t = await r.text();
      if (t && t.length > 5000 && t.includes('pesquisas-header')) return t;
      lastErr = new Error(`Resposta inesperada de ${url} (${t.length} bytes)`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Falha ao obter HTML do STF');
}

function slugify(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 180);
}

function clean(s: string): string {
  return (s || '').replace(/\s+/g, ' ').trim();
}

interface Item {
  tribunal: 'STF';
  ramo: string;
  assunto: string | null;
  titulo: string;
  slug: string;
  query_url: string;
  query_string: string | null;
  ordem: number;
}

function parseStf(html: string): Item[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) throw new Error('Falha ao parsear HTML do STF');

  const itens: Item[] = [];
  const usedSlugs = new Set<string>();
  let ordem = 0;

  const headers = doc.querySelectorAll('.pesquisas-header');
  headers.forEach((headerNode) => {
    const header = headerNode as unknown as Element;
    const ramo = clean(header.querySelector('button')?.textContent || '');
    if (!ramo) return;

    const id = header.getAttribute('id') || '';
    const painelId = id.replace('ramo-', 'painel-subramo-');
    const painel = doc.getElementById(painelId);
    if (!painel) return;

    const subs = painel.querySelectorAll('.ramo-subitem');
    subs.forEach((subNode) => {
      const sub = subNode as unknown as Element;
      const assunto = clean(sub.querySelector('.subitem-titulo button')?.textContent || '') || null;

      const links = sub.querySelectorAll('.subitem2 a[href]');
      links.forEach((aNode) => {
        const a = aNode as unknown as Element;
        const titulo = clean(a.textContent || '');
        const href = a.getAttribute('href') || '';
        if (!titulo || !href) return;

        const baseSlug = [slugify(ramo), assunto ? slugify(assunto) : '', slugify(titulo)]
          .filter(Boolean)
          .join('/');
        let slug = baseSlug;
        let i = 2;
        while (usedSlugs.has(slug)) { slug = `${baseSlug}-${i++}`; }
        usedSlugs.add(slug);

        let query_string: string | null = null;
        try {
          const u = new URL(href);
          query_string = u.searchParams.get('queryString');
        } catch { /* ignore */ }

        itens.push({
          tribunal: 'STF',
          ramo,
          assunto,
          titulo,
          slug,
          query_url: href,
          query_string,
          ordem: ordem++,
        });
      });
    });
  });

  return itens;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);
    let body: any = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    const dryRun = url.searchParams.get('dry_run') === '1' || body?.dry_run === true;
    const wipe = url.searchParams.get('wipe') === '1' || body?.wipe === true;

    const html = await fetchStfHtml();
    const itens = parseStf(html);

    if (dryRun) {
      return new Response(JSON.stringify({ total: itens.length, sample: itens.slice(0, 5) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (wipe) {
      await admin.from('jurisprudencia_prontas').delete().eq('tribunal', 'STF');
    }

    // Upsert em lotes para evitar payloads gigantes.
    const CHUNK = 200;
    let inserted = 0;
    for (let i = 0; i < itens.length; i += CHUNK) {
      const slice = itens.slice(i, i + CHUNK);
      const { error } = await admin
        .from('jurisprudencia_prontas')
        .upsert(slice, { onConflict: 'slug' });
      if (error) {
        return new Response(JSON.stringify({ error: error.message, inserted, chunk: i }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      inserted += slice.length;
    }

    return new Response(JSON.stringify({ ok: true, total: itens.length, inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});