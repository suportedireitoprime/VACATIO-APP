/**
 * In-App Review orchestrator.
 *
 * Rules:
 *  - Only fires on native platform.
 *  - Requires either 5+ tracked positive events OR 7+ days since first open.
 *  - Cooldown: at most once per 90 days.
 *
 * Call `trackReviewEvent()` after high-satisfaction moments
 * (finished simulado ≥ 60%, long reading session, quiz completed).
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const K_LAST_SHOWN = 'iar_last_shown_ts';
const K_EVENT_COUNT = 'iar_event_count';
const K_FIRST_OPEN = 'iar_first_open_ts';
const K_OPEN_COUNT = 'iar_open_count';
const K_PROMPTED = 'iar_prompted_ts';

const MIN_DAYS_BETWEEN_PROMPTS = 90;
const MIN_POSITIVE_EVENTS = 5;
const MIN_DAYS_SINCE_INSTALL = 7;
const DAY_MS = 86_400_000;

async function get(key: string): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  } catch {
    return null;
  }
}
async function set(key: string, value: string): Promise<void> {
  try {
    await Preferences.set({ key, value });
  } catch {
    /* noop */
  }
}

/** Seed the first-open timestamp at app boot. */
export async function seedFirstOpen(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const existing = await get(K_FIRST_OPEN);
  if (!existing) await set(K_FIRST_OPEN, String(Date.now()));
}

/**
 * Já mostramos o prompt nativo de avaliação alguma vez?
 * As lojas (Play e StoreKit) não devolvem se a pessoa realmente avaliou,
 * então usamos a marca local de "prompt exibido" como proxy.
 */
export async function hasRated(): Promise<boolean> {
  const v = await get(K_PROMPTED);
  return !!v;
}

async function markPrompted(): Promise<void> {
  const now = String(Date.now());
  await set(K_PROMPTED, now);
  await set(K_LAST_SHOWN, now);
}

/**
 * Dispara o prompt nativo (Play In-App Review no Android,
 * SKStoreReviewController/AppStore.requestReview no iOS).
 * Retorna true se a chamada nativa foi feita com sucesso.
 */
export async function requestReviewNow(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
    await markPrompted();
    return true;
  } catch (e) {
    console.warn('[InAppReview] request failed', e);
    return false;
  }
}

/** Incrementa o contador de aberturas do app e retorna o novo valor. */
export async function trackAppOpen(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  const raw = await get(K_OPEN_COUNT);
  const n = (raw ? Number(raw) : 0) + 1;
  await set(K_OPEN_COUNT, String(n));
  return n;
}

/**
 * Na SEGUNDA abertura do app (ou depois, se ainda não pedimos),
 * mostra o prompt nativo de avaliação. No-op na web e se já mostramos antes.
 */
export async function maybeRequestOnSecondOpen(delayMs = 3500): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const opens = await trackAppOpen();
  if (opens < 2) return;
  if (await hasRated()) return;
  setTimeout(() => { requestReviewNow(); }, delayMs);
}

/** Prompt pós-compra — só aparece se a pessoa ainda não avaliou. */
export async function maybeRequestAfterPurchase(delayMs = 1500): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (await hasRated()) return;
  setTimeout(() => { requestReviewNow(); }, delayMs);
}

/** Increment the positive-event counter and try to prompt. */
export async function trackReviewEvent(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const raw = await get(K_EVENT_COUNT);
  const n = raw ? Number(raw) + 1 : 1;
  await set(K_EVENT_COUNT, String(n));
  await maybeRequestReview();
}

/** Attempt to show the native review dialog if all conditions met. */
export async function maybeRequestReview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const [lastShown, count, firstOpen] = await Promise.all([
      get(K_LAST_SHOWN),
      get(K_EVENT_COUNT),
      get(K_FIRST_OPEN),
    ]);
    const now = Date.now();

    if (lastShown && now - Number(lastShown) < MIN_DAYS_BETWEEN_PROMPTS * DAY_MS) return;

    const events = count ? Number(count) : 0;
    const daysSinceInstall = firstOpen ? (now - Number(firstOpen)) / DAY_MS : 0;

    const eligibleByEvents = events >= MIN_POSITIVE_EVENTS;
    const eligibleByTime = daysSinceInstall >= MIN_DAYS_SINCE_INSTALL;
    if (!eligibleByEvents && !eligibleByTime) return;

    // Lazy import so web bundle stays clean
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
    await markPrompted();
  } catch (e) {
    console.warn('[InAppReview] request skipped', e);
  }
}
