import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ArrowRight, X } from 'lucide-react';
import { useNarracaoFlutuante } from '@/stores/useNarracaoFlutuante';
import { registerMiniPlayer } from '@/lib/miniPlayerCoordinator';

/**
 * Mini player flutuante que aparece quando a pessoa fecha o artigo mas
 * a narração continua tocando. Renderizado globalmente no App.
 */
const NarracaoMiniPlayer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const audio = useNarracaoFlutuante((s) => s.audio);
  const artigo = useNarracaoFlutuante((s) => s.artigo);
  const tabelaNome = useNarracaoFlutuante((s) => s.tabelaNome);
  const leiNome = useNarracaoFlutuante((s) => s.leiNome);
  const isPlaying = useNarracaoFlutuante((s) => s.isPlaying);
  const progress = useNarracaoFlutuante((s) => s.progress);
  const returnPath = useNarracaoFlutuante((s) => s.returnPath);
  const toggle = useNarracaoFlutuante((s) => s.toggle);
  const close = useNarracaoFlutuante((s) => s.close);

  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    const medir = () => {
      const nav = document.querySelector<HTMLElement>('[data-bottom-nav]');
      setNavHeight(nav ? nav.getBoundingClientRect().height : 0);
    };
    medir();

    const nav = document.querySelector<HTMLElement>('[data-bottom-nav]');
    let ro: ResizeObserver | undefined;
    if (nav && 'ResizeObserver' in window) {
      ro = new ResizeObserver(medir);
      ro.observe(nav);
    }
    window.addEventListener('resize', medir);
    const t = window.setTimeout(medir, 300);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', medir);
      window.clearTimeout(t);
    };
  }, [location.pathname]);

  const visible = !!audio && !!artigo;

  useEffect(() => {
    registerMiniPlayer('narracao', visible);
    return () => {
      registerMiniPlayer('narracao', false);
    };
  }, [visible]);

  const handleReopen = () => {
    if (!returnPath || !artigo) return;
    const goEvent = () => {
      window.dispatchEvent(
        new CustomEvent('narracao-flutuante:reopen', {
          detail: { artigo, tabelaNome },
        }),
      );
    };
    if (location.pathname === returnPath) {
      goEvent();
    } else {
      navigate(returnPath);
      setTimeout(goEvent, 200);
    }
  };

  // Alturas das barras do equalizer — animam quando isPlaying
  const eqBars = [0, 1, 2, 3];

  return (
    <AnimatePresence>
      {visible && artigo && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="fixed left-0 right-0 z-[80] px-3 pointer-events-none"
          style={{
            bottom: navHeight
              ? `${navHeight + 16}px`
              : `calc(1rem + var(--sai-bottom, 0px))`,
          }}
        >
          <div className="pointer-events-auto mx-auto max-w-md min-h-[58px] sm:min-h-[64px] rounded-full border border-white/10 bg-background/95 backdrop-blur-md shadow-2xl shadow-black/60 flex items-center gap-2.5 pl-2 pr-2.5 py-2 sm:py-2.5 relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]">
            {/* Reflexo passando */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              initial={{ x: '-120%' }}
              animate={{ x: '320%' }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
            />

            {/* Barra de progresso interna sutil */}
            <div
              className="absolute inset-x-0 bottom-0 h-1 sm:h-1.5 bg-gradient-to-r from-primary/80 to-amber-400/80 transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />

            <button
              onClick={toggle}
              aria-label={isPlaying ? 'Pausar' : 'Continuar'}
              className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary hover:bg-primary/90 active:scale-95 transition flex items-center justify-center relative z-10 shadow-lg shadow-black/40"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-primary-foreground" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
              )}
            </button>

            {/* Equalizer indicando áudio tocando */}
            <div className="flex items-end gap-[2.5px] h-6 flex-shrink-0 pl-0.5 relative z-10" aria-hidden>
              {eqBars.map((i) => (
                <motion.span
                  key={i}
                  className="w-[3px] rounded-full bg-primary"
                  initial={{ height: 4 }}
                  animate={
                    isPlaying
                      ? { height: [5, 18, 8, 20, 6, 14, 5] }
                      : { height: 4 }
                  }
                  transition={
                    isPlaying
                      ? { duration: 0.9 + i * 0.15, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }
                      : { duration: 0.2 }
                  }
                />
              ))}
            </div>

            <button
              onClick={handleReopen}
              className="flex-1 min-w-0 text-left px-1.5 relative z-10 flex flex-col justify-center"
              aria-label="Voltar ao artigo"
            >
              <p className="text-[13px] sm:text-[14px] font-semibold text-white truncate leading-snug">
                {/^\d/.test(artigo.numero) ? `Art. ${artigo.numero}` : artigo.numero}
              </p>
              <p className="text-[11px] sm:text-[12px] text-white/60 truncate leading-snug mt-0.5">
                {leiNome || tabelaNome || 'Narrando'}
              </p>
            </button>

            {/* Fechar (vem antes da seta) */}
            <button
              onClick={close}
              aria-label="Fechar player"
              className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition flex items-center justify-center relative z-10"
            >
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Seta com cabinho, animando pro lado direito */}
            <button
              onClick={handleReopen}
              aria-label="Abrir artigo"
              className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 active:scale-95 transition flex items-center justify-center relative z-10 overflow-hidden"
            >
              <motion.span
                className="inline-flex"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRight className="w-5 h-5 text-white/90" strokeWidth={2.4} />
              </motion.span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NarracaoMiniPlayer;
