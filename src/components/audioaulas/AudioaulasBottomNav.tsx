import { motion } from 'framer-motion';
import { Headphones, Heart, Download, Search } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

export type AudioaulasTab = 'aulas' | 'favoritas' | 'baixadas' | 'buscar' | 'playlists';

const TABS: { id: AudioaulasTab; label: string; icon: typeof Headphones }[] = [
  { id: 'aulas', label: 'Aulas', icon: Headphones },
  { id: 'favoritas', label: 'Favoritas', icon: Heart },
  { id: 'baixadas', label: 'Baixadas', icon: Download },
  { id: 'buscar', label: 'Buscar', icon: Search },
];

/** Rodapé das Audioaulas — mesmo padrão visual do rodapé das Leis Cantadas. */
const AudioaulasBottomNav = ({
  ativo,
  onSelect,
  hidden = false,
}: {
  ativo: AudioaulasTab | null;
  onSelect: (tab: AudioaulasTab) => void;
  hidden?: boolean;
}) => {
  return (
    <motion.nav
      aria-label="Navegação Audioaulas"
      initial={false}
      animate={hidden ? { y: 120, opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 border-t border-white/10 backdrop-blur-xl pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto flex items-end justify-around px-2 pt-2 pb-1 relative">
        {TABS.map((tab) => {
          const active = ativo === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                haptic.selection();
                onSelect(tab.id);
              }}
              className={`relative flex flex-col items-center justify-end gap-1 py-1 px-3 rounded-2xl transition-colors ${
                active ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="audioaulas-nav-active-pill"
                  className="absolute inset-0 rounded-2xl bg-primary/20 border border-primary/30"
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-1">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    active ? 'scale-110 text-primary' : ''
                  }`}
                />
                <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default AudioaulasBottomNav;
