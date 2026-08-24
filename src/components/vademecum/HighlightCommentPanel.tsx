import { motion } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
import type { Highlight } from '@/hooks/useHighlights';

interface HighlightCommentPanelProps {
  highlights: Highlight[];
  onClose: () => void;
  onScrollTo: (highlightId: string) => void;
}

const HighlightCommentPanel = ({ highlights, onClose, onScrollTo }: HighlightCommentPanelProps) => {
  const withComments = highlights.filter(h => h.comment && h.comment.trim().length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      className="fixed bottom-24 right-6 z-[70] w-72 max-h-80 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Comentários</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {withComments.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-4">Nenhum comentário ainda.</p>
        ) : (
          withComments.map(h => (
            <button
              key={h.id}
              onClick={() => onScrollTo(h.id)}
              className="w-full text-left p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} />
                <span className="text-xs text-muted-foreground truncate">"{h.text.slice(0, 40)}{h.text.length > 40 ? '...' : ''}"</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">{h.comment}</p>
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default HighlightCommentPanel;
