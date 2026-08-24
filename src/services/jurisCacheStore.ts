// Cache SWR (stale-while-revalidate) para todas as listas de Jurisprudência.
// 3 camadas: memória (síncrona) → IndexedDB (idb-keyval) → bundle offline.
// - getMem(key): retorno síncrono; usado no useState inicial para render sem flash.
// - hydrateFromIDB(key): promove IDB → memória no boot; usado pelo warmup.
// - persist(key, rows): grava em memória + IDB.
// - onChange(key, cb): notifica consumidores quando revalida.
import { get as idbGet, set as idbSet } from 'idb-keyval';

type Rows = unknown[];

const PREFIX = 'juris:v1:';
const mem = new Map<string, Rows>();
const lastRevalidate = new Map<string, number>();
const listeners = new Map<string, Set<(rows: Rows) => void>>();

function idbKey(key: string) {
  return PREFIX + key;
}

export function getMem<T = unknown>(key: string): T[] | null {
  const v = mem.get(key);
  return v ? (v as T[]) : null;
}

export async function hydrateFromIDB<T = unknown>(key: string): Promise<T[] | null> {
  if (mem.has(key)) return mem.get(key) as T[];
  try {
    const stored = await idbGet(idbKey(key));
    if (stored && Array.isArray(stored) && stored.length > 0) {
      mem.set(key, stored);
      return stored as T[];
    }
  } catch {}
  return null;
}

export async function persist<T = unknown>(key: string, rows: T[]): Promise<void> {
  mem.set(key, rows as Rows);
  lastRevalidate.set(key, Date.now());
  try { await idbSet(idbKey(key), rows); } catch {}
  const set = listeners.get(key);
  if (set) set.forEach((cb) => { try { cb(rows as Rows); } catch {} });
}

export function shouldRevalidate(key: string, minAgeMs = 60_000): boolean {
  const last = lastRevalidate.get(key) ?? 0;
  return Date.now() - last >= minAgeMs;
}

export function markRevalidated(key: string): void {
  lastRevalidate.set(key, Date.now());
}

export function onChange<T = unknown>(key: string, cb: (rows: T[]) => void): () => void {
  let set = listeners.get(key);
  if (!set) { set = new Set(); listeners.set(key, set); }
  set.add(cb as (rows: Rows) => void);
  return () => { set!.delete(cb as (rows: Rows) => void); };
}

/** SWR runner: sync memory → async fetcher → persist. Consumer receives via onData callback. */
export async function swr<T>(
  key: string,
  fetcher: () => Promise<T[]>,
  opts?: { fallback?: () => Promise<T[]>; minAgeMs?: number },
): Promise<T[]> {
  // 1) memória
  const memHit = getMem<T>(key);
  if (memHit && memHit.length > 0) {
    // revalida em background (respeitando TTL)
    if (shouldRevalidate(key, opts?.minAgeMs)) {
      void (async () => {
        try {
          const fresh = await fetcher();
          if (fresh && fresh.length > 0) await persist(key, fresh);
          else markRevalidated(key);
        } catch { /* offline / erro — mantém cache */ }
      })();
    }
    return memHit;
  }
  // 2) IDB
  const idbHit = await hydrateFromIDB<T>(key);
  if (idbHit && idbHit.length > 0) {
    void (async () => {
      try {
        const fresh = await fetcher();
        if (fresh && fresh.length > 0) await persist(key, fresh);
        else markRevalidated(key);
      } catch {}
    })();
    return idbHit;
  }
  // 3) rede
  try {
    const fresh = await fetcher();
    if (fresh && fresh.length > 0) {
      await persist(key, fresh);
      return fresh;
    }
  } catch { /* cai no bundle */ }
  // 4) bundle offline embutido
  if (opts?.fallback) {
    try {
      const bundled = await opts.fallback();
      if (bundled && bundled.length > 0) {
        await persist(key, bundled);
        return bundled;
      }
    } catch {}
  }
  return [];
}