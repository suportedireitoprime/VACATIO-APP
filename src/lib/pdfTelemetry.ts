import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export type PdfEvent =
  | 'load_start'
  | 'load_success'
  | 'load_timeout'
  | 'load_error'
  | 'render_error'
  | 'closed'
  | 'webview_load_start'
  | 'webview_load_success'
  | 'webview_blocked'
  | 'webview_fallback_external';

interface Params {
  url: string;
  event: PdfEvent;
  livroId?: number | string | null;
  livroTitulo?: string;
  durationMs?: number;
  totalPages?: number;
  errorMessage?: string;
}

/**
 * Registra evento de leitura de PDF/WebView.
 * - Sempre loga no console (com prefixo padronizado) para debug local.
 * - Envia para `biblioteca_pdf_telemetry` no Supabase em fire-and-forget.
 */
export function logPdfEvent(p: Params): void {
  const tag = `[pdf-telemetry] ${p.event}`;
  const payload = {
    url: p.url,
    livro: p.livroTitulo,
    livroId: p.livroId,
    durationMs: p.durationMs,
    totalPages: p.totalPages,
    error: p.errorMessage,
    platform: Capacitor.getPlatform(),
    at: new Date().toISOString(),
  };
  if (p.event.includes('error') || p.event === 'load_timeout' || p.event === 'webview_blocked') {
    console.warn(tag, payload);
  } else {
    console.info(tag, payload);
  }

  // Fire-and-forget: nunca bloqueia UX
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('biblioteca_pdf_telemetry').insert({
        user_id: user?.id ?? null,
        livro_id: typeof p.livroId === 'number' ? p.livroId : null,
        livro_titulo: p.livroTitulo ?? null,
        url: p.url,
        event: p.event,
        duration_ms: p.durationMs ?? null,
        total_pages: p.totalPages ?? null,
        error_message: p.errorMessage ?? null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        platform: Capacitor.getPlatform(),
      });
    } catch (e) {
      console.warn('[pdf-telemetry] insert failed', e);
    }
  })();
}
