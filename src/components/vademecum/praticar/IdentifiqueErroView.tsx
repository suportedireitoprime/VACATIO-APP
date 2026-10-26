import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface IdentifiqueErroViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
  hideHeader?: boolean;
}

interface DadosErroArtigo {
  textoOriginal: string;
  palavras: Array<{ id: number; palavraOriginal: string; palavraExibida: string; isErro: boolean }>;
  palavraCorreta: string;
  palavraAdulterada: string;
  explicacao: string;
}

// Introduz uma alteração sutil proposital (prazo, termo ou condição) para o usuário identificar
function gerarArtigoAdulterado(texto: string): DadosErroArtigo {
  const trocasComuns: Record<string, string> = {
    'obrigatório': 'facultativo',
    'facultativo': 'obrigatório',
    'sempre': 'nunca',
    'nunca': 'sempre',
    'vedada': 'permitida',
    'permitida': 'vedada',
    'prescreve': 'decai',
    'decai': 'prescreve',
    'nulo': 'anulável',
    'anulável': 'nulo',
    'solidária': 'subsidiária',
    'subsidiária': 'solidária',
    'unilateral': 'bilateral',
    'bilateral': 'unilateral',
    'competência': 'incompetência',
    'imediata': 'mediata',
    'público': 'privado',
    'privado': 'público',
    'maioridade': 'menoridade',
    'maioria': 'unanimidade',
  };

  const tokens = texto.split(/\s+/);
  let palavraCorreta = '';
  let palavraAdulterada = '';
  let indexTrocado = -1;

  for (let i = 0; i < tokens.length; i++) {
    const limpa = tokens[i].replace(/[.,;:()§º°"'-]/g, '').toLowerCase();
    if (trocasComuns[limpa]) {
      palavraCorreta = limpa;
      palavraAdulterada = trocasComuns[limpa];
      indexTrocado = i;
      break;
    }
  }

  // Se nenhuma palavra específica da lista for encontrada, troca uma palavra substantiva de tamanho >= 6
  if (indexTrocado === -1) {
    for (let i = 0; i < tokens.length; i++) {
      const limpa = tokens[i].replace(/[.,;:()§º°"'-]/g, '');
      if (limpa.length >= 6) {
        palavraCorreta = limpa;
        palavraAdulterada = 'indevidamente';
        indexTrocado = i;
        break;
      }
    }
  }

  const palavrasMapeadas = tokens.map((t, idx) => {
    const isErro = idx === indexTrocado;
    const limpa = t.replace(/[.,;:()§º°"'-]/g, '');
    let palavraExibida = t;

    if (isErro) {
      palavraExibida = t.replace(limpa, palavraAdulterada);
    }

    return {
      id: idx,
      palavraOriginal: t,
      palavraExibida,
      isErro,
    };
  });

  return {
    textoOriginal: texto,
    palavras: palavrasMapeadas,
    palavraCorreta,
    palavraAdulterada,
    explicacao: `A redação original estabelece "${palavraCorreta}", mas o texto foi adulterado com "${palavraAdulterada}", alterando substancialmente o sentido normativo.`,
  };
}

export const IdentifiqueErroView: React.FC<IdentifiqueErroViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
  hideHeader,
}) => {
  const dados = useMemo(() => gerarArtigoAdulterado(artigoTexto), [artigoTexto]);
  const [palavraSelecionadaId, setPalavraSelecionadaId] = useState<number | null>(null);
  const [verificado, setVerificado] = useState(false);
  const [mostrarTextoOriginal, setMostrarTextoOriginal] = useState(false);

  const handleSelecionarPalavra = (id: number) => {
    if (verificado) return;
    setPalavraSelecionadaId(id);
  };

  const handleVerificar = () => {
    if (palavraSelecionadaId === null) return;
    setVerificado(true);

    const selecionada = dados.palavras.find(p => p.id === palavraSelecionadaId);
    if (selecionada?.isErro) {
      toast.success('Exato! Você encontrou a pegadinha / adulteração no artigo!');
    } else {
      toast.error('Essa palavra está correta na lei. Tente outra!');
    }
  };

  const handleReiniciar = () => {
    setPalavraSelecionadaId(null);
    setVerificado(false);
    setMostrarTextoOriginal(false);
  };

  const selecionada = dados.palavras.find(p => p.id === palavraSelecionadaId);
  const acertou = selecionada?.isErro;

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm">
        <div>
          <span className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider block">
            Praticar • Identifique o Erro
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

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 max-w-2xl mx-auto w-full space-y-6">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong>Atenção às Pegadinhas de Concurso:</strong>
            <p className="mt-0.5 opacity-90">
              O texto abaixo foi sutilmente modificado. Clique na palavra que contém o erro (prazo, condição ou vocábulo adulterado) para validar.
            </p>
          </div>
        </div>

        {/* Texto Interativo com Seleção por Palavra */}
        <div className="p-6 sm:p-7 rounded-2xl bg-secondary/30 border border-border shadow-sm leading-loose font-serif text-base sm:text-lg">
          {dados.palavras.map((item) => {
            const isSelected = palavraSelecionadaId === item.id;
            const isErroReal = item.isErro;

            return (
              <span
                key={item.id}
                onClick={() => handleSelecionarPalavra(item.id)}
                className={`cursor-pointer px-1 py-0.5 mx-0.5 rounded transition-all inline-block ${
                  verificado
                    ? isErroReal
                      ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 underline'
                      : isSelected
                      ? 'bg-rose-500/20 text-rose-400 line-through border border-rose-500/40'
                      : 'hover:bg-secondary'
                    : isSelected
                    ? 'bg-rose-600 text-white font-bold shadow-sm'
                    : 'hover:bg-rose-500/15 hover:text-rose-300'
                }`}
              >
                {item.palavraExibida}{' '}
              </span>
            );
          })}
        </div>

        {/* Justificativa e Revelação após Verificação */}
        {verificado && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-2xl border space-y-3 ${
              acertou
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {acertou ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-300">
                    Você encontrou o erro com precisão!
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-sm font-bold text-rose-300">
                    Não era essa palavra. O erro real está destacado em verde.
                  </span>
                </>
              )}
            </div>

            <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
              {dados.explicacao}
            </p>

            <div className="pt-2 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarTextoOriginal(!mostrarTextoOriginal)}
                className="text-xs border-border h-8 gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                {mostrarTextoOriginal ? 'Ocultar Original' : 'Ver Texto Original da Lei'}
              </Button>
            </div>

            {mostrarTextoOriginal && (
              <div className="p-3.5 rounded-xl bg-background/60 border border-border text-xs sm:text-sm font-serif leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {dados.textoOriginal}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-4">
        <div className="text-xs text-foreground/70">
          {palavraSelecionadaId !== null ? (
            <span>
              Palavra selecionada: <strong className="text-foreground">"{dados.palavras[palavraSelecionadaId]?.palavraExibida}"</strong>
            </span>
          ) : (
            <span>Clique na palavra adulterada acima</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!verificado ? (
            <Button
              variant="default"
              size="sm"
              disabled={palavraSelecionadaId === null}
              onClick={handleVerificar}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-9 px-5 font-semibold gap-1.5 shadow-md shadow-rose-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Erro
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleReiniciar}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-9 px-5 font-semibold gap-1.5"
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
