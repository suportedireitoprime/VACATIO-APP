import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  RotateCcw,
  CheckCircle2,
  Trophy,
  Volume2,
  Sparkles,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { startListening, stopListening } from '@/lib/speechRecognition';

interface OucaReciteViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
}

// Quebra o artigo em orações/trechos para recitar por vez
function extrairTrechosRecitar(texto: string): string[] {
  const trechos = texto
    .split(/\n+/)
    .map(t => t.trim())
    .filter(t => t.length > 5);

  if (trechos.length <= 1) {
    return texto.split(/(?<=[;.:])\s+/).map(t => t.trim()).filter(t => t.length > 8);
  }

  return trechos.slice(0, 4);
}

// Algoritmo de precisão e similaridade entre texto falado e texto da norma
function calcularSimilaridade(falado: string, original: string): number {
  const limpa = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.,;:()§º°"'-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0);

  const palavrasFaladas = limpa(falado);
  const palavrasOriginais = limpa(original);

  if (palavrasOriginais.length === 0) return 100;
  if (palavrasFaladas.length === 0) return 0;

  let acertos = 0;
  const setFaladas = new Set(palavrasFaladas);

  palavrasOriginais.forEach(p => {
    if (setFaladas.has(p)) acertos++;
  });

  return Math.min(100, Math.round((acertos / palavrasOriginais.length) * 100));
}

export const OucaReciteView: React.FC<OucaReciteViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
}) => {
  const trechos = useMemo(() => extrairTrechosRecitar(artigoTexto), [artigoTexto]);
  const [indexAtual, setIndexAtual] = useState(0);
  const [gravando, setGravando] = useState(false);
  const [transcricao, setTranscricao] = useState('');
  const [similaridade, setSimilaridade] = useState<number | null>(null);
  const [finalizado, setFinalizado] = useState(false);
  const [escutandoAudio, setEscutandoAudio] = useState(false);

  const trechoAtual = trechos[indexAtual] || artigoTexto;
  const totalTrechos = trechos.length;

  // Limpa gravação ao trocar de trecho ou desmontar
  useEffect(() => {
    return () => {
      stopListening(true).catch(() => {});
    };
  }, []);

  const handleOuvirPronuncia = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(trechoAtual);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.onstart = () => setEscutandoAudio(true);
      utterance.onend = () => setEscutandoAudio(false);
      utterance.onerror = () => setEscutandoAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      toast.info('Síntese de voz indisponível neste aparelho.');
    }
  };

  const handleAlternarGravacao = async () => {
    if (gravando) {
      setGravando(false);
      await stopListening();
      if (transcricao) {
        const sim = calcularSimilaridade(transcricao, trechoAtual);
        setSimilaridade(sim);
        if (sim >= 70) {
          toast.success(`Excelente recitação! ${sim}% de precisão!`);
        } else {
          toast.info(`Recitação capturada com ${sim}% de precisão.`);
        }
      }
    } else {
      setTranscricao('');
      setSimilaridade(null);
      setGravando(true);
      try {
        await startListening((texto, isFinal) => {
          setTranscricao(texto);
          if (isFinal) {
            setGravando(false);
            const sim = calcularSimilaridade(texto, trechoAtual);
            setSimilaridade(sim);
            if (sim >= 70) {
              toast.success(`Excelente recitação! ${sim}% de precisão!`);
            } else {
              toast.info(`Recitação finalizada com ${sim}% de precisão.`);
            }
          }
        }, 'pt-BR');
        toast.info('Microfone ativo! Recite o texto da lei agora...');
      } catch (err: any) {
        setGravando(false);
        toast.error(err?.message || 'Erro ao inicializar microfone.');
      }
    }
  };

  const handleProximo = () => {
    setTranscricao('');
    setSimilaridade(null);
    setGravando(false);
    if (indexAtual < totalTrechos - 1) {
      setIndexAtual(i => i + 1);
    } else {
      setFinalizado(true);
    }
  };

  const handleReiniciar = () => {
    setIndexAtual(0);
    setTranscricao('');
    setSimilaridade(null);
    setGravando(false);
    setFinalizado(false);
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm">
        <div>
          <span className="text-[11px] font-semibold text-teal-500 uppercase tracking-wider block">
            Praticar • Ouça e Recite por Voz
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
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 max-w-2xl mx-auto w-full space-y-6 flex flex-col justify-center">
        {!finalizado ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-foreground/60 font-medium">
              <span>Trecho {indexAtual + 1} de {totalTrechos}</span>
              <button
                onClick={handleOuvirPronuncia}
                className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
              >
                <Volume2 className={`w-3.5 h-3.5 ${escutandoAudio ? 'animate-bounce' : ''}`} />
                {escutandoAudio ? 'Ouvindo...' : 'Ouvir Modelo de Voz'}
              </button>
            </div>

            {/* Trecho Alvo para Memorizar e Recitar */}
            <div className="p-6 sm:p-8 rounded-2xl bg-secondary/30 border border-border shadow-sm space-y-3 text-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold">
                <Sparkles className="w-3 h-3" />
                Trecho para Recitar
              </span>
              <p className="text-base sm:text-lg font-serif leading-relaxed text-foreground/95">
                "{trechoAtual}"
              </p>
            </div>

            {/* Controle do Microfone e Reconhecimento */}
            <div className="flex flex-col items-center justify-center gap-3 py-2">
              <button
                onClick={handleAlternarGravacao}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${
                  gravando
                    ? 'bg-rose-600 text-white animate-pulse shadow-rose-500/30 ring-4 ring-rose-500/20'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-500/30'
                }`}
              >
                {gravando ? <Mic className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>

              <span className="text-xs font-medium text-foreground/70">
                {gravando ? 'Gravando sua voz... fale agora!' : 'Toque no microfone e recite o trecho'}
              </span>
            </div>

            {/* Feedback da Transcrição */}
            {transcricao && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-secondary/50 border border-border space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/60 font-semibold">O que você recitou:</span>
                  {similaridade !== null && (
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                      similaridade >= 70
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {similaridade}% de Precisão
                    </span>
                  )}
                </div>
                <p className="text-sm font-serif italic text-foreground/90">
                  "{transcricao}"
                </p>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleProximo}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold gap-1.5"
                  >
                    <span>{indexAtual < totalTrechos - 1 ? 'Próximo Trecho' : 'Concluir Prática'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Conclusão */
          <div className="text-center p-8 rounded-3xl bg-secondary/30 border border-border space-y-5">
            <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-2xl font-black text-foreground">
                Recitação Concluída!
              </h4>
              <p className="text-xs text-foreground/70 max-w-sm mx-auto">
                Você treinou a fala e a dicção dos trechos do Art. {artigoNumero}, fortalecendo a memória auditiva e verbal.
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
                className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Treinar Novamente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
