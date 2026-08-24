import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Session {
  id: string;
  tabela_nome: string;
  artigo_numero: string;
  mode: string;
  total: number;
  correct: number;
  created_at: string;
}

export const TABLE_NAMES: Record<string, string> = {
  CF88_CONSTITUICAO_FEDERAL: 'CF/88',
  CP_CODIGO_PENAL: 'Código Penal',
  CC_CODIGO_CIVIL: 'Código Civil',
  CPC_CODIGO_PROCESSO_CIVIL: 'CPC',
  CPP_CODIGO_PROCESSO_PENAL: 'CPP',
  CTN_CODIGO_TRIBUTARIO_NACIONAL: 'CTN',
  CDC_CODIGO_DEFESA_CONSUMIDOR: 'CDC',
  CLT_CONSOLIDACAO_LEIS_TRABALHO: 'CLT',
  CTB_CODIGO_TRANSITO_BRASILEIRO: 'CTB',
  ECA_ESTATUTO_CRIANCA_ADOLESCENTE: 'ECA',
  EI_ESTATUTO_IDOSO: 'Est. Idoso',
  EPD_ESTATUTO_PESSOA_DEFICIENCIA: 'EPD',
};

export function useStudyStats() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [lawStats, setLawStats] = useState<{ tabela: string; nome: string; pct: number; total: number; correct: number; sessions: number }[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      // Load sessions for article-level stats
      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .select('id,tabela_nome,artigo_numero,mode,total,correct,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10000);
      setSessions((sessionsData as Session[]) || []);

      // Use RPC for aggregated law stats
      const { data: rpcData } = await supabase.rpc('estatisticas_estudo', { p_user_id: user.id });
      if (rpcData) {
        setLawStats((rpcData as any[]).map((r: any) => ({
          tabela: r.tabela_nome,
          nome: TABLE_NAMES[r.tabela_nome] || r.tabela_nome,
          pct: r.pct_acerto,
          total: Number(r.total_questoes),
          correct: Number(r.total_corretas),
          sessions: Number(r.total_sessoes),
        })));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const totalSessions = sessions.length;
  const totalQuestions = sessions.reduce((a, s) => a + s.total, 0);
  const totalCorrect = sessions.reduce((a, s) => a + s.correct, 0);
  const avgPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const articleStats = useMemo(() => {
    const map: Record<string, { total: number; correct: number; pct: number }> = {};
    sessions.forEach(s => {
      const key = `${s.tabela_nome}:${s.artigo_numero}`;
      if (!map[key]) map[key] = { total: 0, correct: 0, pct: 0 };
      map[key].total += s.total;
      map[key].correct += s.correct;
    });
    Object.values(map).forEach(v => {
      v.pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
    });
    return map;
  }, [sessions]);

  return { sessions, loading, lawStats, articleStats, totalSessions, totalQuestions, totalCorrect, avgPct, user };
}
