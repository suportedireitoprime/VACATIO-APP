import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Play,
  Pause,
  Headphones,
  Search,
  X,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from '@/components/audioaulas/home/CapaOtimizada';
import ShapeGrid from '@/components/ui/ShapeGrid';
import { haptic } from '@/lib/nativeHaptics';

interface AudioFavoritosModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorScheme?: 'purple' | 'blue';
  // Propriedades para Áudio Aulas
  aulasFavoritas?: AulaAudio[];
  atualId?: string | number | null;
  tocando?: boolean;
  onTocarAula?: (aula: AulaAudio, fila?: AulaAudio[]) => void;
  onAlternarFavoritoAula?: (aula: AulaAudio) => void;
  // Propriedades para Áudio Leis
  onPlayTrack?: (track: SpotifyTrack) => void;
}

export const AudioFavoritosModal: React.FC<AudioFavoritosModalProps> = ({
  isOpen,
  onClose,
  colorScheme = 'purple',
  aulasFavoritas = [],
  atualId,
  tocando = false,
  onTocarAula,
  onAlternarFavoritoAula,
  onPlayTrack,
}) => {
  const isPurple = colorScheme === 'purple';
  const { favoritos: favoritosLeis, playTrack, toggleFavorito } = useSpotifyAudioStore();
  const [busca, setBusca] = useState('');

  // Filtragem para Áudio Aulas
  const aulasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return aulasFavoritas;
    return aulasFavoritas.filter(
      (a) =>
        a.titulo.toLowerCase().includes(q) ||
        (a.tema && a.tema.toLowerCase().includes(q)) ||
        (a.area && a.area.toLowerCase().includes(q))
    );
  }, [aulasFavoritas, busca]);

  // Filtragem para Áudio Leis
  const leisFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return favoritosLeis;
    return favoritosLeis.filter(
      (f) =>
        f.titulo.toLowerCase().includes(q) ||
        f.artigoNumero.toLowerCase().includes(q) ||
        f.leiNome.toLowerCase().includes(q)
    );
  }, [favoritosLeis, busca]);

  if (!isOpen) return null;

  const totalFavoritos = isPurple ? favoritosLeis.length : aulasFavoritas.length;

  const handleTocarTodas = () => {
    haptic.impactMedium();
    if (isPurple) {
      if (favoritosLeis.length > 0) {
        if (onPlayTrack) onPlayTrack(favoritosLeis[0]);
        else playTrack(favoritosLeis[0]);
      }
    } else {
      if (aulasFiltradas.length > 0 && onTocarAula) {
        onTocarAula(aulasFiltradas[0], aulasFiltradas);
      }
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
                    Meus Favoritos
                  </h1>
                </div>
              </div>

              {/* Botão de Tocar Todas / Badge de Quantidade */}
              <div className="flex items-center gap-2 shrink-0">
                {totalFavoritos > 0 && (
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
                    <span className="hidden sm:inline">Tocar Todas</span>
                  </button>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-zinc-300 shadow-sm backdrop-blur-md font-card">
                  <Heart className={`w-3.5 h-3.5 ${isPurple ? 'text-purple-400 fill-purple-400' : 'text-rose-400 fill-rose-400'}`} />
                  <span>{totalFavoritos} {totalFavoritos === 1 ? 'item' : 'itens'}</span>
                </span>
              </div>
            </div>

            {/* Barra de Pesquisa */}
            {totalFavoritos > 3 && (
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
                    placeholder="Buscar nos seus favoritos..."
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
                    <div className="py-20 px-4 flex flex-col items-center text-center font-card max-w-md mx-auto">
                      <div className="w-16 h-16 rounded-3xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-300 mb-4 shadow-xl">
                        <Heart className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1.5">
                        {busca ? 'Nenhuma aula encontrada' : 'Nenhuma aula favoritada'}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                        {busca
                          ? `Nenhum resultado para "${busca}".`
                          : 'Toque no ícone de coração nas áudio aulas para salvá-las aqui e ouvir quando quiser.'}
                      </p>
                    </div>
                  ) : (
                    aulasFiltradas.map((aula, idx) => {
                      const isThisPlaying = atualId === aula.id && tocando;
                      const capa = capaDaArea(aula.area || '');

                      return (
                        <div
                          key={`${aula.id}-${idx}`}
                          onClick={() => onTocarAula && onTocarAula(aula, aulasFiltradas)}
                          className={`w-full group flex items-center justify-between gap-3.5 p-3 sm:p-4 rounded-2xl border transition-all duration-200 text-left cursor-pointer backdrop-blur-md shadow-md ${
                            isThisPlaying
                              ? 'bg-blue-950/40 border-blue-500/50 shadow-blue-900/30 ring-1 ring-blue-500/30'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-primary/40'
                          }`}
                        >
                          {/* Miniatura da Capa 4:5 */}
                          <div className="relative w-14 sm:w-16 aspect-[4/5] rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md bg-zinc-950">
                            <CapaOtimizada
                              src={capa}
                              alt={aula.titulo}
                              animacaoEntrada={false}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-[1.03] contrast-[1.02]"
                            />
                            {isThisPlaying && (
                              <div className="absolute inset-0 bg-primary/80 backdrop-blur-[2px] flex items-center justify-center">
                                <Volume2 className="w-5 h-5 text-white animate-pulse" />
                              </div>
                            )}
                          </div>

                          {/* Informações da Aula */}
                          <div className="min-w-0 flex-1">
                            <p className="font-card font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                              {aula.titulo}
                            </p>
                            <p className="font-card text-xs text-zinc-400 mt-1 line-clamp-1">
                              {aula.tema || aula.area}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="font-card text-[10px] font-bold text-zinc-300 bg-zinc-800/60 border border-zinc-700/60 px-2 py-0.5 rounded-md">
                                {aula.area}
                              </span>
                            </div>
                          </div>

                          {/* Ações: Play e Desfavoritar */}
                          <div className="flex items-center gap-2 shrink-0">
                            {onAlternarFavoritoAula && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  haptic.light();
                                  onAlternarFavoritoAula(aula);
                                }}
                                aria-label="Remover dos favoritos"
                                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-rose-400 hover:text-white transition active:scale-90"
                              >
                                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onTocarAula) onTocarAula(aula, aulasFiltradas);
                              }}
                              aria-label={isThisPlaying ? 'Pausar' : 'Tocar'}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition ${
                                isThisPlaying ? 'bg-primary' : 'bg-white/10 group-hover:bg-primary'
                              }`}
                            >
                              {isThisPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* LISTA PARA ÁUDIO LEIS */}
              {isPurple && (
                <>
                  {leisFiltradas.length === 0 ? (
                    <div className="py-20 px-4 flex flex-col items-center text-center font-card max-w-md mx-auto">
                      <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
                        <Heart className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1.5">
                        {busca ? 'Nenhum artigo encontrado' : 'Nenhum artigo favoritado'}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                        {busca
                          ? `Nenhum resultado para "${busca}".`
                          : 'Toque no ícone de coração nos artigos narrados para salvá-los aqui e montar sua biblioteca de revisão.'}
                      </p>
                    </div>
                  ) : (
                    leisFiltradas.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (onPlayTrack) onPlayTrack(item);
                          else playTrack(item);
                        }}
                        className="w-full group flex items-center justify-between gap-3.5 p-3 sm:p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 transition-all duration-200 text-left cursor-pointer backdrop-blur-md shadow-md"
                      >
                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs shrink-0">
                          {item.artigoNumero}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-card font-bold text-sm sm:text-base text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                            {item.titulo}
                          </p>
                          <p className="font-card text-xs text-zinc-400 mt-0.5 line-clamp-1">
                            {item.subtitulo || item.leiNome}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic.light();
                              toggleFavorito(item);
                            }}
                            aria-label="Remover dos favoritos"
                            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-purple-400 hover:text-white transition active:scale-90"
                          >
                            <Heart className="w-4 h-4 fill-purple-500 text-purple-500" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onPlayTrack) onPlayTrack(item);
                              else playTrack(item);
                            }}
                            aria-label="Tocar artigo"
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 group-hover:bg-purple-600 flex items-center justify-center text-white shadow-md active:scale-95 transition"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </button>
                        </div>
                      </div>
                    ))
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

export default AudioFavoritosModal;
