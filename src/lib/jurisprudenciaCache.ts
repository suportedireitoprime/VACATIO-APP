import { LEIS_SUPABASE_URL } from '@/lib/legislacaoBackend';
import { supabase } from '@/integrations/supabase/client';

export interface JurisCategoriaCache {
  codigo: string;
  label: string;
  tribunal: string;
  itens: any[];
}

export interface JurisCacheEntry {
  leiInfo: { corpus_lei_id: number; nome_exibicao: string } | null;
  categorias: JurisCategoriaCache[];
  totalItens: number;
  savedAt: number;
}

const memory = new Map<string, JurisCacheEntry>();
const inflight = new Map<string, Promise<JurisCacheEntry | null>>();

const key = (slug: string, numero: string) => `juris:v1:${slug}:${numero}`;

export function readJurisCache(slug: string, numero: string): JurisCacheEntry | null {
  const k = key(slug, numero);
  const mem = memory.get(k);
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JurisCacheEntry;
    memory.set(k, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeJurisCache(slug: string, numero: string, entry: JurisCacheEntry) {
  const k = key(slug, numero);
  memory.set(k, entry);
  try {
    localStorage.setItem(k, JSON.stringify(entry));
  } catch {
    /* ignore quota */
  }
}

async function resolveMapa(slug: string) {
  const { data } = await supabase
    .from('jurisprudencia_leis_map')
    .select('corpus_lei_id, nome_exibicao, ativo')
    .eq('slug_local', slug)
    .maybeSingle();
  if (data && data.ativo) {
    return { corpus_lei_id: data.corpus_lei_id as number, nome_exibicao: data.nome_exibicao as string };
  }
  return null;
}

async function fetchCorpus(corpus_lei_id: number, numero: string, force = false) {
  if (corpus_lei_id === -1) return { categorias: [], total_itens: 0 };
  const resp = await fetch(`${LEIS_SUPABASE_URL}/functions/v1/corpus927-fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ corpus_lei_id, numero_artigo: numero, force }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error || 'Erro ao consultar jurisprudência');
  return json;
}

/**
 * Revalida em background. Se não houver mapa ainda, apenas retorna null
 * (a descoberta continua sendo feita na tela, com overlay).
 */
export async function revalidateJurisprudencia(
  slug: string,
  numero: string,
  force = false
): Promise<JurisCacheEntry | null> {
  const cached = readJurisCache(slug, numero);
  const mapaPromise = cached?.leiInfo
    ? Promise.resolve(cached.leiInfo)
    : resolveMapa(slug);
  const mapa = await mapaPromise;
  if (!mapa) return null;
  const json = await fetchCorpus(mapa.corpus_lei_id, numero, force);
  const entry: JurisCacheEntry = {
    leiInfo: mapa,
    categorias: json.categorias || [],
    totalItens: json.total_itens || 0,
    savedAt: Date.now(),
  };
  writeJurisCache(slug, numero, entry);
  return entry;
}

/** Dispara em background, deduplicado. Silencia erros. */
export function prefetchJurisprudenciaArtigo(slug?: string | null, numero?: string | number | null) {
  if (!slug || numero == null) return;
  const num = String(numero);
  const k = key(slug, num);
  if (inflight.has(k)) return;
  const cached = readJurisCache(slug, num);
  const fresh = cached && Date.now() - cached.savedAt < 24 * 60 * 60 * 1000;
  if (fresh) return;
  const p = revalidateJurisprudencia(slug, num).catch(() => null).finally(() => {
    inflight.delete(k);
  });
  inflight.set(k, p);
}
