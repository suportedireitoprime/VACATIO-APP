import React, { memo } from 'react';
import { Heart, Flame, BarChart3, Route } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

interface AudioActionShortcutsProps {
  colorScheme?: 'purple' | 'blue';
  onFavoritos: () => void;
  onEmAlta: () => void;
  onEstatistica: () => void;
  onTrilhas: () => void;
  badgeFavoritos?: number;
  badgeTrilhas?: number;
  className?: string;
}

export const AudioActionShortcuts: React.FC<AudioActionShortcutsProps> = memo(
  function AudioActionShortcuts({
    colorScheme = 'purple',
    onFavoritos,
    onEmAlta,
    onEstatistica,
    onTrilhas,
    badgeFavoritos = 0,
    badgeTrilhas = 0,
    className = '',
  }) {
    const isPurple = colorScheme === 'purple';

    const ITEMS = [
      {
        id: 'favoritos',
        label: 'Favoritos',
        icon: Heart,
        color: isPurple ? '#C084FC' : '#60A5FA',
        badge: badgeFavoritos,
        badgeColor: isPurple ? '#9333EA' : '#2563EB',
        action: onFavoritos,
      },
      {
        id: 'em_alta',
        label: 'Em alta',
        icon: Flame,
        color: '#FB923C',
        badge: 0,
        badgeColor: '#EA580C',
        action: onEmAlta,
      },
      {
        id: 'estatistica',
        label: 'Estatística',
        icon: BarChart3,
        color: isPurple ? '#A78BFA' : '#38BDF8',
        badge: 0,
        badgeColor: isPurple ? '#7C3AED' : '#0284C7',
        action: onEstatistica,
      },
      {
        id: 'trilhas',
        label: 'Trilhas',
        icon: Route,
        color: '#FACC15',
        badge: badgeTrilhas,
        badgeColor: '#CA8A04',
        action: onTrilhas,
      },
    ];

    return (
      <div
        className={`flex items-center justify-between gap-1.5 sm:gap-2 mx-1 mt-2.5 sm:mt-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-2xl relative z-10 ${className}`}
      >
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                haptic.selection();
                item.action();
              }}
              className="flex-1 min-w-0 group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl hover:bg-white/5 active:bg-white/10 transition-all duration-200 active:scale-95 gap-1.5 text-center select-none cursor-pointer overflow-hidden"
              aria-label={item.label}
            >
              {item.badge > 0 && (
                <span
                  className="absolute top-1 right-2 min-w-[16px] h-[16px] px-1 rounded-full text-white text-[9px] font-bold leading-none flex items-center justify-center border border-white/20 shadow z-10"
                  style={{ backgroundColor: item.badgeColor }}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}

              <Icon
                className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-200 group-hover:scale-110"
                style={{
                  color: item.color,
                  filter: 'saturate(1.2) drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                }}
                strokeWidth={1.8}
              />
              <span className="font-sans text-white/95 text-[11px] sm:text-[12px] font-medium leading-tight tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }
);

export default AudioActionShortcuts;
