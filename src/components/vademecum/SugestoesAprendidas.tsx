import { Sparkles, ArrowUpRight } from 'lucide-react';
import type { SugestaoBusca } from '@/hooks/useSugestoesBusca';

interface Props {
  sugestoes: SugestaoBusca[];
  onClick: (s: SugestaoBusca) => void;
}

export default function SugestoesAprendidas({ sugestoes, onClick }: Props) {
  if (!sugestoes.length) return null;
  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          Atalhos aprendidos
        </span>
      </div>
      <div className="space-y-1.5">
        {sugestoes.map((s, i) => (
          <button
            key={`${s.termo_display}-${i}`}
            onClick={() => onClick(s)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
          >
            {s.top_thumb_url ? (
              <img src={s.top_thumb_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{s.top_title || s.termo_display}</p>
              <p className="text-xs text-muted-foreground truncate">
                "{s.termo_display}" · {s.clicks} {s.clicks === 1 ? 'clique' : 'cliques'}
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
