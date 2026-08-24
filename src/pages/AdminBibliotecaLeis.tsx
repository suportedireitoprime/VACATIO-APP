import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Loader2, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle,
  Circle, Search, Play, Download, Ban, Sparkles, Eye, Trash2,
  MapPin, FileWarning, Landmark, Radar as RadarIcon, CheckCheck, ArrowLeft, LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { tipoToSlug, leiToSlug } from '@/lib/legislacaoSlugs';


interface LeiRow {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string | null;
  categoria: string;
  planalto_url: string | null;
  total_artigos: number | null;
  updated_at: string;
}

interface Snapshot {
  lei_id: string;
  status: string;
  data_ultima_alteracao_detectada: string | null;
  verificado_em: string;
  ultimo_diff: any;
}

interface ImpactoRow {
  id: string;
  lei_id: string;
  ato_url: string | null;
  ato_ementa: string | null;
  tipo: string;
  status: string;
  resumo_ia: string | null;
  created_at: string;
  vade_mecum_leis?: { nome: string; slug: string } | null;
}

function statusBadge(status: string | undefined | null, temSnap: boolean) {
  if (!temSnap) return <Badge variant="outline" className="text-muted-foreground"><Circle className="w-3 h-3 mr-1" />Nunca verificado</Badge>;
  if (status === 'atualizacao_disponivel') return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Atualização disponível</Badge>;
  if (status === 'erro') return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Erro</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>;
}

