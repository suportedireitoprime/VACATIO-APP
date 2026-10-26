import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  Flame,
  Zap,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PerguntaBlitz {
  id: number;
  pergunta: string;
  opcoes: string[];
  gabarito: string;
}

interface ContraRelogioViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
  hideHeader?: boolean;
}

const TEMPO_POR_QUESTAO = 15; // 15 segundos por pergunta rápida

function gerarPerguntasBlitz(artigoNumero: string, texto: string): PerguntaBlitz[] {
  const palavras = texto.split(/\s+/).filter(p => p.length > 5);
  const palavraDestaque = palavras[0] || 'obrigação';

  return [
    {
      id: 1,
      pergunta: `O Art. ${artigoNumero} regula diretamente qual instituto jurídico principal?`,
      opcoes: [
        'A regra de vigência e eficácia do dispositivo',
        'Norma revogada sem efeitos',
        'Competência exclusiva internacional',
        'Prescrição intercorrente genérica'
      ],
      gabarito: 'A regra de vigência e eficácia do dispositivo',
    },
    {
      id: 2,
      pergunta: `Qual o grau de cogência habitual da regra prevista no Art. ${artigoNumero}?`,
      opcoes: [
        'Norma de ordem pública com eficácia plena',
        'Mera sugestão sem força normativa',
        'Revogável por decreto municipal simples',
        'Aplicável exclusivamente aos sábados'
      ],
      gabarito: 'Norma de ordem pública com eficácia plena',
    },
    {
      id: 3,
      pergunta: `O descumprimento do disposto no Art. ${artigoNumero} acarreta:`,
      opcoes: [
        'Sanções e efeitos materiais previstos em lei',
        'Nenhum efeito, pois a norma é consultiva',
        'Extinção automática do processo sem resolução',
        'Eficácia restrita aos ministérios'
      ],
      gabarito: 'Sanções e efeitos materiais previstos em lei',
    },
    {
      id: 4,
      pergunta: `Em relação à interpretação do Art. ${artigoNumero}, deve-se priorizar:`,
      opcoes: [
        'Interpretação sistemática e teleológica',
        'Interpretação isolada contrária à Constituição',
        'Ignorar os parágrafos e incisos',
        'Interpretação baseada em direito alienígena não ratificado'
      ],
      gabarito: 'Interpretação sistemática e teleológica',
    },
  ];
}

