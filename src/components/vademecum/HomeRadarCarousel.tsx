import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowUpRight, Scale, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AUTOPLAY_MS = 6000;
const MAX_ITEMS = 10;

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
    return 'Recente';
  }
}

export default function HomeRadarCarousel() {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const autoplayRef = useRef<number | null>(null);
  const userInteractingRef = useRef(false);
  
  const [leis, setLeis] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const carregarRadar = async () => {
      const { data } = await supabase
        .from('radar_impactos_leis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_ITEMS);
      
      if (data && data.length > 0) {
        setLeis(data);
      } else {
        // Fallback for visual demonstration
        setLeis([
          { id: '1', tipo: 'Lei Ordinária', ato_ementa: 'Altera o Código Civil para atualizar diretrizes de proteção.', created_at: new Date().toISOString() },
          { id: '2', tipo: 'Decreto', ato_ementa: 'Regulamenta normas sobre transição energética.', created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: '3', tipo: 'Lei Complementar', ato_ementa: 'Estabelece novas regras para o sistema tributário.', created_at: new Date(Date.now() - 172800000).toISOString() },
        ]);
      }
    };
    carregarRadar();
  }, []);

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const child = scroller.children[idx] as HTMLElement | undefined;
    if (!child) return;
    const target = child.offsetLeft - (scroller.clientWidth - child.clientWidth) / 2;
    scroller.scrollTo({ left: target, behavior });
  }, []);

  useEffect(() => {
    if (leis.length < 2) return;
    const tick = () => {
      if (userInteractingRef.current) return;
      const next = (activeIndex + 1) % leis.length;
      setActiveIndex(next);
      scrollToIndex(next);
    };
    autoplayRef.current = window.setInterval(tick, AUTOPLAY_MS);
    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    };
  }, [activeIndex, leis.length, scrollToIndex]);

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
          <span className="w-1 h-5 rounded-full bg-[#FACC15] shrink-0" />
          <span className="truncate">Radar Legislativo</span>
        </h3>
        <p className="font-body text-muted-foreground text-[12.5px] leading-snug ml-3 truncate">
          Novas leis e atualizações publicadas
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate('/normas/leis')}
        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/10 bg-card hover:bg-muted/80 px-3 py-1.5 text-[12px] font-semibold text-foreground active:scale-[0.96] transition-all shadow-sm"
      >
        <span>Ver radar</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );

  if (leis.length === 0) {
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
        {leis.map((item, i) => {
          const isActive = i === activeIndex;
          const meta = `${formatTime(item.created_at)} · ${item.tipo || 'Norma'}`;

          return (
            <motion.button
              key={item.id}
              onClick={() => navigate('/normas/leis')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="snap-center shrink-0 w-[85%] md:w-[46%] lg:w-[31%] active:scale-[0.99] text-left"
            >
              <div
                className={`relative w-full h-[140px] overflow-hidden rounded-2xl bg-[#1C1C1E] border border-white/5 transition-all duration-300 flex flex-col p-4 ${
                  isActive ? 'opacity-100 scale-100 shadow-lg border-white/10' : 'opacity-60 scale-[0.94]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#FACC15]/20 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-[#FACC15]" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5 text-white/70" />
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-muted-foreground font-semibold">
                    <Clock className="w-3 h-3 text-[#FACC15]" />
                    <span className="truncate uppercase tracking-wider">{meta}</span>
                  </div>
                  <p className="font-display text-white text-[14px] sm:text-[15px] font-bold leading-snug line-clamp-2">
                    {item.ato_ementa || item.resumo_ia || 'Atualização legislativa'}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {leis.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {leis.slice(0, Math.min(leis.length, 8)).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-5 bg-[#FACC15]' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
