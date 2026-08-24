import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Assinatura from '@/pages/Assinatura';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface Props { open: boolean; onClose: () => void; }

const PlanosSheet = ({ open, onClose }: Props) => {
  useEscapeKey(open, onClose);
  const node = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed left-0 right-0 bottom-0 z-[1101] h-[90dvh] bg-background border-t border-border rounded-t-3xl flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
              <div className="w-12" />
              <div className="mx-auto w-10 h-1.5 rounded-full bg-muted-foreground/40" />
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-10 h-10 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Assinatura />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
  return createPortal(node, document.body);
};

export default PlanosSheet;
