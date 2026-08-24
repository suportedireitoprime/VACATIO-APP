import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

const SUPABASE_URL = 'https://iftdrbxvekrhzstayjwp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40';

export const DESKTOP_SESSION_KEY = 'vacatio.desktop_session_id';

/**
 * Watchdog para sessões desktop:
 * - a cada 30s consulta o backend.
 * - se a sessão foi revogada (outro desktop escaneou o QR) ou expirou (24h),
 *   faz signOut local e redireciona para /auth.
 */
export function useDesktopSessionGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    // Só desktop web (não nativo).
    if (Capacitor.isNativePlatform?.()) return;

    const sessionId = window.localStorage.getItem(DESKTOP_SESSION_KEY);
    if (!sessionId) return;

    let stopped = false;

    const check = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/desktop-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'session_status', session_id: sessionId }),
        });
        const j = await res.json();
        if (stopped) return;
        if (j?.status === 'revoked') {
          window.localStorage.removeItem(DESKTOP_SESSION_KEY);
          await supabase.auth.signOut();
          toast.error('Este computador foi desconectado porque outro dispositivo escaneou o QR.');
          window.location.href = '/auth';
        } else if (j?.status === 'expired' || j?.status === 'not_found') {
          window.localStorage.removeItem(DESKTOP_SESSION_KEY);
          await supabase.auth.signOut();
          toast.info('Sua sessão de 24h expirou. Escaneie o QR novamente.');
          window.location.href = '/auth';
        }
      } catch {
        /* rede — ignora */
      }
    };

    // Primeira checagem depois de 5s (evita corrida no login recente).
    const first = window.setTimeout(check, 5000);
    const interval = window.setInterval(check, 30000);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [enabled]);
}
