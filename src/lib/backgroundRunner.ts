import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();

/**
 * Onda 3: previa executar prefetch em worker nativo. A execução em
 * background foi desativada para manter o build Android estável.
 *
 * O prefetch em foreground continua acontecendo via `requestIdleCallback`
 * em `App.tsx` (chunks de rotas críticas). Aqui só mantemos as assinaturas
 * como no-op para preservar os call sites.
 */
export async function runPrefetchNow(): Promise<void> {
  // no-op: foreground prefetch já é feito em App.tsx via requestIdleCallback
  return;
}

/**
 * As permissões de push/local notifications continuam sendo pedidas em
 * `useNativePermissions`, então aqui não fazemos nada.
 */
export async function ensureBackgroundPermissions(): Promise<boolean> {
  return isNative();
}
