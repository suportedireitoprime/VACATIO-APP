import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  planoLabel: string;
  onClose: () => void;
  /** Quando true, mostra estado "sincronizando…" ao invés do plano ativo. */
  syncing?: boolean;
}

function friendlyPlano(raw: string): string {
  const p = raw.toLowerCase();
  if (p.includes('anual') || p.includes('year')) return 'Premium Anual';
  if (p.includes('mensal') || p.includes('month')) return 'Premium Mensal';
  return raw;
}

export default function WelcomePremiumOverlay({ open, planoLabel, onClose, syncing = false }: Props) {
  useEffect(() => {
    if (!open || syncing) return;
    const t = window.setTimeout(onClose, 8000);
    return () => window.clearTimeout(t);
  }, [open, onClose, syncing]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* confetes simples */}
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: '-5%',
                backgroundColor: ['#fbbf24', '#f59e0b', '#fde68a', '#ffffff'][i % 4],
              }}
              initial={{ y: -20, opacity: 0, rotate: 0 }}
              animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: 360 }}
              transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 0.6, ease: 'easeIn' }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            className="relative w-full max-w-sm rounded-3xl p-6 text-center overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, hsl(var(--primary) / 0.25) 0%, hsl(var(--card)) 60%)',
              boxShadow: '0 30px 80px -20px hsl(var(--primary) / 0.5), inset 0 0 0 1px hsl(var(--primary) / 0.4)',
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-foreground/70 hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 14 }}
              className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/40 mb-4"
            >
              <Crown className="w-10 h-10 text-black" />
            </motion.div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-1" style={{ letterSpacing: '0.02em' }}>
              Parabéns! 👑
            </h2>
            <p className="font-body text-sm text-muted-foreground mb-1">
              Você agora é <span className="text-primary font-semibold">Vacatio Premium</span>.
            </p>

            {syncing ? (
              <p className="font-body text-xs text-muted-foreground mb-5 inline-flex items-center gap-1.5 justify-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sincronizando sua assinatura…
              </p>
            ) : (
              <p className="font-body text-xs text-muted-foreground mb-5">
                Plano ativo: <span className="text-foreground font-semibold">{friendlyPlano(planoLabel)}</span>
              </p>
            )}

            <Button
              onClick={onClose}
              disabled={syncing}
              className="w-full h-11 font-display font-bold tracking-wide"
              size="lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {syncing ? 'Aguarde…' : 'Começar a estudar'}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
