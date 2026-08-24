import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { COLECOES, normalizeLivro, type ColecaoConfig, type LivroNormalizado } from '@/lib/bibliotecaColecoes';

export interface LeituraNativaStatus {
  status?: string | null;             // pendente | processando | pronto | erro
  etapa?: string | null;
  progresso?: number | null;
  total_etapas?: number | null;
  total_paginas?: number | null;
  erro_detalhe?: string | null;
  updated_at?: string | null;
  refino_status?: string | null;      // pendente | processando | pronto | erro
  refino_updated_at?: string | null;
  refino_erro?: string | null;
}

export interface LivroLeituraItem extends LivroNormalizado {
  colecao: ColecaoConfig;
  leitura?: LeituraNativaStatus | null;
}

export function useBibliotecaLeituraStatus() {
  const [items, setItems] = useState<LivroLeituraItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // 1) Livros de todas as coleções
    const allLivros: LivroLeituraItem[] = [];
    for (const col of COLECOES) {
      const { data, error } = await supabase
        .from(col.table as any)
        .select(col.select)
        .limit(2000);
      if (error) { console.warn(col.table, error.message); continue; }
      for (const row of (data as any[]) ?? []) {
        const n = normalizeLivro(row, col);
        allLivros.push({ ...n, colecao: col });
      }
    }
    // 2) Status de leitura nativa
    const { data: statusRows } = await supabase
      .from('biblioteca_leitura_nativa' as any)
      .select('livro_id,livro_tabela,status,etapa,progresso,total_etapas,total_paginas,erro_detalhe,updated_at,refino_status,refino_updated_at,refino_erro')
      .limit(5000);
    const statusMap = new Map<string, LeituraNativaStatus>();
    for (const s of (statusRows as any[]) ?? []) {
      statusMap.set(`${s.livro_tabela}::${s.livro_id}`, s);
    }
    for (const it of allLivros) {
      it.leitura = statusMap.get(`${it.colecao.table}::${it.id}`) ?? null;
    }
    setItems(allLivros);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime — atualiza status quando muda
  useEffect(() => {
    const channel = supabase
      .channel('biblioteca-leitura-nativa-admin')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'biblioteca_leitura_nativa' },
        (payload: any) => {
          const s = payload.new ?? payload.old;
          if (!s?.livro_id || !s?.livro_tabela) return;
          setItems((prev) => prev.map((it) =>
            it.colecao.table === s.livro_tabela && String(it.id) === String(s.livro_id)
              ? { ...it, leitura: { ...(it.leitura ?? {}), ...s } }
              : it
          ));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { items, loading, reload: load };
}
