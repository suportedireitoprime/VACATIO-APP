import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowUpRight, Newspaper, ChevronRight } from 'lucide-react';
import { getNoticiasCache, prefetchNoticias, subscribeNoticias, type Noticia } from '@/services/noticiasService';
import { newsImg } from '@/lib/cdnImg';
import NoticiaViewerSheet from '@/components/vademecum/NoticiaViewerSheet';
import { prefetchRoute } from '@/lib/routePrefetch';

const AUTOPLAY_MS = 8000;
const MAX_NEWS = 12;

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    if (sameDay) return `Hoje · ${hh}:${mm}`;
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${day} ${months[d.getMonth()]} · ${hh}:${mm}`;
  } catch {
    return 'Hoje';
  }
}

interface Props {
  onOpenChange?: (open: boolean) => void;
}

export default function HomeNoticiasCarousel({ onOpenChange }: Props) {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef<number | null>(null);
  const userInteractingRef = useRef(false);
  const [noticias, setNoticias] = useState<Noticia[]>(() => (getNoticiasCache() ?? []).slice(0, MAX_NEWS));
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedNoticia, setSelectedNoticia] = useState<Noticia | null>(null);

  useEffect(() => {
    if (noticias.length === 0) {
      prefetchNoticias().catch(() => {});
    }
    const unsub = subscribeNoticias((data) => {
      const sorted = [...data].sort(
        (a, b) => new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime()
      );
      setNoticias(sorted.slice(0, MAX_NEWS));
    });
    return unsub;
  }, [noticias.length]);

  useEffect(() => {
    onOpenChange?.(!!selectedNoticia);
  }, [selectedNoticia, onOpenChange]);

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const child = scroller.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const target = child.offsetLeft - (scroller.clientWidth - child.clientWidth) / 2;
    scroller.scrollTo({ left: target, behavior });
  }, []);

  useEffect(() => {
    if (noticias.length < 2) return;
    const tick = () => {
      if (userInteractingRef.current) return;
      const next = (activeIndex + 1) % noticias.length;
      setActiveIndex(next);
      scrollToIndex(next);
    };
    autoplayRef.current = window.setInterval(tick, AUTOPLAY_MS);
    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    };
  }, [activeIndex, noticias.length, scrollToIndex]);

  const onScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < scroller.children.length; i++) {
      const child = scroller.children[i] as HTMLElement;
      const mid = child.offsetLeft + child.clientWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setActiveIndex(best);
  }, []);

  const pauseAutoplay = () => {
    userInteractingRef.current = true;
    window.setTimeout(() => {
      userInteractingRef.current = false;
    }, 4000);
  };

  const renderHeader = () => (
    <div className="px-5 min-h-[54px] flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-foreground text-[18px] font-bold mb-1 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
          <span className="truncate">Notícias Jurídicas</span>
        </h3>
        <p className="font-body text-muted-foreground text-[12.5px] leading-snug ml-3 truncate">
          notícias do mundo jurídico em tempo real
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate('/noticias')}
        onPointerDown={() => {
          prefetchRoute('noticias');
          prefetchNoticias().catch(() => {});
        }}
        aria-label="Ver todas as notícias jurídicas"
        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary hover:brightness-95 px-3 py-1.5 text-[12px] font-semibold text-gray-900 active:scale-[0.96] transition-all shadow-sm"
      >
        <span>Ver todas</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-900" />
      </button>
    </div>
  );

  if (noticias.length === 0) {
    return (
      <div className="space-y-2.5">
        {renderHeader()}
        <div className="flex gap-3 overflow-hidden px-4">
          <div className="shrink-0 w-full h-[140px] rounded-2xl bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {renderHeader()}

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={pauseAutoplay}
        onTouchStart={pauseAutoplay}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 px-[7.5%] md:px-[4%] lg:px-[3%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {noticias.map((item, i) => {
          const isActive = i === activeIndex;
          const rawImg = item.imagem_url ?? '';
          const img = rawImg ? newsImg(rawImg, 640) : null;
          const meta = `${formatTime(item.data_publicacao)} · Migalhas`;

          return (
            <motion.button
              key={item.id}
              onClick={() => setSelectedNoticia(item)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="snap-center shrink-0 w-[85%] md:w-[46%] lg:w-[31%] active:scale-[0.99] text-left"
            >
              <div
                className={`relative w-full h-[140px] overflow-hidden rounded-2xl bg-[#141414] transition-all duration-300 ${
                  isActive ? 'opacity-100 scale-100 shadow-lg' : 'opacity-60 scale-[0.94]'
                }`}
              >
                {/* Imagem de Fundo com tratamento e fallback anti-erro */}
                {img ? (
                  <img
                    src={img}
                    alt=""
                    loading={i < 2 ? 'eager' : 'lazy'}
                    {...(i < 2 ? { fetchpriority: 'high' as any } : {})}
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="absolute inset-0 w-full h-full object-cover brightness-110 contrast-105 saturate-110"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F1F1F] to-[#121212] flex items-center justify-center">
                    <Newspaper className="w-12 h-12 text-white/10" />
                  </div>
                )}

                {/* Sombra e degradê para legibilidade do texto */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

                {/* Botão de seta para abrir */}
                <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
                  <ArrowUpRight className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
                </div>

                {/* Dados da notícia */}
                <div className="absolute inset-0 flex flex-col justify-end pb-3 pt-4 px-4 z-20">
                  <div className="flex items-center gap-2 mb-1 text-[11.5px] text-white/90">
                    <Clock className="w-3 h-3 text-primary" />
                    <span className="truncate">{meta}</span>
                  </div>
                  <p className="font-display text-white text-[14.5px] sm:text-[15px] font-bold leading-snug line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    {item.titulo}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {noticias.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {noticias.slice(0, Math.min(noticias.length, 8)).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}

      <NoticiaViewerSheet noticia={selectedNoticia} onClose={() => setSelectedNoticia(null)} />
    </div>
  );
}
