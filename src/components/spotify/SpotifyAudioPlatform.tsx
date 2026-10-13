import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Volume2, GraduationCap, Headphones } from 'lucide-react';
import { useSpotifyAudioStore } from '@/stores/useSpotifyAudioStore';
import { SpotifyBottomNav } from './SpotifyBottomNav';
import { SpotifyMiniPlayer } from './SpotifyMiniPlayer';
import { SpotifyExpandedPlayer } from './SpotifyExpandedPlayer';
import { SpotifyExplorarTab } from './SpotifyExplorarTab';
import { SpotifyPesquisarTab } from './SpotifyPesquisarTab';
import { SpotifyPlaylistsTab } from './SpotifyPlaylistsTab';
import { SpotifyFavoritosTab } from './SpotifyFavoritosTab';
import { SpotifyDownloadsTab } from './SpotifyDownloadsTab';
import { SpotifyLeiAlbumView } from './SpotifyLeiAlbumView';

interface SpotifyAudioPlatformProps {
  initialMode?: 'leis' | 'aulas';
  title?: string;
}

export const SpotifyAudioPlatform: React.FC<SpotifyAudioPlatformProps> = ({
  initialMode = 'leis',
  title,
}) => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    activeTab,
    audioMode,
    setAudioMode,
    selectedLeiId,
    setSelectedLeiId,
    _setAudioElement,
    _setCurrentTime,
    _setDuration,
    _setIsPlaying,
    _handleTrackEnded,
    refreshDownloadedList,
  } = useSpotifyAudioStore();

  // Define modo inicial de acordo com a rota
  useEffect(() => {
    if (initialMode) {
      setAudioMode(initialMode);
    }
    refreshDownloadedList();
  }, [initialMode, setAudioMode, refreshDownloadedList]);

  // Vincula elemento de áudio real ao store
  useEffect(() => {
    if (audioRef.current) {
      _setAudioElement(audioRef.current);
    }
    return () => {
      _setAudioElement(null);
    };
  }, [_setAudioElement]);

  const [selectedLeiData, setSelectedLeiData] = React.useState<{
    id: string;
    nome: string;
    slug: string;
    categoria?: string;
  } | null>(null);

  const handleSelectLei = (lei: { id: string; nome: string; slug: string; categoria?: string }) => {
    setSelectedLeiData(lei);
    setSelectedLeiId(lei.id);
  };

  const handleBackFromAlbum = () => {
    setSelectedLeiData(null);
    setSelectedLeiId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-36 relative select-none">
      {/* Elemento de Áudio Invisível Gerenciado pelo Store */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) _setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) _setDuration(audioRef.current.duration);
        }}
        onEnded={_handleTrackEnded}
        onPlay={() => _setIsPlaying(true)}
        onPause={() => _setIsPlaying(false)}
        onError={(e) => {
          console.warn('[SpotifyAudioPlatform] Erro no stream de áudio:', e);
          _setIsPlaying(false);
        }}
      />

      {/* Se uma lei específica estiver aberta em modo álbum */}
      {selectedLeiData ? (
        <SpotifyLeiAlbumView
          leiId={selectedLeiData.id}
          leiNome={selectedLeiData.nome}
          leiSlug={selectedLeiData.slug}
          categoria={selectedLeiData.categoria}
          onBack={handleBackFromAlbum}
        />
      ) : (
        <>
          {/* Header Superior com Botão de Voltar e Alternador de Modo */}
          <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              {/* Botão Voltar para o Início */}
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white transition-colors p-1.5 -ml-2 rounded-xl hover:bg-white/5"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Início</span>
              </button>

              {/* Seletor de Modo Central: Áudio Leis x Áudio Aulas */}
              <div className="flex items-center p-1 rounded-2xl bg-zinc-900 border border-white/10">
                <button
                  type="button"
                  onClick={() => setAudioMode('leis')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    audioMode === 'leis'
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Áudio Leis
                </button>

                <button
                  type="button"
                  onClick={() => setAudioMode('aulas')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    audioMode === 'aulas'
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Áudio Aulas
                </button>
              </div>

              {/* Título de Referência ou Espaço */}
              <div className="w-8 flex justify-end">
                <Headphones className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </header>

          {/* Conteúdo Principal de Acordo com a Aba do Rodapé */}
          <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5">
            {activeTab === 'explorar' && <SpotifyExplorarTab onSelectLei={handleSelectLei} />}
            {activeTab === 'pesquisar' && <SpotifyPesquisarTab onSelectLei={handleSelectLei} />}
            {activeTab === 'playlists' && <SpotifyPlaylistsTab />}
            {activeTab === 'favoritos' && <SpotifyFavoritosTab />}
            {activeTab === 'downloads' && <SpotifyDownloadsTab />}
          </main>
        </>
      )}

      {/* Mini-Player Fixo Acima do Rodapé */}
      <SpotifyMiniPlayer />

      {/* Menu de Rodapé Estilo Spotify */}
      <SpotifyBottomNav />

      {/* Player Expandido em Tela Cheia */}
      <SpotifyExpandedPlayer />
    </div>
  );
};
