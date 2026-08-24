// Monitor Core Web Vitals reais dos usu\u00e1rios (RUM/CrUX-like).
// Envia via sendBeacon para uma tabela leve; agrega server-side para acompanhar
// LCP, INP, CLS, FCP, TTFB. Em nativo/preview/iframe n\u00e3o envia.
import { onCLS, onLCP, onINP, onFCP, onTTFB, type Metric } from 'web-vitals';
import { recordWebVital } from './navTelemetry';

function shouldReport(): boolean {
  if (typeof window === 'undefined') return false;
  try { if (window.self !== window.top) return false; } catch { return false; }
  const h = window.location.hostname;
  if (h === 'localhost' || h.startsWith('127.') || h.includes('id-preview--') || h.includes('lovableproject.com')) return false;
  return true;
}

function post(metric: Metric) {
  // Always feed the nav-telemetry tracing stream so LCP/CLS/INP show up
  // alongside route transitions, even in preview/native where we skip the
  // network POST below.
  try { recordWebVital(metric.name, metric.value, metric.rating); } catch {}
  if (!shouldReport()) return;
  try {
    const body = JSON.stringify({
      name: metric.name,
      value: Math.round(metric.value * 1000) / 1000,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      path: window.location.pathname,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: (navigator as any).connection?.effectiveType || null,
      ua: navigator.userAgent.slice(0, 200),
      ts: Date.now(),
    });
    // sendBeacon: entrega mesmo em pagehide/unload; sem afetar main thread
    const url = 'https://iftdrbxvekrhzstayjwp.supabase.co/functions/v1/web-vitals-collect';
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
    }
  } catch { /* noop */ }
}

export function initWebVitals() {
  // Always subscribe to metrics so navTelemetry receives per-route vitals in
  // preview/native. The post() function itself gates the network send.
  onCLS(post);
  onLCP(post);
  onINP(post);
  onFCP(post);
  onTTFB(post);
}
