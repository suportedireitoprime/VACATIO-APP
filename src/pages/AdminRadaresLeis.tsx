import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, RefreshCw, ChevronDown, ChevronRight, ExternalLink, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Run {
  id: string;
  iniciado_em: string;
  concluido_em: string | null;
  origem: string;
  status: string;
  novos_count: number;
  atos_ids: string[];
  push_campaign_id: string | null;
  push_titulo: string | null;
  push_subtitulo: string | null;
  erro: string | null;
}

interface AtoInfo { id: string; tipo_ato: string; numero_ato: string; ementa: string; url: string }

export default function AdminRadaresLeis() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [atosCache, setAtosCache] = useState<Record<string, AtoInfo[]>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('radar_leis_runs' as any)
      .select('*')
      .order('iniciado_em', { ascending: false })
      .limit(50);
    setRuns(((data as any[]) ?? []) as Run[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const rodarAgora = async () => {
    setRunning(true);
    toast.loading('Executando raspagem manual...', { id: 'run' });
    try {
      const { data, error } = await supabase.functions.invoke('scrape-resenha-diaria', {
        body: { origem: 'manual', notify: true },
      });
      if (error) throw error;
      toast.success(`OK: ${(data as any)?.novos ?? 0} novidades`, { id: 'run' });
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha', { id: 'run' });
    } finally {
      setRunning(false);
    }
  };

  const toggleExpand = async (run: Run) => {
    if (expanded === run.id) { setExpanded(null); return; }
    setExpanded(run.id);
    if (run.atos_ids.length > 0 && !atosCache[run.id]) {
      const { data } = await supabase
        .from('resenha_diaria' as any)
        .select('id,tipo_ato,numero_ato,ementa,url')
        .in('id', run.atos_ids);
      setAtosCache(prev => ({ ...prev, [run.id]: ((data as any[]) ?? []) as AtoInfo[] }));
    }
  };

  const reenviarPush = async (run: Run) => {
    const atos = atosCache[run.id];
    if (!atos || atos.length === 0) { toast.error('Sem atos para notificar'); return; }
    toast.loading('Reenviando push...', { id: `push-${run.id}` });
    try {
      const { error } = await supabase.functions.invoke('radar-leis-notify', {
        body: { run_id: run.id, atos: atos.map(a => ({ tipo_ato: a.tipo_ato, numero_ato: a.numero_ato, ementa: a.ementa, url: a.url })) },
      });
      if (error) throw error;
      toast.success('Push enviado', { id: `push-${run.id}` });
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha', { id: `push-${run.id}` });
    }
  };

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('pt-BR') : '—';
  const dur = (r: Run) => {
    if (!r.concluido_em) return '—';
    const ms = new Date(r.concluido_em).getTime() - new Date(r.iniciado_em).getTime();
    return `${Math.round(ms / 1000)}s`;
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title="Radar de Leis" onBack={() => navigate('/admin-funcoes')} />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Card className="p-4 space-y-3">
          <div>
            <h2 className="font-display text-lg">Radar de Leis (Resenha Diária)</h2>
            <p className="text-xs text-muted-foreground">Raspagem automática às <b>10h</b> e <b>20h</b> (horário de Brasília). Notifica os usuários e registra o histórico abaixo.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={rodarAgora} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Rodar agora
            </Button>
            <Button variant="ghost" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin-push')}>
              Ver Push
            </Button>
          </div>
        </Card>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico</h3>
          {loading && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
          {!loading && runs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma execução registrada ainda.</p>
          )}
          {!loading && runs.map((r) => {
            const isOpen = expanded === r.id;
            const statusColor = r.status === 'erro' ? 'bg-destructive/15 text-destructive border-destructive/30'
              : r.status === 'sem_novidades' ? 'bg-muted text-muted-foreground border-border'
              : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
            return (
              <Card key={r.id} className="p-3">
                <button className="w-full flex items-center gap-2 text-left" onClick={() => toggleExpand(r)}>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{r.origem}</Badge>
                      <Badge className={`text-[10px] border ${statusColor}`}>{r.status}</Badge>
                      <span className="text-sm font-semibold">{r.novos_count} novo(s)</span>
                      {r.push_campaign_id && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">push enviado</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {fmt(r.iniciado_em)} · {dur(r)}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    {r.erro && (
                      <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{r.erro}</p>
                    )}
                    {r.push_titulo && (
                      <div className="text-xs bg-secondary/50 p-2 rounded space-y-0.5">
                        <div><span className="text-muted-foreground">Push título:</span> <b>{r.push_titulo}</b></div>
                        <div><span className="text-muted-foreground">Push subtítulo:</span> {r.push_subtitulo}</div>
                      </div>
                    )}
                    {(atosCache[r.id] ?? []).map(a => (
                      <div key={a.id} className="text-xs flex items-start gap-2 p-2 rounded bg-card border border-border">
                        <Badge variant="outline" className="text-[9px] flex-shrink-0">{a.tipo_ato}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{a.numero_ato}</div>
                          <div className="text-muted-foreground line-clamp-2">{a.ementa}</div>
                        </div>
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-primary shrink-0"><ExternalLink className="w-3.5 h-3.5" /></a>
                      </div>
                    ))}
                    {r.novos_count > 0 && (
                      <Button size="sm" variant="secondary" onClick={() => reenviarPush(r)}>
                        <Send className="w-3.5 h-3.5 mr-1" /> Reenviar push
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
