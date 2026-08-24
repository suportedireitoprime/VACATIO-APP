// Cache local (localStorage) para páginas do "Meu Espaço"
// Estratégia SWR: retorna cache imediatamente e revalida em background.

const PREFIX = "pessoal_cache_v1:";

export function getCache<T = any>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCache<T = any>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}

export function clearCache(prefix?: string) {
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX + (prefix ?? ""))) localStorage.removeItem(k);
    }
  } catch {}
}
