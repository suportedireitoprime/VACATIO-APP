import { Capacitor } from '@capacitor/core';

/**
 * Wrapper de vibração tátil nativa ultra-rápida.
 * Pré-carrega o módulo uma única vez no boot nativo para disparo em 0ms (sem delay de Promise).
 */
let hapticsModule: typeof import('@capacitor/haptics') | null = null;
let loadingPromise: Promise<typeof import('@capacitor/haptics') | null> | null = null;

if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  loadingPromise = import('@capacitor/haptics')
    .then((mod) => {
      hapticsModule = mod;
      return mod;
    })
    .catch(() => null);
}

function run(fn: (h: typeof import('@capacitor/haptics')) => Promise<unknown> | unknown) {
  if (!Capacitor.isNativePlatform()) return;
  if (hapticsModule) {
    try {
      void fn(hapticsModule);
    } catch {}
    return;
  }
  loadingPromise?.then((mod) => {
    if (mod) {
      try {
        void fn(mod);
      } catch {}
    }
  });
}

export const haptic = {
  light: () => run(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light })),
  medium: () => run(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Medium })),
  heavy: () => run(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Heavy })),
  selection: () => run(({ Haptics }) => Haptics.selectionStart().then(() => Haptics.selectionEnd())),
  success: () => run(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success })),
  warning: () => run(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Warning })),
  error: () => run(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Error })),
};
