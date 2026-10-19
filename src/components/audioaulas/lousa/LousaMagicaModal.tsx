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
  Lightbulb,
  Wind,
  BookOpen,
  Columns2,
  CheckCircle2,
  ChevronRight,
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
  const [somHabilitado, setSomHabilitado] = useState<boolean>(() => lousaAudio.isEnabled());
  const [emTelaCheia, setEmTelaCheia] = useState<boolean>(false);
  const [apagadorLimpando, setApagadorLimpando] = useState<boolean>(false);
  const [postItsVisiveis, setPostItsVisiveis] = useState<LousaItem[]>([]);

  // Iluminação cênica da lousa com foco de luz superior (Item 5)
  const [iluminacaoCenica, setIluminacaoCenica] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('aa_lousa_spotlight') !== 'false';
  });

  // Acúmulo de resíduo de pó de giz na calha de madeira e ação de soprar (Item 4)
  const [poCalha, setPoCalha] = useState<number>(18);
  const [soprandoCalha, setSoprandoCalha] = useState<boolean>(false);
  const calhaRef = useRef<HTMLDivElement>(null);

  // Layout Adaptativo Split-View para Tablets e Telas Grandes (Item 11)
  const [splitViewAtivo, setSplitViewAtivo] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024;
  });
  const [drawerCadernoAberto, setDrawerCadernoAberto] = useState<boolean>(false);
  const [abaCaderno, setAbaCaderno] = useState<'capitulos' | 'pontos' | 'perguntas'>('capitulos');

  // Alterna iluminação cênica da lousa
  const handleToggleIluminacao = () => {
    haptic.selection();
    setIluminacaoCenica((prev) => {
      const next = !prev;
      localStorage.setItem('aa_lousa_spotlight', String(next));
      return next;
    });
  };

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

  // Extração de dados da aula para o Caderno de Estudos (Split-View)
  const capitulos = React.useMemo(() => {
    if (!roteiro) return [];
    return roteiro.filter((e) => e.kind === 'titulo');
  }, [roteiro]);

  const capituloAtualIdx = React.useMemo(() => {
    if (!capitulos || capitulos.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < capitulos.length; i++) {
      if (capitulos[i].t <= tempo) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [capitulos, tempo]);

  const pontosChave = React.useMemo(() => {
    if (!roteiro) return [];
    return roteiro.filter((e) => e.kind === 'ponto' && (e.text || (e.items && e.items.length > 0)));
  }, [roteiro]);

  const todasPerguntas = React.useMemo(() => {
    if (!roteiro) return [];
    return roteiro.filter((e) => e.kind === 'pergunta');
  }, [roteiro]);

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

  // Finaliza a digitação de giz ativa com animação suave de erguer o giz
  const lousaFinishTyping = useCallback((instant: boolean) => {
    if (lousaTypingElRef.current) {
      const el = lousaTypingElRef.current as any;
      const cb = el._onDone;
      el._onDone = null;
      el.classList.remove('has-giz');

      // Reconstrói o texto final sem spans individuais de letra
      const fullText = el._full || '';
      el.textContent = '';
      el.classList.remove('typing');

      // Cria as letras com textura final consolidada
      const textNode = document.createTextNode(fullText);
      el.appendChild(textNode);
      lousaTypingElRef.current = null;

      if (lzGizElRef.current) {
        if (instant) {
          lzGizElRef.current.remove();
        } else {
          lzGizElRef.current.classList.add('is-lifting');
          setTimeout(() => {
            lzGizElRef.current?.remove();
          }, 280);
        }
      }

      if (cb) cb(!!instant);
    }
    if (lousaTypeTORef.current) {
      clearInterval(lousaTypeTORef.current);
      lousaTypeTORef.current = null;
    }
  }, []);

  // Emite micro-partículas de pó de giz realistas com trajetórias físicas
  const emitirPoGiz = useCallback((el: HTMLElement, intensidade: number = 1) => {
    try {
      const count = Math.ceil(1 + Math.random() * 2 * intensidade);
      for (let p = 0; p < count; p++) {
        const puff = document.createElement('span');
        puff.className = 'lz-chalk-dust-spark';
        // Trajetória com física: ângulo aleatório, velocidade proporcional à pressão
        const angle = -30 - Math.random() * 120; // dispersão de -30° a -150° (para cima)
        const dist = 3 + Math.random() * 8 * intensidade;
        const dx = Math.cos(angle * Math.PI / 180) * dist;
        const dy = Math.sin(angle * Math.PI / 180) * dist;
        const size = 1.5 + Math.random() * 2.5;
        puff.style.setProperty('--dx', `${dx}px`);
        puff.style.setProperty('--dy', `${dy}px`);
        puff.style.width = `${size}px`;
        puff.style.height = `${size}px`;
        puff.style.left = `${Math.random() * 6 - 3}px`;
        puff.style.bottom = `${Math.random() * 4}px`;
        puff.style.animationDuration = `${0.3 + Math.random() * 0.35}s`;
        el.appendChild(puff);
        setTimeout(() => puff.remove(), 700);
      }
    } catch {
      // safe
    }
  }, []);

  // Emite uma trilha de resíduo de giz no ponto de contato (linha branca sutil)
  const emitirResiduoGiz = useCallback((el: HTMLElement) => {
    try {
      const trail = document.createElement('span');
      trail.className = 'lz-chalk-trail';
      trail.style.width = `${4 + Math.random() * 12}px`;
      trail.style.left = `${Math.random() * 3 - 1}px`;
      trail.style.bottom = '-2px';
      el.appendChild(trail);
      setTimeout(() => trail.remove(), 2500);
    } catch {
      // safe
    }
  }, []);

  // Digita letra por letra com pressão variável, textura de giz e jitter orgânico da mão
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

    // Reseta pressão para o início da palavra
    gizPressaoRef.current = 0.55 + Math.random() * 0.25;

    if (!lzGizElRef.current) {
      const g = document.createElement('span');
      g.className = 'lz-giz-3d';
      g.innerHTML = `
        <span class="lz-giz-contato"></span>
        <span class="lz-giz-ponta"></span>
        <span class="lz-giz-corpo"></span>
        <span class="lz-giz-sombra-contato"></span>
      `;
      g.setAttribute('aria-hidden', 'true');
      lzGizElRef.current = g;
    }

    const giz = lzGizElRef.current;
    giz.classList.remove('is-lifting');

    // Se for capítulo, usa giz amarelo! Caso contrário, giz branco
    if (isCapitulo) {
      giz.classList.add('is-yellow');
    } else {
      giz.classList.remove('is-yellow');
    }

    // Container para as letras individuais com pressão
    const letrasContainer = document.createElement('span');
    letrasContainer.className = 'lz-letras-container';
    el.textContent = '';
    el.appendChild(letrasContainer);
    el.appendChild(giz);

    let k = 0;
    let ultimoEspaco = false;
    const intervalMs = Math.max(14, Math.round(28 / (velocidadeRef.current || 1)));

    lousaTypeTORef.current = setInterval(() => {
      k++;
      const ch = full[k - 1];
      if (!ch) {
        lousaFinishTyping(false);
        return;
      }

      const isEspaco = ch === ' ';

      // Simular variação de pressão natural da mão
      // Pressão aumenta no meio das palavras e diminui nos extremos
      if (isEspaco) {
        gizPressaoRef.current = 0.45 + Math.random() * 0.2; // levanta levemente entre palavras
        ultimoEspaco = true;
      } else {
        if (ultimoEspaco) {
          // Início de nova palavra: pressão mais leve
          gizPressaoRef.current = 0.5 + Math.random() * 0.15;
          ultimoEspaco = false;
        } else {
          // Meio da palavra: pressão vai crescendo organicamente
          gizPressaoRef.current = Math.min(1, gizPressaoRef.current + (Math.random() * 0.08 - 0.02));
        }
      }

      // Cria span individual para cada caractere com pressão variável
      const letraSpan = document.createElement('span');
      letraSpan.className = 'lz-letra';
      letraSpan.textContent = ch;

      if (!isEspaco) {
        const pressao = gizPressaoRef.current;
        // Opacidade proporcional à pressão (mais forte = mais opaco/grosso)
        const opacidade = 0.55 + pressao * 0.45;
        // Leve variação de escala vertical simulando espessura do traço
        const escalaY = 0.92 + pressao * 0.1;
        // Micro-rotação para jitter orgânico
        const microRot = (Math.random() - 0.5) * 2.2;
        // Micro-deslocamento vertical para irregularidade da linha
        const microY = (Math.random() - 0.5) * 1.2;

        letraSpan.style.opacity = String(opacidade);
        letraSpan.style.transform = `scaleY(${escalaY}) rotate(${microRot}deg) translateY(${microY}px)`;

        // Variação sutil de cor (giz nunca é perfeitamente uniforme)
        if (!isCapitulo) {
          const hueShift = Math.random() * 8 - 4; // ±4 graus
          const lightShift = Math.random() * 6 - 3; // ±3%
          letraSpan.style.filter = `hue-rotate(${hueShift}deg) brightness(${1 + lightShift / 100})`;
        }
      }

      // Animação de fade-in da letra (aparece "sendo escrita")
      letraSpan.style.animation = 'lzLetraIn 0.12s ease-out forwards';

      letrasContainer.appendChild(letraSpan);

      // Reposiciona o giz após as letras
      if (giz.parentElement === el) {
        el.removeChild(giz);
      }
      el.appendChild(giz);

      // Oscilação dinâmica natural da mão escrevendo — mais orgânica com jitter acumulado
      const progress = k / full.length;
      const baseAngle = -36;
      const angleJitter = Math.sin(k * 0.7) * 3 + Math.cos(k * 1.1) * 2 + (Math.random() - 0.5) * 2;
      const yJitter = Math.sin(k * 0.5) * 1.5 + (Math.random() - 0.5) * 1;
      // Leve inclinação progressiva natural (a mão cansa)
      const fatigue = progress * 2;
      giz.style.transform = `rotate(${baseAngle + angleJitter + fatigue}deg) translateY(${yJitter}px)`;

      // Efeito sonoro procedural com variação tonal baseada no caractere
      if (!isEspaco && k % 2 === 0) {
        const pitch = 0.8 + (ch.charCodeAt(0) % 20) * 0.03;
        lousaAudio.playGizScratch(0.03 + gizPressaoRef.current * 0.03, pitch);
        emitirPoGiz(el, gizPressaoRef.current);
        setPoCalha((prev) => (prev < 100 ? prev + 0.06 : 100));
      }

      // Resíduo de giz a cada ~8 caracteres
      if (!isEspaco && k % 8 === 0) {
        emitirResiduoGiz(el);
      }

      lousaScroll();
      if (k >= full.length) {
        lousaFinishTyping(false);
      }
    }, intervalMs);
  }, [emitirPoGiz, emitirResiduoGiz, lousaFinishTyping, lousaScroll]);

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
      if (animate) lousaType(d, e.text, isCapitulo);
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
    // Pega as perguntas até o momento atual e inverte para a mais recente ficar no topo
    const perguntas = roteiro
      .filter((e) => e.kind === 'pergunta' && e.t <= t)
      .slice(-5)
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

  // Renderizador do Caderno de Estudos da Aula (para Split-View no Tablet/Desktop e Drawer no Mobile)
  const renderCadernoDeEstudos = () => {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#18120d] text-[#f7f2ea] overflow-hidden">
        {/* Cabeçalho do Caderno com Abas */}
        <div className="p-3 border-b border-amber-900/30 bg-[#211811] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs uppercase tracking-wider text-amber-200">
              Caderno de Estudos
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
            {fmt(tempo)}
          </span>
        </div>

        {/* Barra de Abas */}
        <div className="flex border-b border-white/5 bg-[#1a130e] shrink-0 text-xs">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setAbaCaderno('capitulos');
            }}
            className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 font-medium transition cursor-pointer border-b-2 ${
              abaCaderno === 'capitulos'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Capítulos</span>
            <span className="text-[10px] opacity-70">({capitulos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setAbaCaderno('pontos');
            }}
            className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 font-medium transition cursor-pointer border-b-2 ${
              abaCaderno === 'pontos'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pontos</span>
            <span className="text-[10px] opacity-70">({pontosChave.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setAbaCaderno('perguntas');
            }}
            className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 font-medium transition cursor-pointer border-b-2 ${
              abaCaderno === 'perguntas'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Dúvidas</span>
            <span className="text-[10px] opacity-70">({todasPerguntas.length})</span>
          </button>
        </div>

        {/* Conteúdo da Aba com Scroll suave */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 select-text" style={{ scrollbarWidth: 'thin' }}>
          {abaCaderno === 'capitulos' && (
            <div className="space-y-1.5">
              {capitulos.map((cap, idx) => {
                const isAtivo = idx === capituloAtualIdx;
                const jaPassou = cap.t <= tempo;

                return (
                  <button
                    key={`cap-${cap.t}-${idx}`}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      seek(cap.t + 0.01);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 group cursor-pointer ${
                      isAtivo
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                        : jaPassou
                        ? 'bg-white/[0.03] border-white/5 text-zinc-300 hover:bg-white/[0.07]'
                        : 'bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                        isAtivo
                          ? 'bg-amber-400 text-black'
                          : jaPassou
                          ? 'bg-white/10 text-zinc-300'
                          : 'bg-white/5 text-zinc-500'
                      }`}
                    >
                      {fmt(cap.t)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`block text-xs font-semibold leading-snug ${isAtivo ? 'text-amber-200' : ''}`}>
                        {cap.text}
                      </span>
                      {isAtivo && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 font-mono mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Explicando agora na lousa
                        </span>
                      )}
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition ${isAtivo ? 'text-amber-400' : 'text-zinc-600 group-hover:text-zinc-300'}`} />
                  </button>
                );
              })}
            </div>
          )}

          {abaCaderno === 'pontos' && (
            <div className="space-y-2">
              {pontosChave.map((pt, idx) => {
                const jaPassou = pt.t <= tempo;

                return (
                  <button
                    key={`pt-${pt.t}-${idx}`}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      seek(pt.t + 0.01);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-start gap-2 group cursor-pointer ${
                      jaPassou
                        ? 'bg-white/[0.04] border-white/10 text-zinc-200 hover:bg-white/[0.08]'
                        : 'bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    <span className="font-mono text-[9.5px] px-1 py-0.5 rounded bg-black/30 text-amber-300/80 mt-0.5 shrink-0">
                      {fmt(pt.t)}
                    </span>
                    <div className="flex-1 min-w-0">
                      {pt.text && (
                        <span className="block text-xs leading-snug font-medium">
                          {pt.text}
                        </span>
                      )}
                      {pt.items && pt.items.length > 0 && (
                        <ul className="mt-1.5 space-y-1 pl-2 border-l border-amber-500/30 text-[11px] text-amber-200/90">
                          {pt.items.map((sub, sidx) => (
                            <li key={sidx} className="flex items-start gap-1.5">
                              <span className="text-amber-400 shrink-0">•</span>
                              <span>{sub}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {abaCaderno === 'perguntas' && (
            <div className="space-y-2">
              {todasPerguntas.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500 italic">
                  Nenhuma dúvida catalogada para esta aula.
                </div>
              ) : (
                todasPerguntas.map((perg, idx) => {
                  const jaPassou = perg.t <= tempo;

                  return (
                    <button
                      key={`perg-${perg.t}-${idx}`}
                      type="button"
                      onClick={() => {
                        haptic.selection();
                        seek(perg.t + 0.01);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer ${
                        jaPassou
                          ? 'bg-[#2b2116]/80 border-amber-500/30 text-amber-100 hover:bg-[#34271a]'
                          : 'bg-black/20 border-white/5 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          Aluna
                        </span>
                        <span className="font-mono text-zinc-400 bg-black/30 px-1.5 py-0.5 rounded">
                          {fmt(perg.t)}
                        </span>
                      </div>
                      <span className="text-xs font-medium leading-relaxed italic">
                        "{perg.text}"
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

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

        /* Foco Cênico Superior (Spotlight da Lousa - Item 5) */
        .lz-chalkboard-texture.lz-spotlight-active::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 80% 65% at 50% 8%,
            rgba(255, 240, 210, 0.14) 0%,
            rgba(255, 220, 150, 0.05) 45%,
            rgba(0, 0, 0, 0.52) 100%
          );
          box-shadow: inset 0 0 100px rgba(0,0,0,0.85);
          pointer-events: none;
          z-index: 5;
          transition: opacity 0.5s ease;
        }

        /* Container de letras individuais com pressão variável */
        .lz-letras-container {
          display: inline;
        }
        .lz-letra {
          display: inline;
          transition: none;
        }
        @keyframes lzLetraIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: var(--final-opacity, 1); transform: none; }
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
           GIZ 3D REALISTA COM SOMBRA DE CONTATO
           ============================================= */
        .lz-giz-3d {
          display: inline-flex;
          align-items: flex-end;
          position: relative;
          width: 44px;
          height: 24px;
          margin-left: 3px;
          vertical-align: baseline;
          pointer-events: none;
          z-index: 15;
          transform-origin: 3px calc(100% - 2px);
          transform: rotate(-36deg);
          transition: transform 0.04s linear, opacity 0.2s ease;
          filter: drop-shadow(-2px 4px 6px rgba(0,0,0,0.75));
        }
        /* Ponta chanfrada de giz (ponto de contato exato com a lousa) */
        .lz-giz-ponta {
          width: 10px;
          height: 10px;
          flex: none;
          background: linear-gradient(135deg, #ffffff 30%, #ded7c1 70%, #c8c0a8 100%);
          clip-path: polygon(0% 100%, 75% 0%, 100% 25%, 25% 100%);
        }
        /* Corpo cilíndrico do bastão de giz com micro-textura de pó */
        .lz-giz-corpo {
          width: 34px;
          height: 10px;
          margin-left: -2px;
          margin-bottom: 2px;
          border-radius: 0 4px 4px 0;
          background: linear-gradient(
            180deg, 
            #ffffff 0%, 
            #f0ebe0 25%,
            #ede6d4 50%, 
            #d8d0bc 75%,
            #c4bea8 100%
          );
          box-shadow: 
            inset 0 1px 1px rgba(255,255,255,0.95), 
            inset 0 -2px 3px rgba(0,0,0,0.25),
            0 0 1px rgba(255,255,255,0.3);
        }
        /* Ponto luminoso sutil de contato de pó na lousa */
        .lz-giz-contato {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.75) 0%, transparent 70%);
          transform: translate(-30%, 30%);
          pointer-events: none;
          animation: lzContatoPulse 0.15s ease-in-out infinite alternate;
        }
        @keyframes lzContatoPulse {
          from { opacity: 0.6; transform: translate(-30%, 30%) scale(0.9); }
          to { opacity: 1; transform: translate(-30%, 30%) scale(1.1); }
        }
        /* Sombra suave de contato do giz na lousa */
        .lz-giz-sombra-contato {
          position: absolute;
          left: -2px;
          bottom: -3px;
          width: 12px;
          height: 5px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%);
          pointer-events: none;
        }

        /* GIZ AMARELO QUANDO FOR CAPÍTULO */
        .lz-giz-3d.is-yellow .lz-giz-ponta {
          background: linear-gradient(135deg, #fff2aa 30%, #e6b83f 70%, #d4a02e 100%);
        }
        .lz-giz-3d.is-yellow .lz-giz-corpo {
          background: linear-gradient(
            180deg, 
            #fff2aa 0%, 
            #fce08a 25%,
            #f7cb5c 50%, 
            #e8b340 75%,
            #d49f2b 100%
          );
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(0,0,0,0.3);
        }
        .lz-giz-3d.is-yellow .lz-giz-contato {
          background: radial-gradient(circle, rgba(247,208,112,0.8) 0%, transparent 70%);
        }

        /* Animação suave de erguer a mão/giz ao terminar o ponto */
        .lz-giz-3d.is-lifting {
          transform: rotate(-20deg) translateY(-16px) translateX(8px) !important;
          opacity: 0 !important;
          transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.28s ease !important;
        }

        /* =============================================
           PARTÍCULAS DE PÓ DE GIZ COM FÍSICA REALISTA
           ============================================= */
        .lz-chalk-dust-spark {
          position: absolute;
          background: rgba(255,255,255,0.75);
          border-radius: 50%;
          pointer-events: none;
          animation: lzSparkPhysics var(--duration, 0.4s) ease-out forwards;
        }
        @keyframes lzSparkPhysics {
          0% { 
            transform: translate(0, 0) scale(1); 
            opacity: 0.85; 
          }
          40% {
            opacity: 0.5;
          }
          100% { 
            transform: translate(var(--dx, 6px), var(--dy, -8px)) scale(0.3); 
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
      `}</style>

      {/* Header com Glassmorphism, Controle de Som e Safe Area */}
      <header
        className="shrink-0 px-4 sm:px-6 pb-2.5 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+0.6rem)] border-b border-white/10 bg-[#17120e]/95 backdrop-blur-xl flex items-center justify-between z-30"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Lousa Mágica · Modo Dinâmico
          </span>
          <span className="hidden sm:inline text-xs text-zinc-400 truncate max-w-xs font-medium">
            {aula.titulo}
          </span>
        </div>

          {/* Botão de Iluminação Cênica (Spotlight da Lousa - Item 5) */}
          <button
            type="button"
            onClick={handleToggleIluminacao}
            aria-label={iluminacaoCenica ? 'Desativar iluminação cênica' : 'Ativar iluminação cênica (foco suave)'}
            title={iluminacaoCenica ? 'Iluminação Cênica: Foco Suave Ligado' : 'Iluminação Cênica: Desligada'}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
              iluminacaoCenica
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.22)]'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Lightbulb className={`w-3.5 h-3.5 ${iluminacaoCenica ? 'text-amber-300' : 'text-zinc-400'}`} />
            <span className="hidden lg:inline text-[11px]">
              {iluminacaoCenica ? 'Luz Cênica' : 'Luz Plana'}
            </span>
          </button>

          {/* Botão de Caderno de Estudos (Split-View no Tablet/Desktop e Drawer no Mobile - Item 11) */}
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              if (window.innerWidth >= 1024) {
                setSplitViewAtivo((v) => !v);
              } else {
                setDrawerCadernoAberto((v) => !v);
              }
            }}
            aria-label="Abrir Caderno de Estudos da Aula"
            title={splitViewAtivo || drawerCadernoAberto ? 'Fechar Caderno de Estudos' : 'Abrir Caderno de Estudos (Roteiro e Capítulos)'}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
              splitViewAtivo || drawerCadernoAberto
                ? 'bg-amber-500/25 border-amber-400/60 text-amber-200 shadow-sm'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[11px]">
              Caderno
            </span>
            <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded font-mono text-amber-300/90">
              {capitulos.length}
            </span>
          </button>

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
              {somHabilitado ? 'Som: On' : 'Som: Off'}
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

      {/* Corpo da Lousa com Moldura de Madeira Nobre e Painel Adaptativo de Estudos (Item 11) */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-2.5 sm:p-4 max-w-[1460px] w-full mx-auto overflow-hidden">
        {/* Lousa Mágica com Moldura de Madeira Nobre */}
        <div
          className="flex-1 min-h-0 flex gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #74512e, #4d3319 60%, #634324)',
            boxShadow: '0 25px 70px rgba(0,0,0,0.8), inset 0 2px 6px rgba(255,255,255,0.2)',
          }}
        >
          {/* Quadro Negro Ardósia com Textura, Foco Cênico e Calha */}
          <div
            ref={lousaContainerRef}
            className={`lz-chalkboard-texture flex-1 min-w-0 rounded-lg overflow-hidden relative flex flex-col border border-white/5 ${
              iluminacaoCenica ? 'lz-spotlight-active' : ''
            }`}
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

          {/* Coluna / Mural de Post-its das Perguntas da Aluna (MAIS RECENTE NO TOPO) */}
          <aside
            ref={postsContainerRef}
            className="w-[130px] sm:w-[210px] flex flex-col gap-3 overflow-hidden pt-1 shrink-0 border-l border-white/5 pl-2 sm:pl-3"
            aria-label="Perguntas da aluna"
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
                  const isMaisRecente = idx === 0;
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
                      style={{ transform: `rotate(${rotacao})`, '--rot': rotacao } as React.CSSProperties}
                      className={`text-left p-3 pt-3.5 cursor-pointer ${
                        isMaisRecente ? 'postit-card-ativo' : 'postit-card-antigo'
                      }`}
                    >
                      <div className="tape" />

                      {isMaisRecente && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-950/15 text-amber-950 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-ping" />
                          Mais recente
                        </span>
                      )}

                      <span
                        className={`block font-semibold text-[11px] sm:text-[12px] leading-snug ${
                          isMaisRecente ? 'text-zinc-900' : 'text-zinc-200'
                        }`}
                      >
                        "{p.text}"
                      </span>

                      <span
                        className={`flex items-center justify-end gap-1 text-[9.5px] italic mt-2 font-mono font-medium ${
                          isMaisRecente ? 'text-[#775a14]' : 'text-zinc-400'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        Aluna · {fmt(p.t)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>

        {/* Painel Adaptativo: Caderno de Estudos da Aula (Split-View em Tablet Landscape / Desktop - Item 11) */}
        {splitViewAtivo && (
          <aside className="w-[320px] xl:w-[360px] shrink-0 hidden lg:flex flex-col rounded-2xl bg-[#19130d]/95 border border-amber-900/40 shadow-2xl overflow-hidden backdrop-blur-md">
            {renderCadernoDeEstudos()}
          </aside>
        )}
      </main>

      {/* DRAWER DO CADERNO DE ESTUDOS PARA SMARTPHONES E TELAS MENORES (Item 11) */}
      {drawerCadernoAberto && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
          <div className="w-full max-h-[82vh] h-[520px] rounded-t-3xl bg-[#19130e] border-t border-amber-500/30 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#221a13]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-amber-200">Caderno de Estudos da Aula</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerCadernoAberto(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {renderCadernoDeEstudos()}
            </div>
          </div>
        </div>
      )}

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
