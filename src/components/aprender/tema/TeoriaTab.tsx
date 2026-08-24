import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, PlayCircle, GraduationCap } from 'lucide-react';

type Aula = {
  id: string;
  titulo: string;
  objetivo: string | null;
  duracao_est_min: number;
  ordem: number;
};

type Progresso = { concluida: boolean; pct: number };

type Props = {
  aulas: Aula[];
  progresso: Record<string, Progresso>;
  onNavigate: () => void;
};

const TeoriaTab = ({ aulas, progresso, onNavigate }: Props) => {
  const navigate = useNavigate();
  if (aulas.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        Nenhuma aula publicada neste tema ainda.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {aulas.map((au, idx) => {
        const p = progresso[au.id];
        return (
          <li key={au.id}>
            <button
              onClick={() => {
                onNavigate();
                setTimeout(() => navigate(`/aprender/aula/${au.id}`), 120);
              }}
              className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:bg-accent/40 active:scale-[0.995]"
              style={{ minHeight: 72 }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ background: '#EFE039' }}
              >
                <GraduationCap className="h-5 w-5 text-black" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider tabular-nums text-muted-foreground"
                    style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
                  >
                    Aula {String(idx + 1).padStart(2, '0')}
                  </span>
                  {p?.concluida ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : p ? (
                    <PlayCircle className="h-4 w-4 text-primary" />
                  ) : null}
                </div>
                <p
                  className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground"
                  style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
                >
                  {au.titulo}
                </p>
                {au.objetivo && (
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                    {au.objetivo}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-[12px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {au.duracao_est_min} min
                  </span>
                  {p && !p.concluida && <span>{p.pct}%</span>}
                </div>
                {p && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${p.concluida ? 100 : p.pct}%`, background: '#EFE039' }}
                    />
                  </div>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default TeoriaTab;
