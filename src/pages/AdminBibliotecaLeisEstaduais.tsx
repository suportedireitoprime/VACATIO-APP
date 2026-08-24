import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Search, Loader2, Download, Ban, RefreshCw, MapPin, CheckCircle2, Play, Pause, ListChecks, Radar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ESTADOS, TIPOS_ESTADUAIS, type TipoEstadual } from '@/data/estadosBrasil';

interface CatalogRow {
  id: string;
  uf: string;
  tipo: string;
  numero: string | null;
  ano: number | null;
  ementa: string | null;
  url_original: string;
  status: string;
  lei_id: string | null;
  discovered_at: string;
  vade_mecum_leis?: { slug: string } | null;
}

export default function AdminBibliotecaLeisEstaduais() {
  const navigate = useNavigate();
  const { uf } = useParams<{ uf?: string }>();

  if (!uf) return <GridUFs />;
  return <DetalheUF uf={uf.toUpperCase()} />;
}

function GridUFs() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, { total: number; populado: number }>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('vade_mecum_leis_estaduais_catalog' as any)
        .select('uf, status')
        .limit(100000);
      const map: Record<string, { total: number; populado: number }> = {};
      ((data as any[]) ?? []).forEach((r) => {
        map[r.uf] = map[r.uf] || { total: 0, populado: 0 };
        map[r.uf].total++;
        if (r.status === 'populado') map[r.uf].populado++;
      });
      setCounts(map);
    })();
  }, []);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title="Legislação Estadual" onBack={() => navigate('/admin-biblioteca-leis')} />
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <p className="text-xs text-muted-foreground mb-4">
          Selecione um estado para varrer o portal oficial, mapear leis e popular no banco.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ESTADOS.map((e) => {
            const c = counts[e.uf];
            return (
              <button
                key={e.uf}
                onClick={() => navigate(`/admin-biblioteca-leis/estadual/${e.uf.toLowerCase()}`)}
                className="rounded-2xl border border-border bg-card p-3 text-left hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">{e.uf}</span>
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-[13px] font-medium leading-tight mt-1 line-clamp-1">{e.nome}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {c ? `${c.populado}/${c.total} popul.` : '— não indexado'}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DetalheUF({ uf }: { uf: string }) {
  const navigate = useNavigate();
  const estado = ESTADOS.find((e) => e.uf === uf);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexando, setIndexando] = useState(false);
  const [populando, setPopulando] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [tipoAtivo, setTipoAtivo] = useState<'todos' | TipoEstadual>('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'descoberto' | 'populado' | 'ignorado'>('todos');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vade_mecum_leis_estaduais_catalog' as any)
      .select('id, uf, tipo, numero, ano, ementa, url_original, status, lei_id, discovered_at, vade_mecum_leis:lei_id(slug)')
      .eq('uf', uf)
      .order('ano', { ascending: false, nullsFirst: false })
      .order('numero', { ascending: false, nullsFirst: false })
      .limit(5000);
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [uf]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (tipoAtivo !== 'todos' && r.tipo !== tipoAtivo) return false;
      if (statusFiltro !== 'todos' && r.status !== statusFiltro) return false;
      if (q && !`${r.numero ?? ''} ${r.ano ?? ''} ${r.ementa ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, busca, tipoAtivo, statusFiltro]);

  const indexar = async () => {
    setIndexando(true);
    toast.loading('Varrendo portal...', { id: 'ix' });
    try {
      const { data, error } = await supabase.functions.invoke('estadual-indexar-portal', {
        body: { uf },
      });
      if (error) throw error;
      toast.success(`Varredura: ${(data as any)?.descobertas ?? 0} novas · ${(data as any)?.total ?? 0} total`, { id: 'ix' });
      await load();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`, { id: 'ix' });
    } finally {
      setIndexando(false);
    }
  };

  const popular = async (row: CatalogRow) => {
    setPopulando(row.id);
    try {
      const { data, error } = await supabase.functions.invoke('estadual-popular-lei', {
        body: { catalog_id: row.id },
      });
      if (error) throw error;
      toast.success(`OK · ${(data as any)?.artigos ?? 0} artigos`);
      await load();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`);
    } finally {
      setPopulando(null);
    }
  };

  const ignorar = async (row: CatalogRow) => {
    await supabase.from('vade_mecum_leis_estaduais_catalog' as any)
      .update({ status: row.status === 'ignorado' ? 'descoberto' : 'ignorado' } as any)
      .eq('id', row.id);
    await load();
  };

  const limparDuplicados = async () => {
    toast.loading('Limpando duplicados...', { id: 'clean' });
    try {
      // 1. Constituição estadual: manter 1 por UF (o mais antigo)
      const { data: consts } = await supabase
        .from('vade_mecum_leis_estaduais_catalog' as any)
        .select('id, url_original, status, created_at')
        .eq('uf', uf?.toUpperCase())
        .eq('tipo', 'constituicao_estadual')
        .order('created_at', { ascending: true });
      const constArr = (consts as any[]) ?? [];
      const keep = constArr.find((c) => c.status === 'populado') ?? constArr[0];
      const remover = constArr.filter((c) => c.id !== keep?.id).map((c) => c.id);

      // 2. Ruído: registros sem número ou ano (exceto constituição)
      const { data: ruido } = await supabase
        .from('vade_mecum_leis_estaduais_catalog' as any)
        .select('id')
        .eq('uf', uf?.toUpperCase())
        .neq('tipo', 'constituicao_estadual')
        .or('numero.is.null,ano.is.null');
      const ruidoIds = ((ruido as any[]) ?? []).map((r) => r.id);

      const todos = [...remover, ...ruidoIds];
      if (todos.length > 0) {
        // deleta em lotes
        for (let i = 0; i < todos.length; i += 200) {
          await supabase
            .from('vade_mecum_leis_estaduais_catalog' as any)
            .delete()
            .in('id', todos.slice(i, i + 200));
        }
      }
      toast.success(`Removidos: ${todos.length}`, { id: 'clean' });
      await load();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`, { id: 'clean' });
    }
  };


  const contadores = useMemo(() => {
    const c = { total: rows.length, descoberto: 0, populado: 0, ignorado: 0 };
    rows.forEach((r) => { (c as any)[r.status] = ((c as any)[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader
        title={`${estado?.nome ?? uf} (${uf})`}
        subtitle="Catálogo estadual"
        onBack={() => navigate('/admin-biblioteca-leis/estadual')}
      />

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-3">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Portal oficial</p>
              <a href={estado?.portalUrl} target="_blank" rel="noopener" className="text-xs text-primary break-all inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />{estado?.portalUrl}
              </a>
              <p className="text-[11px] text-muted-foreground mt-2">
                {contadores.total} mapeadas · {contadores.populado} populadas · {contadores.descoberto} pendentes · {contadores.ignorado} ignoradas
              </p>
            </div>
            <Button size="sm" onClick={indexar} disabled={indexando} className="shrink-0">
              {indexando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Varrer (legado)
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={limparDuplicados} className="h-8 text-xs">
              Limpar duplicados
            </Button>
          </div>
        </Card>

        {uf === 'SP' && (
          <BlocoPortalSP uf={uf} onReload={load} contadoresBanco={contadores} />
        )}


        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar número, ano, ementa..." className="pl-10 h-10" />
          </div>
        </div>

        <Tabs value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
            <TabsTrigger value="descoberto" className="text-xs">Faltantes</TabsTrigger>
            <TabsTrigger value="populado" className="text-xs">Populadas</TabsTrigger>
            <TabsTrigger value="ignorado" className="text-xs">Ignoradas</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setTipoAtivo('todos')}
            className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${tipoAtivo === 'todos' ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground'}`}
          >Todos</button>
          {TIPOS_ESTADUAIS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTipoAtivo(t.id)}
              className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${tipoAtivo === t.id ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground'}`}
            >{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Carregando...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nada aqui. Clique em "Varrer portal" para começar a indexação.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtradas.slice(0, 500).map((r) => (
              <div key={r.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium leading-tight">
                    {(() => {
                      const label = TIPOS_ESTADUAIS.find(t => t.id === r.tipo)?.label ?? r.tipo;
                      if (r.tipo === 'constituicao_estadual') {
                        return `${label}${r.ano ? ` de ${r.ano}` : ' (ano não identificado)'}`;
                      }
                      return `${label}${r.numero ? ` nº ${r.numero}` : ''}${r.ano ? `/${r.ano}` : ''}`;
                    })()}
                  </p>
                  {r.ementa && <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{r.ementa}</p>}
                  <a href={r.url_original} target="_blank" rel="noopener" className="text-[10px] text-primary inline-flex items-center gap-1 mt-1">
                    <ExternalLink className="w-3 h-3" />Ver no portal
                  </a>
                </div>
                <div className="shrink-0 flex flex-col gap-1.5 items-end">
                  {r.status === 'populado' ? (
                    <>
                      <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 h-7">
                        <CheckCircle2 className="w-3 h-3 mr-1" />OK
                      </Badge>
                      {r.vade_mecum_leis?.slug && (
                        <Button size="sm" variant="secondary" className="h-8"
                          onClick={() => navigate(`/legislacao/estadual_${uf.toLowerCase()}/${r.vade_mecum_leis!.slug}`)}>
                          <ExternalLink className="w-3 h-3 mr-1" />Ver
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]"
                        disabled={populando === r.id}
                        onClick={() => popular(r)}>
                        {populando === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RefreshCw className="w-3 h-3 mr-1" />Repopular</>}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="secondary" className="h-8"
                      disabled={populando === r.id}
                      onClick={() => popular(r)}>
                      {populando === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 mr-1" />Popular</>}
                    </Button>
                  )}
                  <button onClick={() => ignorar(r)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <Ban className="w-3 h-3" />{r.status === 'ignorado' ? 'Reativar' : 'Ignorar'}
                  </button>
                </div>
              </div>
            ))}
            {filtradas.length > 500 && (
              <p className="text-center text-[11px] text-muted-foreground py-3">
                Mostrando 500 de {filtradas.length}. Refine a busca.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Bloco portal SP: verificação, popular automático e dupla checagem
// ─────────────────────────────────────────────────────────
function BlocoPortalSP({
  uf,
  onReload,
  contadoresBanco,
}: {
  uf: string;
  onReload: () => Promise<void>;
  contadoresBanco: { total: number; populado: number; descoberto: number };
}) {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [verificando, setVerificando] = useState(false);
  const [conferindo, setConferindo] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [conferencia, setConferencia] = useState<any>(null);

  const carregar = async () => {
    const [{ data: snap }, { data: rn }] = await Promise.all([
      supabase
        .from('vade_mecum_portal_snapshots' as any)
        .select('*')
        .eq('uf', uf)
        .order('verificado_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('vade_mecum_bulk_runs' as any)
        .select('*')
        .eq('uf', uf)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setSnapshot(snap);
    setRun(rn);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uf]);

  // Auto-run: chama runner em loop enquanto ativo
  useEffect(() => {
    if (!autoRun) return;
    let cancelado = false;
    const tick = async () => {
      while (!cancelado && autoRun) {
        try {
          const { data, error } = await supabase.functions.invoke('estadual-bulk-runner', {
            body: { uf, lote: 5, run_id: run?.id ?? null },
          });
          if (error) throw error;
          await carregar();
          if ((data as any)?.done) {
            setAutoRun(false);
            toast.success('Popular automático concluído!');
            await onReload();
            break;
          }
        } catch (e: any) {
          toast.error(`Runner: ${e?.message ?? e}`);
          setAutoRun(false);
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    };
    tick();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  const verificar = async () => {
    setVerificando(true);
    toast.loading('Verificando portal SP (todos os anos e tipos)...', { id: 'vp' });
    try {
      const { data, error } = await supabase.functions.invoke('estadual-verificar-portal', {
        body: { uf, anos_max: 0 },
      });
      if (error) throw error;
      toast.success(
        `Portal: ${(data as any).total} · +${(data as any).novas} novas · ~${(data as any).tempo_estimado_min} min`,
        { id: 'vp' },
      );
      await carregar();
      await onReload();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`, { id: 'vp' });
    } finally {
      setVerificando(false);
    }
  };

  const conferir = async () => {
    setConferindo(true);
    toast.loading('Conferindo portal vs banco (últimos 5 anos)...', { id: 'cf' });
    try {
      const { data, error } = await supabase.functions.invoke('estadual-conferir-portal', {
        body: { uf, anos_max: 5 },
      });
      if (error) throw error;
      setConferencia(data);
      toast.success(`Diferença: ${(data as any).diferenca}`, { id: 'cf' });
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`, { id: 'cf' });
    } finally {
      setConferindo(false);
    }
  };

  const totalPortal = snapshot?.total ?? 0;
  const populado = contadoresBanco.populado;
  const pendentes = Math.max(0, totalPortal - populado);
  const progresso = run?.total ? Math.min(100, ((run.processados ?? 0) / run.total) * 100) : 0;
  const tempoRestanteMin = run?.tempo_medio_ms
    ? Math.ceil(((run.total - (run.processados ?? 0)) * run.tempo_medio_ms) / 60000)
    : null;

  return (
    <>
      {/* Card 1: Verificar portal */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Radar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">Verificar portal</p>
              <p className="text-[11px] text-muted-foreground">
                Varre todos os tipos e anos, atualiza catálogo e estima tempo.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={verificar} disabled={verificando} className="shrink-0">
            {verificando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
          </Button>
        </div>
        {snapshot && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MetricPill label="No portal" valor={String(snapshot.total)} />
            <MetricPill label="Novas" valor={`+${snapshot.novas}`} />
            <MetricPill label="Estimativa" valor={`~${snapshot.tempo_estimado_min ?? '?'} min`} />
            <div className="col-span-3">
              <p className="text-[10px] text-muted-foreground mb-1">Por tipo (portal)</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries((snapshot.por_tipo ?? {}) as Record<string, number>).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="text-[10px]">
                    {k}: {v}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Última verificação: {new Date(snapshot.verificado_at).toLocaleString('pt-BR')} · durou{' '}
                {snapshot.duracao_verificacao_seg}s
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Card 2: Popular automático */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">Popular automático</p>
              <p className="text-[11px] text-muted-foreground">
                Processa {pendentes} pendentes em lotes de 5. Você pode fechar e voltar — o progresso continua.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={autoRun ? 'destructive' : 'default'}
            onClick={() => setAutoRun((v) => !v)}
            disabled={pendentes === 0}
            className="shrink-0"
          >
            {autoRun ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Iniciar
              </>
            )}
          </Button>
        </div>
        {run && (
          <div className="mt-3 space-y-2">
            <Progress value={progresso} className="h-2" />
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>
                {run.processados ?? 0} / {run.total} ·{' '}
                <span className="text-emerald-500">{run.sucessos} ok</span> ·{' '}
                <span className="text-red-500">{run.falhas} erro</span>
              </span>
              <span>
                {tempoRestanteMin != null ? `~${tempoRestanteMin} min restantes` : '—'}
              </span>
            </div>
            {run.ultimo_erro && (
              <p className="text-[10px] text-red-500/80">Último erro: {run.ultimo_erro}</p>
            )}
          </div>
        )}
      </Card>

      {/* Card 3: Dupla checagem */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">Dupla checagem</p>
              <p className="text-[11px] text-muted-foreground">
                Confere se o banco bate com o portal (últimos 5 anos).
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={conferir} disabled={conferindo} className="shrink-0">
            {conferindo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conferir'}
          </Button>
        </div>
        {conferencia && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MetricPill label="Portal" valor={String(conferencia.total_portal)} />
            <MetricPill label="Banco" valor={String(conferencia.total_banco)} />
            <MetricPill
              label="Diferença"
              valor={String(conferencia.diferenca)}
              tone={conferencia.diferenca === 0 ? 'ok' : 'warn'}
            />
            {conferencia.faltando_no_banco?.length > 0 && (
              <div className="col-span-3">
                <p className="text-[11px] font-medium mt-1">Faltando no banco ({conferencia.faltando_no_banco.length}):</p>
                <div className="max-h-32 overflow-auto text-[10px] text-muted-foreground font-mono">
                  {conferencia.faltando_no_banco.slice(0, 30).map((k: string) => (
                    <div key={k}>{k}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

function MetricPill({
  label,
  valor,
  tone = 'default',
}: {
  label: string;
  valor: string;
  tone?: 'default' | 'ok' | 'warn';
}) {
  const cls =
    tone === 'ok'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'bg-muted text-foreground';
  return (
    <div className={`rounded-xl px-3 py-2 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-[15px] font-semibold leading-tight">{valor}</p>
    </div>
  );
}
