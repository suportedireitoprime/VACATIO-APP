import type { LivroNormalizado } from './bibliotecaColecoes';

const FAV_KEY = 'biblioteca:favoritos:v1';
const REC_KEY = 'biblioteca:recentes:v1';
const MAX_REC = 40;

export type LivroSnapshot = Pick<
  LivroNormalizado,
  'id' | 'titulo' | 'autor' | 'sobre' | 'capa' | 'link' | 'download' | 'area' | 'colecaoId'
> & { at?: number };

const livroKey = (l: { colecaoId: string; id: string | number }) => `${l.colecaoId}:${l.id}`;

function readList(key: string): LivroSnapshot[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: LivroSnapshot[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('biblioteca:tracking', { detail: { key } }));
  } catch {
    /* ignore */
  }
}

function toSnapshot(l: LivroNormalizado): LivroSnapshot {
  return {
    id: l.id,
    titulo: l.titulo,
    autor: l.autor ?? null,
    sobre: l.sobre ?? null,
    capa: l.capa ?? null,
    link: l.link ?? null,
    download: l.download ?? null,
    area: l.area ?? null,
    colecaoId: l.colecaoId,
  };
}

export function getFavoritos(): LivroSnapshot[] {
  return readList(FAV_KEY);
}

export function isFavorito(l: { colecaoId: string; id: string | number }): boolean {
  const k = livroKey(l);
  return getFavoritos().some((x) => livroKey(x) === k);
}

export function toggleFavorito(l: LivroNormalizado): boolean {
  const k = livroKey(l);
  const list = getFavoritos();
  const idx = list.findIndex((x) => livroKey(x) === k);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeList(FAV_KEY, list);
    return false;
  }
  list.unshift({ ...toSnapshot(l), at: Date.now() });
  writeList(FAV_KEY, list);
  return true;
}

export function getRecentes(): LivroSnapshot[] {
  return readList(REC_KEY);
}

export function pushRecente(l: LivroNormalizado) {
  const k = livroKey(l);
  const list = getRecentes().filter((x) => livroKey(x) !== k);
  list.unshift({ ...toSnapshot(l), at: Date.now() });
  writeList(REC_KEY, list.slice(0, MAX_REC));
}

export function subscribeTracking(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener('biblioteca:tracking', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('biblioteca:tracking', handler);
    window.removeEventListener('storage', handler);
  };
}
