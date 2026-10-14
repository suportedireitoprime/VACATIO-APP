import React from 'react';
import { Compass, Heart, Search, ListMusic, ArrowDownToLine } from 'lucide-react';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/nativeHaptics';

export type AudioaulasNavTab = 'aulas' | 'favoritas' | 'buscar' | 'playlists' | 'baixadas';

interface AudioaulasTopNavProps {
  ativo: AudioaulasNavTab;
  onSelect: (tab: AudioaulasNavTab) => void;
  totalFavoritas?: number;
  totalBaixadas?: number;
  totalPlaylists?: number;
}

interface NavItem {
  id: AudioaulasNavTab;
  label: string;
  icon: typeof Compass;
  badge?: number;
}

export const AudioaulasTopNav: React.FC<AudioaulasTopNavProps> = ({
  ativo,
  onSelect,
  totalFavoritas = 0,
  totalBaixadas = 0,
  totalPlaylists = 0,
}) => {
  const items: NavItem[] = [
    { id: 'aulas', label: 'Explorar', icon: Compass },
    { id: 'favoritas', label: 'Favoritos', icon: Heart, badge: totalFavoritas },
    { id: 'buscar', label: 'Pesquisar', icon: Search },
    { id: 'playlists', label: 'Playlists', icon: ListMusic, badge: totalPlaylists },
    { id: 'baixadas', label: 'Baixados', icon: ArrowDownToLine, badge: totalBaixadas },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-10 mb-6 -mt-2">
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md overflow-x-auto scrollbar-none shadow-lg">
        {items.map((item) => {
          const active = ativo === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                haptic.selection();
                onSelect(item.id);
              }}
              className={`relative flex items-center justify-center gap-2 py-2.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex-1 select-none ${
                active ? 'text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="audioaulas-top-pill"
                  className="absolute inset-0 rounded-xl bg-primary shadow-lg shadow-primary/25 border border-primary/40"
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-1.5">
                <Icon
                  className={`w-4 h-4 transition-transform ${
                    active ? 'scale-110 text-white' : 'text-zinc-400'
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      active ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AudioaulasTopNav;
