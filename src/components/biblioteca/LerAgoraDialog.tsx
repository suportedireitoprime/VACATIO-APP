import { Sparkles, BookOpen, Download, Monitor, X, Check, Loader2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import PremiumGate from '@/components/PremiumGate';
import { useSubscription } from '@/hooks/useSubscription';

export type LerModo = 'nativa' | 'pdf' | 'online' | 'download' | 'desktop';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (modo: LerModo) => void;
  hasPdf: boolean;
  hasOnline: boolean;
  /** true se o PDF já foi baixado para offline no dispositivo */
  pdfCached?: boolean;
  /** progresso de download em %, null quando não está baixando */
  downloadProgress?: number | null;
  /** Disparado quando o usuário gratuito quer ver um exemplo prático */
  onSelectExample?: (modo: LerModo) => void;
}

const LerAgoraDialog = ({ open, onClose, onSelect, onSelectExample, hasPdf, hasOnline, pdfCached, downloadProgress }: Props) => {
  const isDownloading = downloadProgress != null;
  const { isPremium } = useSubscription();
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [attemptedModo, setAttemptedModo] = useState<LerModo | null>(null);

  const handleSelect = (modo: LerModo) => {
    if (!isPremium) {
      setAttemptedModo(modo);
      setShowPremiumGate(true);
      return;
    }
    onSelect(modo);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          key="ler-agora-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-3 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ler-agora-title"
            className="relative w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h3 id="ler-agora-title" className="font-display text-base font-bold text-foreground">
                Escolha como ler
              </h3>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Recomendado — Leitura Nativa */}
              {hasPdf && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-primary/80 font-semibold mb-2">
                    Recomendado
                  </div>
                  <button
                    onClick={() => handleSelect('nativa')}
                    className="w-full min-h-[68px] rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 text-left flex items-center gap-3 shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0 border border-primary-foreground/20 backdrop-blur-sm">
                      <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={2.25} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-sm flex items-center gap-1.5">
                        Leitura Nativa {!isPremium && <Lock className="w-3.5 h-3.5 text-primary-foreground/80" />}
                      </div>
                      <div className="text-[11px] opacity-90 leading-tight mt-0.5">
                        Estilo Kindle, com OCR e busca por IA
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Outras opções — lista compacta */}
              {hasPdf && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                    Outras opções
                  </div>
                  <div className="space-y-2">
                    {hasPdf && (
                      <OptionRow
                        icon={BookOpen}
                        title="Ler em PDF"
                        desc="Abre o PDF dentro do app com rolagem contínua"
                        onClick={() => handleSelect('pdf')}
                        isPremium={isPremium}
                      />
                    )}
                    {hasPdf && (
                      isDownloading ? (
                        <div className="w-full rounded-2xl bg-secondary/60 p-3 border border-border/60">
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <div className="flex-1 text-sm font-semibold text-foreground">Baixando PDF… {downloadProgress}%</div>
                          </div>
                          <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${downloadProgress}%` }} />
                          </div>
                        </div>
                      ) : pdfCached ? (
                        <OptionRow
                          icon={Check}
                          title="PDF disponível offline"
                          desc="Baixado. Toque em 'Ler em PDF' para abrir sem internet."
                          onClick={() => handleSelect('pdf')}
                          isPremium={isPremium}
                        />
                      ) : (
                        <OptionRow
                          icon={Download}
                          title="Baixar para offline"
                          desc="Salva o PDF no aparelho para ler sem internet"
                          onClick={() => handleSelect('download')}
                          isPremium={isPremium}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Versão desktop */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                  Continuar em outro dispositivo
                </div>
                <button
                  onClick={() => handleSelect('desktop')}
                  className="w-full min-h-[56px] rounded-2xl bg-secondary/60 hover:bg-secondary active:scale-[0.99] p-3 text-left flex items-center gap-3 transition-all border border-border/60"
                >
                  <div className="w-11 h-11 rounded-xl bg-background flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-semibold text-sm text-foreground flex items-center gap-1.5">
                      Versão desktop {!isPremium && <Lock className="w-3.5 h-3.5 text-muted-foreground/70" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      Ler no computador com layout ampliado
                    </div>
                  </div>
                </button>
              </div>

              {!hasPdf && !hasOnline && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum link de leitura disponível.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    <PremiumGate
      open={showPremiumGate}
      onClose={() => setShowPremiumGate(false)}
      feature="biblioteca"
      onLibraryExample={
        onSelectExample && attemptedModo && (attemptedModo === 'nativa' || attemptedModo === 'pdf')
          ? () => {
              setShowPremiumGate(false);
              onClose();
              onSelectExample(attemptedModo);
            }
          : undefined
      }
    />
    </>,
    document.body
  );
};

const OptionRow = ({
  icon: Icon,
  title,
  desc,
  onClick,
  isPremium,
}: {
  icon: typeof BookOpen;
  title: string;
  desc: string;
  onClick: () => void;
  isPremium: boolean;
}) => (
  <button
    onClick={onClick}
    className="w-full min-h-[52px] rounded-2xl bg-secondary/60 hover:bg-secondary active:scale-[0.99] p-3 text-left flex items-center gap-3 transition-all border border-border/60"
  >
    <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-foreground" strokeWidth={2} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-body font-semibold text-sm text-foreground flex items-center gap-1.5">
        {title} {!isPremium && <Lock className="w-3.5 h-3.5 text-muted-foreground/70" />}
      </div>
      <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</div>
    </div>
  </button>
);

export default LerAgoraDialog;
