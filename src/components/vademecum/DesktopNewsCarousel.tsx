import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getNoticiasCache, prefetchNoticias, type Noticia } from '@/services/noticiasService';
import { Skeleton } from '@/components/ui/skeleton';
import { directImg } from '@/lib/cdnImg';

const SkeletonCards = () => (
  <div className="relative bg-card/50 border-b border-border">
    <div className="flex items-center justify-between px-8 pt-4 pb-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Newspaper className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="font-display text-sm font-semibold text-foreground">Notícias em destaque</span>
      </div>
    </div>
    <div className="flex gap-3 overflow-hidden px-8 pb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="shrink-0 w-[260px] rounded-xl overflow-hidden bg-card border border-border">
          <Skeleton className="h-[120px] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DesktopNewsCarousel = () => {
  const navigate = useNavigate();
  const [noticias, setNoticias] = useState<Noticia[]>(() => {
    const cached = getNoticiasCache();
    return cached ? cached.slice(0, 20) : [];
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (noticias.length > 0) return;

    prefetchNoticias();

    const interval = setInterval(() => {
      const cached = getNoticiasCache();
      if (cached && cached.length > 0) {
        setNoticias(cached.slice(0, 20));
        clearInterval(interval);
      }
    }, 200);

    const timeout = setTimeout(() => clearInterval(interval), 8000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  if (noticias.length === 0) return <SkeletonCards />;

  return (
    <div className="relative bg-card/50 border-b border-border">
      <div className="flex items-center justify-between px-8 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Newspaper className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-display text-sm font-semibold text-foreground">Notícias em destaque</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll(-1)}
            className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/noticias')}
            className="ml-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15"
          >
            Ver todas →
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-8 pb-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {noticias.filter(n => n.imagem_url?.trim()).map((noticia) => {
          const date = noticia.data_publicacao
            ? new Date(noticia.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
            : '';

          return (
            <motion.div
              key={noticia.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(noticias.indexOf(noticia) * 0.04, 0.4), type: 'spring', stiffness: 260, damping: 24 }}
              onClick={() => navigate('/noticias', { state: { noticiaId: noticia.id } })}
              className="shrink-0 w-[260px] rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all group cursor-pointer"
            >
              <div className="relative h-[120px] overflow-hidden news-cover-shine">
                <img
                  src={directImg(noticia.imagem_url!, 520)}
                  alt={noticia.titulo}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                {noticia.categoria && (
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider text-white bg-primary/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {noticia.categoria}
                  </span>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-display text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {noticia.titulo}
                </h4>
                {date && (
                  <p className="text-muted-foreground text-[11px] mt-1.5">{date}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DesktopNewsCarousel;
