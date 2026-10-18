import React from 'react';
import { Play, Pause, History, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';

export const SpotifyRecentTracks: React.FC = () => {
  const { historicoRecentes, currentTrack, isPlaying, playTrack, togglePlay, limparRecentes } =
    useSpotifyAudioStore();

  if (!historicoRecentes || historicoRecentes.length === 0) {
    return null;
  }

  const handleCardClick = async (track: SpotifyTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      await playTrack(track, historicoRecentes);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          <span>Tocados Recentemente</span>
        </h3>
        <button
          onClick={limparRecentes}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Limpar
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none -mx-1 px-1">
        {historicoRecentes.slice(0, 10).map((track, idx) => {
          const isThisPlaying = currentTrack?.id === track.id && isPlaying;
          const isSelected = currentTrack?.id === track.id;

          return (
            <motion.div
              key={`${track.id}-${idx}`}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCardClick(track)}
              className={`group relative flex-shrink-0 w-36 sm:w-44 aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer shadow-lg select-none ${
                isSelected
                  ? 'border-purple-500 shadow-purple-900/40 ring-2 ring-purple-500/40'
                  : 'border-white/10 hover:border-white/25 hover:shadow-xl'
              }`}
            >
              {/* Capa de fundo preenchendo 100% do card 1:1 */}
              <img
                src={track.coverUrl}
                alt={track.titulo}
                className="absolute inset-0 w-full h-full object-cover object-right group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
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
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xl">
                  {isThisPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </div>
              </div>

              {/* Badge de reproduzindo agora */}
              {isThisPlaying && (
                <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-black uppercase tracking-wider shadow-md animate-pulse">
                  Ouvindo
                </span>
              )}

              {/* Informações da Faixa dentro da Capa (sem abreviação da lei) */}
              <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex flex-col justify-end min-w-0">
                <p
                  className={`text-[13px] sm:text-[14px] font-bold leading-tight drop-shadow-md transition-colors truncate ${
                    isSelected ? 'text-purple-300' : 'text-white group-hover:text-purple-200'
                  }`}
                >
                  {track.numeroFormatado || track.artigoNumero}
                </p>
                <p
                  title={track.leiNome}
                  className="text-[11px] sm:text-[12px] text-zinc-300 font-medium leading-tight line-clamp-2 drop-shadow-sm mt-0.5"
                >
                  {track.leiNome}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
