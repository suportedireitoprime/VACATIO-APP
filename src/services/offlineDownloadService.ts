/**
 * Serviço de download em lote para modo offline.
 * Baixa tabelas (leis) do backend e persiste no IndexedDB via offlineDb.
 */

import { db, setPersistedArtigosCache } from '@/services/offlineDb';
import type { OfflineCategoryEntry } from '@/services/offlineDb';
import { fetchArtigosPaginado } from '@/services/legislacaoService';
import { OFFLINE_CATEGORIES, getCategoryById } from '@/data/offlineCatalog';

export type ProgressCallback = (progress: number) => void;

/** Baixa todas as tabelas de uma categoria e persiste. */
export async function downloadCategory(
  categoryId: string,
  onProgress?: ProgressCallback
): Promise<OfflineCategoryEntry> {
  const cat = getCategoryById(categoryId);
  if (!cat) throw new Error(`Categoria desconhecida: ${categoryId}`);
  if (cat.alwaysOffline) {
    const entry: OfflineCategoryEntry = {
      id: categoryId,
      status: 'downloaded',
      progress: 100,
      downloadedAt: Date.now(),
      sizeBytes: 0,
      tabelasCount: 0,
    };
    await db.offlineCategories.put(entry);
    return entry;
  }

  const tabelas = cat.getTabelas() || [];
  if (tabelas.length === 0) {
    throw new Error('Nenhuma tabela para baixar nesta categoria');
  }

  await db.offlineCategories.put({
    id: categoryId,
    status: 'downloading',
    progress: 0,
    downloadedAt: 0,
    sizeBytes: 0,
    tabelasCount: tabelas.length,
  });

  let totalBytes = 0;
  let done = 0;

  // Concurrency controlada (3 tabelas simultâneas)
  const concurrency = 3;
  let cursor = 0;
  const errors: string[] = [];

  const worker = async () => {
    while (cursor < tabelas.length) {
      const tabela = tabelas[cursor++];
      try {
        const artigos = await fetchArtigosPaginado(tabela, 0, 10000);
        if (artigos.length > 0) {
          // Persiste explicitamente no cache offline
          await setPersistedArtigosCache(tabela, artigos);
          totalBytes += JSON.stringify(artigos).length;
        }
      } catch (e) {
        errors.push(`${tabela}: ${e instanceof Error ? e.message : 'erro'}`);
      }
      done++;
      const progress = Math.round((done / tabelas.length) * 100);
      onProgress?.(progress);
      await db.offlineCategories.update(categoryId, { progress });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tabelas.length) }, () => worker())
  );

  const finalEntry: OfflineCategoryEntry = {
    id: categoryId,
    status: errors.length === tabelas.length ? 'error' : 'downloaded',
    progress: 100,
    downloadedAt: Date.now(),
    sizeBytes: totalBytes,
    tabelasCount: tabelas.length,
    error: errors.length ? errors.slice(0, 3).join('; ') : undefined,
  };
  await db.offlineCategories.put(finalEntry);
  return finalEntry;
}

/** Remove uma categoria: apaga cache das tabelas dela. */
export async function removeCategory(categoryId: string): Promise<void> {
  const cat = getCategoryById(categoryId);
  if (!cat) return;
  const tabelas = cat.getTabelas() || [];
  for (const tabela of tabelas) {
    await db.artigosCache.delete(tabela);
    await db.artigos.where('tabelaNome').equals(tabela).delete();
  }
  await db.offlineCategories.delete(categoryId);
}

/** Estado atual (todas categorias). */
export async function getAllCategoryStatuses(): Promise<Map<string, OfflineCategoryEntry>> {
  const all = await db.offlineCategories.toArray();
  return new Map(all.map((e) => [e.id, e]));
}

/** Estimativa via API do browser (mais precisa que somar tamanhos). */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percent: number;
}> {
  if (typeof navigator === 'undefined' || !('storage' in navigator) || !navigator.storage.estimate) {
    return { usage: 0, quota: 0, percent: 0 };
  }
  const est = await navigator.storage.estimate();
  const usage = est.usage || 0;
  const quota = est.quota || 0;
  return {
    usage,
    quota,
    percent: quota > 0 ? Math.round((usage / quota) * 100) : 0,
  };
}

/** Limpa todos os downloads offline. */
export async function clearAllOffline(): Promise<void> {
  await db.artigosCache.clear();
  await db.artigos.clear();
  await db.offlineCategories.clear();
}

/** Marca todas categorias baixáveis (útil para "Baixar tudo"). */
export function getDownloadableCategoryIds(): string[] {
  return OFFLINE_CATEGORIES.filter((c) => !c.alwaysOffline && !c.disabled).map((c) => c.id);
}
