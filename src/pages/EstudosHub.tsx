import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Video,
  HelpCircle,
  Layers,
  FileText,
  ClipboardList,
  Flame,
  Target,
  TrendingUp,
  BookOpen,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useStudyStats, TABLE_NAMES } from '@/hooks/useStudyStats';
import { track } from '@/lib/analyticsEvents';


const STUDY_FEATURES = [
  {
    id: 'questoes',
    label: 'Questões',
    icon: HelpCircle,
    color: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-500',
    route: '/estudos?mode=questoes',
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    icon: Layers,
    color: 'from-purple-500 to-purple-600',
    iconBg: 'bg-purple-500/15',
    iconColor: 'text-purple-500',
    route: '/estudos?mode=flashcards',
  },
  {
    id: 'resumos',
    label: 'Resumos Jurídicos',
    icon: FileText,
    color: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-500',
    route: '/resumos-juridicos',
  },
  {
    id: 'videoaulas',
    label: 'Videoaulas',
    icon: Video,
    color: 'from-red-500 to-red-600',
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-500',
    route: null,
  },
  {
    id: 'plano',
    label: 'Plano',
    icon: CalendarCheck,
    color: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-500',
    route: null,
  },
];

const WEEK_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAILY_GOAL = 5;
// Próxima prova OAB (ajustar conforme calendário oficial)
const NEXT_EXAM = new Date('2026-07-20');

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const toDayKey = (d: Date) => d.toISOString().split('T')[0];

