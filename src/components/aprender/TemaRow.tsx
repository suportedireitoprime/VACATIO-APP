import { ChevronRight, BookOpen } from 'lucide-react';

type Props = {
  numero: number;
  titulo: string;
  totalAulas: number;
  emPreparo: number;
  pct: number;
  onClick: () => void;
};

const TemaRow = ({ numero, titulo, totalAulas, emPreparo, pct, onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className="group flex h-[104px] w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40 active:scale-[0.995] sm:h-[112px] sm:gap-4 sm:p-4"
      aria-label={`Tema ${numero}: ${titulo}. ${Math.round(pct)}% concluído.`}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-black tabular-nums text-black sm:h-12 sm:w-12 sm:text-base"
        style={{ background: '#EFE039' }}
      >
        {String(numero).padStart(2, '0')}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground sm:text-[16px]"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif", letterSpacing: '-0.005em' }}
        >
          {titulo}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground sm:text-[13px]">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {totalAulas} {totalAulas === 1 ? 'aula' : 'aulas'}
          </span>
          {emPreparo > 0 && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>{emPreparo} em preparo</span>
            </>
          )}
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: '#EFE039' }}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-display text-[13px] font-bold tabular-nums text-primary sm:text-sm">
          {Math.round(pct)}%
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
};

export default TemaRow;
