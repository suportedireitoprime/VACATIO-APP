import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/**
 * Estado local do pedido de permissão de notificações.
 * Guarda quando pedimos, o resultado e quantas vezes já insistimos, para
 * re-perguntar de forma educada em vez de nunca mais tocar no assunto.
 */
const KEY = 'vacatio:push-permission-state';
const DIAS_ATE_REPERGUNTAR = 3;
const MAX_PEDIDOS = 3;

type PermState = {
  asked_count: number;
  last_asked_at: number | null;
  granted: boolean;
  dismissed_at: number | null;
};

const vazio: PermState = { asked_count: 0, last_asked_at: null, granted: false, dismissed_at: null };

export function readPermState(): PermState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...vazio, ...JSON.parse(raw) } : { ...vazio };
  } catch { return { ...vazio }; }
}

function writePermState(s: Partial<PermState>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...readPermState(), ...s })); } catch {}
}

/** Registra o evento no funil (`app_events`) para medir a taxa de aceite. */
export async function logPermEvent(
  event: 'permission_prompt_shown' | 'permission_granted' | 'permission_denied' | 'permission_dismissed',
  metadata: Record<string, unknown> = {},
) {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;
    const platform = (() => { try { return Capacitor.getPlatform(); } catch { return 'web'; } })();
    await supabase.from('app_events' as any).insert({
      user_id: userId,
      event_name: event,
      metadata: { platform, ...metadata },
    } as any);
  } catch { /* telemetria nunca quebra o fluxo */ }
}

export function marcarPedido() {
  const s = readPermState();
  writePermState({ asked_count: s.asked_count + 1, last_asked_at: Date.now() });
  logPermEvent('permission_prompt_shown');
}

export function marcarResultado(granted: boolean) {
  writePermState({ granted, dismissed_at: granted ? null : Date.now() });
  logPermEvent(granted ? 'permission_granted' : 'permission_denied');
}

/** Já temos permissão concedida no sistema? */
export async function permissaoConcedida(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const p = await PushNotifications.checkPermissions();
      return p.receive === 'granted';
    }
    if (typeof Notification !== 'undefined') return Notification.permission === 'granted';
  } catch {}
  return false;
}

/**
 * Devemos mostrar de novo o convite pra ativar notificações?
 * Regra: ainda sem permissão, já passaram alguns dias do último pedido e
 * não insistimos além do limite.
 */
export async function devePerguntarNovamente(): Promise<boolean> {
  if (await permissaoConcedida()) return false;
  const s = readPermState();
  if (s.asked_count >= MAX_PEDIDOS) return false;
  if (!s.last_asked_at) return true;
  return Date.now() - s.last_asked_at > DIAS_ATE_REPERGUNTAR * 86_400_000;
}
