import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  Layers, 
  Scale, 
  ExternalLink, 
  Copy, 
  Check, 
  HelpCircle, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight, 
  BookOpen,
  ChevronDown,
  FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { haptic } from '@/lib/nativeHaptics';

// ─────────────────────────────────────────────────────────────────────────────
// 1. ABA IDEIA
// ─────────────────────────────────────────────────────────────────────────────

interface IdeiaTabContentProps {
  content: string;
  artigoNumero?: string;
  fontSize?: number;
}

export const IdeiaTabContent: React.FC<IdeiaTabContentProps> = ({ 
  content, 
  artigoNumero,
  fontSize = 16 
}) => {
  const [copied, setCopied] = useState(false);

  // Escala proporcional confortável para mobile (base 15px-16px, escalável de 13 a 20px)
  const baseSize = fontSize ? Math.round(fontSize * 0.88) : 15;
  const computedSize = Math.max(13.5, Math.min(baseSize, 20));

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    haptic.selection();
    toast.success('Ideia central copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedNumero = artigoNumero 
    ? (artigoNumero.toLowerCase().startsWith('art') ? artigoNumero : `Art. ${artigoNumero}`)
    : 'Artigo';

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-secondary/40 to-card p-4 sm:p-6 shadow-xl backdrop-blur-md"
      >
        {/* Glow suave e discreto */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3.5">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-primary tracking-wider uppercase block">Porta de Entrada Mental</span>
            <span className="text-xs text-muted-foreground font-medium">Ideia Central • {formattedNumero}</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60"
            title="Copiar ideia"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        {/* Texto da Ideia responsivo para mobile */}
        <div 
          className="font-body text-foreground/90 leading-[1.65] font-normal tracking-normal [&_strong]:text-primary [&_strong]:font-semibold space-y-2.5"
          style={{ fontSize: `${computedSize}px` }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Rodapé pedagógico */}
        <div className="mt-4 pt-3.5 border-t border-border/40 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-foreground/90 font-medium">Como usar este conceito:</strong> Guarde esta ideia como sua âncora de raciocínio. Ao ler os incisos e parágrafos, veja como cada detalhe serve para colocar este objetivo em prática.
          </p>
        </div>
      </motion.div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// 1.5. ABA EXPLICAÇÃO (LEITURA FLUIDA DIRETA — SEM ACORDEÃO DE SEÇÃO)
// ─────────────────────────────────────────────────────────────────────────────

interface ExplicacaoTabContentProps {
  content: string;
  artigoNumero?: string;
  fontSize?: number;
}

interface ExplicacaoBloco {
  tipo: 'decide' | 'distincao' | 'erro' | 'resumo' | 'pegadinha' | 'geral';
  numero?: string;
  titulo: string;
  corpo: string;
}

export const ExplicacaoTabContent: React.FC<ExplicacaoTabContentProps> = ({ 
  content, 
  artigoNumero,
  fontSize = 16 
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Tamanho balanceado para leitura fluida mobile
  const baseSize = fontSize ? Math.round(fontSize * 0.88) : 15;
  const computedSize = Math.max(13.5, Math.min(baseSize, 20));

  const handleCopyBlock = (idx: number, titulo: string, corpo: string) => {
    const cleanBody = corpo.replace(/---[A-Z]+---/g, '').trim();
    const textToCopy = `${titulo}\n\n${cleanBody}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIdx(idx);
    haptic.selection();
    toast.success('Trecho copiado!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const { introText, blocos } = React.useMemo(() => {
    if (!content) return { introText: '', blocos: [] };

    // Parser estruturado quando há delimitadores ---SECAO---
    if (content.includes('---SECAO---')) {
      const parts = content.split('---SECAO---').map(s => s.trim()).filter(Boolean);
      let intro = '';
      const list: ExplicacaoBloco[] = [];

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const lines = part.split('\n');
        const titleLine = lines.find(l => l.startsWith('## ') || l.startsWith('### ') || l.startsWith('**'));

        // Se é o primeiro bloco e não tem título ##, é a frase padrão introdutória
        if (i === 0 && !titleLine) {
          intro = part;
          continue;
        }

        const rawTitle = titleLine 
          ? titleLine.replace(/^###?\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').trim()
          : '';
        const body = lines.filter(l => l !== titleLine).join('\n').trim();

        if (/1\.|o que este artigo decide|decide/i.test(rawTitle)) {
          list.push({ tipo: 'decide', numero: '1', titulo: rawTitle.replace(/^1\.\s*/, ''), corpo: body || part });
        } else if (/2\.|a distinção central|distin[çc]/i.test(rawTitle)) {
          list.push({ tipo: 'distincao', numero: '2', titulo: rawTitle.replace(/^2\.\s*/, ''), corpo: body || part });
        } else if (/3\.|o erro mais comum|erro/i.test(rawTitle)) {
          list.push({ tipo: 'erro', numero: '3', titulo: rawTitle.replace(/^3\.\s*/, ''), corpo: body || part });
        } else if (/resumo/i.test(rawTitle)) {
          list.push({ tipo: 'resumo', titulo: rawTitle, corpo: body || part });
        } else if (/pegadinha|prova|armadilha/i.test(rawTitle)) {
          list.push({ tipo: 'pegadinha', titulo: rawTitle, corpo: body || part });
        } else {
          list.push({ tipo: 'geral', titulo: rawTitle || `Parte ${i + 1}`, corpo: body || part });
        }
      }

      return { introText: intro, blocos: list };
    }

    // Fallback se estiver estruturado apenas com títulos ##
    const sectionsByHeading = content.split(/\n(?=## )/).map(s => s.trim()).filter(Boolean);
    if (sectionsByHeading.length > 1) {
      let intro = '';
      const list: ExplicacaoBloco[] = [];
      for (let i = 0; i < sectionsByHeading.length; i++) {
        const part = sectionsByHeading[i];
        const lines = part.split('\n');
        const titleLine = lines.find(l => l.startsWith('## '));
        if (i === 0 && !titleLine) {
          intro = part;
          continue;
        }
        const rawTitle = titleLine ? titleLine.replace(/^##\s*/, '').trim() : '';
        const body = lines.filter(l => l !== titleLine).join('\n').trim();

        if (/1\.|decide/i.test(rawTitle)) list.push({ tipo: 'decide', numero: '1', titulo: rawTitle.replace(/^1\.\s*/, ''), corpo: body });
        else if (/2\.|distin[çc]/i.test(rawTitle)) list.push({ tipo: 'distincao', numero: '2', titulo: rawTitle.replace(/^2\.\s*/, ''), corpo: body });
        else if (/3\.|erro/i.test(rawTitle)) list.push({ tipo: 'erro', numero: '3', titulo: rawTitle.replace(/^3\.\s*/, ''), corpo: body });
        else if (/resumo/i.test(rawTitle)) list.push({ tipo: 'resumo', titulo: rawTitle, corpo: body });
        else if (/pegadinha|prova/i.test(rawTitle)) list.push({ tipo: 'pegadinha', titulo: rawTitle, corpo: body });
        else list.push({ tipo: 'geral', titulo: rawTitle || `Tópico ${i + 1}`, corpo: body });
      }
      return { introText: intro, blocos: list };
    }

    return { introText: '', blocos: [] };
  }, [content]);

  // Substitui menção de "explicação detalhada" por "explicação conceitual"
  const displayIntro = introText 
    ? introText.replace(/explica[çc][ãa]o\s+detalhada/gi, 'explicação conceitual e fundamentos')
    : '';

  // Se o conteúdo é texto puro ou não possui seções identificadas
  if (blocos.length === 0) {
    return (
      <div className="space-y-3 max-w-2xl mx-auto" style={{ fontSize: `${computedSize}px` }}>
        <div className="flex justify-end">
          <button
            onClick={() => {
              navigator.clipboard.writeText(content);
              setCopiedIdx(-1);
              haptic.selection();
              toast.success('Explicação copiada!');
              setTimeout(() => setCopiedIdx(null), 2000);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60"
            title="Copiar explicação"
          >
            {copiedIdx === -1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copiedIdx === -1 ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
        <div 
          className="prose prose-sm dark:prose-invert max-w-none font-body leading-relaxed text-foreground/90 space-y-3 [&_p]:my-2 [&_ul]:my-2 [&_li]:my-1 [&_h2]:text-base [&_h2]:!font-card [&_h2]:font-bold [&_h2]:text-primary [&_strong]:text-foreground"
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-w-2xl mx-auto" style={{ fontSize: `${computedSize}px` }}>
      {/* Frase introdutória conceitual limpa */}
      {displayIntro && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-secondary/35 border border-border/50 text-xs text-muted-foreground font-body">
          <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="line-clamp-2 leading-relaxed">{displayIntro}</span>
        </div>
      )}

      {/* Blocos de leitura aberta e direta com tipografia normal e botão de copiar */}
      {blocos.map((bloco, idx) => {
        if (bloco.tipo === 'decide') {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-secondary/30 to-card p-4 sm:p-5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-border/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5.5 h-5.5 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0 border border-sky-500/30">
                    1
                  </span>
                  <span className="!font-card font-bold text-foreground text-sm sm:text-[15px] tracking-normal truncate">
                    {bloco.titulo || 'O que este artigo decide'}
                  </span>
                </div>

                <button
                  onClick={() => handleCopyBlock(idx, bloco.titulo || 'O que este artigo decide', bloco.corpo)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
                  title="Copiar trecho"
                >
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copiedIdx === idx ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="text-foreground/90 font-body leading-relaxed text-sm sm:text-[15px] space-y-2 [&_strong]:text-sky-300 [&_strong]:font-semibold">
                <ReactMarkdown>{bloco.corpo}</ReactMarkdown>
              </div>
            </motion.div>
          );
        }

        if (bloco.tipo === 'distincao') {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-secondary/30 to-card p-4 sm:p-5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-border/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5.5 h-5.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                    2
                  </span>
                  <span className="!font-card font-bold text-foreground text-sm sm:text-[15px] tracking-normal truncate">
                    {bloco.titulo || 'A distinção central'}
                  </span>
                </div>

                <button
                  onClick={() => handleCopyBlock(idx, bloco.titulo || 'A distinção central', bloco.corpo)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
                  title="Copiar trecho"
                >
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copiedIdx === idx ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="text-foreground/90 font-body leading-relaxed text-sm sm:text-[15px] space-y-2 [&_strong]:text-emerald-300 [&_strong]:font-semibold">
                <ReactMarkdown>{bloco.corpo}</ReactMarkdown>
              </div>
            </motion.div>
          );
        }

        if (bloco.tipo === 'erro') {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-secondary/30 to-card p-4 sm:p-5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-border/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5.5 h-5.5 rounded-lg bg-violet-500/20 text-violet-400 font-bold text-xs flex items-center justify-center shrink-0 border border-violet-500/30">
                    3
                  </span>
                  <span className="!font-card font-bold text-foreground text-sm sm:text-[15px] tracking-normal truncate">
                    {bloco.titulo || 'O erro mais comum'}
                  </span>
                </div>

                <button
                  onClick={() => handleCopyBlock(idx, bloco.titulo || 'O erro mais comum', bloco.corpo)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
                  title="Copiar trecho"
                >
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copiedIdx === idx ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="text-foreground/90 font-body leading-relaxed text-sm sm:text-[15px] space-y-2 [&_strong]:text-violet-300 [&_strong]:font-semibold">
                <ReactMarkdown>{bloco.corpo}</ReactMarkdown>
              </div>
            </motion.div>
          );
        }

        if (bloco.tipo === 'resumo') {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-primary/20">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="!font-card font-bold text-primary text-sm sm:text-[15px] tracking-normal truncate">
                    {bloco.titulo || 'Resumo do Artigo'}
                  </span>
                </div>

                <button
                  onClick={() => handleCopyBlock(idx, bloco.titulo || 'Resumo do Artigo', bloco.corpo)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
                  title="Copiar resumo"
                >
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copiedIdx === idx ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="text-foreground/90 font-body leading-relaxed text-sm sm:text-[15px] space-y-1.5 [&_ul]:space-y-1.5 [&_li]:flex [&_li]:items-start [&_strong]:text-foreground">
                <ReactMarkdown>{bloco.corpo}</ReactMarkdown>
              </div>
            </motion.div>
          );
        }

        if (bloco.tipo === 'pegadinha') {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-card p-4 sm:p-5 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-amber-500/20">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="!font-card font-bold text-amber-400 text-xs sm:text-sm uppercase tracking-wider truncate">
                    {bloco.titulo || 'Pegadinha de Prova'}
                  </span>
                </div>

                <button
                  onClick={() => handleCopyBlock(idx, bloco.titulo || 'Pegadinha de Prova', bloco.corpo)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
                  title="Copiar pegadinha"
                >
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copiedIdx === idx ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="text-foreground/95 font-body leading-relaxed text-sm sm:text-[15px] space-y-2 [&_strong]:text-amber-300 [&_strong]:font-semibold">
                <ReactMarkdown>{bloco.corpo}</ReactMarkdown>
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
            className="rounded-2xl border border-border/60 bg-secondary/20 p-4 sm:p-5 shadow-sm space-y-2.5"
          >
            {bloco.titulo && (
              <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-border/30">
                <span className="!font-card font-bold text-foreground text-sm sm:text-base tracking-normal truncate">
                  {bloco.titulo}
                </span>

                <button
                  onClick={() => handleCopyBlock(idx, bloco.titulo, bloco.corpo)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
                  title="Copiar trecho"
                >
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copiedIdx === idx ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            )}
            <div className="text-foreground/90 font-body leading-relaxed text-sm sm:text-[15px] space-y-2">
              <ReactMarkdown>{bloco.corpo}</ReactMarkdown>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};



// ─────────────────────────────────────────────────────────────────────────────
// 2. ABA DESDOBRAMENTO (DESMEMBRAMENTO)
// ─────────────────────────────────────────────────────────────────────────────

interface TrechoData {
  title: string;
  rawText: string;
  textoOficial?: string;
  explicacao?: string;
  porque?: string;
  palavras: Array<{
    termo: string;
    significado?: string;
    porque?: string;
    outra?: string;
  }>;
}

function parseDesdobramentoText(text: string): TrechoData[] {
  if (!text) return [];
  const parts = text.split('---TRECHO---').filter(p => p.trim());
  
  if (parts.length === 0) {
    return [{
      title: 'Raio-X do Artigo',
      rawText: text,
      palavras: []
    }];
  }

  return parts.map((part, idx) => {
    const lines = part.trim().split('\n');
    let title = `Trecho ${idx + 1}`;
    
    // Procura título
    const titleLine = lines.find(l => l.startsWith('## '));
    if (titleLine) {
      title = titleLine.replace(/^##\s*/, '').trim();
    }

    // Texto oficial
    let textoOficial = '';
    const textoMatch = part.match(/\*\*Texto(?:\soficial)?\*\*:\s*([^\n]+(?:\n[^\n#]+)*)/i);
    if (textoMatch) {
      textoOficial = textoMatch[1].replace(/^["']|["']$/g, '').trim();
    }

    // Explicação
    let explicacao = '';
    const expMatch = part.match(/###\s*Explicação[^\n]*\n([\s\S]*?)(?=###|---PALAVRA---|$)/i);
    if (expMatch) {
      explicacao = expMatch[1].trim();
    }

    // Por que a lei fez assim?
    let porque = '';
    const pqMatch = part.match(/###\s*Por que a lei fez assim\??\s*\n([\s\S]*?)(?=###|---PALAVRA---|$)/i);
    if (pqMatch) {
      porque = pqMatch[1].trim();
    }

    // Palavras
    const palavras: TrechoData['palavras'] = [];
    const palavraParts = part.split('---PALAVRA---').slice(1);
    for (const p of palavraParts) {
      const termoMatch = p.match(/\*\*Palavra\*\*:\s*([^\n]+)/i);
      const sigMatch = p.match(/-\s*\*\*O que significa aqui\*\*:\s*([^\n]+)/i);
      const pqPWordMatch = p.match(/-\s*\*\*Por que a lei escolheu esta palavra\*\*:\s*([^\n]+)/i);
      const outraMatch = p.match(/-\s*\*\*E se fosse outra\??\*\*:\s*([^\n]+)/i);

      if (termoMatch) {
        palavras.push({
          termo: termoMatch[1].replace(/["']/g, '').trim(),
          significado: sigMatch ? sigMatch[1].trim() : undefined,
          porque: pqPWordMatch ? pqPWordMatch[1].trim() : undefined,
          outra: outraMatch ? outraMatch[1].trim() : undefined,
        });
      }
    }

    return {
      title,
      rawText: part,
      textoOficial,
      explicacao: explicacao || (!textoOficial && !porque && palavras.length === 0 ? part : undefined),
      porque,
      palavras
    };
  });
}

interface DesdobramentoTabContentProps {
  content: string;
  fontSize?: number;
}

export const DesdobramentoTabContent: React.FC<DesdobramentoTabContentProps> = ({ 
  content, 
  fontSize = 15 
}) => {
  const [copiedTrechoIdx, setCopiedTrechoIdx] = useState<number | null>(null);
  const trechos = parseDesdobramentoText(content);

  const handleCopyTrecho = (idx: number, trecho: TrechoData) => {
    const parts: string[] = [trecho.title];
    if (trecho.textoOficial) parts.push(`Texto Oficial:\n"${trecho.textoOficial}"`);
    if (trecho.explicacao) parts.push(`Explicação:\n${trecho.explicacao}`);
    if (trecho.porque) parts.push(`Por que a lei fez assim?:\n${trecho.porque}`);
    if (trecho.palavras.length > 0) {
      const palavrasText = trecho.palavras.map(p => {
        let t = `• Expressão: "${p.termo}"`;
        if (p.significado) t += `\n  - Significado: ${p.significado}`;
        if (p.porque) t += `\n  - Por que a lei escolheu: ${p.porque}`;
        if (p.outra) t += `\n  - E se fosse outra: ${p.outra}`;
        return t;
      }).join('\n');
      parts.push(`Palavra por palavra:\n${palavrasText}`);
    }
    const textToCopy = parts.join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedTrechoIdx(idx);
    haptic.selection();
    toast.success('Trecho do Raio-X copiado!');
    setTimeout(() => setCopiedTrechoIdx(null), 2000);
  };

  const borderColors = [
    'border-l-indigo-500', 
    'border-l-amber-500', 
    'border-l-emerald-500', 
    'border-l-sky-500', 
    'border-l-rose-500', 
    'border-l-purple-500'
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {trechos.map((t, idx) => {
        const borderColor = borderColors[idx % borderColors.length];

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.05 }}
            className={`rounded-2xl border border-border/70 bg-card/90 shadow-lg overflow-hidden border-l-4 ${borderColor}`}
          >
            {/* Cabeçalho do Trecho */}
            <div className="p-4 sm:p-5 border-b border-border/50 bg-secondary/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="!font-card font-bold text-base sm:text-[17px] text-foreground tracking-normal truncate">
                  {t.title}
                </span>
              </div>

              <button
                onClick={() => handleCopyTrecho(idx, t)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
                title="Copiar análise do trecho"
              >
                {copiedTrechoIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copiedTrechoIdx === idx ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4" style={{ fontSize: `${fontSize}px` }}>
              {/* Texto Oficial se identificado */}
              {t.textoOficial && (
                <div className="rounded-xl bg-secondary/40 border border-border/60 p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Texto Oficial da Lei
                  </span>
                  <p className="text-foreground/90 italic text-sm sm:text-[15px] font-serif leading-relaxed">
                    "{t.textoOficial}"
                  </p>
                </div>
              )}

              {/* Explicação do Trecho */}
              {t.explicacao && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-primary pb-1">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="!font-card font-bold text-sm sm:text-[15px] text-foreground">
                      Explicação do trecho
                    </span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 font-body leading-relaxed [&_p]:my-2 [&_strong]:text-primary text-sm sm:text-[15px]">
                    <ReactMarkdown>{t.explicacao}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Por que a lei fez assim? */}
              {t.porque && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 pb-1 border-b border-amber-500/20">
                    <HelpCircle className="w-4 h-4 shrink-0" />
                    <span className="!font-card font-bold text-sm sm:text-[15px] text-amber-400">
                      Por que a lei fez assim?
                    </span>
                  </div>
                  <p className="text-sm sm:text-[15px] text-foreground/90 leading-relaxed font-body">
                    {t.porque}
                  </p>
                </div>
              )}

              {/* Seção Palavra por Palavra */}
              {t.palavras.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="!font-card font-bold text-sm sm:text-[15px] text-foreground">
                        Palavra por palavra deste trecho
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full border border-border/50">
                      {t.palavras.length} {t.palavras.length === 1 ? 'expressão' : 'expressões'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {t.palavras.map((p, pIdx) => (
                      <div 
                        key={pIdx}
                        className="rounded-xl border border-border/80 bg-secondary/25 p-3.5 space-y-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md bg-primary/20 text-primary text-xs sm:text-sm font-bold !font-card">
                            {p.termo}
                          </span>
                        </div>

                        {p.significado && (
                          <div className="text-sm text-foreground/90 leading-relaxed space-y-0.5">
                            <span className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wider block">
                              O que significa aqui
                            </span>
                            <p className="font-body text-foreground/95">{p.significado}</p>
                          </div>
                        )}

                        {p.porque && (
                          <div className="text-sm text-foreground/90 leading-relaxed space-y-0.5">
                            <span className="text-[11px] font-semibold text-amber-400/90 uppercase tracking-wider block">
                              Por que a lei escolheu esta palavra
                            </span>
                            <p className="font-body text-foreground/95">{p.porque}</p>
                          </div>
                        )}

                        {p.outra && (
                          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm leading-relaxed space-y-0.5">
                            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
                              E se fosse outra palavra?
                            </span>
                            <p className="font-body text-foreground/90 italic">{p.outra}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// 3. ABA JURISPRUDÊNCIA
// ─────────────────────────────────────────────────────────────────────────────

interface JulgadoData {
  titulo: string;
  tribunal: string;
  ano?: string;
  caso?: string;
  decisao?: string;
  importancia?: string;
  link?: string;
  rawText: string;
}

function parseJurisprudenciaText(text: string): JulgadoData[] {
  if (!text) return [];
  const parts = text.split('---JULGADO---').filter(p => p.trim());
  
  if (parts.length === 0) {
    return [{
      titulo: 'Precedente Relevante',
      tribunal: 'STF/STJ',
      rawText: text
    }];
  }

  return parts.map((part, idx) => {
    const lines = part.trim().split('\n');
    let titulo = `Precedente ${idx + 1}`;
    let tribunal = 'STJ';
    let ano = '';

    const titleLine = lines.find(l => l.startsWith('## '));
    if (titleLine) {
      titulo = titleLine.replace(/^##\s*/, '').trim();
      if (/STF/i.test(titulo)) tribunal = 'STF';
      else if (/STJ/i.test(titulo)) tribunal = 'STJ';
      else if (/Súmula/i.test(titulo)) tribunal = 'SÚMULA';

      const anoMatch = titulo.match(/\b(19\d{2}|20\d{2})\b/);
      if (anoMatch) ano = anoMatch[1];
    }

    // O Caso
    let caso = '';
    const casoMatch = part.match(/-\s*\*\*O\s*Caso\*\*:\s*([^\n]+(?:\n(?!\s*-\s*\*\*)[^\n]+)*)/i);
    if (casoMatch) caso = casoMatch[1].trim();

    // A Decisão / Tese
    let decisao = '';
    const decMatch = part.match(/-\s*\*\*A\s*Decisão\*\*:\s*([^\n]+(?:\n(?!\s*-\s*\*\*)[^\n]+)*)/i);
    if (decMatch) decisao = decMatch[1].trim();

    // Importância para o artigo
    let importancia = '';
    const impMatch = part.match(/-\s*\*\*Por que importa[^*]*\*\*:\s*([^\n]+(?:\n(?!\s*-\s*\*\*)[^\n]+)*)/i);
    if (impMatch) importancia = impMatch[1].trim();

    // Link oficial
    let link = '';
    const linkMatch = part.match(/(?:-\s*\*\*(?:Fonte oficial|Ler a decisão)[^*]*\*\*:\s*|\[(?:Ler a decisão[^\]]+)\]\()([^)\s]+)/i);
    if (linkMatch) {
      link = linkMatch[1].trim().replace(/^\[|\]$/g, '');
    }

    return {
      titulo,
      tribunal,
      ano,
      caso,
      decisao,
      importancia,
      link,
      rawText: part
    };
  });
}

interface JurisprudenciaTabContentProps {
  content: string;
  tabelaNome?: string;
  artigoNumero?: string;
  onExploreMore?: () => void;
  fontSize?: number;
}

export const JurisprudenciaTabContent: React.FC<JurisprudenciaTabContentProps> = ({ 
  content,
  tabelaNome,
  artigoNumero,
  onExploreMore,
  fontSize = 15 
}) => {
  const [copiedJulgadoIdx, setCopiedJulgadoIdx] = useState<number | null>(null);
  const julgados = parseJurisprudenciaText(content);

  const handleCopyJulgado = (idx: number, j: JulgadoData) => {
    const parts: string[] = [`[${j.tribunal}${j.ano ? ` - ${j.ano}` : ''}] ${j.titulo}`];
    if (j.caso) parts.push(`Caso:\n${j.caso}`);
    if (j.decisao) parts.push(`Decisão:\n"${j.decisao}"`);
    if (j.importancia) parts.push(`Impacto Prático:\n${j.importancia}`);
    if (j.link) parts.push(`Fonte Oficial: ${j.link}`);
    const textToCopy = parts.join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedJulgadoIdx(idx);
    haptic.selection();
    toast.success('Jurisprudência copiada!');
    setTimeout(() => setCopiedJulgadoIdx(null), 2000);
  };

  const getBadgeStyle = (tribunal: string) => {
    if (/STF/i.test(tribunal)) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (/STJ/i.test(tribunal)) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Intro da jurisprudência */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70">
          <Scale className="w-4 h-4 text-amber-400" />
          <span>Precedentes e Julgados Vinculantes dos Tribunais Superiores</span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground/60">
          {julgados.length} {julgados.length === 1 ? 'julgado' : 'julgados'}
        </span>
      </div>

      {julgados.map((j, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: idx * 0.06 }}
          className="rounded-2xl border border-border/80 bg-card/90 shadow-xl overflow-hidden hover:border-border transition-all"
        >
          {/* Top banner do Julgado */}
          <div className="p-4 sm:p-5 border-b border-border/50 bg-secondary/30 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getBadgeStyle(j.tribunal)}`}>
                {j.tribunal}
              </span>
              {j.ano && (
                <span className="text-xs font-medium text-foreground/60 bg-secondary px-2 py-0.5 rounded-full border border-border/50">
                  {j.ano}
                </span>
              )}
            </div>

            <span className="!font-card font-bold text-sm sm:text-base text-foreground flex-1 min-w-[200px]">
              {j.titulo}
            </span>

            <button
              onClick={() => handleCopyJulgado(idx, j)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
              title="Copiar julgado"
            >
              {copiedJulgadoIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copiedJulgadoIdx === idx ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4" style={{ fontSize: `${fontSize}px` }}>
            {/* O Caso Concreto */}
            {j.caso && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wider block">O Caso Concreto</span>
                <p className="text-sm sm:text-[15px] text-foreground/90 leading-relaxed font-body">
                  {j.caso}
                </p>
              </div>
            )}

            {/* A Decisão / Tese */}
            {j.decisao && (
              <div className="rounded-2xl bg-primary/10 border border-primary/25 p-4 space-y-1.5">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">A Tese Fixada pelo Tribunal</span>
                <p className="text-sm sm:text-[15px] font-medium text-foreground leading-relaxed font-body">
                  "{j.decisao}"
                </p>
              </div>
            )}

            {/* Por que importa para o artigo */}
            {j.importancia && (
              <div className="rounded-xl bg-secondary/30 border border-border/40 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Impacto Prático no Artigo</span>
                <p className="text-sm sm:text-[15px] text-foreground/80 leading-relaxed font-body">
                  {j.importancia}
                </p>
              </div>
            )}

            {/* Link oficial */}
            {j.link && /^https?:\/\//i.test(j.link) && (
              <div className="pt-2 flex justify-end">
                <a
                  href={j.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold text-primary border border-primary/20 hover:border-primary/40 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ler a decisão ou a fonte oficial</span>
                </a>
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {/* Card de Navegação para o Radar Completo */}
      {onExploreMore && (
        <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <span className="!font-card font-bold text-sm text-foreground block">Quer ver todos os acórdãos e súmulas?</span>
            <p className="text-xs text-foreground/70 mt-0.5">Explore a busca completa de jurisprudência deste artigo no aplicativo.</p>
          </div>
          <button
            onClick={onExploreMore}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:bg-primary/90 transition-colors"
          >
            <span>Ver no Radar Juris</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// 4. ABA EXEMPLO PRÁTICO (TÍTULO EM NEGRITO COM RISQUINHO VERMELHO À ESQUERDA)
// ─────────────────────────────────────────────────────────────────────────────

interface ExemploData {
  titulo: string;
  situacao: string;
  desfecho?: string;
  rawText: string;
}

function parseExemploText(text: string): ExemploData[] {
  if (!text) return [];

  // Remove qualquer variação de marcador no início ou meio: ---EXEMPLO---, --EXEMPLO--, etc.
  const normalized = text.replace(/^(?:-{2,4}\s*EXEMPLO\s*-{2,4})/gim, '---SPLIT_EXEMPLO---');
  const parts = normalized.split('---SPLIT_EXEMPLO---').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    const cleanText = text.replace(/^(?:-{2,4}\s*EXEMPLO\s*-{2,4})\s*/gim, '').trim();
    return [{
      titulo: 'Caso Prático',
      situacao: cleanText,
      rawText: cleanText
    }];
  }

  return parts.map((part, idx) => {
    const cleanPart = part.replace(/^(?:-{2,4}\s*EXEMPLO\s*-{2,4})\s*/gim, '').trim();
    const lines = cleanPart.split('\n');

    let titulo = `Caso Prático ${idx + 1}`;
    const titleLineIdx = lines.findIndex(l => /^##\s+/i.test(l) || /^\*\*(?:Caso Prático|Exemplo)[^*]*\*\*/i.test(l));
    
    let contentLines = lines;
    if (titleLineIdx !== -1) {
      const line = lines[titleLineIdx];
      titulo = line
        .replace(/^##\s*/, '')
        .replace(/^\*\*/, '')
        .replace(/\*\*.*$/, '')
        .trim();
      contentLines = lines.filter((_, i) => i !== titleLineIdx);
    }

    const restOfContent = contentLines.join('\n').trim();

    // Separa a Situação do Desfecho Jurídico se houver "### Desfecho jurídico" ou "**Desfecho jurídico**"
    const desfechoMatch = restOfContent.match(/(?:###\s*Desfecho\s*[jJ]urídico|\*\*Desfecho\s*[jJ]urídico\*\*:?)\s*([\s\S]*)$/i);
    let situacao = restOfContent;
    let desfecho = '';

    if (desfechoMatch) {
      situacao = restOfContent.substring(0, desfechoMatch.index).trim();
      desfecho = desfechoMatch[1].trim();
    }

    return {
      titulo: titulo || `Caso Prático ${idx + 1}`,
      situacao: situacao || restOfContent,
      desfecho: desfecho || undefined,
      rawText: cleanPart
    };
  });
}

interface ExemploTabContentProps {
  content: string;
  artigoNumero?: string;
  fontSize?: number;
}

export const ExemploTabContent: React.FC<ExemploTabContentProps> = ({
  content,
  artigoNumero,
  fontSize = 15
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const exemplos = parseExemploText(content);

  const handleCopy = (idx: number, ex: ExemploData) => {
    const textToCopy = `${ex.titulo}\n\n${ex.situacao}${ex.desfecho ? `\n\nDesfecho Jurídico:\n${ex.desfecho}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIdx(idx);
    haptic.selection();
    toast.success('Exemplo prático copiado!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {exemplos.map((ex, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: idx * 0.05 }}
          className="rounded-2xl border border-border/80 bg-card/90 shadow-md p-4 sm:p-5 space-y-4"
        >
          {/* Título em negrito com o risquinho vermelho do lado esquerdo */}
          <div className="flex items-start justify-between gap-3 border-l-4 border-l-primary pl-3.5 py-0.5">
            <h3 className="!font-card font-bold text-foreground text-base sm:text-[17px] leading-snug">
              {ex.titulo}
            </h3>

            <button
              onClick={() => handleCopy(idx, ex)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
              title="Copiar caso prático"
            >
              {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copiedIdx === idx ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          {/* Situação concreta do caso */}
          <div 
            className="text-foreground/90 font-body leading-relaxed space-y-2 [&_p]:my-1.5 [&_strong]:text-primary [&_strong]:font-semibold"
            style={{ fontSize: `${fontSize}px` }}
          >
            <ReactMarkdown>{ex.situacao}</ReactMarkdown>
          </div>

          {/* Desfecho Jurídico em destaque */}
          {ex.desfecho && (
            <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3.5 sm:p-4 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-primary border-b border-primary/15 pb-1.5">
                <Scale className="w-4 h-4 shrink-0" />
                <span className="!font-card font-bold text-xs uppercase tracking-wider text-primary">
                  Desfecho Jurídico
                </span>
              </div>
              <div 
                className="text-foreground/90 font-body leading-relaxed space-y-1.5 [&_p]:my-1 [&_strong]:text-foreground"
                style={{ fontSize: `${fontSize}px` }}
              >
                <ReactMarkdown>{ex.desfecho}</ReactMarkdown>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// 5. ABA TERMOS JURÍDICOS (GLOSSÁRIO LIMPO COM BORDAS E DESTAQUES)
// ─────────────────────────────────────────────────────────────────────────────

interface TermoData {
  termo: string;
  simples?: string;
  tecnica?: string;
  rawText: string;
}

function parseTermosText(text: string): TermoData[] {
  if (!text) return [];

  const normalized = text.replace(/^(?:-{2,4}\s*TERMO\s*-{2,4})/gim, '---SPLIT_TERMO---');
  const parts = normalized.split('---SPLIT_TERMO---').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    const cleanText = text.replace(/^(?:-{2,4}\s*TERMO\s*-{2,4})\s*/gim, '').trim();
    return [{ termo: 'Termo Jurídico', rawText: cleanText }];
  }

  return parts.map((part, idx) => {
    const cleanPart = part.replace(/^(?:-{2,4}\s*TERMO\s*-{2,4})\s*/gim, '').trim();
    const lines = cleanPart.split('\n');

    let termo = `Termo ${idx + 1}`;
    const titleLine = lines.find(l => /^##\s+/i.test(l) || /^\*\*/i.test(l));
    if (titleLine) {
      termo = titleLine.replace(/^##\s*/, '').replace(/^\*\*/, '').replace(/\*\*.*$/, '').trim();
    }

    const simplesMatch = cleanPart.match(/-\s*\*\*Definição simples\*\*:\s*([^\n]+(?:\n(?!\s*-\s*\*\*)[^\n]+)*)/i);
    const tecnicaMatch = cleanPart.match(/-\s*\*\*Definição técnica\*\*:\s*([^\n]+(?:\n(?!\s*-\s*\*\*)[^\n]+)*)/i);

    return {
      termo: termo || `Termo ${idx + 1}`,
      simples: simplesMatch ? simplesMatch[1].trim() : undefined,
      tecnica: tecnicaMatch ? tecnicaMatch[1].trim() : undefined,
      rawText: cleanPart
    };
  });
}

export const TermosTabContent: React.FC<{ content: string; fontSize?: number }> = ({
  content,
  fontSize = 15
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const termos = parseTermosText(content);

  const handleCopy = (idx: number, t: TermoData) => {
    const textToCopy = `${t.termo}\n\n• Definição simples: ${t.simples || ''}\n• Definição técnica: ${t.tecnica || ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIdx(idx);
    haptic.selection();
    toast.success('Termo copiado!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {termos.map((t, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: idx * 0.04 }}
          className="rounded-2xl border border-border/80 bg-card/90 shadow-md p-4 sm:p-5 space-y-3.5"
        >
          <div className="flex items-center justify-between gap-3 border-l-4 border-l-primary pl-3.5 py-0.5">
            <span className="!font-card font-bold text-foreground text-base sm:text-[17px]">
              {t.termo}
            </span>
            <button
              onClick={() => handleCopy(idx, t)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60 shrink-0"
              title="Copiar termo"
            >
              {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copiedIdx === idx ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          {t.simples && (
            <div className="rounded-xl bg-secondary/35 border border-border/60 p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Definição Simples (Para Leigos)
              </span>
              <p className="text-foreground/90 text-sm sm:text-[15px] font-body leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                {t.simples}
              </p>
            </div>
          )}

          {t.tecnica && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
                Definição Técnica (Jurídica)
              </span>
              <p className="text-foreground/90 text-sm sm:text-[15px] font-body leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
                {t.tecnica}
              </p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

