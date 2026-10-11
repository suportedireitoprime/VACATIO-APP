import { createStore, get, set, del, keys, entries, clear, UseStore } from 'idb-keyval';
import { Capacitor } from '@capacitor/core';
import { blobParaBase64 } from '@/lib/nativo/baixarArquivo';

/**
 * Interface dos registros de imagem no IndexedDB
 */
export interface CachedImageRecord {
  url: string;
  blob: Blob;
  mimeType: string;
  timestamp: number; // Para descarte LRU (Least Recently Used)
  size: number;
}

// Store isolado no IndexedDB para evitar qualquer colisão de chaves
let mediaStore: UseStore | null = null;
function getMediaStore(): UseStore {
  if (!mediaStore && typeof indexedDB !== 'undefined') {
    mediaStore = createStore('app-prime-media-db', 'images-cache');
  }
  return mediaStore!;
}

// Cache síncrono em memória de Object URLs ativas para retorno a 0ms
const memoryObjectUrlMap = new Map<string, string>();
const MAX_MEMORY_URLS = 50;

function enforceMemoryLimit() {
  if (memoryObjectUrlMap.size > MAX_MEMORY_URLS) {
    const oldestKey = memoryObjectUrlMap.keys().next().value;
    if (oldestKey) {
      try { URL.revokeObjectURL(memoryObjectUrlMap.get(oldestKey)!); } catch {}
      memoryObjectUrlMap.delete(oldestKey);
    }
  }
}

// Limite máximo de imagens mantidas no IndexedDB (Item 39 - LRU)
const MAX_CACHED_IMAGES = 300;
const PRUNE_BATCH = 50;

/**
 * Sanitiza a URL para chave única do cache
 */
function normalizeKey(url: string): string {
  if (!url) return '';
  // Remove query params voláteis ou assinaturas temporárias, mantendo identificador
  try {
    const parsed = new URL(url, 'https://local.app');
    return parsed.origin + parsed.pathname;
  } catch {
    return url.split('?')[0];
  }
}

/**
 * Retorna a URL de exibição (Object URL) de uma imagem armazenada offline.
 * Se já existir em memória, entrega instantaneamente em 0ms.
 * Se estiver no IndexedDB, cria a Object URL, atualiza o timestamp LRU e retorna.
 */
export async function getImageOfflineUrl(remoteUrl: string | null | undefined): Promise<string | null> {
  if (!remoteUrl || typeof window === 'undefined') return null;
  const key = normalizeKey(remoteUrl);

  // Nível 1: Memória RAM (0ms síncrono imediato)
  if (memoryObjectUrlMap.has(key)) {
    return memoryObjectUrlMap.get(key)!;
  }

  // Nível 2: IndexedDB
  try {
    const store = getMediaStore();
    if (!store) return null;

    const record = await get<CachedImageRecord>(key, store);
    if (!record) return null;
    let objectUrl = '';

    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      try {
        const { data } = await Filesystem.readFile({
          path: `img_${btoa(key).replace(/=/g,'')}.txt`,
          directory: Directory.Data
        });
        objectUrl = `data:${record.mimeType};base64,${data}`;
      } catch {
        // Fallback: file may be lost or not synced, try using indexeddb blob
        objectUrl = URL.createObjectURL(record.blob);
      }
    } else {
      objectUrl = URL.createObjectURL(record.blob);
    }
    
    memoryObjectUrlMap.set(key, objectUrl);
    enforceMemoryLimit();

    // Atualiza o timestamp de acesso (LRU) sem bloquear a execução
    const updatedRecord: CachedImageRecord = {
      ...record,
      timestamp: Date.now(),
    };
    set(key, updatedRecord, store).catch(() => {});

    return objectUrl;
  } catch (err) {
    console.warn('[imageOfflineStore] Erro ao buscar imagem do IndexedDB:', err);
    return null;
  }
}

/**
 * Salva um Blob no IndexedDB e retorna seu Object URL para uso imediato.
 */
export async function saveImageOffline(remoteUrl: string, blob: Blob): Promise<string | null> {
  if (!remoteUrl || !blob || typeof window === 'undefined') return null;
  const key = normalizeKey(remoteUrl);

  try {
    const store = getMediaStore();
    if (!store) return null;

    const record: CachedImageRecord = {
      url: remoteUrl,
      blob,
      mimeType: blob.type || 'image/webp',
      timestamp: Date.now(),
      size: blob.size,
    };

    await set(key, record, store);

    // Se já existia uma object URL antiga para esta chave, revoga para não vazar memória
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      try {
        const b64 = await blobParaBase64(blob);
        await Filesystem.writeFile({
          path: `img_${btoa(key).replace(/=/g,'')}.txt`,
          data: b64,
          directory: Directory.Data
        });
      } catch (e) {
        console.warn('Falha FS Img', e);
      }
    }

    const objectUrl = Capacitor.isNativePlatform() 
      ? `data:${record.mimeType};base64,${await blobParaBase64(blob)}`
      : URL.createObjectURL(blob);
      
    memoryObjectUrlMap.set(key, objectUrl);
    enforceMemoryLimit();

    // Verifica descarte LRU em background (Item 39)
    checkAndPruneCache().catch(() => {});

    return objectUrl;
  } catch (err) {
    console.warn('[imageOfflineStore] Erro ao salvar imagem no IndexedDB:', err);
    return null;
  }
}

