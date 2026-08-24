import { motion } from 'framer-motion';
import { Gavel, Scale, BookOpen, type LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
};

/**
 * Painel amarelo compacto (estilo do HomeHeaderHero) para cabeçalho de cada aba do Horus.
 * Ícones jurídicos flutuando ao redor com leve animação.
 */
const FLOATING = [
  { Icon: Gavel, className: 'top-2 left-3', delay: 0 },
  { Icon: Scale, className: 'top-3 right-4', delay: 0.6 },
  { Icon: BookOpen, className: 'bottom-2 right-6', delay: 1.2 },
  { Icon: Gavel, className: 'bottom-3 left-6', delay: 1.8 },
];

export default function HorusSectionHero({ icon: Icon, eyebrow, title, description }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl mb-4 p-5 shadow-lg"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)',
        boxShadow: '0 12px 28px -12px hsl(var(--primary) / 0.55)',
      }}
    >
      {/* SVGs jurídicos flutuando ao redor */}
      {FLOATING.map(({ Icon: Fi, className, delay }, i) => (
        <motion.div
          key={i}
          className={`absolute ${className} pointer-events-none text-black/15`}
          animate={{ y: [0, -6, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay, ease: 'easeInOut' }}
        >
          <Fi className="w-6 h-6" />
        </motion.div>
      ))}

      <div className="relative flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-black/15 flex items-center justify-center shrink-0 ring-1 ring-black/10">
          <Icon className="w-5 h-5 text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-[10px] font-black tracking-[0.18em] text-black/70 uppercase">
            {eyebrow}
          </p>
          <h2 className="font-display text-lg font-black text-black leading-tight mt-0.5">
            {title}
          </h2>
          <p className="font-body text-[13px] text-black/80 leading-snug mt-1.5">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
