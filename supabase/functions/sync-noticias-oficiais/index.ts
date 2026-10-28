// sync-noticias-oficiais
// Sincroniza notícias oficiais usando Browserless:
// - STF (Supremo Tribunal Federal) -> public.noticias_stf
// - Câmara dos Deputados -> public.noticias_camara
// - Senado Federal -> public.noticias_senado

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NoticiaItem {
  titulo: string;
  resumo: string;
  conteudo_md: string | null;
  imagem_url: string | null;
  categoria: string;
  link: string;
  data_publicacao: string;
}

function decodeHtml(s: string): string {
  if (!s) return '';
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ').replace(/&ccedil;/g, 'ç').replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í').replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú').replace(/&Atilde;/g, 'Ã').replace(/&Otilde;/g, 'Õ')
    .replace(/&Ccedil;/g, 'Ç');
}

function stripTags(html: string): string {
  if (!html) return '';
  return decodeHtml(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function htmlToMarkdown(html: string): string {
  if (!html) return '';
  let out = html;
  out = out.replace(/<(script|style|iframe|ins|noscript)[\s\S]*?<\/\1>/gi, '');
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, c) => `\n\n# ${stripTags(c)}\n\n`);
  out = out.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n\n## ${stripTags(c)}\n\n`);
  out = out.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n\n### ${stripTags(c)}\n\n`);
  out = out.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, c) => `\n\n#### ${stripTags(c)}\n\n`);
  out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) => `\n\n> ${stripTags(c)}\n\n`);
  out = out.replace(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi, (_m, src, alt) => {
    const url = src.startsWith('//') ? 'https:' + src : src;
    return `\n\n![${(alt || '').trim()}](${url})\n\n`;
  });
  out = out.replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => {
    const label = stripTags(txt);
    return label ? `[${label}](${href})` : '';
  });
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, c) => `\n- ${stripTags(c)}`);
  out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, c) => `\n\n${stripTags(c)}\n\n`);
  out = out.replace(/<br\s*\/?>/gi, '\n');
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return decodeHtml(out);
}

