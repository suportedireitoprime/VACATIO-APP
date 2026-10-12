import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  CheckCircle2,
  Trophy,
  ArrowUp,
  ArrowDown,
  GripVertical,
  HelpCircle,
  Lightbulb,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BlocoNorma {
  id: string;
  ordemCorreta: number;
  texto: string;
}

interface MonteArtigoViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
}

// Fragmenta o artigo em blocos lógicos (orações ou incisos/parágrafos)
function fragmentarArtigoEmBlocos(texto: string): BlocoNorma[] {
  if (!texto || texto.trim().length === 0) {
    return [{ id: '1', ordemCorreta: 0, texto: 'Texto indisponível' }];
  }

  // Tenta quebrar por quebras de linha (parágrafos/incisos)
  let pedacos = texto.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);

  // Se for apenas um parágrafo longo, quebra por pontuação estrutural (ponto, ponto e vírgula, dois pontos)
  if (pedacos.length <= 2) {
    pedacos = texto.split(/(?<=[;.:])\s+/).map(p => p.trim()).filter(p => p.length > 5);
  }

  // Se ainda for curto, quebra por vírgula em blocos de no mínimo 25 caracteres
  if (pedacos.length <= 2) {
    pedacos = texto.split(/(?<=[,])\s+/).map(p => p.trim()).filter(p => p.length > 3);
  }

  return pedacos.map((p, idx) => ({
    id: `bloco-${idx}`,
    ordemCorreta: idx,
    texto: p,
  }));
}

export const MonteArtigoView: React.FC<MonteArtigoViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
}) => {
  const blocosOriginais = useMemo(() => fragmentarArtigoEmBlocos(artigoTexto), [artigoTexto]);

  // Embaralha os blocos inicialmente
  const [blocosAtuais, setBlocosAtuais] = useState<BlocoNorma[]>(() => {
    return [...blocosOriginais].sort(() => Math.random() - 0.5);
  });

  const [verificado, setVerificado] = useState(false);
  const [mostrarGabarito, setMostrarGabarito] = useState(false);

  // Mover bloco para cima
  const moverParaCima = (idx: number) => {
    if (idx === 0 || verificado) return;
    setBlocosAtuais(prev => {
      const copy = [...prev];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx - 2 < -1 ? idx : idx - 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  };

  // Mover bloco para baixo
  const moverParaBaixo = (idx: number) => {
    if (idx >= blocosAtuais.length - 1 || verificado) return;
    setBlocosAtuais(prev => {
      const copy = [...prev];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  };

  const handleReiniciar = () => {
    setBlocosAtuais([...blocosOriginais].sort(() => Math.random() - 0.5));
    setVerificado(false);
    setMostrarGabarito(false);
  };

  // Cálculo de acertos por posição
  const acertos = useMemo(() => {
    return blocosAtuais.filter((b, idx) => b.ordemCorreta === idx).length;
  }, [blocosAtuais]);

  const totalBlocos = blocosOriginais.length;
  const estaTudoCorreto = acertos === totalBlocos;

  const handleVerificar = () => {
    setVerificado(true);
    if (estaTudoCorreto) {
      toast.success('Fantástico! Artigo montado na sequência legal perfeita!');
    } else {
      toast.info(`Você acertou a ordem de ${acertos} de ${totalBlocos} fragmentos.`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm">
        <div>
          <span className="text-[11px] font-semibold text-purple-500 uppercase tracking-wider block">
            Praticar • Monte o Artigo
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
            Embaralhar
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

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
        {/* Banner instrutivo */}
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <strong>Desafio de Quebra-Cabeça Legal:</strong>
            <p className="mt-0.5 opacity-90">
              Ordene os blocos de texto abaixo na sequência exata em que foram redigidos pelo legislador. Use os botões de subir e descer para reposicionar.
            </p>
          </div>
        </div>

        {/* Lista de Blocos para Ordenar */}
        <div className="space-y-3">
          {blocosAtuais.map((bloco, idx) => {
            const isCorreto = bloco.ordemCorreta === idx;

            return (
              <motion.div
                key={bloco.id}
                layout
                className={`p-4 rounded-xl border transition-all flex items-center gap-3.5 ${
                  verificado
                    ? isCorreto
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    : 'bg-secondary/40 border-border hover:border-purple-500/40 text-foreground'
                }`}
              >
                {/* Posição atual */}
                <div className="flex flex-col items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-background/80 border border-border font-mono font-bold text-xs">
                  {idx + 1}º
                </div>

                {/* Texto do Bloco */}
                <div className="flex-1 text-sm sm:text-base font-serif leading-relaxed">
                  {bloco.texto}
                </div>

                {/* Controles de Movimentação */}
                {!verificado && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => moverParaCima(idx)}
                      className="p-1.5 rounded-md bg-background border border-border hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === blocosAtuais.length - 1}
                      onClick={() => moverParaBaixo(idx)}
                      className="p-1.5 rounded-md bg-background border border-border hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Status verificado */}
                {verificado && (
                  <div className="shrink-0">
                    {isCorreto ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-rose-400">
                        Era #{bloco.ordemCorreta + 1}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Visualização do Gabarito Completo se solicitado */}
        {mostrarGabarito && (
          <div className="p-5 rounded-2xl bg-secondary/50 border border-border space-y-3">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Redação Original Completa do Artigo:
            </h4>
            <p className="text-sm sm:text-base font-serif leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {artigoTexto}
            </p>
          </div>
        )}
      </div>

      {/* Footer com Ações */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-4">
        <div className="text-xs text-foreground/70">
          {verificado ? (
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-purple-500" />
              Acertos: {acertos} de {totalBlocos} fragmentos ({Math.round((acertos / totalBlocos) * 100)}%)
            </span>
          ) : (
            <span>Posicione todos os {totalBlocos} blocos na ordem</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {verificado && !estaTudoCorreto && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarGabarito(!mostrarGabarito)}
              className="text-xs border-border h-9"
            >
              {mostrarGabarito ? 'Ocultar Texto' : 'Ver Texto Correto'}
            </Button>
          )}

          {!verificado ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleVerificar}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-9 px-5 font-semibold gap-1.5 shadow-md shadow-purple-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Validar Sequência
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleReiniciar}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-9 px-5 font-semibold gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
