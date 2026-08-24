import { memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface HomeCardProps {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  color: string;
  delay?: number;
  onClick: () => void;
  className?: string;
  'data-track'?: string;
  'data-track-name'?: string;
  'data-track-section'?: string;
}

/**
 * Card padrão usado em Categorias, Em Alta e Áreas.
 * Garante proporção, ícone, tipografia e espaçamento idênticos.
 */
const HomeCardImpl = ({ icon: Icon, label, sublabel, color, delay = 0, onClick, className = '', 'data-track': dataTrack, 'data-track-name': dataTrackName, 'data-track-section': dataTrackSection }: HomeCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
    onClick={onClick}
    data-track={dataTrack}
    data-track-name={dataTrackName}
    data-track-section={dataTrackSection}
    className={`group relative flex flex-col items-start justify-between w-full aspect-[1/0.50] p-4 rounded-2xl bg-card border border-border/60 shadow-sm active:scale-[0.97] transition text-left ${className}`}
  >
    <div className="absolute top-2.5 right-2.5">
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="relative overflow-hidden rounded-xl">
      <Icon
        className="w-8 h-8 relative"
        style={{
          color,
          filter: 'saturate(1.35) brightness(1.15) drop-shadow(0 2px 10px rgba(0,0,0,0.55))',
        }}
        strokeWidth={1.15}
      />
      <span aria-hidden className="pointer-events-none absolute inset-0 icon-shine" />
    </div>
    <div className="w-full mt-3">
      <p className="font-display text-foreground text-[17px] font-bold leading-tight tracking-tight">
        {label}
      </p>
      <p className="font-body text-muted-foreground text-[11.5px] leading-snug mt-0.5 line-clamp-2">
        {sublabel}
      </p>
    </div>
  </motion.button>
);

// Memoize: parent re-renders (tab switches, voice input state, sheets opening)
// were causing the entire card grid to re-render even though card props are stable.
const HomeCard = memo(HomeCardImpl);
export default HomeCard;
