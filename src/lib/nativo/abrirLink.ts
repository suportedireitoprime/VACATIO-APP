import { Capacitor } from '@capacitor/core';
import { openExternal } from '@/lib/nativeBrowser';

/** Esquemas que devem abrir o app externo correspondente. */
const ESQUEMAS_EXTERNOS = /^(mailto:|tel:|sms:|whatsapp:|geo:|market:|itms-apps:|intent:)/i;

/**
 * Abre um link mantendo o usuário no app quando possível.
 * Nativo: app externo (mailto/tel/lojas) ou in-app browser do sistema.
 * Web: nova aba.
 */
export async function abrirLink(url: string): Promise<void> {
  if (!url) return;

  if (Capacitor.isNativePlatform() && ESQUEMAS_EXTERNOS.test(url)) {
    try {
      const { AppLauncher } = await import('@capacitor/app-launcher');
      await AppLauncher.openUrl({ url });
      return;
    } catch {
      /* cai para o browser */
    }
  }

  await openExternal(url);
}