/**
 * Baixa uma imagem via rede e persiste no IndexedDB de forma resiliente.
 * Respeita navigator.connection.saveData (Item 36).
 */
export async function fetchAndCacheImageOffline(remoteUrl: string): Promise<string | null> {
  if (!remoteUrl || typeof window === 'undefined') return null;

  // 1. Se já está em cache, entrega imediatamente
  const existing = await getImageOfflineUrl(remoteUrl);
  if (existing) return existing;

  // 2. Se offline, não tenta fazer fetch de rede
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  // 3. Respeita modo de economia de dados (Item 36)
  if (
    typeof navigator !== 'undefined' &&
    // @ts-expect-error NetworkInformation API experimental
    navigator.connection?.saveData === true
  ) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout seguro

    const res = await fetch(remoteUrl, {
      signal: controller.signal,
      mode: 'cors',
      cache: 'force-cache',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const blob = await res.blob();
    if (!blob || blob.size === 0) return null;

    return await saveImageOffline(remoteUrl, blob);
  } catch {
    // Falha silenciosa em caso de abort, offline ou CORS
    return null;
  }
}

/**
 * Algoritmo de descarte LRU (Least Recently Used) para evitar estouro de armazenamento
 */
async function checkAndPruneCache(): Promise<void> {
  try {
    const store = getMediaStore();
    if (!store) return;

    const allKeys = await keys(store);
    if (allKeys.length <= MAX_CACHED_IMAGES) return;

    const allEntries = await entries<string, CachedImageRecord>(store);
    // Ordena pelo timestamp mais antigo
    allEntries.sort((a, b) => (a[1]?.timestamp || 0) - (b[1]?.timestamp || 0));

    // Remove as PRUNE_BATCH mais antigas
    const toPrune = allEntries.slice(0, PRUNE_BATCH);
    for (const [k] of toPrune) {
      if (memoryObjectUrlMap.has(k)) {
        try { URL.revokeObjectURL(memoryObjectUrlMap.get(k)!); } catch {}
        memoryObjectUrlMap.delete(k);
      }
      // Filesystem cleanup if native
      if (Capacitor.isNativePlatform()) {
        try {
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          await Filesystem.deleteFile({ path: `img_${btoa(k).replace(/=/g,'')}.txt`, directory: Directory.Data });
        } catch {}
      }
      await del(k, store);
    }
  } catch (err) {
    console.warn('[imageOfflineStore] Erro no descarte LRU:', err);
  }
}

/**
 * Retorna estatísticas de uso do armazenamento offline de imagens
 */
export async function getImageCacheStats(): Promise<{ count: number; totalSizeBytes: number }> {
  try {
    const store = getMediaStore();
    if (!store) return { count: 0, totalSizeBytes: 0 };

    const allEntries = await entries<string, CachedImageRecord>(store);
    let totalSizeBytes = 0;
    for (const [, rec] of allEntries) {
      totalSizeBytes += rec?.size || rec?.blob?.size || 0;
    }
    return {
      count: allEntries.length,
      totalSizeBytes,
    };
  } catch {
    return { count: 0, totalSizeBytes: 0 };
  }
}

/**
 * Limpa todo o cache offline de imagens e revoga referências em memória
 */
export async function clearImageCache(): Promise<void> {
  try {
    // Revoga todas as object URLs em memória
    for (const [, url] of memoryObjectUrlMap) {
      try { URL.revokeObjectURL(url); } catch {}
    }
    memoryObjectUrlMap.clear();

    const store = getMediaStore();
    if (store) {
      await clear(store);
    }
  } catch (err) {
    console.warn('[imageOfflineStore] Erro ao limpar cache de imagens:', err);
  }
}

/**
 * Checa se uma imagem já reside no armazenamento offline (memória ou IndexedDB).
 */
export async function hasImageOffline(remoteUrl: string | null | undefined): Promise<boolean> {
  if (!remoteUrl) return false;
  const url = await getImageOfflineUrl(remoteUrl);
  return Boolean(url);
}

/**
 * Fase 34: Sincroniza uma lista de capas essenciais no IndexedDB em lotes ordenados.
 * Processa em lotes de 3 itens intercalados com requestIdleCallback para manter a thread UI a 120fps.
 * Respeita estado de conectividade e Save-Data. Retorna a contagem de capas armazenadas com sucesso.
 */
export async function syncEssentialCoversOffline(urls: string[]): Promise<number> {
  if (!urls || urls.length === 0 || typeof window === 'undefined') return 0;
  if (typeof navigator !== 'undefined') {
    if (!navigator.onLine) return 0;
    // @ts-expect-error NetworkInformation API experimental
    if (navigator.connection?.saveData === true) return 0;
  }

  const uniqueUrls = Array.from(new Set(urls.filter((u) => u && typeof u === 'string' && u.startsWith('http'))));
  let cachedCount = 0;
  const BATCH_SIZE = 3;

  for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + BATCH_SIZE);

    // Concede tempo para o event loop e renderização da UI
    await new Promise<void>((resolve) => {
      if ('requestIdleCallback' in window) {
        // @ts-expect-error requestIdleCallback compat
        window.requestIdleCallback(() => resolve(), { timeout: 150 });
      } else {
        setTimeout(resolve, 50);
      }
    });

    const results = await Promise.allSettled(
      batch.map((url) => fetchAndCacheImageOffline(url))
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        cachedCount++;
      }
    }
  }

  return cachedCount;
}


