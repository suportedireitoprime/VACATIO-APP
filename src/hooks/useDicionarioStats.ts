import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DicionarioStat {
  palavra: string;
  clicks: number;
}

export function useDicionarioStats() {
  return useQuery({
    queryKey: ["dicionario_termo_stats"],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<DicionarioStat[]> => {
      const { data, error } = await supabase
        .from("dicionario_termo_stats")
        .select("palavra,clicks")
        .order("clicks", { ascending: false })
        .limit(200);
      if (error) return [];
      return (data ?? []) as DicionarioStat[];
    },
  });
}
