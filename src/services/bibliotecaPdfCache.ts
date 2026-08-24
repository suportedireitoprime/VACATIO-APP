import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Cache de PDFs sob demanda para modo offline.
 * Nunca baixa automaticamente — apenas quando o usuário clicar em "Baixar para offline".
 */

const DIR = 'biblioteca-pdfs';

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function pdfFileName(url: string) {
  const clean = url.split('?')[0];
  const base = clean.substring(clean.lastIndexOf('/') + 1) || 'livro.pdf';
  const safe = base.replace(/[^\w.\-]+/g, '_');
  return `${hashCode(url).toString(36)}_${safe}`;
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

export async function isPdfCached(url: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !url) return false;
  try {
    await Filesystem.stat({ path: `${DIR}/${pdfFileName(url)}`, directory: Directory.Data });
    return true;
  } catch { return false; }
}

export async function getLocalPdfUrl(url: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || !url) return null;
  try {
    const stat = await Filesystem.stat({ path: `${DIR}/${pdfFileName(url)}`, directory: Directory.Data });
    return Capacitor.convertFileSrc(stat.uri);
  } catch { return null; }
}

export async function downloadPdf(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<string> {
  if (!Capacitor.isNativePlatform()) throw new Error('Download offline disponível apenas no app');
  try {
    await Filesystem.mkdir({ path: DIR, directory: Directory.Data, recursive: true });
  } catch { /* ok */ }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentLength = Number(res.headers.get('content-length') || 0);
  if (res.body && onProgress) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
     
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        onProgress(loaded, contentLength);
      }
    }
    const blob = new Blob(chunks as any, { type: 'application/pdf' });
    const b64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: `${DIR}/${pdfFileName(url)}`,
      data: b64,
      directory: Directory.Data,
      recursive: true,
    });
    return Capacitor.convertFileSrc(written.uri);
  } else {
    const blob = await res.blob();
    const b64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: `${DIR}/${pdfFileName(url)}`,
      data: b64,
      directory: Directory.Data,
      recursive: true,
    });
    return Capacitor.convertFileSrc(written.uri);
  }
}

export async function removePdfFromCache(url: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Filesystem.deleteFile({ path: `${DIR}/${pdfFileName(url)}`, directory: Directory.Data });
  } catch { /* ignore */ }
}

export async function listCachedPdfs(): Promise<{ name: string; uri: string; size: number }[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const res = await Filesystem.readdir({ path: DIR, directory: Directory.Data });
    const out: { name: string; uri: string; size: number }[] = [];
    for (const f of (res.files as any[]) || []) {
      try {
        const stat = await Filesystem.stat({ path: `${DIR}/${f.name || f}`, directory: Directory.Data });
        out.push({ name: f.name || f, uri: stat.uri, size: stat.size });
      } catch { /* skip */ }
    }
    return out;
  } catch { return []; }
}

export async function clearAllPdfs(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Filesystem.rmdir({ path: DIR, directory: Directory.Data, recursive: true });
  } catch { /* ignore */ }
}
