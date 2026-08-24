/**
 * Banner "Continuar de onde parou" (Fase 8).
 * Aparece apenas no desktop quando há atividade recente em outro aparelho.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Smartphone, Tablet, Monitor, X } from 'lucide-react';
import { fetchLatestContinuity, type ContinuityEntry } from '@/lib/continuity';
import { useIsDesktop } from '@/hooks/use-desktop';

const DISMISS_KEY = 'continuity:dismissedAt';

function deviceIcon(hint?: string) {
  if (hint === 'mobile') return Smartphone;
  if (hint === 'tablet') return Tablet;
  return Monitor;
}

function deviceLabel(hint?: string) {
  if (hint === 'mobile') return 'no celular';
  if (hint === 'tablet') return 'no tablet';
  return 'no desktop';
}

export default function ContinueBanner() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<ContinuityEntry | null>(null);

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    (async () => {
      const latest = await fetchLatestContinuity({ onlyOtherDevice: true });
      if (cancelled || !latest) return;
      // Não mostrar se foi dispensado depois desse registro
      const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissed > new Date(latest.updated_at).getTime()) return;
      setEntry(latest);
    })();
    return () => { cancelled = true; };
  }, [isDesktop]);

  if (!isDesktop || !entry) return null;
  const Icon = deviceIcon(entry.device_hint);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setEntry(null);
  };

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        onClick={() => { navigate(entry.path); dismiss(); }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="group w-full flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 text-left transition hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Continuar lendo ${entry.label}, aberto ${deviceLabel(entry.device_hint)}`}
      >
        <span className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" aria-hidden />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] uppercase tracking-wide font-semibold text-primary/80">
            Continuar de onde parou {deviceLabel(entry.device_hint)}
          </span>
          <span className="block truncate text-sm font-display text-foreground">
            {entry.label}
          </span>
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground transition group-hover:text-primary group-hover:translate-x-0.5" aria-hidden />
        <span
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); dismiss(); } }}
          aria-label="Dispensar"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <X className="w-3.5 h-3.5" />
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
