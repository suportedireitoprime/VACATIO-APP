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

// Verifica se o título menciona explicitamente o artigo pedido (evita trazer Art. 5º quando o usuário pediu Art. 1º)
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
  const lei = (leiNome || 'legislação brasileira').trim();
  // Query mais específica com aspas e sinônimos
  return `"artigo ${artigoNumero}" ${lei} explicação aula`;
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
    if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
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

    // 2. Fresh fetch — busca 10 por ordenação para ter fallback
    const q = tema
      ? `${tema} aula explicação direito`
      : buildQuery(artigoNumero, leiNome);
    const publishedAfter = new Date(
      Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    let viewIds: string[] = [];
    let ratingIds: string[] = [];
    let dateIds: string[] = [];
    try {
      [viewIds, ratingIds, dateIds] = await Promise.all([
        searchList({ q, order: 'viewCount' }, YOUTUBE_API_KEY, 10),
        searchList({ q, order: 'rating' }, YOUTUBE_API_KEY, 10),
        searchList({ q, order: 'date', publishedAfter }, YOUTUBE_API_KEY, 10),
      ]);
    } catch (err: any) {
      if (err?.message === 'QUOTA_EXCEEDED') {
        if (cached?.videos && Array.isArray(cached.videos) && cached.videos.length > 0) {
          return new Response(
            JSON.stringify({
              videos: cached.videos,
              cached: true,
              fetched_at: cached.fetched_at,
              stale: true,
              quotaExceeded: true,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
          );
        }
        return new Response(
          JSON.stringify({ videos: [], quotaExceeded: true, stale: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }
      throw err;
    }

    // Busca stats de TODOS os candidatos únicos
    const allIds = Array.from(new Set([...viewIds, ...ratingIds, ...dateIds]));
    const stats = await fetchVideoStats(allIds, YOUTUBE_API_KEY);

    // Filtra somente vídeos cujo título menciona o artigo pedido — evita Art. 5º quando pediram Art. 1º
    const matches = (id: string) => {
      const info = stats.get(id);
      if (!info) return false;
      if (tema) return true;
      const title = info.snippet?.title || '';
      return titleMatchesArticle(title, artigoNumero);
    };

    // Escolhe 1 vídeo por slot respeitando ordem e evitando duplicatas
    const picked = new Set<string>();
    const pickFrom = (ids: string[], tipo: SlotType): VideoSlot | null => {
      // Prioriza os que casam com o número do artigo
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

    // Se algum slot ficou vazio, preenche com qualquer candidato restante (mantém 3 cards sempre)
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

    const videos: VideoSlot[] = slots.filter((v): v is VideoSlot => v !== null);

    // 3. Save cache (upsert)
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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
