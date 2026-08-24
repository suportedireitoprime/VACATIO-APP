import { useMemo } from 'react';
import Fuse from 'fuse.js';

interface FuzzySearchOptions<T> {
  keys: (keyof T | string)[];
  threshold?: number;
  limit?: number;
}

export function useFuzzySearch<T>(items: T[], query: string, options: FuzzySearchOptions<T>) {
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: options.keys as string[],
      threshold: options.threshold ?? 0.3,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [items, options.keys, options.threshold]);

  const results = useMemo(() => {
    if (!query || query.length < 2) return items;
    const fuseResults = fuse.search(query, { limit: options.limit ?? 50 });
    return fuseResults.map(r => r.item);
  }, [fuse, query, items, options.limit]);

  return results;
}
