import { Capacitor } from '@capacitor/core';
import { assetUrl } from './assetUrl';

export * from './storageBuckets';

/**
 * No app nativo (Android/iOS) o Origin é `https://localhost`, o que faz
 * proxies externos como wsrv.nl responderem 403 em muitos casos.
 */
const isNativePlatform = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Retorna o multiplicador de densidade de tela (DPR) seguro (clamped entre 1x e 2x).
 * Em telas ultra high-DPI (3.5x a 4x no Android/Samsung), evita alocação de texturas gigantescas na VRAM (Item 54).
 */
export const getSafeDpr = (): number => {
  if (typeof window === 'undefined') return 1;
  return Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
};

/**
 * Fase 43: Retorna a qualidade base ideal calibrada para a dimensão solicitada em tela:
 * - Thumbnails (w <= 160): 75
 * - Cards médios (w <= 450): 80
 * - Banners e Hero (w > 450): 85
 */
export const getQualityForWidth = (w: number): number => {
  if (w <= 160) return 75;
  if (w <= 450) return 80;
  return 85;
};

/**
 * Fase 16 e 43 — Qualidade Adaptativa de Rede e Resolução (Item 43 + Item 36).
 * Detecta `navigator.connection.effectiveType` e ajusta a qualidade:
 * - `slow-2g` / `2g`: 40 (placeholders mínimos, economia extrema de dados)
 * - `3g`: 60 (qualidade razoável, balanceia performance e visual)
 * - `4g` / Wi-Fi / default: qualidade proporcional ao tamanho (75-85)
 * Respeita saveData automaticamente reduzindo para 40.
 */
export const getAdaptiveQuality = (baseQuality = 80): number => {
  if (typeof navigator === 'undefined') return baseQuality;
  const conn = (navigator as unknown as {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;
  if (!conn) return baseQuality;
  if (conn.saveData) return 40;
  switch (conn.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 40;
    case '3g':
      return 60;
    default:
      return baseQuality;
  }
};

/**
 * Fase 45: Verifica se uma URL pertence ao ecossistema do Google Drive (Item 45).
 */
export const isGoogleDriveUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
};

/**
 * Fase 45: Extrai o ID único de um arquivo hospedado no Google Drive a partir de múltiplos formatos de link.
 */
export const extractGoogleDriveId = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;

  // Pastas não representam arquivos diretos de imagem
  if (url.includes('/drive/folders/')) return null;

  // Formato 1: drive.google.com/file/d/<FILE_ID>/...
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) return fileIdMatch[1];

  // Formato 2: ?id=<FILE_ID> ou &id=<FILE_ID> (uc?id=, open?id=, thumbnail?id=)
  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Formato 3: /d/<FILE_ID>
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  return null;
};

/**
 * Fase 45: Converte links do Google Drive para stream direto de imagem com calibração de resolução,
 * contornando bloqueios de CORS, rate limits e páginas HTML de visualização do Google (Item 45).
 */
export const convertGoogleDriveUrl = (url: string, targetWidth = 1200): string => {
  if (!url || typeof url !== 'string' || !isGoogleDriveUrl(url)) return url;

  const fileId = extractGoogleDriveId(url);
  if (!fileId) return url;

  const safeWidth = Math.min(Math.max(Math.round(targetWidth), 100), 1600);
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${safeWidth}`;
};

/**
 * Fase 44: Sanitiza e valida caminhos de armazenamento do Supabase, evitando 404 por URLs malformadas ou projetos legados (Item 44).
 */
export const safeStorageUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('javascript:')) return null;

  // Corrige barras invertidas do Windows no path
  let sanitized = trimmed.replace(/\\/g, '/');

  // Corrige barras duplicadas acidentais após o protocolo (ex: https://dominio//storage//v1)
  sanitized = sanitized.replace(/([^:]\/)\/+/g, '$1');

  // Remapeia projeto Supabase legado desativado para o projeto oficial ativo
  if (sanitized.includes('izspjvegxdfgkgibpyst.supabase.co')) {
    sanitized = sanitized.replace('izspjvegxdfgkgibpyst.supabase.co', 'dnjrgpldcwcpoywamorr.supabase.co');
  }

  // Converte caminhos relativos conhecidos do bucket (ex: 'covers/minha-capa.webp' ou 'biblioteca-obras/...')
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://') && !sanitized.startsWith('/') && !sanitized.startsWith('data:') && !sanitized.startsWith('blob:')) {
    return `https://dnjrgpldcwcpoywamorr.supabase.co/storage/v1/object/public/${sanitized}`;
  }

  // Se for caminho absoluto sem domínio (ex: '/storage/v1/object/public/...')
  if (sanitized.startsWith('/storage/v1/')) {
    return `https://dnjrgpldcwcpoywamorr.supabase.co${sanitized}`;
  }

  return sanitized;
};

