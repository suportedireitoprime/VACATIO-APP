import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LS_KEY = 'horus_onboarding_done_v1';

export function useHorusOnboarding() {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean>(true); // assume true until check

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fast path: localStorage
      const local = typeof window !== 'undefined' && localStorage.getItem(LS_KEY) === '1';
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setOnboarded(true); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('horus_onboarded_at')
        .eq('id', user.id)
        .maybeSingle();
      const done = Boolean((data as any)?.horus_onboarded_at) || local;
      if (!cancelled) {
        setOnboarded(done);
        setLoading(false);
        if (done && !local) localStorage.setItem(LS_KEY, '1');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const complete = useCallback(async (nome?: string) => {
    localStorage.setItem(LS_KEY, '1');
    setOnboarded(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const patch: { horus_onboarded_at: string; display_name?: string } = {
      horus_onboarded_at: new Date().toISOString(),
    };
    if (nome && nome.trim()) patch.display_name = nome.trim();
    await supabase.from('profiles').update(patch).eq('id', user.id);
    if (nome && nome.trim()) {
      // Sync nome_preferido no vínculo do WhatsApp (se já existir)
      await supabase
        .from('horus_whatsapp_users')
        .update({ nome_preferido: nome.trim() })
        .eq('user_id', user.id);
    }
  }, []);

  return { loading, onboarded, complete };
}
