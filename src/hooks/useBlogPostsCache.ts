/**
 * Cache stale-while-revalidate dos posts do blog no localStorage.
 * — 1ª visita: fetch normal, popula cache.
 * — Visitas seguintes (24 h): hidrata sincronamente e revalida em background.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BlogPost, BlogTema } from '@/data/blogPosts';
import { TEMAS } from '@/data/blogPosts';
import { bundle } from '@/services/offlineBundle';

const KEY = 'blog:posts:v2';
const LEGACY_KEYS = ['blog:posts:v1'];
const TTL_MS = 24 * 60 * 60 * 1000; // 24 h

const LISTA_COLS =
  'id, titulo, resumo, imagem_url, categoria, autor, tempo_leitura_min, data_publicacao, created_at';

type RawPost = {
  id: string;
  titulo: string;
  resumo: string;
  conteudo_md?: string;
  imagem_url: string;
  categoria: string;
  autor: string;
  tempo_leitura_min: number;
  data_publicacao: string;
  created_at: string;
};

type Cached = { at: number; posts: BlogPost[] };

function map(rows: RawPost[]): BlogPost[] {
  return rows.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    resumo: p.resumo,
    conteudo_md: p.conteudo_md ?? '',
    imagem_url: p.imagem_url,
    tema: (TEMAS.includes(p.categoria as BlogTema) ? p.categoria : 'Curiosidades') as BlogTema,
    autor: p.autor,
    tempo_leitura_min: p.tempo_leitura_min,
    data_publicacao: p.data_publicacao,
  }));
}

function readCache(): BlogPost[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.posts || !Array.isArray(parsed.posts)) return null;
    // Aceitamos até TTL para tela; refresh sempre roda em background de qualquer forma.
    if (Date.now() - parsed.at > TTL_MS) return parsed.posts; // ainda hidrata, marca stale
    return parsed.posts;
  } catch {
    return null;
  }
}

function writeCache(posts: BlogPost[]) {
  try {
    // Cache só da lista (sem o markdown completo): mantém o payload pequeno e
    // evita estourar a quota do localStorage — era o que fazia o cache falhar
    // e a tela recarregar tudo do zero a cada abertura.
    const leves = posts.map((p) => ({ ...p, conteudo_md: '' }));
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), posts: leves } satisfies Cached));
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* quota / private mode — ignora */
  }
}

export function useBlogPostsCache() {
  const initial = useMemo(() => readCache(), []);
  const [posts, setPosts] = useState<BlogPost[]>(initial ?? []);
  const [loaded, setLoaded] = useState<boolean>(!!initial);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows: RawPost[] | null = null;
      // Fase 1 — lista leve (sem o markdown): resposta pequena, pinta na hora.
      try {
        const { data } = await supabase
          .from('blog_edicao_posts')
          .select(LISTA_COLS)
          .eq('publicado', true)
          .order('data_publicacao', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(60);
        rows = (data as RawPost[]) ?? null;
      } catch {}
      // Fallback pro bundle nativo (Electron / sem rede)
      if (!rows || rows.length === 0) {
        const bundled = await bundle.blogPosts<RawPost>();
        if (bundled.length > 0) rows = bundled;
      }
      if (cancelled) return;
      if (rows && rows.length > 0) {
        const mapped = map(rows);
        setPosts(mapped);
        writeCache(mapped);
      }
      setLoaded(true);

      // Fase 2 — conteúdo completo em background, só dos posts em tela.
      const ids = (rows || []).map((r) => r.id).slice(0, 20);
      if (!ids.length) return;
      try {
        const { data: full } = await supabase
          .from('blog_edicao_posts')
          .select('id, conteudo_md')
          .in('id', ids);
        if (cancelled || !full) return;
        const byId = new Map((full as Array<{ id: string; conteudo_md: string }>).map((r) => [r.id, r.conteudo_md]));
        setPosts((prev) => prev.map((p) => (byId.has(p.id) ? { ...p, conteudo_md: byId.get(p.id) || p.conteudo_md } : p)));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { posts, loaded };
}
