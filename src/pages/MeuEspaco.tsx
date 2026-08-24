import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Camera, Pencil, Check,
  StickyNote, Highlighter, Star, BookMarked,
  Scale, FileText, Film, Gavel, BookOpen, Sparkles, Calendar,
} from "lucide-react";
import { haptic } from "@/lib/nativeHaptics";
import { supabase } from "@/integrations/supabase/client";
import { flushAppMetricsNow } from "@/lib/appMetrics";
import { PESSOAL_COVERS, getCoverSrc, getCoverLqip, preloadCover } from "@/assets/pessoal/covers";
import { getCache, setCache } from "@/lib/pessoalCache";
import { useProfileSummary } from "@/hooks/useProfileSummary";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMeuEspacoFeed, MEU_ESPACO_FEED_KEY, type MeuEspacoFeedItem } from "@/services/meuEspacoFeed";
import { prefetchAllPessoal, prefetchPessoalByPath } from "@/services/pessoalPrefetch";
import { track } from "@/lib/analyticsEvents";

const PESSOAL_SNAP = "sheet_snapshot";
const prefetchRoute = (path: string) => {
  switch (path) {
    case '/pessoal/leis': import("@/pages/pessoal/Leis.tsx"); break;
    case '/pessoal/artigos': import("@/pages/pessoal/Artigos.tsx"); break;
    case '/pessoal/anotacoes': import("@/pages/pessoal/Anotacoes.tsx"); break;
    case '/pessoal/grifos': import("@/pages/pessoal/Grifos.tsx"); break;
    case '/pessoal/livros': import("@/pages/pessoal/Livros.tsx"); break;
    case '/pessoal/filmes': import("@/pages/pessoal/Filmes.tsx"); break;
    case '/pessoal/jurisprudencias': import("@/pages/pessoal/Jurisprudencias.tsx"); break;
    case '/pessoal/tematicas': import("@/pages/pessoal/Tematicas.tsx"); break;
  }
};

const KIND_LABEL: Record<MeuEspacoFeedItem['kind'], string> = {
  anotacao: 'Anotação',
  grifo: 'Grifo',
  artigo: 'Artigo favorito',
  lei: 'Lei acessada',
  livro: 'Livro favorito',
  jurisprudencia: 'Jurisprudência',
  tematica: 'Temática',
};

const KIND_ICON: Record<MeuEspacoFeedItem['kind'], any> = {
  anotacao: StickyNote, grifo: Highlighter, artigo: Star,
  lei: Scale, livro: BookMarked, jurisprudencia: Gavel, tematica: Film,
};

// ---------- Calendar helpers ----------
const WEEKDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 7 dias começando em hoje (à esquerda) e retrocedendo. */
function getDayList(days = 7): Date[] {
  const out: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d);
  }
  return out;
}

function dayShortLabel(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return WEEKDAY[d.getDay()];
}

function formatFullDate(d: Date) {
  return `${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatEventLabel(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  const hh = formatTime(ts);
  if (diff === 0) return `hoje, ${hh}`;
  if (diff === 1) return `ontem, ${hh}`;
  const dd = String(new Date(ts).getDate()).padStart(2, '0');
  const mm = String(new Date(ts).getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}, ${hh}`;
}

