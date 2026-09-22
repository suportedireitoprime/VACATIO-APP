/**
 * Contador (badge) no ícone do app — lembretes/flashcards pendentes.
 * Silencioso na web.
 */
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();

async function plugin() {
  const { Badge } = await import('@capawesome/capacitor-badge');
  return Badge;
}

export async function definirBadge(count: number): Promise<void> {
  if (!isNative()) return;
  try {
    const Badge = await plugin();
    const { isSupported } = await Badge.isSupported();
    if (!isSupported) return;
    // iOS exige permissão de notificação para exibir o badge.
    const perm = await Badge.checkPermissions();
    if (perm.display !== 'granted') {
      const pedida = await Badge.requestPermissions();
      if (pedida.display !== 'granted') return;
    }
    await Badge.set({ count: Math.max(0, Math.floor(count)) });
  } catch {
    /* noop */
  }
}

export async function limparBadge(): Promise<void> {
  if (!isNative()) return;
  try {
    const Badge = await plugin();
    await Badge.clear();
  } catch {
    /* noop */
  }
}

export async function aumentarBadge(): Promise<void> {
  if (!isNative()) return;
  try {
    const Badge = await plugin();
    await Badge.increase();
  } catch {
    /* noop */
  }
}
