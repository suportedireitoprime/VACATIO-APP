import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HeroHomeImage = {
  id: string;
  tag: string;
  prompt_used: string | null;
  storage_path: string;
  imagem_url: string;
  animation_preset: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

const CACHE_KEY = 'hero_home_images_v2';

export function useHeroHomeImages() {
  const [images, setImages] = useState<HeroHomeImage[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached) as HeroHomeImage[];
    } catch { /* ignore */ }
    return [];
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('hero_home_images')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (!mounted) return;
      if (!error && Array.isArray(data)) {
        setImages(data as HeroHomeImage[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      }
      setLoaded(true);
    })();
    return () => { mounted = false; };
  }, []);

  return { images, loaded };
}
