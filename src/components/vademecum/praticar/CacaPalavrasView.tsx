import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  CheckCircle2,
  Trophy,
  Search,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CacaPalavrasViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
}

const TAMANHO_GRADE = 10; // Grade 10x10

interface PalavraAlvo {
  palavra: string;
  encontrada: boolean;
  coordenadas: [number, number][]; // [linha, coluna]
}

// Extrai palavras-chave do artigo e monta a grade de caça-palavras
function gerarGradeCacaPalavras(texto: string): { grade: string[][]; palavras: PalavraAlvo[] } {
  const stopWords = new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'por', 'pela', 'pelo',
    'com', 'para', 'que', 'se', 'ou', 'e', 'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
    'art', 'artigo', 'lei', 'são', 'ser', 'está', 'este', 'esta', 'esse', 'essa'
  ]);

  const tokens = texto
    .toUpperCase()
    .replace(/[.,;:()§º°"'-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 4 && t.length <= 8 && !stopWords.has(t.toLowerCase()));

  // Remove duplicados e pega até 5 palavras
  const listaPalavras = Array.from(new Set(tokens)).slice(0, 5);

  // Fallback se o texto tiver poucas palavras longas
  if (listaPalavras.length === 0) {
    listaPalavras.push('DIREITO', 'NORMA', 'LEGAL');
  }

  // Inicializa matriz vazia
  const grade: string[][] = Array.from({ length: TAMANHO_GRADE }, () =>
    Array.from({ length: TAMANHO_GRADE }, () => '')
  );

  const palavrasAlvo: PalavraAlvo[] = [];

  // Tenta posicionar cada palavra (horizontal ou vertical)
  listaPalavras.forEach((palavra) => {
    let colocada = false;
    let tentativas = 0;

    while (!colocada && tentativas < 100) {
      tentativas++;
      const horizontal = Math.random() > 0.5;
      const len = palavra.length;

      const r = Math.floor(Math.random() * (horizontal ? TAMANHO_GRADE : TAMANHO_GRADE - len + 1));
      const c = Math.floor(Math.random() * (horizontal ? TAMANHO_GRADE - len + 1 : TAMANHO_GRADE));

      // Verifica se há colisão compatível
      let pode = true;
      const coords: [number, number][] = [];

      for (let i = 0; i < len; i++) {
        const nr = horizontal ? r : r + i;
        const nc = horizontal ? c + i : c;
        coords.push([nr, nc]);

        if (grade[nr][nc] !== '' && grade[nr][nc] !== palavra[i]) {
          pode = false;
          break;
        }
      }

      if (pode) {
        coords.forEach(([nr, nc], idx) => {
          grade[nr][nc] = palavra[idx];
        });
        palavrasAlvo.push({
          palavra,
          encontrada: false,
          coordenadas: coords,
        });
        colocada = true;
      }
    }
  });

  // Preenche células vazias com letras aleatórias
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < TAMANHO_GRADE; r++) {
    for (let c = 0; c < TAMANHO_GRADE; c++) {
      if (grade[r][c] === '') {
        grade[r][c] = alfabeto[Math.floor(Math.random() * alfabeto.length)];
      }
    }
  }

  return { grade, palavras: palavrasAlvo };
}

