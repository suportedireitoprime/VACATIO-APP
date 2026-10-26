import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  PenTool,
  Puzzle,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Search,
  Split,
  Timer,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Trophy,
  Sparkles,
  Check,
  BookOpen,
  Pencil,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { haptic } from '@/lib/nativeHaptics';

import { CompleteArtigoView } from './CompleteArtigoView';
import { MonteArtigoView } from './MonteArtigoView';
import { VerdadeiroFalsoView } from './VerdadeiroFalsoView';
import { IdentifiqueErroView } from './IdentifiqueErroView';
import { CasosPraticosView } from './CasosPraticosView';
import { CacaPalavrasView } from './CacaPalavrasView';
import { RelacioneColunasView } from './RelacioneColunasView';
import { ContraRelogioView } from './ContraRelogioView';

export interface LicoesArtigoViewProps {
  artigoNumero: string;
  artigoTexto: string;
  leiNome: string;
  onVoltar: () => void;
}

interface EtapaLicao {
  id: string;
  numero: number;
  titulo: string;
  subtitulo: string;
  icon: LucideIcon;
  color: string;
}

const ETAPAS_LICAO: EtapaLicao[] = [
  {
    id: 'complete',
    numero: 1,
    titulo: 'Complete o Artigo',
    subtitulo: 'Fixe as palavras-chave ocultadas',
    icon: PenTool,
    color: '#38BDF8',
  },
  {
    id: 'monte',
    numero: 2,
    titulo: 'Monte o Artigo',
    subtitulo: 'Ordene a sequência dos fragmentos',
    icon: Puzzle,
    color: '#8B5CF6',
  },
  {
    id: 'verdadeiro_falso',
    numero: 3,
    titulo: 'Certo ou Errado',
    subtitulo: 'Julgue as afirmativas rápidas',
    icon: CheckCircle2,
    color: '#10B981',
  },
  {
    id: 'identifique_erro',
    numero: 4,
    titulo: 'Identifique o Erro',
    subtitulo: 'Detecte a pegadinha na norma',
    icon: AlertTriangle,
    color: '#EF4444',
  },
  {
    id: 'casos_praticos',
    numero: 5,
    titulo: 'Caso Prático',
    subtitulo: 'Aplicação prática do dispositivo',
    icon: Briefcase,
    color: '#F59E0B',
  },
  {
    id: 'caca_palavras',
    numero: 6,
    titulo: 'Caça-Palavras',
    subtitulo: 'Localize termos da norma',
    icon: Search,
    color: '#06B6D4',
  },
  {
    id: 'relacione',
    numero: 7,
    titulo: 'Relacione as Colunas',
    subtitulo: 'Correlacione os dispositivos',
    icon: Split,
    color: '#EC4899',
  },
  {
    id: 'contra_relogio',
    numero: 8,
    titulo: 'Contra o Relógio',
    subtitulo: 'Responda antes do tempo acabar',
    icon: Timer,
    color: '#F97316',
  },
];

