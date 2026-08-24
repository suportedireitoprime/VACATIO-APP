/**
 * Cache da Temática Jurídica — memória → IndexedDB → rede.
 * Mesma mecânica das Videoaulas: leitura síncrona para render instantâneo,
 * revalidação só quando passa do TTL e hidratação em idle no boot.
 */
import { supabase } from '@/integrations/supabase/client';
import { getAprenderCacheEntry, setAprenderCache } from '@/services/offlineDb';

export type ObraCache = Record<string, any> & { id: string; destaque?: boolean };
export type RankingCache = Record<string, any> & { obra_id: string };

const TTL_OBRAS = 12 * 60 * 60 * 1000;
const TTL_RANKING = 10 * 60 * 1000;
const TTL_FAVORITOS = 5 * 60 * 1000;

const OBRAS_KEY = 'tematica:obras';
const RANKING_KEY = 'tematica:ranking';
const FAV_KEY = 'tematica:favoritos';

let memObras: ObraCache[] | null = null;
let memObrasAt = 0;
let memRanking: RankingCache[] | null = null;
let memRankingAt = 0;
let memFavoritos: string[] | null = null;
let memFavoritosAt = 0;

const inflight = new Map<string, Promise<any>>();
const fresco = (at: number, ttl: number) => at > 0 && Date.now() - at < ttl;

function onIdle(cb: () => void, timeout = 800) {
  const ric: any =
    (typeof window !== 'undefined' && (window as any).requestIdleCallback) ||
    ((fn: any) => setTimeout(fn, timeout));
  return ric(cb, { timeout });
}

function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const flying = inflight.get(key) as Promise<T> | undefined;
  if (flying) return flying;
  const p = run().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeTematica(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notificar() {
  listeners.forEach((l) => {
    try { l(); } catch { /* noop */ }
  });
}

/* ------------------------------------------------------------------ obras */

export function getCachedObras(): ObraCache[] | null {
  return memObras;
}

export async function loadObras(): Promise<ObraCache[]> {
  if (memObras && fresco(memObrasAt, TTL_OBRAS)) return memObras;
  return dedupe(OBRAS_KEY, async () => {
    let list: ObraCache[] = [];
    try {
      const { data } = await supabase
        .from('tematica_juridica_obras')
        .select('*')
        .eq('ativo', true)
        .order('destaque', { ascending: false })
        .order('ordem', { ascending: true });
      list = ((data ?? []) as unknown) as ObraCache[];
    } catch { /* offline */ }
    if (list.length === 0) {
      try {
        const { bundle } = await import('@/services/offlineBundle');
        list = ((await bundle.tematicaObras<ObraCache>()) ?? []) as ObraCache[];
      } catch { /* noop */ }
    }
    if (list.length) {
      memObras = list;
      memObrasAt = Date.now();
      void setAprenderCache(OBRAS_KEY, 'home', list).catch(() => {});
      notificar();
    }
    return memObras ?? [];
  });
}

/* ---------------------------------------------------------------- ranking */

export function getCachedRanking(): RankingCache[] | null {
  return memRanking;
}

export async function loadRanking(
  buscar: (dias: number) => Promise<RankingCache[]>,
): Promise<RankingCache[]> {
  if (memRanking && fresco(memRankingAt, TTL_RANKING)) return memRanking;
  return dedupe(RANKING_KEY, async () => {
    try {
      const rows = (await buscar(7)) ?? [];
      memRanking = rows;
      memRankingAt = Date.now();
      void setAprenderCache(RANKING_KEY, 'home', rows).catch(() => {});
      notificar();
    } catch { /* noop */ }
    return memRanking ?? [];
  });
}

/* -------------------------------------------------------------- favoritos */

export function getCachedFavoritosTematica(): string[] | null {
  return memFavoritos;
}

export async function loadFavoritosTematica(): Promise<string[]> {
  if (memFavoritos && fresco(memFavoritosAt, TTL_FAVORITOS)) return memFavoritos;
  return dedupe(FAV_KEY, async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const uid = user.user?.id;
      if (!uid) return memFavoritos ?? [];
      const { data } = await supabase
        .from('tematica_favoritos')
        .select('obra_id')
        .eq('user_id', uid);
      const ids = (data ?? []).map((f: any) => f.obra_id as string);
      memFavoritos = ids;
      memFavoritosAt = Date.now();
      void setAprenderCache(FAV_KEY, 'home', ids).catch(() => {});
      notificar();
    } catch { /* noop */ }
    return memFavoritos ?? [];
  });
}

export function setFavoritosTematicaLocal(ids: string[]) {
  memFavoritos = ids;
  memFavoritosAt = Date.now();
  void setAprenderCache(FAV_KEY, 'home', ids).catch(() => {});
}

/* ----------------------------------------------------------------- warmup */

let hidratado = false;

/** Sobe o cache do IndexedDB para a memória (sem rede) logo no boot. */
export function hydrateTematicaCache() {
  if (hidratado || typeof window === 'undefined') return;
  hidratado = true;
  onIdle(() => {
    void getAprenderCacheEntry<ObraCache[]>(OBRAS_KEY)
      .then((e) => {
        if (!e?.payload?.length || memObras) return;
        memObras = e.payload;
        memObrasAt = e.updatedAt;
        notificar();
      })
      .catch(() => {});
    void getAprenderCacheEntry<RankingCache[]>(RANKING_KEY)
      .then((e) => {
        if (!e?.payload || memRanking) return;
        memRanking = e.payload;
        memRankingAt = e.updatedAt;
        notificar();
      })
      .catch(() => {});
    void getAprenderCacheEntry<string[]>(FAV_KEY)
      .then((e) => {
        if (!e?.payload || memFavoritos) return;
        memFavoritos = e.payload;
        memFavoritosAt = e.updatedAt;
        notificar();
      })
      .catch(() => {});
  }, 1500);
}

let warmed = false;

/** Aquece dados que não estão frescos — sempre depois do primeiro paint. */
export function warmTematicaCache() {
  if (warmed) return;
  warmed = true;
  onIdle(() => {
    void loadObras().catch(() => {});
    void loadFavoritosTematica().catch(() => {});
  }, 2000);
}

export function prefetchTematica() {
  void loadObras().catch(() => {});
}
