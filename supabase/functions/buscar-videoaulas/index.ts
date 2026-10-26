import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CACHE_TTL_DAYS = 15;
const RECENT_WINDOW_DAYS = 180;

type SlotType = 'mais_visto' | 'mais_curtido' | 'mais_recente';

interface VideoSlot {
  tipo: SlotType;
  videoId: string;
  titulo: string;
  canal: string;
  thumb: string;
  views: number;
  likes: number;
  publishedAt: string;
  duration: string;
  url: string;
}

// Normaliza para comparação (remove acentos, pontuação, "º", "o")
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°ª]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Limpa e normaliza o nome da lei para termos de busca otimizados no YouTube
function cleanLeiNome(raw?: string): string {
  if (!raw) return 'legislação brasileira';
  const cleaned = raw.replace(/_/g, ' ').trim();
  const map: Record<string, string> = {
    'eca': 'ECA Estatuto da Criança e do Adolescente',
    'eca estatuto crianca adolescente': 'ECA Estatuto da Criança e do Adolescente',
    'cf88': 'Constituição Federal CF 88',
    'cf88 constituicao federal': 'Constituição Federal CF 88',
    'cf': 'Constituição Federal CF 88',
    'clt': 'CLT Consolidação das Leis do Trabalho',
    'clt consolidacao leis trabalho': 'CLT Consolidação das Leis do Trabalho',
    'cp': 'Código Penal CP',
    'cp codigo penal': 'Código Penal CP',
    'cpp': 'Código de Processo Penal CPP',
    'cpp codigo processo penal': 'Código de Processo Penal CPP',
    'cc': 'Código Civil CC',
    'cc codigo civil': 'Código Civil CC',
    'cpc': 'Código de Processo Civil CPC',
    'cpc codigo processo civil': 'Código de Processo Civil CPC',
    'ctn': 'Código Tributário Nacional CTN',
    'ctn codigo tributario nacional': 'Código Tributário Nacional CTN',
    'cdc': 'Código de Defesa do Consumidor CDC',
    'cdc codigo defesa consumidor': 'Código de Defesa do Consumidor CDC',
    'ctb': 'Código de Trânsito Brasileiro CTB',
    'ctb codigo transito brasileiro': 'Código de Trânsito Brasileiro CTB',
    'ce': 'Código Eleitoral CE',
    'ce codigo eleitoral': 'Código Eleitoral CE',
  };
  const key = norm(cleaned);
  if (map[key]) return map[key];
  return cleaned;
}

// Verifica se o título menciona explicitamente o artigo pedido
function titleMatchesArticle(titulo: string, numero: string): boolean {
  const n = norm(numero).replace(/\s+/g, '');
  if (!n) return true;
  const t = norm(titulo);
  // Aceita variações: "art 1", "artigo 1", "art. 1", "art1", "artigo1"
  const patterns = [
    new RegExp(`\\bart(?:igo)?\\s*0*${n}\\b`),
    new RegExp(`\\bart\\s*0*${n}\\b`),
  ];
  if (patterns.some((r) => r.test(t))) return true;
  // Fallback: número entre delimitadores comuns
  return new RegExp(`(?:^|\\s|#)0*${n}(?:\\s|$|[^0-9])`).test(t);
}

function buildQuery(artigoNumero: string, leiNome?: string) {
  const lei = cleanLeiNome(leiNome);
  // Query sem aspas restritivas para encontrar "Art. 3", "Artigo 3", etc.
  return `artigo ${artigoNumero} ${lei} aula`;
}

// Scraper direto dos resultados do YouTube (sem necessidade de API key ou consumo de cota)
async function searchYouTubeScrape(query: string): Promise<VideoSlot[]> {
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(`https://www.youtube.com/results?search_query=${q}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const contents =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    const items = contents?.[0]?.itemSectionRenderer?.contents || [];

    const list: VideoSlot[] = [];
    for (const it of items) {
      const vr = it.videoRenderer;
      if (!vr || !vr.videoId) continue;
      const viewStr = vr.viewCountText?.simpleText || vr.shortViewCountText?.simpleText || '0';
      let views = 0;
      const numMatch = viewStr.replace(/\./g, '').match(/\d+/);
      if (numMatch) views = parseInt(numMatch[0], 10);
      if (/mil/i.test(viewStr)) views = Math.round(parseFloat(viewStr.replace(',', '.')) * 1000);
      if (/mi/i.test(viewStr)) views = Math.round(parseFloat(viewStr.replace(',', '.')) * 1000000);

      const thumb =
        vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
        `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
      const titulo = vr.title?.runs?.[0]?.text || '';
      const canal = vr.ownerText?.runs?.[0]?.text || '';
      const duration = vr.lengthText?.simpleText || '';
      const publishedAt = vr.publishedTimeText?.simpleText || '';

      list.push({
        tipo: 'mais_visto',
        videoId: vr.videoId,
        titulo,
        canal,
        thumb,
        views,
        likes: Math.round(views * 0.05),
        publishedAt,
        duration,
        url: `https://www.youtube.com/watch?v=${vr.videoId}`,
      });
    }
    return list;
  } catch (err) {
    console.error('YouTube scrape error:', err);
    return [];
  }
}

