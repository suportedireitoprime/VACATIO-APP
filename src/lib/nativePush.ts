import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PUSH_CHANNEL_ID, configurarCanaisDeNotificacao } from '@/lib/nativeNotificationChannels';

const PENDING_TOKEN_KEY = 'oab_na_risca_pending_push_token';
const INSTALL_ID_KEY = 'oab_na_risca_install_id';

function getInstallId(): string {
  try {
    let id = window.localStorage.getItem(INSTALL_ID_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || `inst_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      window.localStorage.setItem(INSTALL_ID_KEY, id);
    }
    return id;
  } catch {
    return `inst_${Date.now()}`;
  }
}

const PENDING_EVENTS_KEY = 'vacatio:push-pending-events';

type PendingEvent = {
  campaign_id: string;
  event_type: 'opened' | 'delivered' | 'converted';
  metadata: Record<string, unknown>;
};

function readPendingEvents(): PendingEvent[] {
  try {
    const raw = window.localStorage.getItem(PENDING_EVENTS_KEY);
    return raw ? (JSON.parse(raw) as PendingEvent[]) : [];
  } catch { return []; }
}

function writePendingEvents(list: PendingEvent[]) {
  try {
    window.localStorage.setItem(PENDING_EVENTS_KEY, JSON.stringify(list.slice(-30)));
  } catch {}
}

function queuePendingEvent(ev: PendingEvent) {
  const list = readPendingEvents();
  const dup = list.some((e) => e.campaign_id === ev.campaign_id && e.event_type === ev.event_type);
  if (!dup) writePendingEvents([...list, ev]);
}

function dropPendingEvent(ev: PendingEvent) {
  writePendingEvents(
    readPendingEvents().filter(
      (e) => !(e.campaign_id === ev.campaign_id && e.event_type === ev.event_type),
    ),
  );
}

/**
 * Reenvia eventos de push que não conseguiram chegar ao servidor (app fechado
 * logo após o toque, offline, cold-start). O backend deduplica por install_id.
 */
export async function flushPendingPushEvents() {
  const list = readPendingEvents();
  if (!list.length) return;
  for (const ev of list) {
    try {
      const { error } = await supabase.functions.invoke('push-track', {
        body: { campaign_id: ev.campaign_id, event_type: ev.event_type, metadata: ev.metadata },
      });
      if (!error) dropPendingEvent(ev);
    } catch { /* tenta de novo no próximo boot */ }
  }
}

function trackPush(campaignId: string, eventType: 'opened' | 'delivered' | 'converted', extra: Record<string, unknown> = {}) {
  const platform = (() => {
    try { return Capacitor.getPlatform(); } catch { return 'web'; }
  })();
  // Marca a sessão de jornada quando a notificação é aberta
  if (eventType === 'opened' && typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem('vacatio:push-journey', JSON.stringify({
        campaign_id: campaignId, started_at: Date.now(), install_id: getInstallId(),
      }));
    } catch {}
  }
  const pending: PendingEvent = {
    campaign_id: campaignId,
    event_type: eventType,
    metadata: { install_id: getInstallId(), platform, ...extra },
  };
  // Persiste antes de enviar: se o app for morto no meio, reenviamos no boot.
  queuePendingEvent(pending);
  return supabase.functions.invoke('push-track', {
    body: {
      campaign_id: campaignId,
      event_type: eventType,
      metadata: pending.metadata,
    },
  }).then(({ error }) => {
    if (!error) dropPendingEvent(pending);
  }).catch((e) => console.warn(`push-track ${eventType} failed`, e));
}

export function getPushInstallId() { return getInstallId(); }

type RegisterResult = {
  ok: boolean;
  reason?: string;
  token?: string;
};

let listenersReady: Promise<void> | null = null;
let waitingForRegistration: ((result: RegisterResult) => void) | null = null;

export const isNativePushAvailable = () => Capacitor.isNativePlatform();

export async function saveNativePushToken(token?: string): Promise<RegisterResult> {
  if (!token) return { ok: false, reason: 'empty_token' };

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;

  if (!userId) {
    window.localStorage.setItem(PENDING_TOKEN_KEY, token);
    return { ok: false, reason: 'waiting_for_login', token };
  }

  const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  const { error } = await supabase.from('device_tokens').upsert(
    // Reativa o token caso tenha sido marcado como invalidado (reinstalação)
    { user_id: userId, token, platform, invalidated_at: null, invalid_reason: null },
    { onConflict: 'token' },
  );

  if (error) {
    console.warn('Push token save failed', error);
    return { ok: false, reason: error.message, token };
  }

  if (window.localStorage.getItem(PENDING_TOKEN_KEY) === token) {
    window.localStorage.removeItem(PENDING_TOKEN_KEY);
  }

  return { ok: true, token };
}

export async function flushPendingNativePushToken(): Promise<RegisterResult> {
  const pending = window.localStorage.getItem(PENDING_TOKEN_KEY);
  if (!pending) return { ok: false, reason: 'no_pending_token' };
  return saveNativePushToken(pending);
}

export async function ensureNativePushListeners() {
  if (!Capacitor.isNativePlatform()) return;
  if (listenersReady) return listenersReady;

  listenersReady = (async () => {
    await PushNotifications.addListener('registration', async (token) => {
      const result = await saveNativePushToken(token.value);
      waitingForRegistration?.({ ...result, token: token.value });
      waitingForRegistration = null;
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('Push registration error', err);
      waitingForRegistration?.({ ok: false, reason: JSON.stringify(err) });
      waitingForRegistration = null;
    });

    // Toque na notificação (app em background/fechado ou aberto)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = (action.notification?.data ?? {}) as Record<string, string>;
      const url = data.url;
      const campaignId = data.campaign_id;

      // Registra o clique pra métrica de "aberturas"
      if (campaignId) {
        trackPush(campaignId, 'opened', { url: url || null, source: 'action' });
      }

      if (url) {
        try {
          if (/^https?:\/\//i.test(url)) {
            window.location.href = url;
            if (campaignId) trackPush(campaignId, 'converted', { url });
          } else {
            const path = url.startsWith('/') ? url : `/${url}`;
            // Dispara evento — App.tsx escuta e usa react-router `navigate()`
            // para evitar reload completo quando o app já está aberto.
            window.dispatchEvent(new CustomEvent('vacatio:push-navigate', { detail: { path } }));
            // Fallback: se ninguém tratar em 250ms, faz navegação hard.
            window.setTimeout(() => {
              if (window.location.pathname !== path.split('?')[0]) {
                window.location.assign(path);
              }
            }, 250);
            // Convertido: navegou pra dentro do app
            if (campaignId) {
              window.setTimeout(() => trackPush(campaignId, 'converted', { url: path }), 500);
            }
          }
        } catch (e) {
          console.warn('Push navigation failed', e);
        }
      }
    });

    // Notificação chegou com app aberto — Android/iOS não exibem banner nativo
    // automaticamente no foreground, então mostramos uma notificação local.
    await PushNotifications.addListener('pushNotificationReceived', async (notif) => {
      const data = (notif.data ?? {}) as Record<string, string>;
      const campaignId = data.campaign_id;

      if (campaignId) {
        trackPush(campaignId, 'delivered', { foreground: true });
      }

      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        // Garante permissão (Android 13+ exige runtime permission separada)
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') {
            console.warn('LocalNotifications permission not granted, skipping foreground display');
            return;
          }
        }
        // Cria canal (idempotente) para evitar falha silenciosa
        try {
          await LocalNotifications.createChannel?.({
            id: DEFAULT_PUSH_CHANNEL_ID,
            name: 'Vacatio · Alertas',
            description: 'Alertas principais do app',
            importance: 5,
            visibility: 1,
            vibration: true,
            lights: true,
          } as any);
        } catch {}
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now() % 2147483647,
            title: notif.title ?? data.title ?? 'OAB na Risca',
            body: notif.body ?? data.body ?? '',
            schedule: { at: new Date(Date.now() + 250) },
            channelId: DEFAULT_PUSH_CHANNEL_ID,
            extra: data,
          }],
        });
      } catch (e) {
        console.warn('Foreground push display failed', e);
      }
    });

    // Cold-start recovery: quando o app abre a partir de uma notificação
    // (killed → foreground), o evento `pushNotificationActionPerformed`
    // costuma disparar antes do listener anexar. Percorremos as notificações
    // ainda entregues e registramos como abertas — o backend deduplica por
    // install_id, então não conta em dobro.
    try {
      const { notifications } = await PushNotifications.getDeliveredNotifications();
      for (const n of notifications ?? []) {
        const data = ((n as any).data ?? {}) as Record<string, string>;
        const campaignId = data.campaign_id;
        if (campaignId) {
          trackPush(campaignId, 'opened', { source: 'cold_start_recovery' });
        }
      }
    } catch (e) {
      console.warn('cold-start push recovery failed', e);
    }

    // Reenvia eventos que ficaram pendentes em execuções anteriores.
    flushPendingPushEvents();
  })();

  return listenersReady;
}

export async function registerNativePushToken(timeoutMs = 5000): Promise<RegisterResult> {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'not_native_app' };

  await ensureNativePushListeners();
  await flushPendingNativePushToken();

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== 'granted') {
    return { ok: false, reason: 'permission_not_granted' };
  }

  // Cria canais Android com sons personalizados por perfil (estudante/concurseiro/advogado)
  await configurarCanaisDeNotificacao();

  const registration = new Promise<RegisterResult>((resolve) => {
    waitingForRegistration = resolve;
    window.setTimeout(() => {
      if (waitingForRegistration === resolve) {
        waitingForRegistration = null;
        resolve({ ok: false, reason: 'registration_timeout' });
      }
    }, timeoutMs);
  });

  await PushNotifications.register();
  return registration;
}