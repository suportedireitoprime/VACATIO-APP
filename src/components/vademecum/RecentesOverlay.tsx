import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, ChevronRight, Trash2, ScrollText } from 'lucide-react';
import { getRecentes, clearRecentes, type LeiRecente } from '@/lib/leisRecentes';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectLei: (lei: LeiRecente) => void;
}

const formatTime = (ts: number) => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
};

const RecentesOverlay = ({ open, onClose, onSelectLei }: Props) => {
  const [list, setList] = useState<LeiRecente[]>([]);

  useEffect(() => {
    if (open) setList(getRecentes());
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-background flex flex-col"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <header className="sticky top-0 z-10 bg-[#1c1c1c] border-b border-white/5 pt-[var(--sai-top,env(safe-area-inset-top,0px))]">
            <div className="flex items-center gap-3 px-4 h-20 md:h-[76px]">
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-12 h-12 md:w-11 md:h-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center active:scale-95 transition"
              >
                <X className="w-[22px] h-[22px] text-white" />
              </button>
              <div className="flex-1 min-w-0 text-center">
                <p className="font-display text-white text-[18px] md:text-[17px] font-semibold leading-tight truncate tracking-wide">
                  Leis recentes
                </p>
                <p className="font-body text-primary/80 text-xs md:text-[11px] leading-tight truncate">
                  {list.length === 0 ? 'Nenhuma lei acessada ainda' : `${list.length} lei${list.length > 1 ? 's' : ''} no histórico`}
                </p>
              </div>
              {list.length > 0 ? (
                <button
                  onClick={() => { clearRecentes(); setList([]); }}
                  aria-label="Limpar histórico"
                  className="w-12 h-12 md:w-11 md:h-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center active:scale-95 transition"
                >
                  <Trash2 className="w-5 h-5 text-white/70" />
                </button>
              ) : (
                <div className="w-12 md:w-11 shrink-0" />
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            {list.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 pt-20">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <p className="font-display text-foreground text-base">Sem leis recentes</p>
                <p className="font-body text-muted-foreground text-sm max-w-[260px]">
                  Abra qualquer lei e ela aparecerá aqui para acesso rápido.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {list.map((lei, i) => (
                  <motion.li
                    key={lei.leiId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                  >
                    <button
                      onClick={() => onSelectLei(lei)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card/50 border border-border/60 hover:border-primary/40 active:scale-[0.98] transition text-left"
                    >
                      <div
                        className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: '#2a2a2a' }}
                      >
                        <ScrollText className="w-5 h-5" style={{ color: '#E8B93A' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-[14px] font-bold text-foreground leading-tight uppercase tracking-wide truncate">
                          {lei.nome}
                        </p>
                        <p className="font-body text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
                          {lei.descricao || 'Norma completa'} · {formatTime(lei.openedAt)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RecentesOverlay;
