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
          <History className="w-4 h-4 text-primary" />
          <span>Tocados Recentemente</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Rápido
          </span>
        </h3>
        <button
          onClick={limparRecentes}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
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
              className={`group relative flex-shrink-0 w-36 sm:w-40 rounded-2xl p-2.5 border transition-all cursor-pointer backdrop-blur-md ${
                isSelected
                  ? 'bg-primary/15 border-primary/40 shadow-lg shadow-primary/20'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/20'
              }`}
            >
              {/* Capa com overlay e botão Play */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 bg-zinc-900 border border-white/10 shadow-md">
                <img
                  src={track.coverUrl}
                  alt={track.titulo}
                  className="w-full h-full object-cover object-right group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

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

              {/* Informações da Faixa */}
              <div className="space-y-0.5 min-w-0">
                <p
                  className={`text-xs font-bold truncate leading-tight transition-colors ${
                    isSelected ? 'text-primary' : 'text-white group-hover:text-primary'
                  }`}
                >
                  {track.numeroFormatado || track.artigoNumero}
                </p>
                <p className="text-[10px] text-zinc-400 truncate font-medium">
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
