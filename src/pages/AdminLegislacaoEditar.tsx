import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
      .order('nome');
      
    if (error) {
      toast.error('Erro ao carregar leis');
    } else {
      setLeis((data as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const categoriasMap = useMemo(() => {
    const map: Record<string, LeiRow[]> = {};
    const q = busca.trim().toLowerCase();
    
    for (const l of leis) {
      if (q && !`${l.nome} ${l.nome_curto ?? ''} ${l.categoria}`.toLowerCase().includes(q)) {
        continue;
      }
      const cat = l.categoria || 'Sem categoria';
      if (!map[cat]) map[cat] = [];
      map[cat].push(l);
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
              const isExpanded = categoriaAtiva === cat;
              const itens = categoriasMap[cat];
              
              return (
                <Card key={cat} className="overflow-hidden">
                  <button
                    onClick={() => setCategoriaAtiva(isExpanded ? null : cat)}
                    className="w-full px-4 py-3 bg-secondary/20 hover:bg-secondary/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{cat}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{itens.length}</Badge>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {isExpanded && (
                    <div className="divide-y divide-border/60 border-t border-border/60">
                      {itens.map(lei => (
                        <button
                          key={lei.id}
                          onClick={() => setSelecionada(lei)}
                          className="w-full text-left px-4 py-3 hover:bg-secondary/40 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-4">
                            <p className="text-sm font-medium leading-tight truncate">{lei.nome}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{lei.nome_curto || lei.slug}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
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

  const [pushTitulo, setPushTitulo] = useState(`Atualização: ${lei.nome_curto || lei.nome}`);
  const [pushMsg, setPushMsg] = useState('');

  const carregarBasico = async () => {
    setLoadingArts(true);
    const [{ data: arts }, { data: imps }] = await Promise.all([
      supabase
        .from('vade_mecum_artigos')
        .select('id, numero, texto, ordem')
        .eq('lei_id', lei.id)
        .order('ordem'),
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
      toast.error('Erro ao buscar histórico: ' + err.message);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const fazerRaspagem = async () => {
    if (!window.confirm('Isto vai acionar a Edge Function para reextrair a lei inteira do Planalto. Continuar?')) return;
    setReextraindo(true);
    const tid = toast.loading('Raspando lei do Planalto...');
    try {
      const { error } = await supabase.functions.invoke('reextrair-lei-planalto', {
        body: { slug: lei.slug }
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
    if (!window.confirm('Enviar notificação push para todos os usuários?')) return;
    
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
              <TabsTrigger value="push" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">Notificação Push</TabsTrigger>
              <TabsTrigger value="historico" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 text-amber-500 data-[state=active]:text-amber-500">Histórico de Atualização</TabsTrigger>
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
              </TabsContent>

              <TabsContent value="push" className="mt-0 space-y-4">
                <h3 className="font-semibold text-sm">Avisar Usuários (Push Notification)</h3>
                <p className="text-xs text-muted-foreground">Envie um alerta para a base de usuários informando novidades desta lei.</p>
                
                <div className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Título do Push</label>
                    <Input value={pushTitulo} onChange={e => setPushTitulo(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Mensagem</label>
                    <Textarea 
                      value={pushMsg} 
                      onChange={e => setPushMsg(e.target.value)} 
                      placeholder="Ex: O Código Penal sofreu atualizações importantes hoje. Confira os novos artigos..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={enviarPush} className="w-full gap-2">
                    <Bell className="w-4 h-4" /> Disparar Push
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-0 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-amber-500 flex items-center gap-2">
                      <History className="w-4 h-4" /> Rastreador do Planalto
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Busca diretamente no código fonte do Planalto textos riscados indicando alteração, mostrando como era e como ficou.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={carregarHistorico} disabled={loadingHistorico}>
                    <RefreshCw className={`w-4 h-4 ${loadingHistorico ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {loadingHistorico ? (
                  <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <p className="text-sm text-muted-foreground animate-pulse text-center">
                      Acessando {lei.planalto_url}...<br/>Mapeando histórico de alterações do texto...
                    </p>
                  </div>
                ) : historico.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    <p className="text-sm">Nenhuma alteração com texto riscado encontrada nesta lei.</p>
                  </Card>
                ) : (
                  <div className="space-y-6 mt-4">
                    {historico.map((hist, i) => (
                      <Card key={i} className="overflow-hidden border-border/50">
                        <div className="bg-secondary/30 px-3 py-2 border-b flex items-center justify-between">
                          <Badge variant="outline" className="font-bold border-primary text-primary">{hist.artigo_numero}</Badge>
                          {hist.data_aproximada > 0 && <span className="text-xs font-semibold">{hist.data_aproximada}</span>}
                        </div>
                        <div className="p-3 text-xs text-muted-foreground italic bg-secondary/10 border-b">
                          {hist.nota}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                          <div className="space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-destructive">Redação Anterior</div>
                            <div className="text-sm text-muted-foreground line-through decoration-destructive/50">{hist.texto_antigo}</div>
                          </div>
                          <div className="hidden md:flex items-center justify-center -mx-6 z-10">
                            <div className="bg-background border rounded-full p-1"><ArrowRight className="w-4 h-4 text-muted-foreground" /></div>
                          </div>
                          <div className="space-y-2 mt-4 md:mt-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Nova Redação</div>
                            <div className="text-sm font-medium">{hist.texto_novo}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
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
