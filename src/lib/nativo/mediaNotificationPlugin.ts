import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface MediaNotificationUpdateOptions {
  title: string;
  artist: string;
  album: string;
  isPlaying: boolean;
  duration?: number; // em segundos
  position?: number; // em segundos
  artworkUrl?: string;
  canNext?: boolean;
  canPrev?: boolean;
}

export interface MediaNotificationActionEvent {
  action: 'play' | 'pause' | 'toggle' | 'next' | 'prev' | 'seek' | 'stop';
  position?: number; // em segundos quando action === 'seek'
}

export interface MediaNotificationPluginInterface {
  update(options: MediaNotificationUpdateOptions): Promise<void>;
  dismiss(): Promise<void>;
  addListener(
    eventName: 'action',
    listenerFunc: (event: MediaNotificationActionEvent) => void
  ): Promise<PluginListenerHandle>;
}

export const MediaNotification = registerPlugin<MediaNotificationPluginInterface>('MediaNotification', {
  web: () => ({
    update: async () => {},
    dismiss: async () => {},
    addListener: async () => ({ remove: async () => {} }),
  }),
});

