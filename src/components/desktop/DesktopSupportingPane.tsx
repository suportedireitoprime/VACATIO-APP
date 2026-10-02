import { useDesktopPaneStore } from '@/stores/useDesktopPaneStore';
import { useIsDesktop } from '@/hooks/use-desktop';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DesktopSupportingPane() {
  const { isOpen, title, content, closePane } = useDesktopPaneStore();
  const isDesktop = useIsDesktop();

  if (!isDesktop) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-[64px] right-0 bottom-0 w-[320px] bg-card border-l border-border/40 shadow-2xl z-40 flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <h3 className="font-display font-semibold text-foreground text-sm tracking-wide uppercase">{title}</h3>
            <button
              onClick={closePane}
              className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
