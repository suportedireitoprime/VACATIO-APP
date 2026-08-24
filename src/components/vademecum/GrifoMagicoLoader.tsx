import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Sparkles } from 'lucide-react';

const PASSOS = [
  'Lendo o artigo por inteiro',
  'Identificando o núcleo da regra',
  'Separando exceções e prazos',
  'Caçando pegadinhas de prova',
  'Escrevendo as anotações',
];

/** Overlay de checklist exibido enquanto a IA grifa o artigo. */
export default function GrifoMagicoLoader({ open }: { open: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) { setStep(0); return; }
    setStep(0);
    const id = setInterval(() => {
      setStep((s) => (s < PASSOS.length - 1 ? s + 1 : s));
    }, 1600);
    return () => clearInterval(id);
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-background/70 backdrop-blur-sm px-6"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-full max-w-[340px] rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </span>
              <div className="min-w-0">
                <p className="font-body text-[15px] font-semibold text-foreground leading-tight">Grifando magicamente</p>
                <p className="font-body text-[12px] text-muted-foreground leading-tight">Isso leva alguns segundos</p>
              </div>
            </div>

            <ul className="space-y-2.5">
              {PASSOS.map((p, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <li key={p} className="flex items-center gap-2.5">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        done
                          ? 'border-amber-400 bg-amber-400 text-black'
                          : active
                            ? 'border-amber-400 text-amber-400'
                            : 'border-border text-muted-foreground/50'
                      }`}
                    >
                      {done ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : active ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                    </span>
                    <span
                      className={`font-body text-[13.5px] leading-snug transition-colors ${
                        done ? 'text-muted-foreground line-through decoration-muted-foreground/40' : active ? 'text-foreground font-medium' : 'text-muted-foreground/60'
                      }`}
                    >
                      {p}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}