import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  FolderSync,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  UploadCloud,
  FileAudio,
  Radio,
  Sparkles,
  ArrowLeft,
  BookOpen,
  Scale,
  Landmark,
  FileText,
  ChevronRight,
  Check,
  Edit2,
  Layers,
  Gavel,
  ShieldAlert,
  Users,
  Briefcase,
  ShieldCheck,
  Receipt,
  Car,
  Award,
  Baby,
  HeartHandshake,
  Accessibility,
  ScrollText,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/vademecum/PageHeader';
import {
  fetchLeisComMetricasNarracao,
  fetchArtigosDaLeiComNarracao,
  vincularAudioAoArtigo,
  saveDriveUrl,
  matchArtigoKeyFromFilename,
  normalizeArtigoKey,
  type LeiNarracaoItem,
  type ArtigoNarracaoItem,
} from '@/services/narracaoArtigosSyncService';

type CategoriaFiltro = 'Todas' | 'Códigos' | 'Estatutos' | 'Constituição' | 'Leis Ordinárias';

/**
 * Retorna o ícone temático e cores apropriadas para cada lei
 */
function getLeiVisualConfig(slug: string, nome: string, categoria: string) {
  const s = (slug || '').toLowerCase();
  const n = (nome || '').toLowerCase();

  if (s === 'cf' || s === 'cf88' || n.includes('constituição') || n.includes('constituicao')) {
    return { icon: Landmark, iconColor: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' };
  }
  if (s === 'cpp' || n.includes('processo penal')) {
    return { icon: Gavel, iconColor: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' };
  }
  if (s === 'cp' || s === 'cpm' || (n.includes('penal') && !n.includes('processo'))) {
    return { icon: ShieldAlert, iconColor: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/25' };
  }
  if (s === 'cpc' || n.includes('processo civil')) {
    return { icon: Scale, iconColor: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/25' };
  }
  if (s === 'cc' || (n.includes('civil') && !n.includes('processo'))) {
    return { icon: Users, iconColor: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25' };
  }
  if (s === 'clt' || n.includes('trabalho')) {
    return { icon: Briefcase, iconColor: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' };
  }
  if (s === 'cdc' || n.includes('consumidor')) {
    return { icon: ShieldCheck, iconColor: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25' };
  }
  if (s === 'ctn' || n.includes('tributário') || n.includes('tributario')) {
    return { icon: Receipt, iconColor: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/25' };
  }
  if (s === 'ctb' || n.includes('trânsito') || n.includes('transito')) {
    return { icon: Car, iconColor: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' };
  }
  if (s === 'oab' || n.includes('oab')) {
    return { icon: Award, iconColor: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' };
  }
  if (n.includes('criança') || n.includes('adolescente') || s === 'eca') {
    return { icon: Baby, iconColor: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/25' };
  }
  if (n.includes('idoso')) {
    return { icon: HeartHandshake, iconColor: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/25' };
  }
  if (n.includes('deficiência') || n.includes('deficiencia') || s === 'pcd') {
    return { icon: Accessibility, iconColor: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/25' };
  }
  if (categoria === 'Códigos') {
    return { icon: BookOpen, iconColor: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' };
  }
  if (categoria === 'Estatutos') {
    return { icon: ScrollText, iconColor: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' };
  }
  return { icon: FileText, iconColor: 'text-slate-400', bg: 'bg-slate-800 border-slate-700' };
}

export default function AdminNarracaoArtigos() {
  const navigate = useNavigate();

  // Estados da lista de leis
  const [leis, setLeis] = useState<LeiNarracaoItem[]>([]);
  const [loadingLeis, setLoadingLeis] = useState(true);
  const [buscaLei, setBuscaLei] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaFiltro>('Todas');

  // Estado da lei atualmente selecionada (null = visão de lista de leis)
  const [leiSelecionada, setLeiSelecionada] = useState<LeiNarracaoItem | null>(null);

  // Estados dos artigos e detalhe da lei selecionada
  const [artigos, setArtigos] = useState<ArtigoNarracaoItem[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Menu de alternância da lei detalhada
  const [secaoDetalhe, setSecaoDetalhe] = useState<'pasta' | 'cron' | 'artigos'>('pasta');
  // Filtros internos de artigos
  const [buscaArtigo, setBuscaArtigo] = useState('');
  const [abaArtigo, setAbaArtigo] = useState<'faltando' | 'com_audio' | 'todos'>('faltando');

  // Drive URL e edição
  const [driveUrl, setDriveUrl] = useState('');
  const [editandoDriveUrl, setEditandoDriveUrl] = useState(false);

  // Cron Job (10 minutos)
  const [cronAtivo, setCronAtivo] = useState(true);
  const [tempoRestanteSegundos, setTempoRestanteSegundos] = useState(600);
  const [ultimaExecucao, setUltimaExecucao] = useState<string | null>(null);
  const [logsSync, setLogsSync] = useState<Array<{ hora: string; msg: string; tipo: 'info' | 'sucesso' | 'erro' }>>([]);

  // Player de prévia de áudio
  const [audioTocandoId, setAudioTocandoId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Upload por Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; atual: number } | null>(null);

  // 1. Carregar lista de leis com métricas
  useEffect(() => {
    async function carregarLeis() {
      setLoadingLeis(true);
      try {
        const dados = await fetchLeisComMetricasNarracao();
        setLeis(dados);
      } catch (err) {
        console.error('Erro ao carregar leis:', err);
        toast.error('Erro ao carregar lista de leis.');
      } finally {
        setLoadingLeis(false);
      }
    }
    carregarLeis();
  }, []);

  // 2. Quando o usuário seleciona uma lei, carrega seus artigos e inicializa os controles
  useEffect(() => {
    if (!leiSelecionada) {
      setArtigos([]);
      return;
    }

    const pastaPadrao = leiSelecionada.driveFolderUrl || '';

    setDriveUrl(pastaPadrao);
    setEditandoDriveUrl(!pastaPadrao);
    setTempoRestanteSegundos(600);

    let cancelado = false;
    async function carregarArtigos() {
      setLoadingArtigos(true);
      try {
        const itens = await fetchArtigosDaLeiComNarracao(leiSelecionada!.id, leiSelecionada!.slug);
        if (!cancelado) {
          setArtigos(itens);

          const comAudio = itens.filter(a => a.temAudio).length;
          const pendentes = itens.length - comAudio;
          const perc = itens.length > 0 ? Math.round((comAudio / itens.length) * 100) : 0;

          // Atualizar contadores na lista de leis
          setLeis(prev =>
            prev.map(l =>
              l.id === leiSelecionada!.id
                ? { ...l, totalArtigos: itens.length, totalComAudio: comAudio, totalPendentes: pendentes, percentual: perc }
                : l
            )
          );
        }
      } catch (err) {
        if (!cancelado) toast.error('Erro ao buscar artigos desta lei.');
      } finally {
        if (!cancelado) setLoadingArtigos(false);
      }
    }

    carregarArtigos();
    return () => {
      cancelado = true;
    };
  }, [leiSelecionada?.id]);

  // 3. Temporizador do Cron Job (a cada 10 minutos)
  useEffect(() => {
    if (!cronAtivo || !leiSelecionada) return;

    const pendentes = artigos.filter(a => !a.temAudio).length;
    if (artigos.length > 0 && pendentes === 0) {
      setCronAtivo(false);
      toast.success('🎉 Todos os artigos desta lei foram concluídos! Cron Job finalizado.');
      return;
    }

    const interval = setInterval(() => {
      setTempoRestanteSegundos(prev => {
        if (prev <= 1) {
          executarCicloSincronizacao();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cronAtivo, leiSelecionada?.id, artigos]);

  // Executar ciclo de sincronização
  const executarCicloSincronizacao = async () => {
    if (isSyncing || !leiSelecionada) return;
    setIsSyncing(true);

    const horaAtual = new Date().toLocaleTimeString('pt-BR');
    setUltimaExecucao(horaAtual);

    setLogsSync(prev => [
      { hora: horaAtual, msg: `Iniciando verificação periódica para ${leiSelecionada.nome}...`, tipo: 'info' },
      ...prev.slice(0, 40),
    ]);

    try {
      const itens = await fetchArtigosDaLeiComNarracao(leiSelecionada.id, leiSelecionada.slug);
      setArtigos(itens);

      const comAudio = itens.filter(a => a.temAudio).length;
      const pendentes = itens.length - comAudio;

      setLogsSync(prev => [
        {
          hora: new Date().toLocaleTimeString('pt-BR'),
          msg: `Verificação concluída: ${comAudio} com áudio gravado, ${pendentes} pendentes.`,
          tipo: 'sucesso',
        },
        ...prev.slice(0, 40),
      ]);

      if (pendentes === 0 && itens.length > 0) {
        setCronAtivo(false);
        toast.success(`🎉 Parabéns! Todos os ${itens.length} artigos de ${leiSelecionada.nome} foram concluídos!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na checagem';
      setLogsSync(prev => [
        {
          hora: new Date().toLocaleTimeString('pt-BR'),
          msg: `Erro na verificação: ${msg}`,
          tipo: 'erro',
        },
        ...prev.slice(0, 40),
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Salvar URL da pasta do Google Drive
  const handleSalvarDriveUrl = () => {
    if (!leiSelecionada) return;
    saveDriveUrl(leiSelecionada.id, driveUrl);
    saveDriveUrl(leiSelecionada.slug, driveUrl);
    setEditandoDriveUrl(false);

    setLeis(prev =>
      prev.map(l => (l.id === leiSelecionada.id ? { ...l, driveFolderUrl: driveUrl } : l))
    );

    setLogsSync(prev => [
      {
        hora: new Date().toLocaleTimeString('pt-BR'),
        msg: `Link da pasta do Drive atualizado para: ${driveUrl}`,
        tipo: 'sucesso',
      },
      ...prev,
    ]);
    toast.success('Link da pasta do Drive salvo para esta lei!');
  };

  // Reprodução de áudio
  const handleTogglePlay = (artigoId: string, url: string | null) => {
    if (!url || !url.trim()) {
      toast.error('Este artigo ainda não possui gravação de áudio sincronizada.');
      return;
    }

    if (audioTocandoId === artigoId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setAudioTocandoId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        audioRef.current = audio;

        audio.onerror = () => {
          setAudioTocandoId(null);
          toast.error('O arquivo de áudio não pôde ser carregado. Você pode enviar uma nova versão pelo botão de upload deste artigo.');
        };

        audio.onended = () => {
          setAudioTocandoId(null);
        };

        audio.play().then(() => {
          setAudioTocandoId(artigoId);
          toast.info('Tocando áudio da narração...', { duration: 1800 });
        }).catch((err: unknown) => {
          setAudioTocandoId(null);
          console.warn('Erro ao reproduzir áudio:', err);
          if (err instanceof Error && err.name === 'NotAllowedError') {
            toast.error('O navegador bloqueou a saída de som automática. Clique novamente para autorizar a reprodução.');
          } else {
            toast.error('Não foi possível reproduzir o áudio. Verifique se o navegador autorizou a saída de som.');
          }
        });
      } catch {
        setAudioTocandoId(null);
        toast.error('Erro ao inicializar o player de áudio.');
      }
    }
  };

  // Upload por arrastar ou selecionar arquivos
  const processarArquivosAudio = async (files: FileList | File[]) => {
    if (!leiSelecionada || files.length === 0) return;

    const lista = Array.from(files).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f.name));
    if (lista.length === 0) {
      toast.error('Nenhum arquivo de áudio (.mp3 ou .wav) foi selecionado.');
      return;
    }

    setUploadProgress({ total: lista.length, atual: 0 });
    let vinculadosComSucesso = 0;

    for (let i = 0; i < lista.length; i++) {
      const file = lista[i];
      setUploadProgress({ total: lista.length, atual: i + 1 });

      const artigoKey = matchArtigoKeyFromFilename(file.name);
      if (!artigoKey) {
        setLogsSync(prev => [
          {
            hora: new Date().toLocaleTimeString('pt-BR'),
            msg: `Não foi possível identificar o número do artigo em: "${file.name}"`,
            tipo: 'erro',
          },
          ...prev,
        ]);
        continue;
      }

      const artCorrespondente = artigos.find(a => normalizeArtigoKey(a.numero) === artigoKey);
      if (!artCorrespondente) {
        setLogsSync(prev => [
          {
            hora: new Date().toLocaleTimeString('pt-BR'),
            msg: `Artigo "${artigoKey}" de "${file.name}" não encontrado na base desta lei.`,
            tipo: 'erro',
          },
          ...prev,
        ]);
        continue;
      }

      const res = await vincularAudioAoArtigo({
        leiId: leiSelecionada.id,
        leiSlug: leiSelecionada.slug,
        leiNome: leiSelecionada.nome,
        artigoId: artCorrespondente.id,
        artigoNumero: artCorrespondente.numero,
        fileBlob: file,
        fileName: file.name,
      });

      if (res.success && res.audioUrl) {
        vinculadosComSucesso++;
        setArtigos(prev =>
          prev.map(a => (a.id === artCorrespondente.id ? { ...a, narracao_url: res.audioUrl!, temAudio: true } : a))
        );
        setLogsSync(prev => [
          {
            hora: new Date().toLocaleTimeString('pt-BR'),
            msg: `✅ Áudio vinculado com sucesso ao ${artCorrespondente.numeroFormatado}`,
            tipo: 'sucesso',
          },
          ...prev,
        ]);
      } else {
        setLogsSync(prev => [
          {
            hora: new Date().toLocaleTimeString('pt-BR'),
            msg: `Erro no upload do ${artCorrespondente.numeroFormatado}: ${res.error}`,
            tipo: 'erro',
          },
          ...prev,
        ]);
      }
    }

    setUploadProgress(null);
    if (vinculadosComSucesso > 0) {
      toast.success(`${vinculadosComSucesso} áudio(s) vinculado(s) ao Supabase Storage!`);
    }
  };

  // Filtro de leis por categoria e busca
  const leisFiltradas = useMemo(() => {
    return leis.filter(lei => {
      if (categoriaAtiva !== 'Todas' && lei.categoriaFormatada !== categoriaAtiva) {
        return false;
      }
      if (buscaLei.trim()) {
        const termo = buscaLei.toLowerCase();
        const matchNome = lei.nome.toLowerCase().includes(termo);
        const matchSlug = lei.slug.toLowerCase().includes(termo);
        return matchNome || matchSlug;
      }
      return true;
    });
  }, [leis, categoriaAtiva, buscaLei]);

  // Contagem por categoria
  const contagensPorCategoria = useMemo(() => {
    const cont: Record<string, number> = {
      Todas: leis.length,
      Códigos: 0,
      Estatutos: 0,
      Constituição: 0,
      'Leis Ordinárias': 0,
    };
    leis.forEach(l => {
      if (cont[l.categoriaFormatada] !== undefined) {
        cont[l.categoriaFormatada]++;
      }
    });
    return cont;
  }, [leis]);

  // Filtro de artigos dentro da lei selecionada
  const artigosFiltrados = useMemo(() => {
    return artigos.filter(a => {
      if (abaArtigo === 'faltando' && a.temAudio) return false;
      if (abaArtigo === 'com_audio' && !a.temAudio) return false;

      if (buscaArtigo.trim()) {
        const termo = buscaArtigo.toLowerCase();
        const matchNum = a.numero.toLowerCase().includes(termo) || a.numeroFormatado.toLowerCase().includes(termo);
        const matchTexto = a.texto.toLowerCase().includes(termo);
        return matchNum || matchTexto;
      }
      return true;
    });
  }, [artigos, abaArtigo, buscaArtigo]);

  const formatTimer = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans selection:bg-cyan-500/30">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CASO 1: VISÃO DE LISTA DE LEIS ORGANIZADA POR CATEGORIAS          */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {!leiSelecionada ? (
        <div>
          <PageHeader
            title="Áudio Leis"
            subtitle="Narrações em áudio e controle de artigos das principais leis"
            onBack={() => navigate(-1)}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
            {/* BARRA DE FILTROS & BUSCA DE LEIS */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Campo de Busca */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaLei}
                    onChange={e => setBuscaLei(e.target.value)}
                    placeholder="Buscar por nome da lei (ex: Processo Penal, Civil, CLT, OAB)..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>

                <div className="text-xs text-slate-400 font-medium px-2 flex items-center gap-1.5 self-end sm:self-auto">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  {leisFiltradas.length} leis listadas
                </div>
              </div>

              {/* Categorias (Códigos, Estatutos, Constituição, etc.) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'Todas' as CategoriaFiltro, label: 'Todas', icon: Layers },
                  { id: 'Códigos' as CategoriaFiltro, label: 'Códigos', icon: Landmark },
                  { id: 'Estatutos' as CategoriaFiltro, label: 'Estatutos', icon: Scale },
                  { id: 'Constituição' as CategoriaFiltro, label: 'Constituição', icon: BookOpen },
                  { id: 'Leis Ordinárias' as CategoriaFiltro, label: 'Leis Ordinárias', icon: FileText },
                ].map(cat => {
                  const Icon = cat.icon;
                  const ativa = categoriaAtiva === cat.id;
                  const total = contagensPorCategoria[cat.id] || 0;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoriaAtiva(cat.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 border transition-all ${
                        ativa
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${ativa ? 'text-cyan-400' : 'text-slate-500'}`} />
                      {cat.label}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          ativa ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {total}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LISTAGEM DE LEIS EM CARDS */}
            {loadingLeis ? (
              <div className="py-20 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" />
                <p className="text-sm font-medium">Carregando catálogo de leis e métricas de narração...</p>
              </div>
            ) : leisFiltradas.length === 0 ? (
              <div className="py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-300">Nenhuma lei encontrada com este filtro</p>
                <p className="text-xs text-slate-500 mt-1">Tente buscar por outro termo ou categoria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leisFiltradas.map(lei => {
                  const temDrive = !!lei.driveFolderUrl || lei.slug === 'cpp';
                  const isCPP = lei.slug === 'cpp';
                  const visual = getLeiVisualConfig(lei.slug, lei.nome, lei.categoriaFormatada);
                  const IconLei = visual.icon;

                  return (
                    <div
                      key={lei.id}
                      onClick={() => setLeiSelecionada(lei)}
                      className={`group relative bg-slate-900/90 hover:bg-slate-900 border rounded-2xl p-5 shadow-lg hover:shadow-cyan-500/5 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                        isCPP
                          ? 'border-cyan-500/60 ring-1 ring-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Topo do Card: Categoria & Sigla */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                            {lei.categoriaFormatada}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {temDrive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Drive Vinculado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                                Sem pasta
                              </span>
                            )}

                            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-900/40 px-2 py-0.5 rounded-md">
                              {lei.slug.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Ícone Temático + Nome da Lei */}
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl border flex-shrink-0 ${visual.bg} ${visual.iconColor} group-hover:scale-105 transition-transform`}>
                            <IconLei className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                              {lei.nome}
                            </h3>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                              {lei.totalArtigos} artigos reais cadastrados
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progresso de Narração */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Progresso</span>
                          <span className="font-bold text-white">
                            {lei.totalComAudio} / {lei.totalArtigos}{' '}
                            <span className="text-cyan-400 text-[11px] font-mono">({lei.percentual}%)</span>
                          </span>
                        </div>

                        {/* Barra */}
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${lei.percentual}%` }}
                          />
                        </div>

                        {/* Rodapé com botão de ação */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-amber-400/90 font-medium">
                            {lei.totalPendentes} pendentes
                          </span>

                          <span className="text-xs font-semibold text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                            Gerenciar <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════ */
        /* CASO 2: PAINEL DETALHADO DA LEI SELECIONADA (EX: CPP)             */
        /* ══════════════════════════════════════════════════════════════════ */
        <div>
          {/* Cabeçalho com botão para voltar à lista de leis */}
          <div className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
              <button
                onClick={() => setLeiSelecionada(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para as Leis
              </button>

              {(() => {
                const visual = getLeiVisualConfig(leiSelecionada.slug, leiSelecionada.nome, leiSelecionada.categoriaFormatada);
                const IconLei = visual.icon;
                return (
                  <div className="flex items-center gap-2.5 text-right">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                        {leiSelecionada.categoriaFormatada}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {leiSelecionada.nome} ({leiSelecionada.slug.toUpperCase()})
                      </span>
                    </div>
                    <div className={`p-2 rounded-xl border flex-shrink-0 ${visual.bg} ${visual.iconColor}`}>
                      <IconLei className="w-4 h-4" />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-16 space-y-6">
            {/* MENU DE ALTERNÂNCIA MINIMALISTA (SEGMENTED CONTROL / TABS) */}
            <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-2xl shadow-lg backdrop-blur-md">
              <div className="grid grid-cols-3 gap-1">
                {/* Aba 1: Pasta & Estatísticas */}
                <button
                  type="button"
                  onClick={() => setSecaoDetalhe('pasta')}
                  className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    secaoDetalhe === 'pasta'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <FolderSync className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="sm:hidden font-medium">Pasta</span>
                  <span className="hidden sm:inline font-medium">Pasta & Métricas</span>
                  <span className="text-[10px] px-1 py-0.2 rounded-md bg-slate-800 text-slate-300 ml-0.5 sm:ml-1 font-mono">
                    {artigos.length > 0
                      ? `${Math.round((artigos.filter(a => a.temAudio).length / artigos.length) * 100)}%`
                      : '0%'}
                  </span>
                </button>

                {/* Aba 2: Cron Jobs */}
                <button
                  type="button"
                  onClick={() => setSecaoDetalhe('cron')}
                  className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    secaoDetalhe === 'cron'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="sm:hidden font-medium">Cron</span>
                  <span className="hidden sm:inline font-medium">Cron Jobs (10m)</span>
                  <span className="inline-flex items-center gap-1 text-[10px] px-1 py-0.2 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 ml-0.5 sm:ml-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    {cronAtivo ? formatTimer(tempoRestanteSegundos) : 'Off'}
                  </span>
                </button>

                {/* Aba 3: Artigos da Lei */}
                <button
                  type="button"
                  onClick={() => setSecaoDetalhe('artigos')}
                  className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    secaoDetalhe === 'artigos'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="sm:hidden font-medium">Artigos</span>
                  <span className="hidden sm:inline font-medium">Artigos</span>
                  <span className="text-[10px] px-1 py-0.2 rounded-md bg-slate-800 text-slate-300 ml-0.5 sm:ml-1 font-mono">
                    {artigos.filter(a => a.temAudio).length}/{artigos.length}
                  </span>
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SEÇÃO 1: PASTA & ESTATÍSTICAS                                     */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {secaoDetalhe === 'pasta' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Card do Google Drive */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <FolderSync className="w-4 h-4 text-cyan-400" />
                        Pasta do Google Drive com os Áudios Narrados
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Os áudios gerados nesta pasta são baixados e salvos permanentemente no Supabase Storage.
                      </p>
                    </div>

                    {driveUrl && !editandoDriveUrl && (
                      <div className="flex items-center gap-2">
                        <a
                          href={driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          Abrir no Drive <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => setEditandoDriveUrl(true)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                          title="Editar Link da Pasta"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Exibição do Link ou Input de Edição */}
                  {editandoDriveUrl ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={driveUrl}
                        onChange={e => setDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        onClick={handleSalvarDriveUrl}
                        className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-cyan-600/20 whitespace-nowrap flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Salvar Link
                      </button>
                      {leiSelecionada.driveFolderUrl && (
                        <button
                          onClick={() => setEditandoDriveUrl(false)}
                          className="px-3 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-700"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-xs font-mono text-slate-300 truncate">{driveUrl}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900 px-2 py-0.5 rounded-full flex-shrink-0">
                        Pasta Ativa
                      </span>
                    </div>
                  )}

                  {/* CARDS DE MÉTRICAS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                      <span className="text-xs text-slate-400 block mb-1">Total de Artigos</span>
                      <span className="text-2xl font-bold text-white tracking-tight">{artigos.length}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">artigos reais numerados</span>
                    </div>

                    <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3.5">
                      <span className="text-xs text-emerald-400 block mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Já Narrados
                      </span>
                      <span className="text-2xl font-bold text-emerald-300 tracking-tight">
                        {artigos.filter(a => a.temAudio).length}
                      </span>
                      <span className="text-[11px] text-emerald-500 block mt-0.5">no Supabase Storage</span>
                    </div>

                    <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3.5">
                      <span className="text-xs text-amber-400 block mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Faltando
                      </span>
                      <span className="text-2xl font-bold text-amber-300 tracking-tight">
                        {artigos.filter(a => !a.temAudio).length}
                      </span>
                      <span className="text-[11px] text-amber-500 block mt-0.5">aguardando geração</span>
                    </div>

                    <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-3.5">
                      <span className="text-xs text-cyan-400 block mb-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Progresso
                      </span>
                      <span className="text-2xl font-bold text-cyan-300 tracking-tight">
                        {artigos.length > 0
                          ? Math.round((artigos.filter(a => a.temAudio).length / artigos.length) * 100)
                          : 0}
                        %
                      </span>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              artigos.length > 0
                                ? (artigos.filter(a => a.temAudio).length / artigos.length) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card de Ingestão Direta de Áudios (Upload / Drag & Drop) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-1">
                      <UploadCloud className="w-4 h-4 text-cyan-400" />
                      Ingestão Direta de Áudios (Upload em Lote / Arrastar Arquivos)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Você pode soltar os arquivos baixados da pasta para vinculação imediata no Supabase Storage. O sistema identifica o número do artigo automaticamente pelo nome do arquivo.
                    </p>
                  </div>

                  <div
                    onDragOver={e => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files) {
                        processarArquivosAudio(e.dataTransfer.files);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      isDragging
                        ? 'border-cyan-400 bg-cyan-950/20'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                    }`}
                  >
                    <UploadCloud className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-200">
                      Arraste arquivos de áudio narrados (.mp3, .wav) aqui
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Exemplos aceitos: art_1.mp3, CPP_Art_57.mp3, art_3_a.wav
                    </p>
                    <label className="inline-block mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition-colors border border-slate-700 shadow-sm">
                      Selecionar Arquivos no Computador
                      <input
                        type="file"
                        multiple
                        accept="audio/mp3,audio/wav,audio/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files) {
                            processarArquivosAudio(e.target.files);
                          }
                        }}
                      />
                    </label>

                    {uploadProgress && (
                      <div className="mt-3 text-xs text-cyan-300 animate-pulse font-medium">
                        Enviando {uploadProgress.atual} de {uploadProgress.total} para o Supabase Storage...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SEÇÃO 2: CRON JOBS (10 MINUTOS) & HISTÓRICO                       */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {secaoDetalhe === 'cron' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Bloco do Temporizador */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        Status do Cron Job
                      </h3>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          cronAtivo
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cronAtivo ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                          }`}
                        />
                        {cronAtivo ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                      <span className="text-[11px] text-slate-400 block mb-0.5">Próxima checagem automática em</span>
                      <span className="text-4xl font-mono font-bold text-cyan-400">
                        {cronAtivo ? formatTimer(tempoRestanteSegundos) : '--:--'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1.5">
                        {ultimaExecucao ? `Última execução: ${ultimaExecucao}` : 'Aguardando ciclo inicial'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={executarCicloSincronizacao}
                        disabled={isSyncing}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Verificando Agora...' : 'Sincronizar Agora'}
                      </button>

                      <button
                        onClick={() => setCronAtivo(!cronAtivo)}
                        className={`w-full py-2 rounded-xl text-xs font-medium border transition-colors ${
                          cronAtivo
                            ? 'border-red-900/40 text-red-400 hover:bg-red-950/20'
                            : 'border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/20'
                        }`}
                      >
                        {cronAtivo ? 'Pausar Temporizador' : 'Ativar Temporizador (10 min)'}
                      </button>
                    </div>
                  </div>

                  {/* Informações de Execução Automática */}
                  <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      Como Funciona a Sincronização Periódica
                    </h3>
                    <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                      <p>
                        • <strong className="text-slate-200">Ciclo a cada 10 minutos:</strong> O sistema checa se novos arquivos de áudio narrados surgiram na pasta do Google Drive configurada.
                      </p>
                      <p>
                        • <strong className="text-slate-200">Importação Automática:</strong> Arquivos identificados como <span className="font-mono text-cyan-300">art_*.mp3</span> ou <span className="font-mono text-cyan-300">art_*.wav</span> são enviados com status permanente para o bucket do Supabase Storage.
                      </p>
                      <p>
                        • <strong className="text-slate-200">Finalização:</strong> Ao atingir 100% dos artigos da lei com áudio gravado, o Cron Job é automaticamente desativado.
                      </p>
                    </div>
                  </div>
                </div>

                {/* LOGS DA SINCRONIZAÇÃO / HISTÓRICO */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" /> Histórico e Logs em Tempo Real
                    </h3>
                    {logsSync.length > 0 && (
                      <button
                        onClick={() => setLogsSync([])}
                        className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Limpar logs
                      </button>
                    )}
                  </div>

                  {logsSync.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs">
                      Nenhum registro de sincronização nesta sessão. Clique em &quot;Sincronizar Agora&quot; para iniciar.
                    </div>
                  ) : (
                    <div className="bg-slate-950 rounded-xl p-3 max-h-60 overflow-y-auto space-y-1 font-mono text-[11px]">
                      {logsSync.map((log, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 ${
                            log.tipo === 'sucesso'
                              ? 'text-emerald-400'
                              : log.tipo === 'erro'
                              ? 'text-red-400'
                              : 'text-slate-400'
                          }`}
                        >
                          <span className="text-slate-600 flex-shrink-0">[{log.hora}]</span>
                          <span>{log.msg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SEÇÃO 3: LISTAGEM DOS ARTIGOS DA LEI COM ABAS                     */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {secaoDetalhe === 'artigos' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Sub-Abas de Artigos */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start">
                    <button
                      onClick={() => setAbaArtigo('faltando')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        abaArtigo === 'faltando'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Faltando ({artigos.filter(a => !a.temAudio).length})
                    </button>

                    <button
                      onClick={() => setAbaArtigo('com_audio')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        abaArtigo === 'com_audio'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Com Áudio ({artigos.filter(a => a.temAudio).length})
                    </button>

                    <button
                      onClick={() => setAbaArtigo('todos')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        abaArtigo === 'todos'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Todos ({artigos.length})
                    </button>
                  </div>

                  {/* Campo de Busca de Artigo */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={buscaArtigo}
                      onChange={e => setBuscaArtigo(e.target.value)}
                      placeholder="Buscar artigo ou termo..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                {/* Listagem */}
                {loadingArtigos ? (
                  <div className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    <p className="text-xs">Carregando artigos de {leiSelecionada.nome}...</p>
                  </div>
                ) : artigosFiltrados.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/40 mb-2" />
                    <p className="text-sm font-medium text-slate-300">Nenhum artigo encontrado nesta categoria</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {abaArtigo === 'faltando'
                        ? 'Todos os artigos desta listagem já foram narrados!'
                        : 'Nenhum item corresponde ao filtro.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60 max-h-[560px] overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
                    {artigosFiltrados.map(artigo => (
                      <div
                        key={artigo.id}
                        className="p-3.5 hover:bg-slate-900/60 transition-colors flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-md">
                              {artigo.numeroFormatado}
                            </span>

                            {artigo.temAudio ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> No Storage
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-900/60 px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" /> Faltando Gravar
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {artigo.texto}
                          </p>
                        </div>

                        {/* Ações de Áudio */}
                        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                          {artigo.temAudio && (
                            <button
                              onClick={() => handleTogglePlay(artigo.id, artigo.narracao_url)}
                              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                audioTocandoId === artigo.id
                                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                              }`}
                              title="Ouvir Narração"
                            >
                              {audioTocandoId === artigo.id ? (
                                <>
                                  <Pause className="w-3.5 h-3.5" /> Pausar
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5" /> Ouvir
                                </>
                              )}
                            </button>
                          )}

                          <label
                            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer transition-colors"
                            title="Subir áudio deste artigo manualmente"
                          >
                            <FileAudio className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  processarArquivosAudio([e.target.files[0]]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MINI-PLAYER FLUTUANTE DE ÁUDIO QUANDO ESTIVER REPRODUZINDO */}
          {audioTocandoId && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/50 shadow-2xl shadow-cyan-950/80 rounded-2xl px-5 py-3 flex items-center gap-4 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Reproduzindo Narração</span>
                <span className="text-white font-semibold">
                  {artigos.find(a => a.id === audioTocandoId)?.numeroFormatado || 'Artigo'} ({leiSelecionada.nome})
                </span>
              </div>
              <button
                onClick={() => handleTogglePlay(audioTocandoId, null)}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ml-2"
              >
                <Pause className="w-3.5 h-3.5" /> Parar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
