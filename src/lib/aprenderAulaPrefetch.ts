// Prefetch de dados de uma aula específica com SWR persistente (IndexedDB).
import { supabase } from '@/integrations/supabase/client';
import { prefetchRoute } from './routePrefetch';
import { getAprenderCache, setAprenderCache } from '@/services/offlineDb';

type AulaBundle = {
  aula: any;
  blocos: any[];
};

const memCache = new Map<string, AulaBundle>();
const inflight = new Map<string, Promise<AulaBundle>>();

const keyFor = (aulaId: string) => `aula:${aulaId}`;

export function getCachedAprenderAula(aulaId: string): AulaBundle | undefined {
  return memCache.get(aulaId);
}

async function fetchFromNetwork(aulaId: string): Promise<AulaBundle> {
  const [{ data: a }, { data: bs }] = await Promise.all([
    supabase.from('aprender_aulas')
      .select('id, titulo, objetivo, duracao_est_min')
      .eq('id', aulaId).maybeSingle(),
    supabase.from('aprender_blocos')
      .select('id, ordem, tipo, payload, resposta_correta')
      .eq('aula_id', aulaId).order('ordem'),
  ]);
  return { aula: a, blocos: (bs ?? []) as any[] };
}

function revalidate(aulaId: string) {
  const key = keyFor(aulaId);
  if (inflight.has(aulaId)) return;
  const p = (async () => {
    try {
      const fresh = await fetchFromNetwork(aulaId);
      memCache.set(aulaId, fresh);
      await setAprenderCache(key, 'aula', fresh);
      return fresh;
    } finally {
      inflight.delete(aulaId);
    }
  })();
  inflight.set(aulaId, p);
}

export function prefetchAprenderAula(aulaId: string): Promise<AulaBundle> {
  if (!aulaId) return Promise.resolve({ aula: null, blocos: [] });
  try { prefetchRoute('aprenderAula'); } catch { /* noop */ }

  const mem = memCache.get(aulaId);
  if (mem) { revalidate(aulaId); return Promise.resolve(mem); }

  const flying = inflight.get(aulaId);
  if (flying) return flying;

  const p = (async () => {
    // Tenta IndexedDB primeiro
    const persisted = await getAprenderCache<AulaBundle>(keyFor(aulaId));
    if (persisted) {
      memCache.set(aulaId, persisted);
      revalidate(aulaId);
      return persisted;
    }
    const fresh = await fetchFromNetwork(aulaId);
    memCache.set(aulaId, fresh);
    setAprenderCache(keyFor(aulaId), 'aula', fresh);
    return fresh;
  })();
  inflight.set(aulaId, p);
  p.finally(() => inflight.delete(aulaId));
  p.catch(() => memCache.delete(aulaId));
  return p;
}
