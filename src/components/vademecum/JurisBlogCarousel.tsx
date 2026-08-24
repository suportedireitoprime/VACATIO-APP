import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowUpRight } from 'lucide-react';
import { BLOG_POSTS, TEMA_COLORS, type BlogPost } from '@/data/blogPosts';
import { cdnImg } from '@/lib/cdnImg';
import BlogPostSheet from './BlogPostSheet';

const AUTOPLAY_MS = 8000;

/**
 * Carrossel de artigos do blog (tema "Jurisprudência") no mesmo modelo do
 * carrossel do início: scroll-snap horizontal com "pontas" visíveis,
 * card central destacado, autoplay pausável e dots.
 */
export default function JurisBlogCarousel() {
  const posts = useMemo<BlogPost[]>(
    () => BLOG_POSTS.filter((p) => p.tema === 'Jurisprudência'),
    [],
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef<number | null>(null);
  const userInteractingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<BlogPost | null>(null);

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const child = scroller.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const target = child.offsetLeft - (scroller.clientWidth - child.clientWidth) / 2;
    scroller.scrollTo({ left: target, behavior });
  }, []);

  useEffect(() => {
    if (posts.length < 2) return;
    const tick = () => {
      if (userInteractingRef.current || selected || document.hidden) return;
      const next = (activeIndex + 1) % posts.length;
      setActiveIndex(next);
      scrollToIndex(next);
    };
    autoplayRef.current = window.setInterval(tick, AUTOPLAY_MS);
    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    };
  }, [activeIndex, posts.length, scrollToIndex, selected]);

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

  if (posts.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="px-1">
        <h3 className="font-display text-foreground text-[18px] font-bold mb-1 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-emerald-400" />
          Artigos do blog
        </h3>
        <p className="font-body text-muted-foreground text-[13px] leading-snug ml-3">
          jurisprudência comentada e explicada
        </p>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={pauseAutoplay}
        onTouchStart={pauseAutoplay}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 px-[7.5%] md:px-[4%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post, i) => {
          const isActive = i === activeIndex;
          const c = TEMA_COLORS[post.tema];
          return (
            <motion.button
              key={post.id}
              type="button"
              onClick={() => setSelected(post)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="snap-center shrink-0 w-[85%] md:w-[46%] lg:w-[31%] active:scale-[0.99] text-left"
            >
              <div
                className={`relative w-full h-[170px] overflow-hidden rounded-2xl transition-all duration-300 ${
                  isActive ? 'opacity-100 scale-100 shadow-lg' : 'opacity-60 scale-[0.94]'
                }`}
                style={c ? { background: c.bg } : undefined}
              >
                {post.imagem_url && (
                  <img
                    src={cdnImg(post.imagem_url, 640)}
                    alt=""
                    aria-hidden
                    loading={i < 2 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover object-top opacity-90"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md">
                  <ArrowUpRight className="w-4 h-4 text-white" strokeWidth={2.2} />
                </div>

                {c && (
                  <span
                    className="absolute top-2.5 left-2.5 text-[10.5px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                    style={{ background: c.chip, color: c.chipText }}
                  >
                    Blog · {post.tema}
                  </span>
                )}

                <div className="absolute inset-0 flex flex-col justify-end px-4 pb-3.5 pt-4">
                  <div className="flex items-center gap-2 mb-1 text-[12px] text-white/90">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="truncate">{post.tempo_leitura_min} min · {post.tema}</span>
                  </div>
                  <p className="font-display text-white text-[16px] font-semibold leading-snug line-clamp-2 drop-shadow-sm">
                    {post.titulo}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {posts.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {posts.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir para artigo ${i + 1}`}
              onClick={() => { pauseAutoplay(); setActiveIndex(i); scrollToIndex(i); }}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-5 bg-emerald-400' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}

      <BlogPostSheet post={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
