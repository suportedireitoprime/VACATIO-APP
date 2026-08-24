import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getFavoritos,
  subscribeTracking,
  type LivroSnapshot,
} from '@/lib/bibliotecaTracking';

export interface LivroBadgeInfo {
  favorito: boolean;
  paginaAtual?: number;
  totalPaginas?: number;
  progresso?: number; // 0..1
}

/**
 * Carrega favoritos (local) + progresso na leitura nativa (Supabase)
 * para todos os livros de uma tabela específica.
 * Retorna um Map keyed por `${table}::${id}`.
 */
export function useLivroBadges(table: string | undefined) {
  const [map, setMap] = useState<Map<string, LivroBadgeInfo>>(new Map());

  // Favoritos (local) — reativos
  const [favs, setFavs] = useState<LivroSnapshot[]>(() => getFavoritos());
  useEffect(() => subscribeTracking(() => setFavs(getFavoritos())), []);

  // Progresso + total de páginas (nativa) do usuário
  useEffect(() => {
    if (!table) return;
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const [{ data: prog }, { data: nativa }] = await Promise.all([
        userId
          ? supabase
              .from('biblioteca_leitura_progresso' as any)
              .select('livro_id,livro_tabela,pagina_atual')
              .eq('user_id', userId)
              .eq('livro_tabela', table)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('biblioteca_leitura_nativa' as any)
          .select('livro_id,livro_tabela,total_paginas,status')
          .eq('livro_tabela', table),
      ]);
      if (cancelled) return;

      const totals = new Map<string, number>();
      for (const n of (nativa as any[]) ?? []) {
        if (n.status === 'pronto' && n.total_paginas)
          totals.set(`${n.livro_tabela}::${n.livro_id}`, n.total_paginas);
      }
      const next = new Map<string, LivroBadgeInfo>();
      for (const p of (prog as any[]) ?? []) {
        const key = `${p.livro_tabela}::${p.livro_id}`;
        const total = totals.get(key);
        const pagina = p.pagina_atual ?? 0;
        next.set(key, {
          favorito: false,
          paginaAtual: pagina,
          totalPaginas: total,
          progresso: total && total > 0 ? Math.min(1, pagina / total) : undefined,
        });
      }
      setMap(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [table]);

  // Merge favoritos
  const merged = new Map<string, LivroBadgeInfo>(map);
  for (const f of favs) {
    // f.colecaoId, f.id — precisamos casar por tabela; deixamos consumidor casar por (colecaoId,id)
    const key = `fav::${f.colecaoId}::${f.id}`;
    merged.set(key, { ...(merged.get(key) ?? { favorito: false }), favorito: true });
  }

  return {
    getBadge(colecaoId: string, table: string, id: string | number): LivroBadgeInfo {
      const prog = map.get(`${table}::${id}`);
      const isFav = favs.some(
        (f) => f.colecaoId === colecaoId && String(f.id) === String(id),
      );
      return {
        favorito: isFav,
        paginaAtual: prog?.paginaAtual,
        totalPaginas: prog?.totalPaginas,
        progresso: prog?.progresso,
      };
    },
  };
}
