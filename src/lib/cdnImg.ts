import { Capacitor } from '@capacitor/core';
import { assetUrl } from './assetUrl';


/** Detect if URL is already on Supabase Storage CDN */
const isSupabaseStorage = (url: string) =>
  url.includes('supabase.co/storage') || url.includes('supabase.co/object');

/**
 * No app nativo (Android/iOS) o Origin é `https://localhost`, o que faz o
 * proxy wsrv.nl responder 403/erro de referer em muitos casos e as imagens
 * não aparecem. Nesse ambiente pulamos o proxy e usamos a URL original.
 */
const shouldBypassProxy = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const proxied = (url: string, w: number) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&q=80&output=webp`;

/**
 * Resolve caminhos relativos do CDN Lovable (`/__l5e/...`) ou pointers de asset
 * para uma URL absoluta/local antes de passar por qualquer proxy externo.
 * Sem isso, o wsrv.nl recebia uma URL relativa e devolvia erro (capas somem).
 */
const resolve = (url: string) => assetUrl(url) || url;

/** Image proxy — skips proxy for Supabase Storage URLs (already fast CDN) */
export const cdnImg = (url: string, w = 800) => {
  if (!url) return '';
  const resolved = resolve(url);
  if (isSupabaseStorage(resolved) || shouldBypassProxy()) return resolved;
  if (!/^https?:\/\//i.test(resolved)) return resolved;
  return proxied(resolved, w);
};

/** Direct image — uses Supabase CDN directly, only proxies external URLs */
export const directImg = (url: string, w = 400) => {
  if (!url) return '';
  const resolved = resolve(url);
  if (isSupabaseStorage(resolved) || shouldBypassProxy()) return resolved;
  if (!/^https?:\/\//i.test(resolved)) return resolved;
  return proxied(resolved, w);
};

/** Direct image proxy for news — bypasses Edge Function for instant loading */
export const newsImg = (url: string, w = 640) => {
  if (!url) return '';
  const resolved = resolve(url);
  if (isSupabaseStorage(resolved) || shouldBypassProxy()) return resolved;
  if (!/^https?:\/\//i.test(resolved)) return resolved;
  return proxied(resolved, w);
};


