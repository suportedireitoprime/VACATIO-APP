// Sincroniza locais jurídicos do OpenStreetMap (Overpass API) para o Supabase.
// Grátis. Uso administrativo. Chamada: { uf: "SP", categoria: "tribunais" }.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

type CategoriaSpec = {
  filtro: string; // partes do query overpass sem cabeçalho/area
};

const CATEGORIAS: Record<string, CategoriaSpec> = {
  tribunais: {
    filtro: `
      node["amenity"="courthouse"](area.a);
      way["amenity"="courthouse"](area.a);
      relation["amenity"="courthouse"](area.a);
    `,
  },
  cartorios: {
    filtro: `
      node["office"="notary"](area.a);
      way["office"="notary"](area.a);
      node["amenity"="notary"](area.a);
      way["amenity"="notary"](area.a);
    `,
  },
  delegacias: {
    filtro: `
      node["amenity"="police"](area.a);
      way["amenity"="police"](area.a);
    `,
  },
  presidios: {
    filtro: `
      node["amenity"="prison"](area.a);
      way["amenity"="prison"](area.a);
      relation["amenity"="prison"](area.a);
    `,
  },
  museus: {
    filtro: `
      node["tourism"="museum"](area.a);
      way["tourism"="museum"](area.a);
    `,
  },
  universidades: {
    filtro: `
      node["amenity"="university"](area.a);
      way["amenity"="university"](area.a);
    `,
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOverpass(query: string): Promise<any> {
  let lastError: unknown;
  const maxRounds = 3;
  for (let round = 0; round < maxRounds; round++) {
    for (const url of OVERPASS_URLS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'DireitoApp/1.0 (locais-sync)',
          },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (res.status === 429 || res.status === 504 || res.status >= 500) {
          lastError = new Error(`Overpass ${url} respondeu ${res.status}`);
          await res.body?.cancel();
          continue;
        }
        if (!res.ok) {
          lastError = new Error(`Overpass ${url} respondeu ${res.status}`);
          await res.body?.cancel();
          continue;
        }
        return await res.json();
      } catch (err) {
        lastError = err;
      }
    }
    // backoff antes da próxima rodada
    await sleep(2000 * (round + 1));
  }
  throw lastError ?? new Error('Nenhum servidor Overpass disponível.');
}

function extractCoords(el: any): [number, number] | null {
  if (typeof el.lat === 'number' && typeof el.lon === 'number') return [el.lat, el.lon];
  if (el.center && typeof el.center.lat === 'number') return [el.center.lat, el.center.lon];
  return null;
}

function joinEndereco(tags: Record<string, string>): string | null {
  const parts = [
    [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', '),
    tags['addr:suburb'] || tags['addr:district'],
  ].filter(Boolean);
  const out = parts.join(' — ').trim();
  return out || null;
}

// ============================================================
// Hidratação de fotos (Google Places API via gateway) — merged
// ============================================================
const GATEWAY = 'https://connector-gateway.lovable.dev/google_maps';
const CACHE_DAYS = 30;
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 ano
const PHOTO_BUCKET = 'locais-fotos';

function streetViewFallback(lat: number, lng: number): string {
  const params = new URLSearchParams({
    size: '1200x800',
    location: `${lat},${lng}`,
    fov: '80',
    pitch: '5',
    source: 'outdoor',
  });
  return `${GATEWAY}/maps/api/streetview?${params.toString()}`;
}

// Baixa os bytes da foto (URL do gateway ou pública) e salva no bucket
// privado, retornando uma URL assinada de longa duração para servir como
// CDN estável (as URLs do Google Places expiram em ~1h).
async function persistPhotoToStorage(
  supabase: any,
  localId: string,
  sourceUrl: string,
): Promise<string | null> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const isGateway = sourceUrl.startsWith(GATEWAY);
    const headers: Record<string, string> = {};
    if (isGateway && LOVABLE_API_KEY && GOOGLE_MAPS_API_KEY) {
      headers['Authorization'] = `Bearer ${LOVABLE_API_KEY}`;
      headers['X-Connection-Api-Key'] = GOOGLE_MAPS_API_KEY;
    }
    const res = await fetch(sourceUrl, { headers });
    if (!res.ok) {
      console.error('persistPhoto fetch failed', res.status);
      return null;
    }
    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `${localId}/cover.${ext}`;
    const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, {
      contentType, upsert: true, cacheControl: '31536000',
    });
    if (up.error) { console.error('persistPhoto upload', up.error.message); return null; }
    const signed = await supabase.storage
      .from(PHOTO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
    if (signed.error || !signed.data?.signedUrl) {
      console.error('persistPhoto sign', signed.error?.message); return null;
    }
    return signed.data.signedUrl;
  } catch (err) {
    console.error('persistPhoto ex', (err as Error).message);
    return null;
  }
}

