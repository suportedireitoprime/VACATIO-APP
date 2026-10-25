import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

let hasHidden = false;

export function useHideSplashScreen(delay = 100, isReady = true) {
  useEffect(() => {
    if (!isReady || hasHidden) return;
    if (!Capacitor.isNativePlatform()) {
      hasHidden = true;
      return;
    }
    
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let raf2: number | undefined;
    
    // Garante que o React já fez o commit e o browser já fez o paint inicial
    // antes de começarmos a contar o tempo de saída, eliminando concorrência e telas brancas.
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        timerId = setTimeout(() => {
          if (cancelled || hasHidden) return;
          hasHidden = true;
          import('@capacitor/splash-screen').then(({ SplashScreen }) => {
            SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
          });
        }, delay);
      });
    });
    
    return () => {
      cancelled = true;
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (timerId) clearTimeout(timerId);
    };
  }, [delay, isReady]);
}
