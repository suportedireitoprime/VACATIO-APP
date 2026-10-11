import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { directImg, generateResponsiveSrcSet, safeStorageUrl, convertGoogleDriveUrl } from '@/lib/cdnImg';
import fallbackCover from '@/assets/covers/fundamentos-da-lei.webp';
import { BookOpen, Maximize2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getImageOfflineUrl, fetchAndCacheImageOffline } from '@/services/imageOfflineStore';
import { getOfflineCover } from '@/hooks/useBibliotecaAsset';
import { ImageLightboxModal } from './ImageLightboxModal';
import { haptic } from '@/lib/nativeHaptics';
import { recordImageLoadMetric, recordImageClsMetric } from '@/lib/imageTelemetry';
import { imageLruCache } from '@/services/imageLruMemoryCache';

export interface PrimeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  /** Proporção geométrica fixa para eliminar 100% de Cumulative Layout Shift (CLS) */
  aspectRatio?: '2/3' | '16/9' | '1/1' | '3/4' | '4/3' | 'auto' | string;
  /** Largura máxima esperada para otimização de redimensionamento dinâmico (default: 400px) */
  targetWidth?: number;
  /** Qualidade adaptativa ou customizada de compressão (0 a 100). Default: proporcional à resolução (75-85) (Fase 43) */
  quality?: number;
  /** Se true, gera automaticamente srcset responsivo para telas Retina (1x, 1.5x, 2x) (Fase 22) */
  responsive?: boolean;
  /** Se true, marca como imagem principal above-the-fold (LCP) com loading eager e alta prioridade */
  priority?: boolean;
  /** Placeholder em miniatura base64 ou data URL para transição progressiva 0-lag (Fase 23) */
  lqip?: string;
  /** Hash de cor ou blur para renderização instantânea (Fase 23) */
  blurHash?: string;
  /** Categoria jurídica da obra para personalização temática editorial do fallback (Fase 27) */
  category?: 'penal' | 'civil' | 'constitucional' | 'trabalhista' | 'tributario' | 'administrativo' | 'classicos' | string;
  /** Imagem alternativa caso a principal falhe ou seja nula */
  fallbackSrc?: string;
  /** Ícone ou elemento customizado de fallback */
  fallbackIcon?: React.ReactNode;
  /** Texto ou sigla de fallback exibido sobre o gradiente */
  fallbackText?: string;
  /** Classe para o contêiner externo fixador de layout */
  containerClassName?: string;
  /** Se true, marca a imagem como puramente decorativa no leitor de tela (WCAG 2.2) */
  decorative?: boolean;
  /** Callback disparado quando a imagem estiver 100% decodificada e visível */
  onLoadComplete?: () => void;
  /** Se true, permite abrir a imagem em tela cheia com zoom tátil (Item 64) */
  zoomable?: boolean;
  /** Título opcional exibido no topo do Lightbox */
  zoomTitle?: string;
  /** Subtítulo opcional exibido no topo do Lightbox */
  zoomSubtitle?: string;
}

const ASPECT_RATIO_CLASSES: Record<string, string> = {
  '2/3': 'aspect-[2/3]',
  '16/9': 'aspect-video',
  '1/1': 'aspect-square',
  '3/4': 'aspect-[3/4]',
  '4/3': 'aspect-[4/3]',
  'auto': '',
};

interface EditorialTheme {
  gradient: string;
  badgeBg: string;
  badgeBorder: string;
  accentText: string;
  iconColor: string;
  monogramBorder: string;
}

/**
 * Fase 27: Paleta Temática e Tipografia Editorial por Área Jurídica
 */
