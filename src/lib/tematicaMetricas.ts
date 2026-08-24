import { supabase } from '@/integrations/supabase/client';

export type EventoTematica = 'view' | 'click_provider' | 'share' | 'trailer_play';

// Deduplica views por obra na mesma sessão para não inflar a métrica.
const seen = new Set<string>();

export async function registrarEventoTematica(obraId: string, evento: EventoTematica) {
  try {
    if (evento === 'view') {
      if (seen.has(obraId)) return;
      seen.add(obraId);
    }
    const { data } = await supabase.auth.getUser();
    await supabase.from('tematica_metricas').insert({
      obra_id: obraId,
      user_id: data.user?.id ?? null,
      evento,
    });
  } catch (e) {
    // silencioso — métrica não pode quebrar a UI
    console.debug('[tematica] métrica falhou', e);
  }
}

export type RankingRow = {
  obra_id: string;
  views: number;
  favoritos: number;
  comentarios: number;
  score: number;
};

export async function buscarRankingEngajamento(periodoDias = 7): Promise<RankingRow[]> {
  try {
    const { data, error } = await supabase.rpc('tematica_ranking_engajamento' as any, {
      periodo_dias: periodoDias,
    });
    if (error) throw error;
    return (data ?? []) as RankingRow[];
  } catch (e) {
    console.debug('[tematica] ranking falhou', e);
    return [];
  }
}
