import { createSyncedList, registerForSync } from './userSync';

export type ResumoRef = {
  id: string;
  area: string;
  tema: string;
  subtema: string | null;
  ts: number;
};

const FAV_KEY = "resumos:favoritos";
const REC_KEY = "resumos:recentes";

const notify = () => window.dispatchEvent(new CustomEvent("resumos-local-change"));

const favList = registerForSync(
  createSyncedList<ResumoRef>({
    escopo: 'resumos:favoritos',
    storageKey: FAV_KEY,
    keyOf: (r) => r.id,
    atOf: (r) => Number(r.ts) || 0,
    notify,
  }),
);

const recList = registerForSync(
  createSyncedList<ResumoRef>({
    escopo: 'resumos:recentes',
    storageKey: REC_KEY,
    keyOf: (r) => r.id,
    atOf: (r) => Number(r.ts) || 0,
    max: 60,
    notify,
  }),
);

export const resumosLocal = {
  favoritos: () => favList.read().sort((a, b) => b.ts - a.ts),
  recentes: () => recList.read().sort((a, b) => b.ts - a.ts),

  isFavorito: (id: string) => favList.has(id),

  toggleFavorito(ref: Omit<ResumoRef, "ts">) {
    if (favList.has(ref.id)) {
      favList.remove(ref.id);
      return false;
    }
    favList.put({ ...ref, ts: Date.now() });
    return true;
  },

  registrarRecente(ref: Omit<ResumoRef, "ts">) {
    recList.put({ ...ref, ts: Date.now() });
  },

  limparRecentes: () => recList.clear(),

  /** Baixa favoritos/recentes da conta e mescla com os locais. */
  async pull(force = false) {
    await Promise.all([favList.pull(force), recList.pull(force)]);
  },
};
