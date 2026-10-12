import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  CheckCircle2,
  Trophy,
  Split,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ParColuna {
  id: string;
  esquerda: string; // Ex: "Inciso I", "Caput", "Parágrafo Único"
  direita: string;  // Conceito / conteúdo
}

interface RelacioneColunasViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
}

// Extrai elementos do artigo para montar duas colunas correlacionadas
function gerarParesColunas(artigoNumero: string, texto: string): ParColuna[] {
  const linhas = texto.split(/\n+/).map(l => l.trim()).filter(l => l.length > 5);

  const pares: ParColuna[] = [];

  linhas.forEach((linha, idx) => {
    if (pares.length >= 4) return;

    if (/^[IVXLC]+\s*[-–.]/i.test(linha)) {
      const parts = linha.split(/[-–.]/);
      pares.push({
        id: `par-${idx}`,
        esquerda: parts[0].trim(),
        direita: parts.slice(1).join(' - ').trim() || linha,
      });
    } else if (/^§\s*\d+/i.test(linha) || /^Parágrafo\s+único/i.test(linha)) {
      const parts = linha.split(/[-–.]/);
      pares.push({
        id: `par-${idx}`,
        esquerda: parts[0].trim(),
        direita: parts.slice(1).join(' - ').trim() || linha,
      });
    } else if (/^[a-z]\)/i.test(linha)) {
      const parts = linha.split(/\)/);
      pares.push({
        id: `par-${idx}`,
        esquerda: `Alínea ${parts[0].trim()}`,
        direita: parts.slice(1).join('').trim() || linha,
      });
    }
  });

  // Se não houver subdivisões suficientes, cria pares conceituais do caput
  if (pares.length < 3) {
    return [
      {
        id: '1',
        esquerda: `Art. ${artigoNumero} (Hipótese de Incidência)`,
        direita: 'Fato concreto que atrai os efeitos jurídicos previstos na norma',
      },
      {
        id: '2',
        esquerda: 'Preceito Primário (Comando Legal)',
        direita: 'A conduta ou dever jurídico imposto aos destinatários da lei',
      },
      {
        id: '3',
        esquerda: 'Consequência Jurídica (Sanção / Efeito)',
        direita: 'Resultado material ou processual decorrente do cumprimento ou violação',
      },
      {
        id: '4',
        esquerda: 'Âmbito de Eficácia',
        direita: 'Aplicabilidade imediata com força obrigatória no ordenamento',
      },
    ];
  }

  return pares;
}

