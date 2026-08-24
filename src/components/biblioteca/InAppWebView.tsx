import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, RefreshCw, ExternalLink, Loader2, ShieldAlert, Copy, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { logPdfEvent } from '@/lib/pdfTelemetry';

interface InAppWebViewProps {
  url: string;
  titulo?: string;
  onClose: () => void;
  /** Se true, ao detectar bloqueio abre automaticamente no navegador externo. */
  autoFallback?: boolean;
}

/**
 * WebView interna — abre a URL dentro do app usando iframe.
 * Detecta bloqueio de embed (X-Frame-Options / CSP) e oferece fallback claro
 * (abrir no navegador do sistema + copiar link).
 */
const InAppWebView = ({ url, titulo, onClose, autoFallback = false }: InAppWebViewProps) => {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const loadedRef = useRef(false);

  // Lock scroll da página de trás
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Telemetria de abertura
  useEffect(() => {
    startedAtRef.current = Date.now();
    loadedRef.current = false;
    logPdfEvent({ url, event: 'webview_load_start', livroTitulo: titulo });
  }, [url, titulo, iframeKey]);

  // Se o iframe não carregar em 5s, tratamos como bloqueado
  useEffect(() => {
    const t = setTimeout(() => {
      if (!loadedRef.current) {
        setBlocked(true);
        setLoading(false);
        logPdfEvent({
          url,
          event: 'webview_blocked',
          livroTitulo: titulo,
          durationMs: Date.now() - startedAtRef.current,
          errorMessage: 'iframe did not signal load within 5s (likely X-Frame-Options/CSP)',
        });
        if (autoFallback) {
          openExternalFallback('auto');
        }
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [iframeKey, url, titulo, autoFallback]);

  const openExternalFallback = async (reason: 'user' | 'auto' = 'user') => {
    logPdfEvent({
      url,
      event: 'webview_fallback_external',
      livroTitulo: titulo,
      errorMessage: reason === 'auto' ? 'auto-opened after block detected' : 'user requested external',
    });
    if (Capacitor.isNativePlatform()) {
      try {
        const { InAppBrowser } = await import('@capacitor/inappbrowser');
        await InAppBrowser.openInSystemBrowser?.({ url, options: {} as any });
        return;
      } catch {}
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
        return;
      } catch {}
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const retry = () => {
    setBlocked(false);
    setLoading(true);
    setIframeKey((k) => k + 1);
  };

  return createPortal((
    <AnimatePresence>
      <motion.div
        key="webview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[1400] bg-background flex flex-col"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 h-14 border-b border-border/60 bg-background/95 backdrop-blur">
          <button
            onClick={onClose}
            aria-label="Voltar"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {titulo && (
              <p className="text-sm font-semibold truncate">{titulo}</p>
            )}
            <p className="text-[11px] text-muted-foreground truncate">{url}</p>
          </div>
          <button
            onClick={retry}
            aria-label="Recarregar"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => openExternalFallback('user')}
            aria-label="Abrir no navegador"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="relative flex-1 bg-background">
          {loading && !blocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando página…</p>
            </div>
          )}

          {blocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-background">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="text-base font-semibold">
                  Este site não permite ser aberto dentro do app
                </p>
                <p className="text-sm text-muted-foreground">
                  O servidor bloqueou a incorporação (X-Frame-Options / CSP).
                  Abra no seu navegador para ler normalmente.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
                <button
                  onClick={() => openExternalFallback('user')}
                  className="h-12 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir no navegador
                </button>
                <button
                  onClick={copyUrl}
                  className="h-11 px-5 rounded-2xl border border-border font-medium inline-flex items-center justify-center gap-2 text-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Link copiado' : 'Copiar link'}
                </button>
                <button
                  onClick={retry}
                  className="h-10 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          <iframe
            key={iframeKey}
            src={url}
            title={titulo || 'Leitor online'}
            className="w-full h-full border-0"
            onLoad={() => {
              loadedRef.current = true;
              setLoading(false);
              logPdfEvent({
                url,
                event: 'webview_load_success',
                livroTitulo: titulo,
                durationMs: Date.now() - startedAtRef.current,
              });
            }}
            allow="fullscreen; clipboard-read; clipboard-write"
            referrerPolicy="no-referrer"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  ), document.body);
};

export default InAppWebView;
