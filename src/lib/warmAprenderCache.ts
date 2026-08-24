/**
 * Warm cache do Aprender: hidrata memória a partir do IndexedDB e dispara
 * prefetch em idle de todas as áreas + próximas aulas do usuário.
 * Idempotente — pode ser chamado várias vezes por sessão sem custo extra.
 */
import { supabase } from '@/integrations/supabase/client';
import { getAprenderCache, setAprenderCache } from '@/services/offlineDb';
import { hydrateAprenderAreaCache, prefetchAprenderArea } from './aprenderAreaLoader';
import { prefetchAprenderAula } from './aprenderAulaPrefetch';

let warmed = false;
let warming: Promise<void> | null = null;

function onIdle(cb: () => void, timeout = 800) {
  const ric: any =
    (typeof window !== 'undefined' && (window as any).requestIdleCallback) ||
    ((fn: any) => setTimeout(fn, timeout));
  return ric(cb, { timeout });
}

export type AprenderHomeSnapshot = {
  areas: any[];
  aulaIdsByArea: Record<string, string[]>;
  proximaAulaId: string | null;
  proxima?: any | null;
  stats?: Record<string, { totalAulas: number; concluidas: number; pct: number }>;
  totalAulas?: number;
  totalConcluidas?: number;
  updatedAt: number;
};

const HOME_KEY = (uid: string | null) => `home:${uid ?? 'anon'}`;

export async function getAprenderHomeSnapshot(uid: string | null) {
  return getAprenderCache<AprenderHomeSnapshot>(HOME_KEY(uid));
}

export async function saveAprenderHomeSnapshot(uid: string | null, snap: AprenderHomeSnapshot) {
  await setAprenderCache(HOME_KEY(uid), 'home', snap);
}

/**
 * Aquecimento leve chamado no boot do /aprender (idempotente).
 * - Pré-lê snapshots persistidos para todas as áreas conhecidas.
 * - Em idle, dispara refresh em rede.
 */
export function warmAprenderCache(uid: string | null): Promise<void> {
  if (warmed) return Promise.resolve();
  if (warming) return warming;
  warming = (async () => {
    try {
      const snap = await getAprenderHomeSnapshot(uid);
      const slugs: string[] = (snap?.areas ?? []).map((a: any) => a.slug).filter(Boolean);

      // Hidrata memória a partir do IndexedDB (não bloqueia).
      await Promise.all(slugs.map((slug) => hydrateAprenderAreaCache(slug, uid).catch(() => null)));

      // Em idle: refetch de tudo + prefetch da próxima aula pendente.
      onIdle(() => {
        slugs.forEach((slug) => prefetchAprenderArea(slug, uid));
        if (snap?.proximaAulaId) prefetchAprenderAula(snap.proximaAulaId);
      });

      warmed = true;
    } catch {
      /* noop */
    } finally {
      warming = null;
    }
  })();
  return warming;
}

/**
 * Pré-aquece TODAS as aulas de todas as áreas (chunk + dados).
 * Usar com moderação — chamar em idle após warmAprenderCache.
 */
export function prefetchAllAulas(aulaIds: string[]) {
  onIdle(() => {
    // Limita concorrência a 3 requisições em paralelo.
    let i = 0;
    const kick = () => {
      const id = aulaIds[i++];
      if (!id) return;
      prefetchAprenderAula(id).finally(kick);
    };
    for (let k = 0; k < 3; k++) kick();
  }, 1500);
}
