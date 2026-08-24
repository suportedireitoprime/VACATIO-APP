import { supabaseCloud } from '@/integrations/supabase/cloudClient';
import { getMem, swr, onChange, hydrateFromIDB } from '@/services/jurisCacheStore';

export type Tribunal = 'STF' | 'STJ';

export interface PesquisaPronta {
  id: string;
  tribunal: Tribunal;
  ramo: string;
  assunto: string | null;
  titulo: string;
  slug: string;
  query_url: string;
  query_string: string | null;
  ordem: number;
}

const bySlugCache = new Map<string, PesquisaPronta>();
const cacheKey = (t: Tribunal) => `pesquisas-prontas:${t}`;

async function fetchPesquisasProntasRemote(tribunal: Tribunal): Promise<PesquisaPronta[]> {
  const { data, error } = await (supabaseCloud as any)
    .from('jurisprudencia_prontas')
    .select('*')
    .eq('tribunal', tribunal)
    .order('ramo', { ascending: true })
    .order('assunto', { ascending: true, nullsFirst: true })
    .order('ordem', { ascending: true })
    .order('titulo', { ascending: true });
  if (error) throw error;
  const list = (data || []) as PesquisaPronta[];
  list.forEach((it) => bySlugCache.set(it.slug, it));
  return list;
}

export function getPesquisasProntasCached(tribunal: Tribunal): PesquisaPronta[] | null {
  return getMem<PesquisaPronta>(cacheKey(tribunal));
}
export function warmPesquisasProntasFromIDB(tribunal: Tribunal) {
  return hydrateFromIDB<PesquisaPronta>(cacheKey(tribunal));
}
export function subscribePesquisasProntas(tribunal: Tribunal, cb: (rows: PesquisaPronta[]) => void) {
  return onChange<PesquisaPronta>(cacheKey(tribunal), cb);
}

export async function fetchPesquisasProntas(tribunal: Tribunal): Promise<PesquisaPronta[]> {
  return swr<PesquisaPronta>(cacheKey(tribunal), () => fetchPesquisasProntasRemote(tribunal));
}

export async function fetchPesquisaProntaBySlug(slug: string): Promise<PesquisaPronta | null> {
  const cached = bySlugCache.get(slug);
  if (cached) return cached;
  const { data, error } = await (supabaseCloud as any)
    .from('jurisprudencia_prontas')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.error('fetchPesquisaProntaBySlug', error);
    return null;
  }
  if (data) bySlugCache.set(slug, data as PesquisaPronta);
  return (data as PesquisaPronta) ?? null;
}

export interface RamoGrupo {
  ramo: string;
  itens: PesquisaPronta[];
}

export function agruparPorRamo(itens: PesquisaPronta[]): RamoGrupo[] {
  const map = new Map<string, PesquisaPronta[]>();
  for (const it of itens) {
    if (!map.has(it.ramo)) map.set(it.ramo, []);
    map.get(it.ramo)!.push(it);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([ramo, itens]) => ({ ramo, itens }));
}

export function invalidatePesquisasProntasCache() {
  bySlugCache.clear();
}