import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPresenceState } from '@/hooks/usePresenceTracker';
import {
  Wifi,
  Clock,
  CalendarDays,
  Users,
  Trophy,
  BarChart3,
  UserCheck,
  UserPlus,
  MapPin,
  Timer,
  Gift,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ADMIN_EMAILS, isAdminEmail } from '@/lib/adminEmails';
const ADMIN_EMAILS_LIST = `(${ADMIN_EMAILS.map((e) => `"${e}"`).join(',')})`;

interface PresenceUser {
  user_id: string;
  email: string;
  display_name: string;
  current_route: string;
  online_at: string;
}

interface ActivityRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  current_route: string | null;
  last_seen_at: string;
}

interface NormalizedUser {
  id: string;
  email: string;
  name: string;
  route: string | null;
  time: string;
  isOnline: boolean;
  accesses?: number;
}

interface RouteVisit {
  label: string;
  route: string;
  count: number;
  totalMs: number;
}

interface UserDetail {
  userId: string;
  email: string;
  name: string;
  totalAccesses: number;
  distinctDays: number;
  firstSeen: string;
  lastSeen: string;
  isRecurrent: boolean;
  totalTimeMs: number;
  routes: RouteVisit[];
}

const STATIC_ROUTES: Record<string, string> = {
  '/': 'Início',
  '/landing': 'Landing',
  '/auth': 'Autenticação',
  '/onboarding': 'Onboarding',
  '/ferramentas': 'Ferramentas',
  '/ferramentas/locais': 'Locais Jurídicos',
  '/estudos': 'Estudar',
  '/biblioteca': 'Biblioteca',
  '/bibliotecas': 'Biblioteca',
  '/radar-360': 'Radar 360',
  '/radares': 'Radares',
  '/noticias': 'Notícias',
  '/novidades': 'Novidades',
  '/anotacoes': 'Anotações',
  '/configuracoes': 'Configurações',
  '/perfil': 'Perfil',
  '/narracao': 'Narração',
  '/explicacao-lei': 'Explicação de Lei',
  '/resumos-juridicos': 'Resumos Jurídicos',
  '/aprender': 'Aprender',
  '/sobre': 'Sobre',
  '/blog': 'Blog',
  '/newsletter': 'Newsletter',
  '/planos': 'Planos',
  '/assinatura': 'Assinatura',
  '/compartilhado': 'Compartilhado',
  '/grafo-artigos': 'Grafo de Artigos',
  '/tematica-juridica': 'Temática Jurídica',
  '/gerador-post': 'Gerador de Post',
  '/legislacao-estadual': 'Legislação Estadual',
  '/admin-funcoes': 'Admin · Funções',
  '/admin-monitor': 'Admin · Monitor',
  '/admin-monitor-usuarios': 'Admin · Usuários',
};