export const ContraRelogioView: React.FC<ContraRelogioViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
  hideHeader,
}) => {
  const perguntas = useMemo(() => gerarPerguntasBlitz(artigoNumero, artigoTexto), [artigoNumero, artigoTexto]);
  const [indexAtual, setIndexAtual] = useState(0);
  const [tempoRestante, setTempoRestante] = useState(TEMPO_POR_QUESTAO);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [pontos, setPontos] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finalizado, setFinalizado] = useState(false);
  const [emPausa, setEmPausa] = useState(false);

  const questaoAtual = perguntas[indexAtual];
  const totalPerguntas = perguntas.length;

  // Cronômetro regressivo
  useEffect(() => {
    if (finalizado || emPausa) return;

    if (tempoRestante <= 0) {
      // Tempo esgotado para esta pergunta
      handleEsgotouTempo();
      return;
    }

    const timer = setInterval(() => {
      setTempoRestante(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [tempoRestante, finalizado, emPausa]);

  const handleEsgotouTempo = () => {
    toast.error('Tempo esgotado nesta questão!');
    setStreak(0);
    avancarProxima();
  };

  const handleResponder = (opcao: string) => {
    if (respostas[questaoAtual.id] !== undefined) return;
    setRespostas(prev => ({ ...prev, [questaoAtual.id]: opcao }));

    const correta = opcao === questaoAtual.gabarito;
    if (correta) {
      const pontosGanhos = 100 + tempoRestante * 10 + streak * 20;
      setPontos(p => p + pontosGanhos);
      setStreak(s => s + 1);
      toast.success(`+${pontosGanhos} pts!`);
    } else {
      setStreak(0);
      toast.error('Incorreto!');
    }

    setEmPausa(true);
    setTimeout(() => {
      setEmPausa(false);
      avancarProxima();
    }, 900);
  };

  const avancarProxima = () => {
    if (indexAtual < totalPerguntas - 1) {
      setIndexAtual(i => i + 1);
      setTempoRestante(TEMPO_POR_QUESTAO);
    } else {
      setFinalizado(true);
    }
  };

  const handleReiniciar = () => {
    setIndexAtual(0);
    setTempoRestante(TEMPO_POR_QUESTAO);
    setRespostas({});
    setPontos(0);
    setStreak(0);
    setFinalizado(false);
    setEmPausa(false);
  };

  const pctTempo = (tempoRestante / TEMPO_POR_QUESTAO) * 100;

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm">
        <div>
          <span className="text-[11px] font-semibold text-orange-500 uppercase tracking-wider block">
            Praticar • Desafio Contra o Relógio
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
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 max-w-2xl mx-auto w-full flex flex-col justify-center">
        {!finalizado ? (
          <div className="space-y-6">
            {/* HUD: Placar, Streak e Cronômetro */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-black font-mono">
                  {pontos} PTS
                </span>
                {streak > 1 && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1 animate-pulse">
                    <Flame className="w-3.5 h-3.5" />
                    {streak}x Streak
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono font-bold text-sm">
                <Timer className={`w-4 h-4 ${tempoRestante <= 5 ? 'text-rose-500 animate-spin' : 'text-orange-400'}`} />
                <span className={tempoRestante <= 5 ? 'text-rose-400 font-black text-base' : 'text-foreground'}>
                  {tempoRestante}s
                </span>
              </div>
            </div>

            {/* Barra de Tempo Regressiva */}
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden border border-border">
              <div
                className={`h-full transition-all duration-1000 ${
                  tempoRestante <= 5 ? 'bg-rose-500' : 'bg-orange-500'
                }`}
                style={{ width: `${pctTempo}%` }}
              />
            </div>

            {/* Pergunta Atual */}
            <div className="p-6 rounded-2xl bg-secondary/30 border border-border shadow-sm space-y-3">
              <div className="text-xs text-foreground/60 font-semibold uppercase tracking-wider">
                Pergunta {indexAtual + 1} de {totalPerguntas}
              </div>
              <p className="text-base sm:text-lg font-serif font-medium leading-relaxed text-foreground">
                {questaoAtual.pergunta}
              </p>
            </div>

            {/* Alternativas de Tiro Rápido */}
            <div className="space-y-3">
              {questaoAtual.opcoes.map((opcao, i) => {
                const respondida = respostas[questaoAtual.id] !== undefined;
                const isCorreta = opcao === questaoAtual.gabarito;
                const foiSelecionada = respostas[questaoAtual.id] === opcao;

                return (
                  <button
                    key={i}
                    disabled={respondida || emPausa}
                    onClick={() => handleResponder(opcao)}
                    className={`w-full p-4 rounded-xl text-left transition-all border flex items-center justify-between text-xs sm:text-sm font-medium ${
                      respondida
                        ? isCorreta
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : foiSelecionada
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-background/40 border-border opacity-40'
                        : 'bg-secondary/40 border-border hover:border-orange-500/60 hover:bg-secondary text-foreground active:scale-[0.99]'
                    }`}
                  >
                    <span>{opcao}</span>
                    {respondida && isCorreta && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Placar Final */
          <div className="text-center p-8 rounded-3xl bg-secondary/30 border border-border space-y-5">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/10">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-2xl font-black text-foreground">
                Tempo Esgotado!
              </h4>
              <p className="text-2xl font-mono font-black text-orange-400">
                {pontos} PONTOS
              </p>
              <p className="text-xs text-foreground/70 max-w-sm mx-auto">
                Você respondeu as perguntas em alta velocidade sob pressão do relógio.
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
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Jogar Novamente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
