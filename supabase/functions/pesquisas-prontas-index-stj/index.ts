// Indexa TODAS as Pesquisas Prontas do STJ via Firecrawl.
// Estrutura da página SCON: botões .btnAbreMateria (matéria) + link .linkPesquisaMateria
// e listas <li> com <a>tema</a> + <button data-lppt="ID">.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STJ_URL = 'https://scon.stj.jus.br/SCON/pesquisa_pronta/listaPP.jsp';

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
  tribunal: 'STJ'; ramo: string; assunto: string | null; titulo: string;
  slug: string; query_url: string; query_string: string | null; ordem: number;
}

function parseStj(html: string): Item[] {
  const itens: Item[] = [];
  const used = new Set<string>();
  let ordem = 0;

  // Isola o container .listaTemasPP (evita menus)
  const listaStart = html.indexOf('listaTemasPP');
  const scoped = listaStart >= 0 ? html.slice(listaStart) : html;

  // Encontra todas as matérias — botão + link + div collapse
  // Padrão: <button ... btnAbreMateria ... data-bs-target="#divMateria0" ...>NOME<...
  //         <a href="..." class="linkPesquisaMateria">
  //         <div ... id="divMateria0" ...> ... </div>
  const matRe = /<button[^>]*btnAbreMateria[^>]*data-bs-target="#(divMateria\d+|divRecentes)"[^>]*>([\s\S]*?)<\/button>/g;
  const materias: { id: string; ramo: string; startIdx: number }[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = matRe.exec(scoped)) !== null) {
    const ramo = clean(mm[2].replace(/<[^>]+>/g, ''));
    if (!ramo) continue;
    materias.push({ id: mm[1], ramo, startIdx: mm.index });
  }
  // Fallback: se listou Recentes com nome do botão diferente, força
  if (!materias.some(m => m.id === 'divRecentes')) {
    const rIdx = scoped.indexOf('id="divRecentes"');
    if (rIdx > 0) materias.unshift({ id: 'divRecentes', ramo: 'Pesquisas Prontas em Destaque', startIdx: rIdx });
  }

  for (let hi = 0; hi < materias.length; hi++) {
    const m = materias[hi];
    // Extrai o conteúdo do div correspondente
    const divIdx = scoped.indexOf(`id="${m.id}"`);
    if (divIdx < 0) continue;
    // Fim = próxima matéria ou fim de listaTemasPP
    const nextIdx = hi + 1 < materias.length ? materias[hi + 1].startIdx : scoped.length;
    const bloco = scoped.slice(divIdx, nextIdx);

    // Cada <li> com <a title="..."> ... <button data-lppt="ID" ...
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/g;
    let lm: RegExpExecArray | null;
    while ((lm = liRe.exec(bloco)) !== null) {
      const li = lm[1];
      const aMatch = li.match(/<a[^>]*title="[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      const titulo = clean((aMatch?.[1] ?? '').replace(/<[^>]+>/g, ''));
      const lpptMatch = li.match(/data-lppt="(\d+)"/i);
      const lppt = lpptMatch?.[1] ?? null;
      if (!titulo) continue;
      if (!lppt) continue; // apenas temas com ID de pesquisa pronta
      // URL do resultado: usa o buscador do SCON com o ID lppt filtrando .ppt.
      // Ex.: https://scon.stj.jus.br/SCON/pesquisar.jsp?livre=<ID>.ppt.&b=ACOR&p=true&thesaurus=JURIDICO
      const query_url = `https://scon.stj.jus.br/SCON/pesquisar.jsp?livre=${lppt}.ppt.&b=ACOR&p=true&thesaurus=JURIDICO&l=10`;
      const base = [slugify('stj'), slugify(m.ramo), slugify(titulo)].filter(Boolean).join('/');
      let slug = base; let i = 2;
      while (used.has(slug)) slug = `${base}-${i++}`;
      used.add(slug);
      itens.push({
        tribunal: 'STJ', ramo: m.ramo, assunto: null, titulo,
        slug, query_url, query_string: `${lppt}.ppt.`, ordem: ordem++,
      });
    }
  }
  return itens;
}

async function runIndex(): Promise<void> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  console.log('[STJ] iniciando fetch via Firecrawl');
  const html = await firecrawlHtml(STJ_URL);
  console.log(`[STJ] html recebido ${html.length} bytes`);
  const itens = parseStj(html);
  console.log(`[STJ] parseou ${itens.length} temas`);
  if (itens.length === 0) { console.error('[STJ] nenhum item extraído'); return; }
  await admin.from('jurisprudencia_prontas').delete().eq('tribunal', 'STJ');
  const CHUNK = 200;
  for (let i = 0; i < itens.length; i += CHUNK) {
    const slice = itens.slice(i, i + CHUNK);
    const { error } = await admin.from('jurisprudencia_prontas').upsert(slice, { onConflict: 'slug' });
    if (error) { console.error('[STJ] upsert err', error.message, 'em chunk', i); return; }
  }
  console.log(`[STJ] concluído: ${itens.length} temas`);
}

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY ausente' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // @ts-ignore EdgeRuntime disponível no Supabase Edge
  EdgeRuntime.waitUntil(runIndex().catch((e) => console.error('[STJ] fatal', e)));
  return new Response(JSON.stringify({ started: true, tribunal: 'STJ' }), {
    status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
