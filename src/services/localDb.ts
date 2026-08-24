// SQLite local. Nativo: @capacitor-community/sqlite. Web: mesmo plugin com
// jeep-sqlite (Web Component). API unificada — a app usa `localDb` sem se
// importar com a plataforma.
//
// Uso:
//   await localDb.ready();
//   await localDb.exec('CREATE TABLE IF NOT EXISTS notas(id INTEGER PRIMARY KEY, txt TEXT)');
//   await localDb.run('INSERT INTO notas(txt) VALUES (?)', ['ola']);
//   const rows = await localDb.query<{id:number; txt:string}>('SELECT * FROM notas');

import { Capacitor } from '@capacitor/core';

const DB_NAME = 'vacatio_local';
const DB_VERSION = 1;

let readyPromise: Promise<void> | null = null;
let db: any = null;

async function initWeb(sqlite: any): Promise<void> {
  // Registra o web component jeep-sqlite (só web)
  if (!customElements.get('jeep-sqlite')) {
    await import('jeep-sqlite/loader').then((m: any) => m.defineCustomElements(window));
  }
  const el = document.createElement('jeep-sqlite');
  document.body.appendChild(el);
  await customElements.whenDefined('jeep-sqlite');
  await sqlite.initWebStore();
}

async function boot(): Promise<void> {
  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  if (!Capacitor.isNativePlatform()) {
    await initWeb(sqlite);
  }
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
  if (isConn) {
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
  }
  await db.open();
  await runMigrations();
}

async function runMigrations(): Promise<void> {
  // Schema mínimo. Adicione tabelas aqui — as features fazem CREATE TABLE
  // IF NOT EXISTS por conta própria quando precisarem.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS kv (
      k TEXT PRIMARY KEY,
      v TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dicionario_juridico (
      termo TEXT PRIMARY KEY,
      definicao TEXT NOT NULL,
      area TEXT
    );

    CREATE TABLE IF NOT EXISTS historico_busca (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      hits INTEGER DEFAULT 1,
      last_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artigos_cache (
      id TEXT PRIMARY KEY,
      lei TEXT NOT NULL,
      numero TEXT NOT NULL,
      titulo TEXT,
      texto TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // FTS5 se disponível (nativo geralmente tem; web depende do build wasm)
  try {
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS artigos_fts USING fts5(
        titulo, texto, content='artigos_cache', content_rowid='rowid'
      );
    `);
  } catch {
    /* FTS5 indisponível — usa LIKE nas queries */
  }
}

export const localDb = {
  ready(): Promise<void> {
    if (!readyPromise) readyPromise = boot().catch((e) => {
      readyPromise = null;
      throw e;
    });
    return readyPromise;
  },

  async exec(sql: string): Promise<void> {
    await this.ready();
    await db.execute(sql);
  },

  async run(sql: string, params: any[] = []): Promise<void> {
    await this.ready();
    await db.run(sql, params);
  },

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.ready();
    const res = await db.query(sql, params);
    return (res?.values ?? []) as T[];
  },

  async setKv(key: string, value: string): Promise<void> {
    await this.run(
      'INSERT INTO kv(k,v,updated_at) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at',
      [key, value, Date.now()],
    );
  },

  async getKv(key: string): Promise<string | null> {
    const rows = (await this.query('SELECT v FROM kv WHERE k=?', [key])) as Array<{ v: string }>;
    return rows[0]?.v ?? null;
  },

  async logSearch(query: string): Promise<void> {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const existing = (await this.query(
      'SELECT id, hits FROM historico_busca WHERE query=?', [q],
    )) as Array<{ id: number; hits: number }>;
    if (existing[0]) {
      await this.run(
        'UPDATE historico_busca SET hits=?, last_at=? WHERE id=?',
        [existing[0].hits + 1, Date.now(), existing[0].id],
      );
    } else {
      await this.run(
        'INSERT INTO historico_busca(query, hits, last_at) VALUES (?, 1, ?)',
        [q, Date.now()],
      );
    }
  },

  async topSearches(limit = 10): Promise<Array<{ query: string; hits: number }>> {
    return this.query('SELECT query, hits FROM historico_busca ORDER BY hits DESC, last_at DESC LIMIT ?', [limit]);
  },

  async searchArtigos(term: string, limit = 20) {
    const like = `%${term.trim()}%`;
    try {
      return await this.query(
        `SELECT c.id, c.lei, c.numero, c.titulo, c.texto
         FROM artigos_fts JOIN artigos_cache c ON c.rowid = artigos_fts.rowid
         WHERE artigos_fts MATCH ? LIMIT ?`,
        [term, limit],
      );
    } catch {
      return this.query(
        'SELECT id, lei, numero, titulo, texto FROM artigos_cache WHERE titulo LIKE ? OR texto LIKE ? LIMIT ?',
        [like, like, limit],
      );
    }
  },
};
