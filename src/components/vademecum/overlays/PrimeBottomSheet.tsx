import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, DragControls, useReducedMotion } from 'framer-motion';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface PrimeBottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dragControls?: DragControls;
  className?: string;
  zIndex?: number;
}

export function PrimeBottomSheet({
  open,
  onClose,
  children,
  dragControls,
  className = '',
  zIndex = 100,
}: PrimeBottomSheetProps) {
  const shouldReduceMotion = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);

  // Bug 12: Hardware Back Button do Android
  useEffect(() => {
    if (!open || !Capacitor.isNativePlatform()) return;
    
    const listener = App.addListener('backButton', () => {
      onClose();
    });
    
    return () => {
      listener.then(l => l.remove());
    };
  }, [open, onClose]);

  // Bug 14: Scroll Lock Seguro e Bug 19: Atalho Esc Key
  useEffect(() => {
    if (!open) return;

    // Scroll lock
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Bug 18: Focus Trap Simples (Foca no modal ao abrir)
  useEffect(() => {
    if (open && modalRef.current) {
      setTimeout(() => {
        modalRef.current?.focus();
      }, 50);
    }
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop Escuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ zIndex: zIndex - 10 }}
            className="fixed inset-0 bg-black/80 touch-none"
          />

          {/* Painel Principal */}
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring', damping: 30, stiffness: 300,
              duration: shouldReduceMotion ? 0 : undefined
            }}
            drag={dragControls ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
            style={{ willChange: 'transform', zIndex }}
            className={`fixed inset-0 flex flex-col bg-background overscroll-none outline-none ${className}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
