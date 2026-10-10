import { useEffect, useRef, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';

type Aula = {
  id: string;
  titulo: string;
  objetivo: string | null;
  duracao_est_min: number;
  ordem: number;
};

type Progresso = { concluida: boolean; pct: number };

type Props = {
  aulas: Aula[];
  progresso: Record<string, Progresso>;
  onNavigate: () => void;
};

const TeoriaTab = ({ aulas, progresso, onNavigate }: Props) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Encontra a primeira aula não concluída
  const firstUnfinishedIdx = aulas.findIndex(a => !progresso[a.id]?.concluida);
  const targetIdx = firstUnfinishedIdx === -1 ? 0 : firstUnfinishedIdx;

  useEffect(() => {
    // Scrolla para o botão "continuar"
    if (containerRef.current) {
      const el = document.getElementById(`node-${targetIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [targetIdx]);

  if (aulas.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-black/20 p-6 text-center text-sm text-white/60 backdrop-blur-sm mt-8">
        Nenhuma aula publicada neste tema ainda.
      </p>
    );
  }

  return (
    <div className="relative pb-32 pt-12" ref={containerRef}>
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <path
          d={generatePath(aulas.length)}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center gap-12">
        {aulas.map((au, idx) => {
          const p = progresso[au.id];
          const isDone = p?.concluida;
          const isNext = idx === targetIdx;
          const isLocked = idx > targetIdx;
          const offsetClass = idx % 2 === 0 ? '-translate-x-[40px]' : 'translate-x-[40px]';

          return (
            <motion.div
              key={au.id}
              id={`node-${idx}`}
              className={`relative flex flex-col items-center ${offsetClass}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: 0.1 }}
            >
              <div className="mb-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 drop-shadow-md">
                  Art. {idx + 1}
                </p>
              </div>

              <button
                onClick={() => {
                  onNavigate();
                  setTimeout(() => {
                    startTransition(() => {
                      navigate(`/aprender/aula/${au.id}`);
                    });
                  }, 120);
                }}
                disabled={isLocked}
                className="group relative flex h-20 w-20 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Ring / Halo para o próximo */}
                {isNext && (
                  <span className="absolute -inset-3 rounded-full border-4 border-white/20 animate-pulse" />
                )}

                {/* Main Node */}
                <div
                  className={`absolute inset-0 rounded-full shadow-lg transition-colors ${
                    isDone
                      ? 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-yellow-500/40 ring-4 ring-yellow-400/30'
                      : isNext
                      ? 'bg-gradient-to-br from-white to-gray-200 shadow-white/40 ring-4 ring-white/30'
                      : 'bg-black/40 ring-4 ring-white/10 backdrop-blur-md'
                  }`}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center">
                  {isDone ? (
                    <Star className="h-8 w-8 text-white drop-shadow-md" strokeWidth={2.5} fill="currentColor" />
                  ) : isNext ? (
                    <PlayCircle className="h-8 w-8 text-rose-900 drop-shadow-sm ml-1" strokeWidth={2} />
                  ) : (
                    <span className="font-display text-2xl font-black text-white/50">{idx + 1}</span>
                  )}
                </div>

                {/* Tooltip Hover/Title */}
                <div className="absolute top-1/2 -translate-y-1/2 left-full ml-4 w-40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none md:block hidden">
                  <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-2 shadow-xl">
                    <p className="text-xs font-bold text-white line-clamp-2">{au.titulo}</p>
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Button for Mobile to easily jump into the action */}
      {targetIdx < aulas.length && (
        <div className="fixed bottom-[calc(var(--sai-bottom)+1rem)] left-0 right-0 flex justify-center z-50 pointer-events-none">
          <button
            onClick={() => {
              onNavigate();
              setTimeout(() => {
                startTransition(() => {
                  navigate(`/aprender/aula/${aulas[targetIdx].id}`);
                });
              }, 120);
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-6 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] active:scale-95 transition-transform"
          >
            <PlayCircle className="h-5 w-5 text-rose-900" />
            <span className="font-bold text-rose-900">Continuar da Aula {targetIdx + 1}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TeoriaTab;

// Função para gerar o path do SVG em zigzag
function generatePath(count: number) {
  if (count <= 1) return '';
  const itemHeight = 128; // gap-12 (48px) + h-20 (80px) = ~128px
  const startY = 40; // padding top aproximado
  let path = `M 50% ${startY}`;
  
  for (let i = 1; i < count; i++) {
    const isEven = i % 2 === 0;
    const prevEven = (i - 1) % 2 === 0;
    
    // Offset X em pixels: 40px left ou right. No SVG usaremos view-width percentages ou calc.
    // Para simplificar no SVG do Tailwind (w-full absolute), usaremos coordenadas relativas
    // O flex gap e translate-x-[40px] não mapeia perfeitamente 1:1 no SVG simples viewBox.
    // Em CSS/SVG combinados, uma forma simples é fazer um M C C C com as posições.
    const xPrev = prevEven ? 'calc(50% - 40px)' : 'calc(50% + 40px)';
    const xCurr = isEven ? 'calc(50% - 40px)' : 'calc(50% + 40px)';
    
    const yPrev = startY + (i - 1) * itemHeight + 40; // center of prev node
    const yCurr = startY + i * itemHeight + 40; // center of current node
    
    path += ` C ${xPrev} ${yPrev + 40}, ${xCurr} ${yCurr - 40}, ${xCurr} ${yCurr}`;
  }
  return path;
}

