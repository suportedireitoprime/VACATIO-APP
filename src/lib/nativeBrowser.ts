import { Capacitor } from '@capacitor/core';

/**
 * Abre uma URL externa mantendo o usuário dentro do app.
 *
 * Ordem de preferência:
 *  1. @capacitor/inappbrowser (v2, WebView interna com barra de retorno customizada)
 *  2. @capacitor/browser (clássico, Custom Tabs / SFSafariViewController)
 *  3. window.open (fallback web)
 */
export async function openExternal(
  url: string,
  opts?: { presentationStyle?: 'fullscreen' | 'popover' },
) {
  if (!url) return;

  if (Capacitor.isNativePlatform()) {
    // 1) InAppBrowser moderno (recomendado — Browser clássico está em manutenção)
    try {
      const { InAppBrowser } = await import('@capacitor/inappbrowser');
      await InAppBrowser.openInSystemBrowser?.({
        url,
        options: {
          // Compat cross-platform: opções default modernas.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      return;
    } catch {
      /* segue para browser clássico */
    }

    // 2) Browser clássico (fallback)
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({
        url,
        presentationStyle: opts?.presentationStyle ?? 'popover',
        toolbarColor: '#1a0a14',
      });
      return;
    } catch (e) {
      console.warn('Native browser failed, falling back to window.open', e);
    }
  }

  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = url;
  }
}

export async function closeExternal() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch {}
}
