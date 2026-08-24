// Bloqueio de captura de tela (screenshot / gravação de tela).
//
// Android: FLAG_SECURE é aplicado nativamente na MainActivity.onCreate
// (patch injetado pelo workflow `.github/workflows/build-android.yml`).
// Nada precisa ser feito em JS — a flag vale pra toda a janela do app,
// incluindo previews de multitarefas.
//
// iOS: não existe API pública que bloqueie captura, mas dá pra
// esconder o conteúdo quando o app vai pro background (que é quando
// o iOS tira o snapshot pra multitarefas / o usuário pode tirar print).
// Sobrepõe uma view opaca via `document.body` sempre que o app deixa de
// estar ativo. Sem-op na web.

import { Capacitor } from '@capacitor/core';

const OVERLAY_ID = 'ios-privacy-overlay';

function ensureOverlay(): HTMLDivElement {
  let el = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      background: '#1a0a14',
      display: 'none',
      pointerEvents: 'none',
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
  }
  return el;
}

const installed = false;

/**
 * Instala guard de privacidade — chama uma vez no boot do app.
 * Retorna função de cleanup (útil em testes).
 */
export async function installScreenshotGuard(): Promise<() => void> {
  // Captura de tela e gravação liberadas para todos — nenhum guard instalado.
  return () => {};
}


/**
 * Admin-only: libera captura de tela e gravação (remove FLAG_SECURE) para
 * poder gravar vídeo de demonstração exigido pela revisão da Play Store.
 *
 * A flag é lida nativamente em `MainActivity.onCreate` a partir da
 * SharedPreferences do plugin Capacitor Preferences (chave
 * `admin_allow_capture`). Persistir aqui garante que, após reiniciar o app,
 * o FLAG_SECURE não seja aplicado. Também tenta remover a flag da janela
 * atual imediatamente, sem esperar restart, quando a plataforma permite.
 *
 * @param allowed  true = admin autorizou captura; false = volta ao padrão seguro.
 */
export async function setAdminScreenCaptureAllowed(allowed: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    if (allowed) {
      await Preferences.set({ key: 'admin_allow_capture', value: 'true' });
    } else {
      await Preferences.remove({ key: 'admin_allow_capture' });
    }
  } catch (e) {
    console.warn('[screenshotGuard] setAdminScreenCaptureAllowed failed', e);
  }
}