// Constrói os 3 slots (mais_visto, mais_curtido, mais_recente) a partir dos candidatos
function buildSlotsFromCandidates(
  candidates: VideoSlot[],
  artigoNumero: string,
  tema?: string,
): VideoSlot[] {
  if (candidates.length === 0) return [];

  const matches = (v: VideoSlot) => {
    if (tema) return true;
    return titleMatchesArticle(v.titulo, artigoNumero);
  };

  const picked = new Set<string>();

  // 1. Mais visto: ordena por views decrescente
  const byViews = [...candidates].sort((a, b) => b.views - a.views);
  const preferredView = byViews.find((v) => matches(v)) || byViews[0];
  if (preferredView) picked.add(preferredView.videoId);

  // 2. Mais recente: pontua por antiguidade da string
  const dateScore = (s: string) => {
    const l = (s || '').toLowerCase();
    if (l.includes('hora') || l.includes('dia')) return 1;
    if (l.includes('semana')) return 2;
    if (l.includes('mês') || l.includes('meses')) return 3;
    if (l.includes('ano')) return 4;
    return 5;
  };
  const byDate = [...candidates].sort((a, b) => dateScore(a.publishedAt) - dateScore(b.publishedAt));
  const preferredDate =
    byDate.find((v) => !picked.has(v.videoId) && matches(v)) ||
    byDate.find((v) => !picked.has(v.videoId));
  if (preferredDate) picked.add(preferredDate.videoId);

  // 3. Mais curtido / relevante
  const remaining = candidates.filter((v) => !picked.has(v.videoId));
  const preferredLiked = remaining.find((v) => matches(v)) || remaining[0];
  if (preferredLiked) picked.add(preferredLiked.videoId);

  const slots: VideoSlot[] = [];
  if (preferredView) slots.push({ ...preferredView, tipo: 'mais_visto' });
  if (preferredLiked) slots.push({ ...preferredLiked, tipo: 'mais_curtido' });
  if (preferredDate) slots.push({ ...preferredDate, tipo: 'mais_recente' });

  // Preenche para garantir até 3 cards sempre que houver candidatos suficientes
  for (const c of candidates) {
    if (slots.length >= 3) break;
    if (!picked.has(c.videoId)) {
      picked.add(c.videoId);
      const tipo: SlotType = slots.length === 1 ? 'mais_curtido' : 'mais_recente';
      slots.push({ ...c, tipo });
    }
  }

  return slots;
}

async function searchList(
  params: Record<string, string>,
  key: string,
  maxResults = 10,
): Promise<string[]> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('relevanceLanguage', 'pt');
  url.searchParams.set('regionCode', 'BR');
  url.searchParams.set('videoDuration', 'medium');
  url.searchParams.set('key', key);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const isQuota = body?.error?.errors?.some(
      (e: any) => e.reason === 'quotaExceeded' || e.reason === 'rateLimitExceeded',
    );
    if (isQuota) throw new Error('QUOTA_EXCEEDED');
    console.error('YouTube search error:', res.status, body);
    return [];
  }
  const data = await res.json();
  return (data.items || [])
    .map((it: any) => it?.id?.videoId)
    .filter((x: string | undefined): x is string => Boolean(x));
}

async function fetchVideoStats(ids: string[], key: string): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (ids.length === 0) return map;
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,statistics,contentDetails');
  url.searchParams.set('id', ids.join(','));
  url.searchParams.set('key', key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const isQuota = body?.error?.errors?.some(
      (e: any) => e.reason === 'quotaExceeded' || e.reason === 'rateLimitExceeded',
    );
    if (isQuota) throw new Error('QUOTA_EXCEEDED');
    return map;
  }
  const data = await res.json();
  (data.items || []).forEach((it: any) => map.set(it.id, it));
  return map;
}

