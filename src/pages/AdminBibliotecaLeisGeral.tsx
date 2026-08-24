// Admin · Biblioteca de Leis · Geral
// Lista TODAS as leis federais cadastradas, mostra artigos + narrações,
// reextração (com opção de preservar enriquecimentos), regeneração de
// narração por artigo E integração com o Radar de Leis (aplicar/ignorar
// impactos detectados por lei/artigo).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2, Search, RefreshCw, Volume2, VolumeX, PlayCircle,
  CheckCircle2, AlertTriangle, FileText, Clock, Radar, ExternalLink,
  Sparkles, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface LeiRow {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string | null;
  categoria: string;
  planalto_url: string | null;
  total_artigos: number | null;
  updated_at: string;
  ultima_reextracao_em: string | null;
}

interface ArtigoRow {
  id: string;
  numero: string;
  texto: string;
  ordem: number;
  narracao_url: string | null;
  ult_alteracao_em: string | null;
  explicacao_tecnico: string | null;
}

interface ImpactoRow {
  id: string;
  lei_id: string;
  artigo_id: string | null;
  artigo_numero: string | null;
  tipo: string;
  ato_url: string | null;
  ato_ementa: string | null;
  resumo_ia: string | null;
  status: string;
  created_at: string;
}

type FiltroTab = 'todas' | 'sem_artigos' | 'com_artigos' | 'sem_url' | 'com_updates';

