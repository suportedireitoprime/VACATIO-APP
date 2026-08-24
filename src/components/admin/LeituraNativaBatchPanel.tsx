import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Play, RefreshCcw, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { COLECOES, type ColecaoConfig } from '@/lib/bibliotecaColecoes';
import { Button } from '@/components/ui/button';

interface Contagem {
  total: number;
  prontos: number;
  processando: number;
  faltantes: number;
  loading: boolean;
}

interface RunState {
  colecaoId: string | null; // null = todas
  running: boolean;
  currentTitle: string | null;
  ok: number;
  err: number;
  planned: number;
  skipped: number;
  startedAt: number | null;
}

const emptyContagem: Contagem = { total: 0, prontos: 0, processando: 0, faltantes: 0, loading: true };

async function contarColecao(colecao: ColecaoConfig): Promise<Contagem> {
  // Total
  const totalRes = await supabase.from(colecao.table as any).select('id', { count: 'exact', head: true });
  const total = totalRes.count ?? 0;

  // Prontos + processando — aceitamos livro_tabela tanto pelo nome real da tabela
  // quanto pelo id da coleção (dados históricos usam o id).
  const readyRes = await supabase
    .from('biblioteca_leitura_nativa')
    .select('livro_id, status, refino_status')
    .in('livro_tabela', [colecao.table, colecao.id]);

  const rows = (readyRes.data as any[]) || [];
  const prontos = rows.filter((r) => r.status === 'pronto' && r.refino_status === 'pronto').length;
  const processando = rows.filter(
    (r) => r.status === 'processando' || r.refino_status === 'processando',
  ).length;
  const faltantes = Math.max(0, total - prontos);
  return { total, prontos, processando, faltantes, loading: false };
}

async function idsFaltantes(colecao: ColecaoConfig): Promise<Array<{ id: any; pdf: string | null; titulo: string }>> {
  // Livros com PDF disponível
  const { data: livros } = await supabase
    .from(colecao.table as any)
    .select(`id, ${colecao.linkField}, ${colecao.downloadField}, ${colecao.tituloField}`)
    .limit(5000);
  const readyRes = await supabase
    .from('biblioteca_leitura_nativa')
    .select('livro_id, status, refino_status')
    .in('livro_tabela', [colecao.table, colecao.id]);
  const readySet = new Set(
    ((readyRes.data as any[]) || [])
      .filter((r) => r.status === 'pronto' && r.refino_status === 'pronto')
      .map((r) => String(r.livro_id)),
  );
  const out: Array<{ id: any; pdf: string | null; titulo: string }> = [];
  for (const row of (livros as any[]) || []) {
    if (readySet.has(String(row.id))) continue;
    const pdf = row[colecao.linkField] || row[colecao.downloadField] || null;
    out.push({ id: row.id, pdf, titulo: row[colecao.tituloField] || `#${row.id}` });
  }
  return out;
}

