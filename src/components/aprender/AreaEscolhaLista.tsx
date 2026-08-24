import { useNavigate } from 'react-router-dom';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { AreaResumo } from '@/hooks/useAprenderAreasResumo';

type Props = {
  areas: AreaResumo[];
  loading: boolean;
  /** Aba aberta ao entrar na área */
  tab: 'flashcards' | 'questoes' | 'teoria';
  Icon: LucideIcon;
  accent: string;
  emptyText: string;
  /** Texto secundário por área */
  subtitle: (a: AreaResumo) => string;
};

const AreaEscolhaLista = ({ areas, loading, tab, Icon, accent, emptyText, subtitle }: Props) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <ul className="space-y-2.5">
        {[...Array(6)].map((_, i) => (
          <li key={i} className="h-[76px] animate-pulse rounded-2xl bg-muted" />
        ))}
      </ul>
    );
  }

  if (areas.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {areas.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => navigate(`/aprender/area/${a.slug}?tab=${tab}`)}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-accent/40 active:scale-[0.995]"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: a.cor ?? accent }}
            >
              <Icon className="h-5 w-5 text-black" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[15px] font-semibold text-foreground">
                {a.nome}
              </span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">{subtitle(a)}</span>
              <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${a.pct}%`, background: accent }}
                />
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
};

export default AreaEscolhaLista;
