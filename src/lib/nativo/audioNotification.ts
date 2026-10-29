/**
 * Notificação nativa em segundo plano no estilo Spotify para Áudio Aulas (Capacitor).
 * Exibe notificação contínua e rica (MediaStyle / MediaSession nativo) na barra de status
 * do Android e na tela de bloqueio com controles de Play, Pause, Anterior, Próxima,
 * título, artista, capa da aula e scrubber de tempo.
 */
import { Capacitor } from '@capacitor/core';
import type { AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { MediaNotification, type MediaNotificationActionEvent } from './mediaNotificationPlugin';

export interface AtualizarNotificacaoParams {
  aula: AulaAudio | null;
  tocando: boolean;
  tempo?: number;
  dur?: number;
  canNext?: boolean;
  canPrev?: boolean;
}

let activeListenerHandle: { remove: () => Promise<void> } | null = null;

export interface MediaNotificationCallbacks {
  onTogglePlay?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSeek?: (posSec: number) => void;
}

/**
 * Registra o listener de ações nativas (quando o usuário toca nos botões da notificação).
 */
export async function registrarCallbacksMediaNotification(callbacks: MediaNotificationCallbacks): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  try {
    if (activeListenerHandle) {
      await activeListenerHandle.remove().catch(() => {});
      activeListenerHandle = null;
    }

    const handle = await MediaNotification.addListener('action', (evt: MediaNotificationActionEvent) => {
      switch (evt.action) {
        case 'toggle':
          callbacks.onTogglePlay?.();
          break;
        case 'play':
          callbacks.onPlay?.();
          break;
        case 'pause':
          callbacks.onPause?.();
          break;
        case 'next':
          callbacks.onNext?.();
          break;
        case 'prev':
          callbacks.onPrev?.();
          break;
        case 'seek':
          if (typeof evt.position === 'number') {
            callbacks.onSeek?.(evt.position);
          }
          break;
      }
    });

    activeListenerHandle = handle;
    return () => {
      handle.remove().catch(() => {});
      if (activeListenerHandle === handle) {
        activeListenerHandle = null;
      }
    };
  } catch (err) {
    console.warn('[AudioNotification] Falha ao registrar listeners nativos de mídia:', err);
    return () => {};
  }
}

/**
 * Atualiza ou cancela a notificação em segundo plano dependendo do estado da reprodução.
 */
export async function atualizarNotificacaoPlayback({
  aula,
  tocando,
  tempo = 0,
  dur = 0,
  canNext = true,
  canPrev = true,
}: AtualizarNotificacaoParams): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (!aula) {
      await MediaNotification.dismiss().catch(() => {});
      return;
    }

    const capa =
      (aula as any).capa_url ||
      (aula as any).url_capa ||
      (aula as any).imagem_url ||
      capaDaArea(aula.area);

    await MediaNotification.update({
      title: aula.titulo || 'Audioaula',
      artist: aula.tema ? `${aula.area} · ${aula.tema}` : aula.area || 'Vacatio',
      album: 'Audioaulas · Vacatio',
      isPlaying: tocando,
      duration: dur > 0 ? dur : 0,
      position: tempo > 0 ? tempo : 0,
      artworkUrl: capa,
      canNext,
      canPrev,
    });
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
    await MediaNotification.dismiss().catch(() => {});
  } catch {
    /* noop */
  }
}
