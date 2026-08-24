/**
 * Wrapper de Firebase Crashlytics para Android.
 * Em web/iOS/preview vira no-op.
 *
 * Coleta habilitada só em builds nativos de produção.
 */
import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

const isNative = () => Capacitor.isNativePlatform();

let enabled = false;

export async function initCrashlytics(): Promise<void> {
  if (!isNative()) return;
  try {
    await FirebaseCrashlytics.setEnabled({ enabled: true });
    enabled = true;
  } catch (e) {
    console.warn('[crashlytics] init failed', e);
  }
}

export async function logCrashlytics(message: string): Promise<void> {
  if (!enabled) return;
  try {
    await FirebaseCrashlytics.log({ message });
  } catch {}
}

export async function recordException(
  error: unknown,
  context?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!enabled) {
    // no-op em web, mas ainda loga para dev
    if (!isNative()) console.error('[crashlytics:web]', error, context);
    return;
  }
  try {
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        await FirebaseCrashlytics.setCustomKey({
          key: k.slice(0, 64),
          value: v as string,
          type: typeof v === 'number' ? 'double' : typeof v === 'boolean' ? 'boolean' : 'string',
        });
      }
    }
    const err = error instanceof Error ? error : new Error(String(error));
    await FirebaseCrashlytics.recordException({
      message: err.message?.slice(0, 500) || 'unknown',
      stacktrace: err.stack
        ? err.stack.split('\n').slice(0, 30).map((line) => ({
            fileName: 'web',
            lineNumber: 0,
            methodName: line.trim(),
            className: 'JS',
          }))
        : undefined,
    });
  } catch (e) {
    console.warn('[crashlytics] recordException failed', e);
  }
}

export async function setCrashlyticsUserId(userId: string | null): Promise<void> {
  if (!enabled) return;
  try {
    await FirebaseCrashlytics.setUserId({ userId: userId ?? '' });
  } catch {}
}

export async function setCrashlyticsCustomKey(
  key: string,
  value: string | number | boolean,
): Promise<void> {
  if (!enabled) return;
  try {
    await FirebaseCrashlytics.setCustomKey({
      key: key.slice(0, 64),
      value: value as string,
      type: typeof value === 'number' ? 'double' : typeof value === 'boolean' ? 'boolean' : 'string',
    });
  } catch {}
}

/**
 * Dispara um crash nativo (só use em rota admin/debug).
 * Mata o processo, gera relatório no próximo boot.
 */
export async function forceNativeCrash(): Promise<void> {
  if (!isNative()) {
    throw new Error('[TESTE] Crash simulado (web) — em native isso mataria o processo');
  }
  await FirebaseCrashlytics.crash({ message: 'Teste manual do Crashlytics' });
}

/**
 * Instala handlers globais para pegar erros não tratados de JS/React.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    void recordException(event.error || new Error(event.message), {
      source: 'window.onerror',
      filename: event.filename || 'unknown',
      lineno: event.lineno || 0,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    void recordException(event.reason || new Error('Unhandled promise rejection'), {
      source: 'unhandledrejection',
    });
  });
}