const EstudosHub = () => {
  const navigate = useNavigate();
  const { sessions, lawStats, totalSessions, totalQuestions, avgPct, loading } = useStudyStats();

  const today = useMemo(() => new Date(), []);
  const todayKey = toDayKey(today);

  // Sessions per day map
  const sessionsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => {
      const k = s.created_at.split('T')[0];
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [sessions]);

  // Daily goal progress
  const todayCount = sessionsByDay[todayKey] || 0;
  const goalPct = Math.min(100, Math.round((todayCount / DAILY_GOAL) * 100));

  // Streak (consecutive days ending today or yesterday)
  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date(today);
    // If today has activity, start at today; otherwise start at yesterday
    if (!sessionsByDay[toDayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (sessionsByDay[toDayKey(cursor)]) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [sessionsByDay, today]);

  // Week strip — Sunday to Saturday of current week
  const weekDays = useMemo(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toDayKey(d);
      return {
        key,
        date: d,
        label: WEEK_LABELS[i],
        dayNum: d.getDate(),
        count: sessionsByDay[key] || 0,
        isToday: key === todayKey,
        isFuture: d > today,
      };
    });
  }, [sessionsByDay, today, todayKey]);

  // Days until OAB exam
  const daysToExam = useMemo(() => {
    const diff = Math.ceil((NEXT_EXAM.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }, [today]);

  // Weak articles (≥3 attempts, lowest accuracy)
  const weakArticles = useMemo(() => {
    const map: Record<string, { total: number; correct: number; tabela: string; artigo: string }> = {};
    sessions
      .filter((s) => s.mode === 'questoes')
      .forEach((s) => {
        const key = `${s.tabela_nome}:${s.artigo_numero}`;
        if (!map[key]) map[key] = { total: 0, correct: 0, tabela: s.tabela_nome, artigo: s.artigo_numero };
        map[key].total += s.total;
        map[key].correct += s.correct;
      });
    return Object.values(map)
      .filter((v) => v.total >= 3)
      .map((v) => ({ ...v, pct: Math.round((v.correct / v.total) * 100) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);
  }, [sessions]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* Header */}
      <PageHeader
        title="Estudos"
        subtitle="Sua central OAB"
        onBack={() => navigate('/')}
        rightAction={
          streak > 0 ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-bold text-orange-500">{streak}</span>
            </div>
          ) : undefined
        }
      />


      <div className="px-4 pt-5 space-y-5">
        {/* Motivational Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground"
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-body opacity-90">{getGreeting()}, futuro(a) advogado(a)!</span>
            </div>
            <h2 className="font-display text-xl font-bold leading-tight">
              {daysToExam ? `Faltam ${daysToExam} dias para a OAB` : 'Continue firme nos estudos'}
            </h2>
            <p className="text-xs opacity-80 font-body mt-1">
              {todayCount > 0
                ? `Você já completou ${todayCount} ${todayCount === 1 ? 'sessão' : 'sessões'} hoje 🎯`
                : 'Comece o dia com uma prática rápida'}
            </p>
          </div>
        </motion.div>

        {/* Daily Goal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 rounded-2xl bg-card border border-border"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Meta diária</p>
                <p className="text-[11px] text-muted-foreground font-body">
                  {todayCount}/{DAILY_GOAL} atividades
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-primary">{goalPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goalPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            />
          </div>
          {goalPct >= 100 && (
            <p className="text-[11px] text-emerald-500 font-medium mt-2">🎉 Meta concluída! Excelente trabalho.</p>
          )}
        </motion.div>

        {/* Week Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-card border border-border"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Esta semana</p>
            <span className="text-[11px] text-muted-foreground font-body">
              {weekDays.filter((d) => d.count > 0).length}/7 dias ativos
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((d) => {
              let dotClass = 'bg-muted';
              if (d.count >= 3) dotClass = 'bg-emerald-500';
              else if (d.count === 2) dotClass = 'bg-primary';
              else if (d.count === 1) dotClass = 'bg-primary/50';
              return (
                <div
                  key={d.key}
                  className={`flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all ${
                    d.isToday ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                  } ${d.isFuture ? 'opacity-40' : ''}`}
                >
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">{d.label}</span>
                  <span
                    className={`text-xs font-bold ${d.isToday ? 'text-primary' : 'text-foreground'}`}
                  >
                    {d.dayNum}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Praticar Agora */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-display font-bold text-foreground">Praticar agora</h3>
            <span className="text-[11px] text-muted-foreground font-body">6 módulos</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {STUDY_FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isAvailable = !!f.route;
              return (
                <motion.button
                  key={f.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  whileTap={isAvailable ? { scale: 0.95 } : undefined}
                  onClick={() => { track('estudos_feature_click', { feature_id: f.id, feature_label: f.label, available: isAvailable }); if (isAvailable) navigate(f.route!); }}
                  disabled={!isAvailable}
                  data-track="estudos_feature_click"
                  data-feature-id={f.id}
                  data-feature-label={f.label}
                  className={`relative aspect-square flex flex-col items-center justify-center gap-2 p-2 rounded-2xl border border-border bg-card transition-all ${
                    isAvailable ? 'hover:border-primary/30 hover:shadow-sm' : 'opacity-60'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl ${f.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${f.iconColor}`} />
                  </div>
                  <span className="text-[12px] font-semibold text-foreground font-body text-center leading-tight">
                    {f.label}
                  </span>
                  {!isAvailable && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-body bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                      Em breve
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        {!loading && totalSessions > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-display font-bold text-foreground">Seu desempenho</h3>
              <button
                onClick={() => { track('estudos_desempenho_click'); navigate('/estudos?view=desempenho'); }}
                data-track="estudos_desempenho_click"
                className="text-[11px] text-primary font-semibold"
              >
                Ver tudo →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Sessões', value: totalSessions, icon: BookOpen, color: 'text-blue-500' },
                { label: 'Questões', value: totalQuestions, icon: Target, color: 'text-purple-500' },
                { label: 'Acerto', value: `${avgPct}%`, icon: TrendingUp, color: 'text-emerald-500' },
              ].map((s) => (
                <div key={s.label} className="p-3 rounded-xl bg-card border border-border text-center">
                  <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                  <p className="text-base font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-body">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Áreas de Domínio */}
        {lawStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-4 rounded-2xl bg-card border border-border"
          >
            <p className="text-sm font-semibold text-foreground mb-3">Áreas de domínio</p>
            <div className="space-y-2.5">
              {lawStats.slice(0, 4).map((s) => (
                <div key={s.tabela}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{s.nome}</span>
                    <span
                      className={`text-xs font-bold ${
                        s.pct >= 70 ? 'text-emerald-500' : s.pct >= 40 ? 'text-primary' : 'text-red-500'
                      }`}
                    >
                      {s.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        s.pct >= 70 ? 'bg-emerald-500' : s.pct >= 40 ? 'bg-primary' : 'bg-red-500'
                      }`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Precisa Revisar */}
        {weakArticles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-2xl bg-card border border-border"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm font-semibold text-foreground">Precisa revisar</p>
            </div>
            <div className="space-y-1">
              {weakArticles.map((a) => (
                <button
                  key={`${a.tabela}:${a.artigo}`}
                  onClick={() => navigate(`/estudos?mode=questoes&tabela=${a.tabela}&artigo=${a.artigo}`)}
                  className="w-full flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Art. {a.artigo}</p>
                    <p className="text-[10px] text-muted-foreground font-body truncate">
                      {TABLE_NAMES[a.tabela] || a.tabela}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-red-500">{a.pct}%</span>
                    <span className="text-[10px] text-primary font-semibold">Treinar →</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && totalSessions === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-secondary to-card border border-border text-center"
          >
            <BookOpen className="w-10 h-10 mx-auto text-primary/60 mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">Comece sua jornada OAB</p>
            <p className="text-xs text-muted-foreground font-body mb-4">
              Responda questões ou use flashcards para acompanhar sua evolução aqui.
            </p>
            <button
              onClick={() => navigate('/estudos?mode=questoes')}
              className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Praticar agora
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EstudosHub;
