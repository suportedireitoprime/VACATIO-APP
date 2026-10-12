import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Trophy,
  Check,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface LacunaItem {
  id: number;
  palavraOriginal: string;
  dica?: string;
  opcoes: string[];
}

interface CompleteArtigoData {
  segmentos: Array<{
    tipo: 'texto' | 'lacuna';
    conteudo: string;
    lacunaId?: number;
  }>;
  lacunas: LacunaItem[];
  textoCompleto: string;
}

interface CompleteArtigoViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
}

// Extrai palavras-chave jurídicas substantivas do texto para criar as lacunas
function gerarDadosCompleteArtigo(texto: string): CompleteArtigoData {
  if (!texto || texto.trim().length === 0) {
    return { segmentos: [{ tipo: 'texto', conteudo: 'Texto do artigo indisponível.' }], lacunas: [], textoCompleto: '' };
  }

  // Lista de palavras irrelevantes (stop words)
  const stopWords = new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'por', 'pela', 'pelo',
    'com', 'para', 'que', 'se', 'ou', 'e', 'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
    'art', 'artigo', 'lei', 'são', 'ser', 'está', 'este', 'esta', 'esse', 'essa', 'aquele'
  ]);

  const palavras = texto.split(/\s+/);
  const candidatos: { index: number; palavra: string; limpa: string }[] = [];

  palavras.forEach((p, idx) => {
    const limpa = p.replace(/[.,;:()§º°"'-]/g, '');
    if (limpa.length >= 5 && !stopWords.has(limpa.toLowerCase())) {
      candidatos.push({ index: idx, palavra: p, limpa });
    }
  });

  // Seleciona até 4 lacunas espaçadas
  const selecionadasIndices = new Set<number>();
  let lastIdx = -10;
  for (const c of candidatos) {
    if (selecionadasIndices.size >= 4) break;
    if (c.index - lastIdx >= 3) {
      selecionadasIndices.add(c.index);
      lastIdx = c.index;
    }
  }

  // Se poucas palavras foram encontradas, pega as 2 primeiras candidatas
  if (selecionadasIndices.size === 0 && candidatos.length > 0) {
    selecionadasIndices.add(candidatos[0].index);
  }

  const segmentos: CompleteArtigoData['segmentos'] = [];
  const lacunas: LacunaItem[] = [];
  let lacunaCount = 0;

  // Banco de distratores jurídicos comuns
  const distratoresComuns = [
    'obrigatório', 'facultativo', 'prescrição', 'decadência', 'indenização',
    'nulidade', 'anulabilidade', 'competência', 'legitimidade', 'eficácia',
    'subsidiária', 'solidária', 'inexigível', 'tempestivo', 'inaudita'
  ];

  palavras.forEach((palavra, idx) => {
    if (selecionadasIndices.has(idx)) {
      lacunaCount++;
      const limpa = palavra.replace(/[.,;:()§º°"'-]/g, '');
      const pontuacaoFinal = palavra.slice(palavra.lastIndexOf(limpa) + limpa.length);
      const pontuacaoInicial = palavra.slice(0, palavra.indexOf(limpa));

      if (pontuacaoInicial) {
        segmentos.push({ tipo: 'texto', conteudo: pontuacaoInicial });
      }

      // Gera 3 opções alternativas erradas
      const erradas = distratoresComuns
        .filter(d => d.toLowerCase() !== limpa.toLowerCase())
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const opcoes = [...erradas, limpa].sort(() => Math.random() - 0.5);

      lacunas.push({
        id: lacunaCount,
        palavraOriginal: limpa,
        dica: `Palavra iniciada em "${limpa.charAt(0).toUpperCase()}" (${limpa.length} letras)`,
        opcoes,
      });

      segmentos.push({
        tipo: 'lacuna',
        conteudo: limpa,
        lacunaId: lacunaCount,
      });

      if (pontuacaoFinal) {
        segmentos.push({ tipo: 'texto', conteudo: pontuacaoFinal + ' ' });
      } else {
        segmentos.push({ tipo: 'texto', conteudo: ' ' });
      }
    } else {
      segmentos.push({ tipo: 'texto', conteudo: palavra + ' ' });
    }
  });

  return { segmentos, lacunas, textoCompleto: texto };
}

export const CompleteArtigoView: React.FC<CompleteArtigoViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
}) => {
  const data = useMemo(() => gerarDadosCompleteArtigo(artigoTexto), [artigoTexto]);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [verificado, setVerificado] = useState(false);
  const [mostrarDicaId, setMostrarDicaId] = useState<number | null>(null);

  const totalLacunas = data.lacunas.length;
  const acertos = useMemo(() => {
    return data.lacunas.filter(l => (respostas[l.id] || '').trim().toLowerCase() === l.palavraOriginal.toLowerCase()).length;
  }, [data.lacunas, respostas]);

  const handleSelecionarOpcao = (lacunaId: number, opcao: string) => {
    if (verificado) return;
    setRespostas(prev => ({ ...prev, [lacunaId]: opcao }));
  };

  const handleReset = () => {
    setRespostas({});
    setVerificado(false);
    setMostrarDicaId(null);
  };

  const handleConcluir = () => {
    setVerificado(true);
    if (acertos === totalLacunas) {
      toast.success('Parabéns! Você completou o artigo com 100% de precisão!');
    } else {
      toast.info(`Você acertou ${acertos} de ${totalLacunas} lacunas.`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm">
        <div>
          <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider block">
            Praticar • Complete o Artigo
          </span>
          <h3 className="font-heading font-bold text-base text-foreground">
            Art. {artigoNumero} • {leiNome}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
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

      {/* Conteúdo Principal com Scroll */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
        {/* Card do Texto com as Lacunas */}
        <div className="rounded-2xl border border-border bg-secondary/30 p-5 sm:p-6 shadow-sm leading-relaxed text-base sm:text-lg">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border/60 text-xs text-foreground/60 font-medium">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Preencha as lacunas numeradas escolhendo a alternativa correta abaixo:</span>
          </div>

          <p className="text-foreground/90 font-serif leading-loose">
            {data.segmentos.map((seg, idx) => {
              if (seg.tipo === 'texto') {
                return <span key={idx}>{seg.conteudo}</span>;
              }

              const lacuna = data.lacunas.find(l => l.id === seg.lacunaId);
              if (!lacuna) return null;

              const respondido = respostas[lacuna.id];
              const correto = respondido?.trim().toLowerCase() === lacuna.palavraOriginal.toLowerCase();

              return (
                <span
                  key={idx}
                  className={`inline-flex items-center justify-center min-w-[100px] px-2.5 py-0.5 mx-1 rounded-lg text-sm font-semibold transition-all border ${
                    verificado
                      ? correto
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40 line-through'
                      : respondido
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-bold'
                      : 'bg-border/60 text-foreground/40 border-dashed border-border'
                  }`}
                >
                  <span className="text-[10px] text-foreground/40 mr-1.5 font-mono">#{lacuna.id}</span>
                  {respondido || '_____'}
                </span>
              );
            })}
          </p>
        </div>

        {/* Lista de Lacunas e Banco de Alternativas */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Alternativas para cada Lacuna
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {data.lacunas.map(lacuna => {
              const respondido = respostas[lacuna.id];
              const correto = respondido?.trim().toLowerCase() === lacuna.palavraOriginal.toLowerCase();

              return (
                <div
                  key={lacuna.id}
                  className={`p-4 rounded-xl border transition-all ${
                    verificado
                      ? correto
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-rose-500/5 border-rose-500/30'
                      : respondido
                      ? 'bg-secondary/40 border-blue-500/30'
                      : 'bg-secondary/20 border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-[10px] font-mono">
                        {lacuna.id}
                      </span>
                      Lacuna #{lacuna.id}
                    </span>

                    {lacuna.dica && (
                      <button
                        onClick={() => setMostrarDicaId(mostrarDicaId === lacuna.id ? null : lacuna.id)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <Lightbulb className="w-3 h-3" />
                        {mostrarDicaId === lacuna.id ? 'Ocultar dica' : 'Ver dica'}
                      </button>
                    )}
                  </div>

                  {mostrarDicaId === lacuna.id && lacuna.dica && (
                    <div className="p-2 mb-2 rounded-lg bg-blue-500/10 text-blue-300 text-xs border border-blue-500/20">
                      💡 {lacuna.dica}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {lacuna.opcoes.map(opcao => {
                      const isSelected = respondido === opcao;
                      const isCorretaOriginal = opcao.toLowerCase() === lacuna.palavraOriginal.toLowerCase();

                      return (
                        <button
                          key={opcao}
                          disabled={verificado}
                          onClick={() => handleSelecionarOpcao(lacuna.id, opcao)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border ${
                            verificado
                              ? isCorretaOriginal
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm font-bold'
                                : isSelected
                                ? 'bg-rose-600 text-white border-rose-500 line-through'
                                : 'bg-background/40 text-foreground/40 border-border'
                              : isSelected
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm font-semibold'
                              : 'bg-background/80 text-foreground/80 border-border hover:bg-secondary'
                          }`}
                        >
                          {opcao}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer com Ação de Verificação / Placar */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-4">
        <div className="text-xs text-foreground/70">
          {verificado ? (
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              Resultado: {acertos} de {totalLacunas} corretas ({Math.round((acertos / totalLacunas) * 100)}%)
            </span>
          ) : (
            <span>
              Preenchidas: <strong className="text-foreground">{Object.keys(respostas).length}</strong> de {totalLacunas}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!verificado ? (
            <Button
              variant="default"
              size="sm"
              disabled={Object.keys(respostas).length === 0}
              onClick={handleConcluir}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 px-5 font-semibold gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Verificar Respostas
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleReset}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-5 font-semibold gap-1.5"
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
