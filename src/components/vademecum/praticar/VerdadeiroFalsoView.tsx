import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Check,
  X,
  HelpCircle,
  Lightbulb,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AfirmativaVF {
  id: number;
  enunciado: string;
  gabarito: boolean; // true = Verdadeiro / Certo, false = Falso / Errado
  justificativa: string;
}

interface VerdadeiroFalsoViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
  hideHeader?: boolean;
}

// Gera afirmativas de Certo ou Errado baseadas no artigo
function gerarAfirmativasArtigo(artigoNumero: string, texto: string): AfirmativaVF[] {
  if (!texto || texto.trim().length === 0) {
    return [
      {
        id: 1,
        enunciado: `O artigo ${artigoNumero} estabelece diretrizes e normas jurídicas aplicáveis no âmbito da referida legislação.`,
        gabarito: true,
        justificativa: 'Afirmativa alinhada com o teor normativo geral do dispositivo.',
      }
    ];
  }

  const afirmativas: AfirmativaVF[] = [];

  // Afirmativa 1: Verdadeira literal ou parafraseada
  const textoLimpo = texto.replace(/\n+/g, ' ').trim();
  const primeiraFrase = textoLimpo.split(/[;.:]/)[0] || textoLimpo;

  afirmativas.push({
    id: 1,
    enunciado: `De acordo com o Art. ${artigoNumero}, é correto afirmar que: "${primeiraFrase.trim()}".`,
    gabarito: true,
    justificativa: `Correto. Essa é a dicção literal e expressa constante no caput do Art. ${artigoNumero}.`,
  });

  // Afirmativa 2: Falsa (inversão com 'nunca', 'independe', 'vedada', etc.)
  afirmativas.push({
    id: 2,
    enunciado: `A aplicação das regras e obrigações fixadas no Art. ${artigoNumero} independe de qualquer previsão legal ou condição, aplicando-se irrestritamente mesmo quando houver disposição em contrário.`,
    gabarito: false,
    justificativa: `Errado. As normas jurídicas devem ser interpretadas sistematicamente em conformidade com o ordenamento e suas condições de eficácia.`,
  });

  // Afirmativa 3: Falsa ou Verdadeira dependendo do contexto
  if (texto.toLowerCase().includes('prazo') || texto.toLowerCase().includes('dia') || texto.toLowerCase().includes('ano')) {
    afirmativas.push({
      id: 3,
      enunciado: `Os prazos e marcos temporais previstos no Art. ${artigoNumero} são meramente indicativos e não produzem preclusão ou efeitos materiais.`,
      gabarito: false,
      justificativa: `Errado. Os prazos legais possuem natureza cogente e geram efeitos jurídicos imediatos (decadência, preclusão ou prescrição).`,
    });
  } else {
    afirmativas.push({
      id: 3,
      enunciado: `O descumprimento dos comandos normativos do Art. ${artigoNumero} enseja as consequências e sanções legais pertinentes previstas no diploma legal.`,
      gabarito: true,
      justificativa: `Correto. A violação do preceito primário da norma atrai a sanção ou invalidade do ato praticado em desconformidade.`,
    });
  }

  // Afirmativa 4: Pegadinha clássica
  afirmativas.push({
    id: 4,
    enunciado: `É facultado às partes revogar tacitamente a eficácia do Art. ${artigoNumero} por simples convenção particular, ainda que se trate de norma de ordem pública.`,
    gabarito: false,
    justificativa: `Errado. Normas de ordem pública e cogentes são inderrogáveis pela vontade das partes.`,
  });

  return afirmativas;
}

