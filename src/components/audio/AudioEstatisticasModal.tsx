import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Flame,
  Headphones,
  Zap,
  Award,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { getAudioStats, type TrackPlayStat } from '@/services/audioStatsService';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import ShapeGrid from '@/components/ui/ShapeGrid';
import { haptic } from '@/lib/nativeHaptics';

interface AudioEstatisticasModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorScheme?: 'purple' | 'blue';
  onPlayTrack?: (track: SpotifyTrack) => void;
}

export const AudioEstatisticasModal: React.FC<AudioEstatisticasModalProps> = ({
  isOpen,
  onClose,
  colorScheme = 'purple',
  onPlayTrack,
}) => {
  const isPurple = colorScheme === 'purple';
  const { playTrack } = useSpotifyAudioStore();

  const [stats, setStats] = useState(() => getAudioStats());

  useEffect(() => {
    if (isOpen) {
      setStats(getAudioStats());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalMinutos = Math.max(1, Math.round(stats.totalSegundos / 60));
  const totalHoras = (totalMinutos / 60).toFixed(1);

  // Top tracks ordenados por tempo ou repetições
  const topTracks: TrackPlayStat[] = Object.values(stats.tracksStats || {})
    .sort((a, b) => b.totalSegundos - a.totalSegundos || b.reproducoes - a.reproducoes)
    .slice(0, 6);

  const metaProgresso = Math.min(100, Math.round((stats.minutosHoje / stats.metaDiariaMinutos) * 100));

  const handleTocarItem = (item: TrackPlayStat) => {
    haptic.light();
    const trackMock: SpotifyTrack = {
      id: item.id,
      tipo: 'lei',
      leiId: item.leiSlug,
      leiSlug: item.leiSlug,
      leiNome: item.leiNome,
      artigoNumero: item.artigoNumero || item.titulo,
      numeroFormatado: item.artigoNumero || item.titulo,
      titulo: item.titulo,
      subtitulo: `${item.leiNome} • Narração Oficial`,
      texto: item.titulo,
      audioUrl: '',
      coverUrl: '',
      ordem: 1,
    };

    if (onPlayTrack) {
      onPlayTrack(trackMock);
    } else {
      playTrack(trackMock);
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#070b14] select-none text-white">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-[#070b14]"
        >
          {/* Fundo com ShapeGrid animado */}
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
                    haptic.selection();
                    onClose();
                  }}
                  aria-label="Voltar"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 flex items-center justify-center text-white transition shrink-0 shadow-md backdrop-blur-md cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.4} />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                        isPurple ? 'bg-purple-400' : 'bg-blue-400'
                      }`}
                    />
                    <span
                      className={`font-card text-[11px] font-bold uppercase tracking-wider ${
                        isPurple ? 'text-purple-300' : 'text-blue-300'
                      }`}
                    >
                      Métricas & Desempenho
                    </span>
                  </div>
                  <h1 className="font-card text-lg sm:text-2xl font-extrabold text-white truncate tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                    Estatísticas de Estudo
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-zinc-300 shadow-sm backdrop-blur-md font-card">
                  <BarChart3 className={`w-3.5 h-3.5 ${isPurple ? 'text-purple-400' : 'text-sky-400'}`} />
                  <span>{totalHoras}h dedicadas</span>
                </span>
              </div>
            </div>
          </header>

          {/* Conteúdo Principal Rolável */}
          <div
            className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain"
            style={{ paddingBottom: 'calc(2.5rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
          >
            <div className="max-w-[1200px] mx-auto space-y-4">
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {/* Tempo Total */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between backdrop-blur-md">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tempo Total</span>
                    <Clock className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-white">{totalHoras}h</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{totalMinutos} min ouvidos</div>
                  </div>
                </div>

                {/* Meta Diária */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between backdrop-blur-md">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Meta Hoje</span>
                    <Target className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-white">
                      {stats.minutosHoje}
                      <span className="text-xs font-medium text-zinc-400">/{stats.metaDiariaMinutos}m</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${metaProgresso}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sequência (Streak) */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between backdrop-blur-md">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Ofensiva</span>
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-orange-400 flex items-center gap-1">
                      {stats.diasConsecutivos} <span className="text-sm font-bold text-white">dias</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Constância diária</div>
                  </div>
                </div>

                {/* Artigos Concluídos */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between backdrop-blur-md">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Fixados</span>
                    <Headphones className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-white">{stats.artigosOuvidosCount}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Áudios reproduzidos</div>
                  </div>
                </div>
              </div>

              {/* Top Conteúdos Mais Ouvidos */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Mais Ouvidos por Você</span>
                  </h3>
                  <span className="text-xs text-zinc-500 font-medium">Repetições</span>
                </div>

                {topTracks.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    Suas faixas mais ouvidas aparecerão aqui conforme você avança nos estudos.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topTracks.map((item, idx) => {
                      const minutosItem = Math.max(1, Math.round(item.totalSegundos / 60));
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleTocarItem(item)}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 text-center text-xs font-bold text-zinc-500 group-hover:text-white">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-purple-300 transition">
                                {item.titulo}
                              </h4>
                              <p className="text-[11px] text-zinc-400 truncate">
                                {item.leiNome} • {item.reproducoes}x reproduzido
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-zinc-400">{minutosItem} min</span>
                            <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-purple-600 flex items-center justify-center text-white transition">
                              <Play className="w-3 h-3 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Conquistas de Áudio */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Marcos & Conquistas
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 backdrop-blur-md">
                    <span className="text-2xl">🥇</span>
                    <div>
                      <div className="text-xs font-bold text-white">Primeira Hora</div>
                      <div className="text-[10px] text-amber-300 font-medium">Concluído (+50 XP)</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2.5 backdrop-blur-md">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <div className="text-xs font-bold text-white">Velocista</div>
                      <div className="text-[10px] text-purple-300 font-medium">Ouvinte a 1.5x</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 col-span-2 sm:col-span-1 backdrop-blur-md">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <div className="text-xs font-bold text-white">Foco Total</div>
                      <div className="text-[10px] text-emerald-300 font-medium">Meta diária batida</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default AudioEstatisticasModal;
