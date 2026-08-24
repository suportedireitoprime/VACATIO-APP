/**
 * Google Ads — tag de conversão (gtag.js)
 * ------------------------------------------------------------
 * O ID (`AW-XXXXXXXXX`) e os labels de conversão são definidos em
 * `index.html` via `window.__GOOGLE_ADS_ID__` / `window.__GOOGLE_ADS_LABELS__`.
 * Enquanto não forem preenchidos, todas as chamadas viram no-op silencioso.
 *
 * Compartilha o mesmo gtag.js do GA4 (`src/lib/analytics.ts`) e respeita o
 * Consent Mode v2 — nada dispara antes do consentimento.
 */

declare global {
  interface Window {
    __GOOGLE_ADS_ID__?: string;
    __GOOGLE_ADS_LABELS__?: Record<string, string>;
  }
}

export type AdsConversionKey =
  | "purchase"
  | "begin_checkout"
  | "start_trial"
  | "sign_up"
  | "lead"
  | "download_app";

export function getAdsId(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.__GOOGLE_ADS_ID__;
  if (!id || !id.startsWith("AW-")) return null;
  return id;
}

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

let configured = false;

/** Chamado após o consentimento, junto com o carregamento do gtag.js. */
export function initGoogleAds() {
  const id = getAdsId();
  if (!id || configured || isNativeApp() || typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  configured = true;
  window.gtag("config", id, { allow_enhanced_conversions: true });
}

/** Enhanced Conversions: envia identificadores do usuário (o gtag hasheia). */
export function setAdsUserData(data: { email?: string | null; phone?: string | null }) {
  const id = getAdsId();
  if (!id || isNativeApp() || typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  const payload: Record<string, string> = {};
  if (data.email) payload.email = data.email.trim().toLowerCase();
  if (data.phone) payload.phone_number = data.phone.replace(/[^\d+]/g, "");
  if (!Object.keys(payload).length) return;
  window.gtag("set", "user_data", payload);
}

/** Dispara uma conversão do Google Ads pelo nome lógico. */
export function adsConversion(
  key: AdsConversionKey,
  params: { value?: number; currency?: string; transaction_id?: string } = {}
) {
  const id = getAdsId();
  if (!id || isNativeApp() || typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  const label = window.__GOOGLE_ADS_LABELS__?.[key];
  if (!label) return; // label não configurado ainda
  window.gtag("event", "conversion", {
    send_to: `${id}/${label}`,
    value: params.value,
    currency: params.currency ?? "BRL",
    transaction_id: params.transaction_id,
  });
}
