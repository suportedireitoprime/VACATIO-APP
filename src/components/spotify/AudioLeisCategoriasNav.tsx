import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/nativeHaptics';

export type LeiCategoryFilter = 'todos' | 'constituicao' | 'codigos' | 'estatutos' | 'especiais';

interface AudioLeisCategoriasNavProps {
  activeCategory: LeiCategoryFilter;
  onSelectCategory: (cat: LeiCategoryFilter) => void;
  className?: string;
}

const CATEGORIAS_AUDIO_LEIS: { id: LeiCategoryFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'constituicao', label: 'Constituição' },
  { id: 'codigos', label: 'Códigos' },
  { id: 'estatutos', label: 'Estatutos' },
  { id: 'especiais', label: 'Leis Especiais' },
];

/**
 * Menu de alternância superior para Áudio Leis.
 * Sem ícones, com rolagem horizontal infinita, iniciando com:
 * "Todos", seguido de "Constituição", "Códigos", "Estatutos" e "Leis Especiais".
 */
export const AudioLeisCategoriasNav: React.FC<AudioLeisCategoriasNavProps> = ({
  activeCategory,
  onSelectCategory,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Rola suavemente até a pílula ativa quando mudar de categoria
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
  }, [activeCategory]);

  return (
    <div className={`mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-10 mb-6 -mt-2 ${className}`}>
      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 px-0.5 select-none"
      >
        {CATEGORIAS_AUDIO_LEIS.map((cat) => {
          const isAtivo = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              data-active={isAtivo ? 'true' : 'false'}
              onClick={() => {
                haptic.selection();
                onSelectCategory(cat.id);
              }}
              className={`relative px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 border cursor-pointer select-none ${
                isAtivo
                  ? 'text-white border-purple-500/40 shadow-lg shadow-purple-600/30 scale-[1.02]'
                  : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isAtivo && (
                <motion.span
                  layoutId="audio-leis-cat-active-pill"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-900/40"
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                />
              )}
              <span className="relative z-10 whitespace-nowrap">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AudioLeisCategoriasNav;