function titleCase(s: string) {
  return s
    .replace(/[-_+]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.length > 3 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())
    .join(' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function getRouteLabel(route: string | null): string {
  if (!route) return 'Desconhecida';
  const [pathRaw] = route.split('?');
  const path = pathRaw.replace(/\/+$/, '') || '/';
  if (STATIC_ROUTES[path]) return STATIC_ROUTES[path];

  const parts = path.split('/').filter(Boolean).map(safeDecode);
  const seg = (i: number) => parts[i] ? titleCase(parts[i]) : '';

  if (parts[0] === 'bibliotecas' || parts[0] === 'biblioteca') {
    if (parts.length >= 3) return `Biblioteca · ${seg(1)} · ${seg(2)}`;
    if (parts.length === 2) return `Biblioteca · ${seg(1)}`;
    return 'Biblioteca';
  }
  if (parts[0] === 'leitor-nativo') return `Leitor Nativo${parts[1] ? ` · ${seg(1)}` : ''}`;
  if (parts[0] === 'legislacao') {
    if (parts.length >= 3) return `Legislação · ${seg(2)}`;
    if (parts.length === 2) return `Legislação · ${seg(1)}`;
    return 'Legislação';
  }
  if (parts[0] === 'legislacao-estadual') {
    if (parts.length >= 4) return `Lei Estadual · ${parts[1].toUpperCase()} · ${seg(3)}`;
    if (parts.length >= 2) return `Legislação · ${parts[1].toUpperCase()}`;
    return 'Legislação Estadual';
  }
  if (parts[0] === 'aprender') {
    if (parts[1] === 'categoria' && parts[2]) return `Aprender · ${seg(2)}`;
    if (parts[1]) return `Aprender · ${seg(1)}`;
    return 'Aprender';
  }
  if (parts[0] === 'radar') return `Radar · ${seg(1)}`;
  if (parts[0] === 'resumos-juridicos') {
    if (parts.length >= 3) return `Resumo · ${seg(1)} · ${seg(2)}`;
    if (parts.length === 2) return `Resumo · ${seg(1)}`;
    return 'Resumos';
  }
  if (parts[0] === 'ajustes') return `Ajustes · ${seg(1)}`;
  if (parts[0] === 'admin' || parts[0]?.startsWith('admin-')) {
    return `Admin · ${parts.slice(1).map((_, i) => seg(i + 1)).filter(Boolean).join(' · ') || seg(0).replace('Admin', '').trim() || 'Painel'}`;
  }
  if (parts[0] === 'normas') return `Norma · ${seg(1)}`;

  return titleCase(parts.join(' · '));
}

function formatPreciseTime(time: string) {
  const d = new Date(time);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'agora';
  if (diffSec < 60) return `${diffSec}s atrás`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}min atrás`;
  if (diffSec < 86400) return format(d, 'HH:mm', { locale: ptBR });
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

function formatDuration(ms: number) {
  if (!ms || ms < 1000) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}min` : `${h}h`;
}

function buildRouteRank(rows: ActivityRow[]): { label: string; count: number }[] {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const label = getRouteLabel(r.current_route);
    map[label] = (map[label] || 0) + 1;
  });
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

interface MetricCard {
  key: string;
  title: string;
  subtitle: string;
  icon: typeof Wifi;
  iconColor: string;
  iconBg: string;
  badgeBg: string;
  count: number;
  clickable: boolean;
  users?: NormalizedUser[];
}

