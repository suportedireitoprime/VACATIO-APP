// Feed do Meu Espaço — extraído para permitir prefetch (Home/BottomNav)
// e cache pelo React Query com persistência (PersistQueryClientProvider).
import { supabase } from '@/integrations/supabase/client';
import { getRecentes } from '@/lib/leisRecentes';
import { buildMinhasLeis } from '@/lib/minhasLeis';

export type MeuEspacoFeedItem = {
  id: string;
  kind: 'anotacao' | 'grifo' | 'artigo' | 'lei' | 'livro' | 'jurisprudencia' | 'tematica';
  title: string;
  subtitle?: string;
  ts: number;
  path?: string;
};

export interface MeuEspacoFeed {
  feed: MeuEspacoFeedItem[];
  favTotal: number;
  leisCount: number;
  artigosCount: number;
  leiturasCount: number;
}

export const MEU_ESPACO_FEED_KEY = (uid: string | null | undefined) =>
  ['meu-espaco-feed', uid ?? 'anon'] as const;

export async function fetchMeuEspacoFeed(userId: string): Promise<MeuEspacoFeed> {
  const [favArtigos, anot, grifos, favLivros, favJuris, favTematica, progLivros] = await Promise.all([
    supabase.from('artigos_favoritos').select('id,tabela_codigo,numero_artigo,artigo_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
    supabase.from('artigos_anotacoes').select('id,tabela_codigo,numero_artigo,artigo_id,anotacao,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(60),
    supabase.from('artigos_grifos').select('id,tabela_codigo,numero_artigo,artigo_id,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(60),
    supabase.from('biblioteca_favoritos').select('id,livro_key,categoria,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
    supabase.from('jurisprudencia_favoritos').select('id,titulo,categoria,slug_local,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
    supabase.from('tematica_favoritos').select('obra_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
    supabase.from('biblioteca_leitura_progresso').select('livro_id,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(60),
  ]);

  const items: MeuEspacoFeedItem[] = [];
  (anot.data ?? []).forEach((r: any) => items.push({
    id: `an-${r.id}`, kind: 'anotacao',
    title: `Art. ${r.numero_artigo} — ${String(r.tabela_codigo || '').toUpperCase()}`,
    subtitle: (r.anotacao || '').slice(0, 90),
    ts: new Date(r.updated_at).getTime(),
    path: `/lei/${r.tabela_codigo}#art-${r.numero_artigo}`,
  }));
  (grifos.data ?? []).forEach((r: any) => items.push({
    id: `gr-${r.id}`, kind: 'grifo',
    title: `Art. ${r.numero_artigo} — ${String(r.tabela_codigo || '').toUpperCase()}`,
    subtitle: 'Trecho destacado',
    ts: new Date(r.updated_at).getTime(),
    path: `/lei/${r.tabela_codigo}#art-${r.numero_artigo}`,
  }));
  (favArtigos.data ?? []).forEach((r: any) => items.push({
    id: `af-${r.id}`, kind: 'artigo',
    title: `Art. ${r.numero_artigo} — ${String(r.tabela_codigo || '').toUpperCase()}`,
    ts: new Date(r.created_at).getTime(),
    path: `/lei/${r.tabela_codigo}#art-${r.numero_artigo}`,
  }));
  (favLivros.data ?? []).forEach((r: any) => items.push({
    id: `bl-${r.id}`, kind: 'livro',
    title: r.livro_key || 'Livro',
    subtitle: r.categoria || undefined,
    ts: new Date(r.created_at).getTime(),
    path: '/biblioteca',
  }));
  (favJuris.data ?? []).forEach((r: any) => items.push({
    id: `jr-${r.id}`, kind: 'jurisprudencia',
    title: r.titulo || 'Jurisprudência',
    subtitle: r.categoria || undefined,
    ts: new Date(r.created_at).getTime(),
    path: '/jurisprudencia',
  }));
  (favTematica.data ?? []).forEach((r: any) => items.push({
    id: `tm-${r.obra_id}`, kind: 'tematica',
    title: 'Obra temática',
    subtitle: 'Favorita',
    ts: new Date(r.created_at).getTime(),
    path: '/tematica-juridica',
  }));
  getRecentes().slice(0, 15).forEach((r) => items.push({
    id: `lr-${r.leiId}`, kind: 'lei',
    title: r.nome,
    subtitle: r.descricao,
    ts: r.openedAt,
  }));

  items.sort((a, b) => b.ts - a.ts);
  const favTotal =
    (favArtigos.data?.length ?? 0) +
    (favLivros.data?.length ?? 0) +
    (favJuris.data?.length ?? 0) +
    (favTematica.data?.length ?? 0);

  // Contadores para o topo do Meu Espaço — mesma fonte da tela /pessoal/leis.
  const minhasLeis = buildMinhasLeis((favArtigos.data ?? []).map((r: any) => String(r.tabela_codigo || '')));
  const artigosCount = favArtigos.data?.length ?? 0;
  const leiturasDistinct = new Set<string>();
  (favLivros.data ?? []).forEach((r: any) => leiturasDistinct.add(String(r.livro_key || '')));
  (progLivros.data ?? []).forEach((r: any) => leiturasDistinct.add(String(r.livro_id || '')));

  return {
    feed: items.slice(0, 200),
    favTotal,
    leisCount: minhasLeis.length,
    artigosCount,
    leiturasCount: leiturasDistinct.size,
  };
}
