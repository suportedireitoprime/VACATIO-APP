import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SugestaoBusca {
  termo_display: string;
  top_title: string | null;
  top_subtitle: string | null;
  top_thumb_url: string | null;
  top_route: string | null;
  top_entity_type: string | null;
  clicks: number;
  hits: number;
}

export function useSugestoesBusca(prefix: string, enabled = true) {
  const [sugestoes, setSugestoes] = useState<SugestaoBusca[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = prefix.trim();
    if (!enabled || p.length < 2) {
      setSugestoes([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase.rpc('sugerir_busca', { _prefix: p, _limit: 6 });
      if (!cancelled) {
        setSugestoes((data as SugestaoBusca[]) || []);
        setLoading(false);
      }
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [prefix, enabled]);

  return { sugestoes, loading };
}

export async function registrarBuscaClick(termo: string, item: {
  entity_type: string;
  entity_id: string;
  entity_table?: string | null;
  title?: string | null;
  subtitle?: string | null;
  thumb_url?: string | null;
  route: string;
}) {
  try {
    await supabase.rpc('registrar_busca_click', {
      _termo: termo,
      _entity_type: item.entity_type,
      _entity_id: item.entity_id,
      _entity_table: item.entity_table ?? null,
      _title: item.title ?? null,
      _subtitle: item.subtitle ?? null,
      _thumb_url: item.thumb_url ?? null,
      _route: item.route,
    });
  } catch {
    /* silencioso */
  }
}