export const LicoesArtigoView: React.FC<LicoesArtigoViewProps> = ({
  artigoNumero,
  artigoTexto,
  leiNome,
  onVoltar,
}) => {
  const [etapaIndex, setEtapaIndex] = useState(0);
  const [etapasConcluidas, setEtapasConcluidas] = useState<Set<number>>(new Set());
  const [licaoFinalizada, setLicaoFinalizada] = useState(false);

  const etapaAtual = ETAPAS_LICAO[etapaIndex];
  const progressoPorcentagem = Math.round(((etapasConcluidas.size) / ETAPAS_LICAO.length) * 100);

  const handleAvancarEtapa = () => {
    haptic.success();
    setEtapasConcluidas((prev) => {
      const next = new Set(prev);
      next.add(etapaIndex);
      return next;
    });

    if (etapaIndex < ETAPAS_LICAO.length - 1) {
      const proxima = etapaIndex + 1;
      setEtapaIndex(proxima);
      toast.success(`Etapa ${etapaIndex + 1} concluída! Avançando para ${ETAPAS_LICAO[proxima].titulo}...`);
    } else {
      setLicaoFinalizada(true);
      toast.success('PARABÉNS! Você completou todas as lições deste artigo!');
    }
  };

  const handleIrParaEtapa = (index: number) => {
    haptic.light();
    setEtapaIndex(index);
  };

  const handleReiniciarTudo = () => {
    haptic.medium();
    setEtapaIndex(0);
    setEtapasConcluidas(new Set());
    setLicaoFinalizada(false);
  };

  if (licaoFinalizada) {
    return (
      <div className="flex flex-col h-full bg-card text-foreground p-6 sm:p-8 items-center justify-center text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto shadow-2xl shadow-sky-500/20"
        >
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-sky-400" />
        </motion.div>

        <div className="space-y-2 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Fixação 100% Concluída
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Lição Concluída com Sucesso!
          </h3>
          <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">
            Você praticou e dominou todas as etapas de fixação do <strong className="text-foreground">Art. {artigoNumero}</strong>:
            lacunas, ordenação sequencial, julgamento de certo/errado, detecção de erros, caso prático, caça-palavras e desafios interativos.
          </p>
        </div>

        {/* Resumo das etapas completadas */}
        <div className="w-full max-w-md bg-secondary/30 rounded-2xl border border-border/60 p-4 space-y-2 text-left max-h-60 overflow-y-auto">
          {ETAPAS_LICAO.map((etapa) => {
            const Icon = etapa.icon;
            return (
              <div key={etapa.id} className="flex items-center justify-between text-xs sm:text-sm py-1">
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: etapa.color }} strokeWidth={2.2} />
                  <span className="font-medium text-foreground">{etapa.titulo}</span>
                </div>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                  <Check className="w-3.5 h-3.5" /> Concluído
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <Button
            variant="outline"
            onClick={onVoltar}
            className="w-full text-xs border-border h-10 rounded-xl"
          >
            Voltar ao Menu
          </Button>
          <Button
            variant="default"
            onClick={handleReiniciarTudo}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold h-10 rounded-xl gap-1.5 shadow-md shadow-sky-500/25"
          >
            <RotateCcw className="w-4 h-4" />
            Refazer Lições
          </Button>
        </div>
      </div>
    );
  }

  const EtapaIcon = etapaAtual.icon;

  return (
    <div className="flex flex-col h-full bg-card text-foreground overflow-hidden">
      {/* Subheader com Progresso da Lição e Seletor de Etapas */}
      <div className="border-b border-border/80 bg-background/50 backdrop-blur-md px-3 sm:px-5 py-3 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <EtapaIcon className="w-5 h-5 shrink-0" style={{ color: etapaAtual.color }} strokeWidth={2.2} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Lição {etapaIndex + 1} de {ETAPAS_LICAO.length}
                </span>
                <span className="text-[11px] font-bold text-sky-400">
                  {progressoPorcentagem}% concluído
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                {etapaAtual.titulo}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAvancarEtapa}
              className="h-8 px-2.5 text-xs text-sky-400 hover:text-sky-300 gap-1 font-semibold"
            >
              <span>{etapaIndex === ETAPAS_LICAO.length - 1 ? 'Concluir' : 'Próxima'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Barra de Progresso Fluida */}
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full bg-sky-500"
            initial={false}
            animate={{ width: `${Math.max(8, ((etapaIndex + 1) / ETAPAS_LICAO.length) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Pílulas de Navegação Rápida entre as Etapas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          {ETAPAS_LICAO.map((etapa, idx) => {
            const Icon = etapa.icon;
            const isAtiva = idx === etapaIndex;
            const isConcluida = etapasConcluidas.has(idx);

            return (
              <button
                key={etapa.id}
                onClick={() => handleIrParaEtapa(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all shrink-0 border ${
                  isAtiva
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 shadow-sm font-semibold'
                    : isConcluida
                    ? 'bg-secondary/60 text-emerald-400 border-emerald-500/30'
                    : 'bg-secondary/30 text-muted-foreground border-border/50 hover:bg-secondary/60'
                }`}
              >
                {isConcluida ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Icon className="w-3 h-3" style={{ color: isAtiva ? etapa.color : undefined }} strokeWidth={2} />
                )}
                <span>{etapa.titulo}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Dinâmico da Etapa Atual (sem cabeçalho duplicado!) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={etapaAtual.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {etapaAtual.id === 'complete' && (
              <CompleteArtigoView
                artigoNumero={artigoNumero}
                artigoTexto={artigoTexto}
                leiNome={leiNome}
                onVoltar={handleAvancarEtapa}
                hideHeader={true}
              />
            )}

            {etapaAtual.id === 'monte' && (
              <MonteArtigoView
                artigoNumero={artigoNumero}
                artigoTexto={artigoTexto}
                leiNome={leiNome}
                onVoltar={handleAvancarEtapa}
                hideHeader={true}
              />
            )}

            {etapaAtual.id === 'verdadeiro_falso' && (
              <VerdadeiroFalsoView
                artigoNumero={artigoNumero}
                artigoTexto={artigoTexto}
                leiNome={leiNome}
                onVoltar={handleAvancarEtapa}
                hideHeader={true}
              />
            )}

            {etapaAtual.id === 'identifique_erro' && (
              <IdentifiqueErroView
                artigoNumero={artigoNumero}
                artigoTexto={artigoTexto}
                leiNome={leiNome}
                onVoltar={handleAvancarEtapa}
                hideHeader={true}
              />
            )}

            {etapaAtual.id === 'casos_praticos' && (
              <CasosPraticosView
                artigoNumero={artigoNumero}
                artigoTexto={artigoTexto}
                leiNome={leiNome}
                onVoltar={handleAvancarEtapa}
                hideHeader={true}
              />
            )}

            {etapaAtual.id === 'caca_palavras' && (
              <CacaPalavrasView
                artigoNumero={artigoNumero}
                artigoTexto={artigoTexto}
                leiNome={leiNome}
                onVoltar={handleAvancarEtapa}
                hideHeader={true}
              />
            )}

            {etapaAtual.id === 'relacione' && (
              <RelacioneColunasView
                artigoNumero={artigoNumero}
                artigoTexto={artigoTexto}
                leiNome={leiNome}
                onVoltar={handleAvancarEtapa}
                hideHeader={true}
              />
            )}

            {etapaAtual.id === 'contra_relogio' && (
              <ContraRelogioView
                artigoNumero={artigoNumero}
                artigoTexto={artigoTexto}
                leiNome={leiNome}
                onVoltar={handleAvancarEtapa}
                hideHeader={true}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LicoesArtigoView;
