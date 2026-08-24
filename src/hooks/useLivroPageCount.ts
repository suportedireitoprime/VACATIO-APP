import { useEffect, useState } from 'react';

// Cache em memória por URL para evitar re-fetch dentro da mesma sessão.
const cache = new Map<string, number>();
const inflight = new Map<string, Promise<number | null>>();

/**
 * Lê o número total de páginas de um PDF sob demanda (lazy).
 * O carregamento de pdfjs é dinâmico para não pesar no bundle inicial.
 */
export function useLivroPageCount(url: string | null | undefined) {
  const [numPages, setNumPages] = useState<number | null>(() => (url && cache.has(url) ? cache.get(url)! : null));

  useEffect(() => {
    if (!url) { setNumPages(null); return; }
    if (cache.has(url)) { setNumPages(cache.get(url)!); return; }

    let cancelled = false;

    const run = async () => {
      let promise = inflight.get(url);
      if (!promise) {
        promise = (async () => {
          try {
            const pdfjsLib: any = await import('pdfjs-dist');
            const workerMod: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
            if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = workerMod.default;
            }
            const task = pdfjsLib.getDocument({ url, withCredentials: false });
            const pdf = await task.promise;
            const n = pdf.numPages || 0;
            cache.set(url, n);
            // Libera recursos
            try { pdf.destroy?.(); } catch { /* noop */ }
            return n;
          } catch {
            return null;
          }
        })();
        inflight.set(url, promise);
      }

      const result = await promise;
      inflight.delete(url);
      if (!cancelled) setNumPages(result);
    };

    run();
    return () => { cancelled = true; };
  }, [url]);

  return numPages;
}
