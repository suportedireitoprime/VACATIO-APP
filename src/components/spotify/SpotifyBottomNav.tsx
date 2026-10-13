import React from 'react';
import { Compass, Heart, Search, ListMusic, ArrowDownToLine } from 'lucide-react';
import { useSpotifyAudioStore, type SpotifyTabType } from '@/stores/useSpotifyAudioStore';

export const SpotifyBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, favoritos, downloadedTrackIds, playlists } = useSpotifyAudioStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-white/10 backdrop-blur-xl pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      role="navigation"
      aria-label="Navegação da Plataforma de Áudio"
    >
      <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto flex items-end justify-around px-2 pt-2 pb-1 relative">
        {/* 1. Explorar */}
        <button
          type="button"
          onClick={() => setActiveTab('explorar')}
          className={`flex flex-col items-center justify-end gap-1 py-1 px-2 transition-colors relative ${
            activeTab === 'explorar' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="Explorar Leis e Aulas"
        >
          <Compass
            className={`w-6 h-6 transition-transform ${
              activeTab === 'explorar' ? 'scale-110 text-emerald-400' : ''
            }`}
            strokeWidth={activeTab === 'explorar' ? 2 : 1.75}
          />
          <span className="text-[11px] font-semibold leading-tight text-center">
            Explorar
          </span>
        </button>

        {/* 2. Favoritos */}
        <button
          type="button"
          onClick={() => setActiveTab('favoritos')}
          className={`flex flex-col items-center justify-end gap-1 py-1 px-2 transition-colors relative ${
            activeTab === 'favoritos' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="Favoritos"
        >
          <div className="relative">
            <Heart
              className={`w-6 h-6 transition-transform ${
                activeTab === 'favoritos' ? 'scale-110 text-rose-500 fill-rose-500' : ''
              }`}
              strokeWidth={activeTab === 'favoritos' ? 2 : 1.75}
            />
            {favoritos.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-bold rounded-full">
                {favoritos.length}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold leading-tight text-center">
            Favoritos
          </span>
        </button>

        {/* 3. Pesquisar (FAB central projetado para fora no mesmo estilo do início do app) */}
        <button
          type="button"
          onClick={() => setActiveTab('pesquisar')}
          className="relative z-50 flex flex-col items-center justify-end gap-1.5 -mt-9 min-h-[5.5rem] min-w-[5rem] touch-manipulation select-none"
          aria-label="Pesquisar na Plataforma de Áudio"
        >
          <span
            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden bg-primary shadow-[0_8px_25px_rgba(220,38,38,0.45)] ring-2 ring-primary/40 transition-transform active:scale-95 ${
              activeTab === 'pesquisar' ? 'scale-105 ring-white' : ''
            }`}
          >
            <Search
              className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground drop-shadow-sm"
              strokeWidth={2}
            />
          </span>
          <span className="text-[11px] font-bold leading-tight text-center text-white drop-shadow-sm">
            Pesquisar
          </span>
        </button>

        {/* 4. Playlists */}
        <button
          type="button"
          onClick={() => setActiveTab('playlists')}
          className={`flex flex-col items-center justify-end gap-1 py-1 px-2 transition-colors relative ${
            activeTab === 'playlists' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="Minhas Playlists"
        >
          <div className="relative">
            <ListMusic
              className={`w-6 h-6 transition-transform ${
                activeTab === 'playlists' ? 'scale-110 text-emerald-400' : ''
              }`}
              strokeWidth={activeTab === 'playlists' ? 2 : 1.75}
            />
            {playlists.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-emerald-500 text-black text-[9px] font-bold rounded-full">
                {playlists.length}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold leading-tight text-center">
            Playlists
          </span>
        </button>

        {/* 5. Baixados / Offline */}
        <button
          type="button"
          onClick={() => setActiveTab('downloads')}
          className={`flex flex-col items-center justify-end gap-1 py-1 px-2 transition-colors relative ${
            activeTab === 'downloads' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="Áudios Baixados"
        >
          <div className="relative">
            <ArrowDownToLine
              className={`w-6 h-6 transition-transform ${
                activeTab === 'downloads' ? 'scale-110 text-sky-400' : ''
              }`}
              strokeWidth={activeTab === 'downloads' ? 2 : 1.75}
            />
            {downloadedTrackIds.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-sky-500 text-black text-[9px] font-bold rounded-full">
                {downloadedTrackIds.length}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold leading-tight text-center">
            Baixados
          </span>
        </button>
      </div>
    </nav>
  );
};
