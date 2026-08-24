import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { HIGHLIGHT_COLORS, type Highlight } from '@/hooks/useHighlights';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Props {
  open: boolean;
  onClose: () => void;
  highlights: Highlight[];
  onRemoveByColor: (color: string) => void;
  onClearAll: () => void;
}

const NAME_BY_VALUE = Object.fromEntries(HIGHLIGHT_COLORS.map(c => [c.value, c.name]));
Object.assign(NAME_BY_VALUE, {
  'rgba(234, 179, 8, 0.55)': 'Chave',
  'rgba(34, 197, 94, 0.55)': 'Exceção',
  'rgba(59, 130, 246, 0.55)': 'Efeito',
  'rgba(236, 72, 153, 0.55)': 'Termo',
  'rgba(249, 115, 22, 0.55)': 'Pegadinha',
});

const GrifoEraseSheet = ({ open, onClose, highlights, onRemoveByColor, onClearAll }: Props) => {
  useEscapeKey(open, onClose);
  const [confirm, setConfirm] = useState<null | { type: 'all' } | { type: 'color'; color: string; name: string; count: number }>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of highlights) map.set(h.color, (map.get(h.color) || 0) + 1);
    return Array.from(map.entries()).map(([color, count]) => ({
      color,
      count,
      name: NAME_BY_VALUE[color] || 'Personalizada',
    }));
  }, [highlights]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10010]"
      />
      <motion.aside
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="fixed bottom-0 left-0 right-0 z-[10011] bg-card border-t border-border rounded-t-3xl shadow-2xl pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] max-h-[80vh] mx-auto max-w-lg overflow-hidden flex flex-col md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 md:top-auto md:w-[92vw] md:max-w-2xl md:rounded-3xl md:border md:border-border md:shadow-2xl"
      >
        <div className="pt-3 pb-2 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            <h3 className="font-heading text-base font-semibold text-foreground">Apagar grifos</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {grouped.length === 0 && (
            <p className="text-center text-sm text-foreground/60 py-8 px-4">Não há grifos neste artigo.</p>
          )}
          {grouped.map(g => (
            <button
              key={g.color}
              onClick={() => setConfirm({ type: 'color', color: g.color, name: g.name, count: g.count })}
              className="w-full min-h-[70px] flex items-center gap-3.5 px-5 py-4 hover:bg-secondary/60 text-left transition-colors"
            >
              <span className="w-8 h-8 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: g.color }} />
              <span className="flex-1">
                <span className="block text-[15px] font-medium text-foreground">{g.name}</span>
                <span className="block text-[12.5px] text-foreground/60">{g.count} {g.count === 1 ? 'grifo' : 'grifos'}</span>
              </span>
              <Trash2 className="w-4 h-4 text-red-400/80" />
            </button>
          ))}

          {grouped.length > 0 && (
            <div className="mt-2 px-5 pt-3 border-t border-border">
              <button
                onClick={() => setConfirm({ type: 'all' })}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Apagar todos os grifos
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {confirm && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10020] bg-black/70" onClick={() => setConfirm(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.92, x: '-50%', y: '-50%' }}
            className="fixed left-1/2 top-1/2 z-[10021] w-[calc(100vw-2rem)] max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5"
          >

            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="font-semibold text-foreground">Confirmar</p>
            </div>
            <p className="text-sm text-foreground/80 mb-5">
              {confirm.type === 'all'
                ? `Apagar todos os ${highlights.length} grifos deste artigo? Esta ação não pode ser desfeita.`
                : `Apagar os ${confirm.count} grifos ${confirm.name.toLowerCase()}? Esta ação não pode ser desfeita.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirm.type === 'all') onClearAll();
                  else onRemoveByColor(confirm.color);
                  setConfirm(null);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600"
              >
                Apagar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default GrifoEraseSheet;
