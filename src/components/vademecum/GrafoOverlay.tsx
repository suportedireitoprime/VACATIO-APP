import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import GrafoArtigos from '@/pages/GrafoArtigos';

interface GrafoOverlayProps {
  open: boolean;
  onClose: () => void;
  tabelaNome: string;
  leiNome?: string;
  artigoNumero?: string;
}

const GrafoOverlay = ({ open, onClose, tabelaNome, leiNome, artigoNumero }: GrafoOverlayProps) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-[60] bg-background"
        >
          <GrafoArtigos
            embedded
            tabelaNome={tabelaNome}
            leiNome={leiNome}
            artigoNumero={artigoNumero}
            onClose={onClose}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default GrafoOverlay;
