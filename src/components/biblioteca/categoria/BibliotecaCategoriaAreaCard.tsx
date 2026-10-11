import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { styleForArea } from '@/lib/bibliotecaIcons';

export interface AreaItem {
  name: string;
  capa?: string;
  count: number;
}

interface BibliotecaCategoriaAreaCardProps {
  area: AreaItem;
  index?: number;
  onClick: () => void;
  variant?: 'desktop' | 'mobile';
}

export const BibliotecaCategoriaAreaCard = memo(function BibliotecaCategoriaAreaCard({
  area,
  index = 0,
  onClick,
  variant = 'mobile',
}: BibliotecaCategoriaAreaCardProps) {
  const s = styleForArea(area.name);
  const Icon = s.icon;

  if (variant === 'desktop') {
    return (
      <motion.button
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-secondary/50 transition-colors text-left group"
      >
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
          <Icon className="w-6 h-6" style={{ color: s.color }} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-foreground text-sm uppercase truncate group-hover:text-primary transition-colors">
            {area.name}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {area.count} {area.count === 1 ? 'livro' : 'livros'}
          </p>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors text-left w-full relative overflow-hidden"
    >
      <div className="w-11 h-11 rounded-xl bg-secondary/70 flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6" style={{ color: s.color }} strokeWidth={1.6} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display font-bold text-foreground text-[14px] leading-tight uppercase truncate">
          {area.name}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {area.count} {area.count === 1 ? 'livro' : 'livros'}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </motion.button>
  );
});
