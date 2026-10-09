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
  History, ArrowRight, BookOpen, Scale, Landmark, ScrollText, Globe, X, Wand2
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
  const [viewMode, setViewMode] = useState<'categorias' | 'areas'>('categorias');
  
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
    constituicao: 'Constituição',
    'tratados-convencoes': 'Tratados e Convenções'
  };

  const getCatInfo = (catName: string) => {
    switch (catName) {
      case 'Códigos': return { icon: BookOpen, color: '#f43f5e', desc: 'Leis fundamentais e estruturais' };
      case 'Estatutos': return { icon: ScrollText, color: '#8b5cf6', desc: 'Direitos e deveres específicos' };
      case 'Legislação Especial': return { icon: Scale, color: '#10b981', desc: 'Leis esparsas e normativas' };
      case 'Estadual (SP)': return { icon: Landmark, color: '#3b82f6', desc: 'Leis do Estado de São Paulo' };
      case 'Constituição': return { icon: FileText, color: '#f59e0b', desc: 'Lei maior e normas fundamentais' };
      case 'Tratados e Convenções': return { icon: Globe, color: '#0ea5e9', desc: 'Pactos, tratados e convenções internacionais' };
      default: return { icon: BookOpen, color: '#64748b', desc: 'Outras legislações' };
    }
  };

  const getCatName = (cat: string) => CATEGORIA_LABELS[cat] || cat;

  const getAreaName = (lei: LeiRow): string => {
    const text = `${lei.nome} ${lei.nome_curto || ''} ${lei.slug}`.toLowerCase();
    
    // Penal
    if (text.includes('penal') || text.includes('crime') || text.includes('tráfico') || text.includes('drogas') || text.includes('abuso') || text.includes('hediondo') || text.includes('execução penal') || text.includes('prisão') || text.includes('penha') || text.includes('tortura') || text.includes('anticrime') || text.includes('racismo') || text.includes('interceptação') || text.includes('informáticos') || text.includes('henry borel')) {
      return 'Direito Penal e Processual Penal';
    }
    // Trabalho
    if (text.includes('trabalh') || text.includes('clt') || text.includes('sindicato') || text.includes('fgts') || text.includes('greve') || text.includes('doméstico')) {
      return 'Direito do Trabalho';
    }
    // Tributário
    if (text.includes('tribut') || text.includes('imposto') || text.includes('taxa') || text.includes('aduaneir') || text.includes('receita') || text.includes('kandir') || text.includes('iss') || text.includes('simples')) {
      return 'Direito Tributário';
    }
    // Ambiental
    if (text.includes('ambiental') || text.includes('florest') || text.includes('água') || text.includes('fauna') || text.includes('resíduos') || text.includes('mata atlântica') || text.includes('meio ambiente') || text.includes('snuc') || text.includes('hídricos') || text.includes('caça') || text.includes('pesca')) {
      return 'Direito Ambiental';
    }
    // Empresarial
    if (text.includes('empresar') || text.includes('s.a') || text.includes('sociedade') || text.includes('falência') || text.includes('recuperação') || text.includes('cheque') || text.includes('título') || text.includes('comercial') || text.includes('propriedade industrial') || text.includes('microempresa') || text.includes('cade') || text.includes('mpe')) {
      return 'Direito Empresarial';
    }
    // Internacional / Humanos
    if (text.includes('san josé') || text.includes('migração') || text.includes('refugiado') || text.includes('racial') || text.includes('índio') || text.includes('direitos humanos')) {
      return 'Direito Internacional e Direitos Humanos';
    }
    // Digital
    if (text.includes('digital') || text.includes('internet') || text.includes('marco civil') || text.includes('lgpd') || text.includes('e-commerce') || text.includes('startups')) {
      return 'Direito Digital';
    }
    // Previdenciário
    if (text.includes('previdenc') || text.includes('inss') || text.includes('loas') || text.includes('assistência social')) {
      return 'Direito Previdenciário';
    }
    // Constitucional / Eleitoral
    if (text.includes('constituiç') || text.includes('eleitoral') || text.includes('partido') || text.includes('eleiç') || text.includes('inelegib') || text.includes('ação popular') || text.includes('injunção') || text.includes('adi') || text.includes('adc')) {
      return 'Direito Constitucional e Eleitoral';
    }
    // Administrativo
    if (text.includes('administ') || text.includes('licitaç') || text.includes('servidor') || text.includes('improbidade') || text.includes('desapropriaç') || text.includes('pregão') || text.includes('estatais') || text.includes('anticorrupção') || text.includes('acesso à informação') || text.includes('lai') || text.includes('trânsito') || text.includes('ctb') || text.includes('telecomunicações') || text.includes('minas') || text.includes('aeronáutica') || text.includes('oab') || text.includes('mpu') || text.includes('magistratura') || text.includes('tcu') || text.includes('ppp') || text.includes('oscip') || text.includes('segurança privada') || text.includes('cidade') || text.includes('metrópole') || text.includes('solo urbano')) {
      return 'Direito Administrativo';
    }
    // Civil / Processo Civil (Fallthrough for the rest of major statutes)
    if (text.includes('civil') || text.includes('consumidor') || text.includes('cdc') || text.includes('locaç') || text.includes('inquilinato') || text.includes('família') || text.includes('registros') || text.includes('criança') || text.includes('eca') || text.includes('idoso') || text.includes('deficiência') || text.includes('lindb') || text.includes('alimentos') || text.includes('juizados') || text.includes('lje') || text.includes('mediação') || text.includes('ação civil pública') || text.includes('acp') || text.includes('terra') || text.includes('torcedor') || text.includes('desporto') || text.includes('câncer') || text.includes('direitos autorais') || text.includes('alienação parental') || text.includes('superendividamento') || text.includes('processos originários') || text.includes('escuta protegida') || text.includes('sinase')) {
      return 'Direito Civil e Processual Civil';
    }
    
    return 'Outras Áreas';
  };

  const getAreaInfo = (area: string) => {
    switch (area) {
      case 'Direito Penal e Processual Penal': return { icon: Scale, color: '#f43f5e', desc: 'Crimes, penas e processo' };
      case 'Direito Civil e Processual Civil': return { icon: BookOpen, color: '#3b82f6', desc: 'Relações privadas, consumidor e processo' };
      case 'Direito Administrativo': return { icon: Landmark, color: '#10b981', desc: 'Estado, servidores e licitações' };
      case 'Direito Constitucional e Eleitoral': return { icon: FileText, color: '#f59e0b', desc: 'CF, direitos fundamentais e eleições' };
      case 'Direito do Trabalho': return { icon: ScrollText, color: '#8b5cf6', desc: 'Relações de trabalho e CLT' };
      case 'Direito Tributário': return { icon: Landmark, color: '#ec4899', desc: 'Impostos, taxas e contribuições' };
      case 'Direito Ambiental': return { icon: BookOpen, color: '#84cc16', desc: 'Meio ambiente e recursos' };
      case 'Direito Empresarial': return { icon: Scale, color: '#6366f1', desc: 'Empresas, sociedades e falências' };
      case 'Direito Digital': return { icon: Radar, color: '#06b6d4', desc: 'Internet, LGPD e tecnologia' };
      case 'Direito Internacional e Direitos Humanos': return { icon: History, color: '#d946ef', desc: 'Tratados e garantias' };
      case 'Direito Previdenciário': return { icon: Clock, color: '#f97316', desc: 'INSS, benefícios e seguridade' };
      default: return { icon: FileText, color: '#64748b', desc: 'Legislações diversas' };
    }
  };

  const agrupamentoMap = useMemo(() => {
    const map: Record<string, LeiRow[]> = {};
    const q = busca.trim().toLowerCase();
    
    for (const l of leis) {
      if (q && !`${l.nome} ${l.nome_curto ?? ''} ${l.categoria}`.toLowerCase().includes(q)) {
        continue;
      }
      const key = viewMode === 'categorias' ? getCatName(l.categoria || 'sem_categoria') : getAreaName(l);
      
      if (!map[key]) map[key] = [];
      map[key].push(l);
    }
    
    // Forçar a exibição de categorias vazias que o admin quer ver
    if (viewMode === 'categorias' && !map['Tratados e Convenções'] && !q) {
      map['Tratados e Convenções'] = [];
    }
    
    return map;
  }, [leis, busca, viewMode]);

  const agrupamentoKeys = Object.keys(agrupamentoMap).sort();

  return (
    <div className="min-h-dvh bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
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

        <div className="flex bg-secondary/30 p-1 rounded-xl w-full border border-border/50">
          <button
            onClick={() => setViewMode('categorias')}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${viewMode === 'categorias' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            Categorias
          </button>
          <button
            onClick={() => setViewMode('areas')}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${viewMode === 'areas' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
          >
            Áreas
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando base...
          </div>
        ) : (
          <div className="space-y-4">
            {agrupamentoKeys.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Nenhum resultado encontrado.</p>
            )}
            
            {agrupamentoKeys.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
                {agrupamentoKeys.map(key => {
                  const itens = agrupamentoMap[key];
                  const { icon: Icon, color, desc } = viewMode === 'categorias' ? getCatInfo(key) : getAreaInfo(key);
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setCategoriaAtiva(key)}
                      className="w-full flex items-center gap-4 px-4 py-5 min-h-[84px] text-left hover:bg-secondary/60 active:bg-secondary transition-colors"
                    >
                      <div className="w-12 h-12 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-base font-semibold text-foreground truncate">{key}</span>
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{itens.length}</Badge>
                        </div>
                        <div className="font-body text-[12px] text-muted-foreground truncate mt-0.5">
                          {desc}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={!!categoriaAtiva} onOpenChange={(val) => !val && setCategoriaAtiva(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0 pb-0 pt-4 flex flex-col gap-0 border-border bg-background">
          <SheetHeader className="px-5 pb-3 border-b border-border text-left">
            <SheetTitle className="font-display font-bold text-xl">{categoriaAtiva}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-2 py-2 divide-y divide-border/60">
            {categoriaAtiva && agrupamentoMap[categoriaAtiva]?.map(lei => (
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
        <DetalheLeiOverlay
          lei={selecionada}
          onClose={() => setSelecionada(null)}
          onReloadLista={carregar}
        />
      )}
    </div>
  );
}

function DetalheLeiOverlay({
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
  const [atualizacoesEncontradas, setAtualizacoesEncontradas] = useState<any[]>([]);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [viewModes, setViewModes] = useState<Record<string, 'novo' | 'antigo'>>({});

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

  const buscarAtualizacoesMistral = async () => {
    setReextraindo(true);
    
    // Also load historico to have the old text available for toggle
    if (historico.length === 0) {
      carregarHistorico();
    }
    
    // Save to local history log
    try {
      const logs = JSON.parse(localStorage.getItem('historico_buscas_lei') || '[]');
      logs.unshift({ lei_id: lei.id, data: new Date().toISOString() });
      localStorage.setItem('historico_buscas_lei', JSON.stringify(logs.slice(0, 50)));
    } catch (e) {}

    const tid = toast.loading('Buscando atualizações via Mistral...');
    try {
      const { data, error } = await supabase.functions.invoke('buscar-atualizacao-mistral', {
        body: { lei_id: lei.id, planalto_url: lei.planalto_url }
      });
      if (error) throw new Error(error.message);
      
      let achados = data?.artigos || [];
      
      // Enriquecer e ordenar por mais recente
      const extractDateFromText = (text: string) => {
        let bestDate = 0, bestMonth = 0, bestYear = 0;
        const regex = /(?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Acrescid[oa]|Alterad[oa]|Revogad[oa]).*?de\s+(?:(\d{1,2})\.(\d{1,2})\.(\d{4})|(\d{4}))/gi;
        let match, hasMonthFound = false;
        while ((match = regex.exec(text)) !== null) {
          let y = 0, m = 0, hm = false;
          if (match[4]) {
            y = parseInt(match[4], 10);
          } else if (match[3]) {
            y = parseInt(match[3], 10);
            m = parseInt(match[2], 10) - 1;
            hm = true;
          }
          if (y > 1900 && y <= new Date().getFullYear()) {
            const score = y * 100 + m;
            if (score > bestDate) {
              bestDate = score; bestYear = y; bestMonth = m; hasMonthFound = hm;
            }
          }
        }
        return bestYear > 0 ? { year: bestYear, month: bestMonth, hasMonth: hasMonthFound, score: bestDate } : null;
      };

      const detectTag = (text: string) => {
         const m = text.match(/\((Reda[çc][ãa]o\s+dada|Inclu[íi]d[oa]|Revogad[oa]|Acrescid[oa]|Alterad[oa])/i);
         if (m) {
           const type = m[1].toLowerCase();
           if (type.includes('revogad')) return { label: 'Revogado', color: 'bg-red-500/15 text-red-400 border-red-500/30' };
           if (type.includes('inclu')) return { label: 'Incluído', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
           return { label: 'Alterado', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
         }
         return null;
      };

      achados = achados.map((a: any) => ({
        ...a,
        parsedDate: extractDateFromText(a.texto),
        tag: detectTag(a.texto)
      })).sort((a: any, b: any) => {
         const sa = a.parsedDate ? a.parsedDate.score : 0;
         const sb = b.parsedDate ? b.parsedDate.score : 0;
         return sb - sa;
      });

      setAtualizacoesEncontradas(achados);
      
      if (achados.length > 0) {
        toast.success(`Busca concluída! ${achados.length} artigos atualizados encontrados.`, { id: tid });
      } else {
        toast.success('Busca concluída! Nenhuma atualização recente detectada.', { id: tid });
      }
      
      await carregarBasico();
    } catch (e: any) {
      toast.error('Erro na busca via Mistral: ' + e.message, { id: tid });
    } finally {
      setReextraindo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0 bg-secondary/20">
        <div className="flex flex-col min-w-0 pr-4">
          <h2 className="text-xl font-display font-bold truncate flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="truncate">{lei.nome_curto || lei.nome}</span>
          </h2>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{lei.categoria}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0"><X className="w-5 h-5"/></Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs value={tab} onValueChange={(v) => {
          setTab(v);
          if (v === 'historico') carregarHistorico();
        }} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-background h-auto flex-wrap p-0">
            <TabsTrigger value="legislacao" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">A Legislação</TabsTrigger>
            <TabsTrigger value="raspagem" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">Última Raspagem</TabsTrigger>
            <TabsTrigger value="buscar_atualizacao" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3">Buscar Atualização</TabsTrigger>
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

              <TabsContent value="buscar_atualizacao" className="mt-0 space-y-6">
                <div>
                  <h3 className="font-semibold text-sm mb-1">Buscar Atualizações (Mistral IA)</h3>
                  <p className="text-xs text-muted-foreground">
                    Utiliza a inteligência artificial do Mistral para baixar a lei, analisar o texto buscando alterações (como textos azuis "incluído pela lei...", "revogado por...") e atualizar apenas os artigos modificados. Mantém toda a formatação de incisos, alíneas e títulos.
                  </p>
                </div>
                
                <Card className="p-4 bg-secondary/10 border border-primary/20">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Wand2 className={`w-8 h-8 text-primary ${reextraindo ? 'animate-pulse' : ''}`} />
                    <div className="text-sm">
                      <p>O robô irá varrer o conteúdo via Browserless buscando por atualizações recentes.</p>
                    </div>
                    <Button onClick={buscarAtualizacoesMistral} disabled={reextraindo || !lei.planalto_url} className="w-full max-w-xs">
                      {reextraindo ? 'Analisando via Browserless...' : 'Buscar Atualização'}
                    </Button>
                    {!lei.planalto_url && (
                      <p className="text-xs text-destructive mt-2">URL do Planalto não configurada no banco.</p>
                    )}
                  </div>
                </Card>

                {(() => {
                  try {
                    const logs = JSON.parse(localStorage.getItem('historico_buscas_lei') || '[]').filter((l: any) => l.lei_id === lei.id);
                    if (logs.length > 0) {
                      return (
                        <div className="mt-4 px-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Histórico de Buscas Desta Lei</p>
                          <div className="space-y-1.5">
                            {logs.slice(0, 5).map((log: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/20 p-2 rounded border border-border/40">
                                <Clock className="w-3 h-3 text-primary/70" />
                                <span>Busca realizada em: <span className="font-medium text-foreground">{new Date(log.data).toLocaleString('pt-BR')}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {}
                  return null;
                })()}

                {atualizacoesEncontradas.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm text-foreground shrink-0">
                        Resultados da Busca · <span className="text-primary">{atualizacoesEncontradas.length} artigos modificados</span>
                      </h4>
                    </div>
                    <div className="space-y-1.5 mt-4">
                      {atualizacoesEncontradas.map((art: any, i: number) => {
                        const badgeLabel = art.numero.replace(/^Art\.?\s*/i, '').trim() || art.numero;
                        const isExpanded = !!expandidos[art.numero];
                        const antigo = artigos.find(a => a.numero === art.numero);
                        
                        return (
                          <div
                            key={i}
                            className="w-full text-left rounded-xl bg-card/70 border border-border/60 overflow-hidden"
                          >
                            <div 
                              className="px-3 py-2 flex items-stretch gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => setExpandidos(prev => ({ ...prev, [art.numero]: !prev[art.numero] }))}
                            >
                              <div className="shrink-0 flex flex-col items-center">
                                <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-300/25 to-amber-600/10 border border-amber-400/30 flex flex-col items-center justify-center leading-none">
                                  <span className="text-[14px] font-bold text-amber-200 leading-none">{badgeLabel}</span>
                                  <span className="mt-0.5 text-[7px] uppercase tracking-[0.16em] font-bold text-amber-300/80 leading-none">Art</span>
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    {art.tag && (
                                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${art.tag.color}`}>
                                        {art.tag.label}
                                      </span>
                                    )}
                                    {art.parsedDate && (
                                      <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {art.parsedDate.hasMonth ? `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][art.parsedDate.month]}/` : ''}{art.parsedDate.year}
                                      </span>
                                    )}
                                  </div>
                                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                                {art.titulo_hierarquico && (
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    {art.titulo_hierarquico.split('\n')[0]}
                                  </p>
                                )}
                                <p className={`text-[12px] leading-snug text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                  <span className="font-bold text-foreground">Art. {badgeLabel}</span>
                                  <span className="mx-1 text-muted-foreground/60">—</span>
                                  {(!isExpanded && (art.texto.split('\n')[0].replace(/^Art\.?\s*\d+[º°]?(-[A-Z])?\s*[.\-]?\s*/i, '').replace(/\s*\((?:Redação|Incluído|Revogado|Acrescido|Alterado|Vide|Regulamento)[^)]*\)/gi, '').trim())) || (isExpanded ? '' : '(sem texto)')}
                                </p>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="p-3 border-t border-border/50 bg-background/50 flex flex-col gap-3">
                                {(() => {
                                  const hist = historico.find((h: any) => h.artigo_numero === art.numero);
                                  const oldText = (antigo && antigo.texto !== art.texto) ? antigo.texto : (hist ? hist.texto_antigo : null);
                                  const currentMode = viewModes[art.numero] || 'novo';

                                  return (
                                    <>
                                      {oldText && (
                                        <div className="flex bg-muted/50 rounded-lg p-1 w-max border border-border/50">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setViewModes(prev => ({...prev, [art.numero]: 'antigo'})); }}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors ${currentMode === 'antigo' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                          >
                                            Texto Antigo
                                          </button>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setViewModes(prev => ({...prev, [art.numero]: 'novo'})); }}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors ${currentMode === 'novo' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                          >
                                            Nova Redação
                                          </button>
                                        </div>
                                      )}

                                      {currentMode === 'novo' ? (
                                        <div>
                                          {!oldText && <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">Histórico de Alterações:</p>}
                                          <div className="flex flex-col gap-4 pl-1">
                                            {(() => {
                                              const linhas = art.texto.split('\n');
                                              let mapAnos: Record<string, { contexto: string, nota: string }[]> = {};
                                              
                                              let contextQueue: string[] = [];
                                              
                                              for (let j = 0; j < linhas.length; j++) {
                                                const linha = linhas[j].trim();
                                                if (!linha) continue;
                                                
                                                const isModificada = /\((?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Revogad[oa]|Acrescid[oa]|Alterad[oa])/i.test(linha);
                                                
                                                if (isModificada) {
                                                  const m = /(?:de\s+(?:\d{1,2}\.\d{1,2}\.(\d{4})|(\d{4})))/i.exec(linha);
                                                  const year = m ? (m[1] || m[2]) : "Outros";
                                                  
                                                  if (!mapAnos[year]) mapAnos[year] = [];
                                                  
                                                  // O contexto geralmente é a linha imediatamente anterior (ex: "VII - ...")
                                                  let ctx = contextQueue.length > 0 ? contextQueue[contextQueue.length - 1] : "Caput";
                                                  
                                                  // Evita pegar um bloco vazio ou sujeira
                                                  if (ctx.length < 3 && contextQueue.length > 1) {
                                                    ctx = contextQueue[contextQueue.length - 2] + ' ' + ctx;
                                                  }
                                                  
                                                  mapAnos[year].push({ contexto: ctx, nota: linha });
                                                  contextQueue = []; // Limpa fila após achar nota
                                                } else {
                                                  contextQueue.push(linha);
                                                }
                                              }
                                              
                                              const anosOrd = Object.keys(mapAnos).sort((a,b) => b.localeCompare(a));
                                              
                                              if (anosOrd.length === 0) {
                                                // Fallback se não detectar histórico estruturado
                                                return (
                                                  <div className="text-[11px] text-foreground leading-relaxed border-l-2 border-primary/40 pl-2">
                                                    {linhas.map((linha: string, idx: number) => {
                                                      const isMod = /\((?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Revogad[oa]|Acrescid[oa]|Alterad[oa])/i.test(linha);
                                                      return (
                                                        <div key={idx} className={isMod ? 'bg-primary/10 text-primary font-semibold px-1 rounded my-0.5' : ''}>
                                                          {linha}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                );
                                              }

                                              return anosOrd.map(ano => (
                                                <div key={ano} className="relative border-l-2 border-border pl-4 pb-2">
                                                  <div className="absolute -left-[5px] top-0.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                                                  <p className="text-[12px] font-extrabold text-primary mb-2 leading-none">{ano}</p>
                                                  <div className="flex flex-col gap-2">
                                                    {mapAnos[ano].map((item, idx) => {
                                                      let blockId = "";
                                                      let blockText = item.contexto;
                                                      const matchId = /^(Art\.\s*\d+[a-zº°]*|[IVXLCDM]+\s*-|§\s*\d+[º°]*|Parágrafo único)\s*(.*)/i.exec(item.contexto);
                                                      if (matchId) {
                                                        blockId = matchId[1];
                                                        blockText = matchId[2] || "";
                                                      }

                                                      return (
                                                        <div key={idx} className="bg-secondary/30 rounded-lg border border-border/60 p-2.5 shadow-sm">
                                                          <p className="text-[11px] text-foreground leading-snug mb-1.5">
                                                            {blockId && <span className="font-bold mr-1.5 text-primary/80">{blockId}</span>}
                                                            <span className="opacity-95">{blockText}</span>
                                                          </p>
                                                          <p className="text-[10px] text-muted-foreground font-medium italic border-l-2 border-muted-foreground/30 pl-2">
                                                            {item.nota}
                                                          </p>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed opacity-70 border-l-2 border-border pl-2 line-through decoration-destructive/50">
                                            {oldText}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
                    {!lei.planalto_url ? (
                      <p className="text-xs text-destructive mt-2">URL do Planalto não configurada no banco.</p>
                    ) : (
                      <div className="mt-4 flex flex-col items-center">
                        <span className="text-xs text-muted-foreground mb-1">Fonte da raspagem:</span>
                        <a 
                          href={lei.planalto_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                        >
                          {lei.planalto_url}
                        </a>
                      </div>
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
                          
                          // match formats like "de 12.1.2024" or "de 2024" inside annotations.
                          const regex = /(?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Acrescid[oa]|Alterad[oa]|Revogad[oa]).*?de\s+(?:(\d{1,2})\.(\d{1,2})\.(\d{4})|(\d{4}))/gi;
                          let match;
                          let hasMonthFound = false;
                          while ((match = regex.exec(text)) !== null) {
                            let y = 0, m = 0;
                            let hm = false;
                            if (match[4]) {
                              y = parseInt(match[4], 10);
                            } else if (match[3]) {
                              y = parseInt(match[3], 10);
                              m = parseInt(match[2], 10) - 1; // 0-indexed month
                              hm = true;
                            }
                            if (y > 1900 && y <= new Date().getFullYear()) {
                              const score = y * 100 + m;
                              if (score > bestDate) {
                                bestDate = score;
                                bestYear = y;
                                bestMonth = m;
                                hasMonthFound = hm;
                              }
                            }
                          }
                          return bestYear > 0 ? { year: bestYear, month: bestMonth, hasMonth: hasMonthFound, score: bestDate } : null;
                        };

                        const listaPreview = previewMode === 'recentes'
                          ? (() => {
                              const filtrados = [...artigos]
                                .filter(a => !/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/i.test(a.numero))
                                .map(a => ({ ...a, parsedDate: extractDateFromText(a.texto) }))
                                .filter(a => a.parsedDate !== null)
                                .sort((a, b) => b.parsedDate!.score - a.parsedDate!.score);
                              
                              return filtrados.length > 0 
                                ? filtrados.slice(0, 80) 
                                : [...artigos].filter(a => !/^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/i.test(a.numero)).reverse().slice(0, 80);
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
                                  {(art as any).parsedDate.hasMonth ? `${MESES[(art as any).parsedDate.month]}/` : ''}{(art as any).parsedDate.year}
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
    </div>
  );
}
