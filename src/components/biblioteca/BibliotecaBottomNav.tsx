import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookMarked, Heart, HardDrive, Library, Route as RouteIcon } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

export type BibliotecaAtalhoTab = 'leitura' | 'favoritos' | 'recentes' | 'offline' | 'trilhas';

/** Abre um dos painéis da BibliotecaAtalhosBar (Leitura, Favoritos, Recentes, Offline). */
export function abrirAtalhoBiblioteca(tab: BibliotecaAtalhoTab) {
  window.dispatchEvent(new CustomEvent('biblioteca-atalho', { detail: { tab } }));
}

type Slot = {
  id: 'leitura' | 'favoritos' | 'biblioteca' | 'recentes' | 'offline' | 'trilhas';
  label: string;
  icon: typeof Heart;
};

const SLOTS: Slot[] = [
  { id: 'biblioteca', label: 'Biblioteca', icon: Library },
  { id: 'leitura', label: 'Leitura', icon: BookMarked },
  { id: 'trilhas', label: 'Trilhas', icon: RouteIcon },
  { id: 'favoritos', label: 'Favoritos', icon: Heart },
  { id: 'offline', label: 'Offline', icon: HardDrive },
];

/**
 * Rodapé da Biblioteca — mesmo padrão visual do rodapé do Vade Mecum
 * (painel cinza translúcido com pílula de item ativo).
 */
const BibliotecaBottomNav = ({ hidden = false }: { hidden?: boolean }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [active, setActive] = useState<Slot['id']>(() => {
    if (pathname.includes('/trilhas')) return 'trilhas';
    return 'biblioteca';
  });

  useEffect(() => {
    if (pathname.includes('/trilhas')) setActive('trilhas');
    else if (pathname.endsWith('/bibliotecas')) setActive('biblioteca');
    
    // Opcional: Escutar quando um modal fecha para voltar o visual para a aba atual da URL
    const handleClose = () => {
      if (window.location.hash.includes('/trilhas') || window.location.pathname.includes('/trilhas')) {
        setActive('trilhas');
      } else {
        setActive('biblioteca');
      }
    };
    window.addEventListener('biblioteca-atalho-close', handleClose);
    return () => window.removeEventListener('biblioteca-atalho-close', handleClose);
  }, [pathname]);

  const handle = (slot: Slot) => {
    haptic.selection();
    setActive(slot.id);
    if (slot.id === 'biblioteca') {
      if (pathname !== '/bibliotecas') navigate('/bibliotecas');
      return;
    }
    if (slot.id === 'trilhas') {
      if (!pathname.includes('/trilhas')) navigate('/bibliotecas/trilhas');
      return;
    }
    abrirAtalhoBiblioteca(slot.id);
  };

  return (
    <motion.nav
      aria-label="Navegação da Biblioteca"
      data-bottom-nav
      initial={false}
      animate={hidden ? { y: 120, opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[60] md:bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto"
    >
      <div className="bg-card/95 backdrop-blur-md border-t border-border rounded-t-3xl shadow-lg shadow-black/10 pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] md:border md:rounded-full md:shadow-2xl md:shadow-black/30 md:pb-0">
        <div className="grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto md:gap-1 md:px-3 md:py-2">
          {SLOTS.map((slot) => {
            const isActive = active === slot.id;
            const Icon = slot.icon;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => handle(slot)}
                className={`relative flex flex-col items-center justify-end gap-1 py-1.5 px-1 rounded-2xl transition-colors ${
                  isActive ? 'text-white' : 'text-muted-foreground hover:text-white/80'
                }`}
                aria-label={slot.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="biblioteca-nav-active-pill"
                    className="absolute inset-0 rounded-2xl bg-white/10 ring-1 ring-white/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    aria-hidden="true"
                  />
                )}
                <Icon className="relative w-7 h-7 sm:w-8 sm:h-8" strokeWidth={isActive ? 1.9 : 1.5} />
                <span className={`relative text-[10px] sm:text-[11px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {slot.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};

export default BibliotecaBottomNav;
