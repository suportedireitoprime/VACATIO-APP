import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  RotateCcw,
  CheckCircle2,
  Trophy,
  ArrowRight,
  Sparkles,
  PenTool,
  Puzzle,
  Check,
  Search,
  Split,
  AlertTriangle,
  Briefcase,
  Timer,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CompleteArtigoView } from './CompleteArtigoView';
import { MonteArtigoView } from './MonteArtigoView';
import { VerdadeiroFalsoView } from './VerdadeiroFalsoView';
import { IdentifiqueErroView } from './IdentifiqueErroView';
import { ContraRelogioView } from './ContraRelogioView';

interface ComboPraticarViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
}

const ETAPAS_COMBO = [
  { id: 'complete', titulo: 'Etapa 1/4: Complete o Artigo', desc: 'Preencha as lacunas essenciais' },
  { id: 'monte', titulo: 'Etapa 2/4: Monte o Artigo', desc: 'Ordene a sequência legal' },
  { id: 'vf', titulo: 'Etapa 3/4: Certo ou Errado', desc: 'Julgue as afirmativas rápidas' },
  { id: 'relogio', titulo: 'Etapa 4/4: Contra o Relógio', desc: 'Desafio final sob pressão' },
];

export const ComboPraticarView: React.FC<ComboPraticarViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
}) => {
  const [etapaAtualIndex, setEtapaAtualIndex] = useState(0);
  const [finalizado, setFinalizado] = useState(false);

  const etapaAtual = ETAPAS_COMBO[etapaAtualIndex];

  const handleAvancarEtapa = () => {
    if (etapaAtualIndex < ETAPAS_COMBO.length - 1) {
      setEtapaAtualIndex(i => i + 1);
      toast.success(`Etapa ${etapaAtualIndex + 1} concluída! Avançando...`);
    } else {
      setFinalizado(true);
      toast.success('PARABÉNS! Você dominou o Combo Desafio Total deste artigo!');
    }
  };

  const handleReiniciar = () => {
    setEtapaAtualIndex(0);
    setFinalizado(false);
  };

  if (finalizado) {
    return (
      <div className="flex flex-col h-full bg-card text-foreground p-8 items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/20">
          <Flame className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-rose-500">
            Domínio Absoluto • 100% Concluído
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-foreground">
            Você Zerou o Combo do Art. {artigoNumero}!
          </h3>
          <p className="text-xs sm:text-sm text-foreground/70 max-w-md mx-auto">
            Você completou com sucesso a maratona de lacunas, quebra-cabeça, julgamento de certo/errado e tiro rápido contra o relógio.
          </p>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onVoltar}
            className="text-xs border-border"
          >
            Voltar ao Artigo
          </Button>
          <Button
            variant="default"
            onClick={handleReiniciar}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Fazer Novo Combo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card text-foreground">
      {/* Top Banner de Progresso do Combo */}
      <div className="px-5 py-2.5 border-b border-border bg-rose-950/20 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-500" />
          <span className="font-bold text-rose-400">{etapaAtual.titulo}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAvancarEtapa}
            className="h-7 text-xs text-rose-400 hover:text-rose-300 gap-1 font-semibold"
          >
            <span>Pular Etapa</span>
            <ArrowRight className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onVoltar}
            className="h-7 text-xs border-border"
          >
            Sair
          </Button>
        </div>
      </div>

      {/* Conteúdo Dinâmico da Etapa Atual */}
      <div className="flex-1 overflow-hidden">
        {etapaAtual.id === 'complete' && (
          <CompleteArtigoView
            artigoNumero={artigoNumero}
            artigoTexto={artigoTexto}
            leiNome={leiNome}
            onVoltar={handleAvancarEtapa}
          />
        )}

        {etapaAtual.id === 'monte' && (
          <MonteArtigoView
            artigoNumero={artigoNumero}
            artigoTexto={artigoTexto}
            leiNome={leiNome}
            onVoltar={handleAvancarEtapa}
          />
        )}

        {etapaAtual.id === 'vf' && (
          <VerdadeiroFalsoView
            artigoNumero={artigoNumero}
            artigoTexto={artigoTexto}
            leiNome={leiNome}
            onVoltar={handleAvancarEtapa}
          />
        )}

        {etapaAtual.id === 'relogio' && (
          <ContraRelogioView
            artigoNumero={artigoNumero}
            artigoTexto={artigoTexto}
            leiNome={leiNome}
            onVoltar={handleAvancarEtapa}
          />
        )}
      </div>
    </div>
  );
};
