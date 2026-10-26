import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import logoVacatioAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import logoVacatioBundled from '@/assets/bundled/logo-vacatio-v2.webp';
import { pickAsset, srcOf } from '@/lib/assetUrl';
import { useHideSplashScreen } from '@/hooks/useHideSplashScreen';
import { isAppReady, subscribeAppReady } from '@/lib/appReadyState';

const logoVacatio = pickAsset(logoVacatioBundled, srcOf(logoVacatioAsset) || (logoVacatioAsset as any)?.url);

export function CustomSplashScreen({ onComplete }: { onComplete: () => void }) {
  const text = "Vade Mecum";
  const subtitle = "Uso Profissional";

  // Em ambiente nativo (Capacitor), dispensa a splash nativa assim que montado
  useHideSplashScreen(100);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let done = false;
    let minTimeElapsed = false;
    let appIsReady = isAppReady();

    const tryFinish = () => {
      if (done) return;
      if (minTimeElapsed && appIsReady) {
        done = true;
        onCompleteRef.current();
      }
    };

    // 1. Duração mínima elegante para apreciar a logo e branding (1800ms)
    const minTimer = setTimeout(() => {
      minTimeElapsed = true;
      tryFinish();
    }, 1800);

    // 2. Ouvinte de prontidão do app (Auth resolvida + montagem da tela inicial)
    const unsubscribe = subscribeAppReady((ready) => {
      if (ready) {
        appIsReady = true;
        tryFinish();
      }
    });

    // 3. Fallback de segurança máxima (3500ms): nunca trava o usuário na splash
    const safetyTimer = setTimeout(() => {
      if (!done) {
        done = true;
        onCompleteRef.current();
      }
    }, 3500);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(safetyTimer);
      unsubscribe();
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.035, 
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } 
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0D0D0D] overflow-hidden select-none pointer-events-auto touch-none will-change-[transform,opacity]"
      style={{ transform: 'translateZ(0)' }}
    >
      {/* Iluminação de fundo estética e aprofundada (0ms de custo de GPU) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.8),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Logo Central com aceleração de hardware */}
      <div className="mb-6 relative z-10 flex flex-col items-center anim-splash-logo-gpu">
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-white/90 bg-primary flex items-center justify-center overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.65)]">
          <img
            src={logoVacatio}
            alt="Vade Mecum"
            className="w-full h-full rounded-full object-cover scale-[1.06]"
            decoding="async"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>
      
      {/* Título e Subtítulo surgindo sincronizados */}
      <div className="flex flex-col items-center relative z-10 px-4 anim-splash-content-gpu">
        <div className="flex items-center justify-center relative">
          <span 
            className="text-white font-serif italic text-3xl sm:text-5xl font-semibold tracking-tight text-center relative flex"
            style={{ textShadow: '0 4px 16px rgba(0,0,0,0.6)' }}
          >
            {text}
          </span>
        </div>
        <div className="mt-2.5">
          <span className="text-white/80 font-sans text-xs sm:text-sm font-bold tracking-[0.28em] uppercase">
            {subtitle}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