export const RelacioneColunasView: React.FC<RelacioneColunasViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
}) => {
  const paresOriginais = useMemo(() => gerarParesColunas(artigoNumero, artigoTexto), [artigoNumero, artigoTexto]);

  // Coluna esquerda mantida, coluna direita embaralhada
  const colunaEsquerda = useMemo(() => paresOriginais.map(p => ({ id: p.id, texto: p.esquerda })), [paresOriginais]);
  const colunaDireitaEmbaralhada = useMemo(() => {
    return [...paresOriginais].sort(() => Math.random() - 0.5).map(p => ({ id: p.id, texto: p.direita }));
  }, [paresOriginais]);

  const [selecionadoEsquerda, setSelecionadoEsquerda] = useState<string | null>(null);
  const [ligacoes, setLigacoes] = useState<Record<string, string>>({}); // { esqId: dirId }
  const [verificado, setVerificado] = useState(false);

  const handleCliqueEsquerda = (id: string) => {
    if (verificado) return;
    setSelecionadoEsquerda(id);
  };

  const handleCliqueDireita = (dirId: string) => {
    if (verificado || !selecionadoEsquerda) return;
    setLigacoes(prev => ({
      ...prev,
      [selecionadoEsquerda]: dirId,
    }));
    setSelecionadoEsquerda(null);
  };

  const handleRemoverLigacao = (esqId: string) => {
    if (verificado) return;
    setLigacoes(prev => {
      const copy = { ...prev };
      delete copy[esqId];
      return copy;
    });
  };

  const handleReiniciar = () => {
    setLigacoes({});
    setSelecionadoEsquerda(null);
    setVerificado(false);
  };

  const totalPares = paresOriginais.length;
  const acertos = useMemo(() => {
    return Object.entries(ligacoes).filter(([esqId, dirId]) => esqId === dirId).length;
  }, [ligacoes]);

  const tudoRespondido = Object.keys(ligacoes).length === totalPares;

  const handleVerificar = () => {
    setVerificado(true);
    if (acertos === totalPares) {
      toast.success('Parabéns! Todas as colunas relacionadas perfeitamente!');
    } else {
      toast.info(`Você relacionou corretamente ${acertos} de ${totalPares} pares.`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm">
        <div>
          <span className="text-[11px] font-semibold text-pink-500 uppercase tracking-wider block">
            Praticar • Relacione as Colunas
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

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 max-w-3xl mx-auto w-full space-y-6">
        <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300">
          💡 Clique em um item da <strong>Coluna A (Dispositivo)</strong> e depois no seu respectivo conceito na <strong>Coluna B (Conteúdo)</strong> para fazer a correspondência.
        </div>

        {/* As Duas Colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna A: Esquerda */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              Coluna A — Dispositivo / Inciso
            </h4>
            <div className="space-y-2.5">
              {colunaEsquerda.map(item => {
                const ligadaCom = ligacoes[item.id];
                const isSelected = selecionadoEsquerda === item.id;
                const isCorreta = verificado && ligadaCom === item.id;
                const isErrada = verificado && ligadaCom && ligadaCom !== item.id;

                return (
                  <button
                    key={item.id}
                    disabled={verificado}
                    onClick={() => handleCliqueEsquerda(item.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all border flex items-center justify-between text-xs sm:text-sm font-medium ${
                      verificado
                        ? isCorreta
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : isErrada
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-secondary/30 border-border opacity-50'
                        : isSelected
                        ? 'bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-500/20'
                        : ligadaCom
                        ? 'bg-secondary/60 border-pink-500/50 text-foreground'
                        : 'bg-secondary/30 border-border hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span>{item.texto}</span>
                    {ligadaCom && !verificado && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoverLigacao(item.id);
                        }}
                        className="text-[10px] text-pink-400 hover:text-pink-300 underline font-mono"
                      >
                        desvincular
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna B: Direita */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              Coluna B — Conceito / Conteúdo
            </h4>
            <div className="space-y-2.5">
              {colunaDireitaEmbaralhada.map(item => {
                const ligadaPor = Object.keys(ligacoes).find(k => ligacoes[k] === item.id);
                const isCorreta = verificado && ligadaPor === item.id;
                const isErrada = verificado && ligadaPor && ligadaPor !== item.id;

                return (
                  <button
                    key={item.id}
                    disabled={verificado || !selecionadoEsquerda}
                    onClick={() => handleCliqueDireita(item.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all border text-xs sm:text-sm font-medium leading-relaxed ${
                      verificado
                        ? isCorreta
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : isErrada
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-secondary/30 border-border opacity-50'
                        : ligadaPor
                        ? 'bg-secondary/60 border-pink-500/50 text-foreground'
                        : selecionadoEsquerda
                        ? 'bg-secondary/40 border-pink-500/30 hover:border-pink-500 hover:bg-secondary text-foreground'
                        : 'bg-secondary/20 border-border text-foreground/60'
                    }`}
                  >
                    {item.texto}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-4">
        <div className="text-xs text-foreground/70">
          {verificado ? (
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-pink-500" />
              Resultado: {acertos} de {totalPares} pares corretos ({Math.round((acertos / totalPares) * 100)}%)
            </span>
          ) : (
            <span>
              Relacionados: <strong className="text-foreground">{Object.keys(ligacoes).length}</strong> de {totalPares}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!verificado ? (
            <Button
              variant="default"
              size="sm"
              disabled={!tudoRespondido}
              onClick={handleVerificar}
              className="bg-pink-600 hover:bg-pink-500 text-white text-xs h-9 px-5 font-semibold gap-1.5 shadow-md shadow-pink-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Verificar Conexões
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleReiniciar}
              className="bg-pink-600 hover:bg-pink-500 text-white text-xs h-9 px-5 font-semibold gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
