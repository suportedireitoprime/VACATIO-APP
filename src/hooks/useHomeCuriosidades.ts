import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HomeCuriosidade = {
  id: string;
  texto: string;
  cor: string;
  imagem_url: string | null;
  imagem_path: string | null;
  prompt_imagem: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

const CACHE_KEY = 'home_curiosidades_v1';

export function useHomeCuriosidades() {
  const [items, setItems] = useState<HomeCuriosidade[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached) as HomeCuriosidade[];
    } catch { /* ignore */ }
    return [];
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('home_curiosidades')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (!mounted) return;
      if (!error && Array.isArray(data)) {
        setItems(data as HomeCuriosidade[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      }
      setLoaded(true);
    })();
    return () => { mounted = false; };
  }, []);

  return { items, loaded };
}
