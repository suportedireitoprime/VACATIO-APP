import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/nativeHaptics';
import { Flame, Clock, Headphones, Heart, Sparkles, ChevronLeft } from 'lucide-react';

export type AudioaulasFiltroMenu = 'todos' | 'em_alta' | 'recentes' | 'mais_ouvidas' | 'favoritas';

export interface FiltroItem {
  id: AudioaulasFiltroMenu;
  label: string;
  icone: React.ComponentType<{ className?: string }>;
}

export const OPCOES_FILTRO_AUDIOAULAS: FiltroItem[] = [
  { id: 'todos', label: 'Todos', icone: Sparkles },
  { id: 'em_alta', label: 'Em alta', icone: Flame },
  { id: 'recentes', label: 'Recentes', icone: Clock },
  { id: 'mais_ouvidas', label: 'Mais Ouvidas', icone: Headphones },
  { id: 'favoritas', label: 'Favoritas', icone: Heart },
];

interface AudioaulasCategoriasNavProps {
  filtroAtivo?: AudioaulasFiltroMenu;
  onSelectFiltro?: (filtro: AudioaulasFiltroMenu) => void;
  areaAtual?: string | null;
  onVoltarParaTodos?: () => void;
  className?: string;
  // Compatibilidade com chamadas legadas
  areas?: [string, number][];
  onSelectArea?: (areaNome: string | null) => void;
}

/**
 * Menu de alternância superior para Áudio Aulas.
 * Configuração solicitada: "Todos", seguido de "Em alta", "Recentes", "Mais Ouvidas", "Favoritas".
 */
export const AudioaulasCategoriasNav: React.FC<AudioaulasCategoriasNavProps> = ({
  filtroAtivo = 'todos',
  onSelectFiltro,
  areaAtual,
  onVoltarParaTodos,
  className = '',
  onSelectArea,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Rola suavemente até a pílula ativa quando mudar
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
  }, [filtroAtivo, areaAtual]);

  const handleSelect = (filtro: AudioaulasFiltroMenu) => {
    haptic.selection();
    if (areaAtual && onVoltarParaTodos) {
      onVoltarParaTodos();
    }
    if (onSelectFiltro) {
      onSelectFiltro(filtro);
    } else if (onSelectArea) {
      onSelectArea(null);
    }
  };

  return (
    <div className={`mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-10 mb-6 -mt-2 ${className}`}>
      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 px-0.5 select-none"
      >
        {/* Botão de retorno se estiver dentro de uma área específica */}
        {areaAtual && (
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              if (onVoltarParaTodos) onVoltarParaTodos();
              else if (onSelectArea) onSelectArea(null);
            }}
            className="flex items-center gap-1 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-primary/20 text-primary border border-primary/40 shrink-0 cursor-pointer hover:bg-primary/30 transition shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar ao Hub</span>
          </button>
        )}

        {/* Pílulas de alternância */}
        {OPCOES_FILTRO_AUDIOAULAS.map((item) => {
          const isAtivo = !areaAtual && filtroAtivo === item.id;
          const Icone = item.icone;

          return (
            <button
              key={item.id}
              type="button"
              data-active={isAtivo ? 'true' : 'false'}
              onClick={() => handleSelect(item.id)}
              className={`relative px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 border cursor-pointer select-none flex items-center gap-2 ${
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
                <Icone className={`w-3.5 h-3.5 ${isAtivo ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AudioaulasCategoriasNav;
