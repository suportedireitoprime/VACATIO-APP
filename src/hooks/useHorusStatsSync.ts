import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Dispara a sincronização de estatísticas do Horus 1x por sessão (debounced).
// Roda em background sem bloquear a UI.
export function useHorusStatsSync() {
  const { user } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!user || firedRef.current) return;
    firedRef.current = true;

    const key = `horus-stats-synced:${user.id}`;
    const last = Number(sessionStorage.getItem(key) || 0);
    const age = Date.now() - last;
    // Só sincroniza se última sync foi há mais de 30 min
    if (age < 30 * 60 * 1000) return;

    const t = setTimeout(() => {
      supabase.functions
        .invoke('horus-stats-sync', { body: { user_id: user.id } })
        .then(({ error }) => {
          if (!error) sessionStorage.setItem(key, String(Date.now()));
        })
        .catch(() => {});
    }, 4000); // Espera 4s após load pra não competir com a primeira renderização

    return () => clearTimeout(t);
  }, [user]);
}
