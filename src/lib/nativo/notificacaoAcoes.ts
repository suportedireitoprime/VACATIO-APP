/**
 * Ações nas notificações locais (botões "Ouvir agora", "Adiar 1h",
 * "Responder flashcard") + badge no ícone.
 *
 * Registre os tipos no boot com `registrarAcoesNotificacao()` e agende as
 * notificações passando `actionTypeId: TIPO_LEMBRETE`.
 */
import { Capacitor } from '@capacitor/core';
import { aumentarBadge, limparBadge } from './badge';

export const TIPO_LEMBRETE = 'LEMBRETE_ESTUDO';
export const TIPO_FLASHCARD = 'LEMBRETE_FLASHCARD';
export const TIPO_AUDIO = 'LEMBRETE_AUDIO';

let registrado = false;

function navegar(rota: string) {
  window.dispatchEvent(new CustomEvent('vacatio:push-navigate', { detail: { path: rota } }));
}

async function adiarUmaHora(notificacao: { title?: string; body?: string; id?: number }) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 90000) + 5000,
          title: notificacao.title ?? 'Hora de estudar',
          body: notificacao.body ?? 'Seu lembrete adiado chegou.',
          schedule: { at: new Date(Date.now() + 60 * 60 * 1000), allowWhileIdle: true },
          actionTypeId: TIPO_LEMBRETE,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#8C1220',
        },
      ],
    });
  } catch (e) {
    console.warn('[notificacaoAcoes] adiar falhou', e);
  }
}

export async function registrarAcoesNotificacao(): Promise<void> {
  if (!Capacitor.isNativePlatform() || registrado) return;
  registrado = true;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: TIPO_LEMBRETE,
          actions: [
            { id: 'estudar', title: 'Estudar agora' },
            { id: 'adiar', title: 'Adiar 1h' },
          ],
        },
        {
          id: TIPO_FLASHCARD,
          actions: [
            { id: 'responder', title: 'Responder' },
            { id: 'adiar', title: 'Adiar 1h' },
          ],
        },
        {
          id: TIPO_AUDIO,
          actions: [
            { id: 'ouvir', title: 'Ouvir agora' },
            { id: 'adiar', title: 'Adiar 1h' },
          ],
        },
      ],
    });

    await LocalNotifications.addListener('localNotificationActionPerformed', async (evento) => {
      const acao = evento.actionId;
      const extra = (evento.notification?.extra ?? {}) as { rota?: string };
      if (acao === 'adiar') {
        await adiarUmaHora({
          title: evento.notification?.title,
          body: evento.notification?.body,
          id: Number(evento.notification?.id),
        });
        return;
      }
      if (acao === 'responder') return navegar(extra.rota ?? '/flashcards');
      if (acao === 'ouvir') return navegar(extra.rota ?? '/leis-cantadas');
      if (acao === 'estudar') return navegar(extra.rota ?? '/inicio');
      // Toque no corpo da notificação
      if (extra.rota) navegar(extra.rota);
    });

    // Badge: sobe a cada notificação recebida em primeiro plano e zera ao abrir.
    await LocalNotifications.addListener('localNotificationReceived', () => {
      void aumentarBadge();
    });

    const { App } = await import('@capacitor/app');
    await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void limparBadge();
    });
    void limparBadge();
  } catch (e) {
    console.warn('[notificacaoAcoes] indisponível', e);
  }
}
