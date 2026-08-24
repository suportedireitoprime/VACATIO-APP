import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

export type GerStep = {
  id: string;
  label: string;
  /** segundos estimados para esta etapa */
  eta: number;
};

export const APRENDER_STEPS: GerStep[] = [
  { id: 'load', label: 'Carregando material do resumo', eta: 2 },
  { id: 'plan', label: 'Estruturando plano de aula com IA', eta: 12 },
  { id: 'blocks', label: 'Gerando blocos (intro, leitura, conceitos, exemplos)', eta: 16 },
  { id: 'quiz', label: 'Criando quizzes e flashcards', eta: 8 },
  { id: 'save', label: 'Salvando no banco de dados', eta: 3 },
];

const TOTAL_ETA = APRENDER_STEPS.reduce((a, s) => a + s.eta, 0);

type Props = {
  open: boolean;
  title?: string;
  subtitle?: string;
  /** progresso do lote: current/total. Se ausente, é geração única. */
  batch?: { current: number; total: number; label?: string };
  /** true quando a geração desta aula terminou; força 100% e check. */
  done?: boolean;
};

export default function AprenderGeracaoOverlay({ open, title, subtitle, batch, done }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, [open, title, batch?.current]);

  // Percentual: cresce até 95% ao longo do ETA; done => 100%.
  const rawPct = Math.min(95, (elapsed / TOTAL_ETA) * 100);
  const pct = done ? 100 : rawPct;

  // Determina o índice do passo atual a partir do tempo decorrido.
  let acc = 0;
  let currentIdx = APRENDER_STEPS.length - 1;
  for (let i = 0; i < APRENDER_STEPS.length; i++) {
    acc += APRENDER_STEPS[i].eta;
    if (elapsed < acc) { currentIdx = i; break; }
  }
  if (done) currentIdx = APRENDER_STEPS.length;

  const remaining = Math.max(0, TOTAL_ETA - elapsed);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-3">
          <p className="font-display text-base font-bold text-foreground">
            {title || 'Gerando aula com IA'}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          {batch && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Lote: {batch.current}/{batch.total}
              {batch.label ? ` · ${batch.label}` : ''}
            </p>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">{Math.round(pct)}%</span>
          <span className="text-muted-foreground">
            {done ? 'Concluído' : `~${Math.ceil(remaining)}s restantes`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Checklist */}
        <ul className="mt-4 space-y-2">
          {APRENDER_STEPS.map((s, i) => {
            const isDone = i < currentIdx;
            const isActive = i === currentIdx && !done;
            return (
              <li key={s.id} className="flex items-start gap-2 text-sm">
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : isActive ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                )}
                <span
                  className={
                    isDone
                      ? 'text-foreground'
                      : isActive
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Tempo estimado total: ~{TOTAL_ETA}s por aula. Não feche esta janela.
        </p>
      </div>
    </div>
  );
}
