// Simple localStorage-backed "leis favoritas" (favorited laws)

export type LeiFavorita = {
  tipo: string;
  leiId: string;
  nome: string;
  descricao: string;
  tabela_nome: string;
  favoritedAt: number;
};

const KEY = 'leis_favoritas_v1';
const EVT = 'leis:favoritos:changed';

export function getFavoritos(): LeiFavorita[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isFavorito(leiId: string): boolean {
  return getFavoritos().some((l) => l.leiId === leiId);
}

export function addFavorito(lei: Omit<LeiFavorita, 'favoritedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    const list = getFavoritos().filter((l) => l.leiId !== lei.leiId);
    list.unshift({ ...lei, favoritedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function removeFavorito(leiId: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = getFavoritos().filter((l) => l.leiId !== leiId);
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {}
}

export function toggleFavorito(lei: Omit<LeiFavorita, 'favoritedAt'>): boolean {
  if (isFavorito(lei.leiId)) {
    removeFavorito(lei.leiId);
    return false;
  }
  addFavorito(lei);
  return true;
}

export const LEIS_FAVORITOS_EVENT = EVT;