// Executa scraper usando Browserless
async function fetchViaBrowserless(url: string, browserlessKey: string): Promise<string> {
  if (!browserlessKey) {
    console.warn('BROWSERLESS_API_KEY ausente, usando fetch direto');
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) throw new Error(`Fetch direto falhou: ${res.status}`);
    return await res.text();
  }

  const endpoint = `https://production-sfo.browserless.io/content?token=${encodeURIComponent(browserlessKey)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      waitForTimeout: 5000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.warn(`Browserless /content retornou ${res.status}: ${errText}. Tentando fallback direto.`);
    const fallbackRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!fallbackRes.ok) throw new Error(`Browserless e Fallback falharam: ${res.status}`);
    return await fallbackRes.text();
  }

  return await res.text();
}

// -------------------------------------------------------------
// 1. Scraping STF (Oficial + Matérias Jurídicas do STF em Tempo Real)
// -------------------------------------------------------------
async function scrapeSTF(browserlessKey: string): Promise<NoticiaItem[]> {
  const items: NoticiaItem[] = [];

  // 1.1 Extrai notícias em tempo real de julgamentos do STF (de hoje e ontem)
  try {
    const migalhasUrl = 'https://www.migalhas.com.br/quentes';
    console.log('[STF] Buscando matérias do STF em tempo real:', migalhasUrl);
    const html = await fetchViaBrowserless(migalhasUrl, browserlessKey);
    const regex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const stfLinks: string[] = [];
    while ((m = regex.exec(html)) !== null) {
      const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const href = m[1];
      if ((text.toLowerCase().includes('stf') || text.toLowerCase().includes('supremo')) && text.length > 20) {
        if (!stfLinks.includes(href) && href.includes('/quentes/')) {
          stfLinks.push(href);
        }
      }
    }

    for (const link of stfLinks.slice(0, 15)) {
      try {
        const artHtml = await fetchViaBrowserless(link, browserlessKey);
        const og = (prop: string) => artHtml.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]+)"`, 'i'))?.[1] || null;
        const titulo = og('og:title')?.replace(/\s*-\s*Migalhas\s*$/, '').trim() || '';
        const resumo = og('og:description') || '';
        const imagem_url = og('og:image');
        const data_publicacao = og('article:published_time') || new Date().toISOString();
        const bodyMatch = artHtml.match(/class="[^"]*topico__body[^"]*"[^>]*>([\s\S]*?)(?:<\/article>|<footer|<div[^>]*class="[^"]*(topico__compartilhar|topico__tags|topico__autor|materia__autor))/i);
        const conteudo_md = bodyMatch ? htmlToMarkdown(bodyMatch[1]) : resumo;

        if (titulo && link) {
          items.push({
            titulo,
            resumo: resumo || titulo,
            conteudo_md: conteudo_md || resumo || titulo,
            imagem_url: imagem_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
            categoria: 'STF',
            link,
            data_publicacao,
          });
        }
      } catch (e) {
        console.error('[STF] Erro ao extrair matéria do STF:', e);
      }
    }
  } catch (err) {
    console.error('[STF] Erro ao buscar matérias em tempo real:', err);
  }

  // 1.2 Complementa com posts institucionais da API WP do STF
  try {
    const apiUrl = 'https://noticias.stf.jus.br/wp-json/wp/v2/posts?_embed=1&per_page=15';
    const raw = await fetchViaBrowserless(apiUrl, browserlessKey);
    let jsonStr = raw;
    const preMatch = raw.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (preMatch) jsonStr = preMatch[1];
    else if (raw.includes('<html')) jsonStr = raw.replace(/<[^>]+>/g, '').trim();

    const posts = JSON.parse(decodeHtml(jsonStr));
    if (Array.isArray(posts)) {
      for (const p of posts) {
        const titulo = stripTags(p.title?.rendered || '');
        const resumo = stripTags(p.excerpt?.rendered || '');
        const link = p.link || '';
        const rawContent = p.content?.rendered || '';
        const conteudo_md = htmlToMarkdown(rawContent);

        let imagem_url: string | null = null;
        if (p._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
          imagem_url = p._embedded['wp:featuredmedia'][0].source_url;
        } else {
          const imgMatch = rawContent.match(/<img[^>]+src="([^">]+)"/i);
          if (imgMatch) imagem_url = imgMatch[1];
        }

        const data_publicacao = p.date_gmt ? `${p.date_gmt}Z` : p.date || new Date().toISOString();

        if (titulo && link) {
          items.push({
            titulo,
            resumo: resumo || titulo,
            conteudo_md: conteudo_md || resumo || titulo,
            imagem_url: imagem_url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
            categoria: 'STF',
            link,
            data_publicacao,
          });
        }
      }
    }
  } catch (err) {
    console.error('[STF WP] Erro ao extrair:', err);
  }

  return items;
}

// -------------------------------------------------------------
// 2. Scraping CÂMARA DOS DEPUTADOS
// -------------------------------------------------------------
async function scrapeCamara(browserlessKey: string): Promise<NoticiaItem[]> {
  const items: NoticiaItem[] = [];
  try {
    const rssUrl = 'https://www.camara.leg.br/noticias/rss/ultimas-noticias';
    console.log('[Câmara] Buscando RSS via Browserless:', rssUrl);
    const xml = await fetchViaBrowserless(rssUrl, browserlessKey);

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const pubDateMatch = block.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
      const enclosureMatch = block.match(/<enclosure[^>]+url="([^">]+)"/i);

      const titulo = stripTags(titleMatch?.[1] || '');
      const link = (linkMatch?.[1] || '').trim();
      const rawDesc = descMatch?.[1] || '';
      const resumo = stripTags(rawDesc);
      
      let imagem_url: string | null = enclosureMatch?.[1] || null;
      if (!imagem_url) {
        const imgInDesc = rawDesc.match(/<img[^>]+src="([^">]+)"/i);
        if (imgInDesc) imagem_url = imgInDesc[1];
      }

      let data_publicacao = new Date().toISOString();
      if (pubDateMatch?.[1]) {
        const parsed = new Date(pubDateMatch[1]);
        if (!isNaN(parsed.getTime())) data_publicacao = parsed.toISOString();
      }

      if (titulo && link) {
        items.push({
          titulo,
          resumo: resumo || titulo,
          conteudo_md: htmlToMarkdown(rawDesc) || resumo || titulo,
          imagem_url: imagem_url || 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80',
          categoria: 'Câmara dos Deputados',
          link,
          data_publicacao,
        });
      }
    }
  } catch (err) {
    console.error('[Câmara] Erro ao extrair:', err);
  }
  return items;
}

