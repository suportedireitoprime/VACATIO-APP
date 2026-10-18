import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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
} from 'lucide-react';
import { getAudioStats, type TrackPlayStat } from '@/services/audioStatsService';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
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
      tipo: item.tipo,
      leiId: item.id.split('::')[0] || 'cf',
      leiSlug: item.id.split('::')[0] || 'constituicao-federal',
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop escuro com blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Painel Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10"
        >
          {/* Header com degradê luxuoso no tema */}
          <div
            className={`p-5 sm:p-6 pb-4 border-b border-white/10 relative overflow-hidden ${
              isPurple
                ? 'bg-gradient-to-r from-purple-950/70 via-zinc-900 to-black'
                : 'bg-gradient-to-r from-blue-950/70 via-zinc-900 to-black'
            }`}
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg ${
                    isPurple
                      ? 'bg-purple-600/20 border-purple-500/40 text-purple-400'
                      : 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                  }`}
                >
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Estatísticas de Estudo
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium">
                    Seu ritmo de fixação e tempo dedicado à legislação em áudio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conteúdo Rolável */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-none">
            {/* Cards Grandes de Métricas Principais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Tempo Total */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Tempo Total</span>
                  <Clock className={`w-4 h-4 ${isPurple ? 'text-purple-400' : 'text-blue-400'}`} />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                    {totalMinutos} <span className="text-xs font-semibold text-zinc-400">min</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">≈ {totalHoras}h ouvidas</div>
                </div>
              </div>

              {/* Streak / Dias Seguidos */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Sequência</span>
                  <Flame className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                    {stats.diasConsecutivos} <span className="text-xs font-semibold text-zinc-400">dias</span>
                  </div>
                  <div className="text-[11px] text-orange-400 font-semibold mt-0.5">🔥 Ritmo ativo!</div>
                </div>
              </div>

              {/* Minutos Hoje */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Hoje</span>
                  <Target className={`w-4 h-4 ${isPurple ? 'text-purple-400' : 'text-blue-400'}`} />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                    {stats.minutosHoje} <span className="text-xs font-semibold text-zinc-400">min</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Meta: {stats.metaDiariaMinutos} min</div>
                </div>
              </div>

              {/* Economia com Velocidade */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Economia</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                    {Math.round(totalMinutos * 0.35)} <span className="text-xs font-semibold text-zinc-400">min</span>
                  </div>
                  <div className="text-[11px] text-amber-400 font-medium mt-0.5">Ouvindo a 1.5x</div>
                </div>
              </div>
            </div>

            {/* Barra de Progresso da Meta Diária */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className={`w-4 h-4 ${isPurple ? 'text-purple-400' : 'text-blue-400'}`} />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Meta Diária de Fixação
                  </span>
                </div>
                <span className="text-xs font-bold text-zinc-300 tabular-nums">
                  {stats.minutosHoje} de {stats.metaDiariaMinutos} min ({metaProgresso}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPurple
                      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-400'
                      : 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400'
                  }`}
                  style={{ width: `${metaProgresso}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">
                💡 Ouvir 30 minutos diários de legislação acelera em até 3x a memorização dos artigos para provas e concursos.
              </p>
            </div>

            {/* Top Artigos / Aulas Mais Escutados */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Headphones className={`w-4 h-4 ${isPurple ? 'text-purple-400' : 'text-blue-400'}`} />
                  <span>Artigos Mais Escutados Por Você</span>
                </h3>
                <span className="text-[11px] text-zinc-400">Ranking pessoal</span>
              </div>

              {topTracks.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-zinc-400 text-sm">
                  Comece a ouvir suas leis favoritas para ver suas métricas rankeadas aqui.
                </div>
              ) : (
                <div className="space-y-2">
                  {topTracks.map((item, index) => {
                    const minTrack = Math.round(item.totalSegundos / 60);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleTocarItem(item)}
                        className="group flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Posição no ranking */}
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              index === 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : index === 1
                                ? 'bg-zinc-400/20 text-zinc-300 border border-zinc-400/30'
                                : index === 2
                                ? 'bg-amber-800/20 text-amber-400 border border-amber-800/30'
                                : 'bg-white/5 text-zinc-400'
                            }`}
                          >
                            #{index + 1}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition truncate">
                              {item.titulo}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {item.leiNome} • {item.reproducoes}x reproduzido
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                              isPurple
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {minTrack} min
                          </span>
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition ${
                              isPurple
                                ? 'bg-purple-600 group-hover:bg-purple-500'
                                : 'bg-blue-600 group-hover:bg-blue-500'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
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
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
                  <span className="text-2xl">🥇</span>
                  <div>
                    <div className="text-xs font-bold text-white">Primeira Hora</div>
                    <div className="text-[10px] text-amber-300 font-medium">Concluído (+50 XP)</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2.5">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="text-xs font-bold text-white">Velocista</div>
                    <div className="text-[10px] text-purple-300 font-medium">Ouvinte a 1.5x</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 col-span-2 sm:col-span-1">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <div className="text-xs font-bold text-white">Foco Total</div>
                    <div className="text-[10px] text-emerald-300 font-medium">Meta diária batida</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AudioEstatisticasModal;