function toSlot(tipo: SlotType, videoId: string, info: any): VideoSlot | null {
  if (!info) return null;
  const sn = info.snippet || {};
  const st = info.statistics || {};
  const cd = info.contentDetails || {};
  const thumb =
    sn.thumbnails?.medium?.url ||
    sn.thumbnails?.high?.url ||
    sn.thumbnails?.default?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return {
    tipo,
    videoId,
    titulo: sn.title || 'Sem título',
    canal: sn.channelTitle || 'Canal desconhecido',
    thumb,
    views: Number(st.viewCount || 0),
    likes: Number(st.likeCount || 0),
    publishedAt: sn.publishedAt || '',
    duration: cd.duration || '',
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const tema: string = (body.tema || '').toString().trim();
    // Modo tema (usado pelo Horus): busca livre por assunto, sem artigo/lei.
    const tabelaCodigo: string = tema
      ? `tema:${norm(tema).slice(0, 80)}`
      : (body.tabelaNome || body.tabelaCodigo || '').toString().trim();
    const artigoNumero: string = tema
      ? '-'
      : (body.artigoNumero || '').toString().trim();
    const leiNome: string | undefined = body.leiNome;
    const force: boolean = Boolean(body.force);

    if (!tabelaCodigo || !artigoNumero) {
      return new Response(JSON.stringify({ error: 'tabelaNome e artigoNumero são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Cache lookup
    const { data: cached } = await admin
      .from('artigo_videoaulas_cache')
      .select('videos, fetched_at')
      .eq('tabela_codigo', tabelaCodigo)
      .eq('numero_artigo', artigoNumero)
      .maybeSingle();

    const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
    const isFresh =
      cached?.fetched_at && Date.now() - new Date(cached.fetched_at).getTime() < ttlMs;
    if (
      !force &&
      isFresh &&
      Array.isArray(cached.videos) &&
      cached.videos.length >= (tema ? 1 : 3)
    ) {
      return new Response(
        JSON.stringify({
          videos: cached.videos,
          cached: true,
          fetched_at: cached.fetched_at,
          stale: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // 2. Fresh fetch
    const q = tema
      ? `${tema} aula explicação direito`
      : buildQuery(artigoNumero, leiNome);

    let videos: VideoSlot[] = [];

    // Tenta via API oficial se chave configurada
    if (YOUTUBE_API_KEY) {
      try {
        const publishedAfter = new Date(
          Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();
        const [viewIds, ratingIds, dateIds] = await Promise.all([
          searchList({ q, order: 'viewCount' }, YOUTUBE_API_KEY, 10),
          searchList({ q, order: 'rating' }, YOUTUBE_API_KEY, 10),
          searchList({ q, order: 'date', publishedAfter }, YOUTUBE_API_KEY, 10),
        ]);
        const allIds = Array.from(new Set([...viewIds, ...ratingIds, ...dateIds]));
        const stats = await fetchVideoStats(allIds, YOUTUBE_API_KEY);

        const matches = (id: string) => {
          const info = stats.get(id);
          if (!info) return false;
          if (tema) return true;
          const title = info.snippet?.title || '';
          return titleMatchesArticle(title, artigoNumero);
        };

        const picked = new Set<string>();
        const pickFrom = (ids: string[], tipo: SlotType): VideoSlot | null => {
          const preferred = ids.filter((id) => !picked.has(id) && matches(id));
          const fallback = ids.filter((id) => !picked.has(id));
          const chosen = preferred[0] || fallback[0];
          if (!chosen) return null;
          picked.add(chosen);
          return toSlot(tipo, chosen, stats.get(chosen));
        };

        const slots: Array<VideoSlot | null> = [
          pickFrom(viewIds, 'mais_visto'),
          pickFrom(ratingIds, 'mais_curtido'),
          pickFrom(dateIds, 'mais_recente'),
        ];

        for (let i = 0; i < slots.length; i++) {
          if (slots[i]) continue;
          const tipo = (['mais_visto', 'mais_curtido', 'mais_recente'] as SlotType[])[i];
          const preferred = allIds.filter((id) => !picked.has(id) && matches(id));
          const fallback = allIds.filter((id) => !picked.has(id));
          const chosen = preferred[0] || fallback[0];
          if (chosen) {
            picked.add(chosen);
            slots[i] = toSlot(tipo, chosen, stats.get(chosen));
          }
        }
        videos = slots.filter((v): v is VideoSlot => v !== null);
      } catch (err: any) {
        console.warn('YouTube API call failed or quota exceeded, using scraper:', err);
      }
    }

    // Fallback: se não há API Key ou se a busca via API oficial falhou/esgotou cota, faz scraping direto
    if (videos.length === 0) {
      const candidates = await searchYouTubeScrape(q);
      videos = buildSlotsFromCandidates(candidates, artigoNumero, tema);
    }

    // Se ainda assim não encontrou mas tínhamos cache antigo, devolve o cache como stale
    if (videos.length === 0 && cached?.videos && Array.isArray(cached.videos) && cached.videos.length > 0) {
      return new Response(
        JSON.stringify({
          videos: cached.videos,
          cached: true,
          fetched_at: cached.fetched_at,
          stale: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // 3. Salva em cache se encontrou vídeos
    if (videos.length > 0) {
      const { error: upsertErr } = await admin.from('artigo_videoaulas_cache').upsert(
        {
          tabela_codigo: tabelaCodigo,
          numero_artigo: artigoNumero,
          videos,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'tabela_codigo,numero_artigo' },
      );
      if (upsertErr) console.error('Cache upsert error:', upsertErr);
    }

    return new Response(
      JSON.stringify({
        videos,
        cached: false,
        fetched_at: new Date().toISOString(),
        stale: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: unknown) {
    console.error('buscar-videoaulas error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message, videos: [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
