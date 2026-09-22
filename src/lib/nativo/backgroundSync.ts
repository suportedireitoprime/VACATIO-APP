/**
 * Sincronização em background.
 * - Ao mandar o app para o segundo plano, pede tempo extra ao sistema
 *   (@capawesome/capacitor-background-task) e drena a fila de sync + downloads.
 * - Ao voltar, drena de novo.
 * No Android o tempo extra é fornecido pelo próprio processo; no iOS pelo
 * beginBackgroundTask. Trabalho periódico com o app fechado é feito pelo
 * WorkManager/BGTaskScheduler configurado nos workflows.
 */
import { Capacitor } from '@capacitor/core';
import { syncQueue } from '@/services/syncQueue';
import { conectado } from './rede';

let iniciado = false;

async function drenar() {
  if (!conectado()) return;
  try {
    await syncQueue.flush();
  } catch (e) {
    console.warn('[backgroundSync] flush falhou', e);
  }
}

export async function iniciarSyncBackground(): Promise<void> {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;

  // Web/PWA: apenas drena ao voltar o foco.
  if (!Capacitor.isNativePlatform()) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void drenar();
    });
    return;
  }

  try {
    const { App } = await import('@capacitor/app');
    const { BackgroundTask } = await import('@capawesome/capacitor-background-task');

    await App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        void drenar();
        return;
      }
      // App indo para o segundo plano: continua a sincronização até terminar.
      const taskId = await BackgroundTask.beforeExit(async () => {
        await drenar();
        BackgroundTask.finish({ taskId });
      });
    });
  } catch (e) {
    console.warn('[backgroundSync] indisponível', e);
  }
}

/** Força uma sincronização agora (ex.: botão "sincronizar"). */
export const sincronizarAgora = drenar;
