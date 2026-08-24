import { supabase } from '@/integrations/supabase/client';
import { getAprenderCache, setAprenderCache } from '@/services/offlineDb';
import { getAreaCover } from './areasDireitoCovers';

export type AreaRow = { id: string; nome: string; descricao: string | null; cor: string | null };
export type ModuloRow = { id: string; titulo: string; ordem: number; resumo: string | null };
export type AulaRow = {
  id: string;
  modulo_id: string;
  titulo: string;
  objetivo: string | null;
  duracao_est_min: number;
  ordem: number;
  status?: string;
};
export type ProgressoMap = Record<string, { concluida: boolean; pct: number }>;

export type AprenderAreaData = {
  area: AreaRow | null;
  modulos: ModuloRow[];
  aulas: AulaRow[];
  aulasPreparo: Record<string, number>;
  progresso: ProgressoMap;
};

const memCache = new Map<string, AprenderAreaData>();
const inflight = new Map<string, Promise<AprenderAreaData>>();

const keyFor = (slug: string, uid: string | null) => `area:${slug}:${uid ?? 'anon'}`;

export function getCachedAprenderArea(slug: string, uid: string | null) {
  return memCache.get(keyFor(slug, uid));
}

/** Hidrata memória a partir do IndexedDB (chamar cedo na app). */
export async function hydrateAprenderAreaCache(slug: string, uid: string | null) {
  const key = keyFor(slug, uid);
  if (memCache.has(key)) return memCache.get(key)!;
  const persisted = await getAprenderCache<AprenderAreaData>(key);
  if (persisted) {
    memCache.set(key, persisted);
    return persisted;
  }
  return null;
}

async function fetchAprenderAreaFromNetwork(
  slug: string,
  uid: string | null,
): Promise<AprenderAreaData> {
  const { data: a } = await supabase
    .from('aprender_areas')
    .select('id, nome, descricao, cor')
    .eq('slug', slug)
    .maybeSingle();
  if (!a) {
    return { area: null, modulos: [], aulas: [], aulasPreparo: {}, progresso: {} };
  }
  const { data: mods } = await supabase
    .from('aprender_modulos')
    .select('id, titulo, ordem, resumo')
    .eq('area_id', a.id)
    .order('ordem');
  const modIds = (mods ?? []).map((m: any) => m.id);
  let publicadas: AulaRow[] = [];
  const preparo: Record<string, number> = {};
  const progresso: ProgressoMap = {};

  if (modIds.length) {
    const { data: ausTodas } = await supabase
      .from('aprender_aulas')
      .select('id, modulo_id, titulo, objetivo, duracao_est_min, ordem, status')
      .in('modulo_id', modIds)
      .order('ordem');
    publicadas = ((ausTodas ?? []).filter((x: any) => x.status === 'published') as AulaRow[]);
    (ausTodas ?? []).forEach((x: any) => {
      if (x.status !== 'published') preparo[x.modulo_id] = (preparo[x.modulo_id] || 0) + 1;
    });

    if (uid && publicadas.length) {
      const ids = publicadas.map((x) => x.id);
      const [progRes, blocoRes] = await Promise.all([
        supabase
          .from('aprender_progresso_aula')
          .select('aula_id, concluida_em, blocos_concluidos')
          .eq('user_id', uid)
          .in('aula_id', ids),
        supabase.from('aprender_blocos').select('aula_id').in('aula_id', ids),
      ]);
      const totals: Record<string, number> = {};
      (blocoRes.data ?? []).forEach((b: any) => {
        totals[b.aula_id] = (totals[b.aula_id] || 0) + 1;
      });
      (progRes.data ?? []).forEach((p: any) => {
        const total = totals[p.aula_id] || 1;
        progresso[p.aula_id] = {
          concluida: !!p.concluida_em,
          pct: Math.min(100, Math.round(((p.blocos_concluidos || 0) / total) * 100)),
        };
      });
    }
  }

  return {
    area: a as AreaRow,
    modulos: (mods ?? []) as ModuloRow[],
    aulas: publicadas,
    aulasPreparo: preparo,
    progresso,
  };
}

/**
 * Stale-while-revalidate:
 *  - Retorna imediatamente do cache (memória → IndexedDB) se existir.
 *  - Em paralelo, refaz a query e atualiza memória + IndexedDB.
 *  - Sem cache algum: faz a rede e devolve.
 */
export async function loadAprenderArea(slug: string, uid: string | null): Promise<AprenderAreaData> {
  const key = keyFor(slug, uid);

  // 1) memória
  const mem = memCache.get(key);
  if (mem) {
    revalidateAprenderArea(slug, uid);
    return mem;
  }

  // 2) IndexedDB
  const persisted = await getAprenderCache<AprenderAreaData>(key);
  if (persisted) {
    memCache.set(key, persisted);
    revalidateAprenderArea(slug, uid);
    return persisted;
  }

  // 3) rede (com dedupe)
  const flying = inflight.get(key);
  if (flying) return flying;
  const p = (async () => {
    const result = await fetchAprenderAreaFromNetwork(slug, uid);
    memCache.set(key, result);
    setAprenderCache(key, 'area', result);
    return result;
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

/** Refetch em background — atualiza cache sem bloquear UI. */
function revalidateAprenderArea(slug: string, uid: string | null) {
  const key = keyFor(slug, uid);
  if (inflight.has(key)) return;
  const p = (async () => {
    try {
      const fresh = await fetchAprenderAreaFromNetwork(slug, uid);
      memCache.set(key, fresh);
      await setAprenderCache(key, 'area', fresh);
      return fresh;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
}

export function prefetchAprenderArea(slug: string, uid: string | null) {
  const key = keyFor(slug, uid);
  const warmCover = (areaName?: string | null) => {
    const cover = getAreaCover(areaName);
    if (cover?.cover && typeof Image !== 'undefined') {
      const img = new Image();
      img.src = cover.cover;
    }
  };

  const cached = memCache.get(key);
  if (cached) {
    warmCover(cached.area?.nome);
    revalidateAprenderArea(slug, uid);
    return;
  }

  if (inflight.has(key)) return;

  loadAprenderArea(slug, uid)
    .then((data) => warmCover(data.area?.nome))
    .catch(() => {});
}
