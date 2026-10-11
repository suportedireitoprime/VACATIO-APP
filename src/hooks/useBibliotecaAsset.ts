import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getLocalCoverUrl } from '@/services/bibliotecaCapasPrefetch';
import { directImg } from '@/lib/cdnImg';
import { getImageOfflineUrl, fetchAndCacheImageOffline } from '@/services/imageOfflineStore';

// Cache in-memory do manifest de capas nativas exportadas
let offlineCoversManifest: Record<string, string> | null = null;
let manifestPromise: Promise<void> | null = null;

export async function getOfflineCover(remoteUrl: string): Promise<string | null> {
  if (!remoteUrl) return null;
  if (!offlineCoversManifest) {
    if (!manifestPromise) {
      manifestPromise = fetch('/offline-covers/manifest.json')
        .then((res) => res.json())
        .then((data) => { offlineCoversManifest = data; })
        .catch(() => { offlineCoversManifest = {}; });
    }
    await manifestPromise;
  }
  const filename = offlineCoversManifest?.[remoteUrl];
  if (filename) return `/offline-covers/${filename}`;
  return null;
}

// Cache síncrono em memória de capas já resolvidas para evitar recarregamento/piscar (0ms)
export const resolvedCoversCache = new Map<string, string>();

/**
 * Retorna URL local (filesystem nativo, bundle local ou IndexedDB) da capa se já baixada,
 * ou a URL CDN otimizada em web/desktop.
 * Utiliza arquitetura em 5 camadas com renderização imediata (0ms) e persistência offline.
 */
export function useBibliotecaCapa(remoteUrl: string | null | undefined, width = 300): string {
  const cdn = remoteUrl ? directImg(remoteUrl, width) : '';
  const cached = remoteUrl ? resolvedCoversCache.get(remoteUrl) || null : null;
  const [local, setLocal] = useState<string | null>(cached);

  useEffect(() => {
    let cancelled = false;
    if (!remoteUrl) { setLocal(null); return; }
    
    // Se já estiver no cache síncrono em memória, não precisa buscar novamente
    if (resolvedCoversCache.has(remoteUrl)) {
      setLocal(resolvedCoversCache.get(remoteUrl)!);
      return;
    }

    (async () => {
      // 1. Tenta carregar do bundle offline nativo (se presente em /offline-covers/)
      const bundled = await getOfflineCover(remoteUrl);
      if (bundled) {
        resolvedCoversCache.set(remoteUrl, bundled);
        if (!cancelled) setLocal(bundled);
        return;
      }
      
      // 2. Tenta carregar do cache dinâmico do Capacitor (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        const url = await getLocalCoverUrl(remoteUrl);
        if (url) {
          resolvedCoversCache.set(remoteUrl, url);
          if (!cancelled) setLocal(url);
          return;
        }
      } else {
        // 3. Em Web / Desktop / PWA: Tenta recuperar do IndexedDB
        const idbUrl = await getImageOfflineUrl(remoteUrl);
        if (idbUrl) {
          resolvedCoversCache.set(remoteUrl, idbUrl);
          if (!cancelled) setLocal(idbUrl);
          return;
        }
      }

      // 4. Se online, pré-carrega na memória do navegador e sincroniza em background no IndexedDB
      if (cdn && typeof window !== 'undefined') {
        const img = new Image();
        img.src = cdn;
        resolvedCoversCache.set(remoteUrl, cdn);
        if (!cancelled) setLocal(cdn);

        // Em Web/PWA, persiste no IndexedDB silenciosamente para a próxima visita ser 100% offline
        if (!Capacitor.isNativePlatform() && typeof navigator !== 'undefined' && navigator.onLine) {
          fetchAndCacheImageOffline(cdn).catch(() => {});
        }
      }
    })();

    return () => { cancelled = true; };
  }, [remoteUrl, cdn]);

  return local || cached || cdn;
}
