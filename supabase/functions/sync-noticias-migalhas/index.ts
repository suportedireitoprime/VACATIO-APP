// Sync notícias jurídicas do Migalhas.
// Raspa /quentes (lista) e converte o corpo de cada matéria em Markdown limpo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = 'https://www.migalhas.com.br';
const LIST_URL = `${BASE}/quentes`;
const UA = 'Mozilla/5.0 (compatible; VacatioBot/1.0)';

interface Item {
  titulo: string;
  resumo: string;
  conteudo_md: string | null;
  imagem_url: string | null;
  categoria: string | null;
  link: string;
  data_publicacao: string;
}

function decode(s: string): string {
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
  return decode(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
}

// Converte HTML da matéria em Markdown (mantém hierarquia + imagens + links).
function htmlToMarkdown(html: string): string {
  let out = html;
  // remove scripts/styles/iframes/ads
  out = out.replace(/<(script|style|iframe|ins|noscript)[\s\S]*?<\/\1>/gi, '');
  // remove comments
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  // headers
  out = out.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, c) => `\n\n# ${stripTags(c)}\n\n`);
  out = out.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n\n## ${stripTags(c)}\n\n`);
  out = out.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n\n### ${stripTags(c)}\n\n`);
  out = out.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, c) => `\n\n#### ${stripTags(c)}\n\n`);
  // blockquote
  out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) => `\n\n> ${stripTags(c)}\n\n`);
  // images
  out = out.replace(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi, (_m, src, alt) => {
    const url = src.startsWith('//') ? 'https:' + src : src;
    return `\n\n![${(alt || '').trim()}](${url})\n\n`;
  });
  // links
  out = out.replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => {
    const label = stripTags(txt);
    if (!label) return '';
    return `[${label}](${href})`;
  });
  // bold / italic
  out = out.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, c) => `**${stripTags(c)}**`);
  out = out.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, c) => `*${stripTags(c)}*`);
  // lists
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, c) => `\n- ${stripTags(c)}`);
  out = out.replace(/<\/?(ul|ol)[^>]*>/gi, '\n\n');
  // paragraphs / breaks — treat <br> as hard break and </div> as paragraph break
  out = out.replace(/<br\s*\/?>/gi, '\n\n');
  out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, c) => `\n\n${stripTags(c)}\n\n`);
  out = out.replace(/<\/(div|section|article)>/gi, '\n\n');
  out = out.replace(/<(div|section|article)[^>]*>/gi, '\n\n');
  // strip remaining tags
  out = out.replace(/<[^>]+>/g, '');
  out = decode(out);
  // collapse whitespace but PRESERVE paragraph breaks (\n\n)
  out = out
    .split(/\n{2,}/)
    .map((p) => p.replace(/[ \t]+/g, ' ').replace(/\n+/g, ' ').trim())
    .filter((p) => p.length > 0)
    .join('\n\n')
    .trim();
  return out;
}

function extractListItems(html: string): Item[] {
  const items: Item[] = [];
  const seen = new Set<string>();
  // <a ... href="https://www.migalhas.com.br/quentes/<id>/<slug>">
  const linkRe = /href="(https:\/\/www\.migalhas\.com\.br\/quentes\/\d+\/[^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const link = m[1];
    if (seen.has(link)) continue;
    seen.add(link);
    items.push({
      titulo: '',
      resumo: '',
      conteudo_md: null,
      imagem_url: null,
      categoria: null,
      link,
      data_publicacao: new Date().toISOString(),
    });
  }
  return items.slice(0, 25);
}

