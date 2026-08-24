import Dexie, { type Table } from 'dexie';

export interface OfflineArtigo {
  id: string;
  tabelaNome: string;
  numero: string;
  caput: string;
  texto: string;
  titulo?: string;
  capitulo?: string;
  rotulo?: string;
  incisos?: string[];
  paragrafos?: string[];
  ordem: number;
  ordem_numero: number;
}

export interface OfflineFavorito {
  id: string;
  tabelaNome: string;
  artigoNumero: string;
  createdAt: string;
}

export interface OfflineHighlight {
  id: string;
  artigoId: string;
  data: string; // JSON stringified
}

export interface OfflineNarracao {
  id: string;
  tabelaNome: string;
  artigoNumero: string;
  audioBlob: Blob;
}

export interface ArtigosCacheEntry {
  tabelaNome: string;
  payload: string; // JSON stringified array of ArtigoLei
  updatedAt: number;
  count: number;
}

export interface OfflineCategoryEntry {
  id: string;
  status: 'idle' | 'downloading' | 'downloaded' | 'error';
  progress: number;      // 0..100
  downloadedAt: number;  // epoch ms
  sizeBytes: number;
  tabelasCount: number;
  error?: string;
}

export interface AprenderCacheEntry {
  key: string;         // ex: area:direito-administrativo:<uid>, aula:<id>, home:<uid>
  kind: 'area' | 'aula' | 'home';
  payload: string;     // JSON stringified
  updatedAt: number;
}

export interface AprenderAssetEntry {
  url: string;         // chave = URL original
  blob: Blob;
  contentType: string;
  updatedAt: number;
}

export interface AprenderProgressoPending {
  id: string;                            // uuid local
  tipo: 'aula' | 'bloco' | 'resposta';
  payload: string;                       // JSON stringified
  createdAt: number;
  attempts: number;
}

class DrLeisDB extends Dexie {
  artigos!: Table<OfflineArtigo, string>;
  favoritos!: Table<OfflineFavorito, string>;
  highlights!: Table<OfflineHighlight, string>;
  narracoes!: Table<OfflineNarracao, string>;
  artigosCache!: Table<ArtigosCacheEntry, string>;
  offlineCategories!: Table<OfflineCategoryEntry, string>;
  aprenderCache!: Table<AprenderCacheEntry, string>;
  aprenderAssets!: Table<AprenderAssetEntry, string>;
  aprenderProgressoPending!: Table<AprenderProgressoPending, string>;
  bibliotecaColecoes!: Table<{ id: string; payload: string; updatedAt: number }, string>;

  constructor() {
    super('DrLeisDB');
    this.version(1).stores({
      artigos: 'id, tabelaNome, numero, ordem',
      favoritos: 'id, tabelaNome, artigoNumero',
      highlights: 'id, artigoId',
      narracoes: 'id, [tabelaNome+artigoNumero]',
    });
    this.version(2).stores({
      artigos: 'id, tabelaNome, numero, ordem',
      favoritos: 'id, tabelaNome, artigoNumero',
      highlights: 'id, artigoId',
      narracoes: 'id, [tabelaNome+artigoNumero]',
      artigosCache: 'tabelaNome, updatedAt',
    });
    this.version(3).stores({
      artigos: 'id, tabelaNome, numero, ordem',
      favoritos: 'id, tabelaNome, artigoNumero',
      highlights: 'id, artigoId',
      narracoes: 'id, [tabelaNome+artigoNumero]',
      artigosCache: 'tabelaNome, updatedAt',
      offlineCategories: 'id, status, downloadedAt',
    });
    this.version(4).stores({
      artigos: 'id, tabelaNome, numero, ordem',
      favoritos: 'id, tabelaNome, artigoNumero',
      highlights: 'id, artigoId',
      narracoes: 'id, [tabelaNome+artigoNumero]',
      artigosCache: 'tabelaNome, updatedAt',
      offlineCategories: 'id, status, downloadedAt',
      aprenderCache: 'key, kind, updatedAt',
      aprenderAssets: 'url, updatedAt',
      aprenderProgressoPending: 'id, tipo, createdAt',
    });
    this.version(5).stores({
      artigos: 'id, tabelaNome, numero, ordem',
      favoritos: 'id, tabelaNome, artigoNumero',
      highlights: 'id, artigoId',
      narracoes: 'id, [tabelaNome+artigoNumero]',
      artigosCache: 'tabelaNome, updatedAt',
      offlineCategories: 'id, status, downloadedAt',
      aprenderCache: 'key, kind, updatedAt',
      aprenderAssets: 'url, updatedAt',
      aprenderProgressoPending: 'id, tipo, createdAt',
      bibliotecaColecoes: 'id, updatedAt',
    });
  }
}


