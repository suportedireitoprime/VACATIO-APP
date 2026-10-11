import { ChevronDown, Heart, Bell, X } from 'lucide-react';

interface LivroFloatingActionsProps {
  fav: boolean;
  onToggleFav: () => void;
  onOpenLembrete: () => void;
  onClose: () => void;
  inline?: boolean;
  isDesktop?: boolean;
}

export const LivroFloatingActions = ({
  fav,
  onToggleFav,
  onOpenLembrete,
  onClose,
  inline,
  isDesktop,
}: LivroFloatingActionsProps) => {
  return (
    <>
      <div className="absolute top-[calc(var(--sai-top,0px)+0.75rem)] left-4 z-20 flex gap-2">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xl backdrop-saturate-150 transition-colors flex items-center justify-center border border-white/25 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]"
        >
          {(inline || isDesktop) ? <X className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
        </button>
      </div>

      <div className="absolute top-[calc(var(--sai-top,0px)+0.75rem)] right-4 z-20 flex gap-2">
        <button
          onClick={onOpenLembrete}
          aria-label="Criar lembrete de leitura"
          className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xl backdrop-saturate-150 transition-colors flex items-center justify-center border border-white/25 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]"
        >
          <Bell className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={onToggleFav}
          aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xl backdrop-saturate-150 transition-colors flex items-center justify-center border border-white/25 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)]"
        >
          <Heart className={`w-5 h-5 ${fav ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
        </button>
      </div>
    </>
  );
};
