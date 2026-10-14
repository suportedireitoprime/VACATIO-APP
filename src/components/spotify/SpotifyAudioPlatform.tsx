import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpotifyAudioStore } from '@/stores/useSpotifyAudioStore';
import { AudioLeisCategoriasNav, type LeiCategoryFilter } from './AudioLeisCategoriasNav';
import { AudioAppBottomNav } from '@/components/audio/AudioAppBottomNav';
import { SpotifyMiniPlayer } from './SpotifyMiniPlayer';
import { SpotifyExpandedPlayer } from './SpotifyExpandedPlayer';
import { SpotifyExplorarTab } from './SpotifyExplorarTab';
import { SpotifyPesquisarTab } from './SpotifyPesquisarTab';
import { SpotifyPlaylistsTab } from './SpotifyPlaylistsTab';
import { SpotifyFavoritosTab } from './SpotifyFavoritosTab';
import { SpotifyDownloadsTab } from './SpotifyDownloadsTab';
import { SpotifyLeiAlbumView } from './SpotifyLeiAlbumView';
import { AudioLeisHero } from './AudioLeisHero';
import { fetchLeisDisponiveisComAudio } from '@/services/narracaoArtigosSyncService';
import { AudioNavigationSwitcher } from '@/components/audio/AudioNavigationSwitcher';
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
    setActiveTab,
    audioMode,
    setAudioMode,
    setSelectedLeiId,
    _setAudioElement,
    _setCurrentTime,
    _setDuration,
    _setIsPlaying,
    _handleTrackEnded,
    refreshDownloadedList,
    favoritos,
    playlists,
    downloadedTrackIds,
    isExpanded,
  } = useSpotifyAudioStore();

  const [activeCategory, setActiveCategory] = React.useState<LeiCategoryFilter>('todos');

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

  const [totalStats, setTotalStats] = React.useState({ totalAudios: 923, totalLeis: 2 });
  React.useEffect(() => {
    let active = true;
    fetchLeisDisponiveisComAudio('leis')
      .then((leis) => {
        if (active && Array.isArray(leis) && leis.length > 0) {
          const sumAudios = leis.reduce((acc, l) => acc + (l?.totalComAudio || 0), 0);
          setTotalStats({ totalAudios: sumAudios, totalLeis: leis.length });
        }
      })
      .catch((err) => {
        console.warn('[SpotifyAudioPlatform] Aviso ao carregar métricas:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectLei = (lei: { id: string; nome: string; slug: string; categoria?: string }) => {
    setSelectedLeiData(lei);
    setSelectedLeiId(lei.id);
  };

  const handleBackFromAlbum = () => {
    setSelectedLeiData(null);
    setSelectedLeiId(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-foreground pb-40 relative select-none overflow-hidden">
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
        {/* Se uma lei específica estiver aberta em modo álbum — Abre de baixo para cima igual MapasOverlay */}
        <AnimatePresence>
          {selectedLeiData && (
            <motion.div
              key="lei-album-sheet"
              initial={{ y: '100%', opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 1 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden"
            >
              <SpotifyLeiAlbumView
                leiId={selectedLeiData.id}
                leiNome={selectedLeiData.nome}
                leiSlug={selectedLeiData.slug}
                categoria={selectedLeiData.categoria}
                onBack={handleBackFromAlbum}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedLeiData && (
          <>
            {/* Hero Idêntico a Áudio Aulas com Fita Cassete Animada */}
            <AudioLeisHero
              totalAudios={totalStats.totalAudios}
              totalLeis={totalStats.totalLeis}
            />

            {/* Conteúdo Principal de Acordo com a Aba do Menu */}
            <main className="max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-40">
              {/* Menu Superior: Rolagem infinita (Todos, Constituição, Códigos...) */}
              {activeTab === 'explorar' && (
                <AudioLeisCategoriasNav
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                />
              )}

              {activeTab === 'explorar' && (
                <SpotifyExplorarTab
                  onSelectLei={handleSelectLei}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                />
              )}
              {activeTab === 'pesquisar' && <SpotifyPesquisarTab onSelectLei={handleSelectLei} />}
              {activeTab === 'playlists' && <SpotifyPlaylistsTab />}
              {activeTab === 'favoritos' && <SpotifyFavoritosTab />}
              {activeTab === 'downloads' && <SpotifyDownloadsTab />}
            </main>
          </>
        )}
      </div>

      {/* Menu de Rodapé Idêntico ao Início do App */}
      <AudioAppBottomNav
        ativo={
          activeTab === 'favoritos'
            ? 'favoritos'
            : activeTab === 'playlists'
            ? 'playlists'
            : activeTab === 'pesquisar'
            ? 'pesquisar'
            : activeTab === 'downloads'
            ? 'baixados'
            : 'explorar'
        }
        onSelect={(tab) => {
          if (selectedLeiData) handleBackFromAlbum();
          if (tab === 'favoritos') {
            setActiveTab('favoritos');
          } else if (tab === 'playlists') {
            setActiveTab('playlists');
          } else if (tab === 'pesquisar') {
            setActiveTab('pesquisar');
          } else if (tab === 'baixados') {
            setActiveTab('downloads');
          } else {
            setActiveTab('explorar');
          }
        }}
        totalFavoritas={favoritos.length}
        totalPlaylists={playlists.length}
        totalBaixadas={downloadedTrackIds.length}
        hidden={isExpanded || !!selectedLeiData}
      />

      {/* Mini-Player Fixo Flutuante */}
      <SpotifyMiniPlayer />

      {/* Player Expandido em Tela Cheia */}
      <SpotifyExpandedPlayer />
    </div>
  );
};
