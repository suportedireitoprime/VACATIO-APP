import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2, Sparkles, BookOpen, Clock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOmniText } from '@/lib/omniRouteClient';

interface ArtigoLei {
  id: string;
  numero: string;
  caput: string;
}

interface NovidadeDetalheProps {
  open: boolean;
  onClose: () => void;
  artigo: ArtigoLei | null;
  tipo: string;
  referencia: string;
  leiNome: string;
  parteModificada: string;
  textoAnterior?: string;
  onGoToArtigo: () => void;
}

export default function NovidadeDetalheSheet({
  open,
  onClose,
  artigo,
  tipo,
  referencia,
  leiNome,
  parteModificada,
  textoAnterior,
  onGoToArtigo
}: NovidadeDetalheProps) {
  const [explicacao, setExplicacao] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && artigo) {
      setExplicacao(null);
      gerarExplicacao();
    }
  }, [open, artigo]);

  const gerarExplicacao = async () => {
    if (!artigo) return;
    setLoading(true);
    try {
      const prompt = `Analise a seguinte alteração legislativa:
Ato/Referência: ${referencia}
Artigo: ${artigo.numero}
Tipo de Alteração: ${tipo} (${parteModificada})
Lei Afetada: ${leiNome}
Texto Anterior: ${textoAnterior || 'Não disponível na base (alteração histórica).'}
Texto Atual: ${artigo.caput}

Por favor, explique em linguagem clara e objetiva:
1. O que mudou de fato na lei? (Contexto)
2. Qual o impacto prático dessa mudança para o direito?
3. Se aplicável, o que foi revogado ou adicionado?
Mantenha o texto bem formatado, didático e vá direto ao ponto, não fique enrolando.`;

      const response = await generateOmniText({
        prompt,
        systemPrompt: "Você é um assistente jurídico sênior especializado em analisar alterações legislativas.",
        temperature: 0.5,
        complexity: 'medium'
      });
      setExplicacao(response);
    } catch (err) {
      console.error('Erro ao gerar explicacao', err);
      setExplicacao('Não foi possível carregar a explicação da IA no momento. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  if (!artigo) return null;

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent side="bottom" className="h-[100dvh] rounded-none px-0 pb-0 pt-0 flex flex-col gap-0 border-none bg-background">
        <SheetHeader className="px-4 py-3 border-b border-border text-left flex flex-row items-center gap-3 space-y-0 sticky top-0 bg-background/80 backdrop-blur-xl z-20">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center shrink-0">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <SheetTitle className="font-display font-bold text-lg truncate">Detalhes da Alteração</SheetTitle>
            <p className="text-xs text-muted-foreground truncate">{artigo.numero}</p>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary">{tipo}</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">{parteModificada}</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground">{referencia}</span>
            </div>
            
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="bg-secondary/40 px-4 py-2 border-b border-border flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Texto Atual</h3>
              </div>
              <div className="p-4">
                <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap">{artigo.caput}</p>
              </div>
            </div>

            {textoAnterior && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 overflow-hidden">
                <div className="bg-destructive/10 px-4 py-2 border-b border-destructive/10 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-destructive" />
                  <h3 className="text-sm font-semibold text-destructive">Texto Anterior</h3>
                </div>
                <div className="p-4">
                  <p className="text-[15px] leading-relaxed text-destructive/80 whitespace-pre-wrap line-through opacity-80">{textoAnterior}</p>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 p-5 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold">Explicação da IA</h3>
              </div>
              
              <div className="text-sm text-foreground/80 leading-relaxed min-h-[100px]">
                {loading ? (
                  <div className="flex items-center gap-3 text-indigo-400/70">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando impacto da mudança...</span>
                  </div>
                ) : explicacao ? (
                  <div className="whitespace-pre-wrap">{explicacao}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-background pb-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
          <Button 
            onClick={onGoToArtigo} 
            className="w-full h-12 text-[15px] rounded-xl flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <BookOpen className="w-5 h-5" />
            Ir para o artigo na lei
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
