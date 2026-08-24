import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BLOG_POSTS } from '@/data/blogPosts';

export type BlogLeisPost = {
  id: string;
  titulo: string;
  resumo: string | null;
  imagem_url: string | null;
  imagem_thumb_url: string | null;
  categoria: string;
  autor: string | null;
  tempo_leitura_min: number | null;
  data_publicacao: string | null;
};

const CACHE_KEY = 'home_blog_posts_leis_v1';

// Posts manuais da categoria Leis (src/data/blogPosts.ts) — sempre disponíveis mesmo offline.
const STATIC_LEIS_POSTS: BlogLeisPost[] = BLOG_POSTS
  .filter((p) => p.tema === 'Leis')
  .map((p) => ({
    id: p.id,
    titulo: p.titulo,
    resumo: p.resumo,
    imagem_url: p.imagem_url,
    imagem_thumb_url: p.imagem_url,
    categoria: 'Leis',
    autor: p.autor,
    tempo_leitura_min: p.tempo_leitura_min,
    data_publicacao: p.data_publicacao,
  }));

function mergeByIdSorted(a: BlogLeisPost[], b: BlogLeisPost[]): BlogLeisPost[] {
  const map = new Map<string, BlogLeisPost>();
  [...a, ...b].forEach((p) => map.set(p.id, p));
  return Array.from(map.values()).sort((x, y) => {
    const dx = x.data_publicacao ? new Date(x.data_publicacao).getTime() : 0;
    const dy = y.data_publicacao ? new Date(y.data_publicacao).getTime() : 0;
    return dy - dx;
  });
}

export function useBlogLeisPosts() {
  const [posts, setPosts] = useState<BlogLeisPost[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return mergeByIdSorted(JSON.parse(cached) as BlogLeisPost[], STATIC_LEIS_POSTS);
    } catch { /* ignore */ }
    return STATIC_LEIS_POSTS;
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('blog_edicao_posts')
        .select('id, titulo, resumo, imagem_url, imagem_thumb_url, categoria, autor, tempo_leitura_min, data_publicacao')
        .eq('publicado', true)
        .eq('categoria', 'Leis')
        .order('data_publicacao', { ascending: false, nullsFirst: false })
        .limit(80);
      if (!mounted) return;
      if (!error && Array.isArray(data)) {
        const merged = mergeByIdSorted(data as BlogLeisPost[], STATIC_LEIS_POSTS);
        setPosts(merged);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      }
      setLoaded(true);
    })();
    return () => { mounted = false; };
  }, []);

  return { posts, loaded };
}
