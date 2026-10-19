import React from 'react';
import {
  Play,
  Pause,
  Heart,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type AulaAudio, audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import { BotaoDownloadAudio } from '@/components/audioaulas/home/BotaoDownloadAudio';
import { temLousaMagica } from '@/data/lousas/lousaRegistry';
import { haptic } from '@/lib/nativeHaptics';

interface AudioaulasMateriaAulaItemProps {
  aula: AulaAudio;
  indice: number;
  atualId: string | number | null;
  tocando: boolean;
  dur: number;
  tempo: number;
  aulaPercent: number;
  concluida: boolean;
  isFav: boolean;
  isExp: boolean;
  theme: any;
  onTocarAula: (a: AulaAudio) => void;
  onAlternarFavorito: (a: AulaAudio) => void;
  onToggleExpandir: () => void;
  onAbrirLousa: (a: AulaAudio) => void;
}

export const AudioaulasMateriaAulaItem: React.FC<AudioaulasMateriaAulaItemProps> = ({
  aula,
  indice,
  atualId,
  tocando,
  aulaPercent,
  concluida,
  isFav,
  isExp,
  theme,
  onTocarAula,
  onAlternarFavorito,
  onToggleExpandir,
  onAbrirLousa,
}) => {
  const isAtivo = aula.id === atualId;
  const numFaixa = aula.sequencia ?? indice;
  const temLousa = temLousaMagica(aula);

  return (
    <div
      style={{
        background: isAtivo ? theme.cardActiveBg : undefined,
        borderColor: isAtivo ? theme.primaryAlpha60 : undefined,
        boxShadow: isAtivo ? theme.glowShadow : undefined,
      }}
      className={`rounded-2xl sm:rounded-3xl border transition-all duration-300 backdrop-blur-md overflow-hidden ${
        isAtivo
          ? 'ring-1'
          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20'
      }`}
    >
      {/* Linha Principal com Altura Padronizada e Rigorosamente Uniforme */}
      <div className="flex items-center gap-3 sm:gap-4 px-3.5 sm:px-4 h-[86px] sm:h-[92px]">
        {/* Botão de Play / Pause */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            onTocarAula(aula);
          }}
          style={{
            backgroundColor:
              isAtivo && tocando
                ? theme.primary
                : isAtivo
                ? theme.primaryAlpha40
                : undefined,
            borderColor: isAtivo ? theme.primaryLight : undefined,
            boxShadow: isAtivo && tocando ? theme.glowShadow : undefined,
          }}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer border ${
            isAtivo
              ? 'text-white'
              : 'bg-white/10 text-white hover:bg-white/20 border-white/10'
          }`}
          aria-label={isAtivo && tocando ? 'Pausar aula' : 'Reproduzir aula'}
        >
          {isAtivo && tocando ? (
            <Pause className="w-5 h-5 fill-white" />
          ) : (
            <Play className="w-5 h-5 fill-white ml-0.5" />
          )}
        </button>

        {/* Faixa, Título Refinado (não-negrito) e Barra de Progresso */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            onTocarAula(aula);
          }}
          className="min-w-0 flex-1 text-left cursor-pointer flex flex-col justify-center h-full py-1"
        >
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span
              className="font-medium text-[11px] px-2 py-0.5 rounded-md border shrink-0"
              style={{
                backgroundColor: theme.primaryAlpha15,
                borderColor: theme.primaryAlpha30,
                color: theme.primaryLight,
              }}
            >
              Faixa {numFaixa}
            </span>

            {temLousa && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAbrirLousa(aula);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-500/25 hover:bg-amber-500/35 active:scale-95 text-amber-300 border border-amber-500/40 shadow-sm shrink-0 cursor-pointer transition"
                title="Abrir Lousa Mágica (Modo Dinâmico)"
              >
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Modo Dinâmico</span>
              </button>
            )}

            {isAtivo ? (
              <span
                className="font-card text-[10px] font-bold uppercase tracking-wider animate-pulse truncate"
                style={{ color: theme.primaryLight }}
              >
                {tocando ? 'Reproduzindo' : 'Pausado'}
              </span>
            ) : concluida ? (
              <span
                className="text-[10px] font-medium flex items-center gap-1 truncate"
                style={{ color: theme.primaryLight }}
              >
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                Concluída
              </span>
            ) : aulaPercent > 0 ? (
              <span className="text-[10px] font-medium text-zinc-400 truncate">
                {aulaPercent}% ouvido
              </span>
            ) : null}
          </div>

          {/* Tipografia suave e elegante: font-medium, sem negrito pesado */}
          <h3
            className="font-medium text-[14px] sm:text-[15px] text-zinc-100 truncate mt-1 tracking-normal transition-colors drop-shadow-sm leading-snug"
            style={{
              color: isAtivo ? theme.primaryLight : undefined,
            }}
          >
            {aula.titulo}
          </h3>

          {/* Barra de Progresso da Aula */}
          <div className="mt-1.5 w-full h-1 bg-white/[0.08] rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.max(0, aulaPercent)}%`,
                background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryLight})`,
              }}
            />
          </div>
        </button>

        {/* Ações: Download, Favorito e Resumo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <BotaoDownloadAudio aula={aula} />

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              onAlternarFavorito(aula);
            }}
            aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-90 cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                isFav ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
              }`}
            />
          </button>

          {temLousa && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAbrirLousa(aula);
              }}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-card text-xs font-bold transition border cursor-pointer bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 active:scale-95 shadow-sm"
              title="Abrir Lousa Mágica (Modo Dinâmico)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Lousa</span>
            </button>
          )}

          {aula.descricao && (
            <button
              type="button"
              onClick={onToggleExpandir}
              aria-label="Ver resumo doutrinário"
              style={{
                backgroundColor: isExp ? theme.primaryAlpha25 : undefined,
                borderColor: isExp ? theme.primaryAlpha40 : undefined,
                color: isExp ? theme.primaryLight : undefined,
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-card text-xs font-semibold transition border cursor-pointer ${
                isExp
                  ? ''
                  : 'bg-white/5 text-zinc-300 hover:text-white border-white/10'
              }`}
            >
              {isExp ? 'Fechar' : 'Resumo'}
            </button>
          )}
        </div>
      </div>

      {/* Resumo doutrinário expandível */}
      <AnimatePresence>
        {isExp && aula.descricao && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/[0.06] bg-black/40 px-4 py-3.5 rounded-b-2xl sm:rounded-b-3xl"
          >
            <p
              className="font-card text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
              style={{ color: theme.primaryLight }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Síntese e Conteúdo Doutrinário
            </p>
            <div className="font-card text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto pr-1">
              {aula.descricao}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