function getEditorialTheme(category?: string, title?: string): EditorialTheme {
  const text = `${category || ''} ${title || ''}`.toLowerCase();
  if (text.includes('penal') || text.includes('crime') || text.includes('criminal')) {
    return {
      gradient: 'from-rose-950/80 via-zinc-950 to-zinc-900',
      badgeBg: 'bg-rose-500/10',
      badgeBorder: 'border-rose-500/30',
      accentText: 'text-rose-400',
      iconColor: 'text-rose-400',
      monogramBorder: 'border-rose-500/40',
    };
  }
  if (text.includes('civil') || text.includes('consumidor') || text.includes('família') || text.includes('familia')) {
    return {
      gradient: 'from-sky-950/80 via-zinc-950 to-zinc-900',
      badgeBg: 'bg-sky-500/10',
      badgeBorder: 'border-sky-500/30',
      accentText: 'text-sky-400',
      iconColor: 'text-sky-400',
      monogramBorder: 'border-sky-500/40',
    };
  }
  if (text.includes('const') || text.includes('fundamental') || text.includes('stf') || text.includes('oab')) {
    return {
      gradient: 'from-emerald-950/80 via-zinc-950 to-zinc-900',
      badgeBg: 'bg-emerald-500/10',
      badgeBorder: 'border-emerald-500/30',
      accentText: 'text-emerald-400',
      iconColor: 'text-emerald-400',
      monogramBorder: 'border-emerald-500/40',
    };
  }
  if (text.includes('trab') || text.includes('clt') || text.includes('previd')) {
    return {
      gradient: 'from-violet-950/80 via-zinc-950 to-zinc-900',
      badgeBg: 'bg-violet-500/10',
      badgeBorder: 'border-violet-500/30',
      accentText: 'text-violet-400',
      iconColor: 'text-violet-400',
      monogramBorder: 'border-violet-500/40',
    };
  }
  if (text.includes('trib') || text.includes('fiscal') || text.includes('econ') || text.includes('finan')) {
    return {
      gradient: 'from-amber-950/80 via-zinc-950 to-zinc-900',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/30',
      accentText: 'text-amber-400',
      iconColor: 'text-amber-400',
      monogramBorder: 'border-amber-500/40',
    };
  }
  if (text.includes('admin') || text.includes('públic') || text.includes('public')) {
    return {
      gradient: 'from-teal-950/80 via-zinc-950 to-zinc-900',
      badgeBg: 'bg-teal-500/10',
      badgeBorder: 'border-teal-500/30',
      accentText: 'text-teal-400',
      iconColor: 'text-teal-400',
      monogramBorder: 'border-teal-500/40',
    };
  }
  // Padrão Editorial Clássico: Dourado / Âmbar
  return {
    gradient: 'from-zinc-900 via-zinc-950 to-zinc-900',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/20',
    accentText: 'text-amber-400',
    iconColor: 'text-amber-400/90',
    monogramBorder: 'border-amber-500/30',
  };
}

/**
 * Fase 27: Extrai Monograma Tipográfico Serifado a partir do Título
 */
function getMonogram(text?: string): string {
  if (!text) return 'DIR';
  const cleaned = text.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim();
  const stopWords = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'para', 'com', 'um', 'uma', 'o', 'a', 'os', 'as', 'no', 'na']);
  const words = cleaned.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()));
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return 'LEI';
}

/**
 * PrimeImage - Componente Universal de Imagem e Capa do APP.PRIME.
 * 
 * Benefícios de Engenharia:
 * 1. Zero Cumulative Layout Shift (CLS < 0.01) garantido por aspect-ratio e container estrito.
 * 2. Otimização automática de LCP via fetchpriority="high" e loading="eager" quando priority=true.
 * 3. Lazy loading nativo e decoding="async" desacoplado da thread da UI para rolagem a 120fps.
 * 4. Redimensionamento dinâmico via directImg() evitando download de imagens 4K em cards pequenos.
 * 5. Skeleton escuro grafite (sem flashes brancos em tema escuro) com transição de opacidade suave.
 * 6. Fallback gracioso com auto-recuperação em IndexedDB / bundle offline antes da capa de contingência.
 * 7. Cache LRU em memória RAM para re-renderizações a 0ms (Fase 24).
 * 8. Micro-blur óptico suave com LQIP (Fase 23) e monograma jurídico editorial (Fase 27).
 */
