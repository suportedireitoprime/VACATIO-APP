import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Lock,
  Play,
  Pause,
  Award,
  Clock,
  Sparkles,
  Volume2,
  Route as RouteIcon,
  RotateCcw,
} from 'lucide-react';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { toast } from 'sonner';

interface SpotifyAudioTrilhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  leiId: string;
  leiNome: string;
  leiSlug: string;
  coverUrl: string;
  tracks: SpotifyTrack[];
}

interface TrilhaProgressData {
  completedTrackIds: string[];
  totalListeningSeconds: number;
}

// Deslocamentos em zigue-zague estilo Trilha Duolingo / Mapas
const OFFSETS = [0, 52, 80, 52, 0, -52, -80, -52];

export const SpotifyAudioTrilhaModal: React.FC<SpotifyAudioTrilhaModalProps> = ({
  isOpen,
  onClose,
  leiId: _leiId,
  leiNome,
  leiSlug,
  coverUrl,
  tracks,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, currentTime, duration } = useSpotifyAudioStore();

  const storageKey = `vacatio_audio_trilha_${leiSlug || 'default'}`;

  // Carrega progresso salvo do localStorage
  const [progress, setProgress] = useState<TrilhaProgressData>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { completedTrackIds: [], totalListeningSeconds: 0 };
  });

  // Salva no localStorage quando muda
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {}
  }, [progress, storageKey]);

  // Lista ordenada de todas as faixas que possuem áudio nesta legislação
  const trilhaTracks = useMemo(() => {
    return tracks.filter((t) => Boolean(t.audioUrl && t.audioUrl.trim()));
  }, [tracks]);

  // Encontra o próximo nó não completado (índice desbloqueado)
  const proximoIndex = useMemo(() => {
    const idx = trilhaTracks.findIndex((t) => !progress.completedTrackIds.includes(t.id));
    return idx === -1 ? trilhaTracks.length : idx;
  }, [trilhaTracks, progress.completedTrackIds]);

  const marcarComoConcluido = useCallback(
    (trackId: string, segundosAdicionais: number) => {
      setProgress((prev) => {
        if (prev.completedTrackIds.includes(trackId)) return prev;
        const novoCompleted = [...prev.completedTrackIds, trackId];
        return {
          completedTrackIds: novoCompleted,
          totalListeningSeconds: prev.totalListeningSeconds + Math.max(15, segundosAdicionais),
        };
      });

      const track = trilhaTracks.find((t) => t.id === trackId);
      toast.success(
        `🎉 ${track?.numeroFormatado || 'Artigo'} concluído! +10 XP • Próximo áudio desbloqueado!`
      );
    },
    [trilhaTracks]
  );

  // Monitora quando o áudio atual passa de 90% para marcar como concluído automaticamente
  const lastCompletedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentTrack || !isPlaying || duration <= 0) return;
    const isTrilhaTrack = trilhaTracks.some((t) => t.id === currentTrack.id);
    if (!isTrilhaTrack) return;

    // Se completou mais de 88% do áudio ou faltam menos de 4 segundos
    if (currentTime >= duration * 0.88 || (duration > 5 && duration - currentTime <= 3)) {
      if (lastCompletedRef.current !== currentTrack.id && !progress.completedTrackIds.includes(currentTrack.id)) {
        lastCompletedRef.current = currentTrack.id;
        marcarComoConcluido(currentTrack.id, Math.round(duration));
      }
    }
  }, [currentTime, duration, isPlaying, currentTrack, trilhaTracks, progress.completedTrackIds, marcarComoConcluido]);

  const handleNodeClick = async (track: SpotifyTrack, index: number) => {
    const isCompleted = progress.completedTrackIds.includes(track.id);
    const isUnlocked = index <= proximoIndex;

    // Se o nó estiver bloqueado: não permite pular a trilha
    if (!isUnlocked) {
      const anterior = trilhaTracks[index - 1];
      toast.info(
        `🔒 Áudio bloqueado! Conclua o áudio anterior (${anterior?.numeroFormatado || 'artigo anterior'}) para desbloquear este.`
      );
      return;
    }

    // Se for o áudio atual tocando: alterna play/pause
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }

    // Toca a faixa desbloqueada
    await playTrack(track, trilhaTracks);
    toast.info(`Tocando na Trilha: ${track.numeroFormatado}`);
  };

  const handleResetProgress = () => {
    if (confirm('Deseja reiniciar seu progresso nesta Trilha de Áudio?')) {
      setProgress({ completedTrackIds: [], totalListeningSeconds: 0 });
      lastCompletedRef.current = null;
      toast.success('Progresso da trilha reiniciado!');
    }
  };

  // Métricas de gamificação
  const totalConcluidos = progress.completedTrackIds.length;
  const percentual = trilhaTracks.length > 0 ? Math.round((totalConcluidos / trilhaTracks.length) * 100) : 0;
  const totalPontos = totalConcluidos * 10;

  const formatTempoEscuta = (seg: number) => {
    if (seg < 60) return `${seg}s`;
    const min = Math.floor(seg / 60);
    if (min < 60) return `${min} min`;
    const horas = Math.floor(min / 60);
    const restoMin = min % 60;
    return `${horas}h ${restoMin}m`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="trilha-modal"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        className="fixed inset-0 z-[120] bg-zinc-950 flex flex-col overflow-hidden select-none"
      >
        {/* CABEÇALHO DA TRILHA */}
        <header className="relative shrink-0 border-b border-white/10 bg-zinc-900/95 backdrop-blur-xl z-20 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+12px)] pb-4 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Voltar para o álbum"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-400">
                <RouteIcon className="w-3.5 h-3.5" />
                <span>Trilha Sequencial Guiada</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate leading-tight drop-shadow-sm">
                {leiNome}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleResetProgress}
              aria-label="Reiniciar Trilha"
              title="Reiniciar Progresso da Trilha"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition active:scale-95 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* PAINEL DE PONTUAÇÃO E MÉTRICAS */}
          <div className="max-w-2xl mx-auto mt-3.5 p-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
            <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
              <div className="flex flex-col items-center justify-center px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-400" />
                  Pontos XP
                </span>
                <span className="text-base sm:text-lg font-black text-amber-300 leading-tight mt-0.5">
                  {totalPontos}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  Escutado
                </span>
                <span className="text-base sm:text-lg font-black text-sky-300 leading-tight mt-0.5">
                  {formatTempoEscuta(progress.totalListeningSeconds)}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Progresso
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-300 leading-tight mt-0.5">
                  {percentual}%
                </span>
              </div>
            </div>

            {/* Barra de Progresso Animada */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1 px-1">
                <span>
                  {totalConcluidos} de {trilhaTracks.length} áudios concluídos
                </span>
                <span className="text-emerald-400 font-bold">{percentual}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-500 shadow-sm shadow-emerald-500/50"
                  style={{ width: `${Math.max(4, percentual)}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* CORPO DA TRILHA DE ÁUDIOS */}
        <div
          className="flex-1 overflow-y-auto px-4 py-8 relative"
          style={{
            paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))',
            background: 'radial-gradient(ellipse at top, #182234 0%, #09090b 70%)',
          }}
        >
          {/* Instrução no topo */}
          <div className="max-w-md mx-auto mb-8 text-center px-2">
            <p className="text-xs text-zinc-400 font-medium">
              Escute os artigos em sequência. Cada áudio concluído libera automaticamente o próximo artigo na trilha.
            </p>
          </div>

          {/* LISTA DE NÓS EM ZIGUE-ZAGUE */}
          <div className="max-w-md mx-auto relative">
            <ul className="flex flex-col items-center gap-7 relative">
              {trilhaTracks.map((track, idx) => {
                const offset = OFFSETS[idx % OFFSETS.length];
                const isCompleted = progress.completedTrackIds.includes(track.id);
                const isUnlocked = idx <= proximoIndex;
                const isCurrent = idx === proximoIndex;
                const isThisPlaying = currentTrack?.id === track.id && isPlaying;

                return (
                  <li
                    key={track.id}
                    className="w-full flex flex-col items-center justify-center relative"
                    style={{ transform: `translateX(${offset}px)` }}
                  >
                    {/* Badge flutuante do Artigo */}
                    <div className="mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border transition-all ${
                          isCompleted
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                            : isCurrent
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-md shadow-amber-500/20'
                            : 'bg-zinc-900/80 text-zinc-500 border-zinc-700/30'
                        }`}
                      >
                        {track.numeroFormatado}
                      </span>
                    </div>

                    {/* Botão do Nó */}
                    <motion.button
                      type="button"
                      onClick={() => handleNodeClick(track, idx)}
                      whileTap={{ scale: 0.92 }}
                      whileHover={isUnlocked ? { scale: 1.06 } : {}}
                      aria-label={`${track.numeroFormatado} - ${isCompleted ? 'Concluído' : isUnlocked ? 'Disponível' : 'Bloqueado'}`}
                      className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-400/30'
                          : isCurrent
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xl shadow-amber-500/40 ring-4 ring-amber-300 animate-pulse'
                          : isUnlocked
                          ? 'bg-zinc-800 text-white border-2 border-white/20'
                          : 'bg-zinc-900/90 text-zinc-600 border border-white/5 opacity-60 cursor-not-allowed'
                      }`}
                      style={{
                        boxShadow: isCompleted
                          ? '0 10px 24px rgba(16, 185, 129, 0.4), inset 0 2px 0 rgba(255,255,255,0.3)'
                          : isCurrent
                          ? '0 10px 24px rgba(245, 158, 11, 0.45), inset 0 2px 0 rgba(255,255,255,0.35)'
                          : '0 8px 18px rgba(0,0,0,0.4)',
                      }}
                    >
                      {isCompleted ? (
                        <Check className="w-7 h-7 drop-shadow-md" strokeWidth={3.5} />
                      ) : isThisPlaying ? (
                        <Pause className="w-7 h-7 fill-white text-white drop-shadow-md" />
                      ) : isUnlocked ? (
                        <Play className="w-6 h-6 fill-white text-white ml-0.5 drop-shadow-md" />
                      ) : (
                        <Lock className="w-5 h-5 text-zinc-500" />
                      )}
                    </motion.button>

                    {/* Subtítulo ou status */}
                    <div className="mt-1 text-center max-w-[130px]">
                      <span className="text-[10px] font-bold text-zinc-400 truncate block">
                        {isCompleted ? (
                          <span className="text-emerald-400 font-semibold">Concluído ✓</span>
                        ) : isThisPlaying ? (
                          <span className="text-amber-400 font-semibold flex items-center justify-center gap-1">
                            <Volume2 className="w-3 h-3 animate-bounce" /> Ouvindo agora
                          </span>
                        ) : isCurrent ? (
                          <span className="text-amber-300 font-semibold">Em Andamento ▶</span>
                        ) : isUnlocked ? (
                          'Disponível'
                        ) : (
                          'Bloqueado 🔒'
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
export default SpotifyAudioTrilhaModal;
