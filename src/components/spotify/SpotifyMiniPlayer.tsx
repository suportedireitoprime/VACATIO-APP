import React from 'react';
import { Play, Pause, SkipForward, Heart, X, Headphones } from 'lucide-react';
import { useSpotifyAudioStore } from '@/stores/useSpotifyAudioStore';

export const SpotifyMiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    toggleFavorito,
    isFavorito,
    setExpanded,
    closePlayer,
  } = useSpotifyAudioStore();

  const [navHeight, setNavHeight] = React.useState(0);

  React.useEffect(() => {
    const medir = () => {
      const nav = document.querySelector<HTMLElement>('[data-bottom-nav]');
      setNavHeight(nav ? nav.getBoundingClientRect().height : 0);
    };
    medir();
    window.addEventListener('resize', medir);
    const t = window.setTimeout(medir, 300);
    return () => {
      window.removeEventListener('resize', medir);
      window.clearTimeout(t);
    };
  }, []);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isFav = isFavorito(currentTrack.id);

  return (
    <div
      className="fixed left-0 right-0 z-[80] px-3 max-w-md mx-auto sm:max-w-xl md:max-w-2xl transition-all duration-300"
      style={{
        bottom: navHeight
          ? `${navHeight + 18}px`
          : `calc(6.5rem + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div
        onClick={() => setExpanded(true)}
        className="relative overflow-hidden rounded-2xl bg-zinc-900/95 border border-white/10 backdrop-blur-xl shadow-2xl p-2.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-all hover:bg-zinc-800/90 hover:border-white/20 active:scale-[0.99]"
      >
        {/* Barra de Progresso no topo do Mini-Player */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-150"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        {/* Capa e Informações da Faixa */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-zinc-800 border border-white/10 shadow-md">
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.leiNome}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                <Headphones className="w-5 h-5" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="flex items-end gap-[2px] h-3">
                  <span className="w-0.5 h-3 bg-emerald-400 animate-pulse" />
                  <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-75" />
                  <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-150" />
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate leading-tight">
              {currentTrack.titulo}
            </p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">
              {currentTrack.leiNome} &bull; {currentTrack.tipo === 'aula' ? 'Áudio-Aula' : 'Narração Oficial'}
            </p>
          </div>
        </div>

        {/* Controles Rápidos */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Favoritar */}
          <button
            type="button"
            onClick={() => toggleFavorito(currentTrack)}
            aria-label="Favoritar"
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                isFav ? 'text-rose-500 fill-rose-500' : 'text-zinc-400'
              }`}
            />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black" />
            ) : (
              <Play className="w-4 h-4 fill-black ml-0.5" />
            )}
          </button>

          {/* Próximo */}
          <button
            type="button"
            onClick={nextTrack}
            aria-label="Próximo Artigo"
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Botão de Fechar e Encerrar Áudio */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closePlayer();
            }}
            aria-label="Encerrar áudio"
            title="Encerrar áudio"
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