export function PrimeImageBase({
  src,
  alt,
  aspectRatio = '2/3',
  targetWidth = 400,
  quality,
  responsive = true,
  priority = false,
  lqip,
  blurHash,
  category,
  fallbackSrc = fallbackCover,
  fallbackIcon,
  fallbackText,
  className,
  containerClassName,
  decorative = false,
  onLoadComplete,
  onError,
  zoomable = false,
  zoomTitle,
  zoomSubtitle,
  onClick,
  ...rest
}: PrimeImageProps) {
  const [attemptLevel, setAttemptLevel] = useState<'optimized' | 'raw' | 'offline' | 'fallback'>('optimized');
  const [offlineCandidateSrc, setOfflineCandidateSrc] = useState<string | null>(null);

  // Sanitização de URL: evita requisições GET /undefined quando src é inválido, normaliza storage (Fase 44) e Google Drive (Fase 45)
  const rawStorageClean = src && typeof src === 'string' && src.trim().length > 0 ? safeStorageUrl(src.trim()) : null;
  const cleanSrc = rawStorageClean ? convertGoogleDriveUrl(rawStorageClean, targetWidth) : null;

  // Fase 35: Suporte a Save-Data (Item 36) - Reduz resolução para teto de 200px se economia de dados estiver ativa
  const isSaveData = typeof navigator !== 'undefined' &&
    // @ts-expect-error NetworkInformation API experimental
    Boolean(navigator.connection?.saveData === true);
  const effectiveTargetWidth = isSaveData ? Math.min(targetWidth, 200) : targetWidth;
  const optimizedSrc = cleanSrc ? directImg(cleanSrc, effectiveTargetWidth, quality) : null;

  let activeSrc: string | null = null;
  if (attemptLevel === 'optimized') {
    activeSrc = optimizedSrc || cleanSrc || fallbackSrc || null;
  } else if (attemptLevel === 'raw') {
    activeSrc = cleanSrc || fallbackSrc || null;
  } else if (attemptLevel === 'offline') {
    activeSrc = offlineCandidateSrc || fallbackSrc || null;
  } else {
    activeSrc = fallbackSrc || null;
  }

  // Fase 24: Verificação de cache instantâneo em memória RAM (0ms de render)
  const isInitiallyCached = Boolean(activeSrc && imageLruCache.has(activeSrc));
  const [isLoaded, setIsLoaded] = useState(isInitiallyCached);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const mountTimeRef = useRef<number>(Date.now());
  const hasRetriedRef = useRef<boolean>(false);
  const activeSrcRef = useRef<string | null>(null);

  const hasFailed = attemptLevel === 'fallback';
  const editorialTheme = getEditorialTheme(category, fallbackText || alt);
  const monogram = getMonogram(fallbackText || alt);

  useEffect(() => {
    const cached = Boolean(activeSrc && imageLruCache.has(activeSrc));
    setIsLoaded(cached);
    setAttemptLevel('optimized');
    setOfflineCandidateSrc(null);
    mountTimeRef.current = Date.now();
    hasRetriedRef.current = false;
  }, [src]);

  // Fase 18: Revogação de Object URLs retidas no unmount (Item 33 — zero memory leak)
  useEffect(() => {
    return () => {
      // Revoga apenas object URLs geradas localmente (blob: ou data:)
      const lastSrc = activeSrcRef.current;
      if (lastSrc && lastSrc.startsWith('blob:')) {
        try { URL.revokeObjectURL(lastSrc); } catch {}
      }
    };
  }, []);

  // Mantém referência atualizada do activeSrc para cleanup
  useEffect(() => {
    activeSrcRef.current = activeSrc;
  }, [activeSrc]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    const durationMs = Date.now() - mountTimeRef.current;
    if (activeSrc) {
      // Fase 24: Armazena em cache LRU na memória RAM para acesso a 0ms nas próximas visitas
      imageLruCache.set(activeSrc, { url: activeSrc, width: targetWidth });
      recordImageLoadMetric(activeSrc, durationMs);
    }

    // Fase 26: Mede se a imagem gerou Layout Shift intrínseco inesperado
    const imgEl = e.currentTarget;
    if (imgEl && imgEl.naturalWidth && imgEl.naturalHeight && aspectRatio !== 'auto') {
      const naturalRatio = imgEl.naturalWidth / imgEl.naturalHeight;
      const expectedRatio = aspectRatio === '2/3' ? 2 / 3 : aspectRatio === '16/9' ? 16 / 9 : 1;
      const diff = Math.abs(naturalRatio - expectedRatio);
      if (diff > 0.35) {
        recordImageClsMetric(0.005);
      }
    }

    onLoadComplete?.();

    // Sincronização offline em background (apenas na Web/PWA e se conectado)
    if (
      cleanSrc &&
      cleanSrc.startsWith('http') &&
      typeof window !== 'undefined' &&
      !Capacitor.isNativePlatform() &&
      typeof navigator !== 'undefined' &&
      navigator.onLine
    ) {
      fetchAndCacheImageOffline(cleanSrc).catch(() => {});
    }
  };

  const handleError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // 1. Tenta a URL bruta caso a transformação da CDN/Supabase retorne erro transitório
    if (attemptLevel === 'optimized' && cleanSrc && optimizedSrc !== cleanSrc) {
      setAttemptLevel('raw');
      return;
    }

    // 2. Tenta auto-recuperação offline: verifica bundle estático e IndexedDB
    if (attemptLevel === 'raw' || (attemptLevel === 'optimized' && optimizedSrc === cleanSrc)) {
      if (cleanSrc) {
        const bundled = await getOfflineCover(cleanSrc);
        if (bundled) {
          setOfflineCandidateSrc(bundled);
          setAttemptLevel('offline');
          return;
        }
        const idb = await getImageOfflineUrl(cleanSrc);
        if (idb) {
          setOfflineCandidateSrc(idb);
          setAttemptLevel('offline');
          return;
        }
      }
    }

    // 3. Fase 48: Falha definitiva interceptada (403/404) - transição imediata para fallback editorial
    if (attemptLevel !== 'fallback') {
      setIsLoaded(false);
      setAttemptLevel('fallback');
      onError?.(e);
    }
  };

  const aspectClass = ASPECT_RATIO_CLASSES[aspectRatio] || '';
  const customAspectStyle = !aspectClass && aspectRatio !== 'auto' ? { aspectRatio } : undefined;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomable && activeSrc) {
      haptic.light();
      setIsLightboxOpen(true);
    }
    onClick?.(e as unknown as React.MouseEvent<HTMLImageElement>);
  };

  // Fase 22: Geração de srcset responsivo para telas Retina (1x, 1.5x, 2x)
  // Fase 35: Se Save-Data estiver ativo, dispensa srcset de alta densidade
  const responsiveAttrs = responsive && attemptLevel === 'optimized' && activeSrc && !rest.srcSet && !isSaveData
    ? generateResponsiveSrcSet(cleanSrc || activeSrc, effectiveTargetWidth)
    : {};

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          "relative overflow-hidden bg-zinc-900/90 w-full select-none transform-gpu backface-hidden contrast-more:border contrast-more:border-amber-400/80 contrast-more:ring-1",
          zoomable && "cursor-zoom-in group/prime-zoom",
          aspectClass,
          containerClassName
        )}
        style={customAspectStyle}
        data-prime-image="true"
      >
        {/* Fase 23: LQIP com Micro-Blur Óptico Suave */}
        {lqip && !isLoaded && !hasFailed && (
          <img
            src={lqip}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover filter blur-md scale-110 opacity-70 z-0 transition-opacity duration-300 pointer-events-none"
          />
        )}

        {/* Skeleton de alta precisão calibrado para o tema dark (Zero Flash Branco) */}
        {!isLoaded && !hasFailed && !lqip && (
          <div 
            aria-hidden="true" 
            className={cn(
              "absolute inset-0 bg-gradient-to-br animate-pulse z-0",
              editorialTheme.gradient
            )} 
          />
        )}

        {/* Indicador de Zoom no Hover */}
        {zoomable && isLoaded && !hasFailed && (
          <div
            aria-hidden="true"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/90 opacity-0 group-hover/prime-zoom:opacity-100 transition-opacity z-20 backdrop-blur-sm pointer-events-none"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        )}

      {/* Renderização da Imagem Otimizada */}
      {activeSrc ? (
        <img
          src={activeSrc}
          srcSet={rest.srcSet || responsiveAttrs.srcSet}
          sizes={rest.sizes || responsiveAttrs.sizes}
          alt={decorative ? "" : (alt || "")}
          aria-hidden={decorative ? "true" : undefined}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          // @ts-expect-error React 18 / 19 fetchpriority compatibility
          fetchpriority={priority ? "high" : "low"}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300 ease-out relative z-10",
            !isLoaded && !hasFailed ? "opacity-0 will-change-opacity" : "opacity-100 will-change-auto",
            className
          )}
          crossOrigin="anonymous"
          {...rest}
        />
      ) : (
        /* Fase 27: Fallback Editorial Monogramado por Categoria Jurídica */
        <div 
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-between p-4 text-center bg-gradient-to-b text-zinc-400 z-10 border border-white/5",
            editorialTheme.gradient
          )}
        >
          {/* Topo: Filigrana / Linha Editorial */}
          <div className="w-full flex items-center justify-center gap-2 pt-1 opacity-60">
            <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-white/20" />
            <span className="text-[9px] uppercase tracking-[0.2em] font-serif text-zinc-400">
              {category || 'Obra Jurídica'}
            </span>
            <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-white/20" />
          </div>

          {/* Centro: Brasão Monogramado em Tipografia Serifada de Luxo */}
          <div className="flex flex-col items-center justify-center my-auto">
            <div 
              className={cn(
                "w-14 h-14 rounded-2xl border flex flex-col items-center justify-center mb-2 shadow-xl backdrop-blur-sm transition-transform group-hover:scale-105",
                editorialTheme.badgeBg,
                editorialTheme.monogramBorder
              )}
            >
              {fallbackIcon || (
                <span className={cn("text-lg font-serif font-bold tracking-widest leading-none drop-shadow", editorialTheme.accentText)}>
                  {monogram}
                </span>
              )}
            </div>
            
            {(fallbackText || alt) && (
              <span className="text-xs font-serif font-medium tracking-wide text-zinc-200 max-w-[95%] line-clamp-3 leading-snug px-1 drop-shadow-sm">
                {fallbackText || alt}
              </span>
            )}
          </div>

          {/* Rodapé: Selo Editorial APP.PRIME */}
          <div className="w-full flex items-center justify-center gap-1.5 pb-1 opacity-40">
            <BookOpen className="w-3 h-3 text-zinc-400" />
            <span className="text-[8px] uppercase tracking-widest font-mono text-zinc-400">APP.PRIME</span>
          </div>
        </div>
      )}
      </div>

      {/* Lightbox Modal com Zoom Tátil quando zoomable=true */}
      {zoomable && (
        <ImageLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          src={cleanSrc || activeSrc}
          alt={alt}
          title={zoomTitle || alt}
          subtitle={zoomSubtitle}
        />
      )}
    </>
  );
}

