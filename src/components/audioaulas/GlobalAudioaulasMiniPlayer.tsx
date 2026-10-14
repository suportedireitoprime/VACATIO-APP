import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ArrowRight, X } from 'lucide-react';
import { useAudioaulasPlayer } from '@/contexts/AudioaulasPlayerContext';

/**
 * Mini Player Flutuante de Áudio Aulas — Estilo Cápsula idêntico ao Narração do Artigo.
 * Permanece ativo e flutuando acima da barra de navegação em qualquer tela do aplicativo.
 */
export default function GlobalAudioaulasMiniPlayer() {
  const { atual, tocando, togglePlay, setAberto, aberto, fechar, tempo, dur } = useAudioaulasPlayer();
  const navigate = useNavigate();
  const location = useLocation();

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

  const onAudioaulasPage = location.pathname.startsWith('/audioaulas');
  // Se o player full-screen estiver aberto na página de áudio aulas, esconde o mini player
  const visible = !!atual && !(aberto && onAudioaulasPage);

  const handleReopen = () => {
    if (onAudioaulasPage) {
      setAberto(true);
    } else {
      navigate('/audioaulas');
      setTimeout(() => setAberto(true), 150);
    }
  };

  const progress = dur > 0 ? (tempo / dur) * 100 : 0;
  const eqBars = [0, 1, 2, 3];

  return (
    <AnimatePresence>
      {visible && atual && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="fixed left-0 right-0 z-[80] px-3 pointer-events-none md:left-auto md:right-6 md:px-0"
          style={{
            bottom: navHeight
              ? `${navHeight + 28}px`
              : `calc(9.5rem + var(--sai-bottom))`,
          }}
        >
          <div className="pointer-events-auto mx-auto max-w-md md:w-96 rounded-full border border-white/15 bg-[#0f0f0f]/95 backdrop-blur-md shadow-2xl shadow-black/80 flex items-center gap-2 pl-1.5 pr-1.5 py-1.5 relative overflow-hidden transition-all hover:scale-[1.02]">
            {/* Efeito de brilho/reflexo passando */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              initial={{ x: '-120%' }}
              animate={{ x: '320%' }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
            />

            {/* Barra de progresso vibrante na parte inferior da cápsula */}
            <div
              className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-amber-400 transition-[width] duration-200"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />

            {/* Botão Play / Pause circular */}
            <button
              onClick={togglePlay}
              aria-label={tocando ? 'Pausar' : 'Continuar'}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 active:opacity-70 transition flex items-center justify-center relative z-10 shadow-md shadow-primary/30"
            >
              {tocando ? (
                <Pause className="w-4 h-4 text-primary-foreground" fill="currentColor" />
              ) : (
                <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
              )}
            </button>

            {/* Equalizador animado quando tocando */}
            <div className="flex items-end gap-[2px] h-5 flex-shrink-0 pl-0.5 relative z-10" aria-hidden>
              {eqBars.map((i) => (
                <motion.span
                  key={i}
                  className="w-[3px] rounded-full bg-primary"
                  initial={{ height: 4 }}
                  animate={
                    tocando
                      ? { height: [4, 14, 7, 16, 5, 12, 4] }
                      : { height: 4 }
                  }
                  transition={
                    tocando
                      ? { duration: 0.9 + i * 0.15, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }
                      : { duration: 0.2 }
                  }
                />
              ))}
            </div>

            {/* Texto da Aula (Título e Área/Tema) */}
            <button
              onClick={handleReopen}
              className="flex-1 min-w-0 text-left px-1 relative z-10"
              aria-label="Abrir aula"
            >
              <p className="text-[12px] font-semibold text-white truncate leading-tight">
                {atual.titulo}
              </p>
              <p className="text-[10.5px] text-white/60 truncate leading-tight">
                {atual.area} {atual.tema ? `• ${atual.tema}` : ''}
              </p>
            </button>

            {/* Botão Fechar (X) */}
            <button
              onClick={fechar}
              aria-label="Fechar player"
              className="flex-shrink-0 w-9 h-9 rounded-full hover:bg-white/10 active:opacity-70 transition flex items-center justify-center relative z-10"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>

            {/* Seta com cabinho animada para a direita que redireciona para a aula */}
            <button
              onClick={handleReopen}
              aria-label="Ir para áudio aula"
              title="Abrir aula completa"
              className="flex-shrink-0 w-9 h-9 rounded-full hover:bg-white/10 active:opacity-70 transition flex items-center justify-center relative z-10 overflow-hidden"
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
}
