import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
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
import ShapeGrid from '@/components/ui/ShapeGrid';

interface SpotifyAudioPlatformProps {
  initialMode?: 'leis' | 'aulas';
  title?: string;
}

export const SpotifyAudioPlatform: React.FC<SpotifyAudioPlatformProps> = ({
  initialMode = 'leis',
}) => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    activeTab,
    audioMode,
    setAudioMode,
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
    <div className="min-h-screen bg-zinc-950 text-foreground pb-36 relative select-none overflow-hidden">
      {/* Textura Geométrica Dinâmica idêntica ao Áudio Aulas */}
      <div className="absolute inset-0 z-0 opacity-60 pointer-events-none">
        <ShapeGrid
          speed={0.5}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(255, 255, 255, 0.05)"
          hoverFillColor="rgba(255, 255, 255, 0.1)"
          shape="square"
          hoverTrailAmount={5}
        />
      </div>

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

      <div className="relative z-10">
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
            {/* Cabeçalho no Padrão Oficial do VACATIO */}
            <PageHeader
              title="Áudio Leis"
              subtitle="Narrações oficiais dos artigos da legislação compilada"
              onBack={() => navigate('/')}
              variant="dark"
              rightAction={
                <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 shrink-0 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setAudioMode('leis')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      audioMode === 'leis'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Áudio Leis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/audioaulas')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-zinc-400 hover:text-white"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Áudio Aulas</span>
                  </button>
                </div>
              }
            />

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
      </div>

      {/* Mini-Player Fixo Acima do Rodapé */}
      <SpotifyMiniPlayer />

      {/* Menu de Rodapé Estilo Spotify */}
      <SpotifyBottomNav />

      {/* Player Expandido em Tela Cheia */}
      <SpotifyExpandedPlayer />
    </div>
  );
};
