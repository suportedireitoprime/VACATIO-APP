import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/nativeHaptics';

interface AudioaulasCategoriasNavProps {
  areas: [string, number][]; // [nomeOriginal, totalAulas]
  areaAtual: string | null;
  onSelectArea: (areaNome: string | null) => void;
  className?: string;
}

/** Formata o rótulo de exibição da área (ex: "Direito Constitucional" -> "Constituição") */
function formatAreaLabel(area: string): string {
  if (/constituc/i.test(area)) return 'Constituição';
  return area.replace(/^Direitos?\s+(do\s+|da\s+|de\s+)?/i, '').trim();
}

/**
 * Menu de alternância superior para Áudio Aulas.
 * Sem ícones, com rolagem horizontal infinita, iniciando com:
 * "Todos", seguido de "Constituição" e demais áreas do Direito.
 */
export const AudioaulasCategoriasNav: React.FC<AudioaulasCategoriasNavProps> = ({
  areas,
  areaAtual,
  onSelectArea,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Garante que "Direito Constitucional" (Constituição) venha logo após "Todos"
  const sortedAreas = useMemo(() => {
    const list = [...areas];
    list.sort(([a], [b]) => {
      const isConstA = /constituc/i.test(a);
      const isConstB = /constituc/i.test(b);
      if (isConstA && !isConstB) return -1;
      if (!isConstA && isConstB) return 1;
      return a.localeCompare(b, 'pt-BR');
    });
    return list;
  }, [areas]);

  // Rola suavemente até a pílula ativa quando mudar de área
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [areaAtual]);

  return (
    <div className={`mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-10 mb-6 -mt-2 ${className}`}>
      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 px-0.5 select-none"
      >
        {/* 1. Todos */}
        <button
          type="button"
          data-active={!areaAtual ? 'true' : 'false'}
          onClick={() => {
            haptic.selection();
            onSelectArea(null);
          }}
          className={`relative px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 border cursor-pointer select-none ${
            !areaAtual
              ? 'text-white border-primary/40 shadow-lg shadow-primary/20 scale-[1.02]'
              : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          {!areaAtual && (
            <motion.span
              layoutId="audioaulas-cat-active-pill"
              className="absolute inset-0 rounded-2xl bg-primary"
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            />
          )}
          <span className="relative z-10 whitespace-nowrap">Todos</span>
        </button>

        {/* 2. Áreas do Direito (infinito, iniciando por Constituição) */}
        {sortedAreas.map(([nome, total]) => {
          const isAtivo = areaAtual === nome;
          const label = formatAreaLabel(nome);

          return (
            <button
              key={nome}
              type="button"
              data-active={isAtivo ? 'true' : 'false'}
              onClick={() => {
                haptic.selection();
                onSelectArea(nome);
              }}
              className={`relative px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 border cursor-pointer select-none ${
                isAtivo
                  ? 'text-white border-primary/40 shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isAtivo && (
                <motion.span
                  layoutId="audioaulas-cat-active-pill"
                  className="absolute inset-0 rounded-2xl bg-primary"
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
                <span>{label}</span>
                {total > 0 && (
                  <span
                    className={`text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.2 rounded-full ${
                      isAtivo ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400'
                    }`}
                  >
                    {total}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AudioaulasCategoriasNav;
