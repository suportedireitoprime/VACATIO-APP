import { supabase } from '@/integrations/supabase/client';
import { scheduleTrialReminder } from '@/lib/trialReminders';

export interface TrialState {
  isTrialActive: boolean;
  trialUsed: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  hoursRemaining: number;
}

const TRIAL_STORAGE_PREFIX = 'vacatio:trial:v2:';
const EVENT_NAME = 'vacatio:trial:updated';

export function getTrialStorageKey(userId?: string | null): string {
  return `${TRIAL_STORAGE_PREFIX}${userId || 'local_device'}`;
}

export function getTrialState(userId?: string | null): TrialState {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {
      isTrialActive: false,
      trialUsed: false,
      startedAt: null,
      expiresAt: null,
      hoursRemaining: 0,
    };
  }

  try {
    const key = getTrialStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Fallback: checar se havia um trial na chave genérica do dispositivo
      if (userId) {
        const fallbackRaw = localStorage.getItem(getTrialStorageKey(null));
        if (fallbackRaw) {
          const fallbackData = JSON.parse(fallbackRaw);
          // Migrar para o usuário
          localStorage.setItem(key, fallbackRaw);
          return computeState(fallbackData.startedAt, fallbackData.expiresAt, fallbackData.used);
        }
      }
      return {
        isTrialActive: false,
        trialUsed: false,
        startedAt: null,
        expiresAt: null,
        hoursRemaining: 0,
      };
    }

    const parsed = JSON.parse(raw);
    return computeState(parsed.startedAt, parsed.expiresAt, parsed.used);
  } catch (e) {
    console.warn('[trialService] Falha ao ler trial local:', e);
    return {
      isTrialActive: false,
      trialUsed: false,
      startedAt: null,
      expiresAt: null,
      hoursRemaining: 0,
    };
  }
}

function computeState(startedAt?: string | null, expiresAt?: string | null, used?: boolean): TrialState {
  if (!expiresAt) {
    return {
      isTrialActive: false,
      trialUsed: !!used,
      startedAt: null,
      expiresAt: null,
      hoursRemaining: 0,
    };
  }

  const expTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMs = expTime - now;

  if (diffMs > 0) {
    const hoursRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    return {
      isTrialActive: true,
      trialUsed: true,
      startedAt: startedAt || null,
      expiresAt,
      hoursRemaining,
    };
  }

  return {
    isTrialActive: false,
    trialUsed: true,
    startedAt: startedAt || null,
    expiresAt,
    hoursRemaining: 0,
  };
}

export async function activateTrial3Days(userId?: string | null): Promise<TrialState> {
  const current = getTrialState(userId);
  if (current.trialUsed && !current.isTrialActive) {
    // Já utilizou no passado e expirou
    return current;
  }

  const now = new Date();
  const startedAt = now.toISOString();
  // 3 dias = 72 horas exatas
  const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const payload = {
    startedAt,
    expiresAt,
    used: true,
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(getTrialStorageKey(userId), JSON.stringify(payload));
      // Salva também no dispositivo geral para evitar burlar com deslogar
      localStorage.setItem(getTrialStorageKey(null), JSON.stringify(payload));
    } catch { /* ignore */ }
  }

  // Notificar outros componentes na mesma aba/janela
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
  }

  // Sincronizar com lembretes/tabela no Supabase
  try {
    await scheduleTrialReminder('mensal');
  } catch (e) {
    console.warn('[trialService] Falha ao agendar no Supabase:', e);
  }

  return {
    isTrialActive: true,
    trialUsed: true,
    startedAt,
    expiresAt,
    hoursRemaining: 72,
  };
}

export function subscribeTrialChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}
