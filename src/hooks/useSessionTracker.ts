import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { coletarGeo } from '@/lib/geoDispositivo';

// Registra 1 linha em `user_sessions` por abertura do app (por aba/instância).
// Append-only: permite contar quantas vezes o usuário acessou o app por dia.
export function useSessionTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const firedRef = useRef(false);
  const routeRef = useRef(location.pathname);

  useEffect(() => {
    routeRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!user || firedRef.current) return;

    // Uma sessão por instância de aba/app. sessionStorage é isolado por aba,
    // então cada nova abertura conta como um novo acesso.
    const key = `session-logged:${user.id}`;
    if (sessionStorage.getItem(key)) {
      firedRef.current = true;
      return;
    }

    firedRef.current = true;

    // Espera 2s pra não competir com o primeiro paint.
    const t = setTimeout(async () => {
      try {
        const platform = Capacitor.isNativePlatform()
          ? Capacitor.getPlatform()
          : 'web';
        const displayName =
          (user.user_metadata as any)?.display_name ??
          user.email?.split('@')[0] ??
          '';

        const geo = await coletarGeo();

        const { error } = await supabase.from('user_sessions').insert({
          pais: geo.pais,
          uf: geo.uf,
          cidade: geo.cidade,
          timezone: geo.timezone,
          locale: geo.locale,
          user_id: user.id,
          email: user.email ?? null,
          display_name: displayName,
          initial_route: routeRef.current,
          platform,
          user_agent:
            typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
        });
        if (!error) sessionStorage.setItem(key, String(Date.now()));

        // Espelha no perfil para consulta rápida no admin.
        await supabase
          .from('profiles')
          .update({
            pais: geo.pais,
            uf: geo.uf,
            cidade: geo.cidade,
            timezone: geo.timezone,
            locale: geo.locale,
          } as any)
          .eq('id', user.id);
      } catch {
        /* telemetria não deve quebrar UX */
      }
    }, 2000);

    return () => clearTimeout(t);
  }, [user]);
}
