import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, Loader2, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { explicacaoWorker, type WorkerState } from '@/services/explicacaoWorker';
import { getLeisCatalog } from '@/services/legislacaoService';

const ALL_LAWS = (() => {
  const catalog = getLeisCatalog();
  const constituicao = catalog.filter(l => l.tipo === 'constituicao');
  const codigos = catalog.filter(l => l.tipo === 'codigo');
  const estatutos = catalog.filter(l => l.tipo === 'estatuto');
  const leisEspeciais = catalog.filter(l => l.tipo === 'lei-especial');
  const previdenciario = catalog.filter(l => l.tipo === 'previdenciario');
  return [...constituicao, ...codigos, ...estatutos, ...leisEspeciais, ...previdenciario];
})();

const GROUPS = [
  { label: 'Constituição', tipo: 'constituicao' },
  { label: 'Códigos', tipo: 'codigo' },
  { label: 'Estatutos', tipo: 'estatuto' },
  { label: 'Leis Especiais', tipo: 'lei-especial' },
  { label: 'Previdenciário', tipo: 'previdenciario' },
];

export default function ExplicacaoLei() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [state, setState] = useState<WorkerState>(explicacaoWorker.getState());

  useEffect(() => {
    return explicacaoWorker.subscribe(setState);
  }, []);

  const { running, currentLei, currentArtigo, currentMode, leiProgress, leiTotal, overallDone, overallTotal, stats, logs } = state;

  const logEndRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const groupedLaws = useMemo(() => {
    return GROUPS.map(g => ({ ...g, laws: ALL_LAWS.filter(l => l.tipo === g.tipo) }));
  }, []);

  const toggleLaw = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (tipo: string) => {
    const groupIds = ALL_LAWS.filter(l => l.tipo === tipo).map(l => l.id);
    const allSelected = groupIds.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      groupIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const selectAll = () => {
    const allIds = ALL_LAWS.map(l => l.id);
    setSelected(allIds.every(id => selected.has(id)) ? new Set() : new Set(allIds));
  };

  const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;
  const leiPct = leiTotal > 0 ? Math.round((leiProgress / leiTotal) * 100) : 0;

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <PageHeader
        title="Gerar Explicações (IA)"
        subtitle="IA gera explicações artigo por artigo"
        onBack={() => navigate(-1)}
      />


      <div className="flex-1 p-4 space-y-5 overflow-auto">
        {!running && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Selecione as leis</h2>
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7 px-2">
                {ALL_LAWS.every(l => selected.has(l.id)) ? 'Desmarcar todas' : 'Selecionar todas'}
              </Button>
            </div>

            {groupedLaws.map(group => {
              const groupIds = group.laws.map(l => l.id);
              const allGroupSelected = groupIds.every(id => selected.has(id));
              const someGroupSelected = groupIds.some(id => selected.has(id));

              return (
                <div key={group.tipo} className="bg-card border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleGroup(group.tipo)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={allGroupSelected ? true : someGroupSelected ? 'indeterminate' : false}
                      className="pointer-events-none"
                    />
                    <span className="text-sm font-semibold text-foreground">{group.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{groupIds.filter(id => selected.has(id)).length}/{groupIds.length}</span>
                  </button>
                  <div className="divide-y divide-border/50">
                    {group.laws.map(lei => (
                      <button
                        key={lei.id}
                        onClick={() => toggleLaw(lei.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <Checkbox checked={selected.has(lei.id)} className="pointer-events-none" />
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lei.iconColor || 'hsl(var(--primary))' }} />
                        <div className="flex-1 text-left min-w-0">
                          <span className="text-sm text-foreground truncate block">{lei.nome}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{lei.sigla}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          {!running ? (
            <Button onClick={() => explicacaoWorker.start(selected)} disabled={selected.size === 0} className="gap-2 w-full">
              <Play className="w-4 h-4" /> Iniciar ({selected.size} selecionada{selected.size !== 1 ? 's' : ''})
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => explicacaoWorker.stop()} className="gap-2 w-full">
              <Square className="w-4 h-4" /> Parar
            </Button>
          )}
        </div>

        {(running || stats.generated > 0 || stats.errors > 0 || stats.skipped > 0) && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <div className="text-xl font-bold text-foreground">{stats.generated}</div>
              <div className="text-xs text-muted-foreground">Gerados</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <Check className="w-5 h-5 mx-auto text-primary mb-1" />
              <div className="text-xl font-bold text-foreground">{stats.skipped}</div>
              <div className="text-xs text-muted-foreground">Já existentes</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <AlertCircle className="w-5 h-5 mx-auto text-destructive mb-1" />
              <div className="text-xl font-bold text-foreground">{stats.errors}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </div>
          </div>
        )}

        {running && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium truncate">{currentLei}</span>
            </div>
            {currentArtigo && (
              <div className="text-xs text-muted-foreground">
                Artigo: <span className="font-medium text-foreground">{currentArtigo}</span>
                {currentMode && <> — <span className="text-primary">{currentMode}</span></>}
              </div>
            )}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Lei atual</span>
                <span>{leiProgress}/{leiTotal} ({leiPct}%)</span>
              </div>
              <Progress value={leiPct} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progresso geral</span>
                <span>{overallDone}/{overallTotal} ({overallPct}%)</span>
              </div>
              <Progress value={overallPct} className="h-2" />
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-xs font-semibold text-muted-foreground">Log de atividade</span>
            </div>
            <ScrollArea className="h-64">
              <div className="p-3 space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className={
                    log.type === 'success' ? 'text-green-500' :
                    log.type === 'error' ? 'text-destructive' :
                    log.type === 'skip' ? 'text-muted-foreground' :
                    'text-foreground'
                  }>
                    <span className="text-muted-foreground">[{log.time}]</span> {log.text}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
