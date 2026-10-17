import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowUpRight, Newspaper, ChevronRight, ChevronLeft } from 'lucide-react';
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
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedNoticia, setSelectedNoticia] = useState<Noticia | null>(null);

  useEffect(() => {
    if (noticias.length === 0) {
      prefetchNoticias(true).catch(() => {});
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

  // Autoplay para o carrossel mobile
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

  const nextHero = useCallback(() => {
    setHeroIndex((i) => (i + 1) % Math.max(1, noticias.length));
  }, [noticias.length]);

  const prevHero = useCallback(() => {
    setHeroIndex((i) => (i - 1 + noticias.length) % Math.max(1, noticias.length));
  }, [noticias.length]);

  const heroNoticia = noticias[heroIndex] || noticias[0];
  const sideNoticias = useMemo(() => {
    if (noticias.length <= 1) return [];
    return noticias.filter((_, idx) => idx !== heroIndex).slice(0, 3);
  }, [noticias, heroIndex]);

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

      <div className="flex items-center gap-2 shrink-0">
        {/* Controles de Navegação no Tablet/Desktop */}
        {noticias.length > 1 && (
          <div className="hidden md:flex items-center gap-1.5 mr-1">
            <button
              type="button"
              onClick={prevHero}
              aria-label="Notícia anterior"
              className="w-8 h-8 rounded-full border border-border/60 bg-card hover:bg-muted/80 flex items-center justify-center text-foreground active:scale-95 transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11.5px] font-bold tabular-nums text-muted-foreground px-1">
              {heroIndex + 1}/{noticias.length}
            </span>
            <button
              type="button"
              onClick={nextHero}
              aria-label="Próxima notícia"
              className="w-8 h-8 rounded-full border border-border/60 bg-card hover:bg-muted/80 flex items-center justify-center text-foreground active:scale-95 transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/noticias')}
          onPointerDown={() => {
            prefetchRoute('noticias');
            prefetchNoticias().catch(() => {});
          }}
          aria-label="Ver todas as notícias jurídicas"
          className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/10 bg-card hover:bg-muted/80 px-3 py-1.5 text-[12px] font-semibold text-foreground active:scale-[0.96] transition-all shadow-sm"
        >
          <span>Ver todas</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );

  if (noticias.length === 0) {
    return (
      <div className="space-y-2.5">
        {renderHeader()}
        <div className="flex gap-3 overflow-hidden px-4 md:px-5">
          <div className="shrink-0 w-full h-[140px] md:h-[260px] rounded-2xl bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renderHeader()}

      {/* 1. VISÃO TABLET / DESKTOP (>= md): Padrão Editorial Dual-Pane (Hero + Feed) */}
      <div className="hidden md:grid md:grid-cols-12 gap-3.5 sm:gap-4 px-5">
        {/* Painel Esquerdo: Notícia Principal em Destaque (Hero) */}
        <div className={sideNoticias.length > 0 ? 'col-span-7 lg:col-span-8' : 'col-span-12'}>
          <AnimatePresence mode="wait">
            {heroNoticia && (
              <motion.button
                key={heroNoticia.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                onClick={() => setSelectedNoticia(heroNoticia)}
                className="relative w-full h-[270px] lg:h-[290px] overflow-hidden rounded-2xl bg-[#141414] border border-border/60 hover:border-primary/50 shadow-md group text-left transition-all active:scale-[0.99] flex flex-col justify-between p-5"
              >
                {/* Imagem de Fundo com tratamento e zoom suave ao passar o cursor */}
                {heroNoticia.imagem_url ? (
                  <img
                    src={newsImg(heroNoticia.imagem_url, 800)}
                    alt=""
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="absolute inset-0 w-full h-full object-cover brightness-105 contrast-105 saturate-110 group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1F1F1F] to-[#121212] flex items-center justify-center">
                    <Newspaper className="w-16 h-16 text-white/10" />
                  </div>
                )}

                {/* Gradiente escuro para legibilidade editorial perfeita */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />

                {/* Topo do Hero: Badges e Botão de Ação */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground uppercase tracking-wide shadow-sm">
                      Migalhas
                    </span>
                    {heroNoticia.categoria && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20">
                        {heroNoticia.categoria}
                      </span>
                    )}
                  </div>

                  <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg group-hover:bg-primary group-hover:border-primary transition-colors">
                    <ArrowUpRight className="w-4 h-4 text-white" strokeWidth={2.2} />
                  </div>
                </div>

                {/* Base do Hero: Manchete + Resumo + Data */}
                <div className="relative z-10 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-white/90">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{formatTime(heroNoticia.data_publicacao)} · Migalhas</span>
                  </div>
                  <h4 className="font-display text-white text-lg lg:text-xl font-bold leading-snug drop-shadow-md line-clamp-2 group-hover:text-primary-foreground transition-colors">
                    {heroNoticia.titulo}
                  </h4>
                  {heroNoticia.resumo && (
                    <p className="font-body text-white/80 text-xs lg:text-[13px] line-clamp-2 leading-relaxed drop-shadow">
                      {heroNoticia.resumo}
                    </p>
                  )}
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Painel Direito: Feed Lateral com as 3 Próximas Notícias */}
        {sideNoticias.length > 0 && (
          <div className="col-span-5 lg:col-span-4 flex flex-col justify-between gap-2.5">
            {sideNoticias.map((item) => {
              const rawImg = item.imagem_url ?? '';
              const img = rawImg ? newsImg(rawImg, 240) : null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedNoticia(item)}
                  className="flex-1 flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-card/90 active:scale-[0.98] transition-all text-left group shadow-xs overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="w-[72px] h-[72px] lg:w-[78px] lg:h-[78px] rounded-xl overflow-hidden shrink-0 relative bg-muted">
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Newspaper className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Conteúdo textual compacto */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      <Clock className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate">{formatTime(item.data_publicacao)}</span>
                    </div>
                    <p className="font-display text-[13px] lg:text-[13.5px] font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {item.titulo}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. VISÃO MOBILE (< md): Carrossel Horizontal com Snap e Touch Autoplay */}
      <div className="md:hidden">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          onPointerDown={pauseAutoplay}
          onTouchStart={pauseAutoplay}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 px-[7.5%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
                className="snap-center shrink-0 w-[85%] active:scale-[0.99] text-left"
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
                      {...(i < 2 ? { fetchPriority: 'high' as const } : {})}
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
                    <p className="font-display text-white text-[14.5px] font-bold leading-snug line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
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
      </div>

      <NoticiaViewerSheet noticia={selectedNoticia} onClose={() => setSelectedNoticia(null)} />
    </div>
  );
}
