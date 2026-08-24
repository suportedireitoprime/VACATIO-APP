import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic } from 'lucide-react';

interface Props {
  open: boolean;
  partial: string;
  onStop: () => void;
}

const BARS = 32;

const VoiceCaptureOverlay = ({ open, partial, onStop }: Props) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[120] flex flex-col bg-background/95 backdrop-blur-2xl"
        >
          {/* Close */}
          <div className="flex items-center justify-between px-5 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+1rem)] pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ouvindo
              </span>
            </div>
            <button
              type="button"
              onClick={onStop}
              aria-label="Cancelar"
              className="w-10 h-10 rounded-full bg-secondary/70 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Live transcription */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <AnimatePresence mode="wait">
              {partial ? (
                <motion.p
                  key="partial"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="font-display text-3xl sm:text-4xl font-bold leading-tight text-foreground max-w-xl"
                >
                  {partial}
                  <span className="inline-block w-[3px] h-8 bg-primary ml-1 align-middle animate-pulse" />
                </motion.p>
              ) : (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-body text-lg text-muted-foreground"
                >
                  Fale agora…
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Waveform */}
          <div className="pb-12 px-6">
            <div className="flex items-center justify-center gap-1.5 h-24 mb-8">
              {Array.from({ length: BARS }).map((_, i) => {
                const distFromCenter = Math.abs(i - BARS / 2) / (BARS / 2);
                const baseHeight = 1 - distFromCenter * 0.6;
                return (
                  <motion.span
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-primary via-primary to-primary/60"
                    initial={{ scaleY: 0.2 }}
                    animate={{
                      scaleY: [0.25, baseHeight, 0.35, baseHeight * 0.8, 0.3],
                    }}
                    transition={{
                      duration: 1 + Math.random() * 0.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.03,
                    }}
                    style={{ height: '100%', transformOrigin: 'center' }}
                  />
                );
              })}
            </div>

            {/* Stop button */}
            <button
              type="button"
              onClick={onStop}
              className="mx-auto flex items-center gap-2.5 h-14 px-8 rounded-full bg-primary text-primary-foreground font-body font-bold shadow-lg shadow-primary/30 active:scale-[0.97] transition"
            >
              <Mic className="w-5 h-5" />
              Toque para parar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceCaptureOverlay;
