import type { QueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { COLECOES, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { supabase } from '@/integrations/supabase/client';
import { withBundleFallback, bundle } from '@/services/offlineBundle';

const STALE = 10 * 60 * 1000;
const LOTE = 4;
const CAPAS_POR_COLECAO = 24;

let started = false;
let inflight: Promise<void> | null = null;

/** Hidrata o React Query com o cache persistente (IndexedDB). */
async function hidratar(qc: QueryClient) {
  const { getPersistedColecao } = await import('@/services/offlineDb');
  await Promise.all(
    COLECOES.map(async (colecao) => {
      try {
        const cached = await getPersistedColecao<LivroNormalizado>(colecao.id);
        if (!cached?.length) return;
        if (!qc.getQueryData(['biblioteca-colecao', colecao.id])) {
          qc.setQueryData(['biblioteca-colecao', colecao.id], cached);
        }
      } catch {
        /* cache indisponível — segue com a rede */
      }
    }),
  );
}

/** Prefetch de todas as coleções, em lotes, gravando no cache persistente. */
async function prefetchColecoes(qc: QueryClient) {
  const { setPersistedColecao } = await import('@/services/offlineDb');
  for (let i = 0; i < COLECOES.length; i += LOTE) {
    const lote = COLECOES.slice(i, i + LOTE);
    await Promise.all(
      lote.map((colecao) =>
        qc
          .prefetchQuery({
            queryKey: ['biblioteca-colecao-top20', colecao.id],
            staleTime: STALE,
            queryFn: async () => {
              let q: any = supabase.from(colecao.table as any).select(colecao.select);
              if (colecao.orderBy) q = q.order(colecao.orderBy, { ascending: true, nullsFirst: false });
              
              const data = await withBundleFallback(
                q.limit(20).then((res: any) => {
                  if (res.error) throw res.error;
                  return res.data;
                }),
                async () => {
                  const bundleFnName = 'biblioteca' + colecao.id.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
                  if ((bundle as any)[bundleFnName]) {
                    const rows = await (bundle as any)[bundleFnName]();
                    return rows.slice(0, 20);
                  }
                  return [];
                }
              );
              
              const list = (data as any[]).map((r) => normalizeLivro(r, colecao));
              // We don't overwrite the full persisted collection with just 20 items here,
              // we just return it for the fast memory cache.
              return list;
            },
          })
          .catch(() => {}),
      ),
    );
  }
}

/** Aquece as primeiras capas de cada coleção no cache do browser/SW. */
async function aquecerCapas(qc: QueryClient) {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
  const { directImg } = await import('@/lib/cdnImg');
  COLECOES.forEach((colecao) => {
    const list = qc.getQueryData<LivroNormalizado[]>(['biblioteca-colecao', colecao.id]) || [];
    list.slice(0, CAPAS_POR_COLECAO).forEach((l) => {
      if (!l.capa) return;
      const img = new Image();
      img.decoding = 'async';
      (img as any).fetchpriority = 'high';
      img.src = directImg(l.capa, 300);
    });
  });
}

/**
 * Aquece toda a Biblioteca (listas + capas) uma única vez por sessão.
 * Desktop e mobile compartilham exatamente a mesma mecânica.
 */
export function warmBiblioteca(qc: QueryClient): Promise<void> {
  if (inflight) return inflight;
  if (started) return Promise.resolve();
  started = true;
  inflight = (async () => {
    await hidratar(qc);
    await prefetchColecoes(qc);
    await aquecerCapas(qc);
  })()
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Agenda o aquecimento em idle (com fallback por timeout). */
export function scheduleWarmBiblioteca(qc: QueryClient, delay = 300): () => void {
  if (typeof window === 'undefined') return () => {};
  const ric = (window as any).requestIdleCallback;
  if (ric) {
    const id = ric(() => warmBiblioteca(qc), { timeout: 2000 });
    return () => (window as any).cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(() => warmBiblioteca(qc), delay);
  return () => window.clearTimeout(id);
}
