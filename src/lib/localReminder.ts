// Wrapper Capacitor Local Notifications para lembretes recorrentes.
// Fallback silencioso quando não está no app nativo.
import { Capacitor } from '@capacitor/core';

const BASE_ID = 88000; // faixa reservada p/ reading_reminders

// gera IDs estáveis a partir de UUID
function idFor(reminderId: string, weekday: number) {
  let hash = 0;
  for (let i = 0; i < reminderId.length; i++) hash = ((hash << 5) - hash + reminderId.charCodeAt(i)) | 0;
  return BASE_ID + Math.abs(hash % 10000) * 10 + weekday;
}

export interface LocalScheduleInput {
  reminderId: string;
  title: string;
  body: string;
  timeHHMM: string;      // "HH:MM"
  daysOfWeek: number[];  // 0=Sun..6=Sat
}

export async function scheduleLocalReminder(input: LocalScheduleInput): Promise<number[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return [];
    }
    await cancelLocalReminder(input.reminderId);
    const [hh, mm] = input.timeHHMM.split(':').map(Number);
    const ids: number[] = [];
    for (const dow of input.daysOfWeek) {
      // Capacitor: 1=Sun..7=Sat
      const weekday = dow + 1;
      const nid = idFor(input.reminderId, weekday);
      await LocalNotifications.schedule({
        notifications: [{
          id: nid,
          title: input.title,
          body: input.body,
          schedule: { on: { weekday, hour: hh, minute: mm }, allowWhileIdle: true, repeats: true },
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#c9a84c',
        }],
      });
      ids.push(nid);
    }
    return ids;
  } catch (e) {
    console.warn('[localReminder] falhou', e);
    return [];
  }
}

export async function cancelLocalReminder(reminderId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    const mine = pending.notifications.filter(n => {
      for (let w = 1; w <= 7; w++) if (idFor(reminderId, w) === Number(n.id)) return true;
      return false;
    });
    if (mine.length) {
      await LocalNotifications.cancel({ notifications: mine.map(n => ({ id: Number(n.id) })) });
    }
  } catch (e) { /* noop */ }
}
