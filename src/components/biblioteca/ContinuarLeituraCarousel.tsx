import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Play, Clock, Timer } from 'lucide-react';
import type { LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { subscribeTracking, type LivroSnapshot } from '@/lib/bibliotecaTracking';
import { readLeituraProgress, formatDuration } from '@/lib/leituraProgress';
import { directImg } from '@/lib/cdnImg';

interface Props {
  onAbrirLivro: (livro: LivroNormalizado) => void;
}

const snapToNormalizado = (s: LivroSnapshot): LivroNormalizado => ({
  id: s.id,
  titulo: s.titulo,
  autor: s.autor ?? null,
  sobre: s.sobre ?? null,
  capa: s.capa ?? null,
  link: s.link ?? null,
  download: s.download ?? null,
  area: s.area ?? null,
  colecaoId: s.colecaoId,
});

const ContinuarLeituraCarousel = ({ onAbrirLivro }: Props) => {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribeTracking(() => setTick((t) => t + 1)), []);
  const itens = useMemo(() => readLeituraProgress(tick).slice(0, 12), [tick]);

  if (itens.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="px-4 mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold">
            MINHA LEITURA
          </p>
          <h2 className="text-lg font-bold text-foreground leading-tight mt-0.5">
            Continue de onde parou
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar snap-x snap-mandatory">
        <div className="flex gap-4 px-4 pb-3">
          {itens.map(({ snap, index, total, percent, readTimeMs, etaMs }) => {
            const pageLabel = total ? `Pág. ${index + 1} de ${total}` : `Pág. ${index + 1}`;
            return (
              <button
                key={`${snap.colecaoId}:${snap.id}`}
                onClick={() => onAbrirLivro(snapToNormalizado(snap))}
                className="snap-start shrink-0 w-[300px] sm:w-[340px] flex gap-4 items-stretch rounded-2xl border border-border/60 bg-card shadow-lg shadow-black/30 overflow-hidden text-left active:scale-[0.985] transition-transform"
              >
                <div className="relative w-[104px] shrink-0 bg-muted">
                  {snap.capa ? (
                    <img
                      src={directImg(snap.capa, 320)}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-3 pr-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-primary/90">
                      Continuar
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-foreground leading-tight line-clamp-2">
                      {snap.titulo}
                    </p>
                    {snap.autor && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {snap.autor}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                      <span>{pageLabel}</span>
                      {percent > 0 && <span className="text-primary font-semibold">{percent}%</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.max(2, percent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(readTimeMs)}
                      </span>
                      {etaMs != null && (
                        <span className="inline-flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          ~{formatDuration(etaMs)} restantes
                        </span>
                      )}
                      <span className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <Play className="w-3 h-3 fill-current" />
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ContinuarLeituraCarousel;
