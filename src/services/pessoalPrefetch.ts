// Prefetch de dados das subpáginas /pessoal/*, chamado quando o Meu Espaço monta
// (idle) e no onPointerDown dos cards de acesso rápido. Popula tanto o React
// Query quanto o pessoalCache (localStorage) para paint imediato.
import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { setCache, getCache } from '@/lib/pessoalCache';
import { preloadCover } from '@/assets/pessoal/covers';

export const PESSOAL_KEYS = {
  artigos: (uid: string) => ['pessoal', 'artigos', uid] as const,
  anotacoes: (uid: string) => ['pessoal', 'anotacoes', uid] as const,
  grifos: (uid: string) => ['pessoal', 'grifos', uid] as const,
  livros: (uid: string) => ['pessoal', 'livros', uid] as const,
  filmes: (uid: string) => ['pessoal', 'filmes', uid] as const,
};

const STALE = 60_000;

export async function fetchPessoalArtigos() {
  const { data } = await supabase
    .from('artigos_favoritos')
    .select('id, tabela_codigo, numero_artigo, conteudo_preview, created_at')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as any[];
  setCache('artigos', rows);
  return rows;
}

export async function fetchPessoalAnotacoes() {
  const { data } = await supabase
    .from('artigos_anotacoes')
    .select('id, tabela_codigo, numero_artigo, anotacao, updated_at')
    .order('updated_at', { ascending: false });
  const rows = (data ?? []) as any[];
  setCache('anotacoes', rows);
  return rows;
}

export async function fetchPessoalGrifos() {
  const { data } = await supabase
    .from('artigos_grifos')
    .select('id, tabela_codigo, numero_artigo, highlights, updated_at')
    .order('updated_at', { ascending: false });
  const rows = (data ?? []) as any[];
  setCache('grifos', rows);
  return rows;
}

export async function fetchPessoalLivros() {
  const [fRes, pRes] = await Promise.all([
    supabase.from('biblioteca_favoritos').select('id, livro_key, categoria, created_at').order('created_at', { ascending: false }),
    supabase.from('biblioteca_leitura_progresso').select('livro_key, percentual, updated_at').order('updated_at', { ascending: false }),
  ]);
  const payload = { favs: (fRes.data ?? []) as any[], prog: (pRes.data ?? []) as any[] };
  setCache('livros', payload);
  return payload;
}

export async function fetchPessoalFilmes() {
  const { data: favData } = await supabase
    .from('tematica_favoritos')
    .select('obra_id, created_at')
    .order('created_at', { ascending: false });
  const favs = (favData ?? []) as any[];
  let obras: any[] = [];
  if (favs.length > 0) {
    const { data: obrasData } = await supabase
      .from('tematica_juridica_obras')
      .select('id, titulo, poster_url, categoria_juridica, tipo, ano')
      .in('id', favs.map((r) => r.obra_id));
    obras = (obrasData ?? []) as any[];
  }
  const payload = { favs, obras };
  setCache('filmes', payload);
  return payload;
}

export function prefetchAllPessoal(qc: QueryClient, uid: string) {
  const opts = { staleTime: STALE };
  // Aquece a capa do perfil (a imagem já vem do snapshot local, então o paint é imediato).
  try {
    const snap: any = getCache('sheet_snapshot');
    preloadCover(snap?.capaId ?? 'capa1');
  } catch { /* noop */ }
  qc.prefetchQuery({ queryKey: PESSOAL_KEYS.artigos(uid), queryFn: fetchPessoalArtigos, ...opts }).catch(() => {});
  qc.prefetchQuery({ queryKey: PESSOAL_KEYS.anotacoes(uid), queryFn: fetchPessoalAnotacoes, ...opts }).catch(() => {});
  qc.prefetchQuery({ queryKey: PESSOAL_KEYS.grifos(uid), queryFn: fetchPessoalGrifos, ...opts }).catch(() => {});
  qc.prefetchQuery({ queryKey: PESSOAL_KEYS.livros(uid), queryFn: fetchPessoalLivros, ...opts }).catch(() => {});
  qc.prefetchQuery({ queryKey: PESSOAL_KEYS.filmes(uid), queryFn: fetchPessoalFilmes, ...opts }).catch(() => {});
}

/** Prefetch por path — chamado no onPointerDown dos cards do Meu Espaço. */
export function prefetchPessoalByPath(qc: QueryClient, uid: string, path: string) {
  const opts = { staleTime: STALE };
  switch (path) {
    case '/pessoal/artigos':
      qc.prefetchQuery({ queryKey: PESSOAL_KEYS.artigos(uid), queryFn: fetchPessoalArtigos, ...opts }).catch(() => {});
      break;
    case '/pessoal/anotacoes':
      qc.prefetchQuery({ queryKey: PESSOAL_KEYS.anotacoes(uid), queryFn: fetchPessoalAnotacoes, ...opts }).catch(() => {});
      break;
    case '/pessoal/grifos':
      qc.prefetchQuery({ queryKey: PESSOAL_KEYS.grifos(uid), queryFn: fetchPessoalGrifos, ...opts }).catch(() => {});
      break;
    case '/pessoal/livros':
      qc.prefetchQuery({ queryKey: PESSOAL_KEYS.livros(uid), queryFn: fetchPessoalLivros, ...opts }).catch(() => {});
      break;
    case '/pessoal/filmes':
      qc.prefetchQuery({ queryKey: PESSOAL_KEYS.filmes(uid), queryFn: fetchPessoalFilmes, ...opts }).catch(() => {});
      break;
  }
}
