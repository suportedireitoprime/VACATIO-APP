import { LucideIcon, Wrench, MessageSquare, Newspaper, Sparkles, User } from 'lucide-react';

export interface DesktopFunctionItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface Props {
  items: DesktopFunctionItem[];
}

/**
 * Linha horizontal de funções principais renderizada abaixo do hero no desktop.
 * Substitui o antigo grid de tiles do lado direito do hero — visual mais organizado,
 * menos disputa por atenção com a barra de busca, e navegação mais clara.
 */
const DesktopFunctionRow = ({ items }: Props) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 xl:gap-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={it.onClick}
            className="group relative overflow-hidden flex items-center gap-3 rounded-2xl px-4 py-4
              bg-gradient-to-br from-neutral-800/80 via-neutral-900/90 to-neutral-950
              border border-white/10 hover:border-primary/50 hover:-translate-y-0.5
              shadow-[0_6px_18px_-10px_rgba(0,0,0,0.6)]
              hover:shadow-[0_10px_24px_-12px_rgba(234,179,8,0.35)]
              transition-[transform,border-color,box-shadow,color] duration-200 text-left"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent" />
            <span className="relative z-10 w-11 h-11 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-foreground/85 group-hover:text-primary group-hover:border-primary/40 transition-colors">
              <Icon className="w-5 h-5" strokeWidth={1.8} />
            </span>
            <span className="relative z-10 flex flex-col min-w-0">
              <span className="font-display text-[13px] font-bold tracking-tight text-foreground/95 group-hover:text-primary transition-colors truncate">
                {it.label}
              </span>
              {it.description && (
                <span className="text-[11px] text-muted-foreground truncate">
                  {it.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Re-export common icons for convenience
export const DEFAULT_ICONS = { Wrench, MessageSquare, Newspaper, Sparkles, User };

export default DesktopFunctionRow;
