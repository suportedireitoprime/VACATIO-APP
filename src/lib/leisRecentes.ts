// Simple localStorage-backed "leis recentes" (recent laws opened by the user)

export type LeiRecente = {
  tipo: string;
  leiId: string;
  nome: string;
  descricao: string;
  tabela_nome: string;
  openedAt: number;
};

const KEY = 'leis_recentes_v1';
const MAX = 20;

export function getRecentes(): LeiRecente[] {
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

export function pushRecente(lei: Omit<LeiRecente, 'openedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    const list = getRecentes().filter((l) => l.leiId !== lei.leiId);
    list.unshift({ ...lei, openedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

export function clearRecentes() {
  try { localStorage.removeItem(KEY); } catch {}
}

// ---- Popularidade de busca (leis mais procuradas) ----
const POP_KEY = 'leis_populares_v1';

type PopMap = Record<string, number>;

function readPop(): PopMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(POP_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

export function bumpLeiSearch(leiId: string) {
  if (typeof window === 'undefined' || !leiId) return;
  try {
    const map = readPop();
    map[leiId] = (map[leiId] || 0) + 1;
    localStorage.setItem(POP_KEY, JSON.stringify(map));
  } catch {}
}

/** Retorna leiIds ordenados por popularidade (desc). */
export function getPopularLeiIds(): string[] {
  const map = readPop();
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