/**
 * Fase 44: Construtor canônico de URLs de Storage públicas com sanitização estrita.
 */
export const getStoragePublicUrl = (bucket: string, path: string): string => {
  const cleanBucket = (bucket || '').replace(/^\/+|\/+$/g, '');
  const cleanPath = (path || '').replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
  return `https://dnjrgpldcwcpoywamorr.supabase.co/storage/v1/object/public/${cleanBucket}/${cleanPath}`;
};

/**
 * Resolve caminhos relativos do CDN Lovable (`/__l5e/...`) ou pointers de asset
 * e converte URLs do Google Drive para stream direto.
 */
const resolve = (url: string) => {
  const normalized = safeStorageUrl(url) || url;
  const directDrive = convertGoogleDriveUrl(normalized);
  return assetUrl(directDrive) || directDrive;
};

let _avifSupported: boolean | null = null;
/**
 * Detecta em runtime se o navegador cliente decodifica AVIF nativamente.
 * Memoriza o resultado para custo 0ms em chamadas subsequentes.
 */
export const isAvifSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (_avifSupported !== null) return _avifSupported;
  try {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      _avifSupported = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      return _avifSupported;
    }
  } catch {
    // Fallback defensivo
  }
  _avifSupported = false;
  return false;
};

const proxied = (url: string, w: number, quality?: number) => {
  const format = isAvifSupported() ? 'avif' : 'webp';
  const effectiveQ = quality ?? getAdaptiveQuality(getQualityForWidth(w));
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&q=${effectiveQ}&output=${format}`;
};

export interface SupabaseRenderOptions {
  width?: number;
  quality?: number;
  format?: 'origin' | 'webp' | 'avif';
  resize?: 'contain' | 'cover' | 'fill';
}

/**
 * Fase 42: Transforma uma URL do Supabase Storage no endpoint de Image Transformation:
 * `/storage/v1/object/public/<bucket>/<path>` -> `/storage/v1/render/image/public/<bucket>/<path>?width=<w>&quality=<q>&resize=contain&format=webp`
 * Suporta também URLs assinadas (/object/sign/) e preserva SVGs intactos.
 * Benefício: Compressão e redimensionamento dinâmico no Edge do Supabase em tempo real.
 */
export const toSupabaseRenderUrl = (
  url: string,
  optionsOrWidth: number | SupabaseRenderOptions = 400,
  legacyQuality?: number
): string => {
  // ATENÇÃO: As transformações de imagem do Supabase foram DESATIVADAS
  // por limitação do plano gratuito (100 transformações/mês).
  // Retornamos a URL original para evitar cobranças excedentes ou quebra de imagens.
  return url;
};

/**
 * Regra centralizada de otimização de imagens do APP.PRIME.
 */
const otimizar = (url: string, w: number, quality?: number): string => {
  if (!url || typeof url !== 'string') return '';
  
  // URLs de instâncias legadas/desativadas do Supabase descartadas para prevenir broken images
  if (url.includes('izspjvegxdfgkgibpyst.supabase.co')) return '';
  const resolved = resolve(url);
  if (resolved.includes('izspjvegxdfgkgibpyst.supabase.co')) return '';

  const effectiveQuality = quality ?? getAdaptiveQuality(getQualityForWidth(w));

  // 1. Supabase Storage: utiliza o endpoint nativo de Image Transformation
  if (resolved.includes('.supabase.co/storage/')) {
    return toSupabaseRenderUrl(resolved, { width: w, quality: effectiveQuality });
  }

  // 2. TMDB (Filmes e Séries da Temática Jurídica) possui CDN global Cloudflare com tiers de tamanho
  if (resolved.includes('image.tmdb.org/t/p/')) {
    let size = 'w500';
    if (w <= 92) size = 'w92';
    else if (w <= 154) size = 'w154';
    else if (w <= 185) size = 'w185';
    else if (w <= 342) size = 'w342';
    else if (w <= 500) size = 'w500';
    else if (w <= 780) size = 'w780';
    else size = 'w1280';
    return resolved.replace(/\/t\/p\/[^/]+\//, `/t/p/${size}/`);
  }

  // 3. Domínios externos que bloqueiam proxy
  if (resolved.includes('migalhas.com.br')) {
    return resolved;
  }

  // 4. No app nativo (Android/iOS), se não for Supabase nem TMDB, preserva a URL original para evitar 403 de proxy
  if (isNativePlatform()) {
    return resolved;
  }

  // 5. Demais URLs web externas: proxy WebP via wsrv.nl
  if (!/^https?:\/\//i.test(resolved)) return resolved;
  return proxied(resolved, w, effectiveQuality);
};

/** Imagem grande (hero, leitor, detalhe - qualidade padrão 85) */
export const cdnImg = (url: string, w = 800, quality?: number) => otimizar(url, w, quality);

/** Imagem média/pequena (capas, listas, decks, carrosséis - qualidade padrão 80) */
export const directImg = (url: string, w = 400, quality?: number) => otimizar(url, w, quality);

/** Fase 41/43: Miniatura calibrada para thumbnails de 40-160px (qualidade padrão 75) */
export const thumbImg = (url: string, size = 160, quality?: number) => otimizar(url, size, quality);

/**
 * Fase 46: Resolução inteligente de miniatura de alta performance (Item 46).
 * Se o asset já possuir versão `_thumb.webp`, utiliza diretamente;
 * Caso contrário, requisita redimensionamento dinâmico otimizado proporcional a `targetSize`.
 */
export const getThumbnailUrl = (url: string | null | undefined, targetSize = 160): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Se já for uma miniatura pré-gerada com sufixo _thumb.webp
  if (trimmed.includes('_thumb.webp')) {
    return safeStorageUrl(trimmed) || trimmed;
  }

  // Se for asset do Supabase, o endpoint nativo de transformação entrega targetSize a 75%
  if (trimmed.includes('.supabase.co/storage/v1/')) {
    return toSupabaseRenderUrl(trimmed, { width: targetSize, quality: 75, resize: 'contain' });
  }

  return thumbImg(trimmed, targetSize, 75);
};

/** Imagem de notícias e cards horizontais */
export const newsImg = (url: string, w = 640, quality?: number) => otimizar(url, w, quality);

/** Avatar de usuário com máscara circular */
export const avatarImg = (url: string, size = 128) => {
  if (!url) return '';
  const resolved = resolve(url);
  if (isNativePlatform()) return resolved;
  return `https://wsrv.nl/?url=${encodeURIComponent(resolved)}&w=${size}&h=${size}&fit=cover&mask=circle&output=webp`;
};

