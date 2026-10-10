import { supabase } from '@/integrations/supabase/client';
import type { VisualRecord } from './types';

const COLS = 'id, tipo, categoria, item_key, item_label, titulo, conteudo, fonte, views, created_at';

let cache: VisualRecord[] | null = null;
let inflight: Promise<VisualRecord[]> | null = null;

/**
 * Carrega (uma vez) tudo que já foi gerado. Chamado no início do app para a
 * folha de visuais abrir instantânea, sem delay de rede no clique.
 */
export function prefetchVisuais(): Promise<VisualRecord[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from('visuais_juridicos' as any)
      .select(COLS)
      .limit(1000);
    cache = ((data as any[]) || []) as VisualRecord[];
    inflight = null;
    return cache;
  })();
  return inflight;
}

export function visuaisEmCache(): VisualRecord[] | null {
  return cache;
}

export function registrarVisual(registro: VisualRecord) {
  if (!cache) cache = [];
  cache = [...cache.filter((r) => r.item_key !== registro.item_key || r.tipo !== registro.tipo), registro];
}

export function limparCacheVisuais() {
  cache = null;
  inflight = null;
}

