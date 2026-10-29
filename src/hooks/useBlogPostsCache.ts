/**
 * Cache stale-while-revalidate dos posts do blog no localStorage.
 * — 1ª visita: fetch normal, popula cache.
 * — Visitas seguintes (24 h): hidrata sincronamente e revalida em background.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BlogPost, BlogTema } from '@/data/blogPosts';
import { BLOG_POSTS } from '@/data/blogPosts';
import { bundle } from '@/services/offlineBundle';

const KEY = 'blog:posts:v6';
const LEGACY_KEYS = ['blog:posts:v1', 'blog:posts:v2', 'blog:posts:v3', 'blog:posts:v4', 'blog:posts:v5'];
const TTL_MS = 24 * 60 * 60 * 1000; // 24 h

const LISTA_COLS =
  'id, titulo, resumo, imagem_url, categoria, autor, tempo_leitura_min, data_publicacao, created_at, audio_url, audio_duration_seconds, audio_voice';

type RawPost = {
  id: string;
  titulo: string;
  resumo: string;
  conteudo_md?: string;
  imagem_url: string;
  categoria?: string;
  tema?: string;
  autor: string;
  tempo_leitura_min: number;
  data_publicacao: string;
  created_at?: string;
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  audio_voice?: string | null;
};

type Cached = { at: number; posts: BlogPost[] };

function map(rows: RawPost[]): BlogPost[] {
  return rows.map((p) => {
    const rawCategory = p.categoria || p.tema || '01 - Leis - o que são e como funcionam';
    return {
      id: p.id,
      titulo: p.titulo,
      resumo: p.resumo,
      conteudo_md: p.conteudo_md ?? '',
      imagem_url: p.imagem_url,
      tema: rawCategory as BlogTema,
      autor: p.autor || 'Redação Vadimeco',
      tempo_leitura_min: p.tempo_leitura_min || 7,
      data_publicacao: p.data_publicacao || new Date().toISOString(),
      audio_url: p.audio_url || `https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/blog/audios/${p.id}.mp3`,
      audio_duration_seconds: p.audio_duration_seconds,
      audio_voice: p.audio_voice || 'Professora',
    };
  });
}

function readCache(): BlogPost[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.posts || !Array.isArray(parsed.posts)) return null;
    if (Date.now() - parsed.at > TTL_MS) return parsed.posts;
    return parsed.posts;
  } catch {
    return null;
  }
}

function writeCache(posts: BlogPost[]) {
  try {
    const leves = posts.map((p) => ({ ...p, conteudo_md: '' }));
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), posts: leves } satisfies Cached));
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

let prefetchPromise: Promise<void> | null = null;
export async function prefetchBlogPosts(): Promise<void> {
  if (prefetchPromise) return prefetchPromise;
  prefetchPromise = (async () => {
    try {
      const cached = readCache();
      if (cached && cached.length > 0) return;
      const { data } = await supabase
        .from('blog_edicao_posts')
        .select(LISTA_COLS)
        .eq('publicado', true)
        .order('data_publicacao', { ascending: false })
        .limit(100);
      if (data && data.length > 0) {
        writeCache(map(data as RawPost[]));
      }
    } catch {}
  })();
  return prefetchPromise;
}

export function useBlogPostsCache() {
  const initial = useMemo(() => readCache() ?? (BLOG_POSTS as BlogPost[]), []);
  const [posts, setPosts] = useState<BlogPost[]>(initial);
  const [loaded, setLoaded] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows: RawPost[] | null = null;
      try {
        const { data } = await supabase
          .from('blog_edicao_posts')
          .select(LISTA_COLS)
          .eq('publicado', true)
          .order('data_publicacao', { ascending: false })
          .limit(1000);
        rows = (data as RawPost[]) ?? null;
      } catch {}

      if (!rows || rows.length === 0) {
        const bundled = await bundle.blogPosts<RawPost>();
        if (bundled.length > 0) rows = bundled;
        else rows = (BLOG_POSTS as unknown as RawPost[]) ?? null;
      }
      if (cancelled) return;
      if (rows && rows.length > 0) {
        const mapped = map(rows);
        setPosts(mapped);
        writeCache(mapped);
      }
      setLoaded(true);

      // Preload do conteúdo dos primeiros posts
      const ids = (rows || []).map((r) => r.id).slice(0, 30);
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
