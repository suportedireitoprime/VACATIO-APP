import { motion } from 'framer-motion';
import { Headphones, Heart, Download, Search } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

export type AudioaulasTab = 'aulas' | 'favoritas' | 'baixadas' | 'buscar';

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
      className="fixed bottom-0 left-0 right-0 z-50 md:bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto"
    >
      <div className="bg-card/95 backdrop-blur-md border-t border-border rounded-t-3xl shadow-lg shadow-black/10 pb-safe md:border md:rounded-full md:shadow-2xl md:shadow-black/30 md:pb-0">
        <div className="grid grid-cols-4 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto md:gap-1 md:px-3 md:py-2">
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
                className={`relative flex flex-col items-center justify-end gap-1 py-1.5 px-1 rounded-2xl transition-colors ${
                  active ? 'text-white' : 'text-muted-foreground hover:text-white/80'
                }`}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="audioaulas-nav-active-pill"
                    className="absolute inset-0 rounded-2xl bg-primary"
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center gap-1">
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};

export default AudioaulasBottomNav;
