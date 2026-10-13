import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Play, 
  Square, 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Scale, 
  BookOpen, 
  ArrowLeft, 
  Sliders, 
  Eye, 
  Trash2, 
  Clock, 
  Search, 
  FileText, 
  ChevronRight, 
  Filter, 
  X, 
  Info, 
  ShieldAlert,
  Zap,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import { generateOmniText, DEFAULT_OMNIROUTE_MODEL } from '@/lib/omniRouteClient';
import { supabase } from '@/integrations/supabase/client';

// Tipagem de Lei
interface LeiItem {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string | null;
  categoria: string;
  total_artigos: number;
  aulas_geradas?: number;
  porcentagem?: number;
}

// Tipagem de Artigo
interface ArtigoItem {
  id: string;
  lei_id: string;
  numero: string;
  texto: string;
  ordem: number;
  isRealArticle: boolean;
  tem_aula: boolean;
  aula_dados?: any | null;
}

// Log em tempo real
interface LogItem {
  id: string;
  hora: string;
  tipo: 'info' | 'sucesso' | 'erro' | 'aviso';
  mensagem: string;
}

// Categorias padronizadas
const CATEGORIAS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  todos: { label: 'Todas as Leis', icon: BookOpen, color: 'text-foreground', bg: 'bg-secondary/60', border: 'border-border' },
  codigo: { label: 'Códigos', icon: Scale, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  estatuto: { label: 'Estatutos', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  lei: { label: 'Leis Federais & Gerais', icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  oab: { label: 'OAB & Prática', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  estadual_sp: { label: 'Estadual SP', icon: FileText, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' }
};

const AdminAprenderLeisCriar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  // Estados Globais de Dados
  const [carregandoLeis, setCarregandoLeis] = useState(true);
  const [leis, setLeis] = useState<LeiItem[]>([]);
  const [aulasMapa, setAulasMapa] = useState<Record<string, number>>({});
  
  // Filtros da Visão de Leis
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [buscaLei, setBuscaLei] = useState('');

  // Navegação: Lei Selecionada
  const [leiSelecionada, setLeiSelecionada] = useState<LeiItem | null>(null);
  const [carregandoArtigos, setCarregandoArtigos] = useState(false);
  const [artigos, setArtigos] = useState<ArtigoItem[]>([]);
  const [filtroArtigoStatus, setFiltroArtigoStatus] = useState<'todos' | 'pendentes' | 'concluidos'>('todos');
  const [buscaArtigo, setBuscaArtigo] = useState('');

  // Estados de Execução do Robô OmniRoute
  const [executando, setExecutando] = useState(false);
  const [modoExecucao, setModoExecucao] = useState<'5' | '10' | 'tudo' | 'individual' | null>(null);
  const [artigoAtualProcessando, setArtigoAtualProcessando] = useState<string>('');
  const [progressoLote, setProgressoLote] = useState({ total: 0, concluidos: 0, erros: 0 });
  const [tempoInicioLote, setTempoInicioLote] = useState<number | null>(null);
  const [tempoEstimadoSegundos, setTempoEstimadoSegundos] = useState<number | null>(null);
  const [terminalAberto, setTerminalAberto] = useState(true);

  // Logs do Terminal
  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: '1',
      hora: new Date().toLocaleTimeString(),
      tipo: 'info',
      mensagem: 'Estúdio de Criação Aprender Leis inicializado com OmniRoute 3.8.',
    },
  ]);

  // Modal de Prévia / Inspeção de Aula
  const [aulaInspecionando, setAulaInspecionando] = useState<{ artigo: ArtigoItem; aula: any } | null>(null);

  // AbortController para cancelamento seguro
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = (tipo: LogItem['tipo'], mensagem: string) => {
    setLogs(prev => [
      ...prev.slice(-99),
      {
        id: Math.random().toString(36).substring(7),
        hora: new Date().toLocaleTimeString(),
        tipo,
        mensagem,
      },
    ]);
  };

  // 1. Carrega todas as leis do banco e cruza com as aulas já feitas
  const carregarLeis = async () => {
    try {
      setCarregandoLeis(true);

      // Busca todas as leis cadastradas
      const { data: leisData, error: errLeis } = await supabase
        .from('vade_mecum_leis')
        .select('id, slug, nome, nome_curto, categoria, total_artigos')
        .order('nome');

      if (errLeis) throw errLeis;

      // Busca contagem de aulas na tabela aprender_leis_aulas
      const { data: aulasData, error: errAulas } = await supabase
        .from('aprender_leis_aulas')
        .select('lei_id');

      const mapaAulas: Record<string, number> = {};
      if (!errAulas && aulasData) {
        aulasData.forEach(item => {
          if (item.lei_id) {
            mapaAulas[item.lei_id] = (mapaAulas[item.lei_id] || 0) + 1;
          }
        });
      }
      setAulasMapa(mapaAulas);

      // Formata leis com porcentagem de aulas concluídas
      const leisFormatadas: LeiItem[] = (leisData || []).map(l => {
        const total = l.total_artigos || 0;
        const feitas = mapaAulas[l.id] || 0;
        const pct = total > 0 ? Math.min(100, Math.round((feitas / total) * 100)) : 0;
        return {
          ...l,
          aulas_geradas: feitas,
          porcentagem: pct,
        };
      });

      setLeis(leisFormatadas);
    } catch (err: any) {
      console.error('Erro ao carregar leis:', err);
      toast.error('Erro ao buscar catálogo de leis do sistema.');
      addLog('erro', `Falha ao carregar leis: ${err.message || err}`);
    } finally {
      setCarregandoLeis(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      carregarLeis();
    }
  }, [isAdmin]);

  // 2. Carrega artigos da lei selecionada
  const selecionarLei = async (lei: LeiItem) => {
    setLeiSelecionada(lei);
    setCarregandoArtigos(true);
    setArtigos([]);
    addLog('info', `Abrindo artigos de: ${lei.nome} (${lei.nome_curto || lei.slug})...`);

    try {
      // Busca artigos da lei (com paginação se for grande)
      let allArtigos: any[] = [];
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('vade_mecum_artigos')
          .select('id, lei_id, numero, texto, ordem')
          .eq('lei_id', lei.id)
          .order('ordem', { ascending: true })
          .range(from, from + step - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allArtigos = [...allArtigos, ...data];
        if (data.length < step) break;
        from += step;
      }

      // Busca aulas existentes desta lei
      const { data: aulasData, error: errAulas } = await supabase
        .from('aprender_leis_aulas')
        .select('id, lei_id, artigo_numero, titulo_aula, objetivo, slides, modelo_ia, total_slides, updated_at')
        .eq('lei_id', lei.id);

      const aulasPorNumero: Record<string, any> = {};
      if (!errAulas && aulasData) {
        aulasData.forEach(aula => {
          if (aula.artigo_numero) {
            aulasPorNumero[aula.artigo_numero.trim().toLowerCase()] = aula;
          }
        });
      }

      // Processa artigos identificando se são artigos válidos ou cabeçalhos
      const artigosProcessados: ArtigoItem[] = allArtigos.map(a => {
        const numTrim = (a.numero || '').trim();
        const numLower = numTrim.toLowerCase();
        const isReal = numLower.startsWith('art') || /^\d/.test(numLower);
        const aulaExistente = aulasPorNumero[numLower] || null;

        return {
          id: a.id,
          lei_id: a.lei_id,
          numero: numTrim,
          texto: a.texto || '',
          ordem: a.ordem || 0,
          isRealArticle: isReal,
          tem_aula: !!aulaExistente,
          aula_dados: aulaExistente,
        };
      });

      setArtigos(artigosProcessados);

      // Atualiza a contagem precisa da lei selecionada
      const totalReais = artigosProcessados.filter(a => a.isRealArticle).length;
      const totalComAula = artigosProcessados.filter(a => a.tem_aula && a.isRealArticle).length;
      const pct = totalReais > 0 ? Math.min(100, Math.round((totalComAula / totalReais) * 100)) : 0;

      setLeiSelecionada(prev => prev ? {
        ...prev,
        total_artigos: totalReais || prev.total_artigos,
        aulas_geradas: totalComAula,
        porcentagem: pct
      } : null);

      addLog('sucesso', `${artigosProcessados.length} dispositivos carregados. ${totalComAula} de ${totalReais} artigos com aula (${pct}%).`);
    } catch (err: any) {
      console.error('Erro ao carregar artigos:', err);
      toast.error('Erro ao buscar artigos desta legislação.');
      addLog('erro', `Falha ao carregar artigos: ${err.message || err}`);
    } finally {
      setCarregandoArtigos(false);
    }
  };

  // Voltar para a lista de leis
  const handleVoltarParaLeis = () => {
    if (executando) {
      if (!confirm('O robô de geração está ativo. Deseja realmente interromper e voltar?')) {
        return;
      }
      handleParar();
    }
    setLeiSelecionada(null);
    setArtigos([]);
    carregarLeis(); // Atualiza porcentagens na visão geral
  };

  // 3. Função Principal: Gera uma aula para um artigo via OmniRoute 3.8
  const gerarAulaArtigo = async (artigo: ArtigoItem, leiNome: string): Promise<any> => {
    const prompt = `Você é um professor e especialista em Legal Design, Microlearning e Plain Language (Linguagem Clara).
Sua missão é criar uma aula interativa em slides para ensinar pessoas comuns/leigas sobre o seguinte artigo de lei:

Legislação: ${leiNome}
Artigo: Art. ${artigo.numero}
Texto Oficial da Lei:
"""
${artigo.texto.slice(0, 3000)}
"""

DIRETRIZES PEDAGÓGICAS RIGOROSAS:
1. Use Linguagem Simples (Plain Language), tom encorajador e sem juridiquês inútil. Se citar um termo técnico indispensável, explique-o imediatamente com metáforas do dia a dia.
2. Crie de 4 a 5 slides interativos estruturados:
   - Slide 1: O que diz a lei na prática (Tradução amigável e direta).
   - Slide 2: Exemplo real do cotidiano (Caso prático com nomes de pessoas e dilema comum).
   - Slide 3: Situação prática ou dúvida comum (O que pode e o que não pode).
   - Slide 4: O que você precisa lembrar (Resumo em pontos-chave essenciais).
   - Slide 5: Desafio rápido "Você é o Juiz" (Pequeno teste de aplicação prática com resposta comentada).
3. Para cada slide, crie um "image_prompt": uma descrição artística e cinematográfica em inglês (16:9 widescreen, clean legal design, conceptual metaphor, dark slate background, warm neon accents, strictly zero text) para ilustração da lei.
4. Responda ESTRITAMENTE em formato JSON puro, sem blocos de texto ou markdown ao redor.

Formato JSON estrito:
{
  "artigo": "Art. ${artigo.numero}",
  "titulo_aula": "Título Didático e Curto da Aula",
  "objetivo": "O que você vai dominar em 3 minutos",
  "duracao_min": 3,
  "slides": [
    {
      "ordem": 1,
      "badge": "Passo 1 de 5 · O Conceito Oficial",
      "titulo": "Título do Slide",
      "subtitulo": "Subtítulo direto",
      "texto_didatico": "Explicação em português claro e cristalino.",
      "exemplo_cotidiano": "Exemplo prático do dia a dia.",
      "image_prompt": "A cinematic conceptual 3D illustration of...",
      "tipo_interacao": "leitura"
    }
  ]
}`;

    const res = await generateOmniText({
      prompt,
      systemPrompt: 'Você é um assistente de Legal Design e Educação Jurídica para leigos. Retorne SOMENTE JSON puro e válido.',
      modelOverride: DEFAULT_OMNIROUTE_MODEL,
      temperature: 0.35,
    });

    let jsonTexto = res.replace(/```json/gi, '').replace(/```/g, '').trim();
    const inicio = jsonTexto.indexOf('{');
    const fim = jsonTexto.lastIndexOf('}');
    if (inicio !== -1 && fim !== -1) {
      jsonTexto = jsonTexto.substring(inicio, fim + 1);
    }

    const parsed = JSON.parse(jsonTexto);
    if (!parsed.slides || !Array.isArray(parsed.slides)) {
      throw new Error('Formato de resposta inválido retornado pela IA.');
    }

    // Salva na tabela aprender_leis_aulas
    const { error: errUpsert } = await supabase
      .from('aprender_leis_aulas')
      .upsert({
        lei_id: artigo.lei_id,
        artigo_id: artigo.id,
        artigo_numero: artigo.numero,
        titulo_aula: parsed.titulo_aula || `Aula Art. ${artigo.numero}`,
        objetivo: parsed.objetivo || '',
        slides: parsed.slides,
        modelo_ia: 'OmniRoute 3.8',
        total_slides: parsed.slides.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'lei_id,artigo_numero' });

    if (errUpsert) throw errUpsert;

    // Salva prompts de imagem na tabela aprender_leis_imagens
    try {
      const slidesComPrompt = parsed.slides.filter((s: any) => s.image_prompt);
      for (const s of slidesComPrompt) {
        await (supabase.from('aprender_leis_imagens' as any) as any).insert({
          lei_id: artigo.lei_id,
          artigo_numero: `Art. ${artigo.numero}`,
          dispositivo: 'Caput',
          slide_ordem: s.ordem || 1,
          slide_titulo: s.titulo || 'Slide',
          image_prompt: s.image_prompt,
          status: 'pending',
          dimensao: '16:9',
        });
      }
    } catch {
      // Silencioso em caso de duplicatas em imagens
    }

    return parsed;
  };

  // 4. Iniciar Geração em Lote (5 em 5, 10 em 10, até finalizar tudo)
  const handleIniciarLote = async (quantidade: '5' | '10' | 'tudo') => {
    if (!leiSelecionada || executando) return;

    // Filtra artigos pendentes (apenas artigos reais, sem aula ainda)
    const pendentes = artigos.filter(a => a.isRealArticle && !a.tem_aula);

    if (pendentes.length === 0) {
      toast.info('Parabéns! Todos os artigos desta lei já possuem aulas geradas.');
      return;
    }

    let loteAlvo: ArtigoItem[] = [];
    if (quantidade === '5') {
      loteAlvo = pendentes.slice(0, 5);
    } else if (quantidade === '10') {
      loteAlvo = pendentes.slice(0, 10);
    } else {
      loteAlvo = pendentes;
    }

    setExecutando(true);
    setModoExecucao(quantidade);
    setProgressoLote({ total: loteAlvo.length, concluidos: 0, erros: 0 });
    setTempoInicioLote(Date.now());
    setTempoEstimadoSegundos(null);
    abortControllerRef.current = new AbortController();

    const descModo = quantidade === 'tudo' ? 'todos os artigos restantes' : `${quantidade} artigos`;
    addLog('info', `Iniciando geração em lote para ${descModo} de ${leiSelecionada.nome}...`);

    let concluidosCount = 0;
    let errosCount = 0;

    for (let i = 0; i < loteAlvo.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        addLog('aviso', 'Execução em lote cancelada pelo usuário.');
        break;
      }

      const art = loteAlvo[i];
      setArtigoAtualProcessando(`Art. ${art.numero}`);
      addLog('info', `[${i + 1}/${loteAlvo.length}] Gerando aula para Art. ${art.numero}...`);

      const tInicioArtigo = Date.now();

      try {
        const aulaGerada = await gerarAulaArtigo(art, leiSelecionada.nome);

        concluidosCount++;
        const tFimArtigo = (Date.now() - tInicioArtigo) / 1000;

        // Atualiza artigo no estado local
        setArtigos(prev => prev.map(item => item.id === art.id ? {
          ...item,
          tem_aula: true,
          aula_dados: aulaGerada,
        } : item));

        // Calcula ETA dinâmico
        const tempoTotalDecorrido = (Date.now() - (tempoInicioLote || Date.now())) / 1000;
        const tempoMedio = tempoTotalDecorrido / concluidosCount;
        const restantes = loteAlvo.length - concluidosCount;
        const eta = Math.round(tempoMedio * restantes);
        setTempoEstimadoSegundos(eta);

        setProgressoLote({
          total: loteAlvo.length,
          concluidos: concluidosCount,
          erros: errosCount,
        });

        // Atualiza contagem da lei
        setLeiSelecionada(prev => {
          if (!prev) return null;
          const novasFeitas = (prev.aulas_geradas || 0) + 1;
          const pct = prev.total_artigos > 0 ? Math.min(100, Math.round((novasFeitas / prev.total_artigos) * 100)) : 0;
          return { ...prev, aulas_geradas: novasFeitas, porcentagem: pct };
        });

        addLog('sucesso', `✅ Art. ${art.numero} concluído em ${tFimArtigo.toFixed(1)}s! (${aulaGerada.slides?.length || 0} slides salvos).`);

        // Pequena pausa de 1 segundo para evitar throttle
        await new Promise(r => setTimeout(r, 1000));
      } catch (err: any) {
        errosCount++;
        setProgressoLote(prev => ({ ...prev, erros: errosCount }));
        addLog('erro', `❌ Erro no Art. ${art.numero}: ${err.message || err}`);
      }
    }

    setExecutando(false);
    setModoExecucao(null);
    setArtigoAtualProcessando('');
    setTempoEstimadoSegundos(null);

    toast.success(`Lote concluído: ${concluidosCount} aulas geradas com sucesso!`);
    addLog('sucesso', `Lote finalizado! Total gerado: ${concluidosCount} aulas.`);
  };

  // 5. Gerar Artigo Individual
  const handleGerarIndividual = async (artigo: ArtigoItem) => {
    if (!leiSelecionada || executando) return;

    setExecutando(true);
    setModoExecucao('individual');
    setArtigoAtualProcessando(`Art. ${artigo.numero}`);
    addLog('info', `Gerando aula individual para Art. ${artigo.numero}...`);

    try {
      const aulaGerada = await gerarAulaArtigo(artigo, leiSelecionada.nome);

      setArtigos(prev => prev.map(item => item.id === artigo.id ? {
        ...item,
        tem_aula: true,
        aula_dados: aulaGerada,
      } : item));

      setLeiSelecionada(prev => {
        if (!prev) return null;
        const novasFeitas = (prev.aulas_geradas || 0) + (artigo.tem_aula ? 0 : 1);
        const pct = prev.total_artigos > 0 ? Math.min(100, Math.round((novasFeitas / prev.total_artigos) * 100)) : 0;
        return { ...prev, aulas_geradas: novasFeitas, porcentagem: pct };
      });

      toast.success(`Aula do Art. ${artigo.numero} criada com sucesso!`);
      addLog('sucesso', `Art. ${artigo.numero} gerado com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro ao gerar aula: ${err.message || err}`);
      addLog('erro', `Erro no Art. ${artigo.numero}: ${err.message || err}`);
    } finally {
      setExecutando(false);
      setModoExecucao(null);
      setArtigoAtualProcessando('');
    }
  };

  // 6. Apagar Aula (Opção expressamente solicitada no áudio do usuário)
  const handleApagarAula = async (artigo: ArtigoItem) => {
    if (!leiSelecionada) return;

    if (!confirm(`Deseja realmente apagar a aula do Art. ${artigo.numero}? Ela poderá ser regerada do zero.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('aprender_leis_aulas')
        .delete()
        .eq('lei_id', leiSelecionada.id)
        .eq('artigo_numero', artigo.numero);

      if (error) throw error;

      // Atualiza estado local
      setArtigos(prev => prev.map(item => item.id === artigo.id ? {
        ...item,
        tem_aula: false,
        aula_dados: null,
      } : item));

      // Atualiza contagem da lei
      setLeiSelecionada(prev => {
        if (!prev) return null;
        const novasFeitas = Math.max(0, (prev.aulas_geradas || 1) - 1);
        const pct = prev.total_artigos > 0 ? Math.min(100, Math.round((novasFeitas / prev.total_artigos) * 100)) : 0;
        return { ...prev, aulas_geradas: novasFeitas, porcentagem: pct };
      });

      if (aulaInspecionando?.artigo.id === artigo.id) {
        setAulaInspecionando(null);
      }

      toast.success(`Aula do Art. ${artigo.numero} apagada com sucesso.`);
      addLog('aviso', `Aula do Art. ${artigo.numero} foi apagada do banco.`);
    } catch (err: any) {
      toast.error(`Falha ao apagar aula: ${err.message || err}`);
      addLog('erro', `Erro ao apagar Art. ${artigo.numero}: ${err.message || err}`);
    }
  };

  // Parar execução do robô
  const handleParar = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setExecutando(false);
    setModoExecucao(null);
    setArtigoAtualProcessando('');
    setTempoEstimadoSegundos(null);
    addLog('aviso', 'Robô de geração pausado pelo usuário.');
    toast.info('Geração pausada.');
  };

  // Formatação amigável de tempo restante
  const formatarETA = (segundos: number | null) => {
    if (segundos === null || segundos <= 0) return 'calculando...';
    if (segundos < 60) return `~${segundos} segundos restantes`;
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `~${min}m ${seg}s restantes`;
  };

  // Estatísticas Globais
  const estatisticasGlobais = useMemo(() => {
    const totalLeis = leis.length;
    const totalArtigos = leis.reduce((acc, l) => acc + (l.total_artigos || 0), 0);
    const totalAulasFeitas = Object.values(aulasMapa).reduce((acc, v) => acc + v, 0);
    const pctGeral = totalArtigos > 0 ? Math.min(100, Math.round((totalAulasFeitas / totalArtigos) * 100)) : 0;
    return { totalLeis, totalArtigos, totalAulasFeitas, pctGeral };
  }, [leis, aulasMapa]);

  // Lista de Leis Filtrada
  const leisFiltradas = useMemo(() => {
    return leis.filter(lei => {
      const matchCat = categoriaAtiva === 'todos' || lei.categoria === categoriaAtiva;
      const matchBusca = buscaLei.trim() === '' || 
        lei.nome.toLowerCase().includes(buscaLei.toLowerCase()) ||
        (lei.nome_curto && lei.nome_curto.toLowerCase().includes(buscaLei.toLowerCase())) ||
        lei.slug.toLowerCase().includes(buscaLei.toLowerCase());
      return matchCat && matchBusca;
    });
  }, [leis, categoriaAtiva, buscaLei]);

  // Artigos Filtrados da Lei Selecionada
  const artigosFiltrados = useMemo(() => {
    return artigos.filter(art => {
      // Filtro de status
      if (filtroArtigoStatus === 'pendentes' && (art.tem_aula || !art.isRealArticle)) return false;
      if (filtroArtigoStatus === 'concluidos' && !art.tem_aula) return false;

      // Filtro de texto/busca
      if (buscaArtigo.trim() !== '') {
        const query = buscaArtigo.toLowerCase();
        const numMatch = art.numero.toLowerCase().includes(query);
        const textoMatch = art.texto.toLowerCase().includes(query);
        return numMatch || textoMatch;
      }
      return true;
    });
  }, [artigos, filtroArtigoStatus, buscaArtigo]);

  // Cabeçalho Mobile
  const mobileHeader = (
    <PageHeader 
      title={leiSelecionada ? (leiSelecionada.nome_curto || leiSelecionada.nome) : "Criar Aulas — Aprender Leis"} 
      subtitle={leiSelecionada ? `${leiSelecionada.porcentagem || 0}% gerado` : undefined}
      onBack={() => {
        if (leiSelecionada) {
          handleVoltarParaLeis();
        } else {
          navigate('/admin-aprender-leis');
        }
      }} 
    />
  );

  if (!isAdmin) {
    return (
      <DesktopPageLayout activeId="admin" title="Admin — Aprender Leis Criar" mobileHeader={mobileHeader}>
        <div className="p-8 text-center text-muted-foreground">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
          Acesso restrito para administradores.
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <DesktopPageLayout
      activeId="admin"
      title={leiSelecionada ? leiSelecionada.nome : "Criar Aulas de Leis com OmniRoute 3.8"}
      subtitle={leiSelecionada ? "Gere aulas em lote, acompanhe o progresso e gerencie os artigos" : "Selecione uma legislação para gerar e gerenciar aulas interativas em lote"}
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 py-4 lg:px-0 lg:py-0 max-w-5xl mx-auto w-full space-y-5">
        
        {/* ========================================================================= */}
        {/* VISÃO 1: CATÁLOGO DE LEIS (QUANDO NENHUMA LEI ESTÁ SELECIONADA)           */}
        {/* ========================================================================= */}
        {!leiSelecionada && (
          <div className="space-y-5">
            
            {/* Card de Resumo do App */}
            <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-blue-950/20 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                        Estúdio OmniRoute 3.8
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">
                        Geração em Lote
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      Todas as Legislações do Aplicativo
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Motor Pronto (3.8)
                  </span>
                </div>
              </div>

              {/* Cards de Métricas Globais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-xl border border-border/60 bg-secondary/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Legislações
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                    {estatisticasGlobais.totalLeis} leis
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/60 bg-secondary/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Aulas Geradas
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-blue-400 mt-0.5">
                    {estatisticasGlobais.totalAulasFeitas} prontas
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/60 bg-secondary/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Total de Artigos
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                    {estatisticasGlobais.totalArtigos} artigos
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border/60 bg-secondary/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Progresso Geral
                  </span>
                  <div className="text-lg sm:text-xl font-bold text-emerald-400 mt-0.5">
                    {estatisticasGlobais.pctGeral}%
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros por Categoria e Barra de Busca */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                
                {/* Abas de Categorias */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {Object.entries(CATEGORIAS_CONFIG).map(([key, config]) => {
                    const ativo = categoriaAtiva === key;
                    const Icone = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setCategoriaAtiva(key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                          ativo 
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                            : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                        }`}
                      >
                        <Icone className="w-3.5 h-3.5" />
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input de Busca */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={buscaLei}
                    onChange={(e) => setBuscaLei(e.target.value)}
                    placeholder="Buscar lei (ex: Penal, CLT, 8.069)..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-card text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {buscaLei && (
                    <button
                      onClick={() => setBuscaLei('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Grid de Cards de Legislações */}
            {carregandoLeis ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-xs">Carregando catálogo completo de leis e estatísticas...</p>
              </div>
            ) : leisFiltradas.length === 0 ? (
              <div className="p-10 rounded-2xl border border-border/80 bg-card text-center text-muted-foreground space-y-2">
                <Info className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <p className="text-sm font-semibold">Nenhuma legislação encontrada</p>
                <p className="text-xs">Tente ajustar o termo de pesquisa ou a categoria selecionada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {leisFiltradas.map(lei => {
                  const catConfig = CATEGORIAS_CONFIG[lei.categoria] || CATEGORIAS_CONFIG.todos;
                  const Icone = catConfig.icon;
                  const pct = lei.porcentagem || 0;
                  const aulasProntas = lei.aulas_geradas || 0;
                  const totalArts = lei.total_artigos || 0;

                  return (
                    <div
                      key={lei.id}
                      onClick={() => selecionarLei(lei)}
                      className="group rounded-2xl border border-border/70 hover:border-primary/50 bg-card hover:bg-card/90 p-4 space-y-3 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                            {catConfig.label}
                          </span>
                          <span className="text-[11px] font-bold text-muted-foreground">
                            {totalArts} artigos
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {lei.nome}
                          </h4>
                          {lei.nome_curto && (
                            <p className="text-xs text-muted-foreground font-medium">
                              {lei.nome_curto}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Barra de Progresso da Lei */}
                      <div className="space-y-1.5 pt-2 border-t border-border/40">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium">
                            {aulasProntas} de {totalArts} aulas
                          </span>
                          <span className={`font-bold ${pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-blue-400' : 'text-muted-foreground'}`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-secondary/80 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-blue-500' : 'bg-muted-foreground/20'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-primary font-semibold pt-1">
                        <span>Abrir artigos & gerar</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* VISÃO 2: ARTIGOS DA LEI SELECIONADA & GERAÇÃO EM LOTE                     */}
        {/* ========================================================================= */}
        {leiSelecionada && (
          <div className="space-y-5">
            
            {/* Breadcrumb e Botão de Voltar */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleVoltarParaLeis}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Catálogo de Leis</span>
              </button>

              <div className="text-xs text-muted-foreground font-medium">
                {CATEGORIAS_CONFIG[leiSelecionada.categoria]?.label || 'Legislação'} &gt; <strong className="text-foreground">{leiSelecionada.nome_curto || leiSelecionada.nome}</strong>
              </div>
            </div>

            {/* Cabeçalho da Legislação Selecionada */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                      {CATEGORIAS_CONFIG[leiSelecionada.categoria]?.label || 'Lei'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      OmniRoute 3.8
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-bold text-foreground">
                    {leiSelecionada.nome}
                  </h3>
                </div>

                <div className="flex items-center gap-3 bg-secondary/40 p-3 rounded-xl border border-border/50">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground font-semibold">Progresso da Lei</div>
                    <div className="text-lg font-bold text-foreground">
                      {leiSelecionada.aulas_geradas || 0} / {leiSelecionada.total_artigos} aulas
                    </div>
                  </div>
                  <div className={`text-xl font-black px-3 py-1.5 rounded-xl border ${
                    (leiSelecionada.porcentagem || 0) === 100 
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                      : (leiSelecionada.porcentagem || 0) > 0 
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' 
                      : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {leiSelecionada.porcentagem || 0}%
                  </div>
                </div>
              </div>

              {/* Barra de Progresso da Lei */}
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${leiSelecionada.porcentagem || 0}%` }}
                />
              </div>

              {/* ========================================================================= */}
              {/* BOTÕES DE GERAÇÃO EM LOTE SOLICITADOS NO ÁUDIO                             */}
              {/* "opções de gerar de 10 em 10, de 5 em 5, gerar até finalizar tudo..."      */}
              {/* ========================================================================= */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  Escolha como deseja que o robô OmniRoute gere as aulas para os artigos pendentes:
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {executando ? (
                    <button
                      onClick={handleParar}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold transition-all shadow-md"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Pausar Robô</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleIniciarLote('5')}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Gerar de 5 em 5</span>
                      </button>

                      <button
                        onClick={() => handleIniciarLote('10')}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Gerar de 10 em 10</span>
                      </button>

                      <button
                        onClick={() => handleIniciarLote('tudo')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Gerar até finalizar tudo</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Painel de Status em Tempo Real da Execução */}
            {(executando || progressoLote.total > 0) && (
              <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-card via-card to-blue-950/20 p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 text-blue-400 ${executando ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-bold text-foreground">
                      {executando ? `Processando lote (${artigoAtualProcessando})` : 'Lote Finalizado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {tempoEstimadoSegundos !== null && (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatarETA(tempoEstimadoSegundos)}
                      </span>
                    )}
                    <span className="text-muted-foreground font-mono">
                      {progressoLote.concluidos} de {progressoLote.total} concluídos
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso do Lote */}
                {progressoLote.total > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Taxa de conclusão do lote</span>
                      <span className="font-bold text-foreground">
                        {Math.round((progressoLote.concluidos / progressoLote.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${(progressoLote.concluidos / progressoLote.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terminal de Logs Compacto */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-neutral-300 font-mono">
                    Terminal de Logs OmniRoute 3.8
                  </span>
                </div>
                <button
                  onClick={() => setTerminalAberto(!terminalAberto)}
                  className="text-neutral-400 hover:text-neutral-200 text-xs font-mono flex items-center gap-1"
                >
                  {terminalAberto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{terminalAberto ? 'Recolher' : 'Expandir'}</span>
                </button>
              </div>

              {terminalAberto && (
                <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px] pr-2">
                  {logs.slice(-15).map(log => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-neutral-500 shrink-0">[{log.hora}]</span>
                      <span className={`leading-relaxed ${
                        log.tipo === 'sucesso' 
                          ? 'text-emerald-400' 
                          : log.tipo === 'erro' 
                          ? 'text-rose-400' 
                          : log.tipo === 'aviso' 
                          ? 'text-amber-400' 
                          : 'text-neutral-300'
                      }`}>
                        {log.mensagem}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista e Filtros de Artigos */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                
                {/* Abas de Filtro de Artigos */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setFiltroArtigoStatus('todos')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      filtroArtigoStatus === 'todos'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todos os Artigos ({artigos.filter(a => a.isRealArticle).length})
                  </button>
                  <button
                    onClick={() => setFiltroArtigoStatus('pendentes')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      filtroArtigoStatus === 'pendentes'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-card border-border/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pendentes ({artigos.filter(a => a.isRealArticle && !a.tem_aula).length})
                  </button>
                  <button
                    onClick={() => setFiltroArtigoStatus('concluidos')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      filtroArtigoStatus === 'concluidos'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-card border-border/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Com Aula Pronta ({artigos.filter(a => a.tem_aula && a.isRealArticle).length})
                  </button>
                </div>

                {/* Campo de Busca nos Artigos */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={buscaArtigo}
                    onChange={(e) => setBuscaArtigo(e.target.value)}
                    placeholder="Buscar artigo (ex: 121, legítima defesa)..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-card text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {buscaArtigo && (
                    <button
                      onClick={() => setBuscaArtigo('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>

              {/* Lista dos Artigos */}
              {carregandoArtigos ? (
                <div className="p-12 text-center text-muted-foreground space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <p className="text-xs">Carregando artigos de {leiSelecionada.nome}...</p>
                </div>
              ) : artigosFiltrados.length === 0 ? (
                <div className="p-8 rounded-2xl border border-border/80 bg-card text-center text-muted-foreground space-y-2">
                  <Info className="w-7 h-7 mx-auto text-muted-foreground/60" />
                  <p className="text-xs font-semibold">Nenhum artigo encontrado com os filtros atuais.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {artigosFiltrados.map(art => {
                    const isProcessing = executando && artigoAtualProcessando === `Art. ${art.numero}`;

                    return (
                      <div
                        key={art.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isProcessing 
                            ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500' 
                            : art.tem_aula 
                            ? 'border-border/70 bg-card' 
                            : 'border-border/50 bg-card/60'
                        }`}
                      >
                        {/* Informações do Artigo */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground bg-secondary px-2.5 py-0.5 rounded-lg border border-border">
                              Art. {art.numero}
                            </span>
                            
                            {art.tem_aula ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                <CheckCircle2 className="w-3 h-3" />
                                Aula Pronta ({art.aula_dados?.total_slides || art.aula_dados?.slides?.length || 4} slides)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3" />
                                Pendente
                              </span>
                            )}

                            {isProcessing && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Gerando agora...
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {art.texto}
                          </p>
                        </div>

                        {/* Botões de Ação do Artigo */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                          {art.tem_aula ? (
                            <>
                              {/* Ver Aula / Prévia */}
                              <button
                                onClick={() => setAulaInspecionando({ artigo: art, aula: art.aula_dados })}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors"
                                title="Visualizar slides da aula"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-400" />
                                <span>Ver Aula</span>
                              </button>

                              {/* Regerar Aula */}
                              <button
                                onClick={() => handleGerarIndividual(art)}
                                disabled={executando}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors disabled:opacity-50"
                                title="Regerar aula com OmniRoute"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                                <span>Regerar</span>
                              </button>

                              {/* Apagar Aula (Opção explicitada pelo usuário) */}
                              <button
                                onClick={() => handleApagarAula(art)}
                                disabled={executando}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-destructive/30 hover:bg-destructive/15 text-destructive text-xs font-semibold transition-colors disabled:opacity-50"
                                title="Apagar aula para refazer de novo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Apagar</span>
                              </button>
                            </>
                          ) : (
                            /* Botão Gerar Artigo Avulso */
                            <button
                              onClick={() => handleGerarIndividual(art)}
                              disabled={executando}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Gerar Aula</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL DE PRÉVIA / INSPEÇÃO DA AULA                                        */}
        {/* ========================================================================= */}
        {aulaInspecionando && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              
              {/* Topo do Modal */}
              <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Art. {aulaInspecionando.artigo.numero}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      OmniRoute 3.8
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-foreground mt-1">
                    {aulaInspecionando.aula?.titulo_aula || `Aula Art. ${aulaInspecionando.artigo.numero}`}
                  </h4>
                </div>

                <button
                  onClick={() => setAulaInspecionando(null)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conteúdo com os Slides */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
                {aulaInspecionando.aula?.objetivo && (
                  <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 text-xs">
                    <strong className="text-foreground">Objetivo Pedagógico:</strong>{' '}
                    <span className="text-muted-foreground">{aulaInspecionando.aula.objetivo}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {(aulaInspecionando.aula?.slides || []).map((slide: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-secondary/20 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                          {slide.badge || `Slide ${slide.ordem || idx + 1}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {slide.tipo_interacao || 'leitura'}
                        </span>
                      </div>

                      <h5 className="text-sm font-bold text-foreground">
                        {slide.titulo}
                      </h5>

                      <p className="text-muted-foreground leading-relaxed">
                        {slide.texto_didatico}
                      </p>

                      {slide.exemplo_cotidiano && (
                        <div className="p-2.5 rounded-lg bg-background/60 text-[11px] text-muted-foreground border border-border/50">
                          <strong className="text-foreground">Exemplo prático:</strong> {slide.exemplo_cotidiano}
                        </div>
                      )}

                      {slide.image_prompt && (
                        <div className="p-2 rounded-lg bg-background/40 text-[10px] text-muted-foreground font-mono">
                          <strong className="text-blue-400">Prompt Imagem:</strong> {slide.image_prompt}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rodapé do Modal com Ações */}
              <div className="p-4 border-t border-border flex items-center justify-between">
                <button
                  onClick={() => handleApagarAula(aulaInspecionando.artigo)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Apagar Esta Aula</span>
                </button>

                <button
                  onClick={() => setAulaInspecionando(null)}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-all"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </DesktopPageLayout>
  );
};

export default AdminAprenderLeisCriar;
