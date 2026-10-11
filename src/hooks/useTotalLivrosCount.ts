import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COLECOES } from '@/lib/bibliotecaColecoes';

export function useTotalLivrosCount() {
  return useQuery({
    queryKey: ['total-livros-count'],
    queryFn: async () => {
      let total = 0;
      // Get unique tables
      const tables = Array.from(new Set(COLECOES.map((c) => c.table)));
      
      for (const table of tables) {
        const { count, error } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from(table as any)
          .select('*', { count: 'exact', head: true });
          
        if (!error && count) {
          total += count;
        }
      }
      
      return total;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
