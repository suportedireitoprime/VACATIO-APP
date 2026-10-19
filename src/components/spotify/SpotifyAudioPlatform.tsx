import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search } from 'lucide-react';
import { useSpotifyAudioStore } from '@/stores/useSpotifyAudioStore';
import { AudioLeisCategoriasNav, type LeiCategoryFilter } from './AudioLeisCategoriasNav';
import { AudioAppBottomNav } from '@/components/audio/AudioAppBottomNav';
import { haptic } from '@/lib/nativeHaptics';
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
    totalArtigos?: number;
    totalComAudio?: number;
  } | null>(null);

  const [totalStats, setTotalStats] = React.useState({ totalAudios: 9684, totalLeis: 31 });
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

  const handleSelectLei = (lei: {
    id: string;
    nome: string;
    slug: string;
    categoria?: string;
    totalArtigos?: number;
    totalComAudio?: number;
  }) => {
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
        {/* Se uma lei específica estiver aberta em modo álbum — Abertura instantânea (0ms) */}
        {selectedLeiData && (
            <div
              className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden"
            >
              <SpotifyLeiAlbumView
                leiId={selectedLeiData.id}
                leiNome={selectedLeiData.nome}
                leiSlug={selectedLeiData.slug}
                categoria={selectedLeiData.categoria}
                totalArtigosInitial={selectedLeiData.totalArtigos}
                totalAudiosInitial={selectedLeiData.totalComAudio}
                onBack={handleBackFromAlbum}
              />
            </div>
        )}

        {!selectedLeiData && (
          activeTab === 'pesquisar' ? (
            /* ───────── TELA DEDICADA DE BUSCA DE ÁUDIO LEIS ───────── */
            <main
              className="max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10"
              style={{
                paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 0.875rem)',
                paddingBottom: 'calc(11rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))',
              }}
            >
              {/* Cabeçalho da Busca com Botão Voltar Padronizado */}
              <div className="flex items-center gap-3.5 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setActiveTab('explorar');
                  }}
                  aria-label="Voltar para explorar áudio leis"
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
                </button>

                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Search className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                    <span>Pesquisar Áudio Leis</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 truncate">
                    Códigos, estatutos, súmulas e artigos narrados
                  </p>
                </div>
              </div>

              <SpotifyPesquisarTab onSelectLei={handleSelectLei} />
            </main>
          ) : (
            <>
              {/* Hero Idêntico a Áudio Aulas com Fita Cassete Animada */}
              <AudioLeisHero
                totalAudios={totalStats.totalAudios}
                totalLeis={totalStats.totalLeis}
                onBuscar={() => setActiveTab('pesquisar')}
              />

              {/* Conteúdo Principal de Acordo com a Aba do Menu */}
              <main
                className="max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10"
                style={{
                  paddingBottom: 'calc(11rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))',
                }}
              >
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
                {activeTab === 'playlists' && <SpotifyPlaylistsTab />}
                {activeTab === 'favoritos' && <SpotifyFavoritosTab />}
                {activeTab === 'downloads' && <SpotifyDownloadsTab />}
              </main>
            </>
          )
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
        colorScheme="purple"
      />

      {/* Mini-Player Fixo Flutuante */}
      <SpotifyMiniPlayer />

      {/* Player Expandido em Tela Cheia */}
      <SpotifyExpandedPlayer />
    </div>
  );
};
