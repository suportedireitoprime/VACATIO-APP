import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headphones,
  Download,
  FileSpreadsheet,
  Link as LinkIcon,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Save,
  Search,
  ExternalLink,
  Info,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Code2,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import {
  DEFAULT_PROMPT_TEMPLATE,
  getStoredPromptTemplate,
  savePromptTemplate,
  resetPromptTemplate,
  generatePromptForArticle,
  buildAudioAulasCsv,
  downloadCsvFile,
  getAllAudioAulasConfigs,
  saveAudioAulaLeiConfig,
  isArtigoReal,
  formatArtigoLabel,
  type ArtigoAudioItem,
  type AudioAulaLeiConfig,
} from '@/services/audioAulasService';

interface LeiItem {
  id: string;
  slug: string;
  nome: string;
  nome_curto?: string | null;
  categoria?: string | null;
  total_artigos?: number | null;
}

const DRIVE_ROOT_FOLDER_URL = 'https://drive.google.com/drive/folders/1rsvR4YxmtssBSBf-Ymc3Diwo9P61egfA?usp=sharing';
const DRIVE_ROOT_FOLDER_NAME = 'AUDIO AULAS MUSSE';

export default function AdminAudioAulas() {
  const navigate = useNavigate();

  // Estados de Leis
  const [leis, setLeis] = useState<LeiItem[]>([]);
  const [loadingLeis, setLoadingLeis] = useState(true);
  const [selectedLeiId, setSelectedLeiId] = useState<string>('');
  const [searchLeiTerm, setSearchLeiTerm] = useState('');

  // Alternância da Lista 2: 'exportar' (CSV / Planilha) ou 'links' (Google Drive / Devolvendo ela)
  const [modoAlternancia, setModoAlternancia] = useState<'exportar' | 'links'>('exportar');

  // Estados dos Artigos da Lei Selecionada
  const [artigos, setArtigos] = useState<ArtigoAudioItem[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [searchArtigoTerm, setSearchArtigoTerm] = useState('');

  // Template de Prompt (Lista 1)
  const [promptTemplate, setPromptTemplate] = useState<string>(getStoredPromptTemplate());
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Configuração do Google Drive / Links
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>('');
  const [audioLinks, setAudioLinks] = useState<Record<string, string>>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Modais
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchLinksText, setBatchLinksText] = useState('');
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);

  // Carregar lista de leis ao inicializar
  useEffect(() => {
    async function loadLeis() {
      try {
        setLoadingLeis(true);
        const { data, error } = await supabase
          .from('vade_mecum_leis')
          .select('id, slug, nome, nome_curto, categoria, total_artigos')
          .order('nome', { ascending: true });

        if (error || !data || data.length === 0) {
          const fallbackLeis: LeiItem[] = LEIS_CATALOG.map((l) => ({
            id: l.id,
            slug: l.tabela_nome || l.id,
            nome: l.nome,
            nome_curto: (l as any).sigla || l.nome,
            categoria: l.tipo,
            total_artigos: (l as any).total_artigos || null,
          }));
          setLeis(fallbackLeis);
          if (fallbackLeis.length > 0) setSelectedLeiId(fallbackLeis[0].id);
        } else {
          setLeis(data as LeiItem[]);
          const cp = data.find((l) => l.slug === 'cp' || l.nome?.toLowerCase().includes('código penal'));
          setSelectedLeiId(cp?.id || data[0]?.id || '');
        }
      } catch (err) {
        console.warn('[AdminAudioAulas] Erro ao carregar leis:', err);
      } finally {
        setLoadingLeis(false);
      }
    }

    loadLeis();
  }, []);

  // Lei ativa selecionada
  const activeLei = useMemo(() => {
    return leis.find((l) => l.id === selectedLeiId || l.slug === selectedLeiId) || null;
  }, [leis, selectedLeiId]);

  // Carregar artigos e configurações da lei quando a seleção mudar
  useEffect(() => {
    if (!activeLei) return;

    let isMounted = true;

    async function loadLeiDetails() {
      setLoadingArtigos(true);
      try {
        // Carrega configurações salvas desta lei (Drive Folder e Links)
        const allConfigs = await getAllAudioAulasConfigs();
        const savedConfig = allConfigs[activeLei!.id] || allConfigs[activeLei!.slug];
        if (savedConfig && isMounted) {
          setDriveFolderUrl(savedConfig.driveFolderUrl || '');
          setAudioLinks(savedConfig.audioLinks || {});
        } else if (isMounted) {
          // Pré-preenche com a pasta padrão do Google Drive se ainda não tiver
          setDriveFolderUrl(DRIVE_ROOT_FOLDER_URL);
          setAudioLinks({});
        }

        // Busca todos os artigos desta lei via fetchAllRows
        let loadedArtigos: ArtigoAudioItem[] = [];

        try {
          loadedArtigos = await fetchAllRows<ArtigoAudioItem>(() =>
            supabase
              .from('vade_mecum_artigos')
              .select('id, numero, texto, ordem')
              .eq('lei_id', activeLei!.id)
              .order('ordem', { ascending: true }) as any
          );
        } catch (e) {
          console.warn('[AdminAudioAulas] Falha na busca por id:', e);
        }

        if ((!loadedArtigos || loadedArtigos.length === 0) && activeLei!.slug) {
          try {
            loadedArtigos = await fetchAllRows<ArtigoAudioItem>(() =>
              supabase
                .from('vade_mecum_artigos')
                .select('id, numero, texto, ordem')
                .eq('lei_id', activeLei!.slug)
                .order('ordem', { ascending: true }) as any
            );
          } catch (e) {
            console.warn('[AdminAudioAulas] Falha na busca por slug:', e);
          }
        }

        // Filtra estritamente apenas artigos válidos com texto, descartando títulos e partes
        const cleanArtigos = (loadedArtigos || []).filter(
          (a) => a.texto && a.texto.trim().length > 0 && isArtigoReal(a.numero)
        );

        if (isMounted) {
          setArtigos(cleanArtigos);
        }
      } catch (err: any) {
        if (isMounted) {
          toast.error(`Erro ao carregar artigos: ${err?.message || err}`);
        }
      } finally {
        if (isMounted) {
          setLoadingArtigos(false);
        }
      }
    }

    loadLeiDetails();

    return () => {
      isMounted = false;
    };
  }, [activeLei]);

  // Lista de leis filtradas pela busca
  const filteredLeis = useMemo(() => {
    if (!searchLeiTerm.trim()) return leis;
    const term = searchLeiTerm.toLowerCase();
    return leis.filter(
      (l) =>
        l.nome.toLowerCase().includes(term) ||
        (l.nome_curto && l.nome_curto.toLowerCase().includes(term)) ||
        (l.slug && l.slug.toLowerCase().includes(term))
    );
  }, [leis, searchLeiTerm]);

  // Lista de artigos filtrados pela busca
  const filteredArtigos = useMemo(() => {
    if (!searchArtigoTerm.trim()) return artigos;
    const term = searchArtigoTerm.toLowerCase().replace(/art(igo)?\.?\s*/i, '');
    return artigos.filter((a) => {
      const num = formatArtigoLabel(a.numero).toLowerCase().replace(/art(igo)?\.?\s*/i, '');
      return num.includes(term) || a.texto.toLowerCase().includes(term);
    });
  }, [artigos, searchArtigoTerm]);

  // Estatísticas de links cadastrados
  const totalVinculados = useMemo(() => {
    return artigos.filter((a) => {
      const numLimpo = formatArtigoLabel(a.numero);
      return Boolean(audioLinks[numLimpo] || audioLinks[a.numero] || audioLinks[a.id]);
    }).length;
  }, [artigos, audioLinks]);

  // Exemplo dinâmico para pré-visualização do prompt
  const previewPrompt = useMemo(() => {
    if (!activeLei) return '';
    const sampleArt = artigos[0] || {
      numero: 'Art. 1º',
      texto: 'Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.',
    };
    return generatePromptForArticle({
      numeroArtigo: formatArtigoLabel(sampleArt.numero),
      textoArtigo: sampleArt.texto,
      nomeLei: activeLei.nome,
      template: promptTemplate,
    });
  }, [activeLei, artigos, promptTemplate]);

  // Salvar Template de Prompt
  const handleSavePromptTemplate = () => {
    savePromptTemplate(promptTemplate);
    setIsEditingPrompt(false);
    toast.success('Modelo de Prompt Guia salvo com sucesso!');
  };

  // Restaurar Template Padrão
  const handleResetPromptTemplate = () => {
    const def = resetPromptTemplate();
    setPromptTemplate(def);
    toast.info('Modelo de prompt restaurado para o padrão oficial.');
  };

  // Exportar Planilha CSV (Colunas A, B e C)
  const handleExportCsv = () => {
    if (!activeLei) {
      toast.error('Selecione uma lei para exportar.');
      return;
    }
    if (artigos.length === 0) {
      toast.error('Nenhum artigo disponível para exportação.');
      return;
    }

    try {
      setIsExportingCsv(true);
      const csvContent = buildAudioAulasCsv({
        artigos,
        nomeLei: activeLei.nome,
        template: promptTemplate,
      });

      const safeName = activeLei.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      const fileName = `audio_aulas_${safeName}.csv`;
      downloadCsvFile(fileName, csvContent);
      toast.success(`Planilha CSV gerada! (${artigos.length} artigos com Coluna A: Artigo, B: Texto, C: Prompt)`);
    } catch (err: any) {
      toast.error(`Falha ao exportar CSV: ${err?.message || err}`);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Salvar Links da Lei (Google Drive Folder e Áudios)
  const handleSaveLinks = async () => {
    if (!activeLei) return;
    try {
      setIsSavingConfig(true);
      const config: AudioAulaLeiConfig = {
        leiId: activeLei.id,
        leiNome: activeLei.nome,
        driveFolderUrl: driveFolderUrl.trim(),
        audioLinks,
        updatedAt: new Date().toISOString(),
      };

      await saveAudioAulaLeiConfig(config);
      toast.success('Links do Google Drive salvos com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao salvar configurações: ${err?.message || err}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Atualizar link individual de um artigo
  const handleUpdateAudioLink = (artigoKey: string, url: string) => {
    setAudioLinks((prev) => ({
      ...prev,
      [artigoKey]: url.trim(),
    }));
  };

  // Copiar prompt de um artigo específico
  const handleCopyPrompt = (artigo: ArtigoAudioItem) => {
    if (!activeLei) return;
    const numLimpo = formatArtigoLabel(artigo.numero);
    const p = generatePromptForArticle({
      numeroArtigo: numLimpo,
      textoArtigo: artigo.texto,
      nomeLei: activeLei.nome,
      template: promptTemplate,
    });

    navigator.clipboard.writeText(p);
    setCopiedPromptId(artigo.id);
    toast.success(`Prompt do ${numLimpo} copiado!`);
    setTimeout(() => setCopiedPromptId(null), 2500);
  };

  // Processar importação em lote de links
  const handleProcessBatchLinks = () => {
    if (!batchLinksText.trim()) {
      setIsBatchModalOpen(false);
      return;
    }

    const lines = batchLinksText.split('\n');
    const newLinks = { ...audioLinks };
    let addedCount = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const parts = line.split(/[|\t,;]+/);
      if (parts.length >= 2) {
        let key = parts[0].trim();
        const url = parts.slice(1).join('').trim();
        if (url.startsWith('http')) {
          key = formatArtigoLabel(key);
          newLinks[key] = url;
          addedCount++;
        }
      } else if (line.startsWith('http')) {
        const targetArt = artigos.find((a) => {
          const k = formatArtigoLabel(a.numero);
          return !newLinks[k];
        });
        if (targetArt) {
          const k = formatArtigoLabel(targetArt.numero);
          newLinks[k] = line;
          addedCount++;
        }
      }
    }

    setAudioLinks(newLinks);
    setIsBatchModalOpen(false);
    setBatchLinksText('');
    toast.success(`${addedCount} link(s) associado(s)! Clique em "Salvar Alterações" para confirmar.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-28">
      {/* Header com estilo padrão do VACATIO */}
      <PageHeader
        title="Geração de Áudio Aulas"
        subtitle="Prompt de guia institucional, exportador de planilhas e gestão do Google Drive"
        onBack={() => navigate('/admin-funcoes')}
        variant="dark"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Banner do Google Drive Conectado */}
        <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-slate-900/60 to-black p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Pasta Google Drive Conectada</h3>
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[11px] font-mono">
                  {DRIVE_ROOT_FOLDER_NAME}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pastas de leis (Códigos, Estatutos, CF) e planilhas integradas diretamente ao seu Google Drive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <a
              href={DRIVE_ROOT_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-semibold transition-all hover:scale-105"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir no Google Drive
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScriptModalOpen(true)}
              className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl text-xs h-9"
            >
              <Code2 className="w-3.5 h-3.5 mr-1 text-sky-400" />
              Script do Google Drive
            </Button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════════
            LISTA 1: PROMPT DE GUIA PADRÃO
        ════════════════════════════════════════════════════════════════════════════ */}
        <Card className="border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-lg font-bold text-white font-sans tracking-normal">
                  Prompt de Guia Padrão (Para Todas as Aulas)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Prompt oficial que instrui a IA geradora a estruturar a aula de cada artigo
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(promptTemplate);
                  toast.success('Prompt de Guia padrão copiado com sucesso!');
                }}
                className="text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-xl h-8"
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Prompt
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                className="text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-8"
              >
                {isEditingPrompt ? 'Fechar Editor' : 'Personalizar Modelo'}
              </Button>
            </div>
          </div>

          {/* Destaques das Regras Oficiais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs">
              <span className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5 font-sans">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saudações Obrigatórias
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Acolhe estudantes e advogados com entusiasmo motivador e didática clara.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-xs">
              <span className="font-semibold text-rose-400 mb-1 flex items-center gap-1.5 font-sans">
                <AlertCircle className="w-3.5 h-3.5" /> Proibido Nome de Locutor
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                NÃO cita nem inventa nomes pessoais de apresentadores (voz institucional).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/20 text-xs">
              <span className="font-semibold text-sky-400 mb-1 flex items-center gap-1.5 font-sans">
                <Headphones className="w-3.5 h-3.5" /> Marca Institucional
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Cita obrigatoriamente: <em>"mais uma áudio-aula do VACATIO Vade Mecum"</em>.
              </p>
            </div>
          </div>

          {/* Editor de Prompt (Expansível) */}
          {isEditingPrompt && (
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Variáveis automáticas: <code>{`{NUMERO_ARTIGO}`}</code>, <code>{`{NOME_LEI}`}</code>, <code>{`{TEXTO_ARTIGO}`}</code></span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetPromptTemplate}
                    className="text-[11px] text-slate-400 hover:text-white h-7 px-2"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Restaurar Padrão
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePromptTemplate}
                    className="bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-semibold h-7 px-3 rounded-lg"
                  >
                    <Save className="w-3 h-3 mr-1" /> Salvar Modelo
                  </Button>
                </div>
              </div>
              <Textarea
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                rows={8}
                className="bg-black/60 border-white/10 text-slate-100 font-mono text-xs rounded-xl focus:border-sky-500 custom-scrollbar leading-relaxed"
              />
            </div>
          )}

          {/* Prévia do Prompt Real */}
          <div className="bg-black/50 border border-white/5 rounded-2xl p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar leading-relaxed">
            {previewPrompt}
          </div>
        </Card>

        {/* ════════════════════════════════════════════════════════════════════════════
            LISTA 2: LEIS (COM ALTERNÂNCIA: EXPORTAR PLANILHAS VS LINKS DO DRIVE)
        ════════════════════════════════════════════════════════════════════════════ */}
        <Card className="border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="text-lg font-bold text-white font-sans tracking-normal">
                  Catálogo de Leis
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Selecione a lei e use a alternância entre exportar planilhas ou gerenciar links do Drive
              </p>
            </div>

            {/* ALTERNÂNCIA (TOGGLE) SOLICITADA */}
            <div className="bg-black/60 border border-white/10 p-1 rounded-2xl flex items-center gap-1 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setModoAlternancia('exportar')}
                className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  modoAlternancia === 'exportar'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Exportar Planilha (CSV)
              </button>
              <button
                type="button"
                onClick={() => setModoAlternancia('links')}
                className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  modoAlternancia === 'links'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Links do Drive (Devolvendo Ela)
              </button>
            </div>
          </div>

          {/* Seleção de Leis em Carrossel / Grade */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Filtrar lei (ex: Penal, CPC, CLT, CF)..."
                  value={searchLeiTerm}
                  onChange={(e) => setSearchLeiTerm(e.target.value)}
                  className="pl-8 bg-black/40 border-white/10 text-white text-xs h-9 rounded-xl placeholder:text-slate-500"
                />
              </div>

              {activeLei && (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Selecionada:</span>
                  <span className="font-bold text-sky-300">{activeLei.nome}</span>
                  <Badge variant="outline" className="border-sky-500/30 text-sky-300 text-[11px]">
                    {loadingArtigos ? 'Carregando...' : `${artigos.length} artigos reais`}
                  </Badge>
                </div>
              )}
            </div>

            {/* Pílulas de Leis */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {loadingLeis ? (
                <div className="text-xs text-slate-400 py-2">Carregando catálogo de leis...</div>
              ) : (
                filteredLeis.map((lei) => {
                  const isSelected = activeLei?.id === lei.id;
                  return (
                    <button
                      key={lei.id}
                      type="button"
                      onClick={() => setSelectedLeiId(lei.id)}
                      className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all border ${
                        isSelected
                          ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/20'
                          : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {lei.nome_curto || lei.nome}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════════════
              ALTERNÂNCIA MODO A: EXPORTAÇÃO CSV / PLANILHAS
          ════════════════════════════════════════════════════════════════════════ */}
          {modoAlternancia === 'exportar' && (
            <div className="space-y-6 pt-2">
              <div className="p-6 rounded-3xl bg-black/40 border border-white/10 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-sans">
                    Exportar Planilha de Áudio-Aulas da Lei: {activeLei?.nome}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1">
                    Arquivo formatado exatamente com as 3 colunas solicitadas para alimentar NotebookLM, ElevenLabs ou Podcasts IA:
                  </p>
                </div>

                <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-1">
                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10">
                    <Badge variant="secondary" className="mb-1 text-[10px] font-mono bg-sky-500/20 text-sky-300">
                      Coluna A
                    </Badge>
                    <p className="font-semibold text-xs text-white">Número do Artigo</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Ex: <code>Art. 1º</code> (sem títulos/partes)</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10">
                    <Badge variant="secondary" className="mb-1 text-[10px] font-mono bg-sky-500/20 text-sky-300">
                      Coluna B
                    </Badge>
                    <p className="font-semibold text-xs text-white">Texto do Artigo</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Caput e parágrafos completos</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10">
                    <Badge variant="secondary" className="mb-1 text-[10px] font-mono bg-sky-500/20 text-sky-300">
                      Coluna C
                    </Badge>
                    <p className="font-semibold text-xs text-white">Prompt de Guia</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Prompt institucional completo</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="lg"
                    disabled={isExportingCsv || loadingArtigos || artigos.length === 0}
                    onClick={handleExportCsv}
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold px-8 py-5 rounded-2xl shadow-xl shadow-sky-500/20 transition-all hover:scale-[1.02] text-sm gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {isExportingCsv ? 'Gerando...' : `Baixar Planilha CSV (${artigos.length} Artigos)`}
                  </Button>

                  <a
                    href={DRIVE_ROOT_FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                  >
                    <FolderOpen className="w-4 h-4 text-sky-400" />
                    Abrir Pasta no Google Drive
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              ALTERNÂNCIA MODO B: LINKS DO GOOGLE DRIVE (DEVOLVENDO ELA)
          ════════════════════════════════════════════════════════════════════════ */}
          {modoAlternancia === 'links' && (
            <div className="space-y-5 pt-2">
              {/* Campo para devolver a planilha/pasta da lei no Drive */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <label className="text-xs font-semibold text-sky-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-sky-400" />
                    Link da Pasta / Planilha do Google Drive ("Devolvendo Ela"):
                  </span>
                  {driveFolderUrl && (
                    <a
                      href={driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                    >
                      Abrir Link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Cole aqui o link do Google Drive para esta lei..."
                    value={driveFolderUrl}
                    onChange={(e) => setDriveFolderUrl(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs rounded-xl h-10 font-mono"
                  />
                  <Button
                    onClick={handleSaveLinks}
                    disabled={isSavingConfig}
                    className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold px-4 shrink-0"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Salvar
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Esse link é exibido diretamente para o aluno na tela de Áudio-Aulas do aplicativo.
                </p>
              </div>

              {/* Tabela de Artigos com Links dos Áudios */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Buscar artigo..."
                      value={searchArtigoTerm}
                      onChange={(e) => setSearchArtigoTerm(e.target.value)}
                      className="pl-8 bg-black/40 border-white/10 text-white text-xs h-9 rounded-xl"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBatchModalOpen(true)}
                      className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl text-xs h-9"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" /> Colar em Lote
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveLinks}
                      disabled={isSavingConfig}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold h-9 px-4"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" /> Salvar Alterações
                    </Button>
                  </div>
                </div>

                <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/30">
                  <div className="max-h-[460px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
                    {loadingArtigos ? (
                      <div className="py-12 text-center text-slate-400 text-xs">Carregando artigos da lei...</div>
                    ) : filteredArtigos.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">Nenhum artigo encontrado.</div>
                    ) : (
                      filteredArtigos.map((art) => {
                        const numLimpo = formatArtigoLabel(art.numero);
                        const currentLink = audioLinks[numLimpo] || audioLinks[art.numero] || '';
                        const hasAudio = Boolean(currentLink);

                        return (
                          <div
                            key={art.id}
                            className="p-3.5 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-xs sm:text-sm text-sky-400">
                                  {numLimpo}
                                </span>
                                {hasAudio ? (
                                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0">
                                    Áudio Vinculado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-white/10 text-slate-500 text-[10px] py-0">
                                    Sem áudio
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {art.texto}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyPrompt(art)}
                                className="text-xs text-slate-400 hover:text-white h-8 px-2 rounded-lg shrink-0"
                                title="Copiar prompt para gerar áudio deste artigo"
                              >
                                {copiedPromptId === art.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 mr-1" />
                                )}
                                <span className="text-[11px]">Prompt</span>
                              </Button>

                              <Input
                                placeholder="Link do arquivo no Google Drive..."
                                value={currentLink}
                                onChange={(e) => handleUpdateAudioLink(numLimpo, e.target.value)}
                                className="bg-black/50 border-white/10 text-xs text-slate-200 h-8 w-full md:w-72 rounded-lg font-mono placeholder:text-slate-600"
                              />

                              {currentLink && (
                                <a
                                  href={currentLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sky-400 shrink-0"
                                  title="Abrir no Google Drive"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* MODAL 1: COLAR LINKS EM LOTE */}
      <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-sky-400" />
              Colar Links do Google Drive em Lote
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cole uma lista com o número do artigo e o link do áudio no Google Drive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-sky-300">Formatos aceitos (1 por linha):</p>
              <p><code>Art. 1º | https://drive.google.com/file/d/...</code></p>
              <p><code>1 | https://drive.google.com/file/d/...</code></p>
            </div>

            <Textarea
              rows={8}
              placeholder={`Art. 1º | https://drive.google.com/file/d/xxx/view\nArt. 2º | https://drive.google.com/file/d/yyy/view`}
              value={batchLinksText}
              onChange={(e) => setBatchLinksText(e.target.value)}
              className="bg-black/50 border-white/10 text-white font-mono text-xs rounded-xl custom-scrollbar"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsBatchModalOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProcessBatchLinks}
              className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl"
            >
              Processar e Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: SCRIPT DO GOOGLE APPS SCRIPT */}
      <Dialog open={isScriptModalOpen} onOpenChange={setIsScriptModalOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-sky-400" />
              Google Apps Script — Automação Direta no Google Drive
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Crie pastas e Google Planilhas nativas automaticamente na pasta <strong>{DRIVE_ROOT_FOLDER_NAME}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/20 space-y-1.5">
              <p className="font-semibold text-sky-200">Como executar em 3 passos:</p>
              <ol className="list-decimal pl-4 space-y-1 text-slate-300">
                <li>Acesse <strong>script.google.com</strong> e clique em <em>Novo Projeto</em>.</li>
                <li>Cole o código abaixo e clique em <em>Salvar</em> (ícone do disquete).</li>
                <li>Selecione a função <code>gerarEstruturaEPlanilhasNoDrive</code> e clique em <strong>Executar</strong>.</li>
              </ol>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  fetch('/GOOGLE_APPS_SCRIPT_AUDIO_AULAS.js')
                    .then((r) => r.text())
                    .then((txt) => {
                      navigator.clipboard.writeText(txt);
                      toast.success('Script copiado para a área de transferência!');
                    })
                    .catch(() => {
                      toast.info('Arquivo disponível na raiz: GOOGLE_APPS_SCRIPT_AUDIO_AULAS.js');
                    });
                }}
                className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl"
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copiar Script Completo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