const AdminMonitorUsuarios = () => {
  const navigate = useNavigate();
  const [realtimeUsers, setRealtimeUsers] = useState<PresenceUser[]>([]);
  const [last5min, setLast5min] = useState<ActivityRow[]>([]);
  const [today, setToday] = useState<ActivityRow[]>([]);
  const [weekData, setWeekData] = useState<ActivityRow[]>([]);
  const [monthData, setMonthData] = useState<ActivityRow[]>([]);

  const [signupsToday, setSignupsToday] = useState(0);
  const [trialClicksToday, setTrialClicksToday] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [premiumUsers, setPremiumUsers] = useState(0);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dateUsers, setDateUsers] = useState<ActivityRow[]>([]);
  const [loadingDate, setLoadingDate] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [rankPeriod, setRankPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll presence state (filter admin)
  useEffect(() => {
    const poll = () => {
      const state = getPresenceState();
      const map = new Map<string, PresenceUser>();
      Object.values(state).forEach((presences: any[]) => {
        presences.forEach((p) => {
          if (isAdminEmail(p.email)) return;
          const existing = map.get(p.user_id);
          if (!existing || new Date(p.online_at) > new Date(existing.online_at)) {
            map.set(p.user_id, {
              user_id: p.user_id,
              email: p.email,
              display_name: p.display_name,
              current_route: p.current_route,
              online_at: p.online_at,
            });
          }
        });
      });
      setRealtimeUsers(Array.from(map.values()));
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch aggregate history
  const fetchHistory = useCallback(async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [r5, rToday, rWeek, rMonth, rSignups, rTrial, rTotal, rPremium] = await Promise.all([
      supabase
        .from('user_activity_log')
        .select('*')
        .gte('last_seen_at', fiveMinAgo)
        .not('email', 'in', ADMIN_EMAILS_LIST)
        .order('last_seen_at', { ascending: false }),
      supabase
        .from('user_activity_log')
        .select('*')
        .gte('last_seen_at', startOfDay.toISOString())
        .not('email', 'in', ADMIN_EMAILS_LIST)
        .order('last_seen_at', { ascending: false }),
      supabase
        .from('user_activity_log')
        .select('*')
        .gte('last_seen_at', startOfWeek.toISOString())
        .not('email', 'in', ADMIN_EMAILS_LIST)
        .order('last_seen_at', { ascending: false }),
      supabase
        .from('user_activity_log')
        .select('*')
        .gte('last_seen_at', startOfMonth.toISOString())
        .not('email', 'in', ADMIN_EMAILS_LIST)
        .order('last_seen_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString()),
      supabase
        .from('app_events' as any)
        .select('id', { count: 'exact', head: true })
        .eq('event_name', 'trial_click')
        .gte('created_at', startOfDay.toISOString()),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
    ]);

    if (r5.data) setLast5min(r5.data as ActivityRow[]);
    if (rToday.data) setToday(rToday.data as ActivityRow[]);
    if (rWeek.data) setWeekData(rWeek.data as ActivityRow[]);
    if (rMonth.data) setMonthData(rMonth.data as ActivityRow[]);
    setSignupsToday(rSignups.count ?? 0);
    setTrialClicksToday(rTrial.count ?? 0);
    setTotalUsers(rTotal.count ?? 0);
    setPremiumUsers(rPremium.count ?? 0);
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 15_000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  // Fetch users for the chosen calendar date (append-only sessions)
  const fetchByDate = useCallback(async (date: Date) => {
    setLoadingDate(true);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const { data } = await supabase
      .from('user_sessions' as any)
      .select('user_id, email, display_name, initial_route, started_at')
      .gte('started_at', start.toISOString())
      .lt('started_at', end.toISOString())
      .not('email', 'in', ADMIN_EMAILS_LIST)
      .order('started_at', { ascending: false })
      .limit(2000);
    if (data) {
      // Normaliza pro shape que o resto do arquivo já espera (ActivityRow)
      setDateUsers(
        (data as any[]).map((r) => ({
          user_id: r.user_id,
          email: r.email,
          display_name: r.display_name,
          current_route: r.initial_route,
          last_seen_at: r.started_at,
        })) as ActivityRow[],
      );
    } else setDateUsers([]);
    setLoadingDate(false);
  }, []);

  useEffect(() => {
    fetchByDate(selectedDate);
  }, [selectedDate, fetchByDate]);

  // Fetch detailed session for a user
  const fetchUserDetail = useCallback(async (user: NormalizedUser) => {
    setLoadingUser(true);

    // Fonte primária de "acessos": user_sessions (append-only).
    const { data: sessions } = await supabase
      .from('user_sessions' as any)
      .select('initial_route, started_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: true })
      .limit(2000);

    // Complementar: rotas visitadas (usa user_activity_log como fallback).
    const { data: activity } = await supabase
      .from('user_activity_log')
      .select('current_route, last_seen_at')
      .eq('user_id', user.id)
      .not('email', 'in', ADMIN_EMAILS_LIST)
      .order('last_seen_at', { ascending: true });

    const sess = ((sessions ?? []) as unknown) as Array<{ initial_route: string | null; started_at: string }>;
    const acts = ((activity ?? []) as unknown) as Array<{ current_route: string | null; last_seen_at: string }>;

    // Contagem de acessos = número de sessions (mínimo 1 se houver activity)
    const totalAccesses = sess.length > 0 ? sess.length : acts.length;
    const daysSet = new Set<string>();
    sess.forEach((s) => daysSet.add(new Date(s.started_at).toDateString()));
    acts.forEach((a) => daysSet.add(new Date(a.last_seen_at).toDateString()));

    // Rotas: combina rotas iniciais das sessões + rotas do activity_log
    const routeMap: Record<string, { count: number; totalMs: number; route: string }> = {};
    let totalTimeMs = 0;
    const combined = [
      ...sess.map((s) => ({ route: s.initial_route, at: s.started_at })),
      ...acts.map((a) => ({ route: a.current_route, at: a.last_seen_at })),
    ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    for (let i = 0; i < combined.length; i++) {
      const r = combined[i];
      const label = getRouteLabel(r.route);
      const bucket = routeMap[label] ?? { count: 0, totalMs: 0, route: r.route || label };
      bucket.count += 1;
      const next = combined[i + 1];
      if (next) {
        const diff = new Date(next.at).getTime() - new Date(r.at).getTime();
        const dwell = diff > 15 * 60 * 1000 ? 5 * 60 * 1000 : Math.max(diff, 0);
        bucket.totalMs += dwell;
        totalTimeMs += dwell;
      }
      routeMap[label] = bucket;
    }

    const routes: RouteVisit[] = Object.entries(routeMap)
      .map(([label, v]) => ({ label, route: v.route, count: v.count, totalMs: v.totalMs }))
      .sort((a, b) => b.totalMs - a.totalMs || b.count - a.count);

    const firstSeen = combined[0]?.at ?? user.time;
    const lastSeen = combined[combined.length - 1]?.at ?? user.time;

    setSelectedUserDetail({
      userId: user.id,
      email: user.email,
      name: user.name,
      totalAccesses,
      distinctDays: daysSet.size,
      firstSeen,
      lastSeen,
      isRecurrent: daysSet.size > 1,
      totalTimeMs,
      routes,
    });
    setLoadingUser(false);
  }, []);

  // Deduplicate date users → count accesses per user
  const dateUniqueUsers: NormalizedUser[] = useMemo(() => {
    const seen = new Map<string, NormalizedUser>();
    for (const u of dateUsers) {
      const existing = seen.get(u.user_id);
      if (existing) {
        existing.accesses = (existing.accesses ?? 0) + 1;
        continue;
      }
      seen.set(u.user_id, {
        id: u.user_id,
        email: u.email ?? '',
        name: u.display_name ?? '',
        route: u.current_route,
        time: u.last_seen_at,
        isOnline: realtimeUsers.some((r) => r.user_id === u.user_id),
        accesses: 1,
      });
    }
    return Array.from(seen.values()).sort((a, b) => (b.accesses ?? 0) - (a.accesses ?? 0));
  }, [dateUsers, realtimeUsers]);

  // Recurrent users today (>=2 rows in month means recurrent)
  const recurrentToday = useMemo(() => {
    const uidsToday = new Set(today.map((t) => t.user_id));
    const map: Record<string, Set<string>> = {};
    monthData.forEach((r) => {
      const day = new Date(r.last_seen_at).toDateString();
      (map[r.user_id] ??= new Set()).add(day);
    });
    let c = 0;
    uidsToday.forEach((uid) => {
      if ((map[uid]?.size ?? 0) > 1) c += 1;
    });
    return c;
  }, [today, monthData]);

  const uniqueTodayUsers = useMemo(() => new Set(today.map((r) => r.user_id)).size, [today]);

  const cards: MetricCard[] = [
    {
      key: 'realtime',
      title: 'Em tempo real',
      subtitle: `${realtimeUsers.length} online`,
      icon: Wifi,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15',
      badgeBg: 'bg-emerald-500',
      count: realtimeUsers.length,
      clickable: true,
      users: realtimeUsers.map((u) => ({
        id: u.user_id,
        email: u.email,
        name: u.display_name,
        route: u.current_route,
        time: u.online_at,
        isOnline: true,
      })),
    },
    {
      key: 'last5',
      title: 'Últimos 5 min',
      subtitle: `${last5min.length} usuários`,
      icon: Clock,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/15',
      badgeBg: 'bg-blue-500',
      count: last5min.length,
      clickable: true,
      users: last5min.map((u) => ({
        id: u.user_id,
        email: u.email ?? '',
        name: u.display_name ?? '',
        route: u.current_route,
        time: u.last_seen_at,
        isOnline: realtimeUsers.some((r) => r.user_id === u.user_id),
      })),
    },
    {
      key: 'today',
      title: 'Ativos hoje',
      subtitle: `${uniqueTodayUsers} únicos`,
      icon: CalendarDays,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/15',
      badgeBg: 'bg-purple-500',
      count: uniqueTodayUsers,
      clickable: true,
      users: dateUniqueUsers,
    },
    {
      key: 'signups',
      title: 'Cadastros hoje',
      subtitle: `${totalUsers} no total`,
      icon: UserPlus,
      iconColor: 'text-pink-400',
      iconBg: 'bg-pink-500/15',
      badgeBg: 'bg-pink-500',
      count: signupsToday,
      clickable: false,
    },
    {
      key: 'trial',
      title: 'Testes clicados',
      subtitle: '7 ou 3 dias grátis',
      icon: Gift,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
      badgeBg: 'bg-amber-500',
      count: trialClicksToday,
      clickable: false,
    },
    {
      key: 'recurrent',
      title: 'Recorrentes hoje',
      subtitle: `${premiumUsers} premium`,
      icon: Repeat,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/15',
      badgeBg: 'bg-cyan-500',
      count: recurrentToday,
      clickable: false,
    },
  ];

  const rankMap = useMemo(
    () => ({
      day: buildRouteRank(today),
      week: buildRouteRank(weekData),
      month: buildRouteRank(monthData),
    }),
    [today, weekData, monthData],
  );
  const rankRows = rankMap[rankPeriod];
  const maxRank = rankRows[0]?.count || 1;

  const activeBlock = cards.find((b) => b.key === selectedBlock);
  const isDetail = !!selectedBlock || !!selectedUserDetail;
  const detailTitle = selectedUserDetail
    ? 'Detalhe do Usuário'
    : selectedBlock
      ? activeBlock?.title
      : '';

  const goBack = () => {
    if (selectedUserDetail) setSelectedUserDetail(null);
    else if (selectedBlock) setSelectedBlock(null);
    else navigate(-1);
  };

  const handleUserClick = (user: NormalizedUser) => fetchUserDetail(user);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateLabel = isToday ? 'Hoje' : format(selectedDate, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        title={isDetail ? (detailTitle ?? 'Detalhe') : 'Usuários Online'}
        onBack={goBack}
        leading={<Users className="w-5 h-5 text-primary" />}
      />

      <AnimatePresence mode="wait">
        {selectedUserDetail ? (
          <motion.div
            key="user-detail-panel"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="p-4 max-w-3xl mx-auto space-y-4"
          >
            <div className="rounded-2xl bg-secondary/40 border border-border/30 p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-foreground uppercase">
                {(selectedUserDetail.email || selectedUserDetail.name)?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {selectedUserDetail.email || selectedUserDetail.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{selectedUserDetail.name}</p>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                    selectedUserDetail.isRecurrent
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-blue-500/20 text-blue-400',
                  )}
                >
                  {selectedUserDetail.isRecurrent ? (
                    <>
                      <UserCheck className="w-3 h-3" /> Recorrente
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3" /> Novo
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total de acessos', value: String(selectedUserDetail.totalAccesses), color: 'text-primary' },
                { label: 'Dias distintos', value: String(selectedUserDetail.distinctDays), color: 'text-cyan-400' },
                { label: 'Tempo total no app', value: formatDuration(selectedUserDetail.totalTimeMs), color: 'text-emerald-400' },
                { label: 'Último acesso', value: formatPreciseTime(selectedUserDetail.lastSeen), color: 'text-amber-400' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-secondary/40 border border-border/30 p-3 text-center">
                  <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-secondary/40 border border-border/30 p-4">
              <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Rotas visitadas
              </p>
              {selectedUserDetail.routes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {selectedUserDetail.routes.map((r, i) => {
                    const maxMs = selectedUserDetail.routes[0]?.totalMs || 1;
                    const pct = Math.max(3, Math.round((r.totalMs / maxMs) * 100));
                    return (
                      <div key={r.label} className="rounded-xl bg-secondary/60 border border-border/20 p-3">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <span className="text-xs font-semibold text-foreground truncate flex-1">{r.label}</span>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 shrink-0">
                            <Timer className="w-3 h-3" />
                            {formatDuration(r.totalMs)}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{r.count} acessos</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.05, duration: 0.5 }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : selectedBlock && activeBlock && activeBlock.clickable ? (
          <motion.div
            key="user-list"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="p-4 max-w-3xl mx-auto space-y-2"
          >
            {!activeBlock.users || activeBlock.users.length === 0 ? (
              <div className="rounded-2xl bg-secondary/30 border border-border/30 py-12 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum usuário neste período</p>
              </div>
            ) : (
              activeBlock.users.map((u, i) => (
                <UserRow key={u.id} user={u} index={i} onClick={handleUserClick} />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -30 }}
            className="p-4 max-w-3xl mx-auto space-y-5"
          >
            {/* ── Métricas (6 cards em grid 3x2) ── */}
            <div className="grid grid-cols-3 gap-2.5">
              {cards.map((c, bi) => {
                const Icon = c.icon;
                const Comp: any = c.clickable ? motion.button : motion.div;
                return (
                  <Comp
                    key={c.key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: bi * 0.05 }}
                    onClick={c.clickable ? () => setSelectedBlock(c.key) : undefined}
                    className={cn(
                      'relative rounded-2xl bg-secondary/40 border border-border/40 p-3 flex flex-col items-center gap-1.5',
                      c.clickable && 'hover:bg-secondary/60 transition-colors active:scale-[0.97] cursor-pointer',
                    )}
                  >
                    <span
                      className={`absolute -top-1.5 -right-1.5 ${c.badgeBg} text-background text-[11px] font-bold min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center shadow`}
                    >
                      {c.count}
                    </span>
                    <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${c.iconColor}`} />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground text-center leading-tight">
                      {c.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground text-center">{c.subtitle}</span>
                    {c.key === 'realtime' && c.count > 0 && (
                      <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ao vivo
                      </span>
                    )}
                  </Comp>
                );
              })}
            </div>

            {/* ── Conversão (barra) ── */}
            <div className="rounded-2xl bg-secondary/40 border border-border/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Conversão de teste hoje</p>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {signupsToday > 0 ? Math.round((trialClicksToday / signupsToday) * 100) : 0}% cadastros → trial
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-pink-500/10 border border-pink-500/20 p-2">
                  <p className="text-lg font-bold text-pink-400">{signupsToday}</p>
                  <p className="text-[10px] text-muted-foreground">Cadastros</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2">
                  <p className="text-lg font-bold text-amber-400">{trialClicksToday}</p>
                  <p className="text-[10px] text-muted-foreground">Cliques em teste</p>
                </div>
              </div>
            </div>

            {/* ── Online agora ── */}
            <div className="rounded-2xl bg-secondary/40 border border-border/30 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xs font-bold text-foreground">Online agora</p>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {realtimeUsers.length} conectado{realtimeUsers.length === 1 ? '' : 's'}
                </span>
              </div>
              {realtimeUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Ninguém online no momento</p>
              ) : (
                <div className="divide-y divide-border/20 max-h-72 overflow-y-auto">
                  {realtimeUsers.map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() =>
                        handleUserClick({
                          id: u.user_id,
                          email: u.email,
                          name: u.display_name,
                          route: u.current_route,
                          time: u.online_at,
                          isOnline: true,
                        })
                      }
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/70 transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-foreground uppercase">
                          {(u.email || u.display_name)?.[0] ?? '?'}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {u.display_name || u.email}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-medium text-primary truncate max-w-[120px]">
                          {getRouteLabel(u.current_route)}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{formatPreciseTime(u.online_at)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Date picker + Usuários do dia (com contagem de acessos) ── */}
            <div className="rounded-2xl bg-secondary/40 border border-border/30 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Usuários do dia</p>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="secondary" size="sm" className="ml-auto h-7 text-[11px] gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {dateLabel}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => {
                        if (d) {
                          const nd = new Date(d);
                          nd.setHours(0, 0, 0, 0);
                          setSelectedDate(nd);
                          setCalendarOpen(false);
                        }
                      }}
                      disabled={(d) => d > new Date()}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {loadingDate ? (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : dateUniqueUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum usuário neste dia</p>
              ) : (
                <div className="divide-y divide-border/20 max-h-96 overflow-y-auto">
                  {dateUniqueUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleUserClick(u)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/70 transition-colors text-left"
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-foreground uppercase">
                          {(u.email || u.name)?.[0] ?? '?'}
                        </div>
                        {u.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{u.name || u.email}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                          {u.accesses ?? 1}× acessos
                        </span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          último {formatPreciseTime(u.time)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Rank de Funções ── */}
            <div className="rounded-2xl bg-secondary/40 border border-border/30 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Rank de Funções</p>
                <div className="ml-auto flex items-center gap-1 bg-muted/40 rounded-full p-0.5">
                  {(['day', 'week', 'month'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setRankPeriod(k)}
                      className={cn(
                        'text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors',
                        rankPeriod === k
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {k === 'day' ? 'Hoje' : k === 'week' ? 'Semana' : 'Mês'}
                    </button>
                  ))}
                </div>
              </div>

              {rankRows.length === 0 ? (
                <div className="py-8 text-center">
                  <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Sem dados neste período</p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {rankRows.map((r, i) => {
                    const pct = Math.round((r.count / maxRank) * 100);
                    return (
                      <div key={r.label} className="px-4 py-2.5">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span
                            className={cn(
                              'text-sm font-bold w-7 text-center shrink-0',
                              i < 3 ? MEDAL_COLORS[i] : 'text-muted-foreground',
                            )}
                          >
                            {i < 3 ? MEDAL[i] : `#${i + 1}`}
                          </span>
                          <span className="text-xs font-semibold text-foreground flex-1 truncate">{r.label}</span>
                          <span className="text-xs font-bold text-primary shrink-0">{r.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden ml-10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.04, duration: 0.4 }}
                            className="h-full rounded-full bg-primary"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loadingUser && (
        <div className="fixed inset-0 z-50 bg-background/60 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

function UserRow({
  user,
  index,
  onClick,
}: {
  user: NormalizedUser;
  index: number;
  onClick: (u: NormalizedUser) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onClick(user)}
      className="w-full text-left rounded-xl bg-secondary/40 border border-border/30 p-3 flex items-center gap-3 hover:bg-secondary/60 transition-colors active:scale-[0.98]"
    >
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground uppercase">
          {(user.email || user.name)?.[0] ?? '?'}
        </div>
        {user.isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{user.name || user.email}</p>
        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
      </div>
      <div className="text-right shrink-0">
        {user.accesses != null ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
            {user.accesses}× acessos
          </span>
        ) : (
          <p className="text-[10px] font-medium text-primary truncate max-w-[130px]">
            {getRouteLabel(user.route)}
          </p>
        )}
        <p className="text-[9px] text-muted-foreground mt-0.5">{formatPreciseTime(user.time)}</p>
      </div>
    </motion.button>
  );
}

export default AdminMonitorUsuarios;
