import { motion, AnimatePresence } from 'framer-motion';
import { X, BadgeCheck, Ban, ExternalLink, Copy, Check, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Sumula } from '@/services/sumulasService';

interface Props {
  sumula: Sumula;
  isFavorita?: boolean;
  onToggleFavorita?: () => void;
  onClose: () => void;
}

// Renders inline text with markdown-style links [label](url), **bold**, *italic*, _italic_.
// Also cleans up whitespace inside a broken pattern like "[label]\n(url)" and stray marker artifacts.
function renderInline(text: string): (string | JSX.Element)[] {
  // Normalize "[label] (url)" or "[label]\n(url)" -> "[label](url)"
  let normalized = text.replace(/\]\s+\(/g, '](');
  // Collapse "** **" (bold around whitespace) and orphan bold markers glued to punctuation
  normalized = normalized.replace(/\*\*\s+\*\*/g, ' ');

  // Token regex: link | bold | italic(*) | italic(_)
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([\s\S]+?)\*\*|(?<![*\w])\*([^*\n]+?)\*(?!\*)|(?<![_\w])_([^_\n]+?)_(?!_)/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(normalized.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary-light underline decoration-primary-light/40 hover:decoration-primary-light font-medium"
        >
          {renderInline(match[1])}
        </a>
      );
    } else if (match[3] !== undefined) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {renderInline(match[3])}
        </strong>
      );
    } else if (match[4] !== undefined) {
      parts.push(<em key={key++}>{renderInline(match[4])}</em>);
    } else if (match[5] !== undefined) {
      parts.push(<em key={key++}>{renderInline(match[5])}</em>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < normalized.length) {
    parts.push(normalized.slice(lastIndex));
  }
  // Final safety: strip any remaining stray "**" from plain string parts
  return parts.map((p) => (typeof p === 'string' ? p.replace(/\*\*/g, '') : p));
}

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="mt-5">
      <h3 className="font-display text-[13px] uppercase tracking-wide text-primary-light/90 font-bold mb-2">
        {title}
      </h3>
      <div className="space-y-3">
        {items.map((it, idx) => (
          <p
            key={idx}
            className="text-[14px] leading-relaxed text-foreground/85 whitespace-pre-wrap"
          >
            {renderInline(it)}
          </p>
        ))}
      </div>
    </section>
  );
}

export function SumulaVinculanteSheet({ sumula, isFavorita = false, onToggleFavorita, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const extras = sumula.extras ?? {};

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function copyEnunciado() {
    try {
      await navigator.clipboard.writeText(`Súmula Vinculante ${sumula.numero}\n\n${sumula.enunciado}`);
      setCopied(true);
      toast.success('Enunciado copiado');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Falha ao copiar');
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute inset-x-0 bottom-0 top-4 bg-background rounded-t-3xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-border/60 px-4 pt-3 pb-4">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl font-bold text-primary-light">
                    Súmula Vinculante {sumula.numero}
                  </h2>
                  {sumula.situacao === 'cancelada' ? (
                    <span className="text-[11px] bg-destructive/15 text-destructive px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Ban className="w-3 h-3" /> Cancelada
                    </span>
                  ) : (
                    <span className="text-[11px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" /> Vigente
                    </span>
                  )}
                </div>
                {sumula.data_publicacao && (
                  <p className="text-[12px] text-muted-foreground mt-1">{sumula.data_publicacao}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={onToggleFavorita}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isFavorita ? 'bg-rose-500/15' : 'bg-secondary hover:bg-secondary/70'}`}
                  aria-label={isFavorita ? 'Remover favorito' : 'Adicionar aos favoritos'}
                >
                  <Heart className={`w-4 h-4 ${isFavorita ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
                </button>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-secondary hover:bg-secondary/70 flex items-center justify-center"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="rounded-2xl bg-secondary/50 p-4 border border-border/40">
              <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                {sumula.enunciado || 'Enunciado não disponível.'}
              </p>
            </div>

            <Section title="Precedentes Representativos" items={extras.precedentes_representativos} />
            <Section title="Teses de Repercussão Geral" items={extras.teses_repercussao_geral} />
            <Section title="Jurisprudência Selecionada" items={extras.jurisprudencia_selecionada} />
            <Section title="Observação" items={extras.observacao} />

            <div className="h-24" />
          </div>

          {/* Actions */}
          <div className="shrink-0 border-t border-border/60 bg-background px-4 py-3 flex items-center gap-2">
            <button
              onClick={copyEnunciado}
              className="flex-1 h-11 rounded-xl bg-secondary hover:bg-secondary/70 font-semibold text-sm flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copiar
            </button>
            {sumula.referencia && (
              <a
                href={sumula.referencia}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir no STF
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SumulaVinculanteSheet;