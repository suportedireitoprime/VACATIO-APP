/**
 * Firebase Analytics nativo (Android/iOS) — espelha os eventos do GA4 web.
 * No navegador tudo vira no-op: o GA4 web já cobre esse caso.
 */
import { Capacitor } from "@capacitor/core";

function isNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

async function plugin() {
  if (!isNative()) return null;
  try {
    const mod = await import("@capacitor-firebase/analytics");
    return mod.FirebaseAnalytics;
  } catch {
    return null;
  }
}

export async function nativeSetConsent(granted: boolean) {
  const p = await plugin();
  if (!p) return;
  try {
    await p.setEnabled({ enabled: granted });
    await p.setConsent?.({
      // @ts-expect-error tipos variam entre versões do plugin
      consentType: "ANALYTICS_STORAGE",
      consentStatus: granted ? "GRANTED" : "DENIED",
    });
  } catch { /* noop */ }
}

export async function nativeSetUserId(userId: string | null) {
  const p = await plugin();
  if (!p) return;
  try { await p.setUserId({ userId }); } catch { /* noop */ }
}

export async function nativeLogEvent(name: string, params: Record<string, any> = {}) {
  const p = await plugin();
  if (!p) return;
  try { await p.logEvent({ name, params }); } catch { /* noop */ }
}

export async function nativeLogScreen(screenName: string) {
  const p = await plugin();
  if (!p) return;
  try { await p.setCurrentScreen({ screenName }); } catch { /* noop */ }
}

export async function nativeSetUserProperty(name: string, value: string) {
  const p = await plugin();
  if (!p) return;
  try {
    // @ts-expect-error tipos variam entre versões do plugin
    await p.setUserProperty?.({ name, value });
  } catch { /* noop */ }
}
