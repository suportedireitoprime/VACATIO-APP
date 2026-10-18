import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Heart, RotateCcw, RotateCw, SkipBack, SkipForward, Play, Pause, Gauge, X, Music } from 'lucide-react';
import { type AulaAudio, audioIdOf, useAudioaulasPlayer } from '@/contexts/AudioaulasPlayerContext';
import { BotaoDownloadAudio } from './BotaoDownloadAudio';
import { capaDaArea, fmt, VELOCIDADES } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from './CapaOtimizada';
import { AudioaulasBgmModal } from '@/components/audioaulas/AudioaulasBgmModal';

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
  setVelocidade
}: AudioaulasPlayerModalProps) {
  const [expandirDesc, setExpandirDesc] = useState(false);
  const [bgmModalAberto, setBgmModalAberto] = useState(false);
  const { bgmAtivo, bgmVolume } = useAudioaulasPlayer();

  // Resetar o estado da descrição quando mudar a aula ou fechar o modal
  useEffect(() => {
    if (!aberto) setExpandirDesc(false);
  }, [aberto, atual]);

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

        {/* Header do Player */}
        <div className="flex items-center justify-between px-4 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+0.75rem)] pb-2 shrink-0 z-10">
          <button
            onClick={() => setAberto(false)}
            aria-label="Minimizar player"
            className="h-11 w-11 grid place-items-center rounded-full hover:bg-white/10 text-white transition active:opacity-70"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
          <div className="text-center min-w-0 px-2 flex-1">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-primary">Em Reprodução</p>
            <p className="text-sm font-bold text-white truncate max-w-[70vw] sm:max-w-md mx-auto">{atual.area}</p>
          </div>
          <button
            type="button"
            onClick={() => setBgmModalAberto(true)}
            aria-label="Configurar música de fundo"
            title="Música de Fundo (Lo-Fi)"
            className={`h-11 w-11 grid place-items-center rounded-full transition active:scale-95 ${
              bgmAtivo
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-900/30'
                : 'hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Music className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo Principal do Player: flexível, responsivo e adaptado para qualquer altura de tela */}
        <div className="mx-auto w-full max-w-xl flex-1 flex flex-col justify-between px-6 pt-1 pb-[calc(var(--sai-bottom,env(safe-area-inset-bottom,0px))+2.5rem)] lg:pb-8">
          {/* Seção da Capa com botão de Favorito */}
          <div className="relative flex items-center justify-center my-auto py-2">
            <div className="h-44 w-44 sm:h-56 sm:w-56 max-h-[30vh] aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-black/80 border border-white/10 bg-zinc-900 shrink-0">
              <CapaOtimizada src={capaDaArea(atual.area || '')} alt={atual.titulo} animacaoEntrada />
            </div>
            <button
              onClick={() => alternarFavorito(atual)}
              aria-label={favoritos.has(audioIdOf(atual)) ? 'Remover dos favoritos' : 'Favoritar'}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/50 backdrop-blur-md transition hover:bg-white/20 active:opacity-70 shadow-xl"
            >
              <Heart
                className={`h-6 w-6 transition ${
                  favoritos.has(audioIdOf(atual)) ? 'fill-rose-500 text-rose-500' : 'text-white'
                }`}
              />
            </button>
          </div>

          {/* Título e Tema */}
          <div className="text-center sm:text-left mt-3">
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide line-clamp-2">
              {atual.titulo}
            </h2>
            <p className="text-sm font-medium text-primary mt-1 truncate">{atual.tema || atual.area}</p>
            {atual.descricao && (
              <div className="mt-1.5 flex flex-col items-center sm:items-start">
                <p className="text-xs text-zinc-400 line-clamp-2">{atual.descricao}</p>
                <button
                  onClick={() => setExpandirDesc(true)}
                  className="text-primary text-[11px] font-bold mt-1 hover:underline uppercase tracking-wider"
                >
                  Ver mais
                </button>
              </div>
            )}
          </div>

          {/* Barra de Progresso do Áudio */}
          <div className="mt-4 sm:mt-5">
            <input
              type="range"
              min={0}
              max={dur > 0 ? dur : 100}
              step={0.1}
              value={dur > 0 ? tempo : 0}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Progresso da aula"
              className="w-full accent-primary h-2 rounded-lg bg-white/10 cursor-pointer"
            />
            <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-zinc-400 mt-1.5">
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
              className="h-10 w-10 grid place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition active:opacity-70"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <button
              onClick={() => pular(-1)}
              disabled={atualIdx <= 0}
              aria-label="Aula anterior"
              className="h-12 w-12 grid place-items-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 transition active:opacity-70"
            >
              <SkipBack className="h-6 w-6" />
            </button>

            <button
              onClick={togglePlay}
              aria-label={tocando ? 'Pausar' : 'Tocar'}
              className="h-16 w-16 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-black/50 active:opacity-70 transition hover:scale-105"
            >
              {tocando ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
            </button>

            <button
              onClick={() => pular(1)}
              disabled={atualIdx < 0 || atualIdx >= fila.length - 1}
              aria-label="Próxima aula"
              className="h-12 w-12 grid place-items-center rounded-full text-white hover:bg-white/10 disabled:opacity-30 transition active:opacity-70"
            >
              <SkipForward className="h-6 w-6" />
            </button>

            <button
              onClick={() => seek(Math.min(dur, tempo + 15))}
              aria-label="Avançar 15 segundos"
              title="Avançar 15s"
              className="h-10 w-10 grid place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition active:opacity-70"
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
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
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

        {/* Modal/Overlay da Descrição (expande de baixo para cima) */}
        <div 
          className={`absolute inset-x-0 bottom-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] rounded-t-3xl transition-transform duration-300 ease-out flex flex-col ${
            expandirDesc ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '70%' }}
        >
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Descrição da Aula</h3>
            <button 
              onClick={() => setExpandirDesc(false)}
              className="h-8 w-8 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition active:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto pb-6 text-sm text-zinc-300 leading-relaxed custom-scrollbar">
            {atual.descricao}
          </div>
        </div>

        {/* Modal de Configurações de Música de Fundo (Lo-Fi) */}
        <AudioaulasBgmModal
          isOpen={bgmModalAberto}
          onClose={() => setBgmModalAberto(false)}
        />
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalNode, document.body);
});
