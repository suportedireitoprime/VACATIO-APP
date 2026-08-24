// Meta (Facebook) Pixel — carregamento sob consentimento (LGPD).
// O ID fica em `window.__FB_PIXEL_ID__` (index.html). O script do Pixel só é
// injetado depois que o usuário aceita o banner de cookies.
// Todo evento padrão também é enviado à Conversions API (server-side) com o
// mesmo `event_id`, o que permite ao Meta deduplicar navegador x servidor.

import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    __FB_PIXEL_ID__?: string;
    __FB_CONSENT__?: boolean;
  }
}

export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=br.com.vacatio.app';

export type FbStandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'Lead'
  | 'CompleteRegistration'
  | 'InitiateCheckout'
  | 'StartTrial'
  | 'Subscribe'
  | 'Purchase'
  | 'AddToWishlist';

function pixelId(): string | null {
  if (typeof window === 'undefined') return null;
  const id = window.__FB_PIXEL_ID__;
  if (!id || id === 'REPLACE_WITH_PIXEL_ID') return null;
  return id;
}

function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

let loaded = false;
let advancedMatching: Record<string, string> | undefined;

function injectScript() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true; t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode!.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
}

/** Chamar quando o usuário aceitar o banner de cookies. */
export function fbGrantConsent() {
  const id = pixelId();
  if (!id || isNativeApp() || typeof window === 'undefined') return;
  window.__FB_CONSENT__ = true;
  injectScript();
  window.fbq!('consent', 'grant');
  window.fbq!('init', id, advancedMatching);
  window.fbq!('track', 'PageView');
}

export function fbDenyConsent() {
  if (typeof window === 'undefined') return;
  window.__FB_CONSENT__ = false;
  try { window.fbq?.('consent', 'revoke'); } catch { /* noop */ }
}

/**
 * Advanced Matching — melhora a taxa de correspondência do Meta.
 * O Pixel hasheia os valores no navegador antes de enviar.
 */
export function fbSetUserData(data: { email?: string | null; phone?: string | null; externalId?: string | null }) {
  const next: Record<string, string> = {};
  if (data.email) next.em = data.email.trim().toLowerCase();
  if (data.phone) next.ph = data.phone.replace(/\D/g, '');
  if (data.externalId) next.external_id = data.externalId;
  if (!Object.keys(next).length) return;
  advancedMatching = { ...(advancedMatching ?? {}), ...next };
  const id = pixelId();
  if (id && window.__FB_CONSENT__ && typeof window.fbq === 'function') {
    window.fbq('init', id, advancedMatching);
  }
}

function isPixelReady(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.fbq === 'function' &&
    window.__FB_CONSENT__ === true &&
    !!pixelId()
  );
}

export function newEventId(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random()}`; }
}

/** Envia o mesmo evento pela Conversions API (server-side). */
async function sendCapi(event: string, params: Record<string, unknown>, eventId: string) {
  if (typeof window === 'undefined' || window.__FB_CONSENT__ !== true) return;
  try {
    await supabase.functions.invoke('meta-capi', {
      body: {
        event_name: event,
        event_id: eventId,
        event_source_url: window.location.href,
        custom_data: params,
      },
    });
  } catch { /* telemetria não pode quebrar UX */ }
}

/** Evento padrão do Meta (com deduplicação Pixel x CAPI). */
export function fbTrack(event: FbStandardEvent | string, params?: Record<string, unknown>) {
  const eventId = newEventId();
  try {
    if (isPixelReady()) window.fbq!('track', event, params ?? {}, { eventID: eventId });
  } catch { /* noop */ }
  void sendCapi(event, params ?? {}, eventId);
}

export function fbTrackCustom(event: string, params?: Record<string, unknown>) {
  try {
    if (!isPixelReady()) return;
    window.fbq!('trackCustom', event, params);
  } catch { /* noop */ }
}

export function fbPageView() {
  try {
    if (isPixelReady()) window.fbq!('track', 'PageView');
  } catch { /* noop */ }
}

/**
 * Dispara o evento de conversão de download e redireciona o usuário
 * para a ficha do app na Google Play.
 */
export function trackAndRedirectToPlayStore(source?: string) {
  fbTrack('Lead', { content_name: 'Download App', source });
  fbTrackCustom('DownloadAppClick', { source });
  if (typeof window !== 'undefined') {
    window.location.href = PLAY_STORE_URL;
  }
}

/** Início de jornada (sem redirecionar). Use antes de navegar para /auth. */
export function trackStartJourney(source?: string) {
  fbTrack('Lead', { content_name: 'Start Journey', source });
  fbTrackCustom('StartJourneyClick', { source });
}
