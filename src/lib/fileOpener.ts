import { Capacitor } from '@capacitor/core';
import { FileOpener } from '@capacitor-community/file-opener';
import { Filesystem, Directory } from '@capacitor/filesystem';

const isNative = () => Capacitor.isNativePlatform();

/**
 * Baixa (se necessário) e abre um PDF com o viewer nativo do sistema.
 * Em web/dev: abre em nova aba.
 *
 * @param url  URL pública do PDF
 * @param name Nome sugerido para o arquivo local (ex: "codigo-civil.pdf")
 */
export async function openPdfNative(url: string, name = 'documento.pdf'): Promise<void> {
  if (!isNative()) {
    window.open(url, '_blank', 'noopener');
    return;
  }

  try {
    // Baixa como base64 e grava em Cache/
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao baixar (${res.status})`);
    const blob = await res.blob();
    const base64 = await blobToBase64(blob);

    const safeName = name.replace(/[^\w.\-]+/g, '_');
    const written = await Filesystem.writeFile({
      path: safeName,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });

    await FileOpener.open({
      filePath: written.uri,
      contentType: 'application/pdf',
      openWithDefault: true,
    });
  } catch (e) {
    console.warn('[fileOpener] fallback web', e);
    window.open(url, '_blank', 'noopener');
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const s = String(reader.result || '');
      const idx = s.indexOf(',');
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    reader.readAsDataURL(blob);
  });
}
