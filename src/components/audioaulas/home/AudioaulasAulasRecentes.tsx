import React from 'react';
import { Play, Pause, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from './CapaOtimizada';

interface AudioaulasAulasRecentesProps {
  recentes: AulaAudio[];
  atualId: number | null;
  tocando: boolean;
  onTocarAula: (a: AulaAudio) => void;
  onLimpar: () => void;
}

export const AudioaulasAulasRecentes: React.FC<AudioaulasAulasRecentesProps> = React.memo(
  function AudioaulasAulasRecentes({
    recentes,
    atualId,
    tocando,
    onTocarAula,
    onLimpar,
  }) {
    if (!recentes || recentes.length === 0) {
      return null;
    }

    return (
      <section className="mx-auto w-full max-w-[1400px] px-4 mt-2 mb-6 lg:px-10 2xl:max-w-[1600px] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-title text-base sm:text-lg font-bold text-white flex items-center gap-2 tracking-tight">
            <History className="w-4 h-4 text-blue-400" />
            <span>Últimas Aulas Ouvidas</span>
          </h3>
          <button
            onClick={onLimpar}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Limpar
          </button>
        </div>

        <div className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0">
          {recentes.slice(0, 10).map((aula, idx) => {
            const isThisPlaying = atualId === aula.id && tocando;
            const isSelected = atualId === aula.id;
            const capa = capaDaArea(aula.area || '');

            return (
              <motion.div
                key={`${aula.id}-${idx}`}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onTocarAula(aula)}
                className={`group relative flex-shrink-0 w-[152px] sm:w-44 aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer shadow-lg select-none snap-start ${
                  isSelected
                    ? 'border-blue-500 shadow-blue-900/40 ring-2 ring-blue-500/40'
                    : 'border-white/10 hover:border-white/25 hover:shadow-xl'
                }`}
              >
                {/* Capa de fundo preenchendo 100% do card 1:1 */}
                <CapaOtimizada
                  src={capa}
                  alt={aula.titulo}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />

                {/* Degradê escuro sobre a imagem para contraste perfeito */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/15 pointer-events-none" />

                {/* Botão Play Flutuante */}
                <div
                  className={`absolute top-2.5 right-2.5 z-10 transition-all duration-200 ${
                    isThisPlaying
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                  }`}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl">
                    {isThisPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Badge de reproduzindo agora */}
                {isThisPlaying && (
                  <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-md animate-pulse">
                    Ouvindo
                  </span>
                )}

                {/* Informações da Aula dentro da Capa no rodapé com sombra */}
                <div className="absolute inset-x-0 bottom-0 p-3 pt-6 z-10 flex flex-col justify-end min-w-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent">
                  <p
                    title={aula.titulo}
                    className={`text-[12px] sm:text-[13px] font-bold leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-colors line-clamp-2 min-h-[2.4em] flex items-end ${
                      isSelected ? 'text-sky-300' : 'text-white group-hover:text-sky-200'
                    }`}
                  >
                    {aula.titulo}
                  </p>
                  <p
                    title={aula.tema || aula.area}
                    className="text-[10px] sm:text-[11px] text-zinc-300 font-medium leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] mt-1"
                  >
                    {aula.tema || aula.area}
                  </p>
                </div>
              </motion.div>
            );
          })}
          {/* Espaçador final para respiro no scroll horizontal */}
          <div className="w-1 sm:w-2 shrink-0 pointer-events-none" aria-hidden="true" />
        </div>
      </section>
    );
  }
);
