/**
 * Notificação nativa em segundo plano no estilo Spotify para Áudio Aulas (Capacitor).
 * Exibe notificação contínua (ongoing) na barra de status do Android/iOS enquanto a aula
 * estiver tocando. Ao tocar na notificação, traz o app para o primeiro plano e volta
 * diretamente para a aula que está tocando.
 */
import { Capacitor } from '@capacitor/core';
import type { AulaAudio } from '@/contexts/AudioaulasPlayerContext';

export const AUDIO_PLAYBACK_NOTIFICATION_ID = 777123;
const CHANNEL_ID = 'audio_playback_channel';

let channelCriado = false;
let listenerRegistrado = false;

async function garantirCanal(LocalNotifications: any) {
  if (channelCriado) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Reprodução de Áudio',
      description: 'Notificação persistente da aula em reprodução em segundo plano',
      importance: 3, // IMPORTANCE_DEFAULT / HIGH
      visibility: 1, // VISIBILITY_PUBLIC
      sound: undefined,
      vibration: false,
    });
    channelCriado = true;
  } catch (err) {
    console.warn('[AudioNotification] Erro ao criar canal de notificação:', err);
  }
}

async function garantirListener(LocalNotifications: any) {
  if (listenerRegistrado) return;
  listenerRegistrado = true;

  try {
    await LocalNotifications.addListener('localNotificationActionPerformed', (action: any) => {
      const url = action?.notification?.extra?.url;
      if (url) {
        // Dispara navegação no React Router via evento integrado do Vacatio
        window.dispatchEvent(new CustomEvent('vacatio:push-navigate', { detail: { path: url } }));
        // Fallback rápido
        window.setTimeout(() => {
          if (!window.location.pathname.startsWith('/audioaulas')) {
            window.location.assign(url);
          }
        }, 200);
      }
    });
  } catch (err) {
    console.warn('[AudioNotification] Erro ao registrar listener de clique:', err);
  }
}

export interface AtualizarNotificacaoParams {
  aula: AulaAudio | null;
  tocando: boolean;
  tempo?: number;
  dur?: number;
}

/**
 * Atualiza ou cancela a notificação em segundo plano dependendo do estado da reprodução.
 */
export async function atualizarNotificacaoPlayback({
  aula,
  tocando,
}: AtualizarNotificacaoParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await garantirCanal(LocalNotifications);
    await garantirListener(LocalNotifications);

    // Se não há aula ou a reprodução foi encerrada
    if (!aula) {
      await LocalNotifications.cancel({
        notifications: [{ id: AUDIO_PLAYBACK_NOTIFICATION_ID }],
      }).catch(() => {});
      return;
    }

    // O Android/iOS gerencia a reprodução através do MediaSession Player Nativo (Quick Settings/Lockscreen).
    // Notificações locais comuns competem com o Player nativo e criam uma notificação de texto simples.
    // Por isso, sempre garantimos o cancelamento de qualquer notificação local residual.
    await LocalNotifications.cancel({
      notifications: [{ id: AUDIO_PLAYBACK_NOTIFICATION_ID }],
    }).catch(() => {});
  } catch (err) {
    console.warn('[AudioNotification] Falha ao atualizar notificação nativa:', err);
  }
}

/**
 * Remove a notificação nativa de reprodução imediatamente.
 */
export async function limparNotificacaoPlayback(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({
      notifications: [{ id: AUDIO_PLAYBACK_NOTIFICATION_ID }],
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
