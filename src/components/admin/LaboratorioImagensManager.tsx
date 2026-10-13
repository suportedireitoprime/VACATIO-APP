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
  FolderArchive
} from 'lucide-react';
import { toast } from 'sonner';
import { SLIDES_ART1_RICOS, SlideLaboratorioRico } from '@/data/slidesLaboratorioArtigo1';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const [slideParaTrocaAvulsa, setSlideParaTrocaAvulsa] = useState<string | null>(null);

  // Total de imagens carregadas
  const totalCarregadas = SLIDES_ART1_RICOS.filter(s => !!imagens[s.id]).length;
  const porcentagem = Math.round((totalCarregadas / SLIDES_ART1_RICOS.length) * 100);

  // 1. Função para Baixar CSV de Prompts
  const handleBaixarCsv = () => {
    try {
      const cabecalhos = [
        'Ordem',
        'Nome_Arquivo_Esperado',
        'Slide_ID',
        'Fase',
        'Titulo',
        'Prompt_Imagem_Ingles',
        'Prompt_Imagem_Portugues',
        'Descricao_Cena'
      ];

      const linhas = SLIDES_ART1_RICOS.map(slide => {
        // Escapar aspas para CSV
        const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
        return [
          slide.ordem,
          slide.nomeArquivo,
          slide.id,
          escapeCsv(slide.fase),
          escapeCsv(slide.titulo),
          escapeCsv(slide.imagePrompt),
          escapeCsv(slide.imagePromptPt),
          escapeCsv(slide.descricaoCena)
        ].join(',');
      });

      // Inclui BOM UTF-8 para abrir perfeitamente no Excel sem quebrar acentos
      const csvContent = '\uFEFF' + [cabecalhos.join(','), ...linhas].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'prompts_imagens_artigo_1_cp.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Arquivo CSV baixado com sucesso! Abra no Excel ou Sheets.');
    } catch (err) {
      console.error('Erro ao gerar CSV:', err);
      toast.error('Erro ao gerar CSV de prompts.');
    }
  };

  // 2. Função para Processar Arquivo .ZIP
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

        // Tenta encontrar o slide correspondente:
        // 1. Por match do nome exato (ex: slide_01, slide_1)
        // 2. Por número no nome (ex: 1.jpg, 2.png)
        // 3. Por ordem sequencial do array se não houver match direto
        let slideAlvo: SlideLaboratorioRico | undefined;

        // Procura por slide_01, slide_1, etc.
        for (const s of SLIDES_ART1_RICOS) {
          const numStr = String(s.ordem).padStart(2, '0');
          const numSimples = String(s.ordem);
          if (
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

        // Fallback: se ainda não achou, associa pela ordem alfabética da lista
        if (!slideAlvo && idx < SLIDES_ART1_RICOS.length) {
          slideAlvo = SLIDES_ART1_RICOS[idx];
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

  // 3. Upload Avulso de uma única imagem
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

  // 4. Copiar Prompt de Imagem
  const handleCopiarPrompt = (id: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiadoId(id);
    toast.success('Prompt copiado para a área de transferência!');
    setTimeout(() => setCopiadoId(null), 2500);
  };

  // 5. Remover Imagem de um Slide
  const handleRemoverImagem = (slideId: string) => {
    const novas = { ...imagens };
    delete novas[slideId];
    onAtualizarImagens(novas);
    toast.info('Imagem removida do slide.');
  };

  // 6. Limpar Todas as Imagens
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
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Central de Imagens
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                Midjourney • Imagen 3 • ChatGPT • Leonardo
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1">
              Geração Externa & Importação via ZIP
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Baixe a planilha de prompts, gere as imagens na IA de sua escolha e importe o arquivo compactado em 1 clique.
            </p>
          </div>

          {/* Barra de Progresso de Imagens */}
          <div className="bg-secondary/60 p-3 rounded-xl border border-border/70 text-right min-w-[160px] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground">Progresso:</span>
              <span className="text-teal-400">{totalCarregadas} de {SLIDES_ART1_RICOS.length} ({porcentagem}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-background overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${porcentagem}%` }}
              />
            </div>
          </div>
        </div>

        {/* Os 2 Passos Lado a Lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Passo 1: Baixar CSV */}
          <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/15 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  Baixar Planilha CSV de Prompts
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Contém todos os 12 prompts formatados em inglês (e português) com a numeração correspondente (<code>slide_01.jpg</code> a <code>slide_12.jpg</code>).
              </p>
            </div>

            <button
              onClick={handleBaixarCsv}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar CSV de Prompts (.csv)</span>
            </button>
          </div>

          {/* Passo 2: Enviar ZIP */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/15 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  Enviar Arquivo .ZIP com as Imagens
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Após gerar as imagens, compacte-as em um arquivo <code>.zip</code>. O sistema vinculará cada imagem automaticamente ao slide correto.
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
              {totalCarregadas} imagens salvas e prontas para o player!
            </span>
            <button
              onClick={handleLimparTodas}
              className="text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar todas as imagens</span>
            </button>
          </div>
        )}
      </div>

      {/* Grade de Slides e Status de Imagens */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-teal-400" />
            Galeria de Slides da Aula ({SLIDES_ART1_RICOS.length} Etapas)
          </h4>
          <span className="text-xs text-muted-foreground">
            Toque em um prompt para copiar individualmente
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {SLIDES_ART1_RICOS.map((slide) => {
            const temImagem = !!imagens[slide.id];
            const imagemUrl = imagens[slide.id];

            return (
              <div 
                key={slide.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  temImagem 
                    ? 'border-emerald-500/30 bg-card shadow-sm' 
                    : 'border-border/70 bg-card/60'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground font-mono">
                        {slide.nomeArquivo}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        Etapa {slide.ordem}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-foreground truncate mt-1">
                      {slide.titulo}
                    </h5>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {slide.subtitulo}
                    </p>
                  </div>

                  {temImagem ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Pronta
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
                      Pendente
                    </span>
                  )}
                </div>

                {/* Área da Imagem (Preview ou Placeholder) */}
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

                {/* Caixa com Prompt de Imagem */}
                <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Prompt de Imagem (Inglês):
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
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 select-all font-mono">
                    {slide.imagePrompt}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
