import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export type WordTiming = { word: string; start: number; end: number };

interface KaraokeOverlayProps {
  open: boolean;
  audio: HTMLAudioElement | null;
  timings: WordTiming[] | null;
  fullText: string;
  title?: string;
  onClose?: () => void;
}

/**
 * Overlay estilo Spotify Lyrics: mostra o texto do artigo com a palavra
 * atual grifada, sincronizada com o áudio da narração.
 * Fica ancorado no rodapé (acima do FAB de Narrar). Compacto por padrão,
 * expande para tela cheia ao tocar.
 */
export function KaraokeOverlay({ open, audio, timings, fullText, title, onClose }: KaraokeOverlayProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!audio || !open) return;
    let raf = 0;
    const tick = () => {
      setCurrentTime(audio.currentTime || 0);
      if (!audio.paused && !audio.ended) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onPause = () => cancelAnimationFrame(raf);
    const onPlay = () => { raf = requestAnimationFrame(tick); };
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('ended', onPause);
    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('ended', onPause);
    };
  }, [audio, open]);

  // Índice da palavra atual (busca linear — suficiente para ~200 palavras)
  const activeIdx = useMemo(() => {
    if (!timings || timings.length === 0) return -1;
    for (let i = 0; i < timings.length; i++) {
      if (currentTime >= timings[i].start && currentTime < timings[i].end) return i;
    }
    // depois do fim da última palavra ainda destaca a última brevemente
    if (currentTime >= timings[timings.length - 1].end) return timings.length - 1;
    return -1;
  }, [timings, currentTime]);

  const hasTimings = !!(timings && timings.length > 0);

  const renderWords = () => {
    if (hasTimings) {
      return timings!.map((w, i) => {
        const past = i < activeIdx;
        const active = i === activeIdx;
        return (
          <span
            key={i}
            className={
              active
                ? 'text-primary bg-primary/20 rounded-md px-1 py-0.5 transition-colors duration-150'
                : past
                  ? 'text-foreground/85 transition-colors'
                  : 'text-muted-foreground/55 transition-colors'
            }
          >
            {w.word}{' '}
          </span>
        );
      });
    }
    // Fallback: sem timings → mostra texto plano
    return <span className="text-foreground/80">{fullText}</span>;
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="karaoke"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className={
            expanded
              ? 'fixed inset-0 z-[130] flex flex-col bg-background/98 backdrop-blur-xl'
              : 'fixed left-3 right-3 bottom-[calc(var(--sai-bottom,env(safe-area-inset-bottom,0px))+140px)] z-[130] rounded-3xl bg-background/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden'
          }
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Karaokê · {title || 'Narração'}
            </span>
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground px-2 py-1 rounded-full"
            >
              {expanded ? 'Reduzir' : 'Expandir'}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar karaokê"
                className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Text */}
          <div
            className={
              expanded
                ? 'flex-1 overflow-y-auto px-6 py-6 text-2xl sm:text-3xl leading-[1.55] font-legal'
                : 'max-h-[28vh] overflow-y-auto px-4 pb-4 text-[15px] leading-relaxed font-legal'
            }
          >
            {renderWords()}
            {!hasTimings && (
              <p className="mt-3 text-[11px] text-muted-foreground/70 italic">
                Grifo por palavra indisponível para esta narração — gere novamente para ativar.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default KaraokeOverlay;
