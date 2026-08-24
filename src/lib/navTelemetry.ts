// Lightweight navigation telemetry for mobile.
// Captures three signals to quickly identify freezes/crashes between sections:
//   1) Crash/event logging: window.onerror, unhandledrejection, resource errors.
//   2) Section-transition performance tracing: mark route change start,
//      measure time to next paint after mount.
//   3) Long-task detection during a transition (the classic "freeze" signal).
// All events are console.info-tagged with [nav-telemetry] so they surface in
// remote log capture (Sentry-like tools, Capacitor logcat, Safari webview).
// Also broadcast via a CustomEvent so an in-app debug panel can subscribe.

type TelemetryEvent =
  | { type: 'route-change'; from: string; to: string; ts: number }
  | { type: 'route-ready'; path: string; ms: number; ts: number }
  | { type: 'long-task'; path: string; ms: number; ts: number }
  | { type: 'error'; path: string; message: string; stack?: string; ts: number }
  | { type: 'rejection'; path: string; reason: string; ts: number }
  | { type: 'resource-error'; path: string; url: string; ts: number }
  | { type: 'web-vital'; path: string; name: string; value: number; rating?: string; ts: number };

const listeners = new Set<(e: TelemetryEvent) => void>();

function emit(e: TelemetryEvent) {
  try {
    // Console tag: greppable in remote logs (logcat / os_log / DevTools).
     
    console.info('[nav-telemetry]', e);
    listeners.forEach((l) => { try { l(e); } catch {} });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vacatio:nav-telemetry', { detail: e }));
    }
  } catch {}
}

export function subscribeNavTelemetry(fn: (e: TelemetryEvent) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let initialized = false;
let currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
let transitionStart = 0;
let longTaskObserver: PerformanceObserver | null = null;

export function initNavTelemetry() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // 1) Crash / uncaught error
  window.addEventListener('error', (ev) => {
    // Resource-load errors bubble as ErrorEvent without a `message` (target !== window).
    const target = ev.target as any;
    if (target && target !== window && (target.src || target.href)) {
      emit({
        type: 'resource-error',
        path: window.location.pathname,
        url: target.src || target.href,
        ts: Date.now(),
      });
      return;
    }
    emit({
      type: 'error',
      path: window.location.pathname,
      message: ev.message || String(ev.error || 'unknown'),
      stack: ev.error?.stack,
      ts: Date.now(),
    });
  }, true);

  window.addEventListener('unhandledrejection', (ev) => {
    emit({
      type: 'rejection',
      path: window.location.pathname,
      reason: String(ev.reason?.message || ev.reason || 'unknown'),
      ts: Date.now(),
    });
  });

  // 2) Long tasks (>50ms blocking main thread — the freeze signal)
  try {
    if ('PerformanceObserver' in window &&
        (PerformanceObserver as any).supportedEntryTypes?.includes('longtask')) {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          emit({
            type: 'long-task',
            path: window.location.pathname,
            ms: Math.round(entry.duration),
            ts: Date.now(),
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    }
  } catch {}
}

// Called by the router on every location change. Marks the transition start
// so we can measure how long the next paint takes (the "section transition"
// cost users perceive as slowness).
export function markRouteChange(nextPath: string) {
  if (typeof window === 'undefined') return;
  const from = currentPath;
  currentPath = nextPath;
  transitionStart = performance.now();
  emit({ type: 'route-change', from, to: nextPath, ts: Date.now() });

  // Wait two RAFs → after the new route mounts and paints once.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const ms = Math.round(performance.now() - transitionStart);
      emit({ type: 'route-ready', path: nextPath, ms, ts: Date.now() });
    });
  });
}

// Called by webVitalsRum so vitals show up alongside transition tracing.
export function recordWebVital(name: string, value: number, rating?: string) {
  emit({
    type: 'web-vital',
    path: currentPath,
    name,
    value: Math.round(value * 1000) / 1000,
    rating,
    ts: Date.now(),
  });
}