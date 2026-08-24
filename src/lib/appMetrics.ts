// Lightweight app-wide metrics tracker.
// - Counts clicks (interações)
// - Accumulates active screen time in seconds (only while tab visible)
// Flushes to public.increment_user_metrics every 30s and on pagehide.

import { supabase } from '@/integrations/supabase/client';

const LS_CLICKS = 'app_metrics_clicks_pending_v1';
const LS_SECONDS = 'app_metrics_seconds_pending_v1';

let started = false;
let pendingClicks = 0;
let pendingSeconds = 0;
let lastTick = 0;
let rafHandle: number | null = null;
let flushTimer: number | null = null;

function readNum(key: string): number {
  try { return Number(localStorage.getItem(key) || 0) || 0; } catch { return 0; }
}
function writeNum(key: string, v: number) {
  try { localStorage.setItem(key, String(v)); } catch {}
}

function tick(now: number) {
  if (document.visibilityState === 'visible') {
    if (lastTick > 0) {
      const delta = (now - lastTick) / 1000;
      if (delta > 0 && delta < 5) {
        pendingSeconds += delta;
      }
    }
    lastTick = now;
  } else {
    lastTick = 0;
  }
  rafHandle = requestAnimationFrame(tick);
}

async function flush() {
  const clicks = pendingClicks + readNum(LS_CLICKS);
  const seconds = Math.floor(pendingSeconds + readNum(LS_SECONDS));
  if (clicks <= 0 && seconds <= 0) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    writeNum(LS_CLICKS, clicks);
    writeNum(LS_SECONDS, seconds);
    return;
  }
  const { error } = await supabase.rpc('increment_user_metrics', {
    p_clicks: clicks,
    p_seconds: seconds,
  });
  if (error) {
    writeNum(LS_CLICKS, clicks);
    writeNum(LS_SECONDS, seconds);
  } else {
    pendingClicks = 0;
    pendingSeconds = 0;
    writeNum(LS_CLICKS, 0);
    writeNum(LS_SECONDS, 0);
    window.dispatchEvent(new CustomEvent('app-metrics-flushed'));
  }
}

export function startAppMetrics() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const onClick = () => { pendingClicks += 1; };
  window.addEventListener('pointerdown', onClick, { passive: true, capture: true });

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      lastTick = 0;
      void flush();
    } else {
      lastTick = performance.now();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  window.addEventListener('pagehide', () => { void flush(); });

  lastTick = performance.now();
  rafHandle = requestAnimationFrame(tick);
  flushTimer = window.setInterval(() => { void flush(); }, 30_000);
}

export function stopAppMetrics() {
  if (rafHandle) cancelAnimationFrame(rafHandle);
  if (flushTimer) clearInterval(flushTimer);
  started = false;
}

export function flushAppMetricsNow() {
  return flush();
}

export function getPendingMetrics() {
  return {
    clicks: pendingClicks + readNum(LS_CLICKS),
    seconds: Math.floor(pendingSeconds + readNum(LS_SECONDS)),
  };
}
