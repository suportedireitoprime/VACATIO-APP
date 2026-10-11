import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeLivro,
  type LivroNormalizado,
  type ColecaoConfig,
} from '@/lib/bibliotecaColecoes';
import { getPersistedColecao, setPersistedColecao } from '@/services/offlineDb';
import { withBundleFallback, bundle } from '@/services/offlineBundle';

export function useLivrosDaColecao(colecao: ColecaoConfig | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['biblioteca-colecao', colecao?.id],
    enabled: !!colecao,
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev ?? queryClient.getQueryData(['biblioteca-colecao-top20', colecao?.id]),
    queryFn: async () => {
      if (!colecao) return [];
      try {
        let q: any = supabase.from(colecao.table as any).select(colecao.select);
        if (colecao.orderBy) {
          q = q.order(colecao.orderBy, { ascending: true, nullsFirst: false });
        }

        const data = await withBundleFallback(
          q.limit(2000).then((res: any) => {
            if (res.error) throw res.error;
            return res.data;
          }),
          async () => {
            const bundleFnName =
              'biblioteca' +
              colecao.id
                .split('-')
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join('');
            if ((bundle as any)[bundleFnName]) {
              return await (bundle as any)[bundleFnName]();
            }
            return [];
          }
        );

        const list = (data as any[]).map((r) => normalizeLivro(r, colecao));
        setPersistedColecao(colecao.id, list).catch(() => {});
        return list;
      } catch (err) {
        // Fallback da rede extrema para cache indexado persistente
        const cached = await getPersistedColecao<LivroNormalizado>(colecao.id);
        if (cached && cached.length) return cached;
        throw err;
      }
    },
  });
}
