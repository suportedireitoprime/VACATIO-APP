import { supabase } from '@/integrations/supabase/client';
import type { CatalogoItem } from './catalogo';

export interface TemaResumo {
  tema: string;
  total: number;
}

const slug = (v: string) =>
  v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let areasCache: CatalogoItem[] | null = null;
const temasCache = new Map<string, TemaResumo[]>();

/** Lê todas as linhas de resumos_juridicos em páginas (com fallback offline). */
async function lerResumos<T extends Record<string, any>>(colunas: string, filtro?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  const step = 1000;
  let from = 0;
  while (true) {
    let q = (supabase as any).from('resumos_juridicos').select(colunas).range(from, from + step - 1);
    if (filtro) q = filtro(q);
    const { data, error } = await q;
    if (error) break;
    if (!data?.length) break;
    out.push(...(data as T[]));
    if (data.length < step) break;
    from += step;
  }
  if (!out.length) {
    try {
      const { bundle } = await import('@/services/offlineBundle');
      const rows = await bundle.resumos<T>();
      return rows || [];
    } catch {
      return [];
    }
  }
  return out;
}

/** Matérias reaproveitadas da tabela de resumos jurídicos (áreas). */
export async function fetchAreasResumos(): Promise<CatalogoItem[]> {
  if (areasCache) return areasCache;
  const rows = await lerResumos<{ area: string; tema?: string }>('area');
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.area) continue;
    map.set(r.area, (map.get(r.area) || 0) + 1);
  }
  const itens: CatalogoItem[] = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
    .map(([area, total]) => ({
      key: `materia:${slug(area)}`,
      label: area,
      sub: `${total} ${total === 1 ? 'tópico' : 'tópicos'} de resumo`,
      contexto: `Matéria jurídica brasileira: ${area}. Panorama geral dos institutos centrais da disciplina.`,
    }));
  areasCache = itens;
  return itens;
}

/** Tópicos (temas) de uma matéria, na ordem dos resumos. */
export async function fetchTemasResumos(area: string): Promise<TemaResumo[]> {
  const cache = temasCache.get(area);
  if (cache) return cache;
  const rows = await lerResumos<{ area: string; tema: string; ordem_tema: number | null }>(
    'area, tema, ordem_tema',
    (q) => q.eq('area', area),
  );
  const map = new Map<string, { total: number; ordem: number }>();
  for (const r of rows) {
    if (r.area !== area || !r.tema) continue;
    const atual = map.get(r.tema);
    map.set(r.tema, {
      total: (atual?.total || 0) + 1,
      ordem: atual?.ordem ?? (r.ordem_tema ?? 9999),
    });
  }
  const lista = [...map.entries()]
    .sort((a, b) => a[1].ordem - b[1].ordem || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([tema, v]) => ({ tema, total: v.total }));
  temasCache.set(area, lista);
  return lista;
}

export const slugTema = slug;

export interface SubtemaResumo {
  subtema: string;
  total: number;
}

const subtemasCache = new Map<string, SubtemaResumo[]>();

/** Subtemas de um tópico (tema) de uma matéria, na ordem dos resumos. */
export async function fetchSubtemasResumos(area: string, tema: string): Promise<SubtemaResumo[]> {
  const ck = `${area}||${tema}`;
  const cache = subtemasCache.get(ck);
  if (cache) return cache;
  const rows = await lerResumos<{ area: string; tema: string; subtema: string | null; ordem_subtema: number | null }>(
    'area, tema, subtema, ordem_subtema',
    (q) => q.eq('area', area).eq('tema', tema),
  );
  const map = new Map<string, { total: number; ordem: number }>();
  for (const r of rows) {
    if (r.area !== area || r.tema !== tema) continue;
    const nome = (r.subtema || '').trim();
    if (!nome) continue;
    const atual = map.get(nome);
    map.set(nome, {
      total: (atual?.total || 0) + 1,
      ordem: atual?.ordem ?? (r.ordem_subtema ?? 9999),
    });
  }
  const lista = [...map.entries()]
    .sort((a, b) => a[1].ordem - b[1].ordem || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([subtema, v]) => ({ subtema, total: v.total }));
  subtemasCache.set(ck, lista);
  return lista;
}
