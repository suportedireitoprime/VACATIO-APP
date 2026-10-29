import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  History,
  Play,
  Pause,
  Headphones,
  Search,
  X,
  Trash2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from '@/components/audioaulas/home/CapaOtimizada';
import ShapeGrid from '@/components/ui/ShapeGrid';
import { haptic } from '@/lib/nativeHaptics';

interface AudioRecentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorScheme?: 'purple' | 'blue';
  // Propriedades para Áudio Aulas
  aulasRecentes?: AulaAudio[];
  atualId?: string | number | null;
  tocando?: boolean;
  onTocarAula?: (aula: AulaAudio, fila?: AulaAudio[]) => void;
  onLimparRecentes?: () => void;
  onAlternarFavoritoAula?: (aula: AulaAudio) => void;
  // Propriedades para Áudio Leis
  onPlayTrack?: (track: SpotifyTrack) => void;
}

export const AudioRecentesModal: React.FC<AudioRecentesModalProps> = ({
  isOpen,
  onClose,
  colorScheme = 'blue',
  aulasRecentes = [],
  atualId,
  tocando = false,
  onTocarAula,
  onLimparRecentes,
  onAlternarFavoritoAula,
  onPlayTrack,
}) => {
  const isPurple = colorScheme === 'purple';
  const { historicoRecentes: recentesLeis, playTrack, limparRecentes: limparRecentesLeis } = useSpotifyAudioStore();
  const [busca, setBusca] = useState('');

  // Filtragem para Áudio Aulas
  const aulasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return aulasRecentes;
    return aulasRecentes.filter(
      (a) =>
        a.titulo.toLowerCase().includes(q) ||
        (a.tema && a.tema.toLowerCase().includes(q)) ||
        (a.area && a.area.toLowerCase().includes(q))
    );
  }, [aulasRecentes, busca]);

  // Filtragem para Áudio Leis
  const leisFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return recentesLeis;
    return recentesLeis.filter(
      (f) =>
        f.titulo.toLowerCase().includes(q) ||
        f.artigoNumero.toLowerCase().includes(q) ||
        f.leiNome.toLowerCase().includes(q)
    );
  }, [recentesLeis, busca]);

  if (!isOpen) return null;

  const totalRecentes = isPurple ? recentesLeis.length : aulasRecentes.length;

  const handleTocarTodas = () => {
    haptic.impactMedium();
    if (isPurple) {
      if (recentesLeis.length > 0) {
        if (onPlayTrack) onPlayTrack(recentesLeis[0]);
        else playTrack(recentesLeis[0]);
      }
    } else {
      if (aulasFiltradas.length > 0 && onTocarAula) {
        onTocarAula(aulasFiltradas[0], aulasFiltradas);
      }
    }
  };

  const handleLimpar = () => {
    haptic.medium();
    if (isPurple) {
      limparRecentesLeis();
    } else if (onLimparRecentes) {
      onLimparRecentes();
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#070b14] select-none">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-[#070b14] text-white"
        >
          {/* Fundo com ShapeGrid animado sutil */}
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            <ShapeGrid
              speed={0.4}
              squareSize={42}
              direction="diagonal"
              borderColor="rgba(255, 255, 255, 0.04)"
              hoverFillColor={isPurple ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)'}
              shape="square"
              hoverTrailAmount={5}
            />
          </div>

          {/* Topbar com Glassmorphism e Safe Area */}
          <header
            className={`relative z-20 shrink-0 px-4 sm:px-6 pb-3.5 border-b border-white/[0.08] backdrop-blur-xl shadow-lg ${
              isPurple
                ? 'bg-gradient-to-r from-purple-950/70 via-[#0a0715]/95 to-black'
                : 'bg-gradient-to-r from-blue-950/70 via-[#070d1a]/95 to-black'
            }`}
            style={{ paddingTop: 'max(0.75rem, var(--sai-top, env(safe-area-inset-top, 0px)))' }}
          >
            <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    onClose();
                  }}
                  aria-label="Voltar"
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                        isPurple ? 'bg-purple-400' : 'bg-zinc-300'
                      }`}
                    />
                    <span
                      className={`font-card text-[11px] font-bold uppercase tracking-wider ${
                        isPurple ? 'text-purple-300' : 'text-zinc-200'
                      }`}
                    >
                      {isPurple ? 'Áudio Leis' : 'Áudio Aulas'}
                    </span>
                  </div>
                  <h1 className="font-card text-lg sm:text-2xl font-extrabold text-white truncate tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                    Ouvidos Recentemente
                  </h1>
                </div>
              </div>

              {/* Ações do Topo: Tocar e Limpar */}
              <div className="flex items-center gap-2 shrink-0">
                {totalRecentes > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleTocarTodas}
                      className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg active:scale-95 transition cursor-pointer ${
                        isPurple
                          ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                          : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 shadow-md'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden sm:inline">Continuar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLimpar}
                      title="Limpar histórico recente"
                      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-red-500/20 active:scale-95 border border-white/10 hover:border-red-500/30 text-xs font-semibold text-zinc-300 hover:text-red-300 shadow-sm transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-300" />
                      <span className="hidden md:inline">Limpar</span>
                    </button>
                  </>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-zinc-300 shadow-sm backdrop-blur-md font-card">
                  <History className={`w-3.5 h-3.5 ${isPurple ? 'text-purple-400' : 'text-zinc-300'}`} />
                  <span>{totalRecentes} {totalRecentes === 1 ? 'item' : 'itens'}</span>
                </span>
              </div>
            </div>

            {/* Barra de Pesquisa */}
            {totalRecentes > 3 && (
              <div className="max-w-[1200px] mx-auto mt-3">
                <div className="relative flex items-center w-full">
                  <Search
                    className={`w-4 h-4 absolute left-3.5 pointer-events-none ${
                      isPurple ? 'text-purple-400' : 'text-zinc-300'
                    }`}
                  />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar no histórico recente..."
                    className="w-full h-11 pl-10 pr-10 py-2.5 text-sm font-card font-medium bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] border border-white/12 rounded-xl text-white placeholder-zinc-400 outline-none shadow-md backdrop-blur-md transition-all"
                  />
                  {busca && (
                    <button
                      type="button"
                      onClick={() => setBusca('')}
                      className="absolute right-3 p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </header>

          {/* Conteúdo Principal Rolável */}
          <div
            className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain"
            style={{ paddingBottom: 'calc(2.5rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
          >
            <div className="max-w-[1200px] mx-auto space-y-3">
              {/* LISTA PARA ÁUDIO AULAS */}
              {!isPurple && (
                <>
                  {aulasFiltradas.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center mb-4 text-zinc-300">
                        <History className="w-8 h-8" />
                      </div>
                      <h2 className="text-lg font-bold text-white mb-1">
                        Nenhuma aula recente
                      </h2>
                      <p className="text-sm text-zinc-400 max-w-sm">
                        As aulas que você reproduzir na plataforma aparecerão aqui para você retomar facilmente.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {aulasFiltradas.map((aula) => {
                        const isPlaying = atualId === aula.id && tocando;
                        const capa = capaDaArea(aula.area || '');

                        return (
                          <div
                            key={aula.id}
                            onClick={() => onTocarAula && onTocarAula(aula, aulasFiltradas)}
                            className="group relative flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-primary/40 transition-all cursor-pointer shadow-md"
                          >
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-sm">
                              <CapaOtimizada
                                src={capa}
                                alt={aula.titulo}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-5 h-5 text-white fill-current" />
                              </div>
                              {isPlaying && (
                                <div className="absolute inset-0 bg-primary/80 flex items-center justify-center">
                                  <Pause className="w-5 h-5 text-white fill-current" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block truncate">
                                {aula.area || 'Direito'}
                              </span>
                              <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                                {aula.titulo}
                              </h3>
                              <p className="text-xs text-zinc-400 truncate mt-0.5">
                                {aula.tema || 'Áudio Aula'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                haptic.selection();
                                if (onTocarAula) onTocarAula(aula, aulasFiltradas);
                              }}
                              className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-primary text-zinc-200 hover:text-white flex items-center justify-center transition shrink-0 active:scale-95"
                              aria-label={isPlaying ? 'Pausar aula' : 'Ouvir aula'}
                            >
                              {isPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* LISTA PARA ÁUDIO LEIS */}
              {isPurple && (
                <>
                  {leisFiltradas.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
                        <History className="w-8 h-8" />
                      </div>
                      <h2 className="text-lg font-bold text-white mb-1">
                        Nenhuma narração recente
                      </h2>
                      <p className="text-sm text-zinc-400 max-w-sm">
                        Os artigos e leis ouvidos aparecerão aqui para acesso rápido.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {leisFiltradas.map((track) => (
                        <div
                          key={track.id}
                          onClick={() => {
                            if (onPlayTrack) onPlayTrack(track);
                            else playTrack(track);
                          }}
                          className="group relative flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-purple-500/30 transition-all cursor-pointer shadow-md"
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-purple-950/40 flex items-center justify-center">
                            {track.coverUrl ? (
                              <img
                                src={track.coverUrl}
                                alt={track.titulo}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Headphones className="w-6 h-6 text-purple-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 block truncate">
                              {track.leiNome}
                            </span>
                            <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                              {track.titulo}
                            </h3>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {track.subtitulo}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="w-9 h-9 rounded-full bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white flex items-center justify-center transition shrink-0 active:scale-95"
                            aria-label="Ouvir"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default AudioRecentesModal;
