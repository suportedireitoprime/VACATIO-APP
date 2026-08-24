import { useCallback, useEffect, useState } from 'react';

const READ_KEY = 'noticias_read_v1';
const FAV_KEY = 'noticias_fav_v1';

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch {}
}

// Simple pub/sub para manter várias instâncias sincronizadas
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function useReadNoticias() {
  const [read, setRead] = useState<Set<string>>(() => loadSet(READ_KEY));

  useEffect(() => {
    const l = () => setRead(new Set(loadSet(READ_KEY)));
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const isRead = useCallback((id: string) => read.has(id), [read]);
  const markRead = useCallback((id: string) => {
    const cur = loadSet(READ_KEY);
    if (cur.has(id)) return;
    cur.add(id);
    saveSet(READ_KEY, cur);
    notify();
  }, []);

  return { isRead, markRead };
}

export function useFavoritoNoticia(id: string | null | undefined) {
  const [fav, setFav] = useState<boolean>(() => (id ? loadSet(FAV_KEY).has(id) : false));

  useEffect(() => {
    setFav(id ? loadSet(FAV_KEY).has(id) : false);
  }, [id]);

  const toggle = useCallback(() => {
    if (!id) return;
    const cur = loadSet(FAV_KEY);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    saveSet(FAV_KEY, cur);
    setFav(cur.has(id));
    notify();
  }, [id]);

  return { fav, toggle };
}
