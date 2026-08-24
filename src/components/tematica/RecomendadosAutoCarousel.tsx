import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Star, Film, Tv, Clapperboard } from 'lucide-react';
import type { Obra } from './ObraDetailSheet';

interface Props {
  obras: Obra[];
  onAbrir: (obra: Obra) => void;
}

const CARD_W = 180;
const GAP = 16;
const STEP = CARD_W + GAP;

const RecomendadosAutoCarousel = ({ obras, onAbrir }: Props) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const didInitRef = useRef(false);
  const dragRef = useRef<{ startX: number; startScroll: number; moved: number; pointerId: number } | null>(null);

  const base = obras;
  const lista = useMemo(() => (base.length ? [...base, ...base, ...base] : []), [base]);
  const BASE_LEN = base.length;

  const updateActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !BASE_LEN) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    const first = el.querySelector<HTMLElement>('[data-rec-item]');
    if (!first) return;
    const startOffset = first.offsetLeft + first.offsetWidth / 2;
    const idx = Math.round((center - startOffset) / STEP);
    setActiveIdx(Math.max(0, Math.min(lista.length - 1, idx)));
  }, [lista.length, BASE_LEN]);

  const normalizeLoop = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !BASE_LEN) return;
    const items = el.querySelectorAll<HTMLElement>('[data-rec-item]');
    if (items.length < BASE_LEN * 3) return;
    const centerOf = (i: number) => items[i].offsetLeft - (el.clientWidth - items[i].offsetWidth) / 2;
    if (activeIdx < BASE_LEN * 0.5) {
      el.scrollTo({ left: centerOf(activeIdx + BASE_LEN), behavior: 'auto' });
    } else if (activeIdx >= BASE_LEN * 2.5) {
      el.scrollTo({ left: centerOf(activeIdx - BASE_LEN), behavior: 'auto' });
    }
  }, [activeIdx, BASE_LEN]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !BASE_LEN || didInitRef.current) return;
    const items = el.querySelectorAll<HTMLElement>('[data-rec-item]');
    if (items.length < BASE_LEN * 3) return;
    const mid = items[BASE_LEN];
    el.scrollTo({ left: mid.offsetLeft - (el.clientWidth - mid.offsetWidth) / 2, behavior: 'auto' });
    didInitRef.current = true;
    updateActive();
  }, [BASE_LEN, updateActive, lista.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateActive();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [updateActive]);

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(normalizeLoop, 200);
    return () => clearTimeout(t);
  }, [paused, activeIdx, normalizeLoop]);

  // Auto-avanço
  useEffect(() => {
    if (paused || lista.length === 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    const id = window.setInterval(() => {
      const next = (activeIdx + 1) % lista.length;
      const target = el.querySelectorAll<HTMLElement>('[data-rec-item]')[next];
      if (target) {
        el.scrollTo({
          left: target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2,
          behavior: 'smooth',
        });
      }
    }, 3400);
    return () => clearInterval(id);
  }, [paused, activeIdx, lista.length]);

  if (lista.length === 0) return null;

  const sidePad = `calc(50% - ${CARD_W / 2}px)`;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setPaused(true);
    if (e.pointerType !== 'mouse') return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, startScroll: el.scrollLeft, moved: 0, pointerId: e.pointerId };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx));
    el.scrollLeft = d.startScroll - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const el = scrollerRef.current;
    if (d && el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    setTimeout(() => setPaused(false), 1800);
    if (d) setTimeout(() => { if (dragRef.current === d) dragRef.current = null; }, 0);
  };

  const tipoLabel = (o: Obra) => {
    if ((o.categorias_juridicas ?? []).includes('Documentário')) return { label: 'DOC', Icon: Clapperboard };
    if (o.tipo === 'tv') return { label: 'SÉRIE', Icon: Tv };
    return { label: 'FILME', Icon: Film };
  };

  return (
    <div className="mt-4 mb-6">
      <div className="px-4 mb-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-red-500/90 font-bold">EM DESTAQUE</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-1 h-6 rounded-full bg-red-500" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Recomendados</h2>
        </div>
        
      </div>

      <div
        ref={scrollerRef}
        className="overflow-x-auto no-scrollbar select-none md:cursor-grab"
        style={{ scrollPaddingInline: sidePad, WebkitOverflowScrolling: 'touch' } as any}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="flex items-end pb-6 pt-8" style={{ gap: `${GAP}px`, paddingInline: sidePad }}>
          {lista.map((obra, i) => {
            const isActive = i === activeIdx;
            const { label, Icon } = tipoLabel(obra);
            return (
              <button
                key={`${obra.id}:${i}`}
                data-rec-item
                type="button"
                onClick={(e) => {
                  if ((dragRef.current?.moved ?? 0) > 6) { e.preventDefault(); return; }
                  onAbrir(obra);
                }}
                draggable={false}
                className="shrink-0 outline-none group text-left"
                style={{ width: CARD_W }}
                aria-label={obra.titulo}
              >
                <div
                  className="relative rounded-xl overflow-hidden bg-muted transition-all duration-500 ease-out will-change-transform"
                  style={{
                    aspectRatio: '2 / 3',
                    transform: isActive ? 'scale(1.12)' : 'scale(0.84)',
                    opacity: isActive ? 1 : 0.55,
                    boxShadow: isActive
                      ? '0 26px 42px -14px rgba(0,0,0,0.7), 0 0 0 1px rgba(239, 68, 68, 0.4)'
                      : '0 10px 20px -10px rgba(0,0,0,0.5)',
                    filter: isActive ? 'none' : 'saturate(0.85) brightness(0.8)',
                  }}
                >
                  {obra.poster_url ? (
                    <img
                      src={obra.poster_url}
                      alt={obra.titulo}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center"
                      style={{ background: 'linear-gradient(135deg, hsl(0 55% 22%), hsl(355 65% 14%))' }}
                    >
                      <Film className="w-10 h-10 text-red-200/60 mb-2" strokeWidth={1.5} />
                      <p className="text-xs font-semibold text-red-50 line-clamp-3 leading-tight">{obra.titulo}</p>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-wide">
                    <Icon className="w-3 h-3" strokeWidth={2} />
                    {label}
                  </div>
                  {obra.nota ? (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-sm text-amber-300 text-[11px] font-semibold">
                      <Star className="w-3 h-3 fill-amber-300" strokeWidth={0} />
                      {obra.nota.toFixed(1)}
                    </div>
                  ) : null}

                  {isActive && (
                    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                      <span
                        key={`shine-${i}-${activeIdx}`}
                        className="absolute top-0 left-0 h-full w-1/2"
                        style={{
                          background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)',
                          transform: 'translateX(-120%) skewX(-18deg)',
                          animation: 'rec-shine 1.4s ease-out 0.15s forwards',
                        }}
                      />
                    </span>
                  )}
                </div>

                <div
                  className="mt-3 text-center transition-opacity duration-300 px-1"
                  style={{ opacity: isActive ? 1 : 0 }}
                >
                  <p className="text-[13px] font-semibold text-foreground leading-tight line-clamp-1">
                    {obra.titulo}
                  </p>
                  {obra.ano ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{obra.ano}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes rec-shine {
          0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: translateX(260%) skewX(-18deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default RecomendadosAutoCarousel;
