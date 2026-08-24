import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, Play, Loader2, Activity, Key, Zap, MinusCircle, ShieldCheck, Eye, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import GcpMonitorWidget from '@/components/admin/GcpMonitorWidget';

/* ── Types ── */

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  functionName: string | null;
}

interface ApiKeyStatus {
  status: 'ok' | 'warning' | 'error' | 'missing';
  message: string;
}

interface MonitorData {
  cronJobs: CronJob[];
  apiKeys: Record<string, ApiKeyStatus>;
  edgeFunctions: string[];
  timestamp: string;
}

interface Alteracao {
  id: string;
  tabela_nome: string;
  tipo_alteracao: string;
  artigo_numero: string | null;
  texto_anterior: string | null;
  texto_atual: string | null;
  detectado_em: string;
  revisado: boolean;
}

/* ── Shared UI ── */

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'ok': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
    case 'missing': return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
    default: return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'ok': return 'default';
    case 'warning': return 'secondary';
    case 'error': return 'destructive';
    default: return 'outline';
  }
};

const tipoBadge = (tipo: string) => {
  switch (tipo) {
    case 'artigo_novo': return { label: 'Novo', variant: 'default' as const, color: 'bg-emerald-500/20 text-emerald-400' };
    case 'artigo_revogado': return { label: 'Revogado', variant: 'destructive' as const, color: 'bg-red-500/20 text-red-400' };
    case 'texto_alterado': return { label: 'Alterado', variant: 'secondary' as const, color: 'bg-amber-500/20 text-amber-400' };
    default: return { label: tipo, variant: 'outline' as const, color: '' };
  }
};

/* ── Main ── */