/**
 * Fila inteligente de Pré-Aquecimento (Prefetch) com controle de concorrência,
 * prevenção de saturação de rede e descarte seguro de memória.
 */
interface QueueItem {
  url: string;
  signal?: AbortSignal;
}

class ImagePrefetchQueue {
  private queue: QueueItem[] = [];
  private activeCount = 0;
  private readonly maxConcurrency = 3;
  private readonly fetched = new Set<string>();
  private readonly activeImages = new Map<HTMLImageElement, { url: string; cleanupSignal?: () => void }>();

  add(url: string | null | undefined, width = 400, signal?: AbortSignal): void {
    if (!url || typeof window === 'undefined' || signal?.aborted) return;

    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
      return;
    }

    const optimized = directImg(url, width);
    if (!optimized || this.fetched.has(optimized) || this.queue.some(item => item.url === optimized)) {
      return;
    }

    if (this.queue.length > 50) {
      this.queue.shift();
    }

    const item: QueueItem = { url: optimized, signal };
    this.queue.push(item);

    if (signal) {
      const onAbort = () => {
        this.queue = this.queue.filter(q => q !== item);
        signal.removeEventListener('abort', onAbort);
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }

    this.process();
  }

  private process(): void {
    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) break;

      if (next.signal?.aborted) {
        continue;
      }