async function runQueue(
  colecao: ColecaoConfig,
  itens: Array<{ id: any; pdf: string | null; titulo: string }>,
  limite: number,
  onProgress: (p: { currentTitle: string; ok: number; err: number; skipped: number }) => void,
  isCancelled: () => boolean,
) {
  const alvo = itens.slice(0, limite);
  let ok = 0;
  let err = 0;
  let skipped = 0;
  const CONC = 2;
  let i = 0;
  async function worker() {
    while (i < alvo.length && !isCancelled()) {
      const item = alvo[i++];
      if (!item.pdf) {
        skipped++;
        onProgress({ currentTitle: item.titulo, ok, err, skipped });
        continue;
      }
      try {
        const { error } = await supabase.functions.invoke('biblioteca-ocr-mistral', {
          body: {
            livro_id: String(item.id),
            livro_tabela: colecao.table,
            pdf_url: item.pdf,
            titulo: item.titulo,
          },
        });
        if (error) err++;
        else ok++;
      } catch {
        err++;
      }
      onProgress({ currentTitle: item.titulo, ok, err, skipped });
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  return { ok, err, skipped, planned: alvo.length };
}

export default function LeituraNativaBatchPanel() {
  const [expanded, setExpanded] = useState(true);
  const [contagens, setContagens] = useState<Record<string, Contagem>>({});
  const [run, setRun] = useState<RunState>({
    colecaoId: null,
    running: false,
    currentTitle: null,
    ok: 0,
    err: 0,
    planned: 0,
    skipped: 0,
    startedAt: null,
  });
  const cancelRef = useRef(false);

  const carregar = useCallback(async () => {
    setContagens((prev) => {
      const next = { ...prev };
      for (const c of COLECOES) next[c.id] = prev[c.id] || emptyContagem;
      return next;
    });
    const results = await Promise.all(
      COLECOES.map(async (c) => [c.id, await contarColecao(c)] as const),
    );
    setContagens(Object.fromEntries(results));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Polling durante execução
  useEffect(() => {
    if (!run.running) return;
    const iv = setInterval(carregar, 5000);
    return () => clearInterval(iv);
  }, [run.running, carregar]);

  const disparar = async (colecao: ColecaoConfig | null, quantidade: number) => {
    cancelRef.current = false;
    setRun({
      colecaoId: colecao?.id ?? null,
      running: true,
      currentTitle: null,
      ok: 0,
      err: 0,
      planned: 0,
      skipped: 0,
      startedAt: Date.now(),
    });
    try {
      const alvos = colecao ? [colecao] : COLECOES;
      let totalOk = 0;
      let totalErr = 0;
      let totalSkipped = 0;
      let totalPlanned = 0;
      let restante = quantidade;
      for (const cfg of alvos) {
        if (cancelRef.current) break;
        if (restante <= 0) break;
        const pendentes = await idsFaltantes(cfg);
        if (pendentes.length === 0) continue;
        const alvo = pendentes.slice(0, restante);
        totalPlanned += alvo.length;
        setRun((s) => ({ ...s, planned: totalPlanned }));
        const res = await runQueue(
          cfg,
          alvo,
          alvo.length,
          ({ currentTitle, ok, err, skipped }) => {
            setRun((s) => ({
              ...s,
              currentTitle: `[${cfg.label}] ${currentTitle}`,
              ok: totalOk + ok,
              err: totalErr + err,
              skipped: totalSkipped + skipped,
            }));
          },
          () => cancelRef.current,
        );
        totalOk += res.ok;
        totalErr += res.err;
        totalSkipped += res.skipped;
        restante -= res.planned;
      }
      toast.success(
        `Disparado: ${totalOk} ok · ${totalErr} erro · ${totalSkipped} sem PDF (de ${totalPlanned})`,
      );
    } catch (e: any) {
      toast.error(e?.message || 'Falha no disparo');
    } finally {
      setRun((s) => ({ ...s, running: false, currentTitle: null }));
      carregar();
    }
  };

  const cancelar = () => {
    cancelRef.current = true;
  };

  const totalGeral = COLECOES.reduce((acc, c) => acc + (contagens[c.id]?.total || 0), 0);
  const prontosGeral = COLECOES.reduce((acc, c) => acc + (contagens[c.id]?.prontos || 0), 0);
  const faltantesGeral = Math.max(0, totalGeral - prontosGeral);

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-4 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Play className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-foreground text-sm truncate">
              Leitura nativa em massa
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Prontos <strong>{prontosGeral}</strong> / {totalGeral} · Faltam{' '}
              <strong className="text-primary">{faltantesGeral}</strong>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); carregar(); }}
            className="p-1.5 rounded-md hover:bg-secondary/60"
            aria-label="Recarregar"
            disabled={run.running}
          >
            <RefreshCcw className={`w-3.5 h-3.5 text-muted-foreground ${run.running ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {run.running && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-xs space-y-1">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="truncate">{run.currentTitle || 'Preparando…'}</span>
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span className="text-emerald-600 font-semibold">✓ {run.ok}</span>
            <span className="text-rose-600 font-semibold">✕ {run.err}</span>
            <span>· sem PDF: {run.skipped}</span>
            <span>· planejados: {run.planned}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={cancelar} className="h-6 text-[11px] text-muted-foreground">
            Parar após o atual
          </Button>
        </div>
      )}

      {expanded && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => disparar(null, 10)}
              disabled={run.running || faltantesGeral === 0}
              className="h-8 text-xs"
            >
              Disparar próximos 10 (todas)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => disparar(null, 999999)}
              disabled={run.running || faltantesGeral === 0}
              className="h-8 text-xs"
            >
              Zerar tudo ({faltantesGeral})
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card/50 divide-y divide-border">
            {COLECOES.map((c) => {
              const cont = contagens[c.id] || emptyContagem;
              const zerado = !cont.loading && cont.faltantes === 0 && cont.total > 0;
              return (
                <div key={c.id} className="flex items-center gap-2 p-2 text-xs">
                  <div className="w-6 h-6 rounded overflow-hidden bg-secondary flex-shrink-0">
                    <img src={c.cover} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      {c.label}
                      {zerado && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {cont.loading ? (
                        <Loader2 className="w-3 h-3 animate-spin inline" />
                      ) : (
                        <>
                          {cont.prontos}/{cont.total} prontos
                          {cont.processando > 0 && ` · ${cont.processando} em curso`}
                          {cont.faltantes > 0 && (
                            <> · <strong className="text-primary">{cont.faltantes} faltam</strong></>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => disparar(c, 5)}
                    disabled={run.running || cont.faltantes === 0}
                    className="h-7 text-[11px] px-2"
                  >
                    +5
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => disparar(c, cont.faltantes)}
                    disabled={run.running || cont.faltantes === 0}
                    className="h-7 text-[11px] px-2"
                  >
                    Zerar
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/80 leading-snug">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              O disparo apenas inicia a extração. O refino roda em background na edge function
              (OCR + Mistral). Os contadores atualizam a cada 5s enquanto rodando.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
