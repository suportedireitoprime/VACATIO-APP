/**
 * ContinuarLendo — card na Home que mostra a última lei/livro lido,
 * permitindo retomar em um toque.
 *
 * Fontes de dados (em ordem de prioridade):
 * 1. `continuity.ts` — última tela jurídica visitada (artigo, lei, biblioteca)
 * 2. `leisRecentes.ts` — última lei aberta
 *
 * O card desaparece elegantemente se não houver dados ou se o usuário clicar
 * no "×" de dispensar (não volta até próxima sessão).
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight, X, Clock, Scale } from 'lucide-react';
import { getLocalContinuity, type ContinuityEntry, type ContinuityKind } from '@/lib/continuity';
import { getRecentes, type LeiRecente } from '@/lib/leisRecentes';
import { LEIS_CATALOG } from '@/data/leisCatalog';

const DISMISS_KEY = 'continuar_lendo:dismissed';

const KIND_ICON: Record<ContinuityKind, typeof BookOpen> = {
  artigo: Scale,
  blog: BookOpen,
  noticia: BookOpen,
  radar: BookOpen,
  biblioteca: BookOpen,
  other: BookOpen,
};

const KIND_LABEL: Record<ContinuityKind, string> = {
  artigo: 'Legislação',
  blog: 'Blog',
  noticia: 'Notícia',
  radar: 'Radar Legislativo',
  biblioteca: 'Biblioteca',
  other: 'Continuar',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return '';
}

export const ContinuarLendo = () => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  const entry = useMemo<{ path: string; label: string; kind: ContinuityKind; time: string } | null>(() => {
    if (dismissed) return null;

    // Try continuity first (most recent activity)
    const cont = getLocalContinuity();
    if (cont && cont.label && cont.path) {
      return {
        path: cont.path,
        label: cont.label,
        kind: cont.kind,
        time: timeAgo(cont.updated_at),
      };
    }

    // Fallback: most recent law
    const recentes = getRecentes();
    if (recentes.length > 0) {
      const r = recentes[0];
      const lei = LEIS_CATALOG.find(l => l.id === r.leiId);
      return {
        path: `/legislacao/${r.tipo}/${r.leiId}`,
        label: lei?.nome || r.nome,
        kind: 'artigo' as ContinuityKind,
        time: r.openedAt ? timeAgo(new Date(r.openedAt).toISOString()) : '',
      };
    }

    return null;
  }, [dismissed]);

  if (!entry || dismissed) return null;

  const Icon = KIND_ICON[entry.kind] || BookOpen;
  const kindLabel = KIND_LABEL[entry.kind] || 'Continuar';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mb-4"
      >
        <button
          onClick={() => navigate(entry.path)}
          className="group relative w-full flex items-center gap-3 p-3.5 rounded-2xl bg-primary/10 border border-primary/25 shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
        >
          {/* Text content */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="font-body text-[11px] font-semibold text-primary uppercase tracking-wider">
                {kindLabel}
              </span>
              {entry.time && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-medium">
                  <Clock className="w-3 h-3" />
                  {entry.time}
                </span>
              )}
            </div>
            <p className="font-display text-[15px] font-bold text-foreground truncate mt-0.5 leading-tight">
              {entry.label}
            </p>
          </div>

          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-primary/60 shrink-0 group-hover:translate-x-0.5 transition-transform" />

          {/* Dismiss button */}
          <div
            role="button"
            aria-label="Dispensar"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              sessionStorage.setItem(DISMISS_KEY, '1');
            }}
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-secondary border border-border/60 flex items-center justify-center shadow-sm hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </div>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContinuarLendo;
