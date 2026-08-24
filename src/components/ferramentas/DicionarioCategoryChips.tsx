import { CATEGORIAS, type CategoriaId } from "@/lib/dicionarioCategorias";
import { cn } from "@/lib/utils";
import { Flame, Sparkles, Scroll } from "lucide-react";

interface Props {
  active: CategoriaId;
  onChange: (id: CategoriaId) => void;
  counts?: Partial<Record<CategoriaId, number>>;
}

const ICONS: Partial<Record<CategoriaId, JSX.Element>> = {
  em_alta: <Flame className="w-3.5 h-3.5" />,
  latins: <Scroll className="w-3.5 h-3.5" />,
  todas: <Sparkles className="w-3.5 h-3.5" />,
};

export default function DicionarioCategoryChips({ active, onChange, counts }: Props) {
  return (
    <div className="-mx-4 sm:mx-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2 px-4 sm:px-0 pb-1">
        {CATEGORIAS.map((c) => {
          const isActive = c.id === active;
          const count = counts?.[c.id];
          return (
            <button
              key={c.id}
              onClick={() => onChange(c.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-all",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-secondary/50 text-foreground/80 border-border/60 hover:bg-secondary"
              )}
            >
              {ICONS[c.id]}
              <span>{c.label}</span>
              {typeof count === "number" && count > 0 && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-primary-foreground/20" : "bg-background/60 text-muted-foreground"
                  )}
                >
                  {count > 999 ? `${Math.round(count / 100) / 10}k` : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
