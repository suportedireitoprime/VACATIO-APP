// Agenda lembrete de fim de trial: 1) salva no Supabase (para o cron enviar
// via WhatsApp); 2) agenda push local (Capacitor) para o mesmo instante.
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export type TrialPlan = 'mensal' | 'anual_parcelado';

export function trialDaysFor(plan: TrialPlan): number {
  return plan === 'mensal' ? 3 : 7;
}

/** Momento em que o lembrete "seu teste termina em breve" deve chegar. */
export function computeReminderAt(startedAt: Date, trialDays: number): Date {
  // 24h antes do fim para plano de 3 dias; 48h antes para 7 dias.
  const endsAt = new Date(startedAt.getTime() + trialDays * 86400_000);
  const leadHours = trialDays >= 7 ? 48 : 24;
  return new Date(endsAt.getTime() - leadHours * 3600_000);
}

export async function scheduleTrialReminder(plan: TrialPlan): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const trialDays = trialDaysFor(plan);
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + trialDays * 86400_000);
    const reminderAt = computeReminderAt(startedAt, trialDays);

    // 1) Persistência para o cron (Horus/WhatsApp)
    await supabase.from('trial_reminders').insert({
      user_id: user.id,
      plano: plan,
      trial_days: trialDays,
      trial_started_at: startedAt.toISOString(),
      trial_ends_at: endsAt.toISOString(),
      reminder_at: reminderAt.toISOString(),
      status: 'scheduled',
    });

    // 2) Push local no dispositivo
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }
        const notifyId = 77000 + Math.floor(Math.random() * 10000);
        const planoLabel = plan === 'anual_parcelado' ? 'Anual (12x)' : 'Mensal';
        await LocalNotifications.schedule({
          notifications: [{
            id: notifyId,
            title: 'Seu teste grátis está acabando',
            body: `Plano ${planoLabel} — para não perder acesso, deixe seu método de pagamento OK no Google Play.`,
            schedule: { at: reminderAt, allowWhileIdle: true },
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#c9a84c',
          }],
        });
      } catch (e) {
        console.warn('[trialReminders] push local falhou', e);
      }
    }
  } catch (e) {
    console.warn('[trialReminders] agendamento falhou', e);
  }
}
