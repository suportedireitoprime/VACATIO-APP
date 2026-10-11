import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { useBibliotecaCapa } from '@/hooks/useBibliotecaAsset';
import { PrimeImage } from '@/components/ui/PrimeImage';
import type { LivroBadgeInfo } from '@/hooks/useLivroBadges';
import type { LivroNormalizado } from '@/lib/bibliotecaColecoes';

interface BibliotecaCategoriaLivroCardProps {
  livro: LivroNormalizado;
  onClick: () => void;
  priority?: boolean;
  badge?: LivroBadgeInfo;
  index?: number;
  onPrefetch?: () => void;
}

export const BibliotecaCategoriaLivroCard = memo(function BibliotecaCategoriaLivroCard({
  livro,
  onClick,
  priority,
  badge,
  index = 0,
  onPrefetch,
}: BibliotecaCategoriaLivroCardProps) {
  const capaUrl = useBibliotecaCapa(livro.capa, 300);
  const pct = badge?.progresso ? Math.round(badge.progresso * 100) : 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.05, 0.4),
        type: 'spring',
        stiffness: 300,
        damping: 24,
      }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onPointerEnter={onPrefetch}
      onTouchStart={onPrefetch}
      aria-label={`Abrir livro ${livro.titulo}${livro.autor ? ` de ${livro.autor}` : ''}`}
      className="group flex items-stretch gap-3 p-2.5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-secondary/40 transition-colors text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 relative overflow-hidden"
    >
      <div className="w-[72px] h-[100px] shrink-0 rounded-lg overflow-hidden bg-muted shadow-sm">
        <PrimeImage
          src={capaUrl}
          alt={`Capa do livro: ${livro.titulo}`}
          aspectRatio="auto"
          targetWidth={200}
          priority={priority}
          fallbackText={livro.titulo}
          containerClassName="w-full h-full"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
        <p className="text-[14px] sm:text-[15px] font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors break-words">
          {livro.titulo}
        </p>
        {livro.autor && (
          <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
            {livro.autor}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          {livro.area && (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
              {livro.area}
            </span>
          )}
          {badge?.favorito && (
            <span
              title="Favorito"
              className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500"
            >
              <Bookmark className="w-2.5 h-2.5 fill-current" />
              Favorito
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center pl-2 pr-1 shrink-0">
         <span className="text-[11px] uppercase tracking-wide font-bold text-primary px-3 py-1.5 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
            Ler
         </span>
      </div>

      {/* Barra de progresso na base do card */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-border/40">
        {pct > 0 && (
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </motion.button>
  );
});
