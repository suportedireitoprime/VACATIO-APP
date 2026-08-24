import { useCallback, useEffect, useState } from 'react';
import type { OfflineCategoryEntry } from '@/services/offlineDb';
import {
  downloadCategory,
  removeCategory,
  getAllCategoryStatuses,
  getStorageEstimate,
  clearAllOffline,
} from '@/services/offlineDownloadService';
import { OFFLINE_CATEGORIES } from '@/data/offlineCatalog';

export function useOfflineDownload() {
  const [statuses, setStatuses] = useState<Map<string, OfflineCategoryEntry>>(new Map());
  const [estimate, setEstimate] = useState({ usage: 0, quota: 0, percent: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [s, e] = await Promise.all([getAllCategoryStatuses(), getStorageEstimate()]);
    setStatuses(s);
    setEstimate(e);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refresh();
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [refresh]);

  const download = useCallback(async (categoryId: string) => {
    // Optimistic: coloca em downloading imediatamente
    setStatuses((prev) => {
      const next = new Map(prev);
      next.set(categoryId, {
        id: categoryId,
        status: 'downloading',
        progress: 0,
        downloadedAt: 0,
        sizeBytes: 0,
        tabelasCount: 0,
      });
      return next;
    });

    try {
      const entry = await downloadCategory(categoryId, (progress) => {
        setStatuses((prev) => {
          const next = new Map(prev);
          const curr = next.get(categoryId);
          if (curr) next.set(categoryId, { ...curr, progress });
          return next;
        });
      });
      setStatuses((prev) => new Map(prev).set(categoryId, entry));
      const e = await getStorageEstimate();
      setEstimate(e);
    } catch (err) {
      setStatuses((prev) => {
        const next = new Map(prev);
        next.set(categoryId, {
          id: categoryId,
          status: 'error',
          progress: 0,
          downloadedAt: 0,
          sizeBytes: 0,
          tabelasCount: 0,
          error: err instanceof Error ? err.message : 'erro',
        });
        return next;
      });
    }
  }, []);

  const remove = useCallback(async (categoryId: string) => {
    await removeCategory(categoryId);
    setStatuses((prev) => {
      const next = new Map(prev);
      next.delete(categoryId);
      return next;
    });
    const e = await getStorageEstimate();
    setEstimate(e);
  }, []);

  const clearAll = useCallback(async () => {
    await clearAllOffline();
    setStatuses(new Map());
    const e = await getStorageEstimate();
    setEstimate(e);
  }, []);

  const totalEstimatedIfAll = OFFLINE_CATEGORIES.reduce((sum, c) => sum + c.estimatedBytes, 0);
  const totalDownloadedBytes = Array.from(statuses.values())
    .filter((s) => s.status === 'downloaded')
    .reduce((sum, s) => sum + s.sizeBytes, 0);

  return {
    statuses,
    estimate,
    loading,
    download,
    remove,
    clearAll,
    refresh,
    totalEstimatedIfAll,
    totalDownloadedBytes,
  };
}
