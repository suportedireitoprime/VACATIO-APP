import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface LocalEstatisticas {
  checkins: number;
  ultima_visita: string | null;
  avaliacao_media: number;
  avaliacao_total: number;
  fotos_usuario: number;
}

export interface AvaliacaoUsuario {
  id?: string;
  nota: number;
  tags: string[];
  comentario: string | null;
  aprovado: boolean;
}

const TAGS_DISPONIVEIS = ['atendimento', 'limpeza', 'wifi', 'fila', 'estacionamento', 'acessibilidade'] as const;
export type TagAvaliacao = typeof TAGS_DISPONIVEIS[number];
export const AVALIACAO_TAGS: readonly TagAvaliacao[] = TAGS_DISPONIVEIS;

export function useLocalSocial(localId: string | null) {
  const { user } = useAuth();
  const [stats, setStats] = useState<LocalEstatisticas | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [minhaAvaliacao, setMinhaAvaliacao] = useState<AvaliacaoUsuario | null>(null);
  const [avaliacoesPublicas, setAvaliacoesPublicas] = useState<
    Array<{ id: string; nota: number; tags: string[]; comentario: string | null; created_at: string; user_id: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const recarregar = useCallback(async () => {
    if (!localId) { setStats(null); return; }
    setLoading(true);
    const [{ data: stat }, { data: aval }, meuCheckin, minhaAval] = await Promise.all([
      supabase.rpc('local_estatisticas', { _local_id: localId }),
      supabase
        .from('locais_avaliacoes')
        .select('id, nota, tags, comentario, created_at, user_id')
        .eq('local_id', localId)
        .eq('aprovado', true)
        .order('created_at', { ascending: false })
        .limit(20),
      user
        ? supabase.from('locais_checkins').select('id').eq('local_id', localId).eq('user_id', user.id).limit(1)
        : Promise.resolve({ data: null }),
      user
        ? supabase.from('locais_avaliacoes').select('id, nota, tags, comentario, aprovado').eq('local_id', localId).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ] as any);
    setStats((stat as any) ?? null);
    setAvaliacoesPublicas((aval as any) ?? []);
    setCheckedIn(!!(meuCheckin as any)?.data?.length);
    setMinhaAvaliacao((minhaAval as any)?.data ?? null);
    setLoading(false);
  }, [localId, user]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const fazerCheckin = useCallback(async () => {
    if (!user) { toast.error('Faça login para registrar visita'); return; }
    if (!localId) return;
    const { error } = await supabase.from('locais_checkins').insert({ user_id: user.id, local_id: localId });
    if (error) { toast.error('Não foi possível registrar'); return; }
    toast.success('Check-in registrado! 📍');
    setCheckedIn(true);
    recarregar();
  }, [user, localId, recarregar]);

  const salvarAvaliacao = useCallback(async (nota: number, tags: string[], comentario: string) => {
    if (!user) { toast.error('Faça login para avaliar'); return; }
    if (!localId) return;
    let aprovado = true;
    if (comentario.trim().length > 0) {
      try {
        const { data } = await supabase.functions.invoke('local-moderar-comentario', { body: { texto: comentario } });
        aprovado = (data as any)?.aprovado !== false;
      } catch { aprovado = true; }
    }
    const { error } = await supabase.from('locais_avaliacoes').upsert({
      user_id: user.id,
      local_id: localId,
      nota,
      tags,
      comentario: comentario.trim() || null,
      aprovado,
      moderado_em: new Date().toISOString(),
    }, { onConflict: 'user_id,local_id' });
    if (error) { toast.error('Falha ao salvar avaliação'); return; }
    toast.success(aprovado ? 'Avaliação publicada!' : 'Avaliação enviada para revisão');
    recarregar();
  }, [user, localId, recarregar]);

  return { stats, checkedIn, minhaAvaliacao, avaliacoesPublicas, loading, fazerCheckin, salvarAvaliacao, recarregar };
}
