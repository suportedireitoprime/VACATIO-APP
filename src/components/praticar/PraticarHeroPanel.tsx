import { motion } from 'framer-motion';
import { Target, Flame, Award } from 'lucide-react';
import miraArma from '@/assets/praticar/mira-arma.png';

type Props = {
  totalLeis: number;
  artigosDominados: number;
  streakDias: number;
  onPraticarAleatorio?: () => void;
};

export default function PraticarHeroPanel({
  totalLeis,
  artigosDominados,
  streakDias,
  onPraticarAleatorio,
}: Props) {
  return (
    <section
      className="relative isolate overflow-hidden border-b border-black/20"
      style={{
        background:
          'linear-gradient(135deg, hsl(0 78% 42%) 0%, hsl(0 84% 55%) 55%, hsl(12 82% 48%) 100%)',
      }}
      aria-label="Painel Praticar"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.28),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.28),transparent_65%)]" />

      {/* Mascote arma — direita inferior */}
      <motion.img
        src={miraArma}
        alt=""
        aria-hidden="true"
        initial={{ opacity: 0, x: 20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
        className="pointer-events-none absolute -right-2 bottom-0 h-[108%] w-[40%] max-w-[210px] object-contain object-bottom-right drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
        loading="eager"
        fetchPriority="high"
      />


      <div className="relative px-4 py-5 sm:px-6 sm:py-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">
          Seu painel
        </p>
        <h1 className="mt-1 font-display text-[26px] font-black leading-tight sm:text-3xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
          MIRE NA LEI SECA
        </h1>
        <p className="mt-1 text-[12px] sm:text-sm font-medium text-white/90 max-w-[240px] mx-auto">
          Tiro ao alvo nos artigos que caem de verdade.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 max-w-[320px] mx-auto">
          <Metric icon={<Target className="w-3.5 h-3.5" />} value={totalLeis} label="Leis" />
          <Metric icon={<Award className="w-3.5 h-3.5" />} value={artigosDominados} label="Dominados" />
          <Metric icon={<Flame className="w-3.5 h-3.5" />} value={streakDias} label="Streak" />
        </div>

        {onPraticarAleatorio && (
          <button
            onClick={onPraticarAleatorio}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-red-700 shadow-lg shadow-black/25 hover:bg-white transition"
          >
            <Target className="w-4 h-4" />
            Sessão aleatória
          </button>
        )}
      </div>
    </section>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl bg-black/25 backdrop-blur-sm border border-white/20 px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-white/90">
        {icon}
        <span className="font-display text-lg font-black leading-none tabular-nums">{value}</span>
      </div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/75">{label}</p>
    </div>
  );
}
