import { Suspense, useEffect, useRef, useState } from 'react';
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight, Clock, Film, Star } from 'lucide-react';
import type { Obra } from '@/components/tematica/ObraDetailSheet';
import { getCachedObras, loadObras } from '@/lib/tematicaStore';
import { cdnImg } from '@/lib/cdnImg';

const ObraDetailSheet = lazyWithRetry(() => import('@/components/tematica/ObraDetailSheet'));

/** Mesma paleta do carrossel da home (cards deitados com fundo colorido). */
const OBRA_PALETTE: Record<string, { deep: string; mid: string; chipBg: string; chipText: string }> = {
  Filme: { deep: '#2a0a12', mid: '#4a1524', chipBg: '#e01f47', chipText: '#fff5f7' },
  Série: { deep: '#0d1230', mid: '#1e2757', chipBg: '#6366f1', chipText: '#f0f2ff' },
  Documentário: { deep: '#0f1f14', mid: '#1e3a26', chipBg: '#10b981', chipText: '#ecfdf5' },
};

function tipoLabel(o: Obra): string {
  if ((o.categorias_juridicas ?? []).includes('Documentário')) return 'Documentário';
  return o.tipo === 'tv' ? 'Série' : 'Filme';
}

/**
 * Faixa da Temática Jurídica dentro de Ferramentas — cards deitados (landscape)
 * com fundo colorido, no mesmo padrão do carrossel do início do app.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TematicaCarrossel = () => {
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [obras, setObras] = useState<Obra[]>(() => shuffle((getCachedObras() as Obra[] | null) ?? []));
  const [selecionada, setSelecionada] = useState<Obra | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Feed infinito: vai crescendo com novos embaralhamentos conforme o usuário avança.
  const [feed, setFeed] = useState<Obra[]>([]);

  useEffect(() => {
    let vivo = true;
    loadObras()
      .then((lista) => {
        if (vivo) setObras(shuffle((lista as Obra[]) ?? []));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // Semeia / repõe o feed sempre que a fonte muda ou o usuário chega perto do fim.
  useEffect(() => {
    if (!obras.length) return;
    setFeed((prev) => (prev.length ? prev : shuffle(obras)));
  }, [obras]);

  useEffect(() => {
    if (!obras.length) return;
    if (feed.length - activeIndex <= 4) {
      setFeed((prev) => [...prev, ...shuffle(obras)]);
    }
  }, [activeIndex, feed.length, obras]);

  const lista = feed;
  if (!lista.length) return null;


  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const node = child as HTMLElement;
      const c = node.offsetLeft + node.offsetWidth / 2;
      const d = Math.abs(c - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActiveIndex(best);
  };

  return (
    <div className="-mx-4 sm:-mx-6">
      {/* Cabeçalho */}
      <div className="px-4 sm:px-6 mb-3">
        <p className="font-body text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary mb-1">
          Temática jurídica
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-stretch gap-2 min-w-0">
            <span className="w-[3px] rounded-full bg-primary shrink-0" />
            <h3 className="font-display text-foreground text-[17px] font-semibold uppercase leading-tight truncate">
              Filmes e séries para juristas
            </h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tematica-juridica')}
            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground active:scale-[0.98]"
          >
            Ver todos
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Carrossel de cards deitados */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 px-[7.5%] md:px-[4%] lg:px-[3%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {lista.map((o, i) => {
          const isActive = i === activeIndex;
          const poster = o.poster_url;
          const bg = o.backdrop_url || poster;
          const label = tipoLabel(o);
          const palette = OBRA_PALETTE[label] ?? OBRA_PALETTE.Filme;
          const meta = [o.ano, o.nota ? `★ ${o.nota.toFixed(1)}` : null].filter(Boolean).join(' · ');

          return (
            <motion.button
              key={`${o.id}-${i}`}
              type="button"
              onClick={() => setSelecionada(o)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="group snap-center shrink-0 w-[85%] md:w-[46%] lg:w-[31%] text-left active:scale-[0.99]"
            >
              <div
                className={`relative w-full h-[140px] overflow-hidden rounded-2xl transition-all duration-300 ${
                  isActive ? 'opacity-100 scale-100 shadow-lg' : 'opacity-60 scale-[0.94] group-hover:opacity-90'
                }`}
                style={{ backgroundColor: palette.deep }}
              >
                {bg && (
                  <img
                    src={cdnImg(bg, 320)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-40"
                  />
                )}
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
                  className="absolute top-2.5 left-[108px] text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                  style={{ background: palette.chipBg, color: palette.chipText }}
                >
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
        })}
      </div>

      {/* Indicadores (posição dentro do ciclo atual) */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {obras.map((o, i) => (
          <span
            key={`dot-${o.id}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              obras.length && i === activeIndex % obras.length
                ? 'w-5 bg-primary'
                : 'w-1.5 bg-muted-foreground/35'
            }`}
          />
        ))}
      </div>


      <Suspense fallback={null}>
        {selecionada && (
          <ObraDetailSheet obra={selecionada} open onClose={() => setSelecionada(null)} />
        )}
      </Suspense>
    </div>
  );
};

export default TematicaCarrossel;
