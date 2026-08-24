import { motion } from 'framer-motion';
import { ChevronRight, Gavel, Landmark, Scale, Shield, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '@/hooks/useEscapeKey';

const OPCOES = [
  {
    id: 'STF_VINCULANTE',
    nome: 'Súmulas Vinculantes',
    desc: 'Efeito vinculante para todo o Poder Judiciário e Administração Pública',
    icon: Shield,
    accent: '#F5C542',
    tag: 'VINCULANTE',
  },
  {
    id: 'STF',
    nome: 'Súmulas do STF',
    desc: 'Supremo Tribunal Federal — jurisprudência constitucional',
    icon: Landmark,
    accent: '#60A5FA',
    tag: 'STF',
  },
  {
    id: 'STJ',
    nome: 'Súmulas do STJ',
    desc: 'Superior Tribunal de Justiça — uniformização infraconstitucional',
    icon: Scale,
    accent: '#F97316',
    tag: 'STJ',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

const JurisprudenciaSheet = ({ open, onClose }: Props) => {
  useEscapeKey(open, onClose);
  const navigate = useNavigate();
  if (typeof document === 'undefined' || !open) return null;

  const abrir = (tribunalId: string) => {
    onClose();
    const slug =
      tribunalId === 'STF_VINCULANTE' ? 'sumulas-vinculantes'
      : tribunalId === 'STJ' ? 'sumulas-stj'
      : 'sumulas-stf';
    navigate(`/jurisprudencia/${slug}`);
  };

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[1400] bg-black/75 backdrop-blur-md"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-[1401] bg-card border-t border-border rounded-t-3xl pb-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] h-[90dvh] flex flex-col overflow-hidden md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 md:top-auto md:w-[92vw] md:max-w-2xl md:rounded-3xl md:border md:border-border md:shadow-2xl"
      >
        {/* Cabeçalho fixo */}
        <div className="sticky top-0 z-10 bg-card backdrop-blur-xl border-b border-border/40 shrink-0">
          <div className="flex items-center justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex items-center justify-between px-5 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#FFCC00' }}
              >
                <Gavel className="w-5 h-5" style={{ color: '#1a1200' }} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg text-foreground font-bold leading-none truncate">
                  Jurisprudência
                </h3>
                <p className="text-muted-foreground text-[11px] font-body mt-1">
                  Escolha a coleção de súmulas
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Lista rolável — mesmo estilo dos itens de Códigos */}
        <div className="px-4 pt-4 pb-6 flex flex-col gap-3 overflow-y-auto">
          <p className="px-1 text-[11px] uppercase tracking-widest text-muted-foreground font-body font-semibold">
            Tribunais Superiores
          </p>
          {OPCOES.map((op, i) => {
            const Icon = op.icon;
            return (
              <motion.button
                key={op.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => abrir(op.id)}
                className="group flex items-center gap-3 rounded-2xl bg-secondary/60 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left overflow-hidden shadow-sm shadow-black/5 hover:shadow-md hover:shadow-primary/10"
              >
                <div
                  className="relative w-[82px] h-[86px] shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: '#2a2a2a' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25 pointer-events-none" />
                  <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/10 blur-xl pointer-events-none" />
                  <Icon
                    className="relative w-10 h-10"
                    strokeWidth={2}
                    style={{ color: op.accent, filter: `drop-shadow(0 2px 6px ${op.accent}55)` }}
                  />
                  <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-sm bg-black/50 backdrop-blur-sm text-white text-[9px] font-body font-bold tracking-wider">
                    {op.tag}
                  </span>
                </div>
                <div className="flex-1 min-w-0 py-3.5 pr-2">
                  <p className="font-display text-[15px] font-bold text-foreground leading-tight tracking-wide">
                    {op.nome}
                  </p>
                  <p className="font-body text-[12.5px] text-muted-foreground leading-snug mt-1 line-clamp-2">
                    {op.desc}
                  </p>
                </div>
                <div className="w-9 h-9 mr-3 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.button>
            );
          })}

          <div className="mt-2 rounded-2xl border border-border/60 bg-background/40 p-4">
            <p className="font-display text-[13px] font-bold text-foreground leading-tight">
              O que são súmulas?
            </p>
            <p className="font-body text-[12px] text-muted-foreground leading-snug mt-1.5">
              Enunciados que consolidam o entendimento reiterado dos tribunais superiores sobre
              determinada matéria. As <strong className="text-foreground/90">Vinculantes</strong> obrigam
              todo o Judiciário e a Administração Pública.
            </p>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
};

export default JurisprudenciaSheet;
