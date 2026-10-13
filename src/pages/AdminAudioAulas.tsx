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
  HelpCircle,
  Upload,
  Play,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  formatDriveStreamUrl,
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

export default function AdminAudioAulas() {
  const navigate = useNavigate();

  // Estados de Leis
  const [leis, setLeis] = useState<LeiItem[]>([]);
  const [loadingLeis, setLoadingLeis] = useState(true);
  const [selectedLeiId, setSelectedLeiId] = useState<string>('');
  const [searchLeiTerm, setSearchLeiTerm] = useState('');

  // Estados dos Artigos da Lei Selecionada
  const [artigos, setArtigos] = useState<ArtigoAudioItem[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [searchArtigoTerm, setSearchArtigoTerm] = useState('');

  // Template de Prompt
  const [promptTemplate, setPromptTemplate] = useState<string>(getStoredPromptTemplate());
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Configuração do Google Drive / Links
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>('');
  const [audioLinks, setAudioLinks] = useState<Record<string, string>>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Modal de Lote de Links
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchLinksText, setBatchLinksText] = useState('');

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
          // Fallback para LEIS_CATALOG local
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
          // Prioriza Código Penal como padrão se existir
          const cp = data.find((l) => l.slug?.includes('penal') || l.nome?.toLowerCase().includes('código penal'));
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
        // 1. Carrega configurações salvas desta lei (Drive Folder e Links)
        const allConfigs = await getAllAudioAulasConfigs();
        const savedConfig = allConfigs[activeLei!.id] || allConfigs[activeLei!.slug];
        if (savedConfig && isMounted) {
          setDriveFolderUrl(savedConfig.driveFolderUrl || '');
          setAudioLinks(savedConfig.audioLinks || {});
        } else if (isMounted) {
          setDriveFolderUrl('');
          setAudioLinks({});
        }

        // 2. Busca todos os artigos desta lei via fetchAllRows
        let loadedArtigos: ArtigoAudioItem[] = [];

        // Tenta por lei_id = activeLei.id
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

        // Se veio vazio, tenta por activeLei.slug
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

        // Filtrar apenas artigos válidos com texto
        const cleanArtigos = (loadedArtigos || []).filter(
          (a) => a.texto && a.texto.trim().length > 0
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
      const num = a.numero.toLowerCase().replace(/art(igo)?\.?\s*/i, '');
      return num.includes(term) || a.texto.toLowerCase().includes(term);
    });
  }, [artigos, searchArtigoTerm]);

  // Estatísticas de links cadastrados
  const totalVinculados = useMemo(() => {
    return artigos.filter((a) => {
      const numLimpo = a.numero?.startsWith('Art.') ? a.numero : `Art. ${a.numero}`;
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
      numeroArtigo: sampleArt.numero,
      textoArtigo: sampleArt.texto,
      nomeLei: activeLei.nome,
      template: promptTemplate,
    });
  }, [activeLei, artigos, promptTemplate]);

  // Salvar Template de Prompt
  const handleSavePromptTemplate = () => {
    savePromptTemplate(promptTemplate);
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
      toast.success(`Planilha CSV gerada com sucesso! (${artigos.length} artigos com 3 colunas)`);
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
    const numLimpo = artigo.numero.startsWith('Art.') ? artigo.numero : `Art. ${artigo.numero}`;
    const p = generatePromptForArticle({
      numeroArtigo: numLimpo,
      textoArtigo: artigo.texto,
      nomeLei: activeLei.nome,
      template: promptTemplate,
    });

    navigator.clipboard.writeText(p);
    setCopiedPromptId(artigo.id);
    toast.success(`Prompt do ${numLimpo} copiado para a área de transferência!`);
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

      // Formatos suportados:
      // 1. Art. 1º | https://...
      // 2. 1 | https://...
      // 3. Art. 1º \t https://...
      // 4. Apenas https://... (associa em ordem aos artigos sem link)
      const parts = line.split(/[|\t,;]+/);
      if (parts.length >= 2) {
        let key = parts[0].trim();
        const url = parts.slice(1).join('').trim();
        if (url.startsWith('http')) {
          if (!key.toLowerCase().startsWith('art')) {
            key = `Art. ${key}`;
          }
          newLinks[key] = url;
          addedCount++;
        }
      } else if (line.startsWith('http')) {
        // URL direta: associa ao primeiro artigo ainda sem link
        const targetArt = artigos.find((a) => {
          const k = a.numero.startsWith('Art.') ? a.numero : `Art. ${a.numero}`;
          return !newLinks[k];
        });
        if (targetArt) {
          const k = targetArt.numero.startsWith('Art.') ? targetArt.numero : `Art. ${targetArt.numero}`;
          newLinks[k] = line;
          addedCount++;
        }
      }
    }

    setAudioLinks(newLinks);
    setIsBatchModalOpen(false);
    setBatchLinksText('');
    toast.success(`${addedCount} link(s) associado(s) com sucesso! Clique em "Salvar Alterações" para confirmar.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-28">
      {/* Header com estilo padrão do VACATIO */}
      <PageHeader
        title="Geração de Áudio Aulas"
        subtitle="Prompts guias institucionais, exportador CSV em 3 colunas e vinculação com Google Drive"
        onBack={() => navigate('/admin-funcoes')}
        variant="dark"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Banner Explicativo de Boas Práticas */}
        <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="font-semibold text-sky-200 text-base flex items-center gap-2">
              Fluxo Oficial de Áudio-Aulas
              <Badge variant="outline" className="text-xs border-sky-500/40 text-sky-300">
                VACATIO Vade Mecum
              </Badge>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              1. Selecione a <strong>Lei</strong> desejada &bull; 2. Baixe a <strong>Planilha CSV</strong> (Coluna A: Artigo, Coluna B: Texto, Coluna C: Prompt de Guia com as regras oficiais) &bull; 3. Use na plataforma geradora de áudio (ex: NotebookLM, ElevenLabs, Podcasts IA) &bull; 4. Cole o link da pasta do <strong>Google Drive</strong> e dos áudios para disponibilizar aos estudantes no aplicativo.
            </p>
          </div>
        </div>

        {/* 1. SELETOR DE LEI */}
        <Card className="border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                1. Seleção da Lei no Banco
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Escolha a legislação que terá seus artigos e prompts exportados
              </p>
            </div>

            <div className="w-full md:w-72 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Filtrar lei (ex: Penal, CPC, CLT)..."
                value={searchLeiTerm}
                onChange={(e) => setSearchLeiTerm(e.target.value)}
                className="pl-9 bg-black/40 border-white/10 text-white placeholder:text-slate-500 h-9 rounded-xl text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Grid de Seleção de Leis */}
          <div className="mt-4 max-h-48 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {loadingLeis ? (
              <div className="py-8 text-center text-slate-400 text-sm">Carregando catálogo de leis...</div>
            ) : filteredLeis.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">Nenhuma lei encontrada com essa busca.</div>
            ) : (
              filteredLeis.map((lei) => {
                const isSelected = activeLei?.id === lei.id;
                return (
                  <button
                    key={lei.id}
                    type="button"
                    onClick={() => setSelectedLeiId(lei.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/50 text-sky-100 shadow-md shadow-sky-500/10'
                        : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05] hover:border-white/10'
                    }`}
                  >
                    <div className="truncate flex-1">
                      <p className="font-medium text-xs sm:text-sm truncate">{lei.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lei.categoria && (
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {lei.categoria}
                          </span>
                        )}
                        {lei.nome_curto && (
                          <span className="text-[10px] text-sky-400/80 font-mono">
                            ({lei.nome_curto})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isSelected ? (
                        <Badge className="bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-semibold gap-1">
                          <Check className="w-3 h-3" /> Selecionada
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-500">Selecionar</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Detalhes da Lei Ativa */}
          {activeLei && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
              <div>
                <p className="text-xs text-slate-400">Lei Ativa:</p>
                <p className="font-semibold text-sm text-sky-300">{activeLei.nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-sky-500/30 text-sky-300 text-xs py-1">
                  {loadingArtigos ? 'Carregando artigos...' : `${artigos.length} artigos carregados`}
                </Badge>
                {totalVinculados > 0 && (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs py-1">
                    {totalVinculados} com áudio no Drive
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* TABS PRINCIPAIS: PROMPT GUIA / EXPORTAÇÃO CSV / GESTÃO DO DRIVE */}
        <Tabs defaultValue="prompt" className="space-y-4">
          <TabsList className="bg-slate-900/80 border border-white/10 p-1 rounded-2xl grid grid-cols-3 w-full">
            <TabsTrigger
              value="prompt"
              className="data-[state=active]:bg-sky-500 data-[state=active]:text-white rounded-xl text-xs sm:text-sm font-medium transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Prompt Guia
            </TabsTrigger>
            <TabsTrigger
              value="csv"
              className="data-[state=active]:bg-sky-500 data-[state=active]:text-white rounded-xl text-xs sm:text-sm font-medium transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              Exportar CSV
            </TabsTrigger>
            <TabsTrigger
              value="drive"
              className="data-[state=active]:bg-sky-500 data-[state=active]:text-white rounded-xl text-xs sm:text-sm font-medium transition-all"
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
              Google Drive & Links
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PROMPT GUIA */}
          <TabsContent value="prompt" className="space-y-4">
            <Card className="border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    Regras Obrigatórias do Prompt da Áudio-Aula
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Instruções injetadas automaticamente na Coluna C da planilha para a IA geradora
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetPromptTemplate}
                    className="text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-8"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Restaurar Padrão
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePromptTemplate}
                    className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-8 text-xs font-semibold"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Salvar Modelo
                  </Button>
                </div>
              </div>

              {/* Destaques das Regras Solicitadas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs">
                  <span className="font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saudações Obrigatórias
                  </span>
                  Inicia acolhendo estudantes e advogados com entusiasmo profissional.
                </div>
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs">
                  <span className="font-semibold text-rose-400 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Proibido Nome de Locutor
                  </span>
                  NUNCA cita nem inventa nomes pessoais de apresentadores.
                </div>
                <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/20 text-xs">
                  <span className="font-semibold text-sky-400 mb-1 flex items-center gap-1">
                    <Headphones className="w-3.5 h-3.5" /> Marca Institucional
                  </span>
                  Cita obrigatoriamente: <em>"mais uma áudio-aula do VACATIO Vade Mecum"</em>.
                </div>
              </div>

              {/* Editor do Template */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Modelo de Prompt Guia (tags aceitas: <code>{`{NUMERO_ARTIGO}`}</code>, <code>{`{NOME_LEI}`}</code>, <code>{`{TEXTO_ARTIGO}`}</code>):</span>
                </div>
                <Textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  rows={9}
                  className="bg-black/40 border-white/10 text-slate-100 font-mono text-xs sm:text-sm rounded-xl focus:border-sky-500 custom-scrollbar leading-relaxed"
                />
              </div>

              {/* Prévia com o Artigo 1 */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Prévia Real do Prompt (Artigo de Exemplo)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(previewPrompt);
                      toast.success('Prévia do prompt copiada!');
                    }}
                    className="text-xs text-slate-400 hover:text-white h-7 rounded-lg"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copiar Prévia
                  </Button>
                </div>
                <div className="bg-black/60 border border-white/5 rounded-xl p-3.5 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar leading-relaxed">
                  {previewPrompt}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: EXPORTAÇÃO CSV */}
          <TabsContent value="csv" className="space-y-4">
            <Card className="border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 sm:p-6 rounded-2xl shadow-xl text-center space-y-6">
              <div className="max-w-xl mx-auto space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Exportar Planilha de Áudio-Aulas (.CSV)
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Gere o arquivo CSV formatado estritamente de acordo com as instruções:
                </p>
              </div>

              {/* Tabela de Especificação das 3 Colunas */}
              <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <Badge variant="secondary" className="mb-1.5 text-[10px] font-mono bg-sky-500/20 text-sky-300">
                    Coluna A
                  </Badge>
                  <p className="font-semibold text-xs text-white">Número do Artigo</p>
                  <p className="text-[11px] text-slate-400 mt-1">Ex: <code>Art. 1º</code>, <code>Art. 2º</code></p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <Badge variant="secondary" className="mb-1.5 text-[10px] font-mono bg-sky-500/20 text-sky-300">
                    Coluna B
                  </Badge>
                  <p className="font-semibold text-xs text-white">Texto do Artigo</p>
                  <p className="text-[11px] text-slate-400 mt-1">Caput e parágrafos completos da lei</p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <Badge variant="secondary" className="mb-1.5 text-[10px] font-mono bg-sky-500/20 text-sky-300">
                    Coluna C
                  </Badge>
                  <p className="font-semibold text-xs text-white">Prompt em Texto</p>
                  <p className="text-[11px] text-slate-400 mt-1">Prompt pronto para colar na IA geradora</p>
                </div>
              </div>

              {/* Botão de Download em Destaque */}
              <div className="pt-2">
                <Button
                  size="lg"
                  disabled={isExportingCsv || loadingArtigos || artigos.length === 0}
                  onClick={handleExportCsv}
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold px-8 py-6 rounded-2xl shadow-xl shadow-sky-500/20 transition-all hover:scale-[1.02] text-base gap-2"
                >
                  <Download className="w-5 h-5" />
                  {isExportingCsv
                    ? 'Gerando Planilha...'
                    : `Baixar Planilha CSV (${artigos.length} Artigos)`}
                </Button>
                <p className="text-xs text-slate-400 mt-2">
                  Codificação UTF-8 com BOM inclusa (abre perfeitamente no Excel e Google Sheets sem corromper acentos)
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: GOOGLE DRIVE & LINKS */}
          <TabsContent value="drive" className="space-y-4">
            <Card className="border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-xl space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-sky-400" />
                  Gerenciador de Links do Google Drive
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vincule a pasta geral do Google Drive e os links individuais das áudio-aulas gravadas
                </p>
              </div>

              {/* 1. Link Geral da Pasta do Google Drive da Lei */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <label className="text-xs font-semibold text-sky-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-sky-400" />
                    Link da Pasta Geral no Google Drive (Desta Lei)
                  </span>
                  {driveFolderUrl && (
                    <a
                      href={driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                    >
                      Abrir Pasta no Drive <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Cole aqui o link da pasta do Google Drive: https://drive.google.com/drive/folders/..."
                    value={driveFolderUrl}
                    onChange={(e) => setDriveFolderUrl(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs sm:text-sm rounded-xl h-10"
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
                  Os estudantes poderão abrir a pasta completa com 1 clique direto no aplicativo.
                </p>
              </div>

              {/* 2. Barra de Ações Rápidas por Artigo */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
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

              {/* 3. Tabela de Artigos com Links Individuais */}
              <div className="border border-white/5 rounded-xl overflow-hidden bg-black/30">
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
                  {loadingArtigos ? (
                    <div className="py-12 text-center text-slate-400 text-xs">Carregando artigos da lei...</div>
                  ) : filteredArtigos.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">Nenhum artigo encontrado.</div>
                  ) : (
                    filteredArtigos.map((art) => {
                      const numLimpo = art.numero.startsWith('Art.') ? art.numero : `Art. ${art.numero}`;
                      const currentLink = audioLinks[numLimpo] || audioLinks[art.numero] || '';
                      const hasAudio = Boolean(currentLink);

                      return (
                        <div
                          key={art.id}
                          className="p-3 sm:p-4 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                        >
                          {/* Info do Artigo */}
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

                          {/* Ações e Input do Link */}
                          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                            {/* Botão Copiar Prompt */}
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

                            {/* Campo Link do Drive / Áudio */}
                            <Input
                              placeholder="Link do áudio no Google Drive..."
                              value={currentLink}
                              onChange={(e) => handleUpdateAudioLink(numLimpo, e.target.value)}
                              className="bg-black/50 border-white/10 text-xs text-slate-200 h-8 w-full md:w-72 rounded-lg font-mono placeholder:text-slate-600"
                            />

                            {/* Botão Testar Link */}
                            {currentLink && (
                              <a
                                href={currentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sky-400 shrink-0"
                                title="Abrir link do Drive"
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
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL DE IMPORTAÇÃO EM LOTE DE LINKS */}
      <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-sky-400" />
              Colar Links do Google Drive em Lote
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cole uma lista com o número do artigo e a URL do áudio no Google Drive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-sky-300">Formatos aceitos (1 por linha):</p>
              <p><code>Art. 1º | https://drive.google.com/file/d/...</code></p>
              <p><code>1 | https://drive.google.com/file/d/...</code></p>
              <p>Ou apenas cole links diretos em ordem sequencial.</p>
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
    </div>
  );
}