const AdminMonitor = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoking, setInvoking] = useState<string | null>(null);

  // Alterações state
  const [alteracoes, setAlteracoes] = useState<Alteracao[]>([]);
  const [altLoading, setAltLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [expandedAlt, setExpandedAlt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('admin-monitor');
      if (error) throw error;
      setData(result);
    } catch (e: any) {
      toast.error('Erro ao carregar monitoramento: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlteracoes = useCallback(async () => {
    setAltLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('legislacao_alteracoes' as any)
        .select('*')
        .eq('revisado', false)
        .order('detectado_em', { ascending: false })
        .limit(10000);
      if (error) throw error;
      setAlteracoes((rows as any as Alteracao[]) || []);
    } catch (e: any) {
      console.error('Erro ao buscar alterações:', e);
    } finally {
      setAltLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAlteracoes();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData, fetchAlteracoes]);

  const invokeFunction = async (fnName: string) => {
    setInvoking(fnName);
    try {
      const payloads: Record<string, object> = {
        'otimizar-imagem': { url: 'https://via.placeholder.com/1' },
      };
      const body = payloads[fnName] || {};
      const { error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      toast.success(`${fnName} executada com sucesso`);
    } catch (e: any) {
      toast.error(`Erro ao executar ${fnName}: ${e.message || ''}`);
    } finally {
      setInvoking(null);
    }
  };

  const verificarAgora = async (tabela_nome?: string) => {
    setVerificando(true);
    try {
      const body = tabela_nome ? { tabela_nome } : { batch_size: 60 };
      const { data: result, error } = await supabase.functions.invoke('monitorar-legislacao', { body });
      if (error) throw error;
      toast.success(`Verificação concluída: ${result?.total_alteracoes || 0} alterações encontradas`);
      fetchAlteracoes();
    } catch (e: any) {
      toast.error('Erro na verificação: ' + (e.message || ''));
    } finally {
      setVerificando(false);
    }
  };

  const marcarRevisado = async (id: string) => {
    try {
      const { error } = await supabase
        .from('legislacao_alteracoes' as any)
        .update({ revisado: true } as any)
        .eq('id', id);
      if (error) throw error;
      setAlteracoes(prev => prev.filter(a => a.id !== id));
      toast.success('Marcado como revisado');
    } catch (e: any) {
      toast.error('Erro: ' + (e.message || ''));
    }
  };

  const aplicarAlteracao = async (alt: Alteracao) => {
    setInvoking(alt.id);
    try {
      const { error } = await supabase.functions.invoke('scrape-legislacao', {
        body: {
          url: '', // Will be resolved from catalog
          nome: alt.tabela_nome,
          sigla: alt.tabela_nome,
          tipo: 'auto',
          tabela_nome: alt.tabela_nome,
        },
      });
      // Mark all alterations for this law as reviewed
      await supabase
        .from('legislacao_alteracoes' as any)
        .update({ revisado: true } as any)
        .eq('tabela_nome', alt.tabela_nome);
      setAlteracoes(prev => prev.filter(a => a.tabela_nome !== alt.tabela_nome));
      toast.success(`${alt.tabela_nome} atualizada com sucesso`);
    } catch (e: any) {
      toast.error('Erro ao aplicar: ' + (e.message || ''));
    } finally {
      setInvoking(null);
    }
  };

  // Group alterações by law
  const altByLei = alteracoes.reduce((acc, alt) => {
    if (!acc[alt.tabela_nome]) acc[alt.tabela_nome] = [];
    acc[alt.tabela_nome].push(alt);
    return acc;
  }, {} as Record<string, Alteracao[]>);

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <PageHeader
        title="Monitoramento"
        subtitle={data ? `Atualizado: ${new Date(data.timestamp).toLocaleTimeString('pt-BR')}` : undefined}
        onBack={() => navigate(-1)}
        rightAction={
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto p-4 space-y-5">
        {/* Google Cloud Monitor */}
        <GcpMonitorWidget />

        {/* Alterações Legislativas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Alterações Legislativas
                {alteracoes.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] ml-1">{alteracoes.length}</Badge>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => verificarAgora()}
                disabled={verificando}
              >
                {verificando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                Verificar agora
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {altLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : Object.keys(altByLei).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma alteração pendente. Todas as leis estão atualizadas. ✅
              </p>
            ) : (
              Object.entries(altByLei).map(([lei, alts]) => (
                <div key={lei} className="rounded-lg bg-secondary/30 overflow-hidden">
                  <div
                    className="flex items-center justify-between py-2.5 px-3 cursor-pointer"
                    onClick={() => setExpandedAlt(expandedAlt === lei ? null : lei)}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-foreground">{lei.replace(/_/g, ' ')}</span>
                      <Badge variant="outline" className="text-[10px]">{alts.length} alterações</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); aplicarAlteracao(alts[0]); }}
                        disabled={invoking === alts[0].id}
                      >
                        {invoking === alts[0].id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                        Aplicar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          alts.forEach(a => marcarRevisado(a.id));
                        }}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Ignorar
                      </Button>
                    </div>
                  </div>
                  {expandedAlt === lei && (
                    <div className="border-t border-border px-3 py-2 space-y-2">
                      {alts.map(alt => {
                        const badge = tipoBadge(alt.tipo_alteracao);
                        return (
                          <div key={alt.id} className="flex items-start gap-2 py-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>{badge.label}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">{alt.artigo_numero || '—'}</p>
                              {alt.texto_atual && (
                                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{alt.texto_atual.substring(0, 200)}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="w-5 h-5 text-primary" />
              Chaves de API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && !data ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : data?.apiKeys ? (
              Object.entries(data.apiKeys).map(([name, info]) => (
                <div key={name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2.5">
                    <StatusIcon status={info.status} />
                    <span className="text-sm font-medium text-foreground">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{info.message}</span>
                    <Badge variant={statusBadgeVariant(info.status) as any} className="text-[10px]">
                      {info.status === 'ok' ? 'Ativa' : info.status === 'warning' ? 'Alerta' : info.status === 'error' ? 'Erro' : 'Ausente'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Edge Functions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-primary" />
              Edge Functions ({data?.edgeFunctions?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data?.edgeFunctions?.map((fn) => (
                  <div key={fn} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-mono text-foreground">{fn}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={invoking === fn || fn === 'admin-monitor'}
                      onClick={() => invokeFunction(fn)}
                    >
                      {invoking === fn ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-primary" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cron Jobs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-primary" />
              Cron Jobs ({data?.cronJobs?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && !data ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : data?.cronJobs && data.cronJobs.length > 0 ? (
              data.cronJobs.map((job) => (
                <div key={job.jobid} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${job.active ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{job.jobname}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{job.schedule}</p>
                    </div>
                  </div>
                  <Badge variant={job.active ? 'default' : 'outline'} className="text-[10px]">
                    {job.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cron job encontrado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMonitor;
