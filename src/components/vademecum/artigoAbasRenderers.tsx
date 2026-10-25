import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Lightbulb, 
  Layers, 
  Scale, 
  ExternalLink, 
  Copy, 
  Check, 
  HelpCircle, 
  AlertCircle, 
  ArrowRight, 
  BookOpen,
  ChevronDown
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

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    haptic.selection();
    toast.success('Ideia central copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-secondary/50 to-card p-6 shadow-2xl backdrop-blur-md"
      >
        {/* Glow de fundo */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[11px] font-bold text-primary tracking-wider uppercase block">Porta de Entrada Mental</span>
              <span className="text-xs text-foreground/60 font-medium">Ideia Central • {artigoNumero || 'Artigo'}</span>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-medium text-foreground/80 hover:text-foreground transition-colors border border-border/60"
            title="Copiar ideia"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        {/* Texto da Ideia */}
        <div 
          className="font-body text-foreground/95 leading-relaxed font-normal tracking-wide [&_strong]:text-primary [&_strong]:font-bold [&_strong]:drop-shadow-sm space-y-3"
          style={{ fontSize: `${Math.max(fontSize, 16.5)}px` }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Rodapé pedagógico */}
        <div className="mt-6 pt-4 border-t border-primary/15 flex items-start gap-2.5 text-xs text-foreground/70">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Como usar este conceito:</strong> Guarde esta ideia como sua âncora de raciocínio. Ao ler os incisos e parágrafos, veja como cada detalhe serve para colocar este objetivo em prática.
          </p>
        </div>
      </motion.div>
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
      title: 'Desdobramento do Artigo',
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
  const trechos = parseDesdobramentoText(content);

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
            <div className="p-4 sm:p-5 border-b border-border/50 bg-secondary/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                  {idx + 1}
                </span>
                <h3 className="font-heading font-semibold text-base text-foreground tracking-wide">
                  {t.title}
                </h3>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4" style={{ fontSize: `${fontSize}px` }}>
              {/* Texto Oficial se identificado */}
              {t.textoOficial && (
                <div className="rounded-xl bg-secondary/50 border border-border/60 p-3.5 text-foreground/80 italic text-sm font-serif">
                  "{t.textoOficial}"
                </div>
              )}

              {/* Explicação do Trecho */}
              {t.explicacao && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 font-body leading-relaxed [&_p]:my-2 [&_strong]:text-primary">
                  <ReactMarkdown>{t.explicacao}</ReactMarkdown>
                </div>
              )}

              {/* Por que a lei fez assim? */}
              {t.porque && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4" />
                    <span>Por que a lei fez assim?</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed font-body">
                    {t.porque}
                  </p>
                </div>
              )}

              {/* Seção Palavra por Palavra */}
              {t.palavras.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    Palavra por palavra deste trecho
                  </h4>

                  <div className="grid grid-cols-1 gap-2.5">
                    {t.palavras.map((p, pIdx) => (
                      <div 
                        key={pIdx}
                        className="rounded-xl border border-border/80 bg-secondary/25 p-3.5 space-y-2 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-xs font-bold">
                            {p.termo}
                          </span>
                        </div>

                        {p.significado && (
                          <div className="text-xs text-foreground/90 leading-relaxed">
                            <span className="font-semibold text-foreground">O que significa aqui: </span>
                            {p.significado}
                          </div>
                        )}

                        {p.porque && (
                          <div className="text-xs text-foreground/80 leading-relaxed">
                            <span className="font-semibold text-amber-400">Por que a lei escolheu esta palavra: </span>
                            {p.porque}
                          </div>
                        )}

                        {p.outra && (
                          <div className="text-xs text-foreground/70 leading-relaxed italic bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="font-semibold text-rose-400 not-italic">E se fosse outra? </span>
                            {p.outra}
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
  const julgados = parseJurisprudenciaText(content);

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
          <div className="p-4 sm:p-5 border-b border-border/50 bg-secondary/30 flex flex-wrap items-center justify-between gap-2">
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

            <h4 className="font-heading font-semibold text-sm sm:text-base text-foreground flex-1 min-w-[200px]">
              {j.titulo}
            </h4>
          </div>

          <div className="p-4 sm:p-5 space-y-4" style={{ fontSize: `${fontSize}px` }}>
            {/* O Caso Concreto */}
            {j.caso && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground/50 uppercase tracking-wider block">O Caso Concreto</span>
                <p className="text-sm text-foreground/90 leading-relaxed font-body">
                  {j.caso}
                </p>
              </div>
            )}

            {/* A Decisão / Tese */}
            {j.decisao && (
              <div className="rounded-2xl bg-primary/10 border border-primary/25 p-4 space-y-1.5">
                <span className="text-xs font-bold text-primary uppercase tracking-wider block">A Tese Fixada pelo Tribunal</span>
                <p className="text-sm font-medium text-foreground leading-relaxed font-body">
                  "{j.decisao}"
                </p>
              </div>
            )}

            {/* Por que importa para o artigo */}
            {j.importancia && (
              <div className="rounded-xl bg-secondary/30 border border-border/40 p-3.5 space-y-1">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Impacto Prático no Artigo</span>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-body">
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
            <h4 className="font-heading font-semibold text-sm text-foreground">Quer ver todos os acórdãos e súmulas?</h4>
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
