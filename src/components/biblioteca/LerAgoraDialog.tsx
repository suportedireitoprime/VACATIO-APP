import { Sparkles, BookOpen, BookCopy, Download, Monitor, X, Check, Loader2, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

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
}

const LerAgoraDialog = ({ open, onClose, onSelect, hasPdf, hasOnline, pdfCached, downloadProgress }: Props) => {
  const isDownloading = downloadProgress != null;
  const [online, setOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
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
                    onClick={() => onSelect('nativa')}
                    className="w-full min-h-[68px] rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4 text-left flex items-center gap-3 shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0 border border-primary-foreground/20 backdrop-blur-sm">
                      <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={2.25} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-sm">Leitura Nativa</div>
                      <div className="text-[11px] opacity-90 leading-tight mt-0.5">
                        Estilo Kindle, com OCR e busca por IA
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Outras opções — lista compacta */}
              {(hasPdf || hasOnline) && (
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
                        onClick={() => onSelect('pdf')}
                      />
                    )}
                    {hasOnline && online && (
                      <OptionRow
                        icon={BookCopy}
                        title="Versão folheada"
                        desc="Versão folheável no navegador"
                        onClick={() => onSelect('online')}
                      />
                    )}
                    {hasOnline && !online && (
                      <div className="w-full min-h-[52px] rounded-2xl bg-secondary/30 p-3 flex items-center gap-3 border border-border/40 opacity-70">
                        <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0">
                          <WifiOff className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-body font-semibold text-sm text-foreground">Versão folheada</div>
                          <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">Indisponível offline</div>
                        </div>
                      </div>
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
                          onClick={() => onSelect('pdf')}
                        />
                      ) : (
                        <OptionRow
                          icon={Download}
                          title="Baixar para offline"
                          desc="Salva o PDF no aparelho para ler sem internet"
                          onClick={() => onSelect('download')}
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
                  onClick={() => onSelect('desktop')}
                  className="w-full min-h-[56px] rounded-2xl bg-secondary/60 hover:bg-secondary active:scale-[0.99] p-3 text-left flex items-center gap-3 transition-all border border-border/60"
                >
                  <div className="w-11 h-11 rounded-xl bg-background flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-semibold text-sm text-foreground">Versão desktop</div>
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
    </AnimatePresence>,
    document.body
  );
};

const OptionRow = ({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof BookOpen;
  title: string;
  desc: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full min-h-[52px] rounded-2xl bg-secondary/60 hover:bg-secondary active:scale-[0.99] p-3 text-left flex items-center gap-3 transition-all border border-border/60"
  >
    <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-foreground" strokeWidth={2} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-body font-semibold text-sm text-foreground">{title}</div>
      <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</div>
    </div>
  </button>
);

export default LerAgoraDialog;
