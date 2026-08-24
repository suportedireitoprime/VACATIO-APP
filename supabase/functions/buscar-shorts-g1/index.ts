// Busca shorts do canal @g1globo
// Estratégia: tenta YouTube Data API v3 com YOUTUBE_API_KEY.
// Se falhar (quota/403/desativada), faz fallback via scraping da página pública.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HANDLE = 'g1globo';
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: { at: number; data: any } | null = null;
let cachedChannelId: string | null = null;
let cachedUploadsPlaylist: string | null = null;

function isoDurationToSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

async function resolveChannel(apiKey: string) {
  if (cachedChannelId && cachedUploadsPlaylist) {
    return { channelId: cachedChannelId, uploads: cachedUploadsPlaylist };
  }
  const tries = [
    `https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&forHandle=@${HANDLE}&key=${apiKey}`,
    `https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&forHandle=${HANDLE}&key=${apiKey}`,
    `https://www.googleapis.com/youtube/v3/channels?part=id,contentDetails&forUsername=${HANDLE}&key=${apiKey}`,
  ];
  for (const u of tries) {
    const r = await fetch(u);
    if (!r.ok) continue;
    const d = await r.json();
    const item = d?.items?.[0];
    if (item?.id) {
      cachedChannelId = item.id;
      cachedUploadsPlaylist = item.contentDetails?.relatedPlaylists?.uploads || null;
      if (cachedUploadsPlaylist) return { channelId: cachedChannelId!, uploads: cachedUploadsPlaylist };
    }
  }
  throw new Error('Canal não encontrado via API');
}

async function fromYouTubeAPI(apiKey: string) {
  const { channelId, uploads } = await resolveChannel(apiKey);
  const plUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  plUrl.searchParams.set('part', 'snippet,contentDetails');
  plUrl.searchParams.set('playlistId', uploads);
  plUrl.searchParams.set('maxResults', '50');
  plUrl.searchParams.set('key', apiKey);
  const r = await fetch(plUrl);
  if (!r.ok) throw new Error(`playlistItems ${r.status}`);
  const d = await r.json();
  const videoIds: string[] = [];
  const meta: Record<string, any> = {};
  for (const it of d.items || []) {
    const vid = it.contentDetails?.videoId;
    if (!vid) continue;
    videoIds.push(vid);
    meta[vid] = {
      titulo: it.snippet?.title || '',
      descricao: it.snippet?.description || '',
      canal: it.snippet?.channelTitle || 'g1',
      publicadoEm: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt,
      thumb:
        it.snippet?.thumbnails?.high?.url ||
        it.snippet?.thumbnails?.medium?.url ||
        it.snippet?.thumbnails?.default?.url,
    };
  }
  const shorts: any[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const vUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    vUrl.searchParams.set('part', 'contentDetails');
    vUrl.searchParams.set('id', chunk.join(','));
    vUrl.searchParams.set('key', apiKey);
    const vr = await fetch(vUrl);
    if (!vr.ok) continue;
    const vd = await vr.json();
    for (const it of vd.items || []) {
      const secs = isoDurationToSeconds(it.contentDetails?.duration || '');
      if (secs > 0 && secs <= 61) {
        shorts.push({
          videoId: it.id,
          duracao: secs,
          ...meta[it.id],
          url: `https://www.youtube.com/shorts/${it.id}`,
          embed: `https://www.youtube.com/embed/${it.id}`,
        });
      }
    }
  }
  return { videos: shorts, channelId, total: shorts.length, source: 'api' };
}

function parseAccessibility(text: string): { titulo: string; views: string } {
  const m = text.match(/^(.*?),\s*([\d.,]+\s*\S+)\s*visualizações/i);
  if (m) return { titulo: m[1].trim(), views: m[2].trim() };
  return { titulo: text.replace(/\s*-\s*ver o Shorts\s*$/i, '').trim(), views: '' };
}

async function fromScraping() {
  const url = `https://www.youtube.com/@${HANDLE}/shorts`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`YouTube retornou ${res.status}`);
  const html = await res.text();
  const seen = new Set<string>();
  const videos: any[] = [];
  const re =
    /"shortsLockupViewModel":\{"entityId":"shorts-shelf-item-([A-Za-z0-9_-]{11})","accessibilityText":"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const videoId = m[1];
    if (seen.has(videoId)) continue;
    seen.add(videoId);
    const { titulo, views } = parseAccessibility(m[2]);
    videos.push({
      videoId,
      titulo,
      descricao: '',
      canal: 'g1',
      views,
      thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/shorts/${videoId}`,
      embed: `https://www.youtube.com/embed/${videoId}`,
    });
  }
  return { videos, total: videos.length, source: 'scrape' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const nocache = url.searchParams.get('nocache') === '1';
    if (!nocache && cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    let payload: any = null;
    let apiError: string | null = null;
    if (YOUTUBE_API_KEY) {
      try {
        payload = await fromYouTubeAPI(YOUTUBE_API_KEY);
      } catch (e) {
        apiError = e instanceof Error ? e.message : String(e);
        console.log('YouTube API falhou, usando scraping:', apiError);
      }
    }
    if (!payload || !payload.videos?.length) {
      payload = await fromScraping();
      if (apiError) payload.apiError = apiError;
    }

    cache = { at: Date.now(), data: payload };
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e), videos: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
