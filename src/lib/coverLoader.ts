// Cover loader — lei covers are small WebPs bundled with the app.
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

import cp from '@/assets/lei-cover-cp.webp';
import cf88 from '@/assets/lei-cover-cf88.webp';
import cc from '@/assets/lei-cover-cc.webp';
import clt from '@/assets/lei-cover-clt.webp';
import cdc from '@/assets/lei-cover-cdc.webp';
import defaultCover from '@/assets/lei-cover-default.webp';
// Thematic covers per estatuto/lei — mantêm o brasão da República ao fundo.
import eca from '@/assets/lei-cover-eca.jpg';
import ei from '@/assets/lei-cover-ei.webp';
import epd from '@/assets/lei-cover-epd.jpg';
import eir from '@/assets/lei-cover-eir.jpg';
import ec from '@/assets/lei-cover-ec.jpg';
import ed from '@/assets/lei-cover-ed.jpg';
import eoab from '@/assets/lei-cover-eoab.jpg';
import ctn from '@/assets/lei-cover-ctn.webp';

const isNative =
  typeof window !== 'undefined' && Capacitor.isNativePlatform();

export const COVERS = {
  cp,
  cf88,
  cc,
  clt,
  cdc,
  eca,
  ei,
  epd,
  eir,
  ec,
  ed,
  eoab,
  ctn,
  default: defaultCover,
} as const;


const CDN_WARMUP_URLS: readonly string[] = [
  assetUrl(landingBibliotecaAsset.url),
  assetUrl(landingRadarAsset.url),
  assetUrl(landingVideoaulasAsset.url),
  assetUrl(logoVacatioAsset.url),
  assetUrl(themisMarbleCutoutAsset.url),
];

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
