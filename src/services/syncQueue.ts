// Fila de sincronização offline. Enfileira mutações Supabase (update/delete/insert)
// quando o usuário está offline e reenvia assim que a rede volta.
//
// Uso:
//   await syncQueue.enqueue({ kind: 'table.update', table: 'profiles', match: { id }, values: { bio } });
//   await syncQueue.enqueue({ kind: 'table.delete', table: 'audio_recordings', match: { id } });
//
// O worker é iniciado em `startSyncQueueWorker()` (chamado no bootstrap).

import { supabase } from '@/integrations/supabase/client';
import { localDb } from './localDb';

export type SyncOp =
  | { kind: 'table.update'; table: string; match: Record<string, any>; values: Record<string, any> }
  | { kind: 'table.delete'; table: string; match: Record<string, any> }
  | { kind: 'table.insert'; table: string; values: Record<string, any> };

interface QueueRow {
  id: number;
  payload: string;
  retries: number;
  created_at: number;
}

async function ensureTable() {
  await localDb.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

async function applyOp(op: SyncOp): Promise<{ ok: true } | { ok: false; error: string; permanent?: boolean }> {
  try {
    let error: any = null;
    if (op.kind === 'table.update') {
      let q = (supabase as any).from(op.table).update(op.values);
      for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v);
      ({ error } = await q);
    } else if (op.kind === 'table.delete') {
      let q = (supabase as any).from(op.table).delete();
      for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v);
      ({ error } = await q);
    } else if (op.kind === 'table.insert') {
      ({ error } = await (supabase as any).from(op.table).insert(op.values));
    }
    if (error) {
      // Erros 4xx são permanentes (RLS, validação). Erros de rede: retry.
      const msg = String(error?.message ?? error);
      const permanent = /permission|violates|invalid|constraint|not found/i.test(msg);
      return { ok: false, error: msg, permanent };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

let flushing = false;
let started = false;

export const syncQueue = {
  async enqueue(op: SyncOp): Promise<void> {
    await ensureTable();
    await localDb.run(
      'INSERT INTO sync_queue(payload, retries, created_at) VALUES(?, 0, ?)',
      [JSON.stringify(op), Date.now()],
    );
    // Tenta drenar imediatamente se estiver online.
    if (isOnline()) void this.flush();
  },

  async size(): Promise<number> {
    try {
      await ensureTable();
      const rows = await localDb.query<{ n: number }>('SELECT COUNT(*) as n FROM sync_queue');
      return rows[0]?.n ?? 0;
    } catch { return 0; }
  },

  async flush(): Promise<void> {
    if (flushing || !isOnline()) return;
    flushing = true;
    try {
      await ensureTable();
      // Processa em batches pequenos para não travar.
      // Descarta itens com >5 falhas ou erro permanente.
      while (isOnline()) {
        const rows = await localDb.query<QueueRow>(
          'SELECT id, payload, retries, created_at FROM sync_queue ORDER BY id ASC LIMIT 20',
        );
        if (rows.length === 0) break;
        for (const row of rows) {
          let op: SyncOp;
          try { op = JSON.parse(row.payload); }
          catch { await localDb.run('DELETE FROM sync_queue WHERE id=?', [row.id]); continue; }
          const res = await applyOp(op);
          if (res.ok) {
            await localDb.run('DELETE FROM sync_queue WHERE id=?', [row.id]);
          } else if ((res as any).permanent || row.retries >= 5) {
            // Descarta silenciosamente — evita loop infinito
            await localDb.run('DELETE FROM sync_queue WHERE id=?', [row.id]);
          } else {
            await localDb.run('UPDATE sync_queue SET retries=? WHERE id=?', [row.retries + 1, row.id]);
            // Aguarda um pouco antes de continuar
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      }
    } finally {
      flushing = false;
    }
  },
};

export function startSyncQueueWorker(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', () => { void syncQueue.flush(); });
  // Tenta drenar no boot (caso o app tenha sido fechado com fila cheia).
  setTimeout(() => { void syncQueue.flush(); }, 2500);
}