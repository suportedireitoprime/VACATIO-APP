import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Route,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import ShapeGrid from '@/components/ui/ShapeGrid';
import { haptic } from '@/lib/nativeHaptics';

interface AudioTrilhasModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorScheme?: 'purple' | 'blue';
  onSelectTrilha?: (trilhaId: string) => void;
}

type FiltroTrilha = 'todas' | 'em_andamento' | 'concluidas';

interface TrilhaItem {
  id: string;
  titulo: string;
  subtitulo: string;
  leiSlug: string;
  totalAudios: number;
  concluidos: number;
  status: 'concluida' | 'em_andamento' | 'nao_iniciada';
  tempoEstimado: string;
  icone: string;
}

const TRILHAS_DATA: TrilhaItem[] = [
  {
    id: 'trilha-oab-1-fase',
    titulo: 'Trilha OAB 1ª Fase — Artigos Campeões',
    subtitulo: 'Constitucional, Penal, CPC, CLT e Ética da Advocacia',
    leiSlug: 'constituicao-federal',
    totalAudios: 45,
    concluidos: 32,
    status: 'em_andamento',
    tempoEstimado: '2h 15m',
    icone: '⚖️',
  },
  {
    id: 'trilha-cf-fundamentais',
    titulo: 'Trilha CF/88 — Direitos e Garantias Fundamentais',
    subtitulo: 'Artigos 1º ao 17 (Direitos Individuais, Sociais e Políticos)',
    leiSlug: 'constituicao-federal',
    totalAudios: 28,
    concluidos: 28,
    status: 'concluida',
    tempoEstimado: '1h 40m',
    icone: '🏛️',
  },
  {
    id: 'trilha-cp-crimes',
    titulo: 'Trilha Código Penal — Vida, Patrimônio e Dignidade Sexual',
    subtitulo: 'Artigos 121 a 234 (Homicídio, Furto, Roubo e Estelionato)',
    leiSlug: 'codigo-penal',
    totalAudios: 36,
    concluidos: 18,
    status: 'em_andamento',
    tempoEstimado: '2h 00m',
    icone: '🚨',
  },
  {
    id: 'trilha-clt-rescisao',
    titulo: 'Trilha CLT — Contrato de Trabalho & Rescisão',
    subtitulo: 'Artigos 442 a 500 (Verbas, Aviso Prévio, FGTS e Prazos)',
    leiSlug: 'clt',
    totalAudios: 24,
    concluidos: 24,
    status: 'concluida',
    tempoEstimado: '1h 15m',
    icone: '💼',
  },
  {
    id: 'trilha-cpp-inquerito',
    titulo: 'Trilha Processo Penal — Inquérito e Prisão em Flagrante',
    subtitulo: 'Artigos 4º a 28-A e 310 a 320 do Código de Processo Penal',
    leiSlug: 'codigo-de-processo-penal',
    totalAudios: 30,
    concluidos: 12,
    status: 'em_andamento',
    tempoEstimado: '1h 50m',
    icone: '🔍',
  },
  {
    id: 'trilha-ctb-infracoes',
    titulo: 'Trilha Código de Trânsito — Infrações & Crimes ao Volante',
    subtitulo: 'Artigos 161 a 255 e 302 a 312 do CTB',
    leiSlug: 'codigo-de-transito-brasileiro',
    totalAudios: 20,
    concluidos: 0,
    status: 'nao_iniciada',
    tempoEstimado: '1h 10m',
    icone: '🚗',
  },
];

