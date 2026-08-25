import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowUpRight, Film, Star, Popcorn } from 'lucide-react';
import { getNoticiasCache, prefetchNoticias, subscribeNoticias, type Noticia } from '@/services/noticiasService';
import { newsImg, cdnImg } from '@/lib/cdnImg';
import NoticiaViewerSheet from '@/components/vademecum/NoticiaViewerSheet';
import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';
import { COLECOES, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { supabase } from '@/integrations/supabase/client';

const AUTOPLAY_MS = 10000;
const MAX_NEWS = 8;

type FeedItem =
  | { kind: 'noticia'; id: string; data: Noticia }
  | { kind: 'livro'; id: string; data: LivroNormalizado };

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

const CYCLE: Array<'livro' | 'noticia'> = [
  'noticia',
  'livro',
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
  const [livros, setLivros] = useState<LivroNormalizado[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedNoticia, setSelectedNoticia] = useState<Noticia | null>(null);
  const [selectedLivro, setSelectedLivro] = useState<LivroNormalizado | null>(null);

  // Filas persistentes por sessão do carrossel
  const livroQueueRef = useRef<LivroNormalizado[]>([]);
  const noticiaQueueRef = useRef<Noticia[]>([]);
  const usedNoticiaIdsRef = useRef<Set<string>>(new Set());
  const cycleStepRef = useRef(0);

  const [feed, setFeed] = useState<FeedItem[]>([]);

  // Recalcula a fila de notícias sempre que a fonte muda: sempre a mais recente
  // ainda não exibida vai na frente. Notícias já mostradas não voltam.
  useEffect(() => {
    async function loadLivros() {
      const col = COLECOES.find((c) => c.id === 'fora_da_toga') || COLECOES.find((c) => c.id === 'classicos');
      if (!col) return;
      const { data } = await supabase.from(col.table).select(col.select).limit(40);
      if (data) {
        const norm = shuffle(data.map((r) => normalizeLivro(r, col)));
        setLivros(norm);
        livroQueueRef.current = norm;
      }
    }
    loadLivros();
  }, []);

  useEffect(() => {
    const sorted = [...noticias].sort(
      (a, b) => new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime(),
    );
    noticiaQueueRef.current = sorted.filter((n) => !usedNoticiaIdsRef.current.has(String(n.id)));
  }, [noticias]);



  const takeNext = useCallback((kind: 'livro' | 'noticia'): FeedItem | null => {
    if (kind === 'livro') {
      if (livroQueueRef.current.length === 0) {
        if (livros.length > 0) {
          livroQueueRef.current = shuffle([...livros]);
        } else {
          return null;
        }
      }
      const p = livroQueueRef.current.shift();
      if (!p) return null;
      return { kind: 'livro', id: `l-${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, data: p };
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
  }, [noticias, livros]);

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
    onOpenChange?.(!!selectedNoticia || !!selectedLivro);
  }, [selectedNoticia, selectedLivro, onOpenChange]);


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
    else setSelectedLivro(item.data as LivroNormalizado);
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
  const headerTitle = kind === 'livro' ? 'Recomendação de Livros' : 'Notícias Jurídicas';
  const headerSubtitle = kind === 'livro' ? 'obras fundamentais e leituras sugeridas' : 'notícias do mundo jurídico em tempo real';
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
          const isL = item.kind === 'livro';
          const rawImg = isL
            ? (item.data as LivroNormalizado).capa
            : (item.data as Noticia).imagem_url ?? '';
          const img = isL ? cdnImg(rawImg, 320) : newsImg(rawImg, 640);
          const title = isL ? (item.data as LivroNormalizado).titulo : (item.data as Noticia).titulo;
          const meta = isL
            ? `Livro · ${(item.data as LivroNormalizado).autor || 'Diversos'}`
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
                style={isL ? { backgroundColor: '#111827' } : undefined}
              >
                {img && (
                  <img
                    src={img}
                    alt=""
                    loading={i < 2 ? 'eager' : 'lazy'}
                    {...(i < 2 ? { fetchpriority: 'high' as any } : {})}
                    decoding="async"
                    className={`absolute inset-0 w-full h-full object-cover ${
                      isL ? 'opacity-30 scale-125 blur-xl' : 'brightness-110 contrast-105 saturate-110'
                    }`}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md">
                  <ArrowUpRight className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
                </div>

                {isL && img && (
                  <div className="absolute inset-y-2 left-2 w-[72px] rounded-lg shadow-xl overflow-hidden ring-1 ring-white/10 z-10 bg-neutral-900">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className={`absolute inset-0 flex flex-col justify-end pb-3 pt-4 z-20 ${isL ? 'pl-[92px] pr-4' : 'px-4'}`}>
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
      <LivroDetailSheet livro={selectedLivro} open={!!selectedLivro} onClose={() => setSelectedLivro(null)} />
    </div>
  );
}

