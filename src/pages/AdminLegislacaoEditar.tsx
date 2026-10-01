import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Search, ChevronRight, FileText, Bell, RefreshCw, Clock, Radar,
  History, ArrowRight, BookOpen
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
  ult_alteracao_em: string | null;
}

interface ImpactoRow {
  id: string;
  artigo_numero: string | null;
  tipo: string;
  ato_ementa: string | null;
  resumo_ia: string | null;
  status: string;
  created_at: string;
}

interface HistoricoRow {
  artigo_numero: string;
  texto_antigo: string;
  texto_novo: string;
  nota: string;
  data_aproximada: number;
}

export default function AdminLegislacaoEditar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leis, setLeis] = useState<LeiRow[]>([]);
  const [busca, setBusca] = useState('');
  
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<LeiRow | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vade_mecum_leis')
      .select('id, slug, nome, nome_curto, categoria, planalto_url, total_artigos, updated_at, ultima_reextracao_em')
      .order('categoria')
      .order('ordem' as any, { ascending: true, nullsFirst: false })
      .order('nome');
      
    if (error) {
      toast.error('Erro ao carregar leis');
    } else {
      setLeis((data as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const CATEGORIA_LABELS: Record<string, string> = {
    codigo: 'Códigos',
    estatuto: 'Estatutos',
    lei: 'Legislação Especial',
    estadual_sp: 'Estadual (SP)',
    constituicao: 'Constituição'
  };

  const getCatName = (cat: string) => CATEGORIA_LABELS[cat] || cat;

  const categoriasMap = useMemo(() => {
    const map: Record<string, LeiRow[]> = {};
    const q = busca.trim().toLowerCase();
    
    for (const l of leis) {
      if (q && !`${l.nome} ${l.nome_curto ?? ''} ${l.categoria}`.toLowerCase().includes(q)) {
        continue;
      }
      const rawCat = l.categoria || 'sem_categoria';
      const catName = getCatName(rawCat);
      if (!map[catName]) map[catName] = [];
      map[catName].push(l);
    }
    return map;
  }, [leis, busca]);

  const categoriasKeys = Object.keys(categoriasMap).sort();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title="Legislação Editar" onBack={() => navigate(-1)} />

      <div className="px-4 pt-4 max-w-3xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lei, apelido ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando base...
          </div>
        ) : (
          <div className="space-y-4">
            {categoriasKeys.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Nenhum resultado encontrado.</p>
            )}
            
            {categoriasKeys.map(cat => {
              const itens = categoriasMap[cat];
              
              return (
                <Card key={cat} className="overflow-hidden">
                  <button
                    onClick={() => setCategoriaAtiva(cat)}
                    className="w-full px-4 py-3 bg-secondary/20 hover:bg-secondary/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{cat}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{itens.length}</Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!categoriaAtiva} onOpenChange={(val) => !val && setCategoriaAtiva(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0 pb-0 pt-4 flex flex-col gap-0 border-border bg-background">
          <SheetHeader className="px-5 pb-3 border-b border-border text-left">
            <SheetTitle className="font-display font-bold text-xl">{categoriaAtiva}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-2 py-2 divide-y divide-border/60">
            {categoriaAtiva && categoriasMap[categoriaAtiva]?.map(lei => (
              <button
                key={lei.id}
                onClick={() => {
                  setCategoriaAtiva(null);
                  setTimeout(() => setSelecionada(lei), 200);
                }}
                className="w-full text-left px-4 py-3.5 hover:bg-secondary/40 flex items-center justify-between rounded-xl transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-[15px] font-medium leading-tight truncate">{lei.nome}</p>
                  <p className="text-[12px] text-muted-foreground mt-1 truncate">{lei.nome_curto || lei.slug}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

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

function DetalheLeiSheet({
  lei,
  onClose,
  onReloadLista,
}: {
  lei: LeiRow;
  onClose: () => void;
  onReloadLista: () => Promise<void>;
}) {
  const [tab, setTab] = useState('legislacao');
  
  const [artigos, setArtigos] = useState<ArtigoRow[]>([]);
  const [impactos, setImpactos] = useState<ImpactoRow[]>([]);
  const [historico, setHistorico] = useState<HistoricoRow[]>([]);
  
  const [loadingArts, setLoadingArts] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [reextraindo, setReextraindo] = useState(false);

  const [previewMode, setPreviewMode] = useState<'inicio' | 'recentes'>('inicio');
  const [pushTitulo, setPushTitulo] = useState(`Atualização: ${lei.nome_curto || lei.nome}`);
  const [pushMsg, setPushMsg] = useState('');

  const carregarBasico = async () => {
    setLoadingArts(true);
    const [arts, { data: imps }] = await Promise.all([
      fetchAllRows(() => supabase
        .from('vade_mecum_artigos')
        .select('id, numero, texto, ordem, ult_alteracao_em')
        .eq('lei_id', lei.id)
        .order('ordem')),
      supabase
        .from('radar_impactos_leis')
        .select('id, artigo_numero, tipo, ato_ementa, resumo_ia, status, created_at')
        .eq('lei_id', lei.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);
    setArtigos((arts as any) ?? []);
    setImpactos((imps as any) ?? []);
    setLoadingArts(false);
  };

  useEffect(() => { carregarBasico(); }, [lei.id]);

  const carregarHistorico = async () => {
    if (historico.length > 0) return;
    setLoadingHistorico(true);
    try {
      const { data, error } = await supabase.functions.invoke('historico-atualizacao-lei', {
        body: { lei_id: lei.id }
      });
      if (error) throw new Error(error.message);
      setHistorico(data || []);
    } catch (err: any) {
      console.warn('[historico-atualizacao-lei] Edge Function indisponível:', err.message);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const fazerRaspagem = async () => {
    setReextraindo(true);
    const tid = toast.loading('Raspando lei do Planalto...');
    try {
      const { error } = await supabase.functions.invoke('reextrair-lei-planalto', {
        body: { slug: lei.slug, dry_run: false }
      });
      if (error) throw new Error(error.message);
      toast.success('Lei raspada com sucesso!', { id: tid });
      await Promise.all([carregarBasico(), onReloadLista()]);
    } catch (e: any) {
      toast.error('Erro na raspagem: ' + e.message, { id: tid });
    } finally {
      setReextraindo(false);
    }
  };

  const enviarPush = async () => {
    if (!pushMsg.trim()) return toast.error('Digite a mensagem do push');
    
    const tid = toast.loading('Enviando Push...');
    try {
      const { error } = await supabase.functions.invoke('send-push', {
        body: { titulo: pushTitulo, mensagem: pushMsg, topico: 'all' }
      });
      if (error) throw new Error(error.message);
      toast.success('Push enviado com sucesso!', { id: tid });
      setPushMsg('');
    } catch (e: any) {
      toast.error('Falha ao enviar Push: ' + e.message, { id: tid });
    }
  };

  return (
    <Sheet open={true} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-xl bg-background">
        <SheetHeader className="p-4 border-b text-left space-y-1 flex-shrink-0">
          <SheetTitle className="text-lg leading-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="truncate">{lei.nome_curto || lei.nome}</span>
          </SheetTitle>
          <p className="text-xs text-muted-foreground truncate">{lei.categoria}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={tab} onValueChange={(v) => {
            setTab(v);
            if (v === 'historico') carregarHistorico();
          }} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-background h-auto flex-wrap p-0">
              <TabsTrigger value="legislacao" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">Legislação</TabsTrigger>
              <TabsTrigger value="atualizacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">Últimas Atualizações</TabsTrigger>
              <TabsTrigger value="raspagem" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">Raspagem</TabsTrigger>
            </TabsList>

            <div className="p-4">
              <TabsContent value="legislacao" className="mt-0">
                {loadingArts ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Artigos ({artigos.length})</h3>
                      <Badge variant="outline"><FileText className="w-3 h-3 mr-1"/> Cadastrados</Badge>
                    </div>
                    {artigos.slice(0, 100).map(art => (
                      <Card key={art.id} className="p-3">
                        <div className="font-semibold text-xs text-primary mb-1">{art.numero}</div>
                        <div className="text-sm text-muted-foreground line-clamp-3">{art.texto}</div>
                      </Card>
                    ))}
                    {artigos.length > 100 && (
                      <p className="text-center text-xs text-muted-foreground py-2">Mostrando apenas os 100 primeiros de {artigos.length}.</p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="atualizacoes" className="mt-0 space-y-4">
                <h3 className="font-semibold text-sm">Monitoramento Diário (Radar)</h3>
                <p className="text-xs text-muted-foreground mb-4">Atualizações detectadas pelo robô do Diário Oficial nos últimos dias.</p>
                
                {loadingArts ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : impactos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atualização pendente ou recente no Radar.</p>
                ) : (
                  <div className="space-y-3">
                    {impactos.map(imp => (
                      <Card key={imp.id} className="p-3 border-l-4 border-l-amber-500">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="text-[10px]">{imp.tipo}</Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(imp.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-sm font-medium mb-1">{imp.ato_ementa}</p>
                        {imp.resumo_ia && <p className="text-xs text-muted-foreground bg-secondary/20 p-2 rounded">{imp.resumo_ia}</p>}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="raspagem" className="mt-0 space-y-6">
                <div>
                  <h3 className="font-semibold text-sm mb-1">Raspagem Manual (Re-extração)</h3>
                  <p className="text-xs text-muted-foreground">
                    Isto forçará o robô a entrar na página do Planalto ({lei.planalto_url}) e re-extrair todos os artigos do zero, sobrescrevendo o texto antigo para garantir a redação correta e atualizada.
                  </p>
                </div>
                
                <Card className="p-4 bg-secondary/10 border-dashed border-2">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <RefreshCw className={`w-8 h-8 text-primary ${reextraindo ? 'animate-spin' : ''}`} />
                    <div className="text-sm">
                      {lei.ultima_reextracao_em ? (
                        <p>Última raspagem: <strong>{new Date(lei.ultima_reextracao_em).toLocaleString('pt-BR')}</strong></p>
                      ) : (
                        <p>Esta lei nunca foi re-extraída manualmente.</p>
                      )}
                    </div>
                    <Button onClick={fazerRaspagem} disabled={reextraindo || !lei.planalto_url} className="w-full max-w-xs">
                      {reextraindo ? 'Raspando...' : 'Iniciar Raspagem Agora'}
                    </Button>
                    {!lei.planalto_url && (
                      <p className="text-xs text-destructive mt-2">URL do Planalto não configurada no banco.</p>
                    )}
                  </div>
                </Card>

                {/* Preview dos artigos no estilo Vade Mecum */}
                {artigos.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground shrink-0">
                        Preview · <span className="text-primary">{artigos.length} artigos</span>
                      </h4>
                      <div className="flex items-center bg-secondary/60 rounded-lg p-0.5 border border-border/50">
                        <button
                          onClick={() => setPreviewMode('inicio')}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                            previewMode === 'inicio'
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Início
                        </button>
                        <button
                          onClick={() => setPreviewMode('recentes')}
                          className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                            previewMode === 'recentes'
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Mais recentes
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto rounded-xl border border-border/50 bg-background p-2">
                      {(() => {
                        const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
                        
                        const extractDateFromText = (text: string) => {
                          let bestDate = 0;
                          let bestMonth = 0;
                          let bestYear = 0;
                          
                          // Match formats like "de 12.1.2024" or "de 2024" inside annotations.
                          // Planalto HTML sometimes truncates the closing parenthesis, so we omit \).
                          const regex = /\((?:Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Alterad[oa]).*?de\s+(?:(\d{1,2})\.(\d{1,2})\.(\d{4})|(\d{4}))/gi;
                          let match;
                          while ((match = regex.exec(text)) !== null) {
                            let y = 0, m = 0;
                            if (match[4]) {
                              y = parseInt(match[4], 10);
                            } else if (match[3]) {
                              y = parseInt(match[3], 10);
                              m = parseInt(match[2], 10) - 1; // 0-indexed month
                            }
                            if (y > 1900 && y <= new Date().getFullYear()) {
                              const score = y * 100 + m;
                              if (score > bestDate) {
                                bestDate = score;
                                bestYear = y;
                                bestMonth = m;
                              }
                            }
                          }
                          return bestYear > 0 ? { year: bestYear, month: bestMonth, score: bestDate } : null;
                        };

                        const listaPreview = previewMode === 'recentes'
                          ? (() => {
                              const filtrados = [...artigos]
                                .filter(a => !/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/i.test(a.numero))
                                .map(a => ({ ...a, parsedDate: extractDateFromText(a.texto) }))
                                .filter(a => a.parsedDate !== null)
                                .sort((a, b) => b.parsedDate!.score - a.parsedDate!.score);
                              
                              return filtrados.length > 0 ? filtrados.slice(0, 80) : [...artigos].reverse().slice(0, 80);
                            })()
                          : artigos.slice(0, 80);
                          
                        return listaPreview.map((art, i) => {
                        const isStructural = /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/i.test(art.numero);
                        
                        if (isStructural) {
                          const lines = art.texto.split('\n').map(l => l.trim()).filter(Boolean);
                          const head = lines[0] || art.numero;
                          const sub = lines.slice(1).join(' — ');
                          return (
                            <div key={art.id} className="px-3 py-3 flex flex-col items-center text-center">
                              <p className="text-[13px] uppercase tracking-[0.2em] font-extrabold text-amber-300 leading-tight">
                                {head}
                              </p>
                              {sub && (
                                <p className="text-[13px] mt-1 font-serif italic font-medium leading-snug text-amber-100/90 max-w-[32ch]">
                                  {sub}
                                </p>
                              )}
                            </div>
                          );
                        }

                        const badgeLabel = art.numero.replace(/^Art\.?\s*/i, '').trim() || art.numero;
                        const caputText = art.texto
                          .split('\n')[0]
                          .replace(/^Art\.?\s*\d+[º°]?(-[A-Z])?\s*[.\-]?\s*/i, '')
                          .replace(/\s*\((?:Redação|Incluído|Revogado|Acrescido|Alterado|Vide|Regulamento)[^)]*\)/gi, '')
                          .trim();
                        
                        return (
                          <div
                            key={art.id}
                            className="w-full min-h-[68px] text-left px-3 py-2 rounded-xl bg-card/70 border border-border/60 flex items-stretch gap-3"
                          >
                            <div className="shrink-0 flex flex-col items-center">
                              <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-300/25 to-amber-600/10 border border-amber-400/30 flex flex-col items-center justify-center leading-none">
                                <span className="text-[14px] font-bold text-amber-200 leading-none">{badgeLabel}</span>
                                <span className="mt-0.5 text-[7px] uppercase tracking-[0.16em] font-bold text-amber-300/80 leading-none">Art</span>
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                              <p className="text-[12px] leading-snug line-clamp-2 text-muted-foreground">
                                <span className="font-bold text-foreground">Art. {badgeLabel}</span>
                                <span className="mx-1 text-muted-foreground/60">—</span>
                                {caputText || '(sem texto)'}
                              </p>
                              {previewMode === 'recentes' && (art as any).parsedDate && (
                                <span className="inline-flex items-center self-start gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[10px] font-semibold text-amber-300">
                                  <Clock className="w-3 h-3" />
                                  {MESES[(art as any).parsedDate.month]}/{(art as any).parsedDate.year}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                      })()}
                    </div>
                  </div>
                )}
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