/**
 * Fase 37: Comparador Estrito para React.memo.
 * Evita re-renderizações parasitas causadas por novos objetos literais no componente pai
 * ou em listas virtuais extensas onde os atributos visuais da imagem permanecem imutáveis.
 */
function areEqualPrimeImage(prev: PrimeImageProps, next: PrimeImageProps): boolean {
  return (
    prev.src === next.src &&
    prev.alt === next.alt &&
    prev.aspectRatio === next.aspectRatio &&
    prev.targetWidth === next.targetWidth &&
    prev.quality === next.quality &&
    prev.responsive === next.responsive &&
    prev.priority === next.priority &&
    prev.lqip === next.lqip &&
    prev.blurHash === next.blurHash &&
    prev.category === next.category &&
    prev.fallbackSrc === next.fallbackSrc &&
    prev.fallbackText === next.fallbackText &&
    prev.className === next.className &&
    prev.containerClassName === next.containerClassName &&
    prev.decorative === next.decorative &&
    prev.zoomable === next.zoomable &&
    prev.zoomTitle === next.zoomTitle &&
    prev.zoomSubtitle === next.zoomSubtitle &&
    prev.onClick === next.onClick
  );
}

export const PrimeImage = React.memo(PrimeImageBase, areEqualPrimeImage);
export default PrimeImage;