function tempoRelativo(iso: string | null): string {
  if (!iso) return 'Nunca';
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const dias = Math.floor(diff / 86400000);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias}d`;
  if (dias < 365) return `há ${Math.floor(dias / 30)}mês`;
  return `há ${Math.floor(dias / 365)}a`;
}

export default function AdminBibliotecaLeisGeral() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leis, setLeis] = useState<LeiRow[]>([]);
  const [narracoesPorSlug, setNarracoesPorSlug] = useState<Record<string, number>>({});
  const [impactosPorLei, setImpactosPorLei] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState('');
  const [tab, setTab] = useState<FiltroTab>('todas');
  const [selecionada, setSelecionada] = useState<LeiRow | null>(null);

  const carregar = async () => {
    setLoading(true);
    const [{ data: leisData }, { data: narrData }, { data: impData }] = await Promise.all([
      supabase
        .from('vade_mecum_leis')
        .select('id, slug, nome, nome_curto, categoria, planalto_url, total_artigos, updated_at, ultima_reextracao_em')
        .order('categoria')
        .order('nome'),
      supabase.from('narracoes_artigos').select('tabela_nome'),
      supabase.from('radar_impactos_leis').select('lei_id').eq('status', 'pendente'),
    ]);
    setLeis((leisData as any) ?? []);
    const cont: Record<string, number> = {};
    for (const n of (narrData as any[]) ?? []) {
      const t = n.tabela_nome as string;
      cont[t] = (cont[t] ?? 0) + 1;
    }
    setNarracoesPorSlug(cont);
    const impCount: Record<string, number> = {};
    for (const i of (impData as any[]) ?? []) {
      impCount[i.lei_id] = (impCount[i.lei_id] ?? 0) + 1;
    }
    setImpactosPorLei(impCount);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const arr = leis.filter((l) => {
      if (q && !`${l.nome} ${l.nome_curto ?? ''} ${l.slug}`.toLowerCase().includes(q)) return false;
      const tot = l.total_artigos ?? 0;
      if (tab === 'sem_artigos' && tot > 0) return false;
      if (tab === 'com_artigos' && tot === 0) return false;
      if (tab === 'sem_url' && l.planalto_url) return false;
      if (tab === 'com_updates' && !(impactosPorLei[l.id] > 0)) return false;
      return true;
    });
    // Prioriza leis com atualizações pendentes
    arr.sort((a, b) => (impactosPorLei[b.id] ?? 0) - (impactosPorLei[a.id] ?? 0));
    return arr;
  }, [leis, busca, tab, impactosPorLei]);

  const contadores = useMemo(() => ({
    todas: leis.length,
    sem_artigos: leis.filter((l) => (l.total_artigos ?? 0) === 0).length,
    com_artigos: leis.filter((l) => (l.total_artigos ?? 0) > 0).length,
    sem_url: leis.filter((l) => !l.planalto_url).length,
    com_updates: leis.filter((l) => (impactosPorLei[l.id] ?? 0) > 0).length,
  }), [leis, impactosPorLei]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title="Geral · Todas as leis" onBack={() => navigate('/admin-biblioteca-leis')} />

      <div className="px-4 pt-4 max-w-3xl mx-auto space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, slug ou apelido..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as FiltroTab)}>
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="todas" className="text-[11px] py-2 flex flex-col gap-0.5">
              <span>Todas</span>
              <span className="text-[10px] opacity-70">{contadores.todas}</span>
            </TabsTrigger>
            <TabsTrigger value="com_artigos" className="text-[11px] py-2 flex flex-col gap-0.5">
              <span>Com art.</span>
              <span className="text-[10px] opacity-70">{contadores.com_artigos}</span>
            </TabsTrigger>
            <TabsTrigger value="sem_artigos" className="text-[11px] py-2 flex flex-col gap-0.5">
              <span>Faltando</span>
              <span className="text-[10px] opacity-70">{contadores.sem_artigos}</span>
            </TabsTrigger>
            <TabsTrigger value="sem_url" className="text-[11px] py-2 flex flex-col gap-0.5">
              <span>Sem URL</span>
              <span className="text-[10px] opacity-70">{contadores.sem_url}</span>
            </TabsTrigger>
            <TabsTrigger value="com_updates" className="text-[11px] py-2 flex flex-col gap-0.5">
              <span>Radar</span>
              <span className="text-[10px] text-amber-500 font-semibold">{contadores.com_updates}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <Card className="divide-y divide-border/60 overflow-hidden">
            {filtradas.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma lei nesse filtro.</p>
            )}
            {filtradas.map((l) => {
              const tot = l.total_artigos ?? 0;
              const narr = narracoesPorSlug[l.slug] ?? 0;
              const pct = tot > 0 ? Math.round((narr / tot) * 100) : 0;
              const nUpdates = impactosPorLei[l.id] ?? 0;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelecionada(l)}
                  className="w-full text-left px-4 py-3 hover:bg-secondary/40 active:bg-secondary transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium leading-tight truncate">{l.nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {l.slug} · {l.categoria}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-5 ${tot > 0 ? 'border-emerald-500/40 text-emerald-500' : 'border-amber-500/40 text-amber-500'}`}
                      >
                        <FileText className="w-3 h-3 mr-1" />{tot} art
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-5 ${narr > 0 ? 'border-primary/40 text-primary' : 'border-border text-muted-foreground'}`}
                      >
                        <Volume2 className="w-3 h-3 mr-1" />{narr} narr {tot > 0 && `· ${pct}%`}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 border-border text-muted-foreground"
                        title={l.ultima_reextracao_em ? new Date(l.ultima_reextracao_em).toLocaleString('pt-BR') : 'Nunca reextraído'}
                      >
                        <Clock className="w-3 h-3 mr-1" />{tempoRelativo(l.ultima_reextracao_em)}
                      </Badge>
                      {nUpdates > 0 && (
                        <Badge className="text-[10px] px-1.5 py-0 h-5 bg-amber-500 hover:bg-amber-500 text-white">
                          <Radar className="w-3 h-3 mr-1" />{nUpdates} atualiz.
                        </Badge>
                      )}
                      {!l.planalto_url && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">sem URL</Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </Card>
        )}
      </div>

      {selecionada && (
        <DetalheLeiSheet
          lei={selecionada}
          onClose={() => setSelecionada(null)}
          onReloadLista={carregar}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Sheet detalhe — reextração + Radar + lista de artigos
// ─────────────────────────────────────────────────────────
function DetalheLeiSheet({
  lei,
  onClose,
  onReloadLista,
}: {
  lei: LeiRow;
  onClose: () => void;
  onReloadLista: () => Promise<void>;
}) {
  const [artigos, setArtigos] = useState<ArtigoRow[]>([]);
  const [narrMap, setNarrMap] = useState<Record<string, string>>({});
  const [impactos, setImpactos] = useState<ImpactoRow[]>([]);
  const [carregandoArt, setCarregandoArt] = useState(true);
  const [confirmandoReextracao, setConfirmandoReextracao] = useState(false);
  const [reextraindo, setReextraindo] = useState(false);
  const [narrandoNum, setNarrandoNum] = useState<string | null>(null);
  const [aplicandoImpacto, setAplicandoImpacto] = useState<string | null>(null);
  const [confirmandoImpacto, setConfirmandoImpacto] = useState<ImpactoRow | null>(null);
  const [busca, setBusca] = useState('');
  const [scrollToArtigoId, setScrollToArtigoId] = useState<string | null>(null);

  const carregarArtigos = async () => {
    setCarregandoArt(true);
    const [{ data: arts }, { data: narrs }, { data: imps }] = await Promise.all([
      supabase
        .from('vade_mecum_artigos')
        .select('id, numero, texto, ordem, narracao_url, ult_alteracao_em, explicacao_tecnico')
        .eq('lei_id', lei.id)
        .order('ordem'),
      supabase
        .from('narracoes_artigos')
        .select('artigo_numero, audio_url')
        .eq('tabela_nome', lei.slug),
      supabase
        .from('radar_impactos_leis')
        .select('id, lei_id, artigo_id, artigo_numero, tipo, ato_url, ato_ementa, resumo_ia, status, created_at')
        .eq('lei_id', lei.id)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false }),
    ]);
    setArtigos((arts as any) ?? []);
    const m: Record<string, string> = {};
    for (const n of (narrs as any[]) ?? []) {
      if (n.artigo_numero) m[String(n.artigo_numero)] = n.audio_url;
    }
    setNarrMap(m);
    setImpactos((imps as any) ?? []);
    setCarregandoArt(false);
  };

  useEffect(() => { carregarArtigos(); }, [lei.id]);

  useEffect(() => {
    if (!scrollToArtigoId) return;
    const el = document.getElementById(`art-${scrollToArtigoId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-500');
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 2000);
    }
    setScrollToArtigoId(null);
  }, [scrollToArtigoId, artigos]);

  const totalNarr = Object.keys(narrMap).length;
  const totalArt = artigos.length;

  const reextrair = async (preservar: boolean) => {
    setConfirmandoReextracao(false);
    setReextraindo(true);
    toast.loading('Reextraindo lei do Planalto...', { id: 'rx' });
    try {
      const { data, error } = await supabase.functions.invoke('reextrair-lei-planalto', {
        body: { slug: lei.slug, dry_run: false, preservar_enriquecimento: preservar },
      });
      if (error) throw error;
      const n = (data as any)?.artigos ?? 0;
      const pres = (data as any)?.preservados_count ?? 0;
      toast.success(
        preservar ? `${n} artigos · ${pres} enriquecimentos preservados` : `${n} artigos (limpos)`,
        { id: 'rx' },
      );
      await carregarArtigos();
      await onReloadLista();
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`, { id: 'rx' });
    } finally {
      setReextraindo(false);
    }
  };

  const regenerarNarracao = async (art: ArtigoRow) => {
    setNarrandoNum(art.numero);
    toast.loading(`Gerando narração do art. ${art.numero}...`, { id: `nr-${art.numero}` });
    try {
      const { data, error } = await supabase.functions.invoke('narrar-artigo', {
        body: {
          tabela_nome: lei.slug,
          artigo_numero: art.numero,
          artigo_texto: art.texto,
          lei_nome: lei.nome,
          force_regenerate: true,
        },
      });
      if (error) throw error;
      const url = (data as any)?.audio_url;
      if (url) setNarrMap((prev) => ({ ...prev, [art.numero]: url }));
      toast.success('Narração gerada', { id: `nr-${art.numero}` });
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`, { id: `nr-${art.numero}` });
    } finally {
      setNarrandoNum(null);
    }
  };

  const aplicarImpacto = async (imp: ImpactoRow) => {
    setConfirmandoImpacto(null);
    setAplicandoImpacto(imp.id);
    toast.loading('Aplicando atualização...', { id: `imp-${imp.id}` });
    try {
      const { data, error } = await supabase.functions.invoke('lei-aplicar-impacto-radar', {
        body: { impacto_id: imp.id },
      });
      if (error) throw error;
      const r = data as any;
      const partes: string[] = [];
      if (r?.mudou) partes.push('texto atualizado');
      if (r?.tinha_narracao) partes.push('narração precisa ser regerada');
      if (r?.tinha_explicacao) partes.push('explicações precisam ser regeradas');
      toast.success(partes.length ? partes.join(' · ') : 'Impacto aplicado', { id: `imp-${imp.id}` });
      await carregarArtigos();
      if (r?.artigo_id) setScrollToArtigoId(r.artigo_id);
    } catch (e: any) {
      toast.error(`Falha: ${e?.message ?? e}`, { id: `imp-${imp.id}` });
    } finally {
      setAplicandoImpacto(null);
    }
  };

  const ignorarImpacto = async (imp: ImpactoRow) => {
    await supabase.from('radar_impactos_leis').update({ status: 'ignorado' }).eq('id', imp.id);
    setImpactos((prev) => prev.filter((x) => x.id !== imp.id));
    toast.success('Atualização ignorada');
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return artigos;
    return artigos.filter((a) => `${a.numero} ${a.texto}`.toLowerCase().includes(q));
  }, [artigos, busca]);

  const tipoLabel = (t: string) =>
    t === 'revogacao' ? 'Revogação' :
    t === 'alteracao' ? 'Alteração' :
    t === 'regulamentacao' ? 'Regulamentação' : 'Menção';

  const tipoCor = (t: string) =>
    t === 'revogacao' ? 'bg-red-500' :
    t === 'alteracao' ? 'bg-amber-500' :
    t === 'regulamentacao' ? 'bg-blue-500' : 'bg-slate-500';

  return (
    <>
      <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b sticky top-0 bg-background z-10">
            <SheetTitle className="text-left text-[15px] leading-tight pr-6">
              {lei.nome}
            </SheetTitle>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant="outline" className="text-[10px]">{lei.slug}</Badge>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-500">
                <FileText className="w-3 h-3 mr-1" />{totalArt} artigos
              </Badge>
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                <Volume2 className="w-3 h-3 mr-1" />{totalNarr} narrados
                {totalArt > 0 && ` · ${Math.round((totalNarr / totalArt) * 100)}%`}
              </Badge>
              <Badge variant="outline" className="text-[10px]" title={lei.ultima_reextracao_em ? new Date(lei.ultima_reextracao_em).toLocaleString('pt-BR') : 'Nunca'}>
                <Clock className="w-3 h-3 mr-1" />Reextr.: {tempoRelativo(lei.ultima_reextracao_em)}
              </Badge>
            </div>
          </SheetHeader>

          <div className="px-4 py-3 border-b space-y-2">
            <Button
              className="w-full h-10"
              onClick={() => setConfirmandoReextracao(true)}
              disabled={!lei.planalto_url || reextraindo}
            >
              {reextraindo ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reextraindo...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" />Reextrair do Planalto</>
              )}
            </Button>
            {!lei.planalto_url && (
              <p className="text-[11px] text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Sem URL do Planalto — impossível reextrair.
              </p>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigo por número ou texto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {impactos.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <Card className="border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Radar className="w-4 h-4 text-amber-500" />
                  <p className="text-[13px] font-semibold text-amber-600 dark:text-amber-400">
                    {impactos.length} atualização{impactos.length > 1 ? 'ões' : ''} disponível{impactos.length > 1 ? 'eis' : ''}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Novos atos normativos detectados pelo Radar de Leis podem alterar artigos desta lei. Aplique para atualizar o texto e reprocessar narração/explicações.
                </p>
                <div className="space-y-2 pt-1">
                  {impactos.map((imp) => (
                    <div key={imp.id} className="rounded-md border border-amber-500/30 bg-background p-2.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className={`text-[9px] px-1.5 py-0 h-4 ${tipoCor(imp.tipo)} text-white hover:${tipoCor(imp.tipo)}`}>
                              {tipoLabel(imp.tipo)}
                            </Badge>
                            {imp.artigo_numero && (
                              <button
                                onClick={() => imp.artigo_id && setScrollToArtigoId(imp.artigo_id)}
                                className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                              >
                                Art. {imp.artigo_numero}
                              </button>
                            )}
                            {imp.ato_url && (
                              <a href={imp.ato_url} target="_blank" rel="noreferrer"
                                 className="text-[10px] text-muted-foreground flex items-center gap-0.5 hover:text-foreground">
                                Ver ato <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          {imp.resumo_ia && (
                            <p className="text-[11px] text-foreground/80 mt-1 leading-snug">{imp.resumo_ia}</p>
                          )}
                          {imp.ato_ementa && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{imp.ato_ementa}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          className="h-7 text-[11px] flex-1"
                          onClick={() => setConfirmandoImpacto(imp)}
                          disabled={aplicandoImpacto === imp.id || !imp.artigo_numero}
                        >
                          {aplicandoImpacto === imp.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <><Sparkles className="w-3 h-3 mr-1" />Aplicar</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-muted-foreground"
                          onClick={() => ignorarImpacto(imp)}
                        >
                          <X className="w-3 h-3 mr-1" />Ignorar
                        </Button>
                      </div>
                      {!imp.artigo_numero && (
                        <p className="text-[10px] text-amber-500">
                          Artigo específico não identificado — reveja manualmente.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {carregandoArt ? (
              <div className="py-10 flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando artigos...
              </div>
            ) : filtrados.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {artigos.length === 0
                  ? 'Nenhum artigo populado. Clique em "Reextrair do Planalto".'
                  : 'Nenhum artigo corresponde à busca.'}
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {filtrados.map((art) => {
                  const audio = narrMap[art.numero];
                  const temNarr = !!audio;
                  const carregando = narrandoNum === art.numero;
                  const alteradoRecente = art.ult_alteracao_em &&
                    (Date.now() - new Date(art.ult_alteracao_em).getTime()) < 90 * 86400000;
                  return (
                    <div
                      key={art.id}
                      id={`art-${art.id}`}
                      className="px-4 py-3 flex items-start gap-3 transition-shadow rounded-md"
                    >
                      <div className="w-10 shrink-0 text-center">
                        <div className="text-[11px] font-mono text-muted-foreground">#{art.ordem}</div>
                        {temNarr ? (
                          <CheckCircle2 className="w-4 h-4 text-primary mx-auto mt-1" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-muted-foreground/50 mx-auto mt-1" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[13px] font-semibold leading-tight">Art. {art.numero}</p>
                          {alteradoRecente && (
                            <Badge className="text-[9px] px-1 py-0 h-4 bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20">
                              Alterado {new Date(art.ult_alteracao_em!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">
                          {art.texto?.slice(0, 200)}
                        </p>
                        {temNarr && (
                          <audio controls src={audio} className="mt-2 h-8 w-full max-w-xs" preload="none" />
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={temNarr ? 'outline' : 'default'}
                        onClick={() => regenerarNarracao(art)}
                        disabled={carregando}
                        className="shrink-0 h-8 text-[11px]"
                      >
                        {carregando ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : temNarr ? (
                          <><RefreshCw className="w-3.5 h-3.5 mr-1" />Regen</>
                        ) : (
                          <><PlayCircle className="w-3.5 h-3.5 mr-1" />Narrar</>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmandoReextracao} onOpenChange={setConfirmandoReextracao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reextrair {lei.nome_curto ?? lei.nome}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Existem atualmente <strong>{totalArt}</strong> artigos e{' '}
                  <strong>{totalNarr}</strong> narrações associadas.
                </p>
                <p className="text-muted-foreground">
                  As narrações ficam guardadas por número e são recuperadas automaticamente
                  quando o artigo voltar. Deseja também <strong>manter os enriquecimentos</strong>
                  (comentário, explicações, exemplo, termos, questões, flashcards) já feitos?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => reextrair(false)}>
              Não, começar do zero
            </Button>
            <AlertDialogAction onClick={() => reextrair(true)}>
              Sim, manter enriquecimentos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmandoImpacto} onOpenChange={(o) => !o && setConfirmandoImpacto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Aplicar {confirmandoImpacto ? tipoLabel(confirmandoImpacto.tipo).toLowerCase() : ''} ao Art. {confirmandoImpacto?.artigo_numero}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {confirmandoImpacto?.resumo_ia && (
                  <p className="text-foreground/80">{confirmandoImpacto.resumo_ia}</p>
                )}
                <p className="text-muted-foreground">
                  O texto do artigo será atualizado a partir do Planalto e os
                  enriquecimentos existentes serão <strong>apagados</strong>
                  (narração, explicações, exemplo, comentário, termos, questões, flashcards)
                  — porque o texto novo torna os anteriores obsoletos.
                </p>
                <p className="text-muted-foreground text-xs">
                  Você poderá regerar tudo em seguida pelos botões da lista.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmandoImpacto && aplicarImpacto(confirmandoImpacto)}>
              Aplicar atualização
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
