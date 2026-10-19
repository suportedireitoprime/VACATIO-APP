import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Heart,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Gauge,
  Music,
  Feather,
  Settings,
} from 'lucide-react';
import { type AulaAudio, audioIdOf, useAudioaulasPlayer } from '@/contexts/AudioaulasPlayerContext';
import { BotaoDownloadAudio } from './BotaoDownloadAudio';
import { capaDaArea, fmt, VELOCIDADES } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from './CapaOtimizada';
import { AudioaulasBgmModal } from '@/components/audioaulas/AudioaulasBgmModal';
import { temLousaMagica } from '@/data/lousas/lousaRegistry';

const LousaMagicaModal = React.lazy(() => import('@/components/audioaulas/lousa/LousaMagicaModal'));

interface AudioaulasPlayerModalProps {
  aberto: boolean;
  setAberto: (v: boolean) => void;
  atual: AulaAudio | null;
  atualIdx: number;
  fila: AulaAudio[];
  tempo: number;
  dur: number;
  tocando: boolean;
  velocidade: number;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  togglePlay: () => void;
  seek: (t: number) => void;
  pular: (dir: number) => void;
  setVelocidade: (v: number) => void;
}

export const AudioaulasPlayerModal = React.memo(function AudioaulasPlayerModal({
  aberto,
  setAberto,
  atual,
  atualIdx,
  fila,
  tempo,
  dur,
  tocando,
  velocidade,
  favoritos,
  alternarFavorito,
  togglePlay,
  seek,
  pular,
  setVelocidade,
}: AudioaulasPlayerModalProps) {
  const [bgmModalAberto, setBgmModalAberto] = useState(false);
  const [lousaAberta, setLousaAberta] = useState(false);
  const { bgmAtivo, bgmVolume } = useAudioaulasPlayer();

  // Trava scroll da página de fundo quando o player expandido estiver aberto
  useEffect(() => {
    if (aberto) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [aberto]);

  if (!atual) return null;

  const modalNode = (
    <>
      {/* Estilos para a animação de reflexo de luz no botão da lousa */}
      <style>{`
        .btn-lousa-shine {
          position: relative;
          overflow: hidden;
        }
        .btn-lousa-shine::after {
          content: '';
          position: absolute;
          top: -60%;
          left: -130%;
          width: 50%;
          height: 220%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 25%,
            rgba(255, 255, 255, 0.45) 50%,
            rgba(255, 255, 255, 0.08) 75%,
            transparent 100%
          );
          transform: rotate(25deg);
          animation: lousaReflexoSweep 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          pointer-events: none;
        }
        @keyframes lousaReflexoSweep {
          0% { left: -130%; }
          35%, 100% { left: 230%; }
        }
      `}</style>

      {/* Backdrop com blur e fade suave */}
      <div
        onClick={() => setAberto(false)}
        aria-hidden
        className={`fixed inset-0 z-[115] bg-black/85 backdrop-blur-sm transition-opacity duration-300 ${
          aberto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Janela Principal do Player */}
      <div
        className={`fixed inset-0 z-[120] flex flex-col overflow-y-auto overscroll-contain transition-all duration-300 ease-out lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-xl lg:h-[88vh] lg:max-h-[740px] lg:rounded-3xl lg:border lg:border-white/15 lg:shadow-2xl lg:shadow-black/90 ${
          aberto
            ? 'translate-y-0 lg:-translate-y-1/2 opacity-100 scale-100'
            : 'translate-y-full lg:translate-y-[-40%] lg:scale-95 opacity-0 pointer-events-none'
        }`}
      >
        {/* Fundo com efeito blur do gradiente temático */}
        <div className="absolute inset-0 -z-10 bg-zinc-950 pointer-events-none overflow-hidden">
          <img
            src={capaDaArea(atual.area || '')}
            alt=""
            aria-hidden
            className="w-full h-full object-cover opacity-25 blur-3xl scale-150"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/25 via-zinc-950/90 to-black" />
        </div>

        {/* Header do Player: Botão minimizar com fundo branco para destaque */}
        <div className="flex items-center justify-between px-4 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+0.75rem)] pb-2 shrink-0 z-10">
          <button
            onClick={() => setAberto(false)}
            aria-label="Minimizar player"
            title="Minimizar"
            className="h-10 w-10 sm:h-11 sm:w-11 grid place-items-center rounded-full bg-white text-zinc-950 hover:bg-white/90 shadow-md shadow-black/40 transition-all active:scale-90 cursor-pointer"
          >
            <ChevronDown className="h-6 w-6 stroke-[2.5]" />
          </button>

          <div className="text-center min-w-0 px-2 flex-1">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-primary">Em Reprodução</p>
            <p className="text-sm font-bold text-white truncate max-w-[70vw] sm:max-w-md mx-auto">{atual.area}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setBgmModalAberto(true)}
              aria-label="Configurar música de fundo"
              title="Música de Fundo (Lo-Fi)"
              className={`h-11 w-11 grid place-items-center rounded-full transition active:scale-95 cursor-pointer ${
                bgmAtivo
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-900/30'
                  : 'hover:bg-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Music className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Principal do Player: flexível, responsivo e adaptado para qualquer altura de tela */}
        <div className="mx-auto w-full max-w-xl flex-1 flex flex-col justify-between px-6 pt-1 pb-[calc(var(--sai-bottom,env(safe-area-inset-bottom,0px))+2.5rem)] lg:pb-8">
          {/* Seção da Capa com botão de Favorito dentro da capa (canto superior direito) */}
          <div className="relative flex flex-col items-center justify-center my-auto py-2">
            <div className="relative">
              <div className="relative h-44 w-44 sm:h-56 sm:w-56 max-h-[30vh] aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/80 border border-white/10 bg-zinc-900 shrink-0">
                <CapaOtimizada src={capaDaArea(atual.area || '')} alt={atual.titulo} animacaoEntrada />

                {/* Botão de Favoritar reposicionado dentro da capa na ponta superior direita */}
                <button
                  type="button"
                  onClick={() => alternarFavorito(atual)}
                  aria-label={favoritos.has(audioIdOf(atual)) ? 'Remover dos favoritos' : 'Favoritar'}
                  title={favoritos.has(audioIdOf(atual)) ? 'Remover dos favoritos' : 'Favoritar'}
                  className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full border border-white/20 bg-black/60 backdrop-blur-md transition-all hover:bg-black/80 hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
                >
                  <Heart
                    className={`h-5 w-5 sm:h-5.5 sm:w-5.5 transition-colors ${
                      favoritos.has(audioIdOf(atual)) ? 'fill-rose-500 text-rose-500' : 'text-white'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Botão "Ativar Lousa Mágica" com Ícone de Pena, Engrenagem e Animação de Reflexo */}
            {temLousaMagica(atual) && (
              <div className="mt-3.5 flex justify-center w-full px-4">
                <button
                  type="button"
                  onClick={() => setLousaAberta(true)}
                  aria-label="Ativar Lousa Mágica"
                  title="Ativar Lousa Mágica (Modo Dinâmico)"
                  className="btn-lousa-shine group relative inline-flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-600/25 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-600/35 border border-amber-500/40 text-amber-200 shadow-lg shadow-amber-950/50 active:scale-95 transition-all text-xs sm:text-[13px] font-bold cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Feather className="w-4 h-4 text-amber-300 transition-transform group-hover:-rotate-12" />
                    <span className="tracking-wide">Ativar Lousa Mágica</span>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/25 text-amber-100 border border-amber-400/30">
                    <Settings className="w-2.5 h-2.5 animate-[spin_8s_linear_infinite]" />
                    Ativado
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Título e Tema */}
          <div className="text-center sm:text-left mt-3">
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide line-clamp-2">
              {atual.titulo}
            </h2>
            <p className="text-sm font-medium text-primary mt-1 truncate">{atual.tema || atual.area}</p>
          </div>

          {/* Barra de Progresso Fina e Elegante com Bolinha Alta */}
          <div className="mt-4 sm:mt-5">
            {(() => {
              const pct = dur > 0 ? Math.min(100, Math.max(0, (tempo / dur) * 100)) : 0;
              return (
                <div className="relative w-full group py-3 cursor-pointer select-none">
                  {/* Trilho Fino e Elegante */}
                  <div className="h-1 sm:h-1.5 w-full rounded-full bg-white/15 overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-amber-400 to-amber-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Bolinha Thumb Alta e Elegante */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-transform group-hover:scale-125"
                    style={{ left: `${pct}%` }}
                  >
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.8),0_0_0_2.5px_rgba(240,208,137,0.5)]" />
                  </div>

                  {/* Input range invisível para controle táctil suave */}
                  <input
                    type="range"
                    min={0}
                    max={dur > 0 ? dur : 100}
                    step={0.1}
                    value={dur > 0 ? tempo : 0}
                    onChange={(e) => seek(Number(e.target.value))}
                    aria-label="Progresso da aula"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
              );
            })()}
            <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-zinc-400 mt-0.5">
              <span>{fmt(tempo)}</span>
              <span>{dur > 0 ? fmt(dur) : '--:--'}</span>
            </div>
          </div>

          {/* Controles de Reprodução */}
          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-5 sm:gap-6">
            <button
              onClick={() => seek(Math.max(0, tempo - 15))}
              aria-label="Voltar 15 segundos"
              title="Voltar 15s"
              className="h-10 w-10 grid place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition active:opacity-70 cursor-pointer"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <button
              onClick={() => pular(-1)}
              disabled={atualIdx <= 0}
              aria-label="Aula anterior"
              className="h-12 w-12 grid place-items-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 transition active:opacity-70 cursor-pointer"
            >
              <SkipBack className="h-6 w-6" />
            </button>

            <button
              onClick={togglePlay}
              aria-label={tocando ? 'Pausar' : 'Tocar'}
              className="h-16 w-16 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-black/50 active:opacity-70 transition hover:scale-105 cursor-pointer"
            >
              {tocando ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
            </button>

            <button
              onClick={() => pular(1)}
              disabled={atualIdx < 0 || atualIdx >= fila.length - 1}
              aria-label="Próxima aula"
              className="h-12 w-12 grid place-items-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 transition active:opacity-70 cursor-pointer"
            >
              <SkipForward className="h-6 w-6" />
            </button>

            <button
              onClick={() => seek(Math.min(dur, tempo + 15))}
              aria-label="Avançar 15 segundos"
              title="Avançar 15s"
              className="h-10 w-10 grid place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition active:opacity-70 cursor-pointer"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>

          {/* Opções de Velocidade e Download */}
          <div className="mt-4 sm:mt-6 flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <Gauge className="h-4 w-4 text-primary mr-1 shrink-0" />
              {VELOCIDADES.map((v) => (
                <button
                  key={v}
                  onClick={() => setVelocidade(v)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    velocidade === v
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {v}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">


              <button
                type="button"
                onClick={() => setBgmModalAberto(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                  bgmAtivo
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 shadow-md shadow-blue-900/30'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
                title="Configurar música de fundo"
              >
                <Music className="w-3.5 h-3.5" />
                <span>{bgmAtivo ? `Lo-Fi ${Math.round(bgmVolume * 100)}%` : 'Lo-Fi Off'}</span>
              </button>

              <BotaoDownloadAudio aula={atual} grande />
            </div>
          </div>
        </div>



        {/* Modal de Configurações de Música de Fundo (Lo-Fi) */}
        {bgmModalAberto && (
          <AudioaulasBgmModal
            isOpen={bgmModalAberto}
            onClose={() => setBgmModalAberto(false)}
          />
        )}

        {/* Modal Interativo da Lousa Mágica (Carregado dinamicamente sob demanda) */}
        {lousaAberta && (
          <React.Suspense fallback={null}>
            <LousaMagicaModal
              aberto={lousaAberta}
              aula={atual}
              onFechar={() => setLousaAberta(false)}
            />
          </React.Suspense>
        )}
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalNode, document.body);
});

export default AudioaulasPlayerModal;
