import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  Briefcase,
  HelpCircle,
  Lightbulb,
  Sparkles,
  ArrowRight,
  UserCheck,
  Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CasoPratico {
  id: number;
  titulo: string;
  cenarioFatico: string;
  pergunta: string;
  alternativas: { id: string; texto: string; correta: boolean; explicacao: string }[];
}

interface CasosPraticosViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
  hideHeader?: boolean;
}

// Gera cenários fáticos e casos práticos de aplicação do artigo
function gerarCasosPraticosArtigo(artigoNumero: string, texto: string, leiNome: string): CasoPratico[] {
  const textoLimpo = texto.replace(/\n+/g, ' ').trim();
  const trecho = textoLimpo.slice(0, 140);

  return [
    {
      id: 1,
      titulo: 'Caso Concreto: Consulta Jurídica',
      cenarioFatico: `Um cliente procura seu escritório de advocacia relatando uma situação concreta que envolve diretamente a regra prevista no Art. ${artigoNumero} de ${leiNome}. Diante dos fatos expostos, há controvérsia sobre a incidência imediata da norma: "${trecho}..."`,
      pergunta: `Considerando a hipótese fática e os preceitos expressos do Art. ${artigoNumero}, qual orientação jurídica está em conformidade com a legislação?`,
      alternativas: [
        {
          id: 'A',
          texto: `A regra do Art. ${artigoNumero} aplica-se plenamente ao caso concreto, devendo ser observadas todas as condições e prazos previstos na norma.`,
          correta: true,
          explicacao: `Correto! O comando do Art. ${artigoNumero} possui eficácia vinculante aos casos que preencham seus requisitos de incidência.`,
        },
        {
          id: 'B',
          texto: `A norma é meramente programática e não confere exigibilidade no plano dos fatos concretos narrados.`,
          correta: false,
          explicacao: `Incorreto. Trata-se de preceito normativo direto que produz efeitos fáticos imediatos.`,
        },
        {
          id: 'C',
          texto: `A vontade unilateral das partes afasta peremptoriamente a incidência do artigo, tornando o litígio nulo de pleno direito.`,
          correta: false,
          explicacao: `Incorreto. A convenção particular não tem o condão de derrogar regras cogentes sem permissivo legal expresso.`,
        },
        {
          id: 'D',
          texto: `A aplicação da norma depende de homologação judicial prévia, mesmo inexistindo litígio entre os interessados.`,
          correta: false,
          explicacao: `Incorreto. O ordenamento não exige intervenção judicial prévia para atos e negócios jurídicos voluntários e regulares.`,
        },
      ],
    },
    {
      id: 2,
      titulo: 'Situação-Problema: Conflito de Interesses',
      cenarioFatico: `Em litígio instaurado entre duas partes contratantes ou litigantes, uma delas alega descumprimento ou inobservância do Art. ${artigoNumero}, requerendo a invalidação dos atos praticados ou indenização compensatória pelos prejuízos sofridos.`,
      pergunta: `Como deve o magistrado ou analista jurídico solucionar o conflito com base no Art. ${artigoNumero}?`,
      alternativas: [
        {
          id: 'A',
          texto: `Indeferir o pedido sumariamente por falta de fundamentação legal.`,
          correta: false,
          explicacao: `Incorreto. Havendo preceito normativo expresso, o julgador deve apreciar a subsunção do fato à norma.`,
        },
        {
          id: 'B',
          texto: `Verificar se os pressupostos materiais do Art. ${artigoNumero} foram violados e aplicar as consequências legais cabíveis ao caso.`,
          correta: true,
          explicacao: `Correto! A subsunção jurídica exige a correlação entre os fatos provados e a hipótese de incidência do Art. ${artigoNumero}.`,
        },
        {
          id: 'C',
          texto: `Determinar a suspensão do processo pelo prazo indeterminado de 5 anos até nova manifestação das cortes superiores.`,
          correta: false,
          explicacao: `Incorreto. A prestação jurisdicional deve ser célere e tempestiva (Art. 5º, LXXVIII da CF).`,
        },
        {
          id: 'D',
          texto: `Aplicar analogicamente norma revogada em detrimento do texto em vigor do artigo.`,
          correta: false,
          explicacao: `Incorreto. A lei vigente tem aplicação imediata respeitados o ato jurídico perfeito, direito adquirido e coisa julgada.`,
        },
      ],
    },
  ];
}

