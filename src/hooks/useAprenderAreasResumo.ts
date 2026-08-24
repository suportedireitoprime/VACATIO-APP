import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AreaResumo = {
  id: string;
  slug: string;
  nome: string;
  cor: string | null;
  totalAulas: number;
  concluidas: number;
  pct: number;
};

let memoCache: AreaResumo[] | null = null;

/**
 * Lista as áreas de estudo publicadas com contagem de aulas e progresso do usuário.
 * Usado pelas telas globais de Trilhas, Flashcards e Questões.
 */
export function useAprenderAreasResumo() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<AreaResumo[]>(memoCache ?? []);
  const [loading, setLoading] = useState(!memoCache);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: areasData } = await supabase
        .from('aprender_areas')
        .select('id, slug, nome, cor')
        .neq('slug', 'livros')
        .order('ordem');
      const lista = (areasData ?? []) as any[];

      const { data: aulasData } = await supabase
        .from('aprender_aulas')
        .select('id, modulo:aprender_modulos!inner(area_id)')
        .eq('status', 'published');
      const aulas = (aulasData ?? []) as any[];

      const porArea = new Map<string, string[]>();
      aulas.forEach((a) => {
        const areaId = a.modulo?.area_id;
        if (!areaId) return;
        const arr = porArea.get(areaId) ?? [];
        arr.push(a.id);
        porArea.set(areaId, arr);
      });

      let concluidasSet = new Set<string>();
      if (user && aulas.length) {
        const { data: prog } = await supabase
          .from('aprender_progresso_aula')
          .select('aula_id, concluida_em')
          .eq('user_id', user.id)
          .in('aula_id', aulas.map((a) => a.id));
        concluidasSet = new Set((prog ?? []).filter((p: any) => p.concluida_em).map((p: any) => p.aula_id));
      }

      const resumo: AreaResumo[] = lista
        .map((a) => {
          const ids = porArea.get(a.id) ?? [];
          const concluidas = ids.filter((id) => concluidasSet.has(id)).length;
          return {
            id: a.id,
            slug: a.slug,
            nome: a.nome,
            cor: a.cor ?? null,
            totalAulas: ids.length,
            concluidas,
            pct: ids.length ? Math.round((concluidas / ids.length) * 100) : 0,
          };
        })
        .filter((a) => a.totalAulas > 0);

      if (cancelled) return;
      memoCache = resumo;
      setAreas(resumo);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return { areas, loading };
}
