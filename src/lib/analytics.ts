/**
 * Google Analytics 4 — Vacatio (Web)
 * ------------------------------------------------------------
 * - Consent Mode v2 (LGPD): tudo negado por padrão até o usuário aceitar.
 * - Só carrega o gtag.js DEPOIS do consentimento (evita cookies e requisições
 *   ao Google enquanto o banner estiver ativo).
 * - Persistência da escolha em localStorage (`ga_consent` = 'granted' | 'denied').
 * - No app Android nativo (Capacitor) o tracking web é desativado — Fase 4
 *   usará Firebase Analytics nativo.
 */

export const GA_MEASUREMENT_ID = "G-86C6ZMZLQM";
const CONSENT_KEY = "ga_consent";

import { fbGrantConsent, fbDenyConsent, fbPageView } from "./fbPixel";
import { initGoogleAds, getAdsId } from "./googleAds";
import { nativeSetConsent, nativeSetUserId, nativeLogScreen } from "./nativeAnalytics";
import { flushOfflineQueue, initTrackClickListener, trackScreen, trackSetUser } from "./analyticsEvents";

type ConsentState = "granted" | "denied" | null;

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor injeta window.Capacitor; também respeitamos flag global.
  return !!(window as any).Capacitor?.isNativePlatform?.() ||
    (window as any).__IS_NATIVE_APP__ === true;
}

function ensureDataLayer() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }
}

/** Chamar UMA vez no boot, o mais cedo possível (antes de qualquer track). */
export function initAnalytics() {
  if (typeof window === "undefined" || isNativeApp()) return;
  ensureDataLayer();

  // Consent Mode v2 — padrão negado (LGPD).
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false, // enviamos manualmente no route change
    anonymize_ip: true,
  });

  // Listener global de cliques data-track.
  initTrackClickListener();

  // Se o usuário já consentiu em sessões passadas, sobe o script agora.
  const saved = getConsent();
  if (saved === "granted") {
    loadGtagScript();
    initGoogleAds();
    fbGrantConsent();
    flushOfflineQueue();
  }
  void nativeSetConsent(saved === "granted");
}

let scriptLoaded = false;
function loadGtagScript() {
  if (scriptLoaded || typeof document === "undefined") return;
  scriptLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

export function getConsent(): ConsentState {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(CONSENT_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

export function grantConsent() {
  if (typeof window === "undefined") return;
  void nativeSetConsent(true);
  if (isNativeApp()) return;
  try { localStorage.setItem(CONSENT_KEY, "granted"); } catch {}
  ensureDataLayer();
  window.gtag("consent", "update", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
  });
  loadGtagScript();
  initGoogleAds();
  fbGrantConsent();
  flushOfflineQueue();
}

export function denyConsent() {
  if (typeof window === "undefined") return;
  void nativeSetConsent(false);
  if (isNativeApp()) return;
  try { localStorage.setItem(CONSENT_KEY, "denied"); } catch {}
  ensureDataLayer();
  window.gtag("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  fbDenyConsent();
}

/** Route change → dispara page_view / screen_view unificado. */
export function trackPageview(path: string, title?: string) {
  if (typeof window === "undefined") return;
  void nativeLogScreen(path);
  if (isNativeApp()) return;
  ensureDataLayer();
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: title || document.title,
    send_to: GA_MEASUREMENT_ID,
  });
  fbPageView();
  trackScreen(path, { page_title: title || document.title });
}

/** Evento customizado. Use nomes em snake_case (padrão GA4). */
export function trackEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined" || isNativeApp()) return;
  ensureDataLayer();
  window.gtag("event", name, { send_to: GA_MEASUREMENT_ID, ...params });
}

/** Vincula o ID do usuário logado (respeita consentimento). */
export function setAnalyticsUser(userId: string | null) {
  if (typeof window === "undefined") return;
  void nativeSetUserId(userId);
  if (isNativeApp()) return;
  ensureDataLayer();
  window.gtag("config", GA_MEASUREMENT_ID, {
    user_id: userId || undefined,
    send_page_view: false,
  });
  const adsId = getAdsId();
  if (adsId) window.gtag("set", "user_id", userId || undefined);
}

/** Define user_id e propriedades cross-platform. */
export function setAnalyticsUserWithProfile(
  userId: string | null,
  profile?: { email?: string | null; phone?: string | null; is_premium?: boolean }
) {
  setAnalyticsUser(userId);
  trackSetUser(userId, profile);
}
