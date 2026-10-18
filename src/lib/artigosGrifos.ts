// Persistência unificada de destaques/grifos — Supabase (artigos_grifos) + espelho localStorage.
// Fonte única da verdade para Grifos Manuais, Grifo Mágico (IA), Voz e Foto.
// Atualiza em tempo real a listagem em /pessoal/grifos, Meu Espaço, e as tags de artigos.

import { supabase } from '@/integrations/supabase/client';
import { setCache, getCache } from '@/lib/pessoalCache';

export interface GrifoHighlight {
  id: string;
  lineIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: string;
  comment?: string;
  tags?: string[];
  origem?: 'manual' | 'ia' | 'voz' | 'foto';
  corNome?: string;
  categoria?: string;
  explicacao?: string;
  hierarquia?: string;
  trechoExato?: string;
  createdAt?: number;
}

export interface ArtigoGrifoRecord {
  id: string;
  tabela_codigo: string;
  numero_artigo: string;
  artigo_id: string;
  highlights: GrifoHighlight[];
  updated_at: string;
  user_id?: string;
}

export const ARTIGOS_GRIFOS_EVENT = 'artigos:grifos:changed';

export function emitGrifosChanged(detail?: { tabela_codigo?: string; numero_artigo?: string }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ARTIGOS_GRIFOS_EVENT, { detail }));
    window.dispatchEvent(new Event('storage'));
  }
}

export function getArtigoStorageKey(tabela: string, numero: string, legacyId?: string | null): string {
  return `highlights_${tabela}::${numero}`;
}

/** Lê os destaques armazenados localmente de forma síncrona (0ms). */
export function readLocalArtigoGrifos(tabela?: string | null, numero?: string | null, legacyId?: string | null): GrifoHighlight[] {
  if (typeof window === 'undefined') return [];
  try {
    if (tabela && numero) {
      const key = `highlights_${tabela}::${numero}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
    if (legacyId) {
      const rawLegacy = localStorage.getItem(`highlights_${legacyId}`);
      if (rawLegacy) {
        const parsedLegacy = JSON.parse(rawLegacy);
        if (Array.isArray(parsedLegacy)) return parsedLegacy;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/** Carrega os grifos de um artigo (Supabase quando logado + fallback local). */
export async function loadArtigoGrifosRemote(tabela: string, numero: string): Promise<GrifoHighlight[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      return readLocalArtigoGrifos(tabela, numero);
    }
    const { data, error } = await supabase
      .from('artigos_grifos')
      .select('highlights')
      .eq('user_id', user.id)
      .eq('tabela_codigo', tabela)
      .eq('numero_artigo', numero)
      .maybeSingle();

    if (error) {
      console.warn('Erro ao buscar grifos do artigo no Supabase:', error);
      return readLocalArtigoGrifos(tabela, numero);
    }

    if (data && Array.isArray(data.highlights)) {
      const highlights = data.highlights as unknown as GrifoHighlight[];
      // Salva no espelho local para ficar disponível offline
      try {
        localStorage.setItem(`highlights_${tabela}::${numero}`, JSON.stringify(highlights));
      } catch {}
      return highlights;
    }
    return [];
  } catch {
    return readLocalArtigoGrifos(tabela, numero);
  }
}

/** Salva grifos do artigo em tempo real no Supabase, localStorage e cache do Meu Espaço. */
export async function saveArtigoGrifos(params: {
  tabela_codigo: string;
  numero_artigo: string;
  highlights: GrifoHighlight[];
  legacyId?: string | null;
}): Promise<void> {
  const { tabela_codigo, numero_artigo, highlights, legacyId } = params;
  if (!tabela_codigo || !numero_artigo) return;

  const artigoId = `${tabela_codigo}::${numero_artigo}`;
  const key = `highlights_${artigoId}`;

  // 1. Atualiza espelho local síncrono
  if (typeof window !== 'undefined') {
    try {
      if (highlights.length === 0) {
        localStorage.removeItem(key);
        if (legacyId) localStorage.removeItem(`highlights_${legacyId}`);
      } else {
        localStorage.setItem(key, JSON.stringify(highlights));
        if (legacyId) localStorage.setItem(`highlights_${legacyId}`, JSON.stringify(highlights));
      }
    } catch {}
  }

  // 2. Persistência real no Supabase (artigos_grifos)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
      if (highlights.length === 0) {
        await supabase
          .from('artigos_grifos')
          .delete()
          .eq('user_id', user.id)
          .eq('tabela_codigo', tabela_codigo)
          .eq('numero_artigo', numero_artigo);
      } else {
        await supabase
          .from('artigos_grifos')
          .upsert(
            {
              user_id: user.id,
              tabela_codigo,
              numero_artigo,
              artigo_id: artigoId,
              highlights: highlights as any,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,tabela_codigo,numero_artigo' }
          );
      }
    }
  } catch (err) {
    console.error('Erro ao salvar artigos_grifos no Supabase:', err);
  }

  // 3. Atualiza cache em memória / pessoalCache ('grifos')
  try {
    const cached = getCache<ArtigoGrifoRecord[]>('grifos') || [];
    let updatedList: ArtigoGrifoRecord[];
    if (highlights.length === 0) {
      updatedList = cached.filter(
        (c) => !(c.tabela_codigo === tabela_codigo && c.numero_artigo === numero_artigo)
      );
    } else {
      const existingIdx = cached.findIndex(
        (c) => c.tabela_codigo === tabela_codigo && c.numero_artigo === numero_artigo
      );
      const record: ArtigoGrifoRecord = {
        id: `local_${artigoId}`,
        tabela_codigo,
        numero_artigo,
        artigo_id: artigoId,
        highlights,
        updated_at: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        updatedList = [...cached];
        updatedList[existingIdx] = record;
      } else {
        updatedList = [record, ...cached];
      }
    }
    setCache('grifos', updatedList);
  } catch {}

  // 4. Emite evento global para que /pessoal/grifos e a lista de artigos atualizem imediatamente
  emitGrifosChanged({ tabela_codigo, numero_artigo });
}

/** Retorna todos os artigos grifados do usuário logado. */
export async function listArtigosGrifos(): Promise<ArtigoGrifoRecord[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return (getCache<ArtigoGrifoRecord[]>('grifos') || []).filter(
        (g) => Array.isArray(g.highlights) && g.highlights.length > 0
      );
    }
    const { data, error } = await supabase
      .from('artigos_grifos')
      .select('id, tabela_codigo, numero_artigo, artigo_id, highlights, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Erro ao listar artigos_grifos:', error);
      return (getCache<ArtigoGrifoRecord[]>('grifos') || []).filter(
        (g) => Array.isArray(g.highlights) && g.highlights.length > 0
      );
    }

    const rows = (data || []).filter(
      (r) => Array.isArray(r.highlights) && r.highlights.length > 0
    ) as ArtigoGrifoRecord[];
    setCache('grifos', rows);
    return rows;
  } catch {
    return (getCache<ArtigoGrifoRecord[]>('grifos') || []).filter(
      (g) => Array.isArray(g.highlights) && g.highlights.length > 0
    );
  }
}
