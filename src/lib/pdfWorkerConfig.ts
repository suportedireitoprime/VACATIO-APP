// Configuração unificada do PDF.js Worker para evitar erros de private getters / workers no Vite
// Importamos explicitamente a build legacy que é transpilada com ES5/Babel sem private getters
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

let workerConfigurado = false;

function resolveWorkerUrl(url: string, version: string): string {
  if (!url) {
    return `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (typeof window !== 'undefined' && window.location) {
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  }
  return url;
}

export function configurarPdfWorker(lib: typeof pdfjsLib = pdfjsLib) {
  if (workerConfigurado && lib?.GlobalWorkerOptions?.workerSrc) {
    return;
  }
  const version = lib.version || '3.11.174';
  try {
    const workerUrl = resolveWorkerUrl(pdfjsWorker, version);
    lib.GlobalWorkerOptions.workerSrc = workerUrl;
    workerConfigurado = true;
  } catch (err) {
    console.warn('[pdfWorkerConfig] Falha ao resolver worker local, usando fallback CDN:', err);
    lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;
    workerConfigurado = true;
  }
}

// Auto-configuração imediata na carga do módulo: garante que qualquer import direto de pdfjsLib já venha com workerSrc definido
try {
  configurarPdfWorker(pdfjsLib);
} catch (e) {
  console.warn('[pdfWorkerConfig] Falha na auto-configuração do worker:', e);
}

export function getPdfDocumentParams(buf: Uint8Array | ArrayBuffer) {
  const version = pdfjsLib.version || '3.11.174';
  return {
    data: buf instanceof Uint8Array ? buf : new Uint8Array(buf),
    cMapUrl: `https://unpkg.com/pdfjs-dist@${version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${version}/standard_fonts/`,
    isEvalSupported: true,
  };
}

// Exportar pdfjsLib do config para centralizar o import correto (legacy build) e evitar mix de versões
export { pdfjsLib };

