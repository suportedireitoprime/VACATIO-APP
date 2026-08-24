import { useEffect, useState } from 'react';
import { Home, Gavel, Bell, Settings, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/nativeHaptics';

export type HorusTab = 'main' | 'funcoes' | 'notificacoes' | 'ajustes';

const NavShine = ({ active }: { active: boolean }) => (
  <AnimatePresence>
    {active && (
      <motion.span
        key="shine"
        aria-hidden="true"
        initial={{ x: '-140%' }}
        animate={{ x: '140%' }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.3, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent mix-blend-plus-lighter"
      />
    )}
  </AnimatePresence>
);

export default function HorusBottomNav({
  active,
  onChange,
  onOpenEu,
}: {
  active: HorusTab;
  onChange: (t: HorusTab) => void;
  onOpenEu?: () => void;
}) {
  // Reflexo rotativo entre os 5 slots (mesmo padrão do BottomNav principal)
  const [shineIdx, setShineIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setShineIdx((i) => (i + 1) % 5), 4000);
    return () => clearInterval(id);
  }, []);

  const go = (t: HorusTab) => {
    if (t !== active) haptic.selection();
    onChange(t);
  };

  const isFuncoes = active === 'funcoes';
  const isAlertas = active === 'notificacoes';
  const isInicio = active === 'main';
  const isAjustes = active === 'ajustes';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div
        className="bg-card/95 backdrop-blur-md border-t border-border rounded-t-3xl shadow-lg shadow-black/10"
        style={{ paddingBottom: 'var(--sai-bottom,env(safe-area-inset-bottom,0px))' }}
      >
        <div className="relative grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto">
          {/* Funções */}
          <button
            onClick={() => go('funcoes')}
            className={`flex flex-col items-center justify-end py-1.5 transition-colors ${
              isFuncoes ? 'text-primary' : 'text-foreground hover:text-primary'
            }`}
            aria-label="Funções"
          >
            <span className="relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-1 rounded-lg">
              <NavShine active={shineIdx === 0} />
              <Gavel className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
              <span className="font-body text-[11px] sm:text-[12px] leading-tight">Funções</span>
            </span>
          </button>

          {/* Alertas */}
          <button
            onClick={() => go('notificacoes')}
            className={`flex flex-col items-center justify-end py-1.5 transition-colors ${
              isAlertas ? 'text-primary' : 'text-foreground hover:text-primary'
            }`}
            aria-label="Alertas"
          >
            <span className="relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-1 rounded-lg">
              <NavShine active={shineIdx === 1} />
              <Bell className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
              <span className="font-body text-[11px] sm:text-[12px] leading-tight">Alertas</span>
            </span>
          </button>

          {/* Início — FAB central (mesmo padrão do "Ferramentas") */}
          <button
            onClick={() => go('main')}
            className="flex flex-col items-center justify-end -mt-11"
            aria-label="Início"
          >
            <span className="relative flex flex-col items-center gap-1.5 overflow-hidden pt-1 pb-1 px-2 rounded-2xl">
              <NavShine active={shineIdx === 2} />
              <span className="relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 ring-4 ring-background overflow-hidden">
                <Home className="w-9 h-9 sm:w-10 sm:h-10 text-primary-foreground relative z-[2]" strokeWidth={1.5} />
              </span>
              <span className={`font-body text-[11px] sm:text-[12px] font-semibold leading-tight ${isInicio ? 'text-primary' : 'text-primary/90'}`}>
                Início
              </span>
            </span>
          </button>

          {/* Ajustes */}
          <button
            onClick={() => go('ajustes')}
            className={`flex flex-col items-center justify-end py-1.5 transition-colors ${
              isAjustes ? 'text-primary' : 'text-foreground hover:text-primary'
            }`}
            aria-label="Ajustes"
          >
            <span className="relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-1 rounded-lg">
              <NavShine active={shineIdx === 3} />
              <Settings className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
              <span className="font-body text-[11px] sm:text-[12px] leading-tight">Ajustes</span>
            </span>
          </button>

          {/* Falar (atalho WhatsApp) */}
          {/* Eu — abre sheet de perfil pessoal */}
          <button
            onClick={() => { haptic.selection(); onOpenEu?.(); }}
            className="flex flex-col items-center justify-end py-1.5 text-foreground hover:text-emerald-400 transition-colors"
            aria-label="Eu — sobre mim"
          >
            <span className="relative flex flex-col items-center gap-1.5 overflow-hidden px-2 py-1 rounded-lg">
              <NavShine active={shineIdx === 4} />
              <User className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
              <span className="font-body text-[11px] sm:text-[12px] leading-tight">Eu</span>
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
