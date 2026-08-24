import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type OutrasNormasCounts = Record<string, number>;

const TIPOS = ['Lei', 'Lei Complementar', 'Decreto', 'Medida Provisória'];

export function useOutrasNormasCounts() {
  const [counts, setCounts] = useState<OutrasNormasCounts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const sinceISO = since.toISOString().slice(0, 10);
        const { data } = await supabase
          .from('resenha_diaria' as any)
          .select('tipo_ato,data_dou')
          .gte('data_dou', sinceISO)
          .limit(1000);
        const acc: OutrasNormasCounts = {};
        TIPOS.forEach((t) => (acc[t] = 0));
        (data as any[] | null)?.forEach((r) => {
          if (r.tipo_ato && acc[r.tipo_ato] !== undefined) acc[r.tipo_ato] += 1;
        });
        if (mounted) setCounts(acc);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { counts, loading };
}
