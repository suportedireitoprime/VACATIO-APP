import { useNavigate } from 'react-router-dom';
import { Copy, Download, Github, FileText, Info } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import handoffMd from '../../docs/HANDOFF_IA.md?raw';

export default function AdminHandoffIA() {
  const navigate = useNavigate();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(handoffMd);
      toast.success('Copiado! Cole no primeiro prompt da IA nova.');
    } catch {
      toast.error('Não foi possível copiar. Baixe o arquivo.');
    }
  };

  const download = () => {
    const blob = new Blob([handoffMd], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HANDOFF_IA.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openGitHub = () => {
    window.open(
      'https://github.com/suportevacatio/vade-comenta-legal/blob/main/docs/HANDOFF_IA.md',
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <PageHeader
        title="Handoff para IA"
        onBack={() => navigate(-1)}
        leading={<FileText className="h-5 w-5 text-primary" />}
      />

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Aviso */}
        <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Como usar</p>
            <p className="text-muted-foreground">
              Depois de fazer um <strong>Remix</strong> desse projeto (ou abrir
              o código em outra IA como Cursor/Claude), copie tudo daqui e cole
              no <strong>primeiro prompt</strong>. A IA vai entender modelos,
              APIs, regras de build e as convenções do app antes de tocar em
              qualquer arquivo.
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button onClick={copy} className="w-full">
            <Copy className="mr-2 h-4 w-4" />
            Copiar tudo
          </Button>
          <Button onClick={download} variant="secondary" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Baixar .md
          </Button>
          <Button onClick={openGitHub} variant="outline" className="w-full">
            <Github className="mr-2 h-4 w-4" />
            Ver no GitHub
          </Button>
        </div>

        {/* Preview do markdown */}
        <article
          className="prose prose-invert max-w-none rounded-lg border border-border/40 bg-card/50 p-6
            prose-headings:font-semibold prose-headings:text-foreground
            prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
            prose-p:text-foreground/90 prose-li:text-foreground/90
            prose-strong:text-foreground
            prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5
            prose-code:text-primary prose-code:before:content-none prose-code:after:content-none
            prose-a:text-primary hover:prose-a:underline
            prose-table:text-sm prose-th:text-left prose-th:font-semibold
            prose-hr:border-border/40"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{handoffMd}</ReactMarkdown>
        </article>

        <p className="pb-8 text-center text-xs text-muted-foreground">
          Fonte: <code>docs/HANDOFF_IA.md</code> · edite lá para atualizar esta tela
        </p>
      </div>
    </div>
  );
}
