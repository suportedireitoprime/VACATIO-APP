// Coleta leve de localização/idioma do dispositivo.
// 1) offline: timezone + locale (sempre disponível)
// 2) online (best-effort): país/estado/cidade por IP, com cache local de 7 dias.

export interface GeoInfo {
  pais: string | null;
  uf: string | null;
  cidade: string | null;
  timezone: string | null;
  locale: string | null;
}

const CACHE_KEY = 'geo-info-v1';
const TTL = 7 * 86400_000;

function base(): GeoInfo {
  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    timezone = null;
  }
  const locale =
    typeof navigator !== 'undefined' ? navigator.language || null : null;
  return { pais: null, uf: null, cidade: null, timezone, locale };
}

export async function coletarGeo(): Promise<GeoInfo> {
  const fallback = base();
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.at && Date.now() - parsed.at < TTL && parsed.geo) {
        return { ...fallback, ...parsed.geo };
      }
    }
  } catch {
    /* ignora cache inválido */
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const j = await res.json();
      const geo: GeoInfo = {
        pais: j.country_name || j.country || null,
        uf: j.region_code || j.region || null,
        cidade: j.city || null,
        timezone: j.timezone || fallback.timezone,
        locale: fallback.locale,
      };
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), geo }));
      } catch {
        /* storage cheio */
      }
      return geo;
    }
  } catch {
    /* offline ou bloqueado por adblock: mantém fallback */
  }
  return fallback;
}
