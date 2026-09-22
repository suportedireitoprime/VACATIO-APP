import { memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface HomeCardProps {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  color: string;
  delay?: number;
  inlineTitle?: boolean;
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
const HomeCardImpl = ({
  icon: Icon,
  label,
  sublabel,
  color,
  delay = 0,
  inlineTitle = false,
  onClick,
  className = '',
  'data-track': dataTrack,
  'data-track-name': dataTrackName,
  'data-track-section': dataTrackSection,
}: HomeCardProps) => (
  <motion.button
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
    onClick={onClick}
    data-track={dataTrack}
    data-track-name={dataTrackName}
    data-track-section={dataTrackSection}
    className={`group relative flex flex-col justify-between w-full min-h-[104px] h-full p-3.5 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] border border-white/[0.08] shadow-sm hover:shadow-md active:scale-[0.97] transition-all text-left overflow-hidden ${className}`}
  >
    {inlineTitle ? (
      <>
        <div className="flex items-center justify-between w-full gap-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icon
              className="w-6 h-6 relative shrink-0 transition-transform duration-300 group-hover:scale-105"
              style={{
                color,
                filter: 'saturate(1.2) drop-shadow(0 1px 4px rgba(0,0,0,0.4))',
              }}
              strokeWidth={1.5}
            />
            <p
              className={`font-display text-white font-bold uppercase leading-tight line-clamp-2 ${
                label.length <= 6
                  ? 'text-[17px] sm:text-[18px] font-black tracking-normal'
                  : 'text-[12px] sm:text-[13px] tracking-tight'
              }`}
            >
              {label}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/35 shrink-0 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="w-full min-w-0 mt-auto pt-2">
          {sublabel && (
            <p className="font-body text-zinc-400 text-[11px] sm:text-[11.5px] leading-snug line-clamp-2">
              {sublabel}
            </p>
          )}
        </div>
      </>
    ) : (
      <>
        <div className="flex items-center justify-between w-full">
          <Icon
            className="w-7 h-7 relative shrink-0 transition-transform duration-300 group-hover:scale-105"
            style={{
              color,
              filter: 'saturate(1.2) drop-shadow(0 1px 4px rgba(0,0,0,0.4))',
            }}
            strokeWidth={1.5}
          />
          <ChevronRight className="w-4 h-4 text-white/35 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="w-full min-w-0 mt-auto">
          <p className="font-display text-white text-[14.5px] sm:text-[15.5px] font-bold uppercase tracking-tight leading-tight line-clamp-2">
            {label}
          </p>
          {sublabel && (
            <p className="font-body text-zinc-400 text-[11px] sm:text-[11.5px] leading-snug mt-0.5 truncate">
              {sublabel}
            </p>
          )}
        </div>
      </>
    )}
  </motion.button>
);

// Memoize: parent re-renders (tab switches, voice input state, sheets opening)
// were causing the entire card grid to re-render even though card props are stable.
const HomeCard = memo(HomeCardImpl);
export default HomeCard;