const CATEGORIA_PLACE_TYPE: Record<string, string | undefined> = {
  tribunais: 'courthouse',
  delegacias: 'police',
  cartorios: 'lawyer',
  museus: 'museum',
  universidades: 'university',
  presidios: undefined,
  oab: 'lawyer',
  defensoria: 'lawyer',
  ministerio_publico: 'lawyer',
};

const stopwords = new Set([
  'de','da','do','das','dos','e','a','o','as','os','em','no','na','nos','nas',
  'para','por','the','of','and','com','sem','sob','sobre','ao','à','às','aos',
]);

function tokensRelevantes(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !stopwords.has(t));
}

function nomesCombinam(a: string, b: string): boolean {
  const ta = new Set(tokensRelevantes(a));
  const tb = tokensRelevantes(b);
  if (ta.size === 0 || tb.length === 0) return false;
  return tb.some((t) => ta.has(t));
}

type PlaceHydration = {
  photo_url: string;
  photo_attribution: string | null;
  place_id: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  editorial_summary: string | null;
  google_maps_uri: string | null;
  reviews: any | null;
};

async function fetchPlaceForLocal(local: any): Promise<PlaceHydration> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
  const fallback: PlaceHydration = {
    photo_url: streetViewFallback(local.lat, local.lng),
    photo_attribution: 'Google Street View',
    place_id: null,
    rating: null,
    user_ratings_total: null,
    editorial_summary: null,
    google_maps_uri: null,
    reviews: null,
  };

  const nomeValido = (local.nome ?? '').trim();
  if (!nomeValido || nomeValido.toLowerCase() === 'sem nome') return fallback;
  if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) return fallback;

  const cidade = [local.cidade, local.uf].filter(Boolean).join('/');
  const textQuery = `${nomeValido} ${cidade}`.trim();
  const includedType = CATEGORIA_PLACE_TYPE[local.categoria];

  try {
    const body: Record<string, unknown> = {
      textQuery,
      locationBias: {
        circle: { center: { latitude: local.lat, longitude: local.lng }, radius: 250 },
      },
      maxResultCount: 3,
    };
    if (includedType) {
      body.includedType = includedType;
      body.strictTypeFiltering = true;
    }

    const searchResp = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.photos',
          'places.rating',
          'places.userRatingCount',
          'places.editorialSummary',
          'places.googleMapsUri',
          'places.reviews',
        ].join(','),
      },
      body: JSON.stringify(body),
    });

    if (!searchResp.ok) {
      console.error(`Places searchText ${searchResp.status}`, await searchResp.text());
      return fallback;
    }

    const data = await searchResp.json();
    const place = (data.places ?? []).find((p: any) =>
      nomesCombinam(nomeValido, p?.displayName?.text ?? ''),
    );
    if (!place) return fallback;

    let photo_url = streetViewFallback(local.lat, local.lng);
    let photo_attribution: string | null = 'Google Street View';
    const photoName = place?.photos?.[0]?.name;
    if (photoName) {
      try {
        const mediaResp = await fetch(
          `${GATEWAY}/places/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true`,
          {
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
            },
          },
        );
        if (mediaResp.ok) {
          const media = await mediaResp.json();
          if (media.photoUri) {
            photo_url = media.photoUri;
            photo_attribution =
              place.photos[0]?.authorAttributions?.[0]?.displayName ?? null;
          }
        }
      } catch (err) {
        console.error('places media failed', err);
      }
    }

    return {
      photo_url,
      photo_attribution,
      place_id: place.id ?? null,
      rating: typeof place.rating === 'number' ? place.rating : null,
      user_ratings_total:
        typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      editorial_summary: place.editorialSummary?.text ?? null,
      google_maps_uri: place.googleMapsUri ?? null,
      reviews: Array.isArray(place.reviews) ? place.reviews.slice(0, 5) : null,
    };
  } catch (err) {
    console.error('places lookup failed', err);
    return fallback;
  }
}

