import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, XCircle, Loader2, PlayCircle, Download, RefreshCw, ExternalLink, Clock, Package } from 'lucide-react';
import { useGithubBuild, fmtDuration, fmtBytes, type GhRun } from '@/hooks/useGithubBuild';

const statusColor = (r: GhRun) => {
  if (r.status !== 'completed') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  if (r.conclusion === 'success') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
};

const statusLabel = (r: GhRun) => {
  if (r.status === 'queued') return 'Na fila';
  if (r.status === 'in_progress') return 'Rodando';
  if (r.conclusion === 'success') return 'Sucesso';
  if (r.conclusion === 'failure') return 'Falhou';
  if (r.conclusion === 'cancelled') return 'Cancelado';
  return r.status;
};

const StatusIcon = ({ r }: { r: GhRun }) => {
  if (r.status !== 'completed') return <Loader2 className="w-4 h-4 animate-spin" />;
  if (r.conclusion === 'success') return <CheckCircle2 className="w-4 h-4" />;
  return <XCircle className="w-4 h-4" />;
};

export default function GithubBuildPanel({ repo, workflowFile = 'build-android.yml' }: { repo: string; workflowFile?: string }) {
  const { runs, current, artifacts, loading, error, stats, refreshAll, loadRun, dispatch, download } = useGithubBuild(repo, workflowFile);

  useEffect(() => { refreshAll();   }, [repo]);

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/30 overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-4 border-b border-border/60 bg-secondary/40">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-primary shrink-0" />
          <h3 className="font-body text-sm sm:text-base font-semibold text-foreground truncate">Build ao vivo</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            disabled={loading}
            className="h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
            aria-label="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => dispatch('main')}
            disabled={loading}
            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground flex items-center gap-2 text-xs font-semibold disabled:opacity-40"
          >
            <PlayCircle className="w-4 h-4" /> Rodar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 text-xs text-rose-400 border-b border-border/60 bg-rose-500/5">
          {error}
        </div>
      )}

      {!current && !loading && !error && (
        <div className="p-6 text-center text-xs text-muted-foreground">
          Nenhum run encontrado. Toque em "Rodar" para iniciar o primeiro build.
        </div>
      )}

      {loading && !current && (
        <div className="p-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      <AnimatePresence>
        {current && stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 space-y-4"
          >
            {/* Status header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold ${statusColor(current.run)}`}>
                  <StatusIcon r={current.run} />
                  {statusLabel(current.run)}
                </div>
                <div className="mt-2 font-body text-sm font-semibold text-foreground break-words">
                  {current.run.display_title || current.run.name}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  #{current.run.id} · {current.run.head_branch} · {current.run.event}
                </div>
              </div>
              <a
                href={current.run.html_url}
                target="_blank"
                rel="noreferrer"
                className="h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Ver no GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Progress */}
            <div>
              <div className="h-2 rounded-full bg-background overflow-hidden">
                <motion.div
                  className={`h-full ${current.run.status === 'completed' ? (current.run.conclusion === 'success' ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-amber-400'}`}
                  animate={{ width: `${stats.pct}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 20 }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-background border border-border p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Progresso</div>
                  <div className="font-mono text-sm font-semibold text-foreground">{Math.floor(stats.pct)}%</div>
                </div>
                <div className="rounded-lg bg-background border border-border p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Decorrido</div>
                  <div className="font-mono text-sm font-semibold text-foreground">{fmtDuration(stats.elapsed)}</div>
                </div>
                <div className="rounded-lg bg-background border border-border p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> ETA</div>
                  <div className="font-mono text-sm font-semibold text-foreground">
                    {current.run.status === 'completed' ? '—' : fmtDuration(stats.etaMs)}
                  </div>
                </div>
              </div>
              {stats.currentStep && current.run.status !== 'completed' && (
                <div className="mt-2 text-[11px] text-muted-foreground truncate">
                  ▸ {stats.currentStep}
                </div>
              )}
            </div>

            {/* Artifacts */}
            {current.run.status === 'completed' && current.run.conclusion === 'success' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">Artefatos</span>
                </div>
                {artifacts.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground">Nenhum artefato disponível (podem ter expirado).</div>
                ) : (
                  <div className="space-y-2">
                    {artifacts.map(a => (
                      <button
                        key={a.id}
                        onClick={() => download(a)}
                        disabled={a.expired}
                        className="w-full flex items-center justify-between gap-3 rounded-xl bg-background border border-border p-3 text-left hover:border-primary/60 disabled:opacity-40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs sm:text-[13px] font-semibold text-foreground break-all">{a.name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {fmtBytes(a.size_in_bytes)} {a.expired ? '· expirado' : ''}
                          </div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-primary">
                          <Download className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent runs */}
      {runs.length > 1 && (
        <div className="border-t border-border/60 p-4">
          <div className="font-body text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Runs recentes</div>
          <div className="space-y-1.5">
            {runs.slice(0, 6).map(r => (
              <button
                key={r.id}
                onClick={() => loadRun(r.id)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg p-2 text-left border ${current?.run.id === r.id ? 'border-primary/60 bg-primary/5' : 'border-border bg-background'} hover:border-primary/40`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${statusColor(r)}`}>
                    <StatusIcon r={r} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{r.display_title || r.name}</div>
                    <div className="text-[10px] text-muted-foreground">#{r.id} · {new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