const MeuEspaco = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: summary } = useProfileSummary();

  // Estado local editável (bio / capa) — inicial vem do React Query (persistido).
  const [bioDraft, setBioDraft] = useState<string>('');
  const [editingBio, setEditingBio] = useState(false);
  const [capaOverride, setCapaOverride] = useState<string | null>(null);
  const [bioOverride, setBioOverride] = useState<string | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => toYMD(new Date()));

  // Snapshot local para paint imediato antes do React Query reidratar.
  const initialSnap: any = getCache(PESSOAL_SNAP);
  const snapFeed: MeuEspacoFeedItem[] = Array.isArray(initialSnap?.feed) ? initialSnap.feed : [];
  const snapFavTotal = Number(initialSnap?.favTotal ?? 0);
  const snapLeis = Number(initialSnap?.leisCount ?? 0);
  const snapArt = Number(initialSnap?.artigosCount ?? 0);
  const snapLeituras = Number(initialSnap?.leiturasCount ?? 0);

  const feedQuery = useQuery({
    queryKey: MEU_ESPACO_FEED_KEY(user?.id),
    enabled: !!user?.id,
    queryFn: () => fetchMeuEspacoFeed(user!.id),
    staleTime: 60_000,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    placeholderData: (prev) => prev,
    initialData: snapFeed.length
      ? { feed: snapFeed, favTotal: snapFavTotal, leisCount: snapLeis, artigosCount: snapArt, leiturasCount: snapLeituras }
      : undefined,
  });

  const feed: MeuEspacoFeedItem[] = feedQuery.data?.feed ?? snapFeed;
  const leisCount = feedQuery.data?.leisCount ?? snapLeis;
  const artigosCount = feedQuery.data?.artigosCount ?? snapArt;
  const leiturasCount = feedQuery.data?.leiturasCount ?? snapLeituras;

  const displayName = summary?.displayName ?? initialSnap?.displayName ?? (user?.email?.split('@')[0] ?? 'Você');
  const isPremium = summary?.isPremium ?? !!initialSnap?.isPremium;
  const avatarUrl =
    summary?.avatarUrl ||
    initialSnap?.avatarUrl ||
    (user?.user_metadata as any)?.avatar_url ||
    (user?.user_metadata as any)?.picture ||
    '';
  const bio = bioOverride ?? summary?.bio ?? initialSnap?.bio ?? '';
  const capaId = capaOverride ?? summary?.capaId ?? initialSnap?.capaId ?? 'capa1';
  const email = summary?.email || user?.email || initialSnap?.email || '';

  const handle = useMemo(() => {
    const base = (email.split('@')[0] || 'usuario').toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return `@${base}`;
  }, [email]);

  // Flush métricas — fire-and-forget, sem bloquear o paint.
  useEffect(() => {
    if (!user?.id) return;
    flushAppMetricsNow().then(() => {
      qc.invalidateQueries({ queryKey: ['profile-summary', user.id] });
    }).catch(() => {});
  }, [user?.id, qc]);

  // Persiste snapshot em localStorage sempre que a query real chegar.
  useEffect(() => {
    if (!user?.id || !feedQuery.data) return;
    try {
      const prevSnap: any = getCache(PESSOAL_SNAP) || {};
      setCache(PESSOAL_SNAP, {
        ...prevSnap,
        email: user.email ?? '',
        displayName,
        isPremium,
        avatarUrl,
        bio,
        capaId,
        favTotal: feedQuery.data.favTotal,
        leisCount: feedQuery.data.leisCount,
        artigosCount: feedQuery.data.artigosCount,
        leiturasCount: feedQuery.data.leiturasCount,
        feed: feedQuery.data.feed,
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedQuery.data, user?.id]);

  // Prefetch das subpáginas /pessoal/* em idle.
  useEffect(() => {
    if (!user?.id) return;
    const idle: any = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    const cancelIdle: any = (window as any).cancelIdleCallback ?? clearTimeout;
    const uid = user.id;
    const handle = idle(() => {
      prefetchAllPessoal(qc, uid);
      import('@/pages/pessoal/Leis.tsx');
      import('@/pages/pessoal/Artigos.tsx');
      import('@/pages/pessoal/Anotacoes.tsx');
      import('@/pages/pessoal/Grifos.tsx');
      import('@/pages/pessoal/Livros.tsx');
      import('@/pages/pessoal/Filmes.tsx');
      import('@/pages/pessoal/Jurisprudencias.tsx');
      import('@/pages/pessoal/Tematicas.tsx');
    });
    return () => { try { cancelIdle(handle); } catch {} };
  }, [user?.id, qc]);

  // Revalida stats ao receber flush do appMetrics.
  useEffect(() => {
    if (!user?.id) return;
    const handler = () => qc.invalidateQueries({ queryKey: ['profile-summary', user.id] });
    window.addEventListener('app-metrics-flushed', handler);
    return () => window.removeEventListener('app-metrics-flushed', handler);
  }, [user?.id, qc]);

  // Persiste summary no snapshot.
  useEffect(() => {
    if (!summary) return;
    try {
      const prev: any = getCache(PESSOAL_SNAP) || {};
      setCache(PESSOAL_SNAP, {
        ...prev,
        email: summary.email || prev.email || '',
        displayName: summary.displayName || prev.displayName || '',
        isPremium: summary.isPremium ?? prev.isPremium ?? false,
        avatarUrl: summary.avatarUrl || prev.avatarUrl || '',
        bio: summary.bio ?? prev.bio ?? '',
        capaId: summary.capaId || prev.capaId || 'capa1',
      });
    } catch {}
  }, [summary]);

  const saveBio = async () => {
    if (!user?.id) return;
    const val = bioDraft.trim().slice(0, 240);
    setBioOverride(val);
    setEditingBio(false);
    const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    if (online) {
      const { error } = await supabase.from('profiles').update({ bio: val }).eq('id', user.id);
      if (error) {
        try {
          const { syncQueue } = await import('@/services/syncQueue');
          await syncQueue.enqueue({ kind: 'table.update', table: 'profiles', match: { id: user.id }, values: { bio: val } });
        } catch {}
      }
    } else {
      try {
        const { syncQueue } = await import('@/services/syncQueue');
        await syncQueue.enqueue({ kind: 'table.update', table: 'profiles', match: { id: user.id }, values: { bio: val } });
      } catch {}
    }
    qc.invalidateQueries({ queryKey: ['profile-summary', user.id] });
    haptic.success();
  };

  const pickCover = async (id: string) => {
    setCapaOverride(id);
    setCoverPickerOpen(false);
    haptic.selection();
    if (user?.id) {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
      if (online) {
        const { error } = await supabase.from('profiles').update({ capa_id: id }).eq('id', user.id);
        if (error) {
          try {
            const { syncQueue } = await import('@/services/syncQueue');
            await syncQueue.enqueue({ kind: 'table.update', table: 'profiles', match: { id: user.id }, values: { capa_id: id } });
          } catch {}
        }
      } else {
        try {
          const { syncQueue } = await import('@/services/syncQueue');
          await syncQueue.enqueue({ kind: 'table.update', table: 'profiles', match: { id: user.id }, values: { capa_id: id } });
        } catch {}
      }
      qc.invalidateQueries({ queryKey: ['profile-summary', user.id] });
    }
  };

  const go = (path: string) => {
    haptic.selection();
    track('meu_espaco_acesso_rapido', { path });
    navigate(path);
  };

  const goBack = () => {
    haptic.selection();
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const QUICK = [
    { label: 'Minhas anotações', icon: StickyNote, path: '/pessoal/anotacoes' },
    { label: 'Meus grifos', icon: Highlighter, path: '/pessoal/grifos' },
    { label: 'Livros', icon: BookOpen, path: '/pessoal/livros' },
    { label: 'Filmes', icon: Film, path: '/pessoal/filmes' },
    { label: 'Jurisprudências', icon: Gavel, path: '/pessoal/jurisprudencias' },
    { label: 'Temáticas', icon: Star, path: '/pessoal/tematicas' },
  ];

  // ---------- Calendar & agrupamento por dia ----------
  const dayList = useMemo(() => getDayList(7), []);
  const feedByDay = useMemo(() => {
    const m = new Map<string, MeuEspacoFeedItem[]>();
    for (const it of feed) {
      const key = toYMD(new Date(it.ts));
      const arr = m.get(key) ?? [];
      arr.push(it);
      m.set(key, arr);
    }
    return m;
  }, [feed]);

  const eventsOfDay = useMemo(() => (feedByDay.get(selectedDate) ?? []).sort((a, b) => b.ts - a.ts), [feedByDay, selectedDate]);

  return (
    <div className="min-h-[100dvh] bg-background overflow-y-auto">
      {/* Cover */}
      <div
        className="relative w-full h-52 sm:h-64 bg-secondary overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${getCoverLqip(capaId)})` }}
      >
        <img
          key={capaId}
          src={getCoverSrc(capaId)}
          alt="Capa do perfil"
          loading="eager"
          decoding="sync"
          {...({ fetchpriority: 'high' } as any)}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background" />
        <button
          onClick={goBack}
          aria-label="Voltar"
          className="absolute top-[calc(0.75rem+var(--sai-top,env(safe-area-inset-top,0px)))] left-3 w-11 h-11 rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white active:scale-95 transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCoverPickerOpen(true)}
          className="absolute top-[calc(0.75rem+var(--sai-top,env(safe-area-inset-top,0px)))] right-3 h-11 px-4 rounded-full bg-black/55 backdrop-blur flex items-center gap-2 text-white text-sm font-medium active:scale-95 transition"
        >
          <Camera className="w-4 h-4" />
          Trocar capa
        </button>
      </div>

      {/* Avatar + identidade */}
      <div className="relative -mt-14 px-5 flex flex-col items-center">
        <div className="w-28 h-28 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-4xl font-display font-black ring-4 ring-background shadow-xl overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              width={112}
              height={112}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            (displayName[0] || 'U').toUpperCase()
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground">{displayName}</h1>
          {isPremium && (
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Plus
            </span>
          )}
        </div>
        <p className="font-body text-sm text-muted-foreground">{handle}</p>

        {/* Stats trio — clicáveis, levam pra subpágina */}
        <div className="mt-5 w-full max-w-md grid grid-cols-3 gap-2">
          <StatCell
            icon={Scale}
            label="Minhas leis"
            value={leisCount.toLocaleString('pt-BR')}
            onClick={() => go('/pessoal/leis')}
            onPrefetch={() => { prefetchRoute('/pessoal/leis'); if (user?.id) prefetchPessoalByPath(qc, user.id, '/pessoal/leis'); }}
          />
          <StatCell
            icon={FileText}
            label="Meus artigos"
            value={artigosCount.toLocaleString('pt-BR')}
            onClick={() => go('/pessoal/artigos')}
            onPrefetch={() => { prefetchRoute('/pessoal/artigos'); if (user?.id) prefetchPessoalByPath(qc, user.id, '/pessoal/artigos'); }}
          />
          <StatCell
            icon={BookOpen}
            label="Minhas leituras"
            value={leiturasCount.toLocaleString('pt-BR')}
            onClick={() => go('/pessoal/livros')}
            onPrefetch={() => { prefetchRoute('/pessoal/livros'); if (user?.id) prefetchPessoalByPath(qc, user.id, '/pessoal/livros'); }}
          />
        </div>
      </div>

      {/* Bio */}
      <div className="px-5 mt-5">
        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Sobre mim</span>
            {editingBio ? (
              <button onClick={saveBio} className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Salvar
              </button>
            ) : (
              <button onClick={() => { setBioDraft(bio); setEditingBio(true); }} className="h-8 px-3 rounded-full bg-background border border-border text-xs font-semibold inline-flex items-center gap-1">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
            )}
          </div>
          {editingBio ? (
            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              maxLength={240}
              placeholder="Diga algo sobre você, sua área do Direito, o que estuda..."
              className="w-full min-h-[96px] bg-background border border-border rounded-xl p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          ) : (
            <p className="text-sm text-foreground/90 leading-relaxed min-h-[48px]">
              {bio || <span className="text-muted-foreground italic">Diga algo sobre você, sua área do Direito, o que estuda...</span>}
            </p>
          )}
        </div>
      </div>

      {/* Quick access */}
      <div className="px-5 mt-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Acesso rápido</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.label}
                onClick={() => go(q.path)}
                onPointerEnter={() => { prefetchRoute(q.path); if (user?.id) prefetchPessoalByPath(qc, user.id, q.path); }}
                onPointerDown={() => { prefetchRoute(q.path); if (user?.id) prefetchPessoalByPath(qc, user.id, q.path); }}
                onTouchStart={() => { prefetchRoute(q.path); if (user?.id) prefetchPessoalByPath(qc, user.id, q.path); }}
                className="min-h-[88px] rounded-2xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 active:scale-[0.98] transition p-3 flex flex-col items-start justify-between text-left"
              >
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-[13px] font-semibold text-foreground leading-tight">{q.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Minha atividade — calendário + histórico */}
      <div className="px-5 mt-6 pb-[calc(4rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Minha atividade</p>

        {/* Faixa de dias — hoje à esquerda, retrocedendo */}
        <div className="flex justify-between gap-1.5 mb-3">
          {dayList.map((d) => {
            const key = toYMD(d);
            const isSelected = selectedDate === key;
            const hasData = (feedByDay.get(key)?.length ?? 0) > 0;
            return (
              <button
                key={key}
                onClick={() => { haptic.selection(); setSelectedDate(key); }}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] rounded-xl transition-all shadow-sm ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-primary/30'
                    : 'bg-secondary/40 text-foreground hover:bg-secondary/60'
                }`}
              >
                <span className={`text-[10px] font-body font-semibold uppercase tracking-wide ${isSelected ? '' : 'text-foreground/70'}`}>
                  {dayShortLabel(d)}
                </span>
                <span className="text-lg font-display font-bold leading-none">{d.getDate()}</span>
                {hasData && !isSelected && (
                  <div className="w-1 h-1 rounded-full bg-primary absolute bottom-1.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Data selecionada */}
        <div className="flex items-center gap-2 px-1 mb-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-display text-primary">
            {formatFullDate(new Date(selectedDate + 'T00:00:00'))}
          </span>
        </div>

        {eventsOfDay.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nada por aqui em {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — abra um artigo, favorite algo ou grife um trecho.
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
            {eventsOfDay.map((it) => {
              const Icon = KIND_ICON[it.kind] ?? Scale;
              return (
                <button
                  key={it.id}
                  onClick={() => it.path && go(it.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 min-h-[64px] text-left hover:bg-secondary/60 active:bg-secondary transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {KIND_LABEL[it.kind]} · {formatEventLabel(it.ts)}
                    </div>
                    <div className="font-body text-sm font-semibold text-foreground truncate">{it.title}</div>
                    {it.subtitle && <div className="text-xs text-muted-foreground truncate">{it.subtitle}</div>}
                  </div>
                  {it.path && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cover picker */}
      <AnimatePresence>
        {coverPickerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCoverPickerOpen(false)}
              className="fixed inset-0 z-[90] bg-black/60"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-[100] bg-card rounded-t-3xl border-t border-border p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
            >
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display text-lg font-bold text-foreground mb-3">Escolha uma capa</h3>
              <div className="grid grid-cols-1 gap-3">
                {PESSOAL_COVERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickCover(c.id)}
                    className={`relative w-full aspect-[16/6] rounded-2xl overflow-hidden border-2 transition ${capaId === c.id ? 'border-primary ring-2 ring-primary/40' : 'border-border/60'}`}
                  >
                    <img src={c.src} alt={c.label} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute bottom-2 left-3 text-white text-xs font-semibold drop-shadow">{c.label}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

function StatCell({
  icon: Icon, label, value, onClick, onPrefetch,
}: { icon: any; label: string; value: string; onClick?: () => void; onPrefetch?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onPrefetch}
      onPointerDown={onPrefetch}
      onTouchStart={onPrefetch}
      className="rounded-2xl bg-secondary/40 border border-border/60 p-3 flex flex-col items-center justify-center text-center active:scale-[0.97] hover:bg-secondary/60 transition"
    >
      <Icon className="w-4 h-4 text-primary mb-1" />
      <div className="font-display text-lg font-bold text-foreground leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">{label}</div>
    </button>
  );
}

export default MeuEspaco;
