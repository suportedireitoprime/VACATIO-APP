import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';
import { COLECOES } from '@/lib/bibliotecaColecoes';
import { directImg } from '@/lib/cdnImg';

const CAPAS_DIR = 'biblioteca-capas';
const KEY_DONE = 'biblioteca-capas:done';
const KEY_INDEX = 'biblioteca-capas:index'; // JSON: { [remoteUrl]: localFileName }

type IndexMap = Record<string, string>;

let inMemoryIndex: IndexMap | null = null;
let running = false;

async function loadIndex(): Promise<IndexMap> {
  if (inMemoryIndex) return inMemoryIndex;
  const { value } = await Preferences.get({ key: KEY_INDEX });
  inMemoryIndex = value ? JSON.parse(value) : {};
  return inMemoryIndex!;
}

async function saveIndex(map: IndexMap) {
  inMemoryIndex = map;
  await Preferences.set({ key: KEY_INDEX, value: JSON.stringify(map) });
}

function safeName(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const base = clean.substring(clean.lastIndexOf('/') + 1) || 'cover';
  const hash = Math.abs(hashCode(url)).toString(36);
  const ext = (base.match(/\.(webp|jpg|jpeg|png|gif)$/i)?.[1] || 'webp').toLowerCase();
  return `${hash}.${ext}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const s = String(r.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.readAsDataURL(blob);
  });
}

async function ensureDir() {
  try {
    await Filesystem.mkdir({ path: CAPAS_DIR, directory: Directory.Data, recursive: true });
  } catch { /* já existe */ }
}

async function fileExists(name: string) {
  try {
    await Filesystem.stat({ path: `${CAPAS_DIR}/${name}`, directory: Directory.Data });
    return true;
  } catch { return false; }
}

async function downloadOne(remoteUrl: string, index: IndexMap): Promise<void> {
  if (index[remoteUrl]) {
    if (await fileExists(index[remoteUrl])) return;
  }
  const name = safeName(remoteUrl);
  const optimized = directImg(remoteUrl, 300);
  const res = await fetch(optimized);
  if (!res.ok) throw new Error(`http ${res.status}`);
  const blob = await res.blob();
  const b64 = await blobToBase64(blob);
  await Filesystem.writeFile({
    path: `${CAPAS_DIR}/${name}`,
    data: b64,
    directory: Directory.Data,
    recursive: true,
  });
  index[remoteUrl] = name;
}

/**
 * Retorna URL local (capacitor://) para uma capa se já baixada, senão null.
 * Segura para chamar em web: sempre retorna null.
 */
export async function getLocalCoverUrl(remoteUrl: string): Promise<string | null> {
  if (!remoteUrl || !Capacitor.isNativePlatform()) return null;
  try {
    const idx = await loadIndex();
    const name = idx[remoteUrl];
    if (!name) return null;
    const stat = await Filesystem.stat({ path: `${CAPAS_DIR}/${name}`, directory: Directory.Data });
    return Capacitor.convertFileSrc(stat.uri);
  } catch {
    return null;
  }
}

export interface CapasPrefetchProgress {
  done: number;
  total: number;
  status: 'idle' | 'running' | 'complete' | 'error';
  errorMsg?: string;
}

type Listener = (p: CapasPrefetchProgress) => void;
const listeners = new Set<Listener>();
let currentProgress: CapasPrefetchProgress = { done: 0, total: 0, status: 'idle' };

function emit(next: Partial<CapasPrefetchProgress>) {
  currentProgress = { ...currentProgress, ...next };
  listeners.forEach((l) => l(currentProgress));
}

export function subscribeCapasProgress(l: Listener) {
  l(currentProgress);
  listeners.add(l);
  return () => listeners.delete(l);
}

async function collectCovers(): Promise<string[]> {
  const urls = new Set<string>();
  for (const c of COLECOES) {
    const { data, error } = await supabase
      .from(c.table as any)
      .select(`${c.capaField},capa_horizontal`)
      .limit(5000);
    if (error) continue;
    for (const row of (data as any[]) || []) {
      const v = row?.[c.capaField];
      if (v && typeof v === 'string') urls.add(v);
      const h = row?.capa_horizontal;
      if (h && typeof h === 'string') urls.add(h);
    }
  }
  return Array.from(urls);
}

export async function startCapasPrefetch(opts?: { wifiOnly?: boolean }) {
  if (!Capacitor.isNativePlatform()) return;
  if (running) return;
  running = true;
  try {
    const net = await Network.getStatus();
    if (!net.connected) { running = false; return; }
    if (opts?.wifiOnly === true && net.connectionType !== 'wifi') {
      running = false; return;
    }
    await ensureDir();
    const idx = await loadIndex();
    const urls = await collectCovers();
    // Só baixa o que ainda falta — revalida sempre em busca de novas capas.
    const pending = urls.filter((u) => !idx[u]);
    const already = urls.length - pending.length;
    emit({ status: 'running', done: already, total: urls.length });

    let done = already;
    const CONC = 8;
    let i = 0;
    async function worker() {
      while (i < pending.length) {
        const url = pending[i++];
        try { await downloadOne(url, idx); } catch { /* ignore */ }
        done++;
        if (done % 8 === 0 || done === urls.length) {
          await saveIndex(idx);
          emit({ done });
        }
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    await saveIndex(idx);
    await Preferences.set({ key: KEY_DONE, value: '1' });
    emit({ status: 'complete', done: urls.length, total: urls.length });
  } catch (e: any) {
    emit({ status: 'error', errorMsg: e?.message || 'erro' });
  } finally {
    running = false;
  }
}

export async function resetCapasCache() {
  try {
    await Filesystem.rmdir({ path: CAPAS_DIR, directory: Directory.Data, recursive: true });
  } catch { /* ignore */ }
  await Preferences.remove({ key: KEY_DONE });
  await Preferences.remove({ key: KEY_INDEX });
  inMemoryIndex = null;
  emit({ status: 'idle', done: 0, total: 0 });
}
