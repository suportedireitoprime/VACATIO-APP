import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { type AulaAudio, useAudioaulasPlayer } from '@/contexts/AudioaulasPlayerContext';
import { type LousaItem } from '@/data/lousas/lousaTipos';
import { obterLousaDaAula } from '@/data/lousas/lousaRegistry';
import { fmt, VELOCIDADES } from '@/lib/audioaulasHelper';
import { haptic } from '@/lib/nativeHaptics';
import { lousaAudio } from '@/lib/lousaAudioEffects';

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
  const modalWrapperRef = useRef<HTMLDivElement>(null);

  // Estados de controle da animação de giz
  const lousaIdxRef = useRef<number>(-1);
  const lousaTypeTORef = useRef<NodeJS.Timeout | null>(null);
  const lousaTypingElRef = useRef<HTMLElement | null>(null);
  const lousaErasingRef = useRef<boolean>(false);
  const lousaPendingRef = useRef<LousaItem[]>([]);
  const lousaEraseTORef = useRef<NodeJS.Timeout | null>(null);
  const lzGizElRef = useRef<HTMLSpanElement | null>(null);
  const velocidadeRef = useRef<number>(velocidade);
  velocidadeRef.current = velocidade;

  // Estados de interface
  const [somHabilitado, setSomHabilitado] = useState<boolean>(() => lousaAudio.isEnabled());
  const [emTelaCheia, setEmTelaCheia] = useState<boolean>(false);
  const [apagadorLimpando, setApagadorLimpando] = useState<boolean>(false);
  const [postItsVisiveis, setPostItsVisiveis] = useState<LousaItem[]>([]);

  // Alterna som procedural de giz e apagador
  const handleToggleSom = () => {
    const novo = lousaAudio.toggle();
    setSomHabilitado(novo);
    haptic.selection();
    if (novo) {
      lousaAudio.playGizScratch(0.08);
    }
  };

  // Alterna modo tela cheia
  const handleToggleFullscreen = () => {
    haptic.selection();
    if (!document.fullscreenElement) {
      modalWrapperRef.current?.requestFullscreen?.().then(() => setEmTelaCheia(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setEmTelaCheia(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setEmTelaCheia(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Auto-scroll da lousa para o final com suavidade
  const lousaScroll = useCallback(() => {
    const el = lousaBodyRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
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

  // Cria faísca / pó de giz na ponta
  const emitirPoGiz = useCallback((el: HTMLElement) => {
    try {
      const puff = document.createElement('span');
      puff.className = 'lz-chalk-dust-spark';
      puff.style.left = `${Math.random() * 8}px`;
      puff.style.top = `${-4 + Math.random() * 8}px`;
      el.appendChild(puff);
      setTimeout(() => puff.remove(), 600);
    } catch {
      // safe
    }
  }, []);

  // Digita letra por letra com efeito de toco de giz 3D oscilante e som procedural
  const lousaType = useCallback((el: HTMLElement, full: string, onDone?: (instant: boolean) => void) => {
    lousaFinishTyping(true);
    (el as any)._full = full;
    (el as any)._onDone = onDone || null;
    lousaTypingElRef.current = el;
    el.classList.add('typing', 'has-giz');

    // Remove destaque ativo de nós anteriores
    const body = lousaBodyRef.current;
    if (body) {
      body.querySelectorAll('.lz-ativo').forEach((n) => n.classList.remove('lz-ativo'));
    }
    el.classList.add('lz-ativo');

    if (!lzGizElRef.current) {
      const g = document.createElement('span');
      g.className = 'lz-giz-3d';
      g.innerHTML = `
        <span class="lz-giz-corpo"></span>
        <span class="lz-giz-ponta"></span>
      `;
      g.setAttribute('aria-hidden', 'true');
      lzGizElRef.current = g;
    }

    let k = 0;
    el.textContent = '';
    const intervalMs = Math.max(14, Math.round(30 / (velocidadeRef.current || 1)));

    lousaTypeTORef.current = setInterval(() => {
      k++;
      el.textContent = full.slice(0, k);

      // Efeito sonoro procedural suave de giz a cada 3 caracteres
      if (k % 3 === 0) {
        lousaAudio.playGizScratch(0.045);
        emitirPoGiz(el);
      }

      if (lzGizElRef.current) {
        el.appendChild(lzGizElRef.current);
        const osc = (k % 4);
        const angulos = ['-16deg', '-6deg', '-12deg', '-3deg'];
        const yOffs = ['-2px', '1px', '-1px', '0px'];
        lzGizElRef.current.style.transform = `rotate(${angulos[osc]}) translateY(${yOffs[osc]})`;
      }
      lousaScroll();
      if (k >= full.length) {
        lousaFinishTyping(false);
      }
    }, intervalMs);
  }, [emitirPoGiz, lousaFinishTyping, lousaScroll]);

  // Revela subitens com marcador dourado de giz
  const lousaRevealItems = useCallback((box: HTMLElement, items: string[], instant: boolean) => {
    items.forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'lz-item';
      const mk = document.createElement('span');
      mk.className = 'lz-item-mark';
      mk.textContent = '✦';
      const tx = document.createElement('span');
      tx.className = 'lz-item-text';
      tx.textContent = it;
      d.appendChild(mk);
      d.appendChild(tx);
      if (instant) {
        d.style.animation = 'none';
        d.style.opacity = '1';
      } else {
        d.style.animationDelay = `${0.1 + i * 0.18}s`;
        setTimeout(() => {
          lousaAudio.playGizScratch(0.035);
        }, (0.1 + i * 0.18) * 1000);
      }
      box.appendChild(d);
    });
    lousaScroll();
  }, [lousaScroll]);

  // Adiciona um item na lousa (título ou ponto) com timestamp interativo
  const lousaAdd = useCallback((e: LousaItem, animate: boolean) => {
    const body = lousaBodyRef.current;
    if (!body) return;

    // Atualiza classes de foco
    body.querySelectorAll('.lz-ativo').forEach((n) => n.classList.remove('lz-ativo'));

    const d = document.createElement('div');
    d.className = e.kind === 'titulo' ? 'lz-titulo lz-ativo' : 'lz-ponto lz-ativo';
    d.title = `Pular para ${fmt(e.t)}`;
    d.setAttribute('data-timestamp', fmt(e.t));

    // Badge sutil de minutagem com visual de giz
    const timeBadge = document.createElement('span');
    timeBadge.className = 'lz-time-badge';
    timeBadge.textContent = fmt(e.t);
    d.appendChild(timeBadge);

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
    const sm = document.getElementById('lzSmudge');
    if (sm) sm.remove();
    lousaErasingRef.current = false;
    setApagadorLimpando(false);
    lousaPendingRef.current = [];
  }, []);

  const lousaFlushGiz = useCallback(() => {
    const giz = lousaPendingRef.current;
    lousaPendingRef.current = [];
    giz.forEach((e, i) => lousaAdd(e, i === giz.length - 1));
  }, [lousaAdd]);

  // Executa o apagador mecânico ultra-realista quando muda de capítulo (kind === 'titulo')
  const lousaErase = useCallback((giz: LousaItem[]) => {
    const body = lousaBodyRef.current;
    const container = lousaContainerRef.current;
    if (!body || !container) {
      giz.forEach((e, i) => lousaAdd(e, i === giz.length - 1));
      return;
    }

    lousaErasingRef.current = true;
    setApagadorLimpando(true);
    lousaFinishTyping(true);
    lousaPendingRef.current = giz.slice();

    // Feedback sonoro e tátil de limpeza de sala de aula
    lousaAudio.playApagadorWhoosh(0.14);
    haptic.medium();
    setTimeout(() => haptic.light(), 800);

    // Fade progressivo em ondas simulando o toque do feltro
    Array.from(body.querySelectorAll('.lz-titulo,.lz-ponto')).forEach((el: any, i) => {
      el.style.transition = 'opacity .42s ease, filter .42s ease';
      el.style.transitionDelay = `${Math.min(i * 0.05, 0.7)}s`;
      el.style.opacity = '0';
      el.style.filter = 'blur(1px)';
    });

    // Camada de resíduo de giz (smudge) deixada pelo apagador
    const smudge = document.createElement('div');
    smudge.id = 'lzSmudge';
    smudge.className = 'lz-chalk-smudge';
    container.appendChild(smudge);

    // Apagador 3D com madeira maciça entalhada e feltro duplo de lã
    const ap = document.createElement('div');
    ap.id = 'lzApag';
    ap.className = 'lz-apagador-3d';
    ap.innerHTML = `
      <div class="wood-handle">
        <div class="finger-groove left"></div>
        <div class="brand-stamp">VACATIO</div>
        <div class="finger-groove right"></div>
      </div>
      <div class="felt-layer dense"></div>
      <div class="felt-layer chalk-dust"></div>
    `;
    container.appendChild(ap);

    // Partículas de nuvem de giz caindo durante a varredura
    for (let p = 0; p < 7; p++) {
      const dust = document.createElement('div');
      dust.className = 'lz-dust-cloud-particle';
      dust.style.left = `${15 + p * 12}%`;
      dust.style.top = `${20 + p * 8}%`;
      dust.style.animationDelay = `${0.2 + p * 0.18}s`;
      container.appendChild(dust);
      setTimeout(() => dust.remove(), 2100);
    }

    requestAnimationFrame(() => requestAnimationFrame(() => ap.classList.add('sweep')));

    lousaEraseTORef.current = setTimeout(() => {
      lousaEraseTORef.current = null;
      const a2 = document.getElementById('lzApag');
      if (a2) a2.remove();
      const sm2 = document.getElementById('lzSmudge');
      if (sm2) sm2.remove();
      body.innerHTML = '';
      lousaErasingRef.current = false;
      setApagadorLimpando(false);
      lousaFlushGiz();
      lousaScroll();
    }, 1950);
  }, [lousaAdd, lousaFinishTyping, lousaFlushGiz, lousaScroll]);

  // Atualiza a coluna de post-its com perguntas da Luna
  const lousaRefreshPosts = useCallback((t: number) => {
    if (!roteiro) return;
    const perguntas = roteiro
      .filter((e) => e.kind === 'pergunta' && e.t <= t)
      .slice(-4);

    setPostItsVisiveis((prev) => {
      if (perguntas.length > prev.length) {
        lousaAudio.playPostitStick(0.09);
        haptic.light();
      }
      return perguntas;
    });
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
    <div
      ref={modalWrapperRef}
      className="fixed inset-0 z-[130] bg-[#120d09] text-[#f7f2ea] flex flex-col overflow-hidden select-none animate-in fade-in duration-200"
    >
      {/* Estilos e animações com fontes caligráficas autênticas e física de lousa */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@400;700&display=swap');

        .lz-font-chalk {
          font-family: 'Kalam', 'Caveat', 'Segoe Print', cursive, sans-serif;
        }

        /* Textura realista de Ardósia Escolar com Granulação e Manchas de Giz */
        .lz-chalkboard-texture {
          background-color: #1c2b23;
          background-image: 
            radial-gradient(circle at 45% 40%, rgba(35, 54, 45, 0.9) 0%, rgba(20, 31, 25, 0.98) 100%),
            repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 6px);
          box-shadow: inset 0 0 80px rgba(0,0,0,0.85);
          position: relative;
        }
        .lz-chalkboard-texture::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.28;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.55'/></svg>");
        }

        /* Partículas flutuantes de poeira de giz no ambiente */
        .lz-ambient-dust {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px);
          background-size: 140px 140px;
          opacity: 0.2;
          animation: lzDustDrift 30s linear infinite alternate;
        }
        @keyframes lzDustDrift {
          from { transform: translateY(0px) translateX(0px); }
          to { transform: translateY(-20px) translateX(15px); }
        }

        /* Título de Giz (Giz Branco puro com traço largo e sublinhado feito à mão) */
        .lz-titulo {
          font-family: 'Kalam', 'Caveat', 'Segoe Print', cursive, sans-serif;
          font-size: clamp(21px, 3.2vw, 32px);
          font-weight: 700;
          color: #fbf8ee;
          line-height: 1.35;
          margin: 12px 0 20px;
          text-shadow: 
            0 0 2px rgba(255,255,255,0.8),
            0 0 7px rgba(255,255,255,0.35),
            1px 2px 2px rgba(0,0,0,0.6);
          border-bottom: 3px dashed rgba(245, 238, 220, 0.7);
          padding-bottom: 8px;
          display: inline-block;
          cursor: pointer;
          position: relative;
          transition: transform 0.15s ease, text-shadow 0.2s ease;
        }
        .lz-titulo:hover {
          transform: scale(1.015);
          text-shadow: 0 0 12px rgba(240, 208, 137, 0.7);
        }

        /* Ponto de Giz (Giz Branco com marcador travessão dourado) */
        .lz-ponto {
          font-family: 'Kalam', 'Caveat', 'Segoe Print', cursive, sans-serif;
          font-size: clamp(16px, 2.3vw, 22px);
          color: #f5f0e3;
          line-height: 1.5;
          margin: 0 0 16px;
          padding-left: 28px;
          position: relative;
          text-shadow: 
            0 0 2px rgba(255,255,255,0.7),
            0 0 5px rgba(255,255,255,0.25),
            1px 1px 2px rgba(0,0,0,0.55);
          cursor: pointer;
          animation: lzIn 0.35s ease-out;
          transition: transform 0.15s ease;
        }
        .lz-ponto:hover {
          transform: translateX(4px);
        }
        .lz-ponto::before {
          content: "–";
          position: absolute;
          left: 6px;
          color: #f2cb73;
          font-weight: bold;
        }

        /* Item em Foco Ativo (Atenção do Estudante com Halo Dourado de Giz) */
        .lz-ativo {
          text-shadow: 
            0 0 2px rgba(255,255,255,0.9),
            0 0 9px rgba(242, 203, 115, 0.75),
            0 0 16px rgba(212, 169, 78, 0.4) !important;
        }

        /* Badge interativa de minutagem de giz [02:15] */
        .lz-time-badge {
          display: none;
          margin-left: 10px;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 11px;
          color: #e5b95d;
          background: rgba(0,0,0,0.45);
          border: 1px solid rgba(229, 185, 93, 0.35);
          padding: 2px 7px;
          border-radius: 6px;
          vertical-align: middle;
          letter-spacing: 0.5px;
        }
        .lz-titulo:hover .lz-time-badge, .lz-ponto:hover .lz-time-badge {
          display: inline-block;
        }

        @keyframes lzIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: none; }
        }

        /* Subitens com Giz Amarelo Dourado de Destaque */
        .lz-item {
          display: flex;
          gap: 10px;
          align-items: baseline;
          margin: 6px 0 8px 22px;
          font-size: 0.94em;
          line-height: 1.45;
          color: #f6d47b;
          text-shadow: 
            0 0 2px rgba(246, 212, 123, 0.8),
            0 0 9px rgba(212, 169, 78, 0.35),
            1px 1px 2px rgba(0,0,0,0.5);
          opacity: 0;
          animation: lzItemIn 0.45s ease-out forwards;
        }
        @keyframes lzItemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: none; }
        }
        .lz-item-mark {
          color: #e2af42;
          font-size: 0.85em;
          flex: none;
        }

        /* GIZ 3D REALISTA COM PONTA CHANFRADA E SOMBRA */
        .lz-giz-3d {
          display: inline-flex;
          align-items: center;
          vertical-align: middle;
          margin-left: 8px;
          position: relative;
          width: 34px;
          height: 12px;
          filter: drop-shadow(2px 4px 4px rgba(0,0,0,0.65));
          transform-origin: left bottom;
          transition: transform 0.06s cubic-bezier(0.2, 0.8, 0.4, 1);
          pointer-events: none;
        }
        .lz-giz-corpo {
          width: 25px;
          height: 10px;
          border-radius: 3px 0 0 3px;
          background: linear-gradient(180deg, #ffffff 0%, #ede6d3 50%, #c4bea8 100%);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -2px 2px rgba(0,0,0,0.25);
        }
        .lz-giz-ponta {
          width: 9px;
          height: 10px;
          background: linear-gradient(135deg, #ffffff 30%, #dfd7be 100%);
          clip-path: polygon(0 0, 100% 35%, 100% 65%, 0 100%);
          box-shadow: inset -1px 0 2px rgba(0,0,0,0.15);
        }

        /* Faísca de pó de giz emitida na ponta */
        .lz-chalk-dust-spark {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255,255,255,0.9);
          border-radius: 50%;
          filter: blur(0.5px);
          pointer-events: none;
          animation: lzSpark 0.5s ease-out forwards;
        }
        @keyframes lzSpark {
          0% { transform: scale(1) translate(0, 0); opacity: 0.9; }
          100% { transform: scale(3.5) translate(8px, -10px); opacity: 0; }
        }

        /* APAGADOR 3D EM MADEIRA NOBRE COM ENCAIXES E FELTRO DUPLO */
        .lz-apagador-3d {
          position: absolute;
          top: -90px;
          left: 12%;
          width: 94px;
          z-index: 25;
          pointer-events: none;
          transform: rotate(-7deg);
          filter: drop-shadow(4px 12px 14px rgba(0,0,0,0.7));
        }
        .lz-apagador-3d .wood-handle {
          height: 28px;
          border-radius: 7px 7px 4px 4px;
          background: linear-gradient(145deg, #a46933 0%, #7d491c 55%, #583311 100%);
          border: 1px solid rgba(0,0,0,0.4);
          box-shadow: inset 0 2px 3px rgba(255,255,255,0.25), inset 0 -2px 3px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 7px;
        }
        .lz-apagador-3d .finger-groove {
          width: 5px;
          height: 14px;
          border-radius: 3px;
          background: rgba(0,0,0,0.35);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.7);
        }
        .lz-apagador-3d .brand-stamp {
          font-family: ui-monospace, sans-serif;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: 2.5px;
          color: rgba(235, 195, 120, 0.7);
          text-shadow: 0 1px 1px rgba(0,0,0,0.8);
        }
        .lz-apagador-3d .felt-layer.dense {
          height: 10px;
          margin: 0 3px;
          background: linear-gradient(180deg, #3d3d3d, #252525);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.8);
        }
        .lz-apagador-3d .felt-layer.chalk-dust {
          height: 6px;
          margin: 0 3px;
          border-radius: 0 0 3px 3px;
          background: linear-gradient(180deg, #2b2b2b 0%, #eae3d0 100%);
          box-shadow: 0 1px 2px rgba(255,255,255,0.2);
        }

        /* Varredura Fluida e Realista do Apagador pela Lousa */
        .lz-apagador-3d.sweep {
          animation: lzSweep3D 1.85s cubic-bezier(0.42, 0, 0.58, 1) forwards;
        }
        @keyframes lzSweep3D {
          0%   { top: -90px; left: 8%;  transform: rotate(-10deg); }
          16%  { top: 8%;    left: 80%; transform: rotate(8deg); }
          32%  { top: 26%;   left: 10%; transform: rotate(-9deg); }
          48%  { top: 45%;   left: 82%; transform: rotate(7deg); }
          64%  { top: 64%;   left: 12%; transform: rotate(-8deg); }
          80%  { top: 82%;   left: 78%; transform: rotate(6deg); }
          100% { top: 110%;  left: 48%; transform: rotate(0deg); }
        }

        /* Nuvem de poeira de giz emitida pelo feltro durante a limpeza */
        .lz-dust-cloud-particle {
          position: absolute;
          width: 28px;
          height: 28px;
          background: radial-gradient(circle, rgba(245,240,225,0.45) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          animation: lzDustFall 1.8s ease-out forwards;
        }
        @keyframes lzDustFall {
          0% { opacity: 0; transform: scale(0.6) translateY(0); }
          30% { opacity: 0.65; transform: scale(1.6) translateY(10px); }
          100% { opacity: 0; transform: scale(2.4) translateY(45px); }
        }

        /* Haze de giz deixado na lousa (Chalkboard Smudge Ghosting) */
        .lz-chalk-smudge {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 80%);
          animation: lzSmudgeFade 2.2s ease-out forwards;
        }
        @keyframes lzSmudgeFade {
          0% { opacity: 0; }
          40% { opacity: 0.8; }
          100% { opacity: 0; }
        }

        /* CALHA INFERIOR DE MADEIRA (CHALK TRAY) COM GIZ E APAGADOR EM REPOUSO */
        .lz-calha-madeira {
          height: 22px;
          background: linear-gradient(180deg, #51351c 0%, #3a2411 60%, #26160a 100%);
          border-top: 2px solid #6b4725;
          box-shadow: 0 -3px 8px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.12);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          position: relative;
          z-index: 22;
        }
        .lz-calha-giz-slot {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lz-calha-giz-piece {
          height: 7px;
          border-radius: 3px;
          box-shadow: 0 2px 3px rgba(0,0,0,0.6);
        }

        /* Post-its 3D da Aluna Luna com Fita Durex e Sombra Curva */
        .postit-card-3d {
          background: linear-gradient(175deg, #ffea88 0%, #fcd64e 65%, #f4ca35 100%);
          color: #382c06;
          border: none;
          border-radius: 3px;
          padding: 12px 14px;
          font-family: Arial, -apple-system, sans-serif;
          font-size: 12px;
          line-height: 1.45;
          text-align: left;
          cursor: pointer;
          box-shadow: 
            2px 8px 18px rgba(0,0,0,0.42),
            0 2px 4px rgba(0,0,0,0.25);
          position: relative;
          transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.4, 1), box-shadow 0.22s ease;
        }
        .postit-card-3d:hover {
          transform: scale(1.05) rotate(0deg) !important;
          box-shadow: 4px 14px 26px rgba(0,0,0,0.6);
          z-index: 10;
        }
        .postit-card-3d .tape {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 16px;
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(1px);
          border: 1px solid rgba(0,0,0,0.06);
          pointer-events: none;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
      `}</style>

      {/* Header com Glassmorphism, Controle de Som e Safe Area */}
      <header
        className="shrink-0 px-4 sm:px-6 pb-2.5 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+0.6rem)] border-b border-white/10 bg-[#17120e]/95 backdrop-blur-xl flex items-center justify-between z-30"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Lousa Mágica · Modo Dinâmico
          </span>
          <span className="hidden sm:inline text-xs text-zinc-400 truncate max-w-xs font-medium">
            {aula.titulo}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botão de Controle de Som Procedural de Giz / ASMR */}
          <button
            type="button"
            onClick={handleToggleSom}
            aria-label={somHabilitado ? 'Silenciar som de giz' : 'Ativar som de giz (ASMR)'}
            title={somHabilitado ? 'Efeitos sonoros de giz ativados' : 'Efeitos sonoros desativados'}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
              somHabilitado
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {somHabilitado ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span className="hidden md:inline text-[11px]">
              {somHabilitado ? 'Som Giz: Ligado' : 'Som: Mudo'}
            </span>
          </button>

          {/* Botão de Tela Cheia */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label="Alternar tela cheia"
            title="Alternar tela cheia"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer"
          >
            {emTelaCheia ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Botão de Fechar */}
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              onFechar();
            }}
            aria-label="Voltar para a aula normal"
            title="Fechar Lousa Mágica"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Corpo da Lousa com Moldura de Madeira Nobre e Calha Inferior */}
      <main className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 max-w-[1260px] w-full mx-auto overflow-hidden">
        <div
          className="flex-1 min-h-0 flex gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #74512e, #4d3319 60%, #634324)',
            boxShadow: '0 25px 70px rgba(0,0,0,0.8), inset 0 2px 6px rgba(255,255,255,0.2)',
          }}
        >
          {/* Quadro Negro Ardósia com Textura, Poeira e Calha */}
          <div
            ref={lousaContainerRef}
            className="lz-chalkboard-texture flex-1 min-w-0 rounded-lg overflow-hidden relative flex flex-col border border-white/5"
          >
            {/* Poeira de giz flutuante sutil no ambiente */}
            <div className="lz-ambient-dust" aria-hidden="true" />

            {/* Área de rolagem do texto escrito de giz */}
            <div
              ref={lousaBodyRef}
              className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-8 py-6 sm:py-8 overscroll-contain select-text lz-font-chalk"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#4a3b2b transparent',
              }}
            >
              {/* O conteúdo dinâmico é injetado e atualizado sincronizado em tempo real */}
            </div>

            {/* Calha de Madeira Inferior (Chalk Tray) com Giz e Apagador em Repouso */}
            <div className="lz-calha-madeira" aria-hidden="true">
              {/* Giz repousado na calha */}
              <div className="lz-calha-giz-slot">
                <div
                  className="lz-calha-giz-piece w-9"
                  style={{ background: 'linear-gradient(180deg, #ffffff, #ded8c5)' }}
                  title="Giz branco"
                />
                <div
                  className="lz-calha-giz-piece w-7"
                  style={{ background: 'linear-gradient(180deg, #ffe083, #d4a94e)' }}
                  title="Giz amarelo"
                />
                <div
                  className="lz-calha-giz-piece w-6 hidden sm:block"
                  style={{ background: 'linear-gradient(180deg, #a7e9ff, #62bede)' }}
                  title="Giz ciano"
                />
              </div>

              {/* Apagador em repouso na calha quando não está limpando */}
              <div className="flex items-center gap-2">
                {!apagadorLimpando && (
                  <div
                    className="h-3.5 w-16 rounded-[3px] shadow-md flex flex-col justify-end overflow-hidden transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(180deg, #8a572a, #563314)',
                      border: '1px solid rgba(0,0,0,0.5)',
                    }}
                    title="Apagador de feltro em repouso"
                  >
                    <div className="h-1 bg-[#222222]" />
                  </div>
                )}
                <span className="text-[10px] text-amber-200/40 font-mono tracking-wider hidden sm:inline">
                  VACATIO · LOUSA V2
                </span>
              </div>
            </div>
          </div>

          {/* Coluna / Mural de Post-its da Aluna Luna */}
          <aside
            ref={postsContainerRef}
            className="w-[130px] sm:w-[205px] flex flex-col gap-3.5 overflow-hidden pt-2 shrink-0 border-l border-white/5 pl-2 sm:pl-3"
            aria-label="Perguntas da aluna Luna"
          >
            <div className="text-[10.5px] sm:text-xs font-bold uppercase tracking-wider text-amber-200/90 px-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                Perguntas
              </span>
              <span className="text-amber-400/80 font-mono font-medium text-[11px] bg-black/25 px-1.5 py-0.5 rounded">
                {postItsVisiveis.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
              {postItsVisiveis.length === 0 ? (
                <div className="p-3 text-[11px] text-amber-200/45 italic text-center rounded-lg bg-black/20 border border-white/5 leading-relaxed">
                  As perguntas formuladas pela aluna durante a explicação surgirão aqui...
                </div>
              ) : (
                postItsVisiveis.map((p, idx) => {
                  const rotacao = idx % 2 === 0 ? '-1.8deg' : '2.2deg';
                  return (
                    <button
                      key={`${p.t}-${idx}`}
                      type="button"
                      onClick={() => {
                        haptic.selection();
                        seek(p.t + 0.01);
                      }}
                      title={`Pular para a pergunta da aluna (${fmt(p.t)})`}
                      style={{ transform: `rotate(${rotacao})` }}
                      className="postit-card-3d group"
                    >
                      <div className="tape" />
                      <span className="block text-zinc-900 font-semibold text-[11.5px] sm:text-[12.5px] leading-snug">
                        "{p.text}"
                      </span>
                      <span className="flex items-center justify-end gap-1 text-[10px] italic text-[#775a14] mt-2 font-mono font-medium">
                        <Clock className="w-2.5 h-2.5" />
                        Luna · {fmt(p.t)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Barra de Player Integrada da Lousa com Timers e Controles */}
      <footer className="shrink-0 bg-[#17120e]/95 backdrop-blur-xl border-t border-white/10 px-4 sm:px-6 py-3 pb-[calc(var(--sai-bottom,env(safe-area-inset-bottom,0px))+0.6rem)] z-30">
        <div className="max-w-[960px] mx-auto flex items-center gap-3 sm:gap-4">
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
          <span className="text-xs font-mono font-medium text-amber-200/90 tabular-nums shrink-0">
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
            aria-label="Buscar no áudio da aula"
            className="flex-1 h-2 rounded-full bg-[#3a2f24] appearance-none cursor-pointer accent-[#f0d089]"
          />

          {/* Duração Total */}
          <span className="text-xs font-mono font-medium text-amber-200/90 tabular-nums shrink-0">
            {dur > 0 ? fmt(dur) : '--:--'}
          </span>

          {/* Voltar 15s */}
          <button
            type="button"
            onClick={() => seek(Math.max(0, tempo - 15))}
            aria-label="Voltar 15 segundos"
            title="Voltar 15s"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition shrink-0 hidden sm:flex cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Avançar 15s */}
          <button
            type="button"
            onClick={() => seek(Math.min(dur, tempo + 15))}
            aria-label="Avançar 15 segundos"
            title="Avançar 15s"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition shrink-0 hidden sm:flex cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Seletor de Velocidade */}
          <select
            value={velocidade}
            onChange={(e) => setVelocidade(Number(e.target.value))}
            aria-label="Velocidade de reprodução"
            className="bg-[#2c2318] text-amber-200 border border-[#4a3b28] rounded-xl px-2.5 py-1.5 text-xs font-semibold cursor-pointer shrink-0 outline-none"
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
