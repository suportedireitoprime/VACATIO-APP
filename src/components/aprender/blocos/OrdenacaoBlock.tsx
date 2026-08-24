import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

type Item = { id: string; texto: string };

export function OrdenacaoBlock({ payload }: { payload: any }) {
  const titulo: string = payload?.titulo || 'Coloque na ordem correta';
  const instrucao: string | undefined = payload?.instrucao;
  const itensOriginais: Item[] = Array.isArray(payload?.itens) ? payload.itens : [];
  const ordemCorreta: string[] = Array.isArray(payload?.ordem_correta) ? payload.ordem_correta : [];
  const explicacao: string | undefined = payload?.explicacao;

  const embaralhados = useMemo(() => {
    const arr = [...itensOriginais];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensOriginais.length]);

  const [ordem, setOrdem] = useState<Item[]>(embaralhados);
  const [verificado, setVerificado] = useState(false);

  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= ordem.length) return;
    const arr = [...ordem];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setOrdem(arr);
    setVerificado(false);
  };

  const acertos = ordem.map((it, i) => it.id === ordemCorreta[i]);
  const tudoCerto = acertos.every(Boolean);

  return (
    <article>
      <h3 className="mb-1 font-display text-lg font-bold text-foreground">{titulo}</h3>
      {instrucao && <p className="mb-3 text-sm text-muted-foreground">{instrucao}</p>}
      <ol className="space-y-2">
        {ordem.map((it, i) => {
          const ok = verificado && acertos[i];
          const err = verificado && !acertos[i];
          return (
            <li key={it.id}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-card ${
                ok ? 'border-emerald-500/60 bg-emerald-500/10'
                  : err ? 'border-red-500/60 bg-red-500/10'
                  : 'border-border'
              }`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-foreground">{it.texto}</span>
              {verificado && (ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />)}
              <div className="flex flex-col gap-1">
                <button onClick={() => mover(i, -1)} disabled={i === 0}
                  className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted disabled:opacity-30">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button onClick={() => mover(i, 1)} disabled={i === ordem.length - 1}
                  className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted disabled:opacity-30">
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setVerificado(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <CheckCircle2 className="h-4 w-4" /> Verificar
        </button>
        <button onClick={() => { setOrdem(embaralhados); setVerificado(false); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
          <RotateCcw className="h-4 w-4" /> Reiniciar
        </button>
      </div>
      {verificado && (
        <div className={`mt-3 rounded-xl border p-3 text-sm ${
          tudoCerto ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-yellow-500/60 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200'
        }`}>
          {tudoCerto ? 'Perfeito! Ordem correta.' : 'Ainda não é a ordem correta. Ajuste e tente de novo.'}
          {tudoCerto && explicacao && <p className="mt-1 opacity-90">{explicacao}</p>}
        </div>
      )}
    </article>
  );
}
