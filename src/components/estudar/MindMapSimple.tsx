import { motion } from 'framer-motion';
import { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { ChevronDown, ChevronRight, Scale, BookOpen, GitBranch, Circle, Lightbulb, FileText } from 'lucide-react';

interface MindMapNode {
  label: string;
  explicacao?: string;
  exemplo?: string;
  children?: MindMapNode[];
}

interface MindMapSimpleProps {
  data: MindMapNode;
}

export interface MindMapSimpleHandle {
  expandAll: () => void;
  collapseDefaults: () => void;
}

const LEVEL_COLORS = [
  { border: 'border-primary', bg: 'bg-primary/15', text: 'text-primary', icon: Scale },
  { border: 'border-violet-500', bg: 'bg-violet-500/15', text: 'text-violet-400', icon: BookOpen },
  { border: 'border-sky-500', bg: 'bg-sky-500/15', text: 'text-sky-400', icon: GitBranch },
  { border: 'border-emerald-500', bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: Circle },
  { border: 'border-rose-500', bg: 'bg-rose-500/15', text: 'text-rose-400', icon: Circle },
];

const Branch = ({ node, level = 0, forceOpen }: { node: MindMapNode; level?: number; forceOpen?: boolean }) => {
  const [open, setOpen] = useState(level <= 1);
  const isOpen = forceOpen || open;
  const config = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];
  const isRoot = level === 0;
  const hasChildren = node.children && node.children.length > 0;
  const LevelIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: level * 0.02 }}
      className={`${isRoot ? '' : 'ml-3 sm:ml-5'}`}
    >
      <div className="mb-2">
        <button
          onClick={() => hasChildren && setOpen(!open)}
          className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border ${config.border} ${config.bg} shadow-sm hover:shadow transition-shadow ${
            isRoot ? 'text-xs sm:text-sm font-bold' : level === 1 ? 'text-[11px] sm:text-[13px] font-semibold' : 'text-[10px] sm:text-xs font-medium'
          } text-foreground`}
        >
          <LevelIcon className={`w-3.5 h-3.5 shrink-0 ${config.text}`} />
          {hasChildren && (
            isOpen ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
          )}
          {node.label}
        </button>

        {(node.explicacao || node.exemplo) && (
          <div className="ml-4 sm:ml-6 mt-1.5 space-y-1">
            {node.explicacao && (
              <p className="flex items-start gap-1.5 text-[11px] sm:text-xs text-foreground/80 leading-relaxed">
                <Lightbulb className="w-3 h-3 shrink-0 mt-0.5 text-amber-400" />
                {node.explicacao}
              </p>
            )}
            {node.exemplo && (
              <p className="flex items-start gap-1.5 text-[11px] sm:text-xs text-foreground/70 leading-relaxed italic">
                <FileText className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
                {node.exemplo}
              </p>
            )}
          </div>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className={`border-l ${config.border} ml-3 sm:ml-5 pl-2 sm:pl-3 space-y-1`}>
          {node.children!.map((child, i) => (
            <Branch key={i} node={child} level={level + 1} forceOpen={forceOpen} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

const MindMapSimple = forwardRef<MindMapSimpleHandle, MindMapSimpleProps>(({ data }, ref) => {
  const [forceOpen, setForceOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    expandAll: () => setForceOpen(true),
    collapseDefaults: () => setForceOpen(false),
  }));

  return (
    <div className="w-full p-3 sm:p-6 rounded-xl border border-border bg-background overflow-auto max-h-[75vh]">
      <Branch node={data} forceOpen={forceOpen} />
    </div>
  );
});

MindMapSimple.displayName = 'MindMapSimple';

export default MindMapSimple;
