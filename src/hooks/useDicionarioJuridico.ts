import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DicionarioTermo {
  letra: string;
  palavra: string;
  significado: string;
  exemplo_pratico: string | null;
}

const CACHE_KEY = "dicionario_juridico_v1";

function readCache(): DicionarioTermo[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(rows: DicionarioTermo[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {
    // ignore quota errors
  }
}

export function useDicionarioJuridico() {
  return useQuery({
    queryKey: ["dicionario_juridico"],
    initialData: () => readCache() ?? undefined,
    staleTime: 1000 * 60 * 60 * 24, // 24h
    queryFn: async (): Promise<DicionarioTermo[]> => {
      const pageSize = 1000;
      const all: DicionarioTermo[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("dicionario_juridico")
          .select("letra,palavra,significado,exemplo_pratico")
          .order("palavra", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) {
          const cached = readCache();
          if (cached) return cached;
          throw error;
        }
        const rows = (data ?? []) as DicionarioTermo[];
        all.push(...rows);
        if (rows.length < pageSize) break;
      }
      writeCache(all);
      return all;
    },
  });
}