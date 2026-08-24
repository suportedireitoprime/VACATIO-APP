import { Capacitor } from '@capacitor/core';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Compartilhamento nativo (sheet do sistema) com fallback pra Web Share API
 * e pra clipboard.
 */
export async function share(opts: ShareOptions): Promise<{ ok: boolean; method: 'native' | 'web' | 'clipboard' | 'none' }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
        dialogTitle: opts.dialogTitle ?? opts.title,
      });
      return { ok: true, method: 'native' };
    } catch (e) {
      // usuário cancelou ou erro — cai no fallback
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return { ok: true, method: 'web' };
    } catch {
      // idem
    }
  }

  const clipboardText = [opts.text, opts.url].filter(Boolean).join('\n');
  if (clipboardText && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(clipboardText);
      return { ok: true, method: 'clipboard' };
    } catch {}
  }

  return { ok: false, method: 'none' };
}
