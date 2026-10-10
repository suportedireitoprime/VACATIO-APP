import { supabase } from '@/integrations/supabase/client';

/**
 * Sincronização genérica de listas do usuário (favoritos, recentes, histórico)
 * entre localStorage (instantâneo) e Supabase (por user_id, entre dispositivos).
 *
 * Estratégia: local é a fonte de leitura síncrona; toda alteração é empurrada
 * para o Supabase com tombstones (deleted = true) e, no login/abertura,
 * puxamos o remoto e mesclamos por timestamp (last-write-wins por item).
 */

type Row = {
  escopo: string;
  item_key: string;
  payload: any;
  deleted: boolean;
  item_at: string;
  updated_at: string;
};

export type SyncedListOptions<T> = {
  /** Identificador do escopo no Supabase, ex.: "biblioteca:favoritos" */
  escopo: string;
  /** Chave usada no localStorage */
  storageKey: string;
  /** Chave estável de cada item */
  keyOf: (item: T) => string;
  /** Timestamp (ms) do item */
  atOf: (item: T) => number;
  /** Aplica um timestamp ao item (usado ao mesclar do remoto) */
  withAt?: (item: T, at: number) => T;
  /** Limite máximo de itens mantidos localmente */
  max?: number;
  /** Notificação para a UI após mudanças */
  notify?: () => void;
};

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function pushRow(escopo: string, itemKey: string, payload: any, deleted: boolean, at: number) {
  const uid = await currentUserId();
  if (!uid) return;
  try {
    await supabase.from('user_sync_items' as any).upsert(
      {
        user_id: uid,
        escopo,
        item_key: itemKey,
        payload: payload ?? {},
        deleted,
        item_at: new Date(at || Date.now()).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,escopo,item_key' },
    );
  } catch {
    /* offline: o próximo push/pull reconcilia */
  }
}

async function fetchRows(escopo: string): Promise<Row[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const { data, error } = await supabase
      .from('user_sync_items' as any)
      .select('escopo,item_key,payload,deleted,item_at,updated_at')
      .eq('user_id', uid)
      .eq('escopo', escopo)
      .order('item_at', { ascending: false })
      .limit(500);
    if (error || !data) return [];
    return data as unknown as Row[];
  } catch {
    return [];
  }
}

const pulled = new Set<string>();

export function createSyncedList<T>(opts: SyncedListOptions<T>) {
  const { escopo, storageKey, keyOf, atOf, max, notify } = opts;

  const read = (): T[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? (arr as T[]) : [];
    } catch {
      return [];
    }
  };

  const write = (list: T[]) => {
    if (typeof window === 'undefined') return;
    const sliced = max ? list.slice(0, max) : list;
    try {
      localStorage.setItem(storageKey, JSON.stringify(sliced));
    } catch {
      /* storage cheio */
    }
    notify?.();
  };

  const has = (key: string) => read().some((i) => keyOf(i) === key);

  /** Insere/atualiza item localmente e sincroniza. */
  const put = (item: T) => {
    const key = keyOf(item);
    const list = read().filter((i) => keyOf(i) !== key);
    list.unshift(item);
    write(list);
    void pushRow(escopo, key, item, false, atOf(item));
  };

  /** Remove item localmente e marca como removido no Supabase. */
  const remove = (key: string) => {
    write(read().filter((i) => keyOf(i) !== key));
    void pushRow(escopo, key, {}, true, Date.now());
  };

  const clear = () => {
    const list = read();
    write([]);
    for (const i of list) void pushRow(escopo, keyOf(i), {}, true, Date.now());
  };

  /** Baixa o remoto e mescla no local (last-write-wins por item). */
  const pull = async (force = false) => {
    if (typeof window === 'undefined') return;
    if (pulled.has(escopo) && !force) return;
    pulled.add(escopo);

    const rows = await fetchRows(escopo);
    if (!rows.length) {
      // Primeiro uso na nuvem: sobe o que já existe no aparelho.
      for (const item of read()) void pushRow(escopo, keyOf(item), item, false, atOf(item));
      return;
    }

    const local = new Map<string, T>();
    for (const i of read()) local.set(keyOf(i), i);
    const remoteKeys = new Set<string>();

    for (const row of rows) {
      remoteKeys.add(row.item_key);
      const remoteAt = new Date(row.item_at || row.updated_at).getTime();
      const existing = local.get(row.item_key);
      const localAt = existing ? atOf(existing) : 0;
      if (existing && localAt >= remoteAt) continue;
      if (row.deleted) {
        local.delete(row.item_key);
      } else if (row.payload && typeof row.payload === 'object') {
        local.set(row.item_key, row.payload as T);
      }
    }

    // Itens que só existem localmente sobem para a nuvem.
    for (const [key, item] of local) {
      if (!remoteKeys.has(key)) void pushRow(escopo, key, item, false, atOf(item));
    }

    const merged = Array.from(local.values()).sort((a, b) => atOf(b) - atOf(a));
    write(merged);
  };

  return { read, write, has, put, remove, clear, pull, escopo, storageKey };
}

/** Reseta o controle de "já puxei" (usar em login/logout). */
export function resetUserSync() {
  pulled.clear();
}

const registry: Array<{ pull: (force?: boolean) => Promise<void>; storageKey?: string }> = [];

/** Registra uma lista para ser sincronizada em bloco após o login. */
export function registerForSync<L extends { pull: (force?: boolean) => Promise<void>; storageKey?: string }>(list: L): L {
  registry.push(list);
  return list;
}

/** Puxa todas as listas registradas (chamado após login / em idle). */
export async function pullAllUserSync(force = false) {
  await Promise.all(registry.map((l) => l.pull(force).catch(() => {})));
}

const LAST_USER_KEY = 'user-sync:last-uid';

/** Limpa as listas locais (usado quando o aparelho troca de conta). */
function clearLocalLists() {
  for (const l of registry) {
    if (l.storageKey) {
      try {
        localStorage.removeItem(l.storageKey);
      } catch {
        /* ignore */
      }
    }
  }
}

// Ao entrar/trocar de conta, mescla (ou limpa, se for outro usuário) e sincroniza.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => {
    resetUserSync();
    const uid = session?.user?.id ?? null;
    if (!uid) return;
    let previous: string | null = null;
    try {
      previous = localStorage.getItem(LAST_USER_KEY);
      localStorage.setItem(LAST_USER_KEY, uid);
    } catch {
      /* ignore */
    }
    if (previous && previous !== uid) clearLocalLists();
    setTimeout(() => void pullAllUserSync(true), 0);
  });
}
