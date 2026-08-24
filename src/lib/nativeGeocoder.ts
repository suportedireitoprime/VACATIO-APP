// Geocoder simples via Nominatim (OpenStreetMap) — funciona web e nativo.
// Gratuito, sem chave. Cache de resultados por 24h em localStorage.

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

const CACHE_KEY = 'geocode.cache.v1';
const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry { at: number; hits: GeocodeResult[]; }

function readCache(): Record<string, CacheEntry> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function writeCache(c: Record<string, CacheEntry>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

export async function geocodeAddress(query: string, limit = 5): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const cache = readCache();
  const key = `${q.toLowerCase()}::${limit}`;
  const cached = cache[key];
  if (cached && Date.now() - cached.at < TTL_MS) return cached.hits;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&countrycodes=br&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR' },
    });
    if (!res.ok) return [];
    const arr = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
    const hits: GeocodeResult[] = arr.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
    }));
    cache[key] = { at: Date.now(), hits };
    writeCache(cache);
    return hits;
  } catch (e) {
    console.warn('[geocoder] falhou', e);
    return [];
  }
}

/** Distância em metros (haversine). */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s1)));
}

/** Reverse geocoding via Nominatim: coords → endereço. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR&zoom=18`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
    if (!res.ok) return null;
    const r = await res.json() as { lat: string; lon: string; display_name: string };
    if (!r?.display_name) return null;
    return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), displayName: r.display_name };
  } catch (e) {
    console.warn('[geocoder] reverse falhou', e);
    return null;
  }
}

/** Retorna só dígitos se o valor parecer um CEP brasileiro (com ou sem hífen). */
export function extractCep(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  return /^\d{8}$/.test(digits) ? digits : null;
}

/** Busca endereço por CEP via ViaCEP + geocoding pra obter lat/lng. */
export async function geocodeByCep(cep: string): Promise<GeocodeResult[]> {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return [];
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return [];
    const data = await res.json() as {
      erro?: boolean; logradouro?: string; bairro?: string;
      localidade?: string; uf?: string; cep?: string;
    };
    if (data.erro) return [];

    const cepFmt = clean.replace(/(\d{5})(\d{3})/, '$1-$2');
    const parts = [data.logradouro, data.bairro, data.localidade, data.uf]
      .filter(Boolean).join(', ');
    const label = `${parts || cepFmt} — CEP ${cepFmt}`;

    // Tenta várias variações — CEPs residenciais/novos raramente batem no Nominatim.
    const queries = [
      `${clean}, Brasil`,
      parts,
      [data.logradouro, data.localidade, data.uf].filter(Boolean).join(', '),
      [data.bairro, data.localidade, data.uf].filter(Boolean).join(', '),
      [data.localidade, data.uf].filter(Boolean).join(', '),
    ].filter((q) => q && q.length >= 3) as string[];

    for (const q of queries) {
      const hits = await geocodeAddress(q, 3);
      if (hits.length) {
        const seen = new Set<string>();
        const unique = hits.filter((h) => {
          const key = `${h.lat.toFixed(4)},${h.lng.toFixed(4)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return unique.map((h) => ({ ...h, displayName: label }));
      }
    }
    return [];
  } catch (e) {
    console.warn('[geocoder] viacep falhou', e);
    return [];
  }
}
