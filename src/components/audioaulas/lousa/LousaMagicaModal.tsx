import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Gauge,
  Sparkles,
  Volume2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { type AulaAudio, useAudioaulasPlayer } from '@/contexts/AudioaulasPlayerContext';
import { type LousaItem } from '@/data/lousas/lousaTipos';
import { obterLousaDaAula } from '@/data/lousas/lousaRegistry';
import { fmt, VELOCIDADES } from '@/lib/audioaulasHelper';
import { haptic } from '@/lib/nativeHaptics';

interface LousaMagicaModalProps {
  aberto: boolean;
  onFechar: () => void;
  aula: AulaAudio | null;
}

export const LousaMagicaModal: React.FC<LousaMagicaModalProps> = ({
  aberto,
  onFechar,
  aula,
}) => {
  const {
    tempo,
    dur,
    tocando,
    velocidade,
    togglePlay,
    seek,
    setVelocidade,
  } = useAudioaulasPlayer();

  // Roteiro dinâmico da aula
  const roteiro = React.useMemo(() => obterLousaDaAula(aula), [aula]);

  // Referências DOM
  const lousaBodyRef = useRef<HTMLDivElement>(null);
  const lousaContainerRef = useRef<HTMLDivElement>(null);
  const postsContainerRef = useRef<HTMLDivElement>(null);

  // Estados de controle da animação de giz
  const lousaIdxRef = useRef<number>(-1);
  const lousaTypeTORef = useRef<NodeJS.Timeout | null>(null);
  const lousaTypingElRef = useRef<HTMLElement | null>(null);
  const lousaErasingRef = useRef<boolean>(false);
  const lousaPendingRef = useRef<LousaItem[]>([]);
  const lousaEraseTORef = useRef<NodeJS.Timeout | null>(null);
  const lzGizElRef = useRef<HTMLSpanElement | null>(null);

  // Estado dos post-its para re-renderização
  const [postItsVisiveis, setPostItsVisiveis] = useState<LousaItem[]>([]);

  // Auto-scroll da lousa para o final
  const lousaScroll = useCallback(() => {
    const el = lousaBodyRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  // Finaliza a digitação de giz ativa
  const lousaFinishTyping = useCallback((instant: boolean) => {
    if (lousaTypingElRef.current) {
      const el = lousaTypingElRef.current as any;
      const cb = el._onDone;
      el._onDone = null;
      el.classList.remove('has-giz');
      el.textContent = el._full || '';
      el.classList.remove('typing');
      lousaTypingElRef.current = null;
      if (cb) cb(!!instant);
    }
    if (lousaTypeTORef.current) {
      clearInterval(lousaTypeTORef.current);
      lousaTypeTORef.current = null;
    }
  }, []);

  // Digita letra por letra com efeito de toco de giz oscilante
  const lousaType = useCallback((el: HTMLElement, full: string, onDone?: (instant: boolean) => void) => {
    lousaFinishTyping(true);
    (el as any)._full = full;
    (el as any)._onDone = onDone || null;
    lousaTypingElRef.current = el;
    el.classList.add('typing', 'has-giz');

    if (!lzGizElRef.current) {
      const g = document.createElement('span');
      g.className = 'lz-giz';
      g.setAttribute('aria-hidden', 'true');
      lzGizElRef.current = g;
    }

    let k = 0;
    el.textContent = '';
    lousaTypeTORef.current = setInterval(() => {
      k++;
      el.textContent = full.slice(0, k);
      if (lzGizElRef.current) {
        el.appendChild(lzGizElRef.current);
        lzGizElRef.current.style.transform = `rotate(${k % 2 ? '-16' : '-5'}deg) translateY(${k % 2 ? '-3' : '1'}px)`;
      }
      lousaScroll();
      if (k >= full.length) {
        lousaFinishTyping(false);
      }
    }, 34);
  }, [lousaFinishTyping, lousaScroll]);

  // Revela subitens de enumeração com marcador dourado
  const lousaRevealItems = useCallback((box: HTMLElement, items: string[], instant: boolean) => {
    items.forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'lz-item';
      const mk = document.createElement('span');
      mk.className = 'lz-item-mark';
      mk.textContent = '▸';
      const tx = document.createElement('span');
      tx.textContent = it;
      d.appendChild(mk);
      d.appendChild(tx);
      if (instant) {
        d.style.animation = 'none';
        d.style.opacity = '1';
      } else {
        d.style.animationDelay = `${0.12 + i * 0.22}s`;
      }
      box.appendChild(d);
    });
    lousaScroll();
  }, [lousaScroll]);

  // Adiciona um item na lousa (título ou ponto)
  const lousaAdd = useCallback((e: LousaItem, animate: boolean) => {
    const body = lousaBodyRef.current;
    if (!body) return;

    const d = document.createElement('div');
    d.className = e.kind === 'titulo' ? 'lz-titulo' : 'lz-ponto';
    d.title = `Pular para ${fmt(e.t)}`;
    d.addEventListener('click', () => {
      haptic.selection();
      seek(e.t + 0.01);
    });
    body.appendChild(d);

    const hasItems = e.kind === 'ponto' && e.items && e.items.length > 0;
    if (hasItems) {
      const head = document.createElement('div');
      head.className = 'lz-head';
      if (!e.text) head.style.display = 'none';
      d.appendChild(head);
      const box = document.createElement('div');
      d.appendChild(box);
      const show = (instant: boolean) => lousaRevealItems(box, e.items || [], instant);
      if (animate) {
        if (e.text) lousaType(head, e.text, show);
        else show(false);
      } else {
        if (e.text) head.textContent = e.text;
        show(true);
      }
    } else {
      if (animate) lousaType(d, e.text);
      else d.textContent = e.text;
    }
    lousaScroll();
  }, [lousaRevealItems, lousaScroll, lousaType, seek]);

  // Cancela a animação do apagador se o usuário buscar para trás
  const lousaCancelErase = useCallback(() => {
    if (lousaEraseTORef.current) {
      clearTimeout(lousaEraseTORef.current);
      lousaEraseTORef.current = null;
    }
    const ap = document.getElementById('lzApag');
    if (ap) ap.remove();
    lousaErasingRef.current = false;
    lousaPendingRef.current = [];
  }, []);

  const lousaFlushGiz = useCallback(() => {
    const giz = lousaPendingRef.current;
    lousaPendingRef.current = [];
    giz.forEach((e, i) => lousaAdd(e, i === giz.length - 1));
  }, [lousaAdd]);

  // Executa o apagador mecânico quando muda de capítulo (kind === 'titulo')
  const lousaErase = useCallback((giz: LousaItem[]) => {
    const body = lousaBodyRef.current;
    const container = lousaContainerRef.current;
    if (!body || !container) {
      giz.forEach((e, i) => lousaAdd(e, i === giz.length - 1));
      return;
    }

    lousaErasingRef.current = true;
    lousaFinishTyping(true);
    lousaPendingRef.current = giz.slice();

    Array.from(body.querySelectorAll('.lz-titulo,.lz-ponto')).forEach((el: any, i) => {
      el.style.transition = 'opacity .45s ease';
      el.style.transitionDelay = `${Math.min(i * 0.05, 0.7)}s`;
      el.style.opacity = '0';
    });

    const ap = document.createElement('div');
    ap.id = 'lzApag';
    ap.innerHTML = '<div class="wood"></div><div class="felt"></div>';
    container.appendChild(ap);

    requestAnimationFrame(() => requestAnimationFrame(() => ap.classList.add('sweep')));

    lousaEraseTORef.current = setTimeout(() => {
      lousaEraseTORef.current = null;
      const a2 = document.getElementById('lzApag');
      if (a2) a2.remove();
      body.innerHTML = '';
      lousaErasingRef.current = false;
      lousaFlushGiz();
      lousaScroll();
    }, 1950);
  }, [lousaAdd, lousaFinishTyping, lousaFlushGiz, lousaScroll]);

  // Atualiza a coluna de post-its com perguntas da Luna
  const lousaRefreshPosts = useCallback((t: number) => {
    if (!roteiro) return;
    const perguntas = roteiro
      .filter((e) => e.kind === 'pergunta' && e.t <= t)
      .slice(-3);
    setPostItsVisiveis(perguntas);
  }, [roteiro]);

  // Ciclo principal de sincronização temporal da Lousa Mágica
  const updateLousa = useCallback((t: number) => {
    if (!roteiro || roteiro.length === 0) return;
    const body = lousaBodyRef.current;
    if (!body) return;

    // Se o usuário voltou o áudio (seek para trás)
    if (lousaIdxRef.current >= 0 && t < roteiro[lousaIdxRef.current].t - 0.5) {
      lousaCancelErase();
      lousaFinishTyping(true);
      body.innerHTML = '';
      lousaIdxRef.current = -1;
      for (let i = 0; i < roteiro.length && roteiro[i].t <= t; i++) {
        if (roteiro[i].kind !== 'pergunta') {
          lousaAdd(roteiro[i], false);
        }
        lousaIdxRef.current = i;
      }
      lousaScroll();
      lousaRefreshPosts(t);
      return;
    }

    let ni = lousaIdxRef.current;
    while (ni + 1 < roteiro.length && roteiro[ni + 1].t <= t) {
      ni++;
    }

    if (ni > lousaIdxRef.current) {
      const prev = lousaIdxRef.current;
      const fresh = roteiro.slice(prev + 1, ni + 1);
      lousaIdxRef.current = ni;

      if (prev === -1 && !lousaErasingRef.current) {
        body.innerHTML = '';
      }

      const giz = fresh.filter((e) => e.kind !== 'pergunta');
      if (fresh.some((e) => e.kind === 'pergunta')) {
        lousaRefreshPosts(t);
      }

      if (lousaErasingRef.current) {
        lousaPendingRef.current.push(...giz);
      } else if (giz.some((e) => e.kind === 'titulo') && body.querySelector('.lz-titulo,.lz-ponto')) {
        lousaErase(giz);
      } else {
        giz.forEach((e, i) => lousaAdd(e, i === giz.length - 1));
      }
      lousaScroll();
    }
  }, [lousaAdd, lousaCancelErase, lousaErase, lousaFinishTyping, lousaRefreshPosts, lousaScroll, roteiro]);

  // Sincroniza em tempo real com o áudio enquanto o modal estiver aberto
  useEffect(() => {
    if (aberto) {
      updateLousa(tempo);
    }
  }, [aberto, tempo, updateLousa]);

  // Reseta estado da lousa ao trocar de aula ou abrir
  useEffect(() => {
    if (aberto) {
      lousaCancelErase();
      lousaFinishTyping(true);
      lousaIdxRef.current = -1;
      if (lousaBodyRef.current) {
        lousaBodyRef.current.innerHTML = '';
      }
      updateLousa(tempo);
    }
    return () => {
      lousaCancelErase();
      lousaFinishTyping(true);
    };
  }, [aberto, aula?.id]);

  if (!aberto || !aula || !roteiro) return null;

  const modalNode = (
    <div className="fixed inset-0 z-[130] bg-[#14100d] text-[#f5efe4] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Estilos embutidos com escopo para fidelidade máxima ao efeito de giz e madeira */}
      <style>{`
        .lz-chalkboard-texture {
          background-color: #20302a;
          box-shadow: inset 0 0 60px rgba(0,0,0,0.65);
          position: relative;
        }
        .lz-chalkboard-texture::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.35;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.5'/></svg>");
        }
        .lz-titulo {
          font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive, sans-serif;
          font-size: clamp(20px, 3.4vw, 32px);
          color: #f3ecd9;
          line-height: 1.4;
          margin: 8px 0 18px;
          text-shadow: 0 0 3px rgba(255,255,255,0.35), 1px 1px 1px rgba(0,0,0,0.4);
          border-bottom: 3px solid rgba(243,236,217,0.8);
          padding-bottom: 8px;
          display: inline-block;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .lz-titulo:hover {
          transform: scale(1.01);
        }
        .lz-ponto {
          font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive, sans-serif;
          font-size: clamp(16px, 2.4vw, 22px);
          color: #f3ecd9;
          line-height: 1.5;
          margin: 0 0 14px;
          padding-left: 26px;
          position: relative;
          text-shadow: 0 0 3px rgba(255,255,255,0.3);
          cursor: pointer;
          animation: lzIn 0.35s ease;
        }
        .lz-ponto::before {
          content: "–";
          position: absolute;
          left: 6px;
          color: #f0d089;
        }
        @keyframes lzIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: none; }
        }
        .lz-titulo.typing::after, .lz-ponto.typing::after, .lz-head.typing::after {
          content: "▌";
          animation: lzCursorBlink 1s infinite;
          color: #f3ecd9;
        }
        .lz-titulo.typing.has-giz::after, .lz-ponto.typing.has-giz::after, .lz-head.typing.has-giz::after {
          content: none;
        }
        @keyframes lzCursorBlink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .lz-item {
          display: flex;
          gap: 10px;
          align-items: baseline;
          margin: 6px 0 6px 20px;
          font-size: 0.9em;
          line-height: 1.45;
          color: #f0d089;
          text-shadow: 0 0 14px rgba(212,169,78,0.35);
          opacity: 0;
          animation: lzItemIn 0.45s ease forwards;
        }
        @keyframes lzItemIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: none; }
        }
        .lz-item-mark {
          color: #d4a94e;
          flex: none;
        }
        .lz-giz {
          display: inline-block;
          width: 32px;
          height: 10px;
          margin-left: 8px;
          border-radius: 5px;
          background: linear-gradient(180deg, #ffffff 0%, #efe9d8 55%, #d8d1bc 100%);
          box-shadow: 0 2px 5px rgba(0,0,0,0.45), inset 0 -2px 3px rgba(0,0,0,0.12);
          transform: rotate(-8deg);
          transition: transform 0.07s;
        }
        #lzApag {
          position: absolute;
          top: -70px;
          left: 12%;
          width: 80px;
          z-index: 20;
          pointer-events: none;
          transform: rotate(-5deg);
          filter: drop-shadow(0 5px 6px rgba(0,0,0,0.55));
        }
        #lzApag .wood {
          height: 26px;
          border-radius: 6px 6px 3px 3px;
          background: linear-gradient(180deg, #a06a35, #7a4e22 70%, #5f3a17);
          border: 1px solid rgba(0,0,0,0.35);
        }
        #lzApag .felt {
          height: 13px;
          margin: 0 4px;
          border-radius: 2px;
          background: linear-gradient(180deg, #5a5a5a, #2b2b2b);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
        }
        #lzApag.sweep {
          animation: lzSweep 1.8s ease-in-out forwards;
        }
        @keyframes lzSweep {
          0%   { top: -70px; left: 10%; }
          15%  { top: 10%;   left: 78%; }
          30%  { top: 28%;   left: 10%; }
          45%  { top: 46%;   left: 78%; }
          60%  { top: 64%;   left: 10%; }
          75%  { top: 82%;   left: 78%; }
          100% { top: 108%;  left: 45%; }
        }
        .postit-card {
          background: linear-gradient(180deg, #ffe27a, #ffd23e);
          color: #4a3a08;
          border: none;
          border-radius: 2px;
          padding: 12px;
          font-family: Arial, sans-serif;
          font-size: 12.5px;
          line-height: 1.45;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(0,0,0,0.45);
          position: relative;
          transition: transform 0.2s;
        }
        .postit-card:hover {
          transform: scale(1.05) rotate(0deg) !important;
        }
        .postit-tape {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 44px;
          height: 15px;
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(0,0,0,0.08);
          pointer-events: none;
        }
      `}</style>

      {/* Header com Glassmorphism e Safe Area */}
      <header
        className="shrink-0 px-4 sm:px-6 pb-2.5 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+0.6rem)] border-b border-white/10 bg-[#17120e]/95 backdrop-blur-xl flex items-center justify-between z-30"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Lousa Mágica · Modo Dinâmico
          </span>
          <span className="hidden sm:inline text-xs text-zinc-400 truncate max-w-xs">
            {aula.titulo}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              onFechar();
            }}
            aria-label="Voltar para a aula normal"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Corpo da Lousa com Moldura de Madeira Nobre e Post-its */}
      <main className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 max-w-[1200px] w-full mx-auto overflow-hidden">
        <div
          className="flex-1 min-h-0 flex gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #6b4a2a, #4a3018 60%, #5d3f22)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7), inset 0 2px 6px rgba(255,255,255,0.15)',
          }}
        >
          {/* Quadro Negro Ardósia com Textura de Giz */}
          <div
            ref={lousaContainerRef}
            className="lz-chalkboard-texture flex-1 min-w-0 rounded-lg overflow-hidden relative flex flex-col"
          >
            <div
              ref={lousaBodyRef}
              className="relative z-10 h-full overflow-y-auto px-5 sm:px-8 py-6 sm:py-8 overscroll-contain select-text"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#5a4a33 transparent',
              }}
            >
              {/* O conteúdo é renderizado e sincronizado diretamente em tempo real */}
            </div>
          </div>

          {/* Coluna de Post-its da Aluna Luna */}
          <div
            ref={postsContainerRef}
            className="w-[125px] sm:w-[195px] flex flex-col gap-3.5 overflow-hidden pt-2 shrink-0"
          >
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-200/80 px-1 flex items-center gap-1">
              <span>Perguntas</span>
              <span className="text-amber-400/60 font-normal">({postItsVisiveis.length})</span>
            </div>

            {postItsVisiveis.length === 0 ? (
              <div className="p-3 text-[11px] text-amber-200/40 italic text-center rounded bg-black/20 border border-white/5">
                Perguntas da aluna surgirão aqui durante a aula...
              </div>
            ) : (
              postItsVisiveis.map((p, idx) => {
                const rotacao = idx % 2 === 0 ? '-2deg' : '2deg';
                return (
                  <button
                    key={`${p.t}-${idx}`}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      seek(p.t + 0.01);
                    }}
                    title={`Pular para o instante da pergunta (${fmt(p.t)})`}
                    style={{ transform: `rotate(${rotacao})` }}
                    className="postit-card group"
                  >
                    <div className="postit-tape" />
                    <span className="block text-zinc-900 font-medium text-[11.5px] sm:text-[12.5px] leading-snug">
                      "{p.text}"
                    </span>
                    <span className="block text-right text-[10px] italic text-[#8a6d1f] mt-1.5 font-sans font-semibold">
                      — Luna ({fmt(p.t)})
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Barra de Player Integrada da Lousa */}
      <footer className="shrink-0 bg-[#17120e]/95 backdrop-blur-xl border-t border-white/10 px-4 sm:px-6 py-3 pb-[calc(var(--sai-bottom,env(safe-area-inset-bottom,0px))+0.6rem)] z-30">
        <div className="max-w-[920px] mx-auto flex items-center gap-3 sm:gap-4">
          {/* Botão de Play / Pause Dourado */}
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              togglePlay();
            }}
            aria-label={tocando ? 'Pausar' : 'Reproduzir'}
            className="w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition shadow-lg cursor-pointer"
            style={{
              background: 'linear-gradient(145deg, #f0d089, #d4a94e)',
              color: '#241a08',
              boxShadow: '0 6px 20px -4px rgba(212,169,78,0.6)',
            }}
          >
            {tocando ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-[#241a08]" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-[#241a08] ml-0.5" />
            )}
          </button>

          {/* Tempo Atual */}
          <span className="text-xs font-mono font-medium text-amber-200/80 tabular-nums shrink-0">
            {fmt(tempo)}
          </span>

          {/* Barra de Progresso com Seek Slider */}
          <input
            type="range"
            min={0}
            max={dur > 0 ? dur : 100}
            step={0.1}
            value={dur > 0 ? tempo : 0}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Buscar no áudio"
            className="flex-1 h-2 rounded-full bg-[#3a2f24] appearance-none cursor-pointer accent-[#f0d089]"
          />

          {/* Duração Total */}
          <span className="text-xs font-mono font-medium text-amber-200/80 tabular-nums shrink-0">
            {dur > 0 ? fmt(dur) : '--:--'}
          </span>

          {/* Voltar 15s */}
          <button
            type="button"
            onClick={() => seek(Math.max(0, tempo - 15))}
            aria-label="Voltar 15 segundos"
            title="Voltar 15s"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition shrink-0 hidden sm:flex"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Avançar 15s */}
          <button
            type="button"
            onClick={() => seek(Math.min(dur, tempo + 15))}
            aria-label="Avançar 15 segundos"
            title="Avançar 15s"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition shrink-0 hidden sm:flex"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Seletor de Velocidade */}
          <select
            value={velocidade}
            onChange={(e) => setVelocidade(Number(e.target.value))}
            aria-label="Velocidade de reprodução"
            className="bg-[#2c2318] text-amber-200 border border-[#4a3b28] rounded-xl px-2 py-1.5 text-xs font-medium cursor-pointer shrink-0 outline-none"
          >
            {VELOCIDADES.map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
        </div>
      </footer>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalNode, document.body);
};

export default LousaMagicaModal;