export default function AdminBibliotecaLeis() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'hub' | 'auditoria' | 'verificacao' | 'radar' | 'concluidos'>('hub');
  const [loading, setLoading] = useState(true);
  const [leis, setLeis] = useState<LeiRow[]>([]);
  const [snaps, setSnaps] = useState<Record<string, Snapshot>>({});
  const [impactos, setImpactos] = useState<ImpactoRow[]>([]);
  const [busca, setBusca] = useState('');
  const [verificando, setVerificando] = useState<string | null>(null);
  const [populando, setPopulando] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'atualizacao_disponivel' | 'ok' | 'nunca'>('todos');
  const [detectando, setDetectando] = useState(false);
  const CONCLUIDOS_KEY = 'admin_biblioteca_leis_concluidos_v1';
  type Concluido = { slug: string; nome: string; artigos: number; quando: string };
  const [concluidos, setConcluidos] = useState<Record<string, Concluido>>(() => {
    try { return JSON.parse(localStorage.getItem(CONCLUIDOS_KEY) || '{}'); } catch { return {}; }
  });
  const populados = useMemo(() => {
    const m: Record<string, number> = {};
    Object.values(concluidos).forEach(c => { m[c.slug] = c.artigos; });
    return m;
  }, [concluidos]);
  const [verPreview, setVerPreview] = useState<{ slug: string; nome: string; artigos: any[] } | null>(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);


  const load = async () => {
    setLoading(true);
    const [leisRes, snapsRes, impRes] = await Promise.all([
      supabase.from('vade_mecum_leis').select('id, slug, nome, nome_curto, categoria, planalto_url, total_artigos, updated_at').order('categoria').order('ordem' as any),
      supabase.from('vade_mecum_lei_snapshots' as any).select('*'),
      supabase.from('radar_impactos_leis' as any)
        .select('*, vade_mecum_leis(nome, slug)')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    setLeis((leisRes.data as any) ?? []);
    const map: Record<string, Snapshot> = {};
    ((snapsRes.data as any[]) ?? []).forEach((s: any) => { map[s.lei_id] = s; });
    setSnaps(map);
    setImpactos((impRes.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // --- Fase 1: Auditoria ---
  // Cruza catálogo (id) ↔ Supabase (slug) por (a) slug igual ao id do catálogo,
  // (b) planalto_url normalizado ou (c) tabela_nome/nome. Assim não conta como
  // "faltando" leis que já existem no banco sob outro slug (ex.: cf88 ↔ cf).
  const auditoria = useMemo(() => {
    const normUrl = (u?: string | null) =>
      (u ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').split('/').pop() ?? '';
    const normNome = (s?: string | null) =>
      (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

    const dbBySlug = new Map(leis.map(l => [l.slug, l]));
    const dbByFile = new Map<string, LeiRow>();
    const dbByNome = new Map<string, LeiRow>();
    leis.forEach(l => {
      const f = normUrl(l.planalto_url);
      if (f) dbByFile.set(f, l);
      const n = normNome(l.nome);
      if (n) dbByNome.set(n, l);
    });

    const linkedDbSlugs = new Set<string>();
    const faltando: typeof LEIS_CATALOG = [];
    LEIS_CATALOG.forEach(cat => {
      const bySlug = dbBySlug.get(cat.id);
      const byFile = bySlug ?? dbByFile.get(normUrl(cat.url_planalto));
      const byNome = byFile ?? dbByNome.get(normNome(cat.nome));
      if (byNome) linkedDbSlugs.add(byNome.slug);
      else faltando.push(cat);
    });

    const semArtigos = leis.filter(l => !l.total_artigos || l.total_artigos === 0);
    const orfaos = leis.filter(l => !linkedDbSlugs.has(l.slug));
    return { faltando, semArtigos, orfaos };
  }, [leis]);


  // --- Fase 2: Filtros ---
  const leisFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leis.filter(l => {
      if (q && !`${l.nome} ${l.nome_curto ?? ''} ${l.slug}`.toLowerCase().includes(q)) return false;
      const snap = snaps[l.id];
      if (filtroStatus === 'atualizacao_disponivel' && snap?.status !== 'atualizacao_disponivel') return false;
      if (filtroStatus === 'ok' && snap?.status !== 'ok' && snap?.status !== 'verificado') return false;
      if (filtroStatus === 'nunca' && snap) return false;
      return true;
    });
  }, [leis, snaps, busca, filtroStatus]);

  const verificarLei = async (leiId: string) => {
    setVerificando(leiId);
    try {
      const { data, error } = await supabase.functions.invoke('verificar-atualizacao-lei', {
        body: { lei_id: leiId },
      });
      if (error) throw error;
      if (data?.mudou) toast.success('Atualização detectada!');
      else if (data?.primeira_verificacao) toast.success('Snapshot inicial salvo');
      else toast.success('Sem alterações');
      await load();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`);
    } finally {
      setVerificando(null);
    }
  };

  const verificarTodas = async () => {
    toast.loading('Verificando todas... isso leva alguns minutos', { id: 'vt' });
    let ok = 0, erro = 0;
    for (const l of leis.filter(x => x.planalto_url)) {
      try {
        await supabase.functions.invoke('verificar-atualizacao-lei', { body: { lei_id: l.id } });
        ok++;
      } catch { erro++; }
      // pequena pausa para não estourar
      await new Promise(r => setTimeout(r, 400));
    }
    toast.success(`OK: ${ok} · Erros: ${erro}`, { id: 'vt' });
    await load();
  };

  const popularLei = async (
    slug: string,
    bootstrap?: { nome: string; nome_curto?: string; planalto_url?: string; categoria?: string },
  ) => {
    setPopulando(slug);
    try {
      const { data, error } = await supabase.functions.invoke('reextrair-lei-planalto', {
        body: { slug, dry_run: false, ...(bootstrap ?? {}) },
      });
      if (error) {
        // supabase.functions.invoke não expõe o body de respostas 4xx/5xx no error.message.
        // Lemos o Response anexado em error.context para mostrar o motivo real ao admin.
        let motivo = error.message ?? String(error);
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const j = await ctx.json();
            if (j?.error) motivo = j.error;
            if (j?.totalmente_revogada) motivo = `⚠️ ${motivo}`;
          }
        } catch { /* ignore */ }
        throw new Error(motivo);
      }
      const n = (data as any)?.artigos ?? 0;
      const nome = bootstrap?.nome ?? leis.find(l => l.slug === slug)?.nome ?? slug;
      setConcluidos(prev => {
        const next = { ...prev, [slug]: { slug, nome, artigos: n, quando: new Date().toISOString() } };
        try { localStorage.setItem(CONCLUIDOS_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
      toast.success(`OK · ${n} artigos`);
      await load();
    } catch (e: any) {
      toast.error(String(e?.message ?? e), { duration: 8000 });
    } finally {
      setPopulando(null);
    }
  };

  const abrirLeiNoVadeMecum = async (slug: string) => {
    // 1) Preferimos o catálogo local: ele conhece o "tipo interno" (ex.: lei-especial)
    //    e o slug amigável usado nas rotas (ex.: leis-especiais/lomp).
    const catalogItem =
      LEIS_CATALOG.find((l) => l.id === slug) ||
      LEIS_CATALOG.find((l) => leiToSlug(l) === slug);
    if (catalogItem) {
      navigate(`/legislacao/${tipoToSlug(catalogItem.tipo)}/${leiToSlug(catalogItem)}`);
      return;
    }
    // 2) Fallback: usa a categoria salva no banco (pode estar normalizada para 'lei').
    const local = leis.find((l) => l.slug === slug);
    let categoria = local?.categoria;
    if (!categoria) {
      const { data } = await supabase.from('vade_mecum_leis')
        .select('categoria').eq('slug', slug).maybeSingle();
      categoria = (data as any)?.categoria;
    }
    if (!categoria) { toast.error('Categoria da lei não encontrada'); return; }
    navigate(`/legislacao/${tipoToSlug(categoria)}/${slug}`);
  };

  const verLei = async (slug: string, nome: string) => {
    setCarregandoPreview(true);
    setVerPreview({ slug, nome, artigos: [] });
    try {
      const { data: lei } = await supabase.from('vade_mecum_leis')
        .select('id').eq('slug', slug).maybeSingle();
      if (!lei) throw new Error('Lei não encontrada');
      const { data: arts } = await supabase.from('vade_mecum_artigos')
        .select('numero, texto, ordem').eq('lei_id', lei.id).order('ordem').limit(500);
      setVerPreview({ slug, nome, artigos: (arts as any[]) ?? [] });
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`);
      setVerPreview(null);
    } finally {
      setCarregandoPreview(false);
    }
  };



  const aplicarImpacto = async (imp: ImpactoRow) => {
    toast.loading('Reindexando lei...', { id: 'ap' });
    try {
      const lei = leis.find(l => l.id === imp.lei_id);
      if (!lei) throw new Error('Lei não encontrada');
      await supabase.functions.invoke('reextrair-lei-planalto', { body: { slug: lei.slug } });
      await supabase.from('radar_impactos_leis' as any).update({
        status: 'aplicado', aplicado_em: new Date().toISOString(),
      }).eq('id', imp.id);
      toast.success('Aplicado!', { id: 'ap' });
      await load();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`, { id: 'ap' });
    }
  };

  const ignorarImpacto = async (imp: ImpactoRow) => {
    await supabase.from('radar_impactos_leis' as any).update({ status: 'ignorado' }).eq('id', imp.id);
    toast.success('Marcado como ignorado');
    await load();
  };

  const impactosPendentes = impactos.filter(i => i.status === 'pendente').length;
  const HUB_CARDS = [
    { id: 'geral' as const, title: 'Geral', desc: 'Todas as leis · reextrair e narrar', count: leis.length, icon: LayoutGrid },
    { id: 'auditoria' as const, title: 'Leis Faltantes', desc: 'No catálogo, fora do banco', count: auditoria.faltando.length, icon: FileWarning },
    { id: 'estadual' as const, title: 'Legislação Estadual', desc: '27 portais estaduais', count: 27, icon: MapPin },
    { id: 'verificacao' as const, title: 'Federal', desc: 'Leis populadas', count: leis.length, icon: Landmark },
    { id: 'radar' as const, title: 'Radar', desc: 'Impactos pendentes', count: impactosPendentes, icon: RadarIcon },
    { id: 'concluidos' as const, title: 'Concluídos', desc: 'Popularam com sucesso', count: Object.keys(concluidos).length, icon: CheckCheck },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title="Biblioteca de Leis" onBack={() => tab === 'hub' ? navigate('/admin-funcoes') : setTab('hub')} />

      {tab === 'hub' ? (
        <div className="px-4 pt-4 max-w-3xl mx-auto">
          <p className="font-body text-[12px] text-muted-foreground mb-3 px-1">
            Toque em um card para abrir a seção.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {HUB_CARDS.map(c => {
              const Icon = c.icon;
              const onClick = () => {
                if (c.id === 'estadual') navigate('/admin-biblioteca-leis/estadual');
                else if (c.id === 'geral') navigate('/admin-biblioteca-leis/geral');
                else setTab(c.id);
              };
              return (
                <button
                  key={c.id}
                  onClick={onClick}
                  className="text-left rounded-2xl border border-border/60 bg-secondary/30 p-4 min-h-[140px] flex flex-col gap-3 hover:bg-secondary/60 active:bg-secondary transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-primary shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-bold text-foreground leading-none mt-1">{c.count}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-sm font-semibold text-foreground leading-tight">
                      {c.title}
                    </div>
                    <div className="font-body text-[11.5px] text-muted-foreground mt-1 line-clamp-2">
                      {c.desc}
                    </div>
                  </div>
                </button>
              );
            })}

          </div>
        </div>
      ) : (
      <div className="pt-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-none h-auto">
            <TabsTrigger value="auditoria" className="text-xs sm:text-sm py-2">Faltantes</TabsTrigger>
            <TabsTrigger value="verificacao" className="text-xs sm:text-sm py-2">Federal</TabsTrigger>
            <TabsTrigger value="radar" className="text-xs sm:text-sm py-2">Radar ({impactosPendentes})</TabsTrigger>
            <TabsTrigger value="concluidos" className="text-xs sm:text-sm py-2">Concluídos ({Object.keys(concluidos).length})</TabsTrigger>
          </TabsList>

          {/* FASE 1 — AUDITORIA */}
          <TabsContent value="auditoria" className="space-y-3 mt-3">
            <Card className="p-4 rounded-none border-x-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-lg">Faltando no Supabase</h2>
                  <p className="text-xs text-muted-foreground">Estão no catálogo do app mas não existem no banco.</p>
                </div>
                <Badge variant={auditoria.faltando.length > 0 ? 'destructive' : 'secondary'}>
                  {auditoria.faltando.length}
                </Badge>
              </div>
              <div className="divide-y divide-border/60 -mx-4">
                {auditoria.faltando.length === 0 && <p className="text-sm text-muted-foreground px-4">Tudo em ordem ✅</p>}
                {auditoria.faltando.map(l => {
                  const ok = populados[l.id] != null;
                  const tipoLabel: Record<string, string> = {
                    constituicao: 'Constituição',
                    codigo: 'Código',
                    estatuto: 'Estatuto',
                    'lei-especial': 'Lei Federal',
                    previdenciario: 'Previdenciário',
                  };
                  const tipoCor: Record<string, string> = {
                    constituicao: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
                    codigo: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
                    estatuto: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
                    'lei-especial': 'bg-amber-500/15 text-amber-500 border-amber-500/30',
                    previdenciario: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
                  };
                  const area = (l.tags?.[0] ?? '').toString();
                  return (
                    <div key={l.id} className="flex items-start justify-between gap-3 px-4 py-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-[15px] font-medium leading-tight">{l.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{l.id} · {l.sigla}</p>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${tipoCor[l.tipo] ?? ''}`}>
                            {tipoLabel[l.tipo] ?? l.tipo}
                          </Badge>
                          {area && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 capitalize">
                              {area}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        {l.url_planalto && (
                          <a href={l.url_planalto} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {ok ? (
                          <>
                            <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 h-9 px-2.5">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />OK · {populados[l.id]}
                            </Badge>
                            <Button size="sm" variant="secondary" className="h-9" onClick={() => abrirLeiNoVadeMecum(l.id)}>
                              <Eye className="w-3.5 h-3.5 mr-1" />Ver
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="secondary" className="h-9"
                            disabled={populando === l.id || !l.url_planalto}
                            onClick={() => popularLei(l.id, {
                              nome: l.nome,
                              nome_curto: l.sigla,
                              planalto_url: l.url_planalto,
                              categoria: l.tipo,
                            })}>
                            {populando === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 mr-1" />Popular</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </Card>

            <Card className="p-4 rounded-none border-x-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-lg">Cadastradas sem artigos</h2>
                  <p className="text-xs text-muted-foreground">Existem em vade_mecum_leis mas <code>total_artigos = 0</code>.</p>
                </div>
                <Badge variant={auditoria.semArtigos.length > 0 ? 'destructive' : 'secondary'}>
                  {auditoria.semArtigos.length}
                </Badge>
              </div>
              <div className="divide-y divide-border/60 -mx-4">
                {auditoria.semArtigos.map(l => {
                  const ok = populados[l.slug] != null;
                  return (
                    <div key={l.id} className="flex items-start justify-between gap-3 px-4 py-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-[15px] font-medium leading-tight">{l.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{l.slug}{l.nome_curto ? ` · ${l.nome_curto}` : ''}</p>
                        {l.categoria && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 capitalize">
                              {l.categoria}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        {ok ? (
                          <>
                            <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 h-9 px-2.5">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />OK · {populados[l.slug]}
                            </Badge>
                            <Button size="sm" variant="secondary" className="h-9" onClick={() => abrirLeiNoVadeMecum(l.slug)}>
                              <Eye className="w-3.5 h-3.5 mr-1" />Ver
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="secondary" className="h-9"
                            disabled={populando === l.slug || !l.planalto_url}
                            onClick={() => popularLei(l.slug)}>
                            {populando === l.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 mr-1" />Reextrair</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>

            </Card>

            <Card className="p-4 rounded-none border-x-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-lg">Órfãs</h2>
                  <p className="text-xs text-muted-foreground">Existem no Supabase mas o app não referencia.</p>
                </div>
                <Badge variant="secondary">{auditoria.orfaos.length}</Badge>
              </div>
              <div className="space-y-1 max-h-64 overflow-auto">
                {auditoria.orfaos.map(l => (
                  <p key={l.id} className="text-xs text-muted-foreground">{l.slug} — {l.nome}</p>
                ))}
              </div>
            </Card>

          </TabsContent>

          {/* FASE 2 — VERIFICAÇÃO */}
          <TabsContent value="verificacao" className="space-y-3 mt-4 px-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar lei..." className="pl-8" />
              </div>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)}
                className="h-10 rounded-md border bg-background px-2 text-sm">
                <option value="todos">Todos os status</option>
                <option value="atualizacao_disponivel">Com atualização</option>
                <option value="ok">OK</option>
                <option value="nunca">Nunca verificados</option>
              </select>
              <Button variant="secondary" onClick={verificarTodas}>
                <RefreshCw className="w-4 h-4 mr-1" />Verificar todas
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {leisFiltradas.map(l => {
                  const snap = snaps[l.id];
                  return (
                    <Card key={l.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{l.nome_curto ?? l.nome}</p>
                            {statusBadge(snap?.status, !!snap)}
                            <Badge variant="outline" className="text-xs">{l.categoria}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {l.total_artigos ?? 0} artigos
                            {snap?.data_ultima_alteracao_detectada && ` · última alteração detectada: ${snap.data_ultima_alteracao_detectada}`}
                            {snap?.verificado_em && ` · verificado em ${new Date(snap.verificado_em).toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                          {l.planalto_url && (
                            <a href={l.planalto_url} target="_blank" rel="noopener"
                              className="p-2 rounded hover:bg-muted text-muted-foreground">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <Button size="sm" variant={snap?.status === 'atualizacao_disponivel' ? 'default' : 'secondary'}
                            disabled={verificando === l.id || !l.planalto_url}
                            onClick={() => verificarLei(l.id)}>
                            {verificando === l.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <><RefreshCw className="w-3 h-3 mr-1" />Verificar</>}
                          </Button>
                          {snap?.status === 'atualizacao_disponivel' && (
                            <Button size="sm" disabled={populando === l.slug}
                              onClick={() => popularLei(l.slug)}>
                              {populando === l.slug ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Play className="w-3 h-3 mr-1" />Aplicar</>}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {leisFiltradas.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Nenhuma lei nesse filtro.</p>
                )}
              </div>
            )}
          </TabsContent>

          {/* FASE 3 — RADAR */}
          <TabsContent value="radar" className="space-y-3 mt-4 px-4">
            <Card className="p-3 border-primary/20 bg-primary/5">
              <p className="text-sm">
                <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
                O Radar cruza atos novos com a nossa biblioteca. Nada é aplicado automaticamente — você confirma cada mudança abaixo.
              </p>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={detectando}
                onClick={async () => {
                  setDetectando(true);
                  toast.loading('Analisando atos recentes...', { id: 'det' });
                  try {
                    const { data, error } = await supabase.functions.invoke('radar-detectar-impacto-leis', {
                      body: { dias: 14, limit: 300 },
                    });
                    if (error) throw error;
                    toast.success(
                      `Analisados ${(data as any)?.atos_analisados ?? 0} · Impactos: ${(data as any)?.impactos_registrados ?? 0}`,
                      { id: 'det' },
                    );
                    await load();
                  } catch (e: any) {
                    toast.error(`Falha: ${e?.message ?? e}`, { id: 'det' });
                  } finally {
                    setDetectando(false);
                  }
                }}
              >
                {detectando ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Detectar impactos agora
              </Button>
              <Button variant="ghost" onClick={() => navigate('/admin-radares-leis')}>
                Ver Radar de Leis (fonte)
              </Button>
            </div>

            {impactos.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Sem impactos detectados ainda. Clique em <span className="text-primary">Detectar impactos agora</span> para analisar os últimos atos da resenha.
              </p>
            )}

            {impactos.map(imp => (
              <Card key={imp.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary/20 text-primary">{imp.tipo}</Badge>
                      <p className="font-medium">{imp.vade_mecum_leis?.nome ?? imp.lei_id}</p>
                      {imp.status === 'aplicado' && <Badge className="bg-emerald-500/20 text-emerald-500">Aplicado</Badge>}
                      {imp.status === 'ignorado' && <Badge variant="outline">Ignorado</Badge>}
                    </div>
                    {imp.resumo_ia && <p className="text-sm mt-1">{imp.resumo_ia}</p>}
                    {imp.ato_ementa && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{imp.ato_ementa}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(imp.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {imp.ato_url && (
                      <a href={imp.ato_url} target="_blank" rel="noopener"
                        className="p-2 rounded hover:bg-muted text-muted-foreground">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {imp.status === 'pendente' && (
                      <>
                        <Button size="sm" onClick={() => aplicarImpacto(imp)}>
                          <Play className="w-3 h-3 mr-1" />Aplicar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => ignorarImpacto(imp)}>
                          <Ban className="w-3 h-3 mr-1" />Ignorar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* CONCLUÍDOS */}
          <TabsContent value="concluidos" className="space-y-3 mt-3">
            <Card className="p-4 rounded-none border-x-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-lg">Leis populadas</h2>
                  <p className="text-xs text-muted-foreground">Tudo que você populou aqui — verifique se ficou ok.</p>
                </div>
                {Object.keys(concluidos).length > 0 && (
                  <Button size="sm" variant="ghost" className="h-8 text-muted-foreground"
                    onClick={() => {
                      if (!confirm('Limpar histórico de concluídos?')) return;
                      setConcluidos({});
                      try { localStorage.removeItem(CONCLUIDOS_KEY); } catch {}
                    }}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />Limpar
                  </Button>
                )}
              </div>
              <div className="divide-y divide-border/60 -mx-4">
                {Object.keys(concluidos).length === 0 && (
                  <p className="text-sm text-muted-foreground px-4">Nada aqui ainda. Popule uma lei em Auditoria para vê-la aparecer.</p>
                )}
                {Object.values(concluidos)
                  .sort((a, b) => b.quando.localeCompare(a.quando))
                  .map(c => (
                    <div key={c.slug} className="flex items-start justify-between gap-3 px-4 py-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-[15px] font-medium leading-tight">{c.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.slug} · {new Date(c.quando).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-1">
                        <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 h-9 px-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{c.artigos}
                        </Badge>
                        <Button size="sm" variant="secondary" className="h-9" onClick={() => abrirLeiNoVadeMecum(c.slug)}>
                          <Eye className="w-3.5 h-3.5 mr-1" />Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9"
                          onClick={() => {
                            setConcluidos(prev => {
                              const next = { ...prev };
                              delete next[c.slug];
                              try { localStorage.setItem(CONCLUIDOS_KEY, JSON.stringify(next)); } catch {}
                              return next;
                            });
                            setTab('auditoria');
                            toast.success('Voltou para Auditoria — clique em Popular novamente');
                          }}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />Reextrair
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      )}

      <Sheet open={!!verPreview} onOpenChange={(o) => !o && setVerPreview(null)}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-left">{verPreview?.nome}</SheetTitle>
            <p className="text-xs text-muted-foreground text-left">
              {carregandoPreview ? 'Carregando…' : `${verPreview?.artigos.length ?? 0} itens (mostrando até 500)`}
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
            {carregandoPreview && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
            {verPreview?.artigos.map((a, i) => (
              <div key={i} className="border-b border-border/60 pb-2 last:border-0">
                <p className="text-xs font-semibold text-primary mb-0.5">{a.numero}</p>
                <p className="text-sm whitespace-pre-line leading-relaxed">{a.texto}</p>
              </div>
            ))}
            {!carregandoPreview && verPreview && verPreview.artigos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum artigo encontrado.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

