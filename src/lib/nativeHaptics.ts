import { Capacitor } from '@capacitor/core';

/**
 * Wrapper de vibração tátil. Silencioso na web / se o plugin falhar.
 * Uso: `haptic.light()` em toques, `haptic.success()` ao acertar, etc.
 */
async function run(fn: (h: typeof import('@capacitor/haptics')) => Promise<unknown> | unknown) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const mod = await import('@capacitor/haptics');
    await fn(mod);
  } catch (e) {
    // silencioso — haptics é enhancement, nunca deve quebrar UX
  }
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
