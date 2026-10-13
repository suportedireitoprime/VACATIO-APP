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
  ChevronDown,
  Sparkles,
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

export default function AdminNarracaoArtigos() {
  const navigate = useNavigate();

  // Estados principais
  const [leis, setLeis] = useState<LeiNarracaoItem[]>([]);
  const [leiSelecionada, setLeiSelecionada] = useState<LeiNarracaoItem | null>(null);
  const [artigos, setArtigos] = useState<ArtigoNarracaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filtros e busca
  const [busca, setBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'faltando' | 'com_audio' | 'todos'>('faltando');

  // Configuração do Google Drive e Cron Job
  const [driveUrl, setDriveUrl] = useState('');
  const [cronAtivo, setCronAtivo] = useState(true);
  const [tempoRestanteSegundos, setTempoRestanteSegundos] = useState(600); // 10 minutos
  const [ultimaExecucao, setUltimaExecucao] = useState<string | null>(null);
  const [logsSync, setLogsSync] = useState<Array<{ hora: string; msg: string; tipo: 'info' | 'sucesso' | 'erro' }>>([]);

  // Player de áudio de prévia
  const [audioTocandoId, setAudioTocandoId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Upload por Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; atual: number } | null>(null);

  // 1. Carrega a lista de leis
  useEffect(() => {
    async function carregarLeis() {
      setLoading(true);
      try {
        const dados = await fetchLeisComMetricasNarracao();
        setLeis(dados);

        // Selecionar o CPP como padrão prioritário (ou a primeira lei)
        const cpp = dados.find(l => l.slug === 'cpp') || dados[0];
        if (cpp) {
          setLeiSelecionada(cpp);
          setDriveUrl(cpp.driveFolderUrl || 'https://drive.google.com/drive/folders/1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4');
        }
      } catch (err) {
        console.error('Erro ao carregar leis:', err);
        toast.error('Erro ao carregar lista de leis.');
      } finally {
        setLoading(false);
      }
    }
    carregarLeis();
  }, []);

  // 2. Carrega artigos da lei selecionada
  useEffect(() => {
    if (!leiSelecionada) return;

    let cancelado = false;
    async function carregarArtigos() {
      setLoadingArtigos(true);
      try {
        const itens = await fetchArtigosDaLeiComNarracao(leiSelecionada!.id);
        if (!cancelado) {
          setArtigos(itens);

          // Atualizar os contadores na lista de leis
          const comAudio = itens.filter(a => a.temAudio).length;
          const pendentes = itens.length - comAudio;
          const perc = itens.length > 0 ? Math.round((comAudio / itens.length) * 100) : 0;

          setLeis(prev =>
            prev.map(l =>
              l.id === leiSelecionada!.id
                ? { ...l, totalArtigos: itens.length, totalComAudio: comAudio, totalPendentes: pendentes, percentual: perc }
                : l
            )
          );
        }
      } catch (err) {
        if (!cancelado) toast.error('Erro ao buscar artigos da lei.');
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

    // Se todos os artigos já tiverem áudio gravado, pausar cron automaticamente
    const pendentes = artigos.filter(a => !a.temAudio).length;
    if (artigos.length > 0 && pendentes === 0) {
      setCronAtivo(false);
      toast.success('🎉 Todos os artigos desta lei foram concluídos! Cron Job finalizado.');
      return;
    }

    const interval = setInterval(() => {
      setTempoRestanteSegundos(prev => {
        if (prev <= 1) {
          // Dispara a sincronização
          executarCicloSincronizacao();
          return 600; // Reinicia para 10 minutos
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cronAtivo, leiSelecionada?.id, artigos]);

  // Função para executar ciclo de sincronização
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
      // Recarregar os artigos para pegar novos áudios que possam ter subido via background ou Drive
      const itens = await fetchArtigosDaLeiComNarracao(leiSelecionada.id);
      setArtigos(itens);

      const comAudio = itens.filter(a => a.temAudio).length;
      const pendentes = itens.length - comAudio;

      setLogsSync(prev => [
        {
          hora: new Date().toLocaleTimeString('pt-BR'),
          msg: `Verificação concluída: ${comAudio} com áudio, ${pendentes} pendentes.`,
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
    toast.success('Link da pasta do Drive salvo para esta lei!');
  };

  // Reprodução de áudio
  const handleTogglePlay = (artigoId: string, url: string | null) => {
    if (!url) return;

    if (audioTocandoId === artigoId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setAudioTocandoId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setAudioTocandoId(null);
      audio.play().catch(() => toast.error('Não foi possível reproduzir este áudio.'));
      setAudioTocandoId(artigoId);
    }
  };

  // Upload de arquivos (por seleção ou Drag & Drop)
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

      // Localizar o artigo correspondente na lei
      const artCorrespondente = artigos.find(a => normalizeArtigoKey(a.numero) === artigoKey);
      if (!artCorrespondente) {
        setLogsSync(prev => [
          {
            hora: new Date().toLocaleTimeString('pt-BR'),
            msg: `Artigo "${artigoKey}" de "${file.name}" não encontrado no banco desta lei.`,
            tipo: 'erro',
          },
          ...prev,
        ]);
        continue;
      }

      // Enviar para o Supabase Storage e vincular
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
        // Atualizar estado em memória
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
      toast.success(`${vinculadosComSucesso} áudio(s) vinculado(s) ao Supabase com sucesso!`);
    }
  };

  // Filtragem dos artigos
  const artigosFiltrados = useMemo(() => {
    return artigos.filter(a => {
      // Filtro de aba
      if (abaAtiva === 'faltando' && a.temAudio) return false;
      if (abaAtiva === 'com_audio' && !a.temAudio) return false;

      // Filtro de busca de texto
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchNum = a.numero.toLowerCase().includes(termo) || a.numeroFormatado.toLowerCase().includes(termo);
        const matchTexto = a.texto.toLowerCase().includes(termo);
        return matchNum || matchTexto;
      }
      return true;
    });
  }, [artigos, abaAtiva, busca]);



  // Formata o cronômetro mm:ss
  const formatTimer = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 font-sans selection:bg-cyan-500/30">
      <PageHeader
        title="Narração de Artigo"
        subtitle="Sincronização contínua de áudios narrados do Drive para o Supabase Storage"
        onBack={() => navigate('/admin-funcoes')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* TOP BAR: Seletor de Lei & Resumo */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Seletor da Lei */}
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" /> Lei em Sincronização
              </label>

              <div className="relative">
                <select
                  value={leiSelecionada?.id || ''}
                  onChange={e => {
                    const sel = leis.find(l => l.id === e.target.value);
                    if (sel) {
                      setLeiSelecionada(sel);
                      setDriveUrl(sel.driveFolderUrl || '');
                      setTempoRestanteSegundos(600);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 hover:border-cyan-500/50 rounded-xl px-4 py-3 text-sm font-medium text-slate-100 appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer"
                >
                  {leis.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nome} ({l.slug.toUpperCase()}) — {l.totalComAudio}/{l.totalArtigos} gravados ({l.percentual}%)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Destaque rápido CPP */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const cpp = leis.find(l => l.slug === 'cpp');
                  if (cpp) {
                    setLeiSelecionada(cpp);
                    setDriveUrl(cpp.driveFolderUrl || 'https://drive.google.com/drive/folders/1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4');
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                  leiSelecionada?.slug === 'cpp'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Processo Penal (CPP)
              </button>
            </div>
          </div>

          {/* Cards de Métricas da Lei */}
          {leiSelecionada && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                <span className="text-xs text-slate-400 block mb-1">Total de Artigos</span>
                <span className="text-2xl font-bold text-white tracking-tight">{artigos.length}</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">artigos reais numerados</span>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3.5">
                <span className="text-xs text-emerald-400 block mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sincronizados
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
                  <Sparkles className="w-3.5 h-3.5" /> Progresso Geral
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-cyan-300 tracking-tight">
                    {artigos.length > 0
                      ? Math.round((artigos.filter(a => a.temAudio).length / artigos.length) * 100)
                      : 0}
                    %
                  </span>
                </div>
                {/* Barra de progresso */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
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
          )}
        </div>

        {/* CONTROLES: Google Drive URL & Cron Job 10 minutos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card: Configuração da Pasta do Drive */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-cyan-400" />
                Pasta do Google Drive com os Áudios
              </h2>
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                >
                  Abrir no Drive <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

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
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-cyan-600/20 whitespace-nowrap"
              >
                Salvar Link
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cole o link da pasta do Google Drive onde os áudios gerados pelo seu processo estão sendo salvos.
              O sistema monitora a cada 10 minutos e baixa novos áudios para o Supabase Storage.
            </p>

            {/* Zona de Upload Direto / Drag & Drop */}
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
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/20'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <UploadCloud className="w-7 h-7 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-medium text-slate-200">
                Arraste arquivos de áudio narrados (.mp3, .wav) para sincronização imediata
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Ou clique para selecionar arquivos da pasta baixada
              </p>
              <label className="inline-block mt-3 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition-colors border border-slate-700">
                Selecionar Áudios
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
                <div className="mt-3 text-xs text-cyan-300 animate-pulse">
                  Enviando {uploadProgress.atual} de {uploadProgress.total} para o Supabase Storage...
                </div>
              )}
            </div>
          </div>

          {/* Card: Cron Job a cada 10 minutos */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Cron Job de Atualização
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
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
                  {cronAtivo ? 'Ativo (10 min)' : 'Pausado'}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center my-3">
                <span className="text-[11px] text-slate-400 block mb-1">Próxima verificação em</span>
                <span className="text-3xl font-mono font-bold text-cyan-400 tracking-wider">
                  {cronAtivo ? formatTimer(tempoRestanteSegundos) : '--:--'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {ultimaExecucao ? `Última checagem: ${ultimaExecucao}` : 'Aguardando primeiro ciclo'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                O cron job roda a cada 10 minutos procurando novos arquivos gerados na pasta.
                Ele para automaticamente assim que todos os artigos forem concluídos.
              </p>
            </div>

            <div className="space-y-2 pt-2">
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
                {cronAtivo ? 'Pausar Temporizador' : 'Retomar Temporizador (10 min)'}
              </button>
            </div>
          </div>
        </div>

        {/* LISTA DE ARTIGOS COM ABAS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Abas */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start">
              <button
                onClick={() => setAbaAtiva('faltando')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  abaAtiva === 'faltando'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Faltando ({artigos.filter(a => !a.temAudio).length})
              </button>

              <button
                onClick={() => setAbaAtiva('com_audio')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  abaAtiva === 'com_audio'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Com Áudio ({artigos.filter(a => a.temAudio).length})
              </button>

              <button
                onClick={() => setAbaAtiva('todos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  abaAtiva === 'todos'
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
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar artigo ou termo..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Listagem */}
          {loadingArtigos ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              <p className="text-xs">Carregando artigos de {leiSelecionada?.nome}...</p>
            </div>
          ) : artigosFiltrados.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/40 mb-2" />
              <p className="text-sm font-medium text-slate-300">Nenhum artigo encontrado nesta categoria</p>
              <p className="text-xs text-slate-500 mt-1">
                {abaAtiva === 'faltando'
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

                    {/* Botão de upload pontual para este artigo */}
                    <label className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 cursor-pointer transition-colors" title="Subir áudio deste artigo manualmente">
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

        {/* LOGS DA SINCRONIZAÇÃO */}
        {logsSync.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400" /> Registro de Atividades da Sincronização
            </h3>
            <div className="bg-slate-950 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1 font-mono text-[11px]">
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
                  <span className="text-slate-600">[{log.hora}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
