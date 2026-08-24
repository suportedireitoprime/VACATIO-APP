import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getHeroAnimation } from '@/lib/heroAnimations';

type Props = {
  imageUrl: string;
  animationKey: string;
  /** Auto-loop the animation for preview */
  loopMs?: number;
  className?: string;
};

export default function HeroAnimationPreview({ imageUrl, animationKey, loopMs = 4500, className = '' }: Props) {
  const [cycle, setCycle] = useState(0);
  const preset = getHeroAnimation(animationKey);

  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), loopMs);
    return () => clearInterval(id);
  }, [loopMs, animationKey]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background:
          'linear-gradient(135deg, hsl(340 55% 12%) 0%, hsl(45 95% 55%) 55%, hsl(38 90% 45%) 100%)',
      }}
    >
      {/* Bottom gradient shim, matches home hero */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10" />
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.img
            key={`${animationKey}-${cycle}`}
            src={imageUrl}
            alt="Prévia"
            initial={preset.initial}
            animate={preset.animate}
            exit={preset.exit}
            transition={preset.transition}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[88%] w-auto max-w-[80%] object-contain object-bottom drop-shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
          />
        </AnimatePresence>
      </div>
      <div className="absolute top-2 left-3 z-20 text-[10px] uppercase tracking-widest text-white/80 font-mono">
        {preset.label}
      </div>
    </div>
  );
}
