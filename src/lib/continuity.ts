/**
 * Continuity service (Fase 8 do plano de UX)
 *
 * Registra a última tela relevante que a pessoa estava usando, para que ela
 * possa "continuar de onde parou" — inclusive ao trocar de aparelho.
 *
 *  • Grava imediatamente em localStorage (instantâneo, funciona offline).
 *  • Sincroniza em segundo plano (debounced) com public.user_activity_state
 *    quando há usuário autenticado, permitindo continuidade entre mobile,
 *    tablet e desktop.
 */

import { supabase } from '@/integrations/supabase/client';

export type ContinuityKind = 'blog' | 'noticia' | 'artigo' | 'radar' | 'biblioteca' | 'other';

export interface ContinuityEntry {
  path: string;
  label: string;
  kind: ContinuityKind;
  device_hint?: string;
  updated_at: string;
}

const LS_KEY = 'continuity:last';
const IGNORE_PATHS = ['/auth', '/onboarding', '/landing', '/reset-password'];

function deviceHint(): string {
  if (typeof window === 'undefined') return 'unknown';
  const w = window.innerWidth || 0;
  if (w >= 1024) return 'desktop';
  if (w >= 768) return 'tablet';
  return 'mobile';
}

function readLocal(): ContinuityEntry | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ContinuityEntry;
  } catch {
    return null;
  }
}

function writeLocal(entry: ContinuityEntry) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entry));
  } catch {
    /* ignore quota errors */
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

async function pushRemote(entry: ContinuityEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('user_activity_state')
      .upsert({
        user_id: user.id,
        path: entry.path,
        label: entry.label,
        kind: entry.kind,
        device_hint: entry.device_hint ?? deviceHint(),
        updated_at: entry.updated_at,
      });
  } catch {
    /* remote sync is best-effort */
  }
}

export function recordActivity(input: {
  path: string;
  label: string;
  kind?: ContinuityKind;
}) {
  if (typeof window === 'undefined') return;
  if (IGNORE_PATHS.some((p) => input.path.startsWith(p))) return;
  const entry: ContinuityEntry = {
    path: input.path,
    label: input.label.trim().slice(0, 160),
    kind: input.kind ?? 'other',
    device_hint: deviceHint(),
    updated_at: new Date().toISOString(),
  };
  writeLocal(entry);
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushRemote(entry), 800);
}

export function getLocalContinuity(): ContinuityEntry | null {
  return readLocal();
}

/**
 * Busca o registro mais recente entre o local (este aparelho) e o remoto
 * (outros aparelhos). Retorna null se não houver ou se for do próprio device.
 */
export async function fetchLatestContinuity(opts: { onlyOtherDevice?: boolean } = {}): Promise<ContinuityEntry | null> {
  const local = readLocal();
  let remote: ContinuityEntry | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_activity_state')
        .select('path,label,kind,device_hint,updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        remote = {
          path: data.path,
          label: data.label,
          kind: (data.kind as ContinuityKind) ?? 'other',
          device_hint: data.device_hint ?? undefined,
          updated_at: data.updated_at,
        };
      }
    }
  } catch {
    /* offline / not logged in */
  }
  const candidates = [local, remote].filter(Boolean) as ContinuityEntry[];
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  const latest = candidates[0];
  if (opts.onlyOtherDevice && latest.device_hint === deviceHint()) return null;
  return latest;
}