      this.activeCount++;
      this.fetched.add(next.url);

      const img = new Image();
      img.decoding = 'async';

      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        const entry = this.activeImages.get(img);
        entry?.cleanupSignal?.();
        this.activeImages.delete(img);
        this.activeCount--;
        this.process();
      };

      let cleanupSignal: (() => void) | undefined;
      if (next.signal) {
        const onAbort = () => {
          img.onload = null;
          img.onerror = null;
          img.src = '';
          this.activeImages.delete(img);
          this.activeCount--;
          this.process();
        };
        next.signal.addEventListener('abort', onAbort, { once: true });
        cleanupSignal = () => next.signal?.removeEventListener('abort', onAbort);
      }

      this.activeImages.set(img, { url: next.url, cleanupSignal });

      img.onload = cleanup;
      img.onerror = cleanup;
      img.src = next.url;
    }
  }

  cancelAll(): void {
    this.queue = [];
    this.activeImages.forEach((val, img) => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      val.cleanupSignal?.();
    });
    this.activeImages.clear();
    this.activeCount = 0;
  }
}

const prefetchQueue = new ImagePrefetchQueue();

/** Pré-carrega uma única imagem de forma concorrente e segura com AbortSignal opcional */
export function prefetchImage(url: string | null | undefined, width = 400, signal?: AbortSignal): void {
  prefetchQueue.add(url, width, signal);
}

/** Pré-carrega uma lista de imagens através da fila com suporte a cancelamento */
export function prefetchImages(urls: (string | null | undefined)[], width = 400, signal?: AbortSignal): void {
  urls.forEach((u) => prefetchQueue.add(u, width, signal));
}

/** Cancela downloads de prefetch pendentes ao trocar de tela */
export function cancelAllPrefetches(): void {
  prefetchQueue.cancelAll();
}

/**
 * Geração de srcset responsivo para telas Retina (1x, 2x e 3x)
 */
export const generateResponsiveSrcSet = (
  url: string | null | undefined,
  baseWidth = 400
): { srcSet?: string; sizes?: string } => {
  if (!url || typeof url !== 'string' || !url.trim()) return {};

  const clean = url.trim();
  if (clean.startsWith('data:') || clean.startsWith('blob:') || clean.toLowerCase().endsWith('.svg')) {
    return {};
  }

  const isTransformable = clean.includes('/storage/v1/') || clean.includes('image.tmdb.org') || /^https?:\/\//i.test(clean);
  if (!isTransformable) return {};

  const w1x = Math.round(baseWidth);
  const w2x = Math.round(baseWidth * 1.5);
  const w3x = Math.min(Math.round(baseWidth * 2.25), 1400);

  const url1x = directImg(clean, w1x);
  const url2x = directImg(clean, w2x);
  const url3x = directImg(clean, w3x);

  if (!url1x || url1x === clean) return {};

  return {
    srcSet: `${url1x} 1x, ${url2x} 1.5x, ${url3x} 2x`,
    sizes: `(max-width: 640px) 100vw, ${baseWidth}px`,
  };
};
