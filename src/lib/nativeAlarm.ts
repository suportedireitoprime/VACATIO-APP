// Alarme exato pra momentos críticos (prova OAB, contagem regressiva).
// Usa @capacitor/local-notifications com prioridade máxima. Em Android 12+,
// requer permissão especial `SCHEDULE_EXACT_ALARM` — pedimos ao usuário
// mandando ele à tela de configurações se necessário.

import { Capacitor } from '@capacitor/core';
import { toastNative } from './nativeToast';

export interface ExactAlarm {
  id: number;         // 32-bit int único
  at: Date;           // quando disparar
  title: string;
  body: string;
  sound?: string;     // arquivo em android/app/src/main/res/raw/
}

/**
 * Agenda uma notificação de prioridade máxima. Em Android 12+ tenta
 * usar exact alarm; se a permissão não estiver concedida, cai pra
 * agendamento aproximado e avisa o usuário.
 */
export async function scheduleExactAlarm(a: ExactAlarm): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return false;
    }
    await LocalNotifications.schedule({
      notifications: [{
        id: a.id,
        title: a.title,
        body: a.body,
        schedule: { at: a.at, allowWhileIdle: true },
        sound: a.sound,
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#c9a84c',
        channelId: 'alarme-prova',
      }],
    });
    return true;
  } catch (e: any) {
    console.warn('[nativeAlarm] falhou', e);
    // Se o erro for de permissão exact alarm, joga o usuário nas configs
    if (String(e?.message ?? '').toLowerCase().includes('exact')) {
      toastNative.error('Autorize alarmes exatos nas configurações do Android.');
      try {
        const { AppLauncher } = await import('@capacitor/app-launcher');
        await AppLauncher.openUrl({ url: 'package:br.com.vacatio.app' });
      } catch {}
    }
    return false;
  }
}

export async function cancelExactAlarm(id: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {}
}

/** Cria o canal Android com prioridade máxima (chamar uma vez no boot). */
export async function ensureAlarmChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: 'alarme-prova',
      name: 'Alarmes de Prova',
      description: 'Notificações críticas antes de provas e concursos',
      importance: 5,
      vibration: true,
      lights: true,
      sound: undefined,
    });
  } catch {}
}