export const CasosPraticosView: React.FC<CasosPraticosViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
  hideHeader,
}) => {
  const casos = useMemo(() => gerarCasosPraticosArtigo(artigoNumero, artigoTexto, leiNome), [artigoNumero, artigoTexto, leiNome]);
  const [indexAtual, setIndexAtual] = useState(0);
  const [selecionadas, setSelecionadas] = useState<Record<number, string>>({});
  const [mostrarExplicacao, setMostrarExplicacao] = useState(false);
  const [finalizado, setFinalizado] = useState(false);

  const casoAtual = casos[indexAtual];
  const totalCasos = casos.length;
  const respostaDada = selecionadas[casoAtual.id];

  const handleEscolher = (altId: string) => {
    if (respostaDada) return;
    setSelecionadas(prev => ({ ...prev, [casoAtual.id]: altId }));
    setMostrarExplicacao(true);

    const alternativa = casoAtual.alternativas.find(a => a.id === altId);
    if (alternativa?.correta) {
      toast.success('Excelente solução jurídica!');
    } else {
      toast.error('Alternativa incorreta para este caso.');
    }
  };

  const handleProximo = () => {
    setMostrarExplicacao(false);
    if (indexAtual < totalCasos - 1) {
      setIndexAtual(i => i + 1);
    } else {
      setFinalizado(true);
    }
  };

  const handleReiniciar = () => {
    setIndexAtual(0);
    setSelecionadas({});
    setMostrarExplicacao(false);
    setFinalizado(false);
  };

  const acertos = useMemo(() => {
    return casos.filter(c => {
      const resp = selecionadas[c.id];
      const alt = c.alternativas.find(a => a.id === resp);
      return alt?.correta;
    }).length;
  }, [casos, selecionadas]);

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm">
        <div>
          <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider block">
            Praticar • Casos Práticos
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

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 max-w-3xl mx-auto w-full space-y-6">
        {!finalizado ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-foreground/60 font-medium">
              <span>Caso {indexAtual + 1} de {totalCasos}</span>
              <span>Acertos: <strong className="text-indigo-400">{acertos}</strong></span>
            </div>

            {/* Cenário Fático */}
            <div className="p-5 sm:p-6 rounded-2xl bg-secondary/30 border border-border shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                <Briefcase className="w-4 h-4" />
                {casoAtual.titulo}
              </div>
              <p className="text-sm sm:text-base font-serif leading-relaxed text-foreground/90">
                {casoAtual.cenarioFatico}
              </p>
            </div>

            {/* Pergunta */}
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs sm:text-sm font-medium text-indigo-200">
              ⚖️ {casoAtual.pergunta}
            </div>

            {/* Alternativas de Resolução */}
            <div className="space-y-3">
              {casoAtual.alternativas.map(alt => {
                const isSelected = respostaDada === alt.id;

                return (
                  <button
                    key={alt.id}
                    disabled={!!respostaDada}
                    onClick={() => handleEscolher(alt.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all border flex items-start gap-3.5 ${
                      respostaDada
                        ? alt.correta
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm'
                          : isSelected
                          ? 'bg-rose-500/10 border-rose-500 text-rose-300'
                          : 'bg-background/40 border-border opacity-50'
                        : isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-secondary/40 border-border hover:bg-secondary hover:border-indigo-500/40 text-foreground'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-xs font-bold shrink-0 font-mono">
                      {alt.id}
                    </span>
                    <span className="flex-1 text-xs sm:text-sm leading-relaxed">
                      {alt.texto}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explicação da Solução */}
            {mostrarExplicacao && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:p-5 rounded-xl bg-secondary/50 border border-border space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-foreground">
                    Fundamentação da Solução Jurídica:
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                  {casoAtual.alternativas.find(a => a.correta)?.explicacao}
                </p>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleProximo}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5"
                  >
                    <span>{indexAtual < totalCasos - 1 ? 'Próximo Caso' : 'Ver Resultado Final'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Tela de Resultado Final */
          <div className="text-center p-8 rounded-3xl bg-secondary/30 border border-border space-y-5">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-2xl font-black text-foreground">
                Análise de Casos Concluída!
              </h4>
              <p className="text-sm text-foreground/70">
                Você solucionou corretamente <strong className="text-indigo-400">{acertos}</strong> de {totalCasos} situações práticas ({Math.round((acertos / totalCasos) * 100)}%).
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
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Refazer Casos
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
