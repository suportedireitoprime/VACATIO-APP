import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Film, Star, Tv, Video } from 'lucide-react';
import type { Obra } from './ObraDetailSheet';

interface Props {
  titulo: string;
  eyebrow: string;
  subtitulo?: string;
  obras: Obra[];
  onAbrir: (o: Obra) => void;
  cardSize?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { w: 'w-[120px]', h: 'h-[180px]' },
  md: { w: 'w-[140px]', h: 'h-[210px]' },
  lg: { w: 'w-[160px]', h: 'h-[240px]' },
};

const IconeTipo = ({ tipo }: { tipo?: string }) => {
  if (tipo === 'tv') return <Tv className="w-3 h-3" strokeWidth={2} />;
  if (tipo === 'doc') return <Video className="w-3 h-3" strokeWidth={2} />;
  return <Film className="w-3 h-3" strokeWidth={2} />;
};

const ObrasCarousel = ({ titulo, eyebrow, subtitulo, obras, onAbrir, cardSize = 'md' }: Props) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startScroll: number; moved: number } | null>(null);
  const { w, h } = SIZES[cardSize];

  // Mouse-only drag-to-scroll (desktop). No pointer capture, no touch interference.
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { startX: e.clientX, startScroll: el.scrollLeft, moved: 0 };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = scrollerRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) {
      el.scrollLeft = d.startScroll - dx;
      d.moved = Math.max(d.moved, Math.abs(dx));
    }
  }, []);

  const endDrag = useCallback(() => {
    // Segura o "moved" por um tick para o click handler poder consultá-lo.
    if (drag.current && drag.current.moved <= 6) drag.current = null;
    else if (drag.current) {
      const cur = drag.current;
      setTimeout(() => { if (drag.current === cur) drag.current = null; }, 60);
    }
  }, []);

  const onCardClick = useCallback((obra: Obra) => (e: React.MouseEvent) => {
    if (drag.current && drag.current.moved > 6) {
      e.preventDefault();
      return;
    }
    onAbrir(obra);
  }, [onAbrir]);


  if (!obras.length) return null;

  return (
    <section className="mt-7">
      <div className="px-4 mb-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold">
          {eyebrow}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-1 h-6 rounded-full bg-red-500" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {titulo}
          </h2>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        className="flex gap-3 overflow-x-auto scrollbar-none px-4 pb-2 cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as any}
      >
        {obras.map((obra, i) => (
          <motion.button
            key={obra.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.4) }}
            onClick={onCardClick(obra)}
            className={`group relative shrink-0 ${w} ${h} rounded-xl overflow-hidden bg-card border border-border/50 text-left`}
          >

            {obra.poster_url ? (
              <img
                src={obra.poster_url}
                alt={obra.titulo}
                loading="lazy"
                draggable={false}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-3 text-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(0 55% 22%), hsl(355 65% 14%))',
                }}
              >
                <Film className="w-8 h-8 text-red-200/60 mb-2" strokeWidth={1.5} />
                <p className="text-[11px] font-semibold text-red-50 line-clamp-3 leading-tight">
                  {obra.titulo}
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-[9px] font-semibold uppercase tracking-wide flex items-center gap-1">
              <IconeTipo tipo={obra.tipo} />
              {obra.tipo === 'tv' ? 'Série' : 'Filme'}
            </div>
            {obra.nota ? (
              <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-amber-300 text-[10px] font-semibold">
                <Star className="w-2.5 h-2.5 fill-amber-300" strokeWidth={0} />
                {obra.nota.toFixed(1)}
              </div>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 p-2 text-white pointer-events-none">
              <p className="text-[11px] font-semibold leading-tight line-clamp-2">
                {obra.titulo}
              </p>
              {obra.ano ? <p className="text-[9px] text-white/70 mt-0.5">{obra.ano}</p> : null}
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
};

export default ObrasCarousel;
