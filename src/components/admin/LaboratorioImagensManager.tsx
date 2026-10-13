import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Download, 
  Upload, 
  FileArchive, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Trash2, 
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  RefreshCw,
  FolderArchive,
  ChevronDown,
  ChevronUp,
  Palette,
  Layers,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { SLIDES_ART1_RICOS, SlideLaboratorioRico } from '@/data/slidesLaboratorioArtigo1';
import { PROMPT_BASE_PADRAO_DESIGN } from '@/utils/promptDesignJuridico';

interface LaboratorioImagensManagerProps {
  imagens: Record<string, string>;
  onAtualizarImagens: (novasImagens: Record<string, string>) => void;
}

export const LaboratorioImagensManager: React.FC<LaboratorioImagensManagerProps> = ({
  imagens,
  onAtualizarImagens,
}) => {
  const [processandoZip, setProcessandoZip] = useState(false);
  const [progressoZip, setProgressoZip] = useState<string>('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [copiouFilaCompleta, setCopiouFilaCompleta] = useState(false);
  const [mostrarPromptBase, setMostrarPromptBase] = useState(false);
  const [apenasCenasRepresentativas, setApenasCenasRepresentativas] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const [slideParaTrocaAvulsa, setSlideParaTrocaAvulsa] = useState<string | null>(null);

  // Slides que possuem imagem representativa (Capa, Exemplos Práticos, Troféu)
  const slidesComImagem = SLIDES_ART1_RICOS.filter(s => s.temImagemRepresentativa !== false && !!s.imagePrompt);
  const slidesExibidos = apenasCenasRepresentativas ? slidesComImagem : SLIDES_ART1_RICOS;

  // Total de imagens carregadas entre as representativas
  const totalCarregadas = slidesComImagem.filter(s => !!imagens[s.id]).length;
  const porcentagem = Math.round((totalCarregadas / slidesComImagem.length) * 100);

  // 1. Função para Baixar CSV de Prompts
  const handleBaixarCsv = () => {
    try {
      const cabecalhos = [
        'Ordem',
        'Nome_Arquivo_Esperado',
        'Slide_ID',
        'Tipo_Slide',
        'Titulo',
        'Prompt_Completo_Google_Flow',
        'Prompt_Cena_Portugues',
        'Descricao_Cena'
      ];

      const linhas = slidesComImagem.map((slide, idx) => {
        // Escapar aspas para CSV
        const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
        const nomeArquivo = slide.nomeArquivo || `slide_${String(idx + 1).padStart(2, '0')}.jpg`;
        return [
          idx + 1,
          nomeArquivo,
          slide.id,
          escapeCsv(slide.badge),
          escapeCsv(slide.titulo),
          escapeCsv(slide.imagePrompt || ''),
          escapeCsv(slide.imagePromptPt || ''),
          escapeCsv(slide.descricaoCena || '')
        ].join(',');
      });

      // Inclui BOM UTF-8 para abrir perfeitamente no Excel sem quebrar acentos
      const csvContent = '\uFEFF' + [cabecalhos.join(','), ...linhas].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'prompts_cenas_artigo_1_cp_flow.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Planilha CSV baixada com os ${slidesComImagem.length} prompts das cenas principais!`);
    } catch (err) {
      console.error('Erro ao gerar CSV:', err);
      toast.error('Erro ao gerar CSV de prompts.');
    }
  };

  // 2. Copiar Fila das Cenas Representativas para o Google Flow
  const handleCopiarFilaCompleta = () => {
    try {
      const listaPrompts = slidesComImagem.map(s => s.imagePrompt).filter(Boolean);
      const textoFinal = JSON.stringify(listaPrompts, null, 2);
      navigator.clipboard.writeText(textoFinal);
      setCopiouFilaCompleta(true);
      toast.success(`${slidesComImagem.length} prompts de cenas representativas copiados para o Google Flow!`);
      setTimeout(() => setCopiouFilaCompleta(false), 3000);
    } catch (err) {
      toast.error('Erro ao copiar prompts da fila.');
    }
  };

  // 3. Função para Processar Arquivo .ZIP
  const handleProcessarZip = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Por favor, envie um arquivo com extensão .zip');
      return;
    }

    setProcessandoZip(true);
    setProgressoZip('Lendo arquivo .zip...');

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const novasImagens: Record<string, string> = { ...imagens };
      let contagem = 0;

      // Filtrar arquivos de imagem dentro do zip (ignorando pastas e __MACOSX)
      const entradasValidas = Object.keys(zipContent.files).filter(caminho => {
        const item = zipContent.files[caminho];
        if (item.dir) return false;
        if (caminho.includes('__MACOSX') || caminho.startsWith('.')) return false;
        const ext = caminho.toLowerCase();
        return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp');
      });

      if (entradasValidas.length === 0) {
        toast.error('Nenhuma imagem (.jpg, .png, .webp) encontrada dentro do arquivo .zip!');
        setProcessandoZip(false);
        return;
      }

      setProgressoZip(`Extraindo ${entradasValidas.length} imagens...`);

      // Ordenar entradas para fallback numérico/alfabético
      entradasValidas.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      for (let idx = 0; idx < entradasValidas.length; idx++) {
        const caminho = entradasValidas[idx];
        const zipFile = zipContent.files[caminho];
        const nomeLimpo = caminho.split('/').pop()?.toLowerCase() || '';

        // Tenta encontrar o slide correspondente entre os slides que usam imagem
        let slideAlvo: SlideLaboratorioRico | undefined;

        for (let sIdx = 0; sIdx < slidesComImagem.length; sIdx++) {
          const s = slidesComImagem[sIdx];
          const numStr = String(sIdx + 1).padStart(2, '0');
          const numSimples = String(sIdx + 1);
          const nomeEsp = (s.nomeArquivo || '').toLowerCase();

          if (
            (nomeEsp && nomeLimpo.includes(nomeEsp)) ||
            nomeLimpo.includes(`slide_${numStr}`) ||
            nomeLimpo.includes(`slide_${numSimples}`) ||
            nomeLimpo.startsWith(`${numStr}.`) ||
            nomeLimpo.startsWith(`${numSimples}.`) ||
            nomeLimpo.startsWith(`${numStr}_`) ||
            nomeLimpo.startsWith(`${numSimples}_`)
          ) {
            slideAlvo = s;
            break;
          }
        }

        // Fallback: se ainda não achou, associa pela ordem alfabética da lista de cenas
        if (!slideAlvo && idx < slidesComImagem.length) {
          slideAlvo = slidesComImagem[idx];
        }

        if (slideAlvo) {
          const ext = nomeLimpo.endsWith('.png') ? 'image/png' : nomeLimpo.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          const base64Data = await zipFile.async('base64');
          const dataUrl = `data:${ext};base64,${base64Data}`;
          novasImagens[slideAlvo.id] = dataUrl;
          contagem++;
        }
      }

      onAtualizarImagens(novasImagens);
      toast.success(`🎉 Sucesso! ${contagem} imagens foram importadas e vinculadas aos slides!`);
    } catch (err: unknown) {
      console.error('Erro ao descompactar ZIP:', err);
      const mensagem = err instanceof Error ? err.message : 'Arquivo corrompido';
      toast.error('Erro ao processar o arquivo .zip: ' + mensagem);
    } finally {
      setProcessandoZip(false);
      setProgressoZip('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 4. Upload Avulso de uma única imagem
  const handleUploadAvulso = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slideParaTrocaAvulsa) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const novas = { ...imagens, [slideParaTrocaAvulsa]: reader.result };
        onAtualizarImagens(novas);
        toast.success('Imagem atualizada com sucesso!');
        setSlideParaTrocaAvulsa(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // 5. Copiar Prompt de Imagem
  const handleCopiarPrompt = (id: string, prompt?: string) => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopiadoId(id);
    toast.success('Prompt completo para Google Flow copiado com sucesso!');
    setTimeout(() => setCopiadoId(null), 2500);
  };

  // 6. Remover Imagem de um Slide
  const handleRemoverImagem = (slideId: string) => {
    const novas = { ...imagens };
    delete novas[slideId];
    onAtualizarImagens(novas);
    toast.info('Imagem removida do slide.');
  };

  // 7. Limpar Todas as Imagens
  const handleLimparTodas = () => {
    if (confirm('Deseja remover todas as imagens customizadas deste artigo?')) {
      onAtualizarImagens({});
      toast.info('Todas as imagens foram removidas.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Input oculto para troca avulsa de imagem */}
      <input 
        type="file" 
        ref={singleFileInputRef} 
        onChange={handleUploadAvulso} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Input oculto para arquivo ZIP */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessarZip(file);
        }} 
        accept=".zip" 
        className="hidden" 
      />

      {/* Painel Superior: Status e Fluxo dos 2 Passos */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/30 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <Palette className="w-3 h-3 text-rose-400" />
                Cenas Representativas & Exemplos Práticos
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                Google Flow • Fundo Vermelho 135° • Colagem Editorial
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1">
              Imagens Focadas em Exemplos Práticos & Fechamento
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Nem todo slide precisa de capa: as imagens são reservadas para momentos-chave (<strong>Capa da Aula</strong>, <strong>Dona Clara</strong>, <strong>Patinetes de Marcos</strong> e <strong>Troféu</strong>), mantendo quizzes e simuladores focados 100% na didática.
            </p>
          </div>

          {/* Barra de Progresso de Imagens */}
          <div className="bg-secondary/60 p-3 rounded-xl border border-border/70 text-right min-w-[160px] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground">Imagens Principais:</span>
              <span className="text-teal-400">{totalCarregadas} de {slidesComImagem.length} ({porcentagem}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-background overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${porcentagem}%` }}
              />
            </div>
          </div>
        </div>

        {/* Botão de Visualização do Prompt-Base Fixo de Design */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setMostrarPromptBase(!mostrarPromptBase)}
            className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-rose-200 hover:bg-rose-900/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-rose-400" />
              <span>Ver Especificação Oficial de Design (Fundo Vermelho 135°, Contorno Branco Grosso e Foco à Direita)</span>
            </span>
            {mostrarPromptBase ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {mostrarPromptBase && (
            <div className="p-4 pt-1 border-t border-rose-500/20 space-y-2 text-xs">
              <p className="text-muted-foreground">
                Este bloco fixo é incorporado automaticamente em todos os prompts para garantir identidade visual editorial unificada:
              </p>
              <pre className="p-3 rounded-lg bg-black/60 border border-border/50 text-[11px] text-muted-foreground font-mono leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap select-all">
                {PROMPT_BASE_PADRAO_DESIGN}
              </pre>
            </div>
          )}
        </div>

        {/* Os 2 Passos Lado a Lado + Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Passo 1: Baixar CSV e Copiar Fila */}
          <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/15 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  Exportar Cenas para o Google Flow
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gere apenas as <strong>{slidesComImagem.length} imagens representativas</strong> que trazem narrativa visual à aula.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleBaixarCsv}
                className="py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Baixar CSV ({slidesComImagem.length} Cenas)</span>
              </button>

              <button
                onClick={handleCopiarFilaCompleta}
                className="py-2.5 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {copiouFilaCompleta ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400">{slidesComImagem.length} Copiados!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Copiar Fila (JSON)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Passo 2: Enviar ZIP */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/15 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  Enviar Arquivo .ZIP das Imagens
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Após gerar as {slidesComImagem.length} imagens no Google Flow e baixar o ZIP, faça o upload aqui. O app vinculará tudo automaticamente.
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processandoZip}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {processandoZip ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{progressoZip || 'Processando...'}</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4" />
                  <span>Selecionar Arquivo .ZIP de Imagens</span>
                </>
              )}
            </button>
          </div>

        </div>

        {totalCarregadas > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {totalCarregadas} de {slidesComImagem.length} imagens representativas ativas no player!
            </span>
            <button
              onClick={handleLimparTodas}
              className="text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar imagens salvas</span>
            </button>
          </div>
        )}
      </div>

      {/* Grade de Slides e Filtro */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-teal-400" />
              Galeria de Slides da Aula ({slidesExibidos.length} Exibidos)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setApenasCenasRepresentativas(!apenasCenasRepresentativas)}
              className="text-xs px-2.5 py-1 rounded-lg border border-border/80 bg-secondary/60 hover:bg-secondary text-foreground font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Filter className="w-3.5 h-3.5 text-teal-400" />
              <span>{apenasCenasRepresentativas ? 'Mostrar Todos os Slides' : 'Apenas Cenas Representativas'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {slidesExibidos.map((slide) => {
            const temImagem = !!imagens[slide.id];
            const imagemUrl = imagens[slide.id];
            const ehRepresentativa = slide.temImagemRepresentativa !== false && !!slide.imagePrompt;

            return (
              <div 
                key={slide.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  temImagem 
                    ? 'border-emerald-500/30 bg-card shadow-sm' 
                    : ehRepresentativa
                    ? 'border-border/80 bg-card/60'
                    : 'border-border/40 bg-card/30 opacity-75'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      {slide.nomeArquivo && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground font-mono">
                          {slide.nomeArquivo}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {slide.badge}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-foreground truncate mt-1">
                      {slide.titulo}
                    </h5>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {slide.subtitulo}
                    </p>
                  </div>

                  {ehRepresentativa ? (
                    temImagem ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Pronta
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
                        Pendente
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50 border border-border/40 shrink-0">
                      Slide Didático/Interativo
                    </span>
                  )}
                </div>

                {/* Área da Imagem (Apenas se o slide for representativo ou já tiver imagem) */}
                {ehRepresentativa ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/80 bg-neutral-950 flex items-center justify-center group">
                    {temImagem ? (
                      <>
                        <img 
                          src={imagemUrl} 
                          alt={slide.titulo} 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                          <button
                            onClick={() => {
                              setSlideParaTrocaAvulsa(slide.id);
                              singleFileInputRef.current?.click();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-sm transition-colors flex items-center gap-1"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Trocar</span>
                          </button>
                          <button
                            onClick={() => handleRemoverImagem(slide.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/70 hover:bg-red-500 text-white text-xs font-bold backdrop-blur-sm transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3 space-y-1.5 text-muted-foreground">
                        <ImageIcon className="w-6 h-6 mx-auto opacity-40 text-teal-400" />
                        <span className="text-[11px] block font-mono">
                          {slide.nomeArquivo}
                        </span>
                        <button
                          onClick={() => {
                            setSlideParaTrocaAvulsa(slide.id);
                            singleFileInputRef.current?.click();
                          }}
                          className="text-[10px] text-teal-400 hover:underline inline-block font-semibold"
                        >
                          Enviar imagem avulsa
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-[11px] text-muted-foreground">
                    ⚡ Este slide foca 100% na interação do aluno (quiz, simulador, fixação mental). Não requer imagem de fundo.
                  </div>
                )}

                {/* Caixa com Prompt de Imagem Formatado para o Google Flow (se houver) */}
                {slide.imagePrompt && (
                  <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                        Prompt Google Flow:
                      </span>
                      <button
                        onClick={() => handleCopiarPrompt(slide.id, slide.imagePrompt)}
                        className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiadoId === slide.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar Prompt</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 select-all font-mono">
                      {slide.imagePrompt}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