async function enrichArticle(item: Item): Promise<Item | null> {
  try {
    const res = await fetch(item.link, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const html = await res.text();

    const og = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]+)"`, 'i'))?.[1] || null;

    const title = og('og:title')?.replace(/\s*-\s*Migalhas\s*$/, '') || '';
    const desc = og('og:description') || '';
    const image = og('og:image');
    const published = og('article:published_time') || new Date().toISOString();
    const section = og('article:section') || null;

    if (!title) return null;

    // Extract body from topico__body div
    let bodyMd: string | null = null;
    const bodyMatch = html.match(/class="[^"]*topico__body[^"]*"[^>]*>([\s\S]*?)(?:<\/article>|<footer|<div[^>]*class="[^"]*(topico__compartilhar|topico__tags|topico__autor|materia__autor))/i);
    if (bodyMatch) {
      bodyMd = htmlToMarkdown(bodyMatch[1]);
      // Clean typical Migalhas footer noise
      bodyMd = bodyMd.replace(/_+/g, '').replace(/^[\-\s]*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
      if (bodyMd.length < 60) bodyMd = null;
    }

    return {
      titulo: decode(title).trim(),
      resumo: decode(desc).trim().slice(0, 500),
      conteudo_md: bodyMd,
      imagem_url: image,
      categoria: section ? decode(section).trim() : 'Notícia Jurídica',
      link: item.link,
      data_publicacao: published,
    };
  } catch (e) {
    console.error('enrich fail', item.link, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Body opcional: { skip_push: boolean } — o cron manda skip_push=true para
  // que o sync só popule a base. O push diário de notícias fica com a função
  // dedicada notif-noticias-dia (Plano A).
  const reqBody = await req.clone().json().catch(() => ({} as any));
  const skipPush = Boolean(reqBody?.skip_push);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const listRes = await fetch(LIST_URL, { headers: { 'User-Agent': UA } });
    if (!listRes.ok) throw new Error(`List fetch failed ${listRes.status}`);
    const listHtml = await listRes.text();
    const stubs = extractListItems(listHtml);
    console.log(`Found ${stubs.length} article stubs`);

    // Enrich in batches of 4 to avoid timeout / rate limits
    const enriched: Item[] = [];
    for (let i = 0; i < stubs.length; i += 4) {
      const batch = stubs.slice(i, i + 4);
      const done = await Promise.all(batch.map(enrichArticle));
      done.forEach((x) => x && enriched.push(x));
    }

    // Only keep items with cover image
    const toUpsert = enriched.filter((i) => i.imagem_url);

    let upserted = 0;
    for (const item of toUpsert) {
      const { error } = await supabase
        .from('noticias_juridicas')
        .upsert(
          {
            fonte: 'migalhas',
            titulo: item.titulo,
            resumo: item.resumo,
            conteudo_md: item.conteudo_md,
            imagem_url: item.imagem_url,
            categoria: item.categoria,
            link: item.link,
            data_publicacao: item.data_publicacao,
          },
          { onConflict: 'link', ignoreDuplicates: false },
        );
      if (!error) upserted++;
      else console.error('Upsert error:', error.message);
    }

    // 🔔 Push automation — desligado por padrão no Plano A.
    // Só dispara se o caller pedir explicitamente (skip_push=false) e a
    // automação estiver enabled=true no banco.
    let pushResult: any = { skipped: 'skip_push_true' };
    if (!skipPush) {
      try {
        pushResult = await maybeTriggerPush(supabase);
      } catch (e) {
        console.error('push trigger failed', e);
        pushResult = { error: String((e as Error).message) };
      }
    }

    return new Response(
      JSON.stringify({ ok: true, stubs: stubs.length, enriched: enriched.length, upserted, push: pushResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('sync-noticias-migalhas error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function maybeTriggerPush(supabase: any) {
  const { data: auto } = await supabase
    .from('push_automations')
    .select('*')
    .eq('key', 'noticias_juridicas_novas')
    .maybeSingle();
  if (!auto || auto.enabled === false) return { skipped: 'disabled' };

  // Quiet hours (São Paulo)
  const hourStr = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date());
  const h = Number(hourStr);
  const q1 = auto.quiet_hours_inicio ?? 22;
  const q2 = auto.quiet_hours_fim ?? 7;
  const inQuiet = q1 < q2 ? (h >= q1 && h < q2) : (h >= q1 || h < q2);
  if (inQuiet) return { skipped: 'quiet_hours' };

  // Cooldown
  if (auto.last_run_at && (auto.cooldown_minutos ?? 0) > 0) {
    const last = new Date(auto.last_run_at).getTime();
    if (Date.now() - last < auto.cooldown_minutos * 60_000) return { skipped: 'cooldown' };
  }

  // Buscar notícias novas nas últimas 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: novas } = await supabase
    .from('noticias_juridicas')
    .select('titulo, imagem_url')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!novas || novas.length === 0) return { skipped: 'no_new_items' };

  const emoji = auto.emoji || '📰';
  const title = `${emoji} ${novas.length === 1 ? 'Nova notícia jurídica' : `${novas.length} novas notícias jurídicas`}`;
  const body = String(novas[0].titulo || '').slice(0, 120);
  const clickUrl = auto.default_url || '/noticias';
  const audience = auto.audience ?? { all: true };
  const image = novas[0].imagem_url || null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const { data: camp, error: campErr } = await supabase
    .from('push_campaigns')
    .insert({
      title,
      body,
      url: clickUrl,
      audience,
      status: 'sending',
      tipo: 'noticias',
      automation_key: 'noticias_juridicas_novas',
      image_url: image,
      emoji,
    })
    .select('id')
    .single();
  if (campErr) throw campErr;

  const r = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify({
      campaign_id: camp.id, title, body, url: clickUrl,
      emoji, image: image ?? undefined, audience,
      data: { tipo: 'noticias' },
    }),
  });
  const j = await r.json().catch(() => ({}));

  await supabase.from('push_automations').update({ last_run_at: new Date().toISOString() }).eq('key', 'noticias_juridicas_novas');
  return { ok: true, campaign_id: camp.id, count: novas.length, send: j };
}
