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
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="flex items-center gap-4 p-5 rounded-2xl bg-zinc-900/70 border border-white/10 hover:border-white/25 hover:bg-zinc-800/80 transition-all text-left group shadow-lg"
      >
        <div className="shrink-0 flex items-center justify-center">
          <Icon
            className="w-9 h-9 transition-transform group-hover:scale-110 duration-200"
            style={{ color: s.color, filter: `drop-shadow(0 2px 8px ${s.color}50)` }}
            strokeWidth={1.8}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-sans font-semibold text-white text-[16px] sm:text-[17px] tracking-tight truncate group-hover:text-primary transition-colors">
            {area.name}
          </div>
          <p className="text-[12px] sm:text-[13px] text-zinc-400 font-medium mt-0.5">
            {area.count} {area.count === 1 ? 'livro catalogado' : 'livros catalogados'}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-primary/20 flex items-center justify-center text-zinc-400 group-hover:text-white transition-all shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="group flex items-center gap-4 px-4 py-4 sm:py-4.5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-white/20 active:bg-zinc-850 transition-all text-left w-full shadow-md active:scale-[0.99] relative overflow-hidden"
    >
      {/* Ícone sem fundo quadrado cinza, maior e com destaque elegante */}
      <div className="shrink-0 flex items-center justify-center pl-1">
        <Icon
          className="w-8 h-8 sm:w-9 sm:h-9 transition-transform group-active:scale-105 duration-200"
          style={{ color: s.color, filter: `drop-shadow(0 2px 6px ${s.color}45)` }}
          strokeWidth={1.8}
        />
      </div>

      {/* Tipografia elegante e harmoniosa */}
      <div className="min-w-0 flex-1">
        <div className="font-sans font-semibold text-white text-[16px] sm:text-[17px] leading-tight tracking-tight truncate group-hover:text-primary transition-colors">
          {area.name}
        </div>
        <p className="text-[12px] sm:text-[12.5px] text-zinc-400 font-medium mt-1">
          {area.count} {area.count === 1 ? 'livro catalogado' : 'livros catalogados'}
        </p>
      </div>

      {/* Chevron de navegação */}
      <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-primary/20 flex items-center justify-center text-zinc-400 group-hover:text-white transition-all shrink-0 pr-0.5">
        <ChevronRight className="w-4 h-4" />
      </div>
    </motion.button>
  );
});