// -------------------------------------------------------------
// 3. Scraping SENADO FEDERAL
// -------------------------------------------------------------
async function scrapeSenado(browserlessKey: string): Promise<NoticiaItem[]> {
  const items: NoticiaItem[] = [];
  try {
    const rssUrl = 'https://www12.senado.leg.br/noticias/RSS';
    console.log('[Senado] Buscando RSS via Browserless:', rssUrl);
    const xml = await fetchViaBrowserless(rssUrl, browserlessKey);

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const pubDateMatch = block.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
      const enclosureMatch = block.match(/<enclosure[^>]+url="([^">]+)"/i);

      const titulo = stripTags(titleMatch?.[1] || '');
      const link = (linkMatch?.[1] || '').trim();
      const rawDesc = descMatch?.[1] || '';
      const resumo = stripTags(rawDesc);
      
      let imagem_url: string | null = enclosureMatch?.[1] || null;
      if (!imagem_url) {
        const imgInDesc = rawDesc.match(/<img[^>]+src="([^">]+)"/i);
        if (imgInDesc) imagem_url = imgInDesc[1];
      }

      let data_publicacao = new Date().toISOString();
      if (pubDateMatch?.[1]) {
        const parsed = new Date(pubDateMatch[1]);
        if (!isNaN(parsed.getTime())) data_publicacao = parsed.toISOString();
      }

      if (titulo && link) {
        items.push({
          titulo,
          resumo: resumo || titulo,
          conteudo_md: htmlToMarkdown(rawDesc) || resumo || titulo,
          imagem_url: imagem_url || 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=1200&q=80',
          categoria: 'Senado Federal',
          link,
          data_publicacao,
        });
      }
    }
  } catch (err) {
    console.error('[Senado] Erro ao extrair:', err);
  }
  return items;
}

// -------------------------------------------------------------
// Servidor Deno Edge Function
// -------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const requestedFonte = (body.fonte as string | undefined)?.toLowerCase(); // 'stf' | 'camara' | 'senado' | 'todas'

    const results: Record<string, any> = {};

    // 1. Processar STF
    if (!requestedFonte || requestedFonte === 'todas' || requestedFonte === 'stf') {
      const stfItems = await scrapeSTF(browserlessKey);
      let stfUpserted = 0;
      for (const item of stfItems) {
        const { error } = await supabase.from('noticias_stf').upsert(item, { onConflict: 'link', ignoreDuplicates: false });
        if (!error) stfUpserted++;
        else console.error('[STF Upsert Error]', error.message);
      }
      results.stf = { totalEncontrado: stfItems.length, inseridos: stfUpserted };
    }

    // 2. Processar CÂMARA
    if (!requestedFonte || requestedFonte === 'todas' || requestedFonte === 'camara') {
      const camaraItems = await scrapeCamara(browserlessKey);
      let camaraUpserted = 0;
      for (const item of camaraItems) {
        const { error } = await supabase.from('noticias_camara').upsert(item, { onConflict: 'link', ignoreDuplicates: false });
        if (!error) camaraUpserted++;
        else console.error('[Câmara Upsert Error]', error.message);
      }
      results.camara = { totalEncontrado: camaraItems.length, inseridos: camaraUpserted };
    }

    // 3. Processar SENADO
    if (!requestedFonte || requestedFonte === 'todas' || requestedFonte === 'senado') {
      const senadoItems = await scrapeSenado(browserlessKey);
      let senadoUpserted = 0;
      for (const item of senadoItems) {
        const { error } = await supabase.from('noticias_senado').upsert(item, { onConflict: 'link', ignoreDuplicates: false });
        if (!error) senadoUpserted++;
        else console.error('[Senado Upsert Error]', error.message);
      }
      results.senado = { totalEncontrado: senadoItems.length, inseridos: senadoUpserted };
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('sync-noticias-oficiais error:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
