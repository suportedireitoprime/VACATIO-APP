import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, ExternalLink, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, List } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore vite ?url import
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createPortal } from 'react-dom';
import { openPdfNative } from '@/lib/fileOpener';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { logPdfEvent } from '@/lib/pdfTelemetry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Normaliza URLs de compartilhamento comuns (Drive/Dropbox) para o
 * arquivo binário direto. Sem isso, pdf.js recebe uma página HTML
 * (viewer do Drive) e falha com "Invalid PDF structure".
 */
function normalizePdfUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Google Drive: /file/d/<id>/... ou ?id=<id>
    if (/(^|\.)drive\.google\.com$/.test(u.hostname)) {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      const id = m?.[1] || u.searchParams.get('id');
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    // Dropbox: ?dl=0 -> ?dl=1
    if (/dropbox\.com$/.test(u.hostname)) {
      u.searchParams.set('dl', '1');
      return u.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

/**
 * Em plataforma nativa (Android/iOS), a webview do Capacitor bloqueia várias
 * respostas cross-origin (CORS/redirect). Baixa via CapacitorHttp (que roda
 * fora da webview) e devolve os bytes para o pdf.js consumir.
 */
async function fetchPdfBytes(url: string): Promise<Uint8Array> {
  const res = await CapacitorHttp.get({
    url,
    responseType: 'arraybuffer',
    headers: { Accept: 'application/pdf,*/*' },
  });
  const data = res.data as any;
  if (typeof data === 'string') {
    // base64
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array((data as any).buffer);
  throw new Error('Resposta HTTP inesperada ao baixar o PDF.');
}


interface Props {
  url: string;
  titulo: string;
  onClose: () => void;
  livroId?: number | string | null;
}

const BOOKMARK_KEY = (url: string) => `pdf-reader:bookmark:${url}`;
const PAGE_KEY = (url: string) => `pdf-reader:page:${url}`;

/**
 * Leitor de PDF em scroll vertical contínuo.
 * Renderiza páginas em <canvas> conforme entram no viewport (IntersectionObserver).
 */
const PdfScrollReader = ({ url, titulo, onClose, livroId }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<any>(null);
  const renderedRef = useRef<Set<number>>(new Set());
  const startedAtRef = useRef<number>(Date.now());
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [bookmark, setBookmark] = useState<number | null>(() => {
    const v = localStorage.getItem(BOOKMARK_KEY(url));
    return v ? Number(v) : null;
  });
  const [showJumper, setShowJumper] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let timedOut = false;
    startedAtRef.current = Date.now();
    logPdfEvent({ url, event: 'load_start', livroId, livroTitulo: titulo });
    (async () => {
      try {
        const normalizedUrl = normalizePdfUrl(url);

        // No nativo, buscamos os bytes via CapacitorHttp (fora da webview)
        // e passamos { data } para o pdf.js. Isso resolve CORS, redirects do
        // Drive/Dropbox e evita o erro "Invalid PDF structure" quando o
        // servidor devolve HTML em vez do binário.
        const isNativeNow = Capacitor.isNativePlatform();
        const source: any = isNativeNow
          ? { data: await fetchPdfBytes(normalizedUrl) }
          : { url: normalizedUrl, withCredentials: false };

        const task = pdfjsLib.getDocument(source);

        // Log de progresso do download — ajuda a diagnosticar PDFs que ficam parados
        try {
          (task as any).onProgress = (p: { loaded: number; total: number }) => {
            if (p?.total) {
              console.info('[PdfScrollReader] progress', {
                url,
                pct: Math.round((p.loaded / p.total) * 100),
                loadedKb: Math.round(p.loaded / 1024),
                totalKb: Math.round(p.total / 1024),
              });
            }
          };
        } catch {}

        // Timeout de 25s — evita loading infinito quando o servidor não responde/CORS.
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = window.setTimeout(() => {
            timedOut = true;
            reject(new Error('Tempo esgotado ao carregar o PDF (25s).'));
          }, 25000);
        });
        const pdf = (await Promise.race([task.promise, timeoutPromise])) as any;
        if (timeoutId) window.clearTimeout(timeoutId);
        if (cancelled) return;
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        setLoading(false);
        logPdfEvent({
          url,
          event: 'load_success',
          livroId,
          livroTitulo: titulo,
          durationMs: Date.now() - startedAtRef.current,
          totalPages: pdf.numPages,
        });
      } catch (e: any) {
        console.error('[PdfScrollReader]', e);
        if (!cancelled) {
          setError(e?.message || 'Falha ao carregar o PDF.');
          setLoading(false);
          logPdfEvent({
            url,
            event: timedOut ? 'load_timeout' : 'load_error',
            livroId,
            livroTitulo: titulo,
            durationMs: Date.now() - startedAtRef.current,
            errorMessage: String(e?.message || e),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      pdfRef.current = null;
      renderedRef.current.clear();
    };
  }, [url, livroId, titulo]);

  useEffect(() => {
    if (loading || error || !totalPages || !containerRef.current) return;
    const container = containerRef.current;
    let observer: IntersectionObserver | null = null;
    let rafId = 0;

    // Aguarda o commit do DOM das páginas antes de observar (evita race
    // em que querySelectorAll retorna 0 páginas em devices lentos).
    rafId = requestAnimationFrame(() => {
      const pages = Array.from(container.querySelectorAll<HTMLDivElement>('[data-page]'));
      if (pages.length === 0) return;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target as HTMLDivElement;
            const idx = Number(el.dataset.page);
            if (entry.isIntersecting) {
              renderPage(idx, el);
              if (entry.intersectionRatio > 0.5) setCurrentPage(idx);
            }
          });
        },
        { root: container, rootMargin: '400px 0px', threshold: [0, 0.5] }
      );
      pages.forEach((p) => observer!.observe(p));

      // Restaura última página lida
      const savedPage = Number(localStorage.getItem(PAGE_KEY(url)) || '1');
      if (savedPage > 1 && savedPage <= totalPages) {
        requestAnimationFrame(() => scrollToPage(savedPage, 'auto'));
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [loading, error, totalPages]);

  // Persiste página atual
  useEffect(() => {
    if (currentPage > 0) localStorage.setItem(PAGE_KEY(url), String(currentPage));
  }, [currentPage, url]);

  const renderPage = async (idx: number, host: HTMLDivElement) => {
    if (renderedRef.current.has(idx)) return;
    renderedRef.current.add(idx);
    try {
      const pdf = pdfRef.current;
      if (!pdf) return;
      const page = await pdf.getPage(idx);
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const targetWidth = Math.min(containerWidth - 24, 900);
      const viewport = page.getViewport({ scale: 1 });
      const scale = (targetWidth / viewport.width) * (window.devicePixelRatio || 1);
      const finalVp = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = finalVp.width;
      canvas.height = finalVp.height;
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = 'auto';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport: finalVp, canvas } as any).promise;

      host.innerHTML = '';
      host.appendChild(canvas);
    } catch (e) {
      console.warn('[PdfScrollReader] render page', idx, e);
      renderedRef.current.delete(idx);
      logPdfEvent({
        url, event: 'render_error', livroId, livroTitulo: titulo,
        errorMessage: `page ${idx}: ${String((e as any)?.message || e)}`,
      });
    }
  };

  const scrollToPage = (idx: number, behavior: ScrollBehavior = 'smooth') => {
    const el = containerRef.current?.querySelector<HTMLDivElement>(`[data-page="${idx}"]`);
    if (el) el.scrollIntoView({ behavior, block: 'start' });
  };

  const goPrev = () => scrollToPage(Math.max(1, currentPage - 1));
  const goNext = () => scrollToPage(Math.min(totalPages, currentPage + 1));

  const toggleBookmark = () => {
    if (bookmark === currentPage) {
      setBookmark(null);
      localStorage.removeItem(BOOKMARK_KEY(url));
      toast.success('Marcador removido');
    } else {
      setBookmark(currentPage);
      localStorage.setItem(BOOKMARK_KEY(url), String(currentPage));
      toast.success(`Página ${currentPage} marcada`);
    }
  };

  const jumpToBookmark = () => {
    if (bookmark) scrollToPage(bookmark);
  };

  const openNativo = () => openPdfNative(url, `${titulo}.pdf`);

  const progress = totalPages ? (currentPage / totalPages) * 100 : 0;

  const reader = (
    <div className="fixed inset-0 z-[1300] h-[100dvh] max-h-[100dvh] bg-neutral-900 flex flex-col overflow-hidden">
      {/* Header enxuto */}
      <div
        className="flex items-center gap-3 px-4 shrink-0 bg-neutral-950/95 backdrop-blur border-b border-white/5"
        style={{
          paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 6px)',
          paddingBottom: 6,
          minHeight: 56,
        }}
      >

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <p className="flex-1 text-sm font-semibold text-white truncate">{titulo}</p>
        {isNative && (
          <button
            onClick={openNativo}
            title="Abrir no visualizador do sistema"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <ExternalLink className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Área de leitura */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-auto overscroll-contain"
          style={{ touchAction: 'pan-y pinch-zoom' }}
        >
          {loading && (
            <div className="flex flex-col items-center justify-center h-full text-white/70 gap-2">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs">Carregando PDF…</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full text-white/80 gap-3 px-6 text-center">
              <p className="text-sm">{error}</p>
              {isNative && (
                <button
                  onClick={openNativo}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
                >
                  Abrir no visualizador nativo
                </button>
              )}
            </div>
          )}
          {!loading && !error && (
            <div className="py-4 pb-44 space-y-3">
              {Array.from({ length: totalPages }).map((_, i) => (
                <div
                  key={i}
                  data-page={i + 1}
                  className="mx-auto bg-white rounded shadow-lg min-h-[400px] flex items-center justify-center"
                  style={{ maxWidth: 900 }}
                >
                  <div className="text-neutral-400 text-xs py-8">Página {i + 1}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zonas laterais de toque para navegar por página */}
        {!loading && !error && (
          <>
            <button
              type="button"
              aria-label="Página anterior"
              onClick={goPrev}
              className="absolute left-0 top-0 bottom-32 w-[18%] z-[2]"
            />
            <button
              type="button"
              aria-label="Próxima página"
              onClick={goNext}
              className="absolute right-0 top-0 bottom-32 w-[18%] z-[2]"
            />
          </>
        )}

        {/* Botão flutuante para retomar marcador */}
        {bookmark && bookmark !== currentPage && (
          <button
            onClick={jumpToBookmark}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg flex items-center gap-2 z-[3]"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            Ir para p.{bookmark}
          </button>
        )}
      </div>

      {/* Menu de rodapé */}
      {!loading && !error && totalPages > 0 && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed inset-x-0 bottom-0 z-[1310] border-t border-white/10 bg-neutral-950/95 backdrop-blur-xl shadow-2xl"
          style={{ paddingBottom: 'var(--sai-bottom,env(safe-area-inset-bottom,0px))' }}
        >
          <div className="px-5 pt-3 pb-2 flex items-center gap-3 text-[11px] text-white/70">
            <span className="tabular-nums">{currentPage} / {totalPages}</span>
            <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
              />
            </div>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>

          <div className="flex items-center justify-around px-2 pb-3 pt-1">
            <button
              onClick={goPrev}
              disabled={currentPage <= 1}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={toggleBookmark}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
              title="Marcador"
            >
              {bookmark === currentPage
                ? <BookmarkCheck className="w-[18px] h-[18px] text-primary" />
                : <Bookmark className="w-[18px] h-[18px]" />}
            </button>
            <button
              onClick={() => setShowJumper(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
              title="Ir para página"
            >
              <List className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={goNext}
              disabled={currentPage >= totalPages}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Overlay para ir a uma página específica */}
      <AnimatePresence>
        {showJumper && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJumper(false)}
              className="absolute inset-0 bg-black/60 z-[80]"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[81] bg-neutral-900 border border-white/10 rounded-2xl p-4 w-[85%] max-w-sm shadow-2xl"
            >
              <p className="text-white text-sm font-semibold mb-3">Ir para página</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget as HTMLFormElement;
                  const input = form.elements.namedItem('page') as HTMLInputElement;
                  const n = Math.max(1, Math.min(totalPages, Number(input.value) || 1));
                  scrollToPage(n);
                  setShowJumper(false);
                }}
                className="flex gap-2"
              >
                <input
                  name="page"
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={currentPage}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white text-sm outline-none border border-white/10 focus:border-primary"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                >
                  Ir
                </button>
              </form>
              <p className="text-white/70 text-[11px] mt-2">1 – {totalPages}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return typeof document === 'undefined' ? reader : createPortal(reader, document.body);
};

export default PdfScrollReader;