export const VerdadeiroFalsoView: React.FC<VerdadeiroFalsoViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
  hideHeader,
}) => {
  const questoes = useMemo(() => gerarAfirmativasArtigo(artigoNumero, artigoTexto), [artigoNumero, artigoTexto]);
  const [indexAtual, setIndexAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, boolean>>({});
  const [mostrarJustificativa, setMostrarJustificativa] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const questaoAtual = questoes[indexAtual];
  const totalQuestoes = questoes.length;

  const handleResponder = (valor: boolean) => {
    if (respostas[questaoAtual.id] !== undefined) return;
    setRespostas(prev => ({ ...prev, [questaoAtual.id]: valor }));
    setMostrarJustificativa(true);

    if (valor === questaoAtual.gabarito) {
      toast.success('Resposta Correta!');
    } else {
      toast.error('Gabarito Incorreto!');
    }
  };

  const handleProxima = () => {
    setMostrarJustificativa(false);
    if (indexAtual < totalQuestoes - 1) {
      setIndexAtual(i => i + 1);
    } else {
      setFinalizado(true);
    }
  };

  const handleReiniciar = () => {
    setIndexAtual(0);
    setRespostas({});
    setMostrarJustificativa(false);
    setFinalizado(false);
  };

  const acertos = useMemo(() => {
    return questoes.filter(q => respostas[q.id] === q.gabarito).length;
  }, [questoes, respostas]);

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm">
        <div>
          <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider block">
            Praticar • Certo ou Errado
          </span>
          <h3 className="font-heading font-bold text-base text-foreground">
            Art. {artigoNumero} • {leiNome}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReiniciar}
            className="h-8 text-xs text-foreground/70 hover:text-foreground gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onVoltar}
            className="h-8 text-xs border-border"
          >
            Fechar
          </Button>
        </div>
      </div>
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col justify-center max-w-2xl mx-auto w-full">
        {!finalizado ? (
          <div className="space-y-6">
            {/* Indicador de progresso */}
            <div className="flex items-center justify-between text-xs text-foreground/60 font-medium">
              <span>Questão {indexAtual + 1} de {totalQuestoes}</span>
              <span>Acertos: <strong className="text-emerald-500">{acertos}</strong></span>
            </div>

            {/* Card da Afirmativa */}
            <div className="p-6 sm:p-8 rounded-2xl border border-border bg-secondary/30 shadow-sm space-y-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <Sparkles className="w-3 h-3" />
                Julgue a afirmativa como Certa ou Errada
              </span>

              <p className="text-base sm:text-lg font-serif leading-relaxed text-foreground/95">
                {questaoAtual.enunciado}
              </p>
            </div>

            {/* Botões Certo / Errado */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                disabled={respostas[questaoAtual.id] !== undefined}
                onClick={() => handleResponder(true)}
                className={`h-14 rounded-2xl text-base font-bold gap-2.5 transition-all border-2 ${
                  respostas[questaoAtual.id] !== undefined
                    ? questaoAtual.gabarito === true
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : respostas[questaoAtual.id] === true
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'opacity-40 border-border'
                    : 'border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-400'
                }`}
              >
                <Check className="w-5 h-5" />
                CERTO (Verdadeiro)
              </Button>

              <Button
                variant="outline"
                disabled={respostas[questaoAtual.id] !== undefined}
                onClick={() => handleResponder(false)}
                className={`h-14 rounded-2xl text-base font-bold gap-2.5 transition-all border-2 ${
                  respostas[questaoAtual.id] !== undefined
                    ? questaoAtual.gabarito === false
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : respostas[questaoAtual.id] === false
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'opacity-40 border-border'
                    : 'border-rose-500/40 hover:border-rose-500 hover:bg-rose-500/10 text-rose-400'
                }`}
              >
                <X className="w-5 h-5" />
                ERRADO (Falso)
              </Button>
            </div>

            {/* Justificativa / Comentário */}
            {mostrarJustificativa && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:p-5 rounded-xl bg-secondary/50 border border-border space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-foreground">
                    Gabarito: {questaoAtual.gabarito ? 'CERTO (Verdadeiro)' : 'ERRADO (Falso)'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                  {questaoAtual.justificativa}
                </p>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleProxima}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5"
                  >
                    <span>{indexAtual < totalQuestoes - 1 ? 'Próxima Questão' : 'Ver Resultado'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Tela de Conclusão / Placar */
          <div className="text-center p-8 rounded-3xl bg-secondary/30 border border-border space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-2xl font-black text-foreground">
                Prática Concluída!
              </h4>
              <p className="text-sm text-foreground/70">
                Você acertou <strong className="text-emerald-500">{acertos}</strong> de {totalQuestoes} afirmativas ({Math.round((acertos / totalQuestoes) * 100)}%).
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={onVoltar}
                className="text-xs border-border"
              >
                Voltar aos Modos
              </Button>
              <Button
                variant="default"
                onClick={handleReiniciar}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Refazer Exercício
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
