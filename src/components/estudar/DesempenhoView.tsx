import { useMemo } from 'react';
import { ArrowLeft, Loader2, BookOpen, Target, TrendingDown, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudyStats, TABLE_NAMES } from '@/hooks/useStudyStats';

interface Props {
  onBack: () => void;
}

const DesempenhoView = ({ onBack }: Props) => {
  const { sessions, loading, lawStats, totalSessions, totalQuestions, avgPct } = useStudyStats();

  // Heatmap data: last 90 days
  const heatmap = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    sessions.forEach(s => {
      const day = s.created_at.split('T')[0];
      if (days[day] !== undefined) days[day]++;
    });
    return Object.entries(days);
  }, [sessions]);

  // Weakest articles
  const weakArticles = useMemo(() => {
    const map: Record<string, { total: number; correct: number; tabela: string; artigo: string }> = {};
    sessions.filter(s => s.mode === 'questoes').forEach(s => {
      const key = `${s.tabela_nome}:${s.artigo_numero}`;
      if (!map[key]) map[key] = { total: 0, correct: 0, tabela: s.tabela_nome, artigo: s.artigo_numero };
      map[key].total += s.total;
      map[key].correct += s.correct;
    });
    return Object.values(map)
      .filter(v => v.total >= 3)
      .map(v => ({ ...v, pct: Math.round((v.correct / v.total) * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
  }, [sessions]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-20">
      <div className="bg-gradient-to-br from-card to-secondary px-4 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="font-display text-2xl text-white font-bold">Meu Desempenho</h1>
          <p className="text-white/70 text-sm">Acompanhe sua evolução nos estudos</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sessões', value: totalSessions, icon: BookOpen },
            { label: 'Questões', value: totalQuestions, icon: Target },
            { label: 'Acerto', value: `${avgPct}%`, icon: TrendingDown },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-3 rounded-xl bg-card border border-border text-center">
              <s.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Calendário de Estudo</p>
          </div>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(13, 1fr)', gridTemplateRows: 'repeat(7, 1fr)' }}>
            {heatmap.map(([date, count]) => {
              let bg = 'bg-muted/30';
              if (count === 1) bg = 'bg-primary/30';
              else if (count === 2) bg = 'bg-primary/50';
              else if (count >= 3) bg = 'bg-primary/80';
              return (
                <div key={date} className={`aspect-square rounded-sm ${bg} transition-colors`} title={`${date}: ${count} sessão(ões)`} />
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2 justify-end">
            <span className="text-[10px] text-muted-foreground">Menos</span>
            <div className="w-3 h-3 rounded-sm bg-muted/30" />
            <div className="w-3 h-3 rounded-sm bg-primary/30" />
            <div className="w-3 h-3 rounded-sm bg-primary/50" />
            <div className="w-3 h-3 rounded-sm bg-primary/80" />
            <span className="text-[10px] text-muted-foreground">Mais</span>
          </div>
        </div>

        {/* Áreas de domínio */}
        {lawStats.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm font-semibold text-foreground mb-3">Áreas de Domínio</p>
            <div className="space-y-2.5">
              {lawStats.map(s => (
                <div key={s.tabela}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{s.nome}</span>
                    <span className={`text-xs font-bold ${s.pct >= 70 ? 'text-emerald-500' : s.pct >= 40 ? 'text-primary' : 'text-red-500'}`}>{s.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${s.pct >= 70 ? 'bg-emerald-500' : s.pct >= 40 ? 'bg-primary' : 'bg-red-500'}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Precisa melhorar */}
        {weakArticles.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm font-semibold text-foreground mb-3">Precisa Melhorar</p>
            <div className="space-y-2">
              {weakArticles.map(a => (
                <div key={`${a.tabela}:${a.artigo}`} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-xs font-medium text-foreground">Art. {a.artigo}</p>
                    <p className="text-[10px] text-muted-foreground">{TABLE_NAMES[a.tabela] || a.tabela}</p>
                  </div>
                  <span className="text-xs font-bold text-red-500">{a.pct}% acerto</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma sessão de estudo ainda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Comece respondendo questões ou usando flashcards!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesempenhoView;
