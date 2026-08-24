import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Route, Target, Trophy, Layers } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

type Tab = {
  id: string;
  label: string;
  to: string;
  icon: typeof BookOpen;
  match: (path: string) => boolean;
};

const TABS: Tab[] = [
  {
    id: 'teoria',
    label: 'Teoria',
    to: '/aprender',
    icon: BookOpen,
    match: (p) => p === '/aprender' || p.startsWith('/aprender/teoria') || p.startsWith('/aprender/area') || p.startsWith('/aprender/aula'),
  },
  {
    id: 'trilhas',
    label: 'Trilhas',
    to: '/aprender/trilhas',
    icon: Route,
    match: (p) => p.startsWith('/aprender/trilhas'),
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    to: '/aprender/flashcards',
    icon: Layers,
    match: (p) => p.startsWith('/aprender/flashcards'),
  },
  {
    id: 'questoes',
    label: 'Questões',
    to: '/aprender/questoes',
    icon: Target,
    match: (p) => p.startsWith('/aprender/questoes'),
  },
  {
    id: 'conquistas',
    label: 'Conquistas',
    to: '/aprender/desempenho',
    icon: Trophy,
    match: (p) => p.startsWith('/aprender/desempenho') || p.startsWith('/aprender/conquistas'),
  },
];

const AprenderBottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegação Aprender"
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden md:bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto"
    >
      <div className="bg-card/95 backdrop-blur-md border-t border-border rounded-t-3xl shadow-lg shadow-black/10 pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] md:border md:rounded-full md:shadow-2xl md:shadow-black/30 md:pb-0">
        <div className="grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto md:gap-1 md:px-3 md:py-2">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  haptic.selection();
                  if (!active) navigate(tab.to);
                }}
                className={`relative flex flex-col items-center justify-end gap-1 py-1.5 px-1 rounded-2xl transition-colors ${
                  active ? 'text-primary' : 'text-foreground hover:text-primary'
                }`}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="aprender-nav-active-pill"
                    className="absolute inset-0 rounded-2xl bg-[#EFE039]/15 ring-1 ring-[#EFE039]/30"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    aria-hidden="true"
                  />
                )}
                <Icon className="relative w-7 h-7 sm:w-8 sm:h-8" strokeWidth={active ? 1.9 : 1.5} />
                <span className={`relative text-[10px] sm:text-[11px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default AprenderBottomNav;