export const db = new DrLeisDB();

// ─────────── Biblioteca coleções (persistente, funciona offline) ───────────
export async function getPersistedColecao<T = any>(id: string): Promise<T[] | null> {
  try {
    const row = await db.bibliotecaColecoes.get(id);
    if (!row?.payload) return null;
    return JSON.parse(row.payload) as T[];
  } catch { return null; }
}

export async function setPersistedColecao(id: string, livros: any[]): Promise<void> {
  try {
    await db.bibliotecaColecoes.put({
      id,
      payload: JSON.stringify(livros),
      updatedAt: Date.now(),
    });
  } catch { /* quota */ }
}

// ─────────── Snapshot genérico de listagens (Leis Estaduais, Outras Normas, etc.) ───────────
// Reusa a tabela `bibliotecaColecoes` como store chave-valor de listagens serializáveis.
// Chaves recomendadas: `outras-normas:<tipo>`, `leis-estaduais:index`, `aprender:index`, etc.
export async function getListSnapshot<T = any>(key: string): Promise<T[] | null> {
  return getPersistedColecao<T>(`snap:${key}`);
}

export async function setListSnapshot(key: string, list: any[]): Promise<void> {
  return setPersistedColecao(`snap:${key}`, list);
}

// ─────────── Persistent list cache (stale-while-revalidate) ───────────
export async function getPersistedArtigosCache(tabelaNome: string): Promise<any[] | null> {
  try {
    const row = await db.artigosCache.get(tabelaNome);
    if (!row || !row.payload) return null;
    return JSON.parse(row.payload);
  } catch { return null; }
}

export async function setPersistedArtigosCache(tabelaNome: string, artigos: any[]): Promise<void> {
  try {
    await db.artigosCache.put({
      tabelaNome,
      payload: JSON.stringify(artigos),
      updatedAt: Date.now(),
      count: artigos.length,
    });
  } catch { /* ignore quota errors */ }
}

export async function saveArtigosOffline(tabelaNome: string, artigos: any[]) {
  const mapped: OfflineArtigo[] = artigos.map(a => ({
    id: a.id,
    tabelaNome,
    numero: a.numero,
    caput: a.caput,
    texto: a.texto || a.caput,
    titulo: a.titulo,
    capitulo: a.capitulo,
    rotulo: a.rotulo,
    incisos: a.incisos,
    paragrafos: a.paragrafos,
    ordem: a.ordem,
    ordem_numero: a.ordem_numero,
  }));
  await db.artigos.bulkPut(mapped);
}

export async function getOfflineArtigos(tabelaNome: string) {
  return db.artigos.where('tabelaNome').equals(tabelaNome).sortBy('ordem');
}

export async function isLeiDownloaded(tabelaNome: string): Promise<boolean> {
  const count = await db.artigos.where('tabelaNome').equals(tabelaNome).count();
  return count > 0;
}

// ─────────── Aprender cache (SWR persistente) ───────────
export async function getAprenderCache<T = any>(key: string): Promise<T | null> {
  try {
    const row = await db.aprenderCache.get(key);
    if (!row) return null;
    return JSON.parse(row.payload) as T;
  } catch { return null; }
}

export async function setAprenderCache(key: string, kind: 'area' | 'aula' | 'home', payload: any): Promise<void> {
  try {
    await db.aprenderCache.put({
      key,
      kind,
      payload: JSON.stringify(payload),
      updatedAt: Date.now(),
    });
  } catch { /* quota */ }
}

// ─────────── Aprender assets (imagens / áudios) ───────────
export async function getAprenderAsset(url: string): Promise<AprenderAssetEntry | null> {
  try {
    return (await db.aprenderAssets.get(url)) ?? null;
  } catch { return null; }
}

export async function putAprenderAsset(url: string, blob: Blob, contentType: string): Promise<void> {
  try {
    await db.aprenderAssets.put({ url, blob, contentType, updatedAt: Date.now() });
  } catch { /* quota */ }
}

