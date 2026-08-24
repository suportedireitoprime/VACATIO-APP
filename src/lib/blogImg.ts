/**
 * Blog cover URL helpers — usa a transformação de imagem do Supabase Storage
 * pra baixar WebP leve em vez do PNG cheio (1024×1024).
 *
 * Web:   /object/sign/... → /render/image/sign/...?width=W&quality=Q&format=webp
 * Nativo: retorna a URL original (o prefetch em disco cuida do desempenho).
 */
import { Capacitor } from '@capacitor/core';

function transform(url: string, width: number, quality = 70): string {
  if (!url) return url;
  try {
    if (Capacitor.isNativePlatform()) return url;
  } catch {}
  // Só reescreve URLs assinadas do Supabase Storage.
  if (!url.includes('/storage/v1/object/sign/')) return url;
  const rendered = url.replace('/storage/v1/object/sign/', '/storage/v1/render/image/sign/');
  const sep = rendered.includes('?') ? '&' : '?';
  return `${rendered}${sep}width=${width}&quality=${quality}&resize=cover&format=webp`;
}

/** Thumb dos cards da listagem (~112px no mobile, 2x para retina). */
export const blogThumb = (url: string, w = 260) => transform(url, w, 68);

/** Capa do sheet aberto / hero grande. */
export const blogHero = (url: string, w = 900) => transform(url, w, 75);
