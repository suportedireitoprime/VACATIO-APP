import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DicionarioStat {
  palavra: string;
  clicks: number;
}

const STATS_CACHE_KEY = "dicionario_stats_v1";

function readStatsCache(): DicionarioStat[] | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STATS_CACHE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeStatsCache(data: DicionarioStat[]) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(data.slice(0, 200)));
    }
  } catch {}
}

export function useDicionarioStats() {
  return useQuery({
    queryKey: ["dicionario_termo_stats"],
    initialData: () => readStatsCache() ?? undefined,
    staleTime: 1000 * 60 * 15, // 15 min
    queryFn: async (): Promise<DicionarioStat[]> => {
      const { data, error } = await supabase
        .from("dicionario_termo_stats")
        .select("palavra,clicks")
        .order("clicks", { ascending: false })
        .limit(200);
      if (error) {
        return readStatsCache() ?? [];
      }
      const rows = (data ?? []) as DicionarioStat[];
      if (rows.length > 0) {
        writeStatsCache(rows);
      }
      return rows;
    },
  });
}
