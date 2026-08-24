// Utilitários de distância/ETA para os mapas do app (Fase 2).

export interface LatLng { lat: number; lng: number }

const R = 6371000; // raio da Terra em metros

export function distanciaMetros(a: LatLng, b: LatLng): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatarDistancia(m: number): string {
  if (!isFinite(m)) return '—';
  if (m < 950) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

/** ETA aproximado. Velocidade em m/s (padrão: caminhada 1,35 m/s). */
export function etaMinutos(distanciaM: number, velocidadeMs = 1.35): number {
  if (!isFinite(distanciaM) || distanciaM <= 0) return 0;
  const v = velocidadeMs > 0.3 ? velocidadeMs : 1.35;
  return Math.max(1, Math.round(distanciaM / v / 60));
}

export function formatarEta(min: number): string {
  if (min <= 0) return 'chegando';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Progresso 0..1 da aproximação, usando a maior distância já vista como base. */
export function progressoChegada(distanciaAtual: number, distanciaInicial: number, raio: number): number {
  const base = Math.max(distanciaInicial - raio, 1);
  const restante = Math.max(distanciaAtual - raio, 0);
  return Math.min(1, Math.max(0, 1 - restante / base));
}
