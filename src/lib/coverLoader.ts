// Cover loader — lei covers are small WebPs bundled with the app and hosted on Cloudflare R2.
import { assetUrl } from '@/lib/assetUrl';
// On native (Capacitor), imports resolve inside the APK (offline, instant).
// On web/desktop, warmCoverCache() pre-fetches them into the browser cache
// during idle time so subsequent navigation opens instantly.
import { Capacitor } from '@capacitor/core';

import landingBibliotecaAsset from '@/assets/landing-biblioteca.webp.asset.json';
import landingRadarAsset from '@/assets/landing-radar.webp.asset.json';
import landingVideoaulasAsset from '@/assets/landing-videoaulas.webp.asset.json';
import logoVacatioAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import themisMarbleCutoutAsset from '@/assets/themis-marble-cutout.webp.asset.json';

// CDN Base URL no Cloudflare R2 (Bucket vacatio-midias)
export const R2_COVERS_BASE_URL = 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/capas/leis';

/**
 * Retorna a URL pública canônica no Cloudflare R2
 */
export function getR2CoverUrl(coverKeyOrFilename: string): string {
  const clean = coverKeyOrFilename.replace(/\.webp$/, '').replace(/^lei-cover-/, '');
  return `${R2_COVERS_BASE_URL}/lei-cover-${clean}.webp`;
}

/**
 * Mapa de todas as capas de legislação presentes em `src/assets/lei-cover-*.webp`.
 * O Vite empacota cada uma estaticamente para uso offline instantâneo no app (Capacitor/APK).
 */
const localCoversMap: Record<string, string> = (() => {
  const modules = import.meta.glob(
    '/src/assets/lei-cover-*.webp',
    { eager: true, query: '?url', import: 'default' }
  ) as Record<string, string>;
  const map: Record<string, string> = {};
  for (const [p, url] of Object.entries(modules)) {
    const filename = p.split('/').pop() || '';
    map[filename] = url;
    const key = filename.replace(/^lei-cover-/, '').replace(/\.webp$/, '');
    map[key] = url;
  }
  return map;
})();

/**
 * Retorna o asset local empacotado pelo Vite (offline) ou fallback para a CDN R2.
 */
export function getCoverAsset(filenameOrKey: string): string {
  const clean = filenameOrKey.replace(/\.webp$/, '').replace(/^lei-cover-/, '');
  const local = localCoversMap[`lei-cover-${clean}.webp`] || localCoversMap[clean];
  if (local) return local;
  return getR2CoverUrl(clean);
}

const isNative =
  typeof window !== 'undefined' && Capacitor.isNativePlatform();

export const COVERS = {
  // Códigos & Legislação Geral
  cp: getCoverAsset('cp'),
  cf88: getCoverAsset('cf88'),
  cc: getCoverAsset('cc'),
  cpc: getCoverAsset('cpc'),
  cpp: getCoverAsset('cpp'),
  clt: getCoverAsset('clt'),
  cdc: getCoverAsset('cdc'),
  ce: getCoverAsset('ce'),
  ctn: getCoverAsset('ctn'),
  ctb: getCoverAsset('ctb'),
  cpm: getCoverAsset('cpm'),
  cppm: getCoverAsset('cppm'),
  cflor: getCoverAsset('cflor'),
  ccom: getCoverAsset('ccom'),
  cba: getCoverAsset('cba'),
  cagua: getCoverAsset('cagua'),
  cmin: getCoverAsset('cmin'),
  ctel: getCoverAsset('ctel'),

  // Constituições Históricas
  cf1824: getCoverAsset('cf1824'),
  cf1891: getCoverAsset('cf1891'),
  cf1934: getCoverAsset('cf1934'),
  cf1937: getCoverAsset('cf1937'),
  cf1946: getCoverAsset('cf1946'),
  cf1967: getCoverAsset('cf1967'),
  cf1969: getCoverAsset('cf1969'),

  // Estatutos
  eca: getCoverAsset('eca'),
  ei: getCoverAsset('ei'),
  epd: getCoverAsset('epd'),
  eir: getCoverAsset('eir'),
  ec: getCoverAsset('ec'),
  ed: getCoverAsset('ed'),
  eoab: getCoverAsset('eoab'),
  ej: getCoverAsset('ej'),
  em: getCoverAsset('em'),
  eme: getCoverAsset('eme'),
  emet: getCoverAsset('emet'),
  emig: getCoverAsset('emig'),
  emus: getCoverAsset('emus'),
  epc: getCoverAsset('epc'),
  eref: getCoverAsset('eref'),
  et: getCoverAsset('et'),
  eterra: getCoverAsset('eterra'),
  eind: getCoverAsset('eind'),

  // Legislação Específica e Ética
  ced1995: getCoverAsset('ced1995'),
  ced2015: getCoverAsset('ced2015'),
  ces: getCoverAsset('ces'),
  l8112: getCoverAsset('l8112'),
  la: getCoverAsset('la'),
  laa: getCoverAsset('laa'),
  lace: getCoverAsset('lace'),

  default: getCoverAsset('default'),
} as const;

const CDN_WARMUP_URLS: readonly string[] = [
  assetUrl(landingBibliotecaAsset.url),
  assetUrl(landingRadarAsset.url),
  assetUrl(landingVideoaulasAsset.url),
  logoVacatioAsset.url ? assetUrl(logoVacatioAsset.url) : '',
  themisMarbleCutoutAsset.url ? assetUrl(themisMarbleCutoutAsset.url) : '',
].filter(Boolean);

type IdleWindow = Window & {
  requestIdleCallback?: (
    cb: () => void,
    opts?: { timeout?: number },
  ) => number;
};

function whenIdle(fn: () => void) {
  if (typeof window === 'undefined') return;
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(fn, { timeout: 2000 });
  } else {
    window.setTimeout(fn, 500);
  }
}

function prefetch(url: string) {
  if (!url) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

/**
 * Warm the browser HTTP cache for lei covers and heavy CDN images.
 * No-op on native (already bundled) and on mobile viewports
 * (spare data / CPU on small devices).
 */
export function warmCoverCache() {
  if (isNative || typeof window === 'undefined') return;
  const isDesktop = window.matchMedia?.('(min-width: 1024px)').matches ?? false;

  whenIdle(() => {
    Object.values(COVERS).forEach(prefetch);
    if (isDesktop) CDN_WARMUP_URLS.forEach(prefetch);
  });
}
