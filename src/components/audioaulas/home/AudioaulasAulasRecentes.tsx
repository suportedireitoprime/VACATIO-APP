import React from 'react';
import { Play, Pause, History, Sparkles } from 'lucide-react';
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
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <span>Últimas Aulas Ouvidas</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Continuar
            </span>
          </h3>
          <button
            onClick={onLimpar}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Limpar
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none -mx-1 px-1">
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
                className={`group relative flex-shrink-0 w-36 sm:w-40 rounded-2xl p-2.5 border transition-all cursor-pointer backdrop-blur-md select-none ${
                  isSelected
                    ? 'bg-primary/15 border-primary/40 shadow-lg shadow-primary/20'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Capa com overlay e botão Play */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 bg-zinc-900 border border-white/10 shadow-md">
                  <CapaOtimizada
                    src={capa}
                    alt={aula.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                  {/* Botão Play Flutuante */}
                  <div
                    className={`absolute bottom-2 right-2 transition-all duration-200 ${
                      isThisPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl">
                      {isThisPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </div>
                  </div>

                  {/* Badge de reproduzindo agora */}
                  {isThisPlaying && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider shadow-md animate-pulse">
                      Ouvindo
                    </span>
                  )}
                </div>

                {/* Informações da Aula */}
                <div className="space-y-0.5 min-w-0">
                  <p
                    className={`text-xs font-bold truncate leading-tight transition-colors ${
                      isSelected ? 'text-primary' : 'text-white group-hover:text-primary'
                    }`}
                  >
                    {aula.titulo}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {aula.tema || aula.area}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    );
  }
);
