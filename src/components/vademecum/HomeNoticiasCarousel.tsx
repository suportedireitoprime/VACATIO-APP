import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowUpRight, Film, Star, Popcorn } from 'lucide-react';
import { getNoticiasCache, prefetchNoticias, subscribeNoticias, type Noticia } from '@/services/noticiasService';
import { newsImg, cdnImg } from '@/lib/cdnImg';
import NoticiaViewerSheet from '@/components/vademecum/NoticiaViewerSheet';
import BlogPostSheet from '@/components/vademecum/BlogPostSheet';
import ObraDetailSheet, { type Obra } from '@/components/tematica/ObraDetailSheet';
import { BLOG_POSTS, TEMA_COLORS, type BlogPost } from '@/data/blogPosts';
import { supabase } from '@/integrations/supabase/client';

const AUTOPLAY_MS = 10000;
const MAX_NEWS = 8;

type FeedItem =
  | { kind: 'noticia'; id: string; data: Noticia }
  | { kind: 'blog'; id: string; data: BlogPost }
  | { kind: 'obra'; id: string; data: Obra };

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (sameDay) return `Hoje · ${hh}:${mm}`;
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${day} ${months[d.getMonth()]} · ${hh}:${mm}`;
}

function tipoLabel(o: Obra): string {
  if ((o.categorias_juridicas ?? []).includes('Documentário')) return 'Documentário';
  return o.tipo === 'tv' ? 'Série' : 'Filme';
}

const OBRA_PALETTE: Record<string, { deep: string; mid: string; chipBg: string; chipText: string }> = {
  Filme:         { deep: '#2a0a12', mid: '#4a1524', chipBg: '#e11d48', chipText: '#fff5f7' },
  Série:         { deep: '#0d1230', mid: '#1e2757', chipBg: '#6366f1', chipText: '#f0f2ff' },
  Documentário:  { deep: '#0f1f14', mid: '#1e3a26', chipBg: '#10b981', chipText: '#ecfdf5' },
};// Padrão do carrossel (um ciclo = 7 blogs + 1 notícia + 1 obra):
//   5 blogs → 1 notícia → 2 blogs → 1 obra → repete.
// Filas garantem que nada repita antes de esgotar cada fonte.
const CYCLE: Array<'blog' | 'noticia'> = [
  'noticia',
  'blog',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  onOpenChange?: (open: boolean) => void;
}

export default function HomeNoticiasCarousel({ onOpenChange }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef<number | null>(null);
  const userInteractingRef = useRef(false);
  const [noticias, setNoticias] = useState<Noticia[]>(() => (getNoticiasCache() ?? []).slice(0, MAX_NEWS));
  const [obras, setObras] = useState<Obra[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedNoticia, setSelectedNoticia] = useState<Noticia | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);

  const postsAll = useMemo(() => [...BLOG_POSTS], []);

  // Filas persistentes por sessão do carrossel (mantidas em ref, não causam re-render).
  const blogQueueRef = useRef<BlogPost[]>(shuffle(postsAll));
  const noticiaQueueRef = useRef<Noticia[]>([]);
  const usedNoticiaIdsRef = useRef<Set<string>>(new Set());
  const cycleStepRef = useRef(0);

  const [feed, setFeed] = useState<FeedItem[]>([]);

  // Recalcula a fila de notícias sempre que a fonte muda: sempre a mais recente
  // ainda não exibida vai na frente. Notícias já mostradas não voltam.
  useEffect(() => {
    const sorted = [...noticias].sort(
      (a, b) => new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime(),
    );
    noticiaQueueRef.current = sorted.filter((n) => !usedNoticiaIdsRef.current.has(String(n.id)));
  }, [noticias]);



  const takeNext = useCallback((kind: 'blog' | 'noticia' | 'obra'): FeedItem | null => {
    if (kind === 'blog') {
      if (blogQueueRef.current.length === 0) {
        blogQueueRef.current = shuffle(postsAll);
      }
      const p = blogQueueRef.current.shift();
      if (!p) return null;
      return { kind: 'blog', id: `b-${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, data: p };
    }
    if (kind === 'noticia') {
      if (noticiaQueueRef.current.length === 0) {
        // esgotou — reabastece a partir do que há, removendo o histórico p/ reiniciar do topo
        usedNoticiaIdsRef.current.clear();
        noticiaQueueRef.current = [...noticias].sort(
          (a, b) => new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime(),
        );
      }
      const n = noticiaQueueRef.current.shift();
      if (!n) return null;
      usedNoticiaIdsRef.current.add(String(n.id));
      return { kind: 'noticia', id: `n-${n.id}-${Date.now()}`, data: n };
    }
    return null;
  }, [noticias, postsAll]);

  const extendFeed = useCallback((minItemsAhead: number) => {
    setFeed((prev) => {
      const out = [...prev];
      // Empurra até o ciclo produzir pelo menos `minItemsAhead` itens novos
      let added = 0;
      let guard = 0;
      while (added < minItemsAhead && guard < 64) {
        guard++;
        const slot = CYCLE[cycleStepRef.current % CYCLE.length];
        const item = takeNext(slot);
        if (item) {
          out.push(item);
          added++;
          cycleStepRef.current++;
        } else {
          // fila vazia (ex.: obras ainda carregando) — pula o slot e continua o ciclo
          cycleStepRef.current++;
        }
      }
      return out;
    });
  }, [takeNext]);

  // Popula o feed inicial e reidrata quando novas fontes chegam.
  useEffect(() => {
    if (feed.length === 0) extendFeed(9);
  }, [feed.length, extendFeed]);

  // À medida que o usuário se aproxima do fim, adiciona mais um ciclo.
  useEffect(() => {
    if (feed.length - activeIndex <= 3) extendFeed(9);
  }, [activeIndex, feed.length, extendFeed]);

  const items = feed;

  const activeItem = items[activeIndex];

  useEffect(() => {
    if (noticias.length === 0) prefetchNoticias().catch(() => {});
    const unsub = subscribeNoticias((data) => setNoticias(data.slice(0, MAX_NEWS)));
    return unsub;
  }, [noticias.length]);



  useEffect(() => {
    onOpenChange?.(!!selectedNoticia || !!selectedPost || !!selectedObra);
  }, [selectedNoticia, selectedPost, selectedObra, onOpenChange]);


  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const child = scroller.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const target = child.offsetLeft - (scroller.clientWidth - child.clientWidth) / 2;
    scroller.scrollTo({ left: target, behavior });
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const tick = () => {
      if (userInteractingRef.current) return;
      const next = (activeIndex + 1) % items.length;
      setActiveIndex(next);
      scrollToIndex(next);
    };
    autoplayRef.current = window.setInterval(tick, AUTOPLAY_MS);
    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    };
  }, [activeIndex, items.length, scrollToIndex]);

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
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    setActiveIndex(best);
  }, []);

  const pauseAutoplay = () => {
    userInteractingRef.current = true;
    window.setTimeout(() => { userInteractingRef.current = false; }, 4000);
  };

  const handleOpen = (item: FeedItem) => {
    if (item.kind === 'noticia') setSelectedNoticia(item.data);
    else if (item.kind === 'blog') setSelectedPost(item.data);
    else setSelectedObra(item.data);
  };


  if (items.length === 0) {
    return (
      <div>
        <div className="flex gap-3 overflow-hidden px-4">
          <div className="shrink-0 w-full h-[140px] rounded-2xl bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  const kind = activeItem?.kind ?? 'noticia';
  const headerTitle =
    kind === 'blog' ? 'Blogger Jurídico' : kind === 'obra' ? 'Temática Jurídica' : 'Notícias Jurídicas';
  const headerSubtitle =
    kind === 'blog'
      ? 'artigos, filosofia e curiosidades do Direito'
      : kind === 'obra'
      ? 'filmes, séries e documentários para juristas'
      : 'notícias do mundo jurídico em tempo real';
  return (
    <div className="space-y-2.5">
      <div className="px-5 min-h-[54px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={kind}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25 }}
          >
            <h3 className="font-display text-foreground text-[18px] font-bold mb-1 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary" />
              {headerTitle}
            </h3>
            <p className="font-body text-muted-foreground text-[12.5px] leading-snug mb-3 ml-3 truncate">
              {headerSubtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>


      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={pauseAutoplay}
        onTouchStart={pauseAutoplay}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 px-[7.5%] md:px-[4%] lg:px-[3%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => {
          const isActive = i === activeIndex;

          // OBRA — poster vertical à esquerda + fundo com poster borrado (paleta natural)
          if (item.kind === 'obra') {
            const o = item.data;
            const poster = o.poster_url;
            const bg = o.backdrop_url || poster;
            const label = tipoLabel(o);
            const palette = OBRA_PALETTE[label] ?? OBRA_PALETTE.Filme;
            const meta = [o.ano, o.nota ? `★ ${o.nota.toFixed(1)}` : null].filter(Boolean).join(' · ');
            return (
              <motion.button
                key={item.id}
                onClick={() => handleOpen(item)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.2) }}
                className="group snap-center shrink-0 w-[85%] md:w-[46%] lg:w-[31%] active:scale-[0.99] text-left cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
              >

                <div
                  className={`relative w-full h-[140px] overflow-hidden rounded-2xl transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-black/40 group-hover:ring-1 group-hover:ring-primary/40 ${
                    isActive ? 'opacity-100 scale-100 shadow-lg' : 'opacity-60 scale-[0.94] group-hover:opacity-90'
                  }`}
                  style={{ backgroundColor: palette.deep }}
                >
                  {/* fundo: poster borrado extraindo a paleta natural */}
                   {bg && (
                     <img
                       src={cdnImg(bg, 320)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-40"
                    />
                  )}
                  {/* degradê da categoria: entra da direita para a esquerda,
                      conversando com o poster (que fica à esquerda) */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to left, ${palette.deep} 42%, ${palette.mid}cc 68%, transparent 100%)`,
                    }}
                  />

                  {/* poster vertical à esquerda */}
                  <div className="absolute inset-y-2 left-2 w-[92px] rounded-lg overflow-hidden shadow-xl ring-1 ring-white/10">
                    {poster ? (
                      <img
                        src={cdnImg(poster, 200)}
                        alt={o.titulo}
                        loading={i < 2 ? 'eager' : 'lazy'}
                        {...(i < 2 ? { fetchpriority: 'high' as any } : {})}
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                        <Film className="w-6 h-6 text-white/50" />
                      </div>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-md">
                    <ArrowUpRight className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
                  </div>

                  <span
                    className="absolute top-2.5 left-[108px] text-[9.5px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider"
                    style={{ background: palette.chipBg, color: palette.chipText }}
                  >
                    {label.toUpperCase() === 'FILME' && <Popcorn className="w-3 h-3" strokeWidth={1.5} />}
                    {label}
                  </span>

                  <div className="absolute inset-y-0 right-0 left-[108px] flex flex-col justify-end pr-4 pb-3">
                    <div className="flex items-center gap-2 mb-1 text-[11.5px] text-white/90">
                      {o.nota ? <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> : <Clock className="w-3 h-3" />}
                      <span className="truncate">{meta || 'Temática jurídica'}</span>
                    </div>
                    <p className="font-display text-white text-[15px] font-normal leading-snug line-clamp-2 drop-shadow-sm">
                      {o.titulo}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          }

          const isB = item.kind === 'blog';
          const c = isB ? TEMA_COLORS[(item.data as BlogPost).tema] : null;
          const rawImg = isB
            ? (item.data as BlogPost).imagem_url ?? ''
            : (item.data as Noticia).imagem_url ?? '';
          const img = isB ? cdnImg(rawImg, 640) : newsImg(rawImg, 640);
          const title = isB ? (item.data as BlogPost).titulo : (item.data as Noticia).titulo;
          const meta = isB
            ? `${(item.data as BlogPost).tempo_leitura_min} min · ${(item.data as BlogPost).tema}`
            : `${formatTime((item.data as Noticia).data_publicacao)} · Migalhas`;

          return (
            <motion.button
              key={item.id}
              onClick={() => handleOpen(item)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="snap-center shrink-0 w-[85%] md:w-[46%] lg:w-[31%] active:scale-[0.99] text-left"
            >

              <div
                className={`relative w-full h-[140px] overflow-hidden rounded-2xl transition-all duration-300 ${
                  isActive ? 'opacity-100 scale-100 shadow-lg' : 'opacity-60 scale-[0.94]'
                }`}
                style={isB && c ? { background: c.bg } : undefined}
              >
                {img && (
                  <img
                    src={img}
                    alt=""
                    loading={i < 2 ? 'eager' : 'lazy'}
                    {...(i < 2 ? { fetchpriority: 'high' as any } : {})}
                    decoding="async"
                    className={`absolute inset-0 w-full h-full object-cover ${
                      isB ? 'object-top opacity-90' : 'brightness-110 contrast-105 saturate-110'
                    }`}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md">
                  <ArrowUpRight className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
                </div>

                {isB && c && (
                  <span
                    className="absolute top-2.5 left-2.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                    style={{ background: c.chip, color: c.chipText }}
                  >
                    Blog · {(item.data as BlogPost).tema}
                  </span>
                )}

                <div className="absolute inset-0 flex flex-col justify-end px-4 pb-3 pt-4">
                  <div className="flex items-center gap-2 mb-1 text-[11.5px] text-white/90">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">{meta}</span>
                  </div>
                  <p className="font-display text-white text-[15px] font-normal leading-snug line-clamp-2 drop-shadow-sm">
                    {title}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {items.slice(0, Math.min(items.length, 8)).map((_, i) => (
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
      <BlogPostSheet post={selectedPost} onClose={() => setSelectedPost(null)} />
      <ObraDetailSheet obra={selectedObra} open={!!selectedObra} onClose={() => setSelectedObra(null)} />
    </div>
  );
}