async function hydratePhotos(supabase: any, localIds: string[], force: boolean) {
  const capped = localIds.slice(0, 8);
  const { data: rows } = await supabase
    .from('locais_juridicos')
    .select('id, categoria, nome, endereco, cidade, uf, lat, lng, place_id, photo_url, photo_attribution, photo_fetched_at, rating, user_ratings_total, editorial_summary, google_maps_uri, reviews')
    .in('id', capped);

  const results: any[] = [];
  for (const local of rows ?? []) {
    try {
      const isStoredUrl =
        typeof local.photo_url === 'string' &&
        local.photo_url.includes('/storage/v1/object/sign/' + PHOTO_BUCKET);
      const isFresh =
        !force &&
        isStoredUrl &&
        local.photo_fetched_at &&
        Date.now() - new Date(local.photo_fetched_at).getTime() < CACHE_DAYS * 86400_000;
      if (isFresh) {
        results.push({
          id: local.id,
          photo_url: local.photo_url,
          photo_attribution: local.photo_attribution,
          rating: local.rating,
          user_ratings_total: local.user_ratings_total,
          editorial_summary: local.editorial_summary,
          google_maps_uri: local.google_maps_uri,
          reviews: local.reviews,
          cached: true,
        });
        continue;
      }
      const result = await fetchPlaceForLocal(local);
      // Persistir a foto no bucket privado e usar a URL assinada estável.
      const stored = await persistPhotoToStorage(supabase, local.id, result.photo_url);
      const finalPhotoUrl = stored ?? result.photo_url;
      await supabase
        .from('locais_juridicos')
        .update({
          photo_url: finalPhotoUrl,
          photo_attribution: result.photo_attribution,
          place_id: result.place_id ?? local.place_id,
          rating: result.rating,
          user_ratings_total: result.user_ratings_total,
          editorial_summary: result.editorial_summary,
          google_maps_uri: result.google_maps_uri,
          reviews: result.reviews,
          photo_fetched_at: new Date().toISOString(),
        })
        .eq('id', local.id);
      results.push({ id: local.id, ...result, photo_url: finalPhotoUrl, cached: false });
    } catch (err) {
      results.push({ id: local.id, error: (err as Error).message, photo_url: null });
    }
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Ação: hidratar fotos
    if (body.action === 'photos' || Array.isArray(body.local_ids)) {
      const photos = await hydratePhotos(supabase, body.local_ids ?? [], !!body.force);
      return new Response(JSON.stringify({ photos }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { uf, categoria } = body;
    if (!uf || !categoria) {
      return new Response(JSON.stringify({ error: 'uf e categoria são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const spec = CATEGORIAS[categoria as string];
    if (!spec) {
      return new Response(
        JSON.stringify({ error: 'categoria desconhecida', disponiveis: Object.keys(CATEGORIAS) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }


    const query = `
      [out:json][timeout:180];
      area["ISO3166-2"="BR-${uf}"]->.a;
      (
        ${spec.filtro}
      );
      out center tags;
    `;

    const data = await fetchOverpass(query);
    const elements: any[] = data.elements ?? [];

    const rows = elements
      .map((el) => {
        const coords = extractCoords(el);
        if (!coords) return null;
        const tags = el.tags ?? {};
        const nome = tags.name || tags['name:pt'] || tags.official_name || 'Sem nome';
        return {
          osm_id: `${el.type}/${el.id}`,
          categoria,
          nome,
          endereco: joinEndereco(tags),
          cidade: tags['addr:city'] || null,
          uf,
          cep: tags['addr:postcode'] || null,
          lat: coords[0],
          lng: coords[1],
          telefone: tags.phone || tags['contact:phone'] || null,
          site: tags.website || tags['contact:website'] || null,
          email: tags.email || tags['contact:email'] || null,
          horario: tags.opening_hours ? { raw: tags.opening_hours } : null,
          tags,
          fonte: 'osm',
          wikimedia_commons: tags.wikimedia_commons || null,
        };
      })
      .filter(Boolean) as any[];

    let inseridos = 0;
    if (rows.length) {
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error, count } = await supabase
          .from('locais_juridicos')
          .upsert(chunk, { onConflict: 'osm_id', count: 'exact' });
        if (error) {
          console.error('upsert error', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        inseridos += count ?? chunk.length;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        uf,
        categoria,
        encontrados: elements.length,
        salvos: inseridos,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
