import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Key = 'radares' | 'boletim';

const STORAGE_KEY = 'shortcutBadges:lastSeen';

function readSeen(): Record<Key, string | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base: Record<Key, string | null> = { radares: null, boletim: null };
    if (!raw) return base;
    return { ...base, ...JSON.parse(raw) };
  } catch {
    return { radares: null, boletim: null };
  }
}

function writeSeen(seen: Record<Key, string | null>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {}
}

async function fetchCount(key: Key, since: string | null): Promise<{ count: number; latest: string | null }> {
  try {
    const table =
      key === 'radares' ? 'radar_impactos_leis' : 'boletins_juridicos';

    const client: any = supabase;
    let latestQuery = client.from(table).select('created_at').order('created_at', { ascending: false }).limit(1);
    if (key === 'radares') latestQuery = latestQuery.eq('status', 'pendente');
    const { data: latestData } = await latestQuery.maybeSingle();
    const latest = latestData?.created_at ?? null;

    let countQuery = client.from(table).select('*', { count: 'exact', head: true });
    if (key === 'radares') countQuery = countQuery.eq('status', 'pendente');
    if (since) countQuery = countQuery.gt('created_at', since);
    const { count } = await countQuery;
    return { count: count ?? 0, latest };
  } catch {
    return { count: 0, latest: null };
  }
}


export function useShortcutBadges() {
  const [counts, setCounts] = useState<Record<Key, number>>({ radares: 0, boletim: 0 });
  const [latest, setLatest] = useState<Record<Key, string | null>>({ radares: null, boletim: null });
  const [seen, setSeen] = useState<Record<Key, string | null>>(readSeen);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seenNow = readSeen();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayIso = startOfToday.toISOString();
      const threshold = (s: string | null) =>
        s && s > todayIso ? s : todayIso;
      const [r, b] = await Promise.all([
        fetchCount('radares', threshold(seenNow.radares)),
        fetchCount('boletim', threshold(seenNow.boletim)),
      ]);
      if (cancelled) return;
      setCounts({ radares: r.count, boletim: b.count });
      setLatest({ radares: r.latest, boletim: b.latest });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeen = useCallback(
    (key: Key) => {
      const next = { ...seen, [key]: new Date().toISOString() };
      setSeen(next);
      writeSeen(next);
      setCounts((c) => ({ ...c, [key]: 0 }));
    },
    [seen, latest]
  );

  return { counts, markSeen };
}
