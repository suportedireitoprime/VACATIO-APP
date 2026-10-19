import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  HelpCircle,
  Clock,
  Wind,
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

  // Controle de pressão do giz — acumula micro-variações entre letras
  const gizPressaoRef = useRef<number>(0.7);

  // Estados de interface
  const [emTelaCheia, setEmTelaCheia] = useState<boolean>(false);
  const [apagadorLimpando, setApagadorLimpando] = useState<boolean>(false);
  const [postItsVisiveis, setPostItsVisiveis] = useState<LousaItem[]>([]);

  // Acúmulo de resíduo de pó de giz na calha de madeira e ação de soprar (Item 4)
  const [poCalha, setPoCalha] = useState<number>(18);
  const [soprandoCalha, setSoprandoCalha] = useState<boolean>(false);
  const calhaRef = useRef<HTMLDivElement>(null);

  // Ação interativa de soprar o pó de giz acumulado na calha com física e som
  const handleSoprarCalha = () => {
    if (soprandoCalha || poCalha < 5) return;
    haptic.medium();
    lousaAudio.playSoproSound(0.18);
    setSoprandoCalha(true);

    const calha = calhaRef.current;
    if (calha) {
      for (let i = 0; i < 28; i++) {
        const p = document.createElement('span');
        p.className = 'lz-sopro-particula';
        const dx = (Math.random() - 0.45) * 150;
        const dy = -16 - Math.random() * 65;
        const size = 1.8 + Math.random() * 3.5;
        p.style.setProperty('--dx', `${dx}px`);
        p.style.setProperty('--dy', `${dy}px`);
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${10 + Math.random() * 80}%`;
        p.style.bottom = `${2 + Math.random() * 8}px`;
        p.style.animationDuration = `${0.5 + Math.random() * 0.4}s`;
        calha.appendChild(p);
        setTimeout(() => p.remove(), 1000);
      }
    }

    setTimeout(() => {
      setPoCalha(0);
      setSoprandoCalha(false);
    }, 850);
  };

  // Helper para travar rotação de tela em modo paisagem (landscape) ao abrir tela cheia
  const travarOrientacaoLandscape = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { ScreenOrientation } = await import('@capacitor/screen-orientation');
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } catch (err) {
        console.warn('[LousaMagica] Falha ao travar landscape nativo:', err);
      }
    } else if (typeof screen !== 'undefined' && (screen as any).orientation?.lock) {
      try {
        await (screen.orientation as any).lock('landscape');
      } catch {
        // Ignora caso não suportado no navegador
      }
    }
  };

  // Helper para restaurar a rotação de tela padrão (portrait)
  const restaurarOrientacaoPortrait = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { ScreenOrientation } = await import('@capacitor/screen-orientation');
        await ScreenOrientation.lock({ orientation: 'portrait' });
      } catch (err) {
        console.warn('[LousaMagica] Falha ao restaurar portrait nativo:', err);
      }
    } else if (typeof screen !== 'undefined' && (screen as any).orientation?.unlock) {
      try {
        (screen.orientation as any).unlock();
      } catch {
        // Ignora
      }
    }
  };

  // Fecha modal restaurando fullscreen e rotação portrait
  const fecharComRestauracao = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    restaurarOrientacaoPortrait();
    setEmTelaCheia(false);
    onFechar();
  }, [onFechar]);

  // Alterna modo tela cheia com orientação paisagem automática no mobile / tablet
  const handleToggleFullscreen = async () => {
    haptic.selection();
    if (!document.fullscreenElement && !emTelaCheia) {
      try {
        if (modalWrapperRef.current?.requestFullscreen) {
          await modalWrapperRef.current.requestFullscreen();
        }
      } catch {
        // Fallback
      }
      setEmTelaCheia(true);
      await travarOrientacaoLandscape();
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // Fallback
      }
      setEmTelaCheia(false);
      await restaurarOrientacaoPortrait();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const fs = !!document.fullscreenElement;
      setEmTelaCheia(fs);
      if (!fs) {
        restaurarOrientacaoPortrait();
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      restaurarOrientacaoPortrait();
    };
  }, []);

  // Garante restauração de portrait quando o modal fechar ou desmontar
  useEffect(() => {
    if (!aberto) {
      restaurarOrientacaoPortrait();
    }
  }, [aberto]);

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

  // Finaliza a digitação de giz ativa com animação suave de erguer o giz
  const lousaFinishTyping = useCallback((instant: boolean) => {
    if (lousaTypingElRef.current) {
      const el = lousaTypingElRef.current as any;
      const cb = el._onDone;
      el._onDone = null;
      el.classList.remove('has-giz', 'typing');

      // Garante o texto final consolidado e nítido
      const fullText = el._full || '';
      el.textContent = fullText;
      lousaTypingElRef.current = null;

      const anchor = lzGizElRef.current;
      if (anchor) {
        if (instant) {
          anchor.remove();
        } else {
          el.appendChild(anchor);
          const giz3d = anchor.querySelector('.lz-giz-3d') as HTMLElement;
          if (giz3d) {
            giz3d.classList.add('is-lifting');
          }
          setTimeout(() => {
            anchor.remove();
          }, 320);
        }
      }

      if (cb) cb(!!instant);
    }
    if (lousaTypeTORef.current) {
      clearInterval(lousaTypeTORef.current);
      lousaTypeTORef.current = null;
    }
  }, []);

  // Emite micro-partículas sutis de pó de giz que flutuam suavemente
  const emitirPoGiz = useCallback((el: HTMLElement) => {
    try {
      const puff = document.createElement('span');
      puff.className = 'lz-chalk-dust-spark';
      const dx = (Math.random() - 0.45) * 8;
      const dy = 4 + Math.random() * 8;
      const size = 1.6 + Math.random() * 1.6;
      puff.style.setProperty('--dx', `${dx}px`);
      puff.style.setProperty('--dy', `${dy}px`);
      puff.style.width = `${size}px`;
      puff.style.height = `${size}px`;
      puff.style.left = `${Math.random() * 3}px`;
      puff.style.bottom = `${Math.random() * 2}px`;
      el.appendChild(puff);
      setTimeout(() => puff.remove(), 600);
    } catch {
      // safe
    }
  }, []);

  // Digita letra por letra com caligrafia fluida, cadenciada e elegante
  const lousaType = useCallback((el: HTMLElement, full: string, isCapitulo: boolean, onDone?: (instant: boolean) => void) => {
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

    // Cria ou reutiliza a âncora do Giz 3D Refinado e Esbelto (zero-width anchor)
    if (!lzGizElRef.current) {
      const anchor = document.createElement('span');
      anchor.className = 'lz-giz-anchor';
      anchor.setAttribute('aria-hidden', 'true');
      anchor.innerHTML = `
        <span class="lz-giz-3d">
          <span class="lz-giz-contato"></span>
          <span class="lz-giz-ponta"></span>
          <span class="lz-giz-corpo"></span>
        </span>
      `;
      lzGizElRef.current = anchor;
    }

    const anchor = lzGizElRef.current;
    const giz3d = anchor.querySelector('.lz-giz-3d') as HTMLElement;
    if (giz3d) {
      giz3d.classList.remove('is-lifting');
      if (isCapitulo) {
        giz3d.classList.add('is-yellow');
      } else {
        giz3d.classList.remove('is-yellow');
      }
    }

    // Inicializa o elemento com text node estável e o giz acoplado imediatamente após
    el.textContent = '';
    const textoNode = document.createTextNode('');
    el.appendChild(textoNode);
    el.appendChild(anchor);

    let k = 0;
    const intervalMs = Math.max(16, Math.round(28 / (velocidadeRef.current || 1)));

    lousaTypeTORef.current = setInterval(() => {
      k++;
      if (k > full.length) {
        lousaFinishTyping(false);
        return;
      }

      const ch = full[k - 1];
      const isEspaco = ch === ' ';

      // Revela o texto de forma nítida e contínua sem quebras ou saltos
      textoNode.textContent = full.slice(0, k);

      // Movimento caligráfico elegante e suave:
      // No espaço: elevação suave de respiro da mão (lift between words)
      // Nas letras: micro-ondulação harmônica cadenciada
      if (giz3d) {
        if (isEspaco) {
          giz3d.style.transform = 'rotate(-26deg) translate(2px, -4px)';
        } else {
          const microAngulo = -36 + Math.sin(k * 0.75) * 1.6;
          const microY = Math.cos(k * 0.75) * 0.5;
          giz3d.style.transform = `rotate(${microAngulo}deg) translateY(${microY}px)`;
        }
      }

      // Efeito sonoro procedural suave de giz e micro-pó
      if (!isEspaco && k % 3 === 0) {
        const pitch = 0.85 + (ch.charCodeAt(0) % 15) * 0.025;
        lousaAudio.playGizScratch(0.025, pitch);
        emitirPoGiz(el);
        setPoCalha((prev) => (prev < 100 ? prev + 0.04 : 100));
      }

      lousaScroll();
      if (k >= full.length) {
        lousaFinishTyping(false);
      }
    }, intervalMs);
  }, [emitirPoGiz, lousaFinishTyping, lousaScroll]);

  // Revela subitens com marcador desenhado e aparição sequencial orgânica
  const lousaRevealItems = useCallback((box: HTMLElement, items: string[], instant: boolean) => {
    items.forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'lz-item';

      // Marcador com efeito de "pontinho desenhado" em vez de apenas aparecer
      const mk = document.createElement('span');
      mk.className = 'lz-item-mark';
      mk.innerHTML = '<span class="lz-item-dot"></span>';

      const tx = document.createElement('span');
      tx.className = 'lz-item-text';

      if (instant) {
        tx.textContent = it;
        d.style.animation = 'none';
        d.style.opacity = '1';
        mk.style.animation = 'none';
        mk.style.opacity = '1';
      } else {
        // Texto aparece letra por letra com delay cascata
        const delay = 0.12 + i * 0.22;
        d.style.animationDelay = `${delay}s`;
        mk.style.animationDelay = `${delay - 0.05}s`;

        // Texto se revela progressivamente dentro do item
        tx.textContent = '';
        const txtDelay = (delay + 0.1) * 1000;
        setTimeout(() => {
          let ci = 0;
          const typeItem = setInterval(() => {
            ci++;
            tx.textContent = it.slice(0, ci);
            if (ci >= it.length) clearInterval(typeItem);
          }, Math.max(10, 18 / (velocidadeRef.current || 1)));
          lousaAudio.playGizScratch(0.025);
        }, txtDelay);
      }

      d.appendChild(mk);
      d.appendChild(tx);
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

    const isCapitulo = e.kind === 'titulo';
    const d = document.createElement('div');
    d.className = isCapitulo ? 'lz-titulo lz-ativo' : 'lz-ponto lz-ativo';
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
        if (e.text) lousaType(head, e.text, false, show);
        else show(false);
      } else {
        if (e.text) head.textContent = e.text;
        show(true);
      }
    } else {
      const textSpan = document.createElement('span');
      textSpan.className = 'lz-text-content';
      d.appendChild(textSpan);
      if (animate) lousaType(textSpan, e.text, isCapitulo);
      else textSpan.textContent = e.text;
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
    lousaAudio.playApagadorWhoosh(0.12);
    haptic.medium();
    setTimeout(() => haptic.light(), 800);
    setPoCalha((prev) => Math.min(100, prev + 22));

    // Fade progressivo suave com efeito de "borrar" o texto antes de sumir
    Array.from(body.querySelectorAll('.lz-titulo,.lz-ponto')).forEach((el: any, i) => {
      el.style.transition = 'opacity .38s ease, filter .4s ease, transform .3s ease';
      el.style.transitionDelay = `${Math.min(i * 0.04, 0.6)}s`;
      el.style.opacity = '0';
      el.style.filter = 'blur(2px)';
      el.style.transform = 'translateX(3px)';
    });

    // Camada de resíduo de giz (smudge) deixada pelo apagador
    const smudge = document.createElement('div');
    smudge.id = 'lzSmudge';
    smudge.className = 'lz-chalk-smudge';
    container.appendChild(smudge);

    // Marcas de passada do apagador (linhas horizontais suaves)
    for (let s = 0; s < 4; s++) {
      const streak = document.createElement('div');
      streak.className = 'lz-eraser-streak';
      streak.style.top = `${15 + s * 20}%`;
      streak.style.animationDelay = `${0.2 + s * 0.3}s`;
      container.appendChild(streak);
      setTimeout(() => streak.remove(), 2200);
    }

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

    // Partículas de nuvem de giz caindo durante a varredura — mais realistas
    for (let p = 0; p < 8; p++) {
      const dust = document.createElement('div');
      dust.className = 'lz-dust-cloud-particle';
      dust.style.left = `${12 + p * 10}%`;
      dust.style.top = `${15 + p * 9}%`;
      dust.style.animationDelay = `${0.12 + p * 0.14}s`;
      dust.style.setProperty('--drift', `${(Math.random() - 0.5) * 20}px`);
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
    }, 1850);
  }, [lousaAdd, lousaFinishTyping, lousaFlushGiz, lousaScroll]);

  // Atualiza a coluna de post-its com perguntas da Aluna (MAIS RECENTE NO TOPO)
  const lousaRefreshPosts = useCallback((t: number) => {
    if (!roteiro) return;
    // Pega as perguntas até o momento atual e inverte para a mais recente ficar no início do carrossel
    const perguntas = roteiro
      .filter((e) => e.kind === 'pergunta' && e.t <= t)
      .slice(-10)
      .reverse();

    setPostItsVisiveis((prev) => {
      // Otimização de desempenho: só re-renderiza se realmente mudou
      if (
        prev.length === perguntas.length &&
        prev.length > 0 &&
        prev[0].t === perguntas[0]?.t
      ) {
        return prev;
      }
      if (perguntas.length > prev.length) {
        lousaAudio.playPostitStick(0.09);
        haptic.light();
        requestAnimationFrame(() => {
          if (postsContainerRef.current) {
            const scroller = postsContainerRef.current.querySelector('.lz-postits-scroller');
            if (scroller) {
              scroller.scrollTo({ left: 0, behavior: 'smooth' });
            }
          }
        });
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
      {/* SVG Filter para textura granular realista de giz (feTurbulence) */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="chalkGrain" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.2" xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feGaussianBlur in="rough" stdDeviation="0.25" result="softChalk" />
            <feMerge>
              <feMergeNode in="softChalk" />
            </feMerge>
          </filter>
          <filter id="chalkGrainYellow" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.0" xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feGaussianBlur in="rough" stdDeviation="0.2" result="softChalk" />
            <feMerge>
              <feMergeNode in="softChalk" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Estilos calibrados: giz com textura SVG turbulence, pressão variável e pó realista */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@400;700&display=swap');

        .lz-font-chalk {
          font-family: 'Kalam', 'Caveat', 'Segoe Print', cursive, sans-serif;
        }

        /* Textura de ardósia nítida e escura com granulação refinada de pedra real */
        .lz-chalkboard-texture {
          background-color: #1a2720;
          background-image: 
            radial-gradient(circle at 50% 35%, rgba(32, 48, 40, 0.95) 0%, rgba(18, 28, 22, 0.98) 100%),
            repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.005) 3px, rgba(255,255,255,0.005) 6px),
            repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(255,255,255,0.003) 5px, rgba(255,255,255,0.003) 10px);
          box-shadow: inset 0 0 80px rgba(0,0,0,0.9);
          position: relative;
        }
        /* Micro-textura de arranhões na ardósia */
        .lz-chalkboard-texture::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            repeating-linear-gradient(
              -5deg,
              transparent,
              transparent 12px,
              rgba(255,255,255,0.008) 12px,
              rgba(255,255,255,0.008) 13px
            );
          pointer-events: none;
          z-index: 1;
        }

        /* Letras individuais com revelação suave e nítida de traço de giz */
        .lz-letras-container {
          display: inline;
        }
        .lz-letra {
          display: inline;
          animation: lzGizStrokeIn 0.12s ease-out forwards;
        }
        @keyframes lzGizStrokeIn {
          0% { opacity: 0; filter: blur(0.7px); }
          100% { opacity: 1; filter: none; }
        }

        /* =============================================
           CAPÍTULO: GIZ AMARELO DOURADO COM TEXTURA SVG
           ============================================= */
        .lz-titulo {
          font-family: 'Kalam', 'Caveat', 'Segoe Print', cursive, sans-serif;
          font-size: clamp(21px, 3.2vw, 32px);
          font-weight: 700;
          color: #f7d070;
          line-height: 1.35;
          margin: 10px 0 18px;
          text-shadow: 
            1px 1px 1px rgba(0,0,0,0.85),
            0 0 2px rgba(247, 208, 112, 0.15);
          border-bottom: 2px dashed rgba(247, 208, 112, 0.55);
          padding-bottom: 6px;
          display: block;
          cursor: pointer;
          position: relative;
          transition: transform 0.15s ease, color 0.15s ease;
          filter: url(#chalkGrainYellow);
        }
        .lz-titulo:hover {
          transform: scale(1.015);
          color: #ffe28a;
        }

        /* =============================================
           PONTOS DA AULA: GIZ BRANCO COM TEXTURA SVG
           ============================================= */
        .lz-ponto {
          font-family: 'Kalam', 'Caveat', 'Segoe Print', cursive, sans-serif;
          font-size: clamp(16px, 2.3vw, 22px);
          color: #f2eee5;
          line-height: 1.48;
          margin: 0 0 14px;
          padding-left: 26px;
          position: relative;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.8);
          cursor: pointer;
          animation: lzIn 0.28s ease-out;
          transition: transform 0.15s ease, color 0.15s ease;
          filter: url(#chalkGrain);
        }
        .lz-ponto:hover {
          transform: translateX(3px);
          color: #ffffff;
        }
        .lz-ponto::before {
          content: "–";
          position: absolute;
          left: 6px;
          color: #f7d070;
          font-weight: bold;
          filter: url(#chalkGrainYellow);
        }

        /* PONTO ATIVO: Destaque sutil sem estourar o brilho */
        .lz-ativo {
          color: #ffffff !important;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.9), 0 0 1px rgba(255,255,255,0.5) !important;
        }
        .lz-titulo.lz-ativo {
          color: #fce18d !important;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.9), 0 0 1px rgba(252, 225, 141, 0.5) !important;
        }

        /* Badge discreta de minutagem [02:15] */
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
          filter: none;
        }
        .lz-titulo:hover .lz-time-badge, .lz-ponto:hover .lz-time-badge {
          display: inline-block;
        }

        @keyframes lzIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: none; }
        }

        /* Subitens com ponto desenhado e texto escrito progressivamente */
        .lz-item {
          display: flex;
          gap: 10px;
          align-items: baseline;
          margin: 6px 0 8px 22px;
          font-size: 0.94em;
          line-height: 1.45;
          color: #f7d070;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.8);
          opacity: 0;
          animation: lzItemIn 0.35s ease-out forwards;
          filter: url(#chalkGrainYellow);
        }
        @keyframes lzItemIn {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to { opacity: 1; transform: none; }
        }
        .lz-item-mark {
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          animation: lzDotDraw 0.3s ease-out forwards;
        }
        @keyframes lzDotDraw {
          0% { opacity: 0; transform: scale(0.2); }
          60% { opacity: 1; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
        /* Ponto circular desenhado (bullet) — simulando pressão de giz */
        .lz-item-dot {
          display: block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, #ffe599, #d4a94e);
          box-shadow: 0 0 3px rgba(247, 208, 112, 0.4);
        }

        /* =============================================
           GIZ ESCOLAR ELEGANTE E REFINADO COM ÂNCORA ZERO-WIDTH
           ============================================= */
        .lz-giz-anchor {
          display: inline-block;
          width: 0;
          height: 0;
          overflow: visible;
          position: relative;
          vertical-align: baseline;
          pointer-events: none;
          z-index: 25;
        }

        .lz-giz-3d {
          position: absolute;
          left: 2px;
          bottom: 0px;
          display: flex;
          align-items: flex-end;
          pointer-events: none;
          transform-origin: 0% 100%;
          transform: rotate(-36deg);
          transition: transform 0.06s ease-out, opacity 0.25s ease;
          filter: drop-shadow(1px 2px 3px rgba(0,0,0,0.45));
        }
        /* Ponta chanfrada de precisão */
        .lz-giz-ponta {
          width: 5px;
          height: 6px;
          flex: none;
          background: linear-gradient(135deg, #ffffff 40%, #ded7c1 85%, #b8b096 100%);
          clip-path: polygon(0% 100%, 75% 0%, 100% 25%, 25% 100%);
        }
        /* Bastão cilíndrico de giz com acabamento acetinado */
        .lz-giz-corpo {
          width: 22px;
          height: 6px;
          margin-left: -1px;
          margin-bottom: 1px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(
            180deg, 
            #ffffff 0%, 
            #f6f2e8 25%,
            #eee7d5 55%, 
            #dcd3bc 85%,
            #c8be9f 100%
          );
          box-shadow: 
            inset 0 1px 1px rgba(255,255,255,0.9), 
            inset 0 -1px 2px rgba(0,0,0,0.2);
        }
        /* Ponto suave de contato com leve halo de pó */
        .lz-giz-contato {
          position: absolute;
          left: -1px;
          bottom: -1px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 80%);
          pointer-events: none;
        }

        /* GIZ AMARELO OURO PARA CAPÍTULOS */
        .lz-giz-3d.is-yellow .lz-giz-ponta {
          background: linear-gradient(135deg, #fff2aa 40%, #e6b83f 85%, #d4a02e 100%);
        }
        .lz-giz-3d.is-yellow .lz-giz-corpo {
          background: linear-gradient(
            180deg, 
            #fff5b8 0%, 
            #fce08a 25%,
            #f7cb5c 55%, 
            #e8b340 85%,
            #d49f2b 100%
          );
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.25);
        }
        .lz-giz-3d.is-yellow .lz-giz-contato {
          background: radial-gradient(circle, rgba(247,208,112,0.75) 0%, transparent 80%);
        }

        /* Animação suave e fluida de erguer o giz ao finalizar a frase */
        .lz-giz-3d.is-lifting {
          transform: rotate(-22deg) translate(6px, -12px) !important;
          opacity: 0 !important;
          transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease !important;
        }

        /* Micro-partículas sutis de pó de giz */
        .lz-chalk-dust-spark {
          position: absolute;
          background: rgba(255,255,255,0.65);
          border-radius: 50%;
          pointer-events: none;
          animation: lzDustDrift 0.55s ease-out forwards;
        }
        @keyframes lzDustDrift {
          0% { 
            transform: translate(0, 0) scale(1); 
            opacity: 0.75; 
          }
          100% { 
            transform: translate(var(--dx, 2px), var(--dy, 6px)) scale(0.4); 
            opacity: 0; 
          }
        }

        /* Trilha de resíduo de giz (marca de atrito) */
        .lz-chalk-trail {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          pointer-events: none;
          animation: lzTrailFade 2.2s ease-out forwards;
        }
        @keyframes lzTrailFade {
          0% { opacity: 0.5; }
          100% { opacity: 0; }
        }

        /* =============================================
           APAGADOR 3D EM MADEIRA NOBRE COM FELTRO DUPLO
           ============================================= */
        .lz-apagador-3d {
          position: absolute;
          top: -90px;
          left: 12%;
          width: 96px;
          z-index: 25;
          pointer-events: none;
          transform: rotate(-7deg);
          filter: drop-shadow(4px 12px 16px rgba(0,0,0,0.75));
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

        /* Varredura Fluida do Apagador */
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

        /* Marcas de passada do apagador na lousa */
        .lz-eraser-streak {
          position: absolute;
          left: 5%;
          right: 5%;
          height: 3px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.04) 80%, transparent 100%);
          pointer-events: none;
          opacity: 0;
          animation: lzStreakReveal 1.8s ease-out forwards;
        }
        @keyframes lzStreakReveal {
          0% { opacity: 0; transform: scaleX(0.3); }
          30% { opacity: 0.7; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(1.05); }
        }

        /* Partículas de pó de giz caindo durante a limpeza */
        .lz-dust-cloud-particle {
          position: absolute;
          width: 22px;
          height: 22px;
          background: radial-gradient(circle, rgba(245,240,225,0.35) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          animation: lzDustFall 1.9s ease-out forwards;
        }
        @keyframes lzDustFall {
          0% { opacity: 0; transform: scale(0.5) translate(0, 0); }
          25% { opacity: 0.55; transform: scale(1.4) translate(var(--drift, 0px), 8px); }
          100% { opacity: 0; transform: scale(2) translate(var(--drift, 0px), 45px); }
        }

        /* Smudge suave após apagamento */
        .lz-chalk-smudge {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 80%);
          animation: lzSmudgeFade 2.2s ease-out forwards;
        }
        @keyframes lzSmudgeFade {
          0% { opacity: 0; }
          35% { opacity: 0.8; }
          100% { opacity: 0; }
        }

        /* CALHA INFERIOR DE MADEIRA COM GIZ E APAGADOR */
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

        /* Camada de pó de giz acumulado no fundo da calha (Item 4) */
        .lz-calha-dust-layer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          pointer-events: none;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 250, 235, 0.35) 40%,
            rgba(255, 245, 220, 0.82) 100%
          );
          border-radius: 0 0 2px 2px;
          box-shadow: 0 0 6px rgba(255, 250, 230, 0.45);
          transition: height 0.3s ease, opacity 0.3s ease;
          z-index: 2;
        }

        /* Partículas de pó voando ao soprar a calha */
        .lz-sopro-particula {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(247, 208, 112, 0.6) 50%, transparent 80%);
          pointer-events: none;
          z-index: 30;
          animation: lzSoproFly ease-out forwards;
        }
        @keyframes lzSoproFly {
          0% {
            opacity: 0.95;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--dx), var(--dy)) scale(2.2);
          }
        }

        /* POST-IT ATIVO (MAIS RECENTE - TOPO): AMARELO VIBRANTE */
        .postit-card-ativo {
          background: linear-gradient(175deg, #ffea88 0%, #fcd64e 65%, #f4ca35 100%);
          box-shadow: 
            2px 8px 18px rgba(0,0,0,0.45),
            0 2px 4px rgba(0,0,0,0.25);
          position: relative;
          border-radius: 3px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          animation: lzPostitSlap 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes lzPostitSlap {
          0% { transform: scale(0.7) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.06) rotate(1deg); opacity: 1; }
          100% { transform: scale(1) rotate(var(--rot, -1.8deg)); opacity: 1; }
        }
        .postit-card-ativo:hover {
          transform: scale(1.04) rotate(0deg) !important;
          box-shadow: 4px 14px 26px rgba(0,0,0,0.6);
        }
        .postit-card-ativo .tape {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 16px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(1px);
          border: 1px solid rgba(0,0,0,0.06);
          pointer-events: none;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }

        /* POST-ITS ANTERIORES: ACINZENTADOS/ESCURECIDOS EM SEGUNDO PLANO */
        .postit-card-antigo {
          background: linear-gradient(175deg, #372f27 0%, #29221b 100%);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 1px 4px 12px rgba(0,0,0,0.35);
          opacity: 0.78;
          position: relative;
          border-radius: 3px;
          transition: transform 0.2s ease, opacity 0.2s ease, background 0.2s ease;
        }
        .postit-card-antigo:hover {
          opacity: 1;
          transform: scale(1.03) rotate(0deg) !important;
          background: linear-gradient(175deg, #443a31 0%, #302821 100%);
        }
        .postit-card-antigo .tape {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 44px;
          height: 15px;
          background: rgba(255, 255, 255, 0.22);
          border: 1px solid rgba(0,0,0,0.15);
          pointer-events: none;
        }

        /* Carrossel horizontal de post-its com rolagem suave sem scrollbar visível */
        .lz-postits-scroller::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Header Integrado com Controles de Áudio, Barra de Progresso e Ações */}
      <header
        className="shrink-0 px-3 sm:px-5 py-2.5 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+0.6rem)] border-b border-white/10 bg-[#17120e]/95 backdrop-blur-xl flex items-center gap-2 sm:gap-3.5 z-30"
      >
        {/* Botão Play / Pause Dourado */}
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            togglePlay();
          }}
          aria-label={tocando ? 'Pausar aula' : 'Reproduzir aula'}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition shadow-md cursor-pointer"
          style={{
            background: 'linear-gradient(145deg, #f0d089, #d4a94e)',
            color: '#241a08',
            boxShadow: '0 4px 14px -3px rgba(212,169,78,0.5)',
          }}
        >
          {tocando ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-[#241a08]" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-[#241a08] ml-0.5" />
          )}
        </button>

        {/* Tempo Atual */}
        <span className="text-[11px] sm:text-xs font-mono font-medium text-amber-200/90 tabular-nums shrink-0">
          {fmt(tempo)}
        </span>

        {/* Barra de Progresso com Seek Range Slider */}
        <div className="flex-1 min-w-[70px] sm:min-w-[120px] flex items-center">
          <input
            type="range"
            min={0}
            max={dur > 0 ? dur : 100}
            step={0.1}
            value={dur > 0 ? tempo : 0}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Buscar no áudio da aula"
            className="w-full h-2 rounded-full bg-[#3a2f24] appearance-none cursor-pointer accent-[#f0d089]"
          />
        </div>

        {/* Duração Total */}
        <span className="text-[11px] sm:text-xs font-mono font-medium text-amber-200/90 tabular-nums shrink-0">
          {dur > 0 ? fmt(dur) : '--:--'}
        </span>

        {/* Voltar 15s */}
        <button
          type="button"
          onClick={() => seek(Math.max(0, tempo - 15))}
          aria-label="Voltar 15 segundos"
          title="Voltar 15s"
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 hidden md:flex items-center justify-center text-zinc-300 hover:text-white transition shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Avançar 15s */}
        <button
          type="button"
          onClick={() => seek(Math.min(dur, tempo + 15))}
          aria-label="Avançar 15 segundos"
          title="Avançar 15s"
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 hidden md:flex items-center justify-center text-zinc-300 hover:text-white transition shrink-0 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Seletor de Velocidade */}
        <select
          value={velocidade}
          onChange={(e) => setVelocidade(Number(e.target.value))}
          aria-label="Velocidade de reprodução"
          className="bg-[#2c2318] text-amber-200 border border-[#4a3b28] rounded-xl px-2 py-1 text-[11px] sm:text-xs font-semibold cursor-pointer shrink-0 outline-none"
        >
          {VELOCIDADES.map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>

        {/* Botão de Tela Cheia com Modo Paisagem (Landscape) */}
        <button
          type="button"
          onClick={handleToggleFullscreen}
          aria-label="Alternar tela cheia"
          title={emTelaCheia ? 'Sair da tela cheia' : 'Tela cheia em modo horizontal (paisagem)'}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
        >
          {emTelaCheia ? (
            <Minimize2 className="w-4 h-4 text-amber-300" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        {/* Botão de Fechar */}
        <button
          type="button"
          onClick={fecharComRestauracao}
          aria-label="Fechar Lousa Mágica"
          title="Fechar Lousa Mágica"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition cursor-pointer shrink-0"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* Corpo da Lousa com Moldura de Madeira Nobre ocupando todo o espaço vertical */}
      <main className="flex-1 min-h-0 flex flex-col p-2 sm:p-3.5 max-w-[1600px] w-full mx-auto overflow-hidden pb-[calc(var(--sai-bottom,env(safe-area-inset-bottom,0px))+0.6rem)]">
        {/* Lousa Mágica com Moldura de Madeira Nobre */}
        <div
          className="flex-1 min-h-0 flex flex-col gap-2 p-2 sm:p-3.5 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #74512e, #4d3319 60%, #634324)',
            boxShadow: '0 25px 70px rgba(0,0,0,0.8), inset 0 2px 6px rgba(255,255,255,0.2)',
          }}
        >
          {/* Carrossel Superior de Post-its com Perguntas da Aluna (Topo) */}
          {postItsVisiveis.length > 0 && (
            <aside
              ref={postsContainerRef}
              className="shrink-0 w-full flex flex-col gap-1 overflow-hidden"
              aria-label="Perguntas da aluna em carrossel"
            >
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-200/90 px-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  Perguntas da Aluna
                </span>
                <span className="text-amber-400/80 font-mono font-medium text-[10px] bg-black/35 px-2 py-0.5 rounded-full border border-white/10">
                  {postItsVisiveis.length} {postItsVisiveis.length === 1 ? 'pergunta' : 'perguntas'} · deslize
                </span>
              </div>

              <div
                className="lz-postits-scroller flex items-stretch gap-3 overflow-x-auto pt-2.5 pb-2 px-1.5 scroll-smooth overscroll-x-contain select-none"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {postItsVisiveis.map((p, idx) => {
                  const isMaisRecente = idx === 0;
                  const rotacao = idx % 2 === 0 ? '-1.2deg' : '1.4deg';

                  return (
                    <button
                      key={`${p.t}-${idx}`}
                      type="button"
                      onClick={() => {
                        haptic.selection();
                        seek(p.t + 0.01);
                      }}
                      title={`Pular para a pergunta da aluna (${fmt(p.t)})`}
                      style={{ transform: `rotate(${rotacao})`, '--rot': rotacao } as React.CSSProperties}
                      className={`shrink-0 w-[205px] sm:w-[250px] text-left p-2.5 sm:p-3 pt-3 sm:pt-3.5 cursor-pointer rounded transition-all active:scale-95 flex flex-col justify-between shadow-md ${
                        isMaisRecente ? 'postit-card-ativo' : 'postit-card-antigo'
                      }`}
                    >
                      <div className="tape" />

                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          {isMaisRecente ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-amber-950/20 text-amber-950">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-ping" />
                              Mais recente
                            </span>
                          ) : (
                            <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-200/50">
                              Pergunta #{postItsVisiveis.length - idx}
                            </span>
                          )}

                          <span
                            className={`flex items-center gap-1 text-[9px] font-mono font-medium ${
                              isMaisRecente ? 'text-[#6d510e]' : 'text-zinc-400'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {fmt(p.t)}
                          </span>
                        </div>

                        <span
                          className={`block font-semibold text-[11px] sm:text-[11.5px] line-clamp-2 leading-snug ${
                            isMaisRecente ? 'text-zinc-950' : 'text-zinc-200'
                          }`}
                        >
                          "{p.text}"
                        </span>
                      </div>

                      <span
                        className={`text-right text-[8.5px] italic mt-1 font-mono ${
                          isMaisRecente ? 'text-[#775a14]' : 'text-zinc-400'
                        }`}
                      >
                        Toque para ouvir
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Quadro Negro Ardósia com Textura e Calha de Madeira (Abaixo dos Post-its, ocupando largura total) */}
          <div
            ref={lousaContainerRef}
            className="lz-chalkboard-texture flex-1 min-h-0 w-full rounded-lg overflow-hidden relative flex flex-col border border-white/5"
          >
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

            {/* Calha de Madeira Inferior (Chalk Tray) com Giz, Apagador e Acúmulo de Pó (Item 4) */}
            <div ref={calhaRef} className="lz-calha-madeira relative" aria-label="Calha de giz">
              {/* Camada orgânica de pó de giz acumulado no fundo da calha */}
              <div
                className="lz-calha-dust-layer"
                style={{
                  opacity: 0.15 + (poCalha / 100) * 0.82,
                  height: `${Math.min(9, 2 + (poCalha / 100) * 7)}px`,
                }}
              />

              {/* Giz repousado na calha */}
              <div className="lz-calha-giz-slot z-10">
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

              {/* Centro da Calha: Ação interativa de Soprar o pó de giz */}
              <div className="z-10 flex items-center">
                {poCalha >= 15 && (
                  <button
                    type="button"
                    onClick={handleSoprarCalha}
                    disabled={soprandoCalha}
                    aria-label="Soprar o pó de giz da calha"
                    title="Soprar o pó acumulado na calha"
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/50 hover:bg-black/75 border border-amber-200/25 text-amber-200/90 hover:text-amber-100 text-[10px] font-mono transition cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Wind className={`w-3 h-3 text-amber-300 ${soprandoCalha ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Soprar calha</span>
                    <span className="text-[9px] text-amber-400/90 font-bold">({Math.round(poCalha)}%)</span>
                  </button>
                )}
              </div>

              {/* Apagador em repouso na calha quando não está limpando */}
              <div className="flex items-center gap-2 z-10">
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
                  VACATIO · LOUSA
                </span>
              </div>
            </div>
          </div>


        </div>
      </main>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalNode, document.body);
};

export default LousaMagicaModal;
