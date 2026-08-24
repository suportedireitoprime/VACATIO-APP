import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'app-usage-seconds';
const DAILY_GOAL_SEC = 60 * 60; // 1 hora/dia

interface Store {
  day: string; // YYYY-MM-DD
  todaySec: number;
  totalSec: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (parsed.day !== today()) {
        return { day: today(), todaySec: 0, totalSec: parsed.totalSec || 0 };
      }
      return parsed;
    }
  } catch {}
  return { day: today(), todaySec: 0, totalSec: 0 };
}

function writeStore(s: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/**
 * Conta segundos de uso ativo do app (aba visível). Persiste em localStorage
 * por dia e cumulativo. Retorna também um progresso vs. meta diária (1h).
 */
export function useAppUsageTime() {
  const [store, setStore] = useState<Store>(() => readStore());

  useEffect(() => {
    let last = Date.now();
    let visible = typeof document !== 'undefined' ? !document.hidden : true;

    const tick = () => {
      if (!visible) {
        last = Date.now();
        return;
      }
      const now = Date.now();
      const delta = Math.min(30, Math.floor((now - last) / 1000));
      last = now;
      if (delta <= 0) return;
      setStore(prev => {
        const base = prev.day !== today() ? { day: today(), todaySec: 0, totalSec: prev.totalSec } : prev;
        const next = { day: base.day, todaySec: base.todaySec + delta, totalSec: base.totalSec + delta };
        writeStore(next);
        return next;
      });
    };

    const interval = setInterval(tick, 10_000);
    const onVis = () => {
      visible = !document.hidden;
      last = Date.now();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const format = useCallback((sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m} min`;
    return `${sec}s`;
  }, []);

  const pctToday = Math.min(100, Math.round((store.todaySec / DAILY_GOAL_SEC) * 100));

  return {
    todaySec: store.todaySec,
    totalSec: store.totalSec,
    dailyGoalSec: DAILY_GOAL_SEC,
    pctToday,
    formattedToday: format(store.todaySec),
    formattedTotal: format(store.totalSec),
  };
}