export const CacaPalavrasView: React.FC<CacaPalavrasViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
}) => {
  const dadosIniciais = useMemo(() => gerarGradeCacaPalavras(artigoTexto), [artigoTexto]);
  const [grade, setGrade] = useState<string[][]>(dadosIniciais.grade);
  const [palavras, setPalavras] = useState<PalavraAlvo[]>(dadosIniciais.palavras);
  const [selecionadas, setSelecionadas] = useState<[number, number][]>([]);

  // Regenerar caso o texto mude
  useEffect(() => {
    setGrade(dadosIniciais.grade);
    setPalavras(dadosIniciais.palavras);
    setSelecionadas([]);
  }, [dadosIniciais]);

  const handleCellClick = (r: number, c: number) => {
    const jaSelecionada = selecionadas.some(([sr, sc]) => sr === r && sc === c);
    let novaSelecao: [number, number][];

    if (jaSelecionada) {
      novaSelecao = selecionadas.filter(([sr, sc]) => !(sr === r && sc === c));
    } else {
      novaSelecao = [...selecionadas, [r, c]];
    }

    setSelecionadas(novaSelecao);

    // Constrói a palavra formada pelas células selecionadas
    const letras = novaSelecao.map(([sr, sc]) => grade[sr][sc]).join('');

    // Verifica se casou com alguma palavra alvo não encontrada
    palavras.forEach((p) => {
      if (!p.encontrada) {
        const invertida = p.palavra.split('').reverse().join('');
        if (letras === p.palavra || letras === invertida) {
          // Marca como encontrada
          setPalavras(prev =>
            prev.map(item => item.palavra === p.palavra ? { ...item, encontrada: true } : item)
          );
          setSelecionadas([]);
          toast.success(`Palavra encontrada: "${p.palavra}"!`);
        }
      }
    });
  };

  const totalPalavras = palavras.length;
  const encontradasCount = palavras.filter(p => p.encontrada).length;
  const todasEncontradas = totalPalavras > 0 && encontradasCount === totalPalavras;

  const handleReiniciar = () => {
    const novos = gerarGradeCacaPalavras(artigoTexto);
    setGrade(novos.grade);
    setPalavras(novos.palavras);
    setSelecionadas([]);
  };

  // Coordenadas que pertencem a palavras já encontradas
  const coordenadasEncontradas = useMemo(() => {
    const set = new Set<string>();
    palavras.forEach(p => {
      if (p.encontrada) {
        p.coordenadas.forEach(([r, c]) => set.add(`${r}-${c}`));
      }
    });
    return set;
  }, [palavras]);

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm">
        <div>
          <span className="text-[11px] font-semibold text-cyan-500 uppercase tracking-wider block">
            Praticar • Caça-Palavras Jurídico
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
            Nova Grade
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
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 max-w-2xl mx-auto w-full space-y-6 flex flex-col items-center">
        {/* Banner de Palavras a Encontrar */}
        <div className="w-full p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Search className="w-3.5 h-3.5" />
              Encontre no Artigo ({encontradasCount}/{totalPalavras}):
            </span>
            {selecionadas.length > 0 && (
              <button
                onClick={() => setSelecionadas([])}
                className="text-[11px] text-cyan-400 underline hover:text-cyan-300"
              >
                Limpar seleção
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {palavras.map(p => (
              <span
                key={p.palavra}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                  p.encontrada
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 line-through'
                    : 'bg-background/80 text-foreground border-border'
                }`}
              >
                {p.palavra}
              </span>
            ))}
          </div>
        </div>

        {/* Grade 10x10 Interativa */}
        <div className="p-3 sm:p-4 rounded-2xl bg-secondary/40 border border-border shadow-md">
          <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
            {grade.map((linha, r) =>
              linha.map((letra, c) => {
                const isSelecionada = selecionadas.some(([sr, sc]) => sr === r && sc === c);
                const isEncontrada = coordenadasEncontradas.has(`${r}-${c}`);

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg font-mono font-black text-xs sm:text-sm flex items-center justify-center transition-all ${
                      isEncontrada
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isSelecionada
                        ? 'bg-cyan-500 text-white scale-105 shadow-md shadow-cyan-500/30'
                        : 'bg-background/90 text-foreground/80 hover:bg-secondary hover:text-foreground border border-border/50'
                    }`}
                  >
                    {letra}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Parabéns ao Concluir */}
        {todasEncontradas && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-emerald-400">
              Parabéns! Todas as palavras foram encontradas!
            </h4>
            <p className="text-xs text-foreground/70">
              Você identificou e memorizou com sucesso os principais institutos do Art. {artigoNumero}.
            </p>
            <div className="pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleReiniciar}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Jogar Outra Vez
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
