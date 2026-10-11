import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NativeBibliotecaPluginInterface {
  openBiblioteca(options?: {
    aba?: string;
    materia?: string;
    livroId?: string;
    accessToken?: string;
  }): Promise<void>;
  closeBiblioteca(): Promise<void>;
  addListener(
    eventName: 'onClose',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

const RawNativeBiblioteca = registerPlugin<NativeBibliotecaPluginInterface>('NativeBibliotecaPlugin');

export const NativeBiblioteca: NativeBibliotecaPluginInterface = {
  async openBiblioteca(options) {
    if (!Capacitor.isPluginAvailable('NativeBibliotecaPlugin')) return;
    return RawNativeBiblioteca.openBiblioteca(options);
  },
  async closeBiblioteca() {
    if (!Capacitor.isPluginAvailable('NativeBibliotecaPlugin')) return;
    return RawNativeBiblioteca.closeBiblioteca();
  },
  async addListener(eventName: string, listenerFunc: (...args: unknown[]) => void) {
    if (!Capacitor.isPluginAvailable('NativeBibliotecaPlugin')) {
      return { remove: async () => {} } as unknown as PluginListenerHandle & Promise<PluginListenerHandle>;
    }
    return RawNativeBiblioteca.addListener(eventName as 'onClose', listenerFunc as () => void);
  }
};
