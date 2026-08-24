import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, RefreshCw, Loader2, TrendingUp, TrendingDown, AlertCircle, DollarSign, Activity, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServicoChamada { servico: string; total: number; erros: number }
interface ServicoCusto { servico: string; custo_usd: number }
interface MonitorPayload {
  total_chamadas_7d?: number;
  total_erros_7d?: number;
  chamadas_por_servico?: ServicoChamada[];
  chamadas_erro?: string | null;
  custo_mes_atual_usd?: number | null;
  custo_ontem_usd?: number | null;
  custo_mes_anterior_usd?: number | null;
  custo_por_servico?: ServicoCusto[];
  cost_erro?: string | null;
  billing_configurado?: boolean;
  error?: string;
  message?: string;
  _cached?: boolean;
  _updated_at?: string;
}

const fmtUsd = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fmtNum = (v?: number | null) =>
  v == null ? '—' : v.toLocaleString('pt-BR');
const shortSvc = (s: string) => s.replace(/\.googleapis\.com$/, '').replace(/^generativelanguage$/, 'Gemini');

export default function GcpMonitorWidget() {
  const [data, setData] = useState<MonitorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke<MonitorPayload>(
        `gcp-monitor${refresh ? '?refresh=1' : ''}`,
        { method: 'GET' },
      );
      if (error) throw error;
      setData(resp);
      if (refresh) toast.success('Dados atualizados do Google Cloud');
    } catch (err: any) {
      toast.error('Falha ao carregar dados do GCP: ' + (err?.message ?? String(err)));
      setData({ error: 'load_error', message: String(err?.message ?? err) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(false); }, [fetchData]);

  const setupRequired = data?.error === 'setup_required';
  const custoMes = data?.custo_mes_atual_usd;
  const custoAnterior = data?.custo_mes_anterior_usd;
  const deltaPct = custoMes && custoAnterior && custoAnterior > 0
    ? ((custoMes - custoAnterior) / custoAnterior) * 100
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="w-5 h-5 text-primary" />
            Google Cloud
            {data?._cached && !loading && (
              <Badge variant="secondary" className="text-[10px] ml-1">cache</Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : setupRequired ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-200">Configuração necessária</p>
              <p className="text-muted-foreground mt-1">
                Adicione os secrets <code className="text-amber-300">GCP_SERVICE_ACCOUNT_JSON</code>,{' '}
                <code className="text-amber-300">GCP_PROJECT_ID</code>,{' '}
                <code className="text-amber-300">GCP_BILLING_DATASET</code> e{' '}
                <code className="text-amber-300">GCP_BILLING_TABLE</code> para ativar o monitor.
              </p>
            </div>
          </div>
        ) : data?.error ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200 break-all">{data.message ?? data.error}</p>
          </div>
        ) : (
          <>
            {/* Cards resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg bg-secondary/30 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Activity className="w-3 h-3" /> Chamadas 7d
                </div>
                <div className="text-lg font-semibold mt-0.5">{fmtNum(data?.total_chamadas_7d)}</div>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <XCircle className="w-3 h-3" /> Erros 7d
                </div>
                <div className="text-lg font-semibold mt-0.5 text-red-300">{fmtNum(data?.total_erros_7d)}</div>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <DollarSign className="w-3 h-3" /> Mês atual
                </div>
                <div className="text-lg font-semibold mt-0.5 flex items-center gap-1">
                  {fmtUsd(custoMes)}
                  {deltaPct != null && (
                    <span className={`text-[10px] flex items-center ${deltaPct > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                      {deltaPct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(deltaPct).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <DollarSign className="w-3 h-3" /> Ontem
                </div>
                <div className="text-lg font-semibold mt-0.5">{fmtUsd(data?.custo_ontem_usd)}</div>
              </div>
            </div>

            {/* Top serviços por custo */}
            {data?.custo_por_servico && data.custo_por_servico.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Top custos do mês
                </div>
                <div className="space-y-1">
                  {data.custo_por_servico.slice(0, 5).map((s) => (
                    <div key={s.servico} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/30 text-sm">
                      <span className="truncate">{s.servico}</span>
                      <span className="font-mono text-xs">{fmtUsd(s.custo_usd)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top serviços por volume */}
            {data?.chamadas_por_servico && data.chamadas_por_servico.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Top volume de chamadas (7d)
                </div>
                <div className="space-y-1">
                  {data.chamadas_por_servico.slice(0, 5).map((s) => (
                    <div key={s.servico} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/30 text-sm">
                      <span className="truncate">{shortSvc(s.servico)}</span>
                      <div className="flex items-center gap-2">
                        {s.erros > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-4">{fmtNum(s.erros)} err</Badge>
                        )}
                        <span className="font-mono text-xs">{fmtNum(s.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(data?.chamadas_erro || data?.cost_erro) && (
              <div className="text-[11px] text-amber-300/80 space-y-1">
                {data.chamadas_erro && <p>⚠ Monitoring: {data.chamadas_erro}</p>}
                {data.cost_erro && <p>⚠ Billing: {data.cost_erro}</p>}
                {!data.billing_configurado && (
                  <p>⚠ Configure GCP_BILLING_DATASET e GCP_BILLING_TABLE para ver custos.</p>
                )}
              </div>
            )}

            {data?._updated_at && (
              <p className="text-[10px] text-muted-foreground text-right">
                Atualizado {new Date(data._updated_at).toLocaleString('pt-BR')}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