export const AudioTrilhasModal: React.FC<AudioTrilhasModalProps> = ({
  isOpen,
  onClose,
  colorScheme = 'purple',
  onSelectTrilha,
}) => {
  const isPurple = colorScheme === 'purple';
  const [filtro, setFiltro] = useState<FiltroTrilha>('todas');

  if (!isOpen) return null;

  const concluidasCount = TRILHAS_DATA.filter((t) => t.status === 'concluida').length;
  const emAndamentoCount = TRILHAS_DATA.filter((t) => t.status === 'em_andamento').length;

  const totalAudiosGeral = TRILHAS_DATA.reduce((acc, t) => acc + t.totalAudios, 0);
  const totalConcluidosGeral = TRILHAS_DATA.reduce((acc, t) => acc + t.concluidos, 0);
  const progressoPercentual = Math.round((totalConcluidosGeral / totalAudiosGeral) * 100);

  const trilhasFiltradas = TRILHAS_DATA.filter((t) => {
    if (filtro === 'concluidas') return t.status === 'concluida';
    if (filtro === 'em_andamento') return t.status === 'em_andamento' || t.status === 'nao_iniciada';
    return true;
  });

  const handleAcaoTrilha = (trilha: TrilhaItem) => {
    haptic.selection();
    if (onSelectTrilha) {
      onSelectTrilha(trilha.id);
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

          {/* Top Bar Fixa com botão Voltar circular */}
          <div
            className="relative z-10 shrink-0 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,12px)+16px)] pb-4 border-b border-white/[0.08]"
            style={{
              background: isPurple
                ? 'linear-gradient(180deg, rgba(30, 16, 55, 0.95) 0%, rgba(7, 11, 20, 0.98) 100%)'
                : 'linear-gradient(180deg, rgba(13, 30, 65, 0.95) 0%, rgba(7, 11, 20, 0.98) 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  onClose();
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
              </button>

              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg shrink-0 ${
                    isPurple
                      ? 'bg-purple-600/20 border-purple-500/40 text-purple-400'
                      : 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                  }`}
                >
                  <Route className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                    Trilhas de Estudo em Áudio
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium truncate">
                    Roteiros sequenciais artigo por artigo para fixação orientada.
                  </p>
                </div>
              </div>
            </div>

            {/* Resumo do Progresso Global */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Concluídas</div>
                <div className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums">
                  {concluidasCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Em Andamento</div>
                <div className={`text-lg sm:text-xl font-black tabular-nums ${isPurple ? 'text-purple-400' : 'text-blue-400'}`}>
                  {emAndamentoCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-center">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Progresso Geral</div>
                <div className="text-lg sm:text-xl font-black text-white tabular-nums">
                  {progressoPercentual}%
                </div>
              </div>
            </div>

            {/* Filtros de Trilhas */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-none pt-1">
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setFiltro('todas');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  filtro === 'todas'
                    ? isPurple
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                }`}
              >
                Todas ({TRILHAS_DATA.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setFiltro('em_andamento');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  filtro === 'em_andamento'
                    ? isPurple
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                }`}
              >
                Em Andamento ({emAndamentoCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setFiltro('concluidas');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  filtro === 'concluidas'
                    ? isPurple
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                }`}
              >
                Concluídas ({concluidasCount})
              </button>
            </div>
          </div>

          {/* Lista de Cards de Trilhas */}
          <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 scrollbar-none pb-[calc(env(safe-area-inset-bottom,20px)+24px)]">
            <div className="max-w-3xl mx-auto space-y-3.5">
              {trilhasFiltradas.map((trilha) => {
                const perc = Math.round((trilha.concluidos / trilha.totalAudios) * 100);
                const isConcluida = trilha.status === 'concluida';
                const isNaoIniciada = trilha.status === 'nao_iniciada';

                return (
                  <div
                    key={trilha.id}
                    className={`group p-4 sm:p-5 rounded-2xl border transition-all ${
                      isConcluida
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-2xl sm:text-3xl shrink-0 p-2 rounded-2xl bg-white/5 border border-white/10">
                          {trilha.icone}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                isConcluida
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : isNaoIniciada
                                  ? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                                  : isPurple
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              }`}
                            >
                              {isConcluida
                                ? '✓ Concluída'
                                : isNaoIniciada
                                ? 'Não iniciada'
                                : 'Em andamento'}
                            </span>
                            <span className="text-[11px] text-zinc-400">⏱️ {trilha.tempoEstimado}</span>
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">
                            {trilha.titulo}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{trilha.subtitulo}</p>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progresso da Trilha */}
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                        <span className="text-zinc-400">
                          {trilha.concluidos} de {trilha.totalAudios} áudios concluídos
                        </span>
                        <span
                          className={`tabular-nums ${
                            isConcluida
                              ? 'text-emerald-400 font-bold'
                              : isPurple
                              ? 'text-purple-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {perc}%
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isConcluida
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : isPurple
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-500'
                              : 'bg-gradient-to-r from-blue-600 to-sky-500'
                          }`}
                          style={{ width: `${perc}%` }}
                        />
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="mt-3.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleAcaoTrilha(trilha)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 active:scale-95 ${
                          isConcluida
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                            : isPurple
                            ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/40'
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40'
                        }`}
                      >
                        {isConcluida ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Revisar Trilha</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isNaoIniciada ? 'Iniciar Trilha' : 'Continuar Trilha'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
export default AudioTrilhasModal;
