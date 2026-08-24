import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Play, Home, Bell, BookOpen, Landmark, Building2, Gavel, ShieldCheck, Briefcase, DollarSign, Scale, FileText, HeartPulse, Users, Globe, Leaf, Trophy, Hammer, Coins, Swords, Building, Globe2, AlertTriangle, GraduationCap, Microscope, BookText, ClipboardList, Award, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import AprenderBottomNav from '@/components/aprender/AprenderBottomNav';
import AprenderLembretesSheet from '@/components/aprender/AprenderLembretesSheet';
import { getAreaCover } from '@/lib/areasDireitoCovers';
import { prefetchAprenderArea } from '@/lib/aprenderAreaLoader';
import { prefetchAprenderAula } from '@/lib/aprenderAulaPrefetch';
import { warmAprenderCache, saveAprenderHomeSnapshot, getAprenderHomeSnapshot, prefetchAllAulas } from '@/lib/warmAprenderCache';
import hero1 from '@/assets/aprender-hero/hero-1.png.asset.json';
import hero2 from '@/assets/aprender-hero/hero-2.png.asset.json';
import hero3 from '@/assets/aprender-hero/hero-3.png.asset.json';
import hero4 from '@/assets/aprender-hero/hero-4.png.asset.json';
import hero5 from '@/assets/aprender-hero/hero-5.png.asset.json';
import hero6 from '@/assets/aprender-hero/hero-6.png.asset.json';

const HERO_ILLUSTRATIONS = [hero1.url, hero2.url, hero3.url, hero4.url, hero5.url, hero6.url];

// Ícones vetoriais por área — no estilo dos ícones dos códigos.
// Cada entrada tem o Icon (lucide) e uma cor de tinta para o fundo.
const AREA_ICON_MAP: Record<string, { Icon: typeof Landmark; tint: string; color: string }> = {
  'direito-administrativo': { Icon: Landmark, tint: 'linear-gradient(135deg,#f97316,#c2410c)', color: '#f97316' },
  'direito-civil': { Icon: Home, tint: 'linear-gradient(135deg,#f59e0b,#b45309)', color: '#f59e0b' },
  'direito-penal': { Icon: Gavel, tint: 'linear-gradient(135deg,#ef4444,#991b1b)', color: '#ef4444' },
  'direito-constitucional': { Icon: Scale, tint: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#3b82f6' },
  'direito-processual-civil': { Icon: FileText, tint: 'linear-gradient(135deg,#38bdf8,#0369a1)', color: '#38bdf8' },
  'direito-processual-penal': { Icon: ShieldCheck, tint: 'linear-gradient(135deg,#a78bfa,#6d28d9)', color: '#a78bfa' },
  'direito-tributario': { Icon: DollarSign, tint: 'linear-gradient(135deg,#22c55e,#15803d)', color: '#22c55e' },
  'direito-do-trabalho': { Icon: Briefcase, tint: 'linear-gradient(135deg,#eab308,#a16207)', color: '#eab308' },
  'direito-empresarial': { Icon: Building2, tint: 'linear-gradient(135deg,#64748b,#334155)', color: '#94a3b8' },
  'direito-ambiental': { Icon: Leaf, tint: 'linear-gradient(135deg,#10b981,#047857)', color: '#10b981' },
  'direitos-humanos': { Icon: Users, tint: 'linear-gradient(135deg,#f472b6,#be185d)', color: '#f472b6' },
  'direito-internacional-publico': { Icon: Globe, tint: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#0ea5e9' },
  'direito-previdenciario': { Icon: HeartPulse, tint: 'linear-gradient(135deg,#ec4899,#9d174d)', color: '#ec4899' },
  'direito-desportivo': { Icon: Trophy, tint: 'linear-gradient(135deg,#fbbf24,#b45309)', color: '#fbbf24' },
  'direito-processual-do-trabalho': { Icon: Hammer, tint: 'linear-gradient(135deg,#60a5fa,#1e40af)', color: '#60a5fa' },
  'direito-financeiro': { Icon: Coins, tint: 'linear-gradient(135deg,#facc15,#a16207)', color: '#facc15' },
  'direito-concorrencial': { Icon: Swords, tint: 'linear-gradient(135deg,#c084fc,#7e22ce)', color: '#c084fc' },
  'direito-urbanistico': { Icon: Building, tint: 'linear-gradient(135deg,#fb923c,#c2410c)', color: '#fb923c' },
  'direito-internacional-privado': { Icon: Globe2, tint: 'linear-gradient(135deg,#2dd4bf,#0f766e)', color: '#2dd4bf' },
  'lei-penal-especial': { Icon: AlertTriangle, tint: 'linear-gradient(135deg,#f87171,#991b1b)', color: '#f87171' },
  'formacao-complementar': { Icon: GraduationCap, tint: 'linear-gradient(135deg,#fb923c,#c2410c)', color: '#fb923c' },
  'pesquisa-cientifica': { Icon: Microscope, tint: 'linear-gradient(135deg,#22d3ee,#0e7490)', color: '#22d3ee' },
  'politicas-publicas': { Icon: Users, tint: 'linear-gradient(135deg,#818cf8,#3730a3)', color: '#818cf8' },
  'portugues': { Icon: BookText, tint: 'linear-gradient(135deg,#fb923c,#9a3412)', color: '#fb923c' },
  'pratica-profissional': { Icon: ClipboardList, tint: 'linear-gradient(135deg,#a8a29e,#57534e)', color: '#a8a29e' },
  'revisao-oab': { Icon: Award, tint: 'linear-gradient(135deg,#f87171,#991b1b)', color: '#f87171' },
  'teoria-e-filosofia-do-direito': { Icon: Lightbulb, tint: 'linear-gradient(135deg,#a5b4fc,#4338ca)', color: '#a5b4fc' },
};


function areaIconFor(slug?: string | null) {
  if (!slug) return null;
  return AREA_ICON_MAP[slug] ?? null;
}

type Area = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
};

type ProximaAula = {
  aula_id: string;
  aula_titulo: string;
  area_nome: string;
  area_cor: string | null;
  pct: number;
};

type AreaStats = {
  totalAulas: number;
  concluidas: number;
  pct: number;

};

let cache: {
  areas: Area[];
  stats: Record<string, AreaStats>;
  totalAulas: number;
  totalConcluidas: number;
  proxima: ProximaAula | null;
} | null = null;

const Aprender = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [areas, setAreas] = useState<Area[]>(cache?.areas ?? []);
  const [stats, setStats] = useState<Record<string, AreaStats>>(cache?.stats ?? {});
  const [totalAulas, setTotalAulas] = useState(cache?.totalAulas ?? 0);
  const [totalConcluidas, setTotalConcluidas] = useState(cache?.totalConcluidas ?? 0);
  const [proxima, setProxima] = useState<ProximaAula | null>(cache?.proxima ?? null);
  const [loading, setLoading] = useState(!cache);
  const [heroIdx, setHeroIdx] = useState(0);
  const [lembretesOpen, setLembretesOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_ILLUSTRATIONS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  // Hidrata memória a partir do IndexedDB o quanto antes.
  useEffect(() => {
    warmAprenderCache(uid);
    // Se não temos cache em memória, tenta hidratar a home persistida
    if (!cache) {
      (async () => {
        const snap = await getAprenderHomeSnapshot(uid);
        if (snap?.areas?.length) {
          setAreas(snap.areas as Area[]);
          if (snap.stats) setStats(snap.stats);
          if (typeof snap.totalAulas === 'number') setTotalAulas(snap.totalAulas);
          if (typeof snap.totalConcluidas === 'number') setTotalConcluidas(snap.totalConcluidas);
          if (snap.proxima) setProxima(snap.proxima as ProximaAula);
          setLoading(false);
        }
      })();
    }
  }, [uid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [areasRes, sessRes] = await Promise.all([
        supabase.from('aprender_areas').select('id, slug, nome, descricao, cor').neq('slug', 'livros').order('ordem'),
        supabase.auth.getSession(),
      ]);
      if (cancelled) return;
      const areasList = (areasRes.data ?? []) as Area[];
      const uid = sessRes.data.session?.user?.id;

      const { data: aus } = await supabase
        .from('aprender_aulas')
        .select('id, titulo, ordem, modulo:aprender_modulos!inner(area_id)')
        .eq('status', 'published')
        .order('ordem');

      const aulasList = (aus ?? []) as any[];
      const areaAulaMap: Record<string, string[]> = {};
      aulasList.forEach((a) => {
        const aid = a.modulo?.area_id;
        if (!aid) return;
        (areaAulaMap[aid] ??= []).push(a.id);
      });

      let doneSet = new Set<string>();
      const progByAula = new Map<string, number>(); // aula_id -> blocos_concluidos
      if (uid && aulasList.length) {
        const { data: prog } = await supabase
          .from('aprender_progresso_aula')
          .select('aula_id, concluida_em, blocos_concluidos')
          .eq('user_id', uid)
          .in('aula_id', aulasList.map((a: any) => a.id));
        doneSet = new Set(
          (prog ?? []).filter((p: any) => p.concluida_em).map((p: any) => p.aula_id),
        );
        (prog ?? []).forEach((p: any) => {
          progByAula.set(p.aula_id, p.blocos_concluidos ?? 0);
        });
      }

      // Total de blocos por aula (para % parcial)
      const blocosPorAula = new Map<string, number>();
      if (aulasList.length) {
        const { data: blocos } = await supabase
          .from('aprender_blocos')
          .select('aula_id')
          .in('aula_id', aulasList.map((a: any) => a.id));
        (blocos ?? []).forEach((b: any) => {
          blocosPorAula.set(b.aula_id, (blocosPorAula.get(b.aula_id) ?? 0) + 1);
        });
      }

      const aulaPct = (aulaId: string): number => {
        if (doneSet.has(aulaId)) return 1;
        const total = blocosPorAula.get(aulaId) ?? 0;
        const feitos = progByAula.get(aulaId) ?? 0;
        if (!total) return 0;
        return Math.min(1, feitos / total);
      };

      const areaStats: Record<string, AreaStats> = {};
      areasList.forEach((a) => {
        const ids = areaAulaMap[a.id] ?? [];
        const somaPct = ids.reduce((acc, id) => acc + aulaPct(id), 0);
        areaStats[a.id] = {
          totalAulas: ids.length,
          concluidas: ids.filter((id) => doneSet.has(id)).length,
          pct: ids.length ? Math.round((somaPct / ids.length) * 100) : 0,
        };
      });
      const totalAulasCount = aulasList.length;
      const totalConcluidasCount = aulasList.filter((a: any) => doneSet.has(a.id)).length;


      let proximaVal: ProximaAula | null = null;
      const areaMap = new Map(areasList.map((a) => [a.id, a]));
      const pendente = aulasList.find((a: any) => !doneSet.has(a.id));
      if (pendente) {
        const ar = areaMap.get(pendente.modulo?.area_id);
        const areaIds = areaAulaMap[pendente.modulo?.area_id] ?? [];
        const done = areaIds.filter((id) => doneSet.has(id)).length;
        proximaVal = {
          aula_id: pendente.id,
          aula_titulo: pendente.titulo,
          area_nome: ar?.nome ?? '',
          area_cor: ar?.cor ?? '#EFE039',
          pct: areaIds.length ? Math.round((done / areaIds.length) * 100) : 0,
        };
      }

      if (cancelled) return;
      cache = {
        areas: areasList,
        stats: areaStats,
        totalAulas: totalAulasCount,
        totalConcluidas: totalConcluidasCount,
        proxima: proximaVal,
      };
      setAreas(areasList);
      setStats(areaStats);
      setTotalAulas(totalAulasCount);
      setTotalConcluidas(totalConcluidasCount);
      setProxima(proximaVal);
      setLoading(false);

      // Persiste snapshot da home para abrir instantâneo na próxima visita.
      const aulaIdsByArea: Record<string, string[]> = {};
      Object.entries(areaAulaMap).forEach(([aid, ids]) => { aulaIdsByArea[aid] = ids; });
      saveAprenderHomeSnapshot(uid ?? null, {
        areas: areasList as any[],
        aulaIdsByArea,
        proximaAulaId: proximaVal?.aula_id ?? null,
        proxima: proximaVal,
        stats: areaStats,
        totalAulas: totalAulasCount,
        totalConcluidas: totalConcluidasCount,
        updatedAt: Date.now(),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefetch todas as áreas em idle para navegação instantânea
  useEffect(() => {
    if (!areas.length) return;
    const ric: any =
      (typeof window !== 'undefined' && (window as any).requestIdleCallback) ||
      ((cb: any) => setTimeout(cb, 400));
    const cancel: any =
      (typeof window !== 'undefined' && (window as any).cancelIdleCallback) ||
      ((h: any) => clearTimeout(h));
    const handle = ric(() => {
      areas.forEach((a) => {
        prefetchAprenderArea(a.slug, uid);
        // Aquece o cache HTTP da capa temática para abrir instantâneo
        const cover = getAreaCover(a.nome);
        if (cover?.cover) {
          const img = new Image();
          img.src = cover.cover;
        }
      });
    });
    return () => cancel(handle);
  }, [areas, uid]);

  // Prefetch a próxima aula (chunk JS + dados) assim que sabemos qual é.
  useEffect(() => {
    if (!proxima?.aula_id) return;
    prefetchAprenderAula(proxima.aula_id);
  }, [proxima?.aula_id]);

  // Prefetch de TODAS as aulas em idle (limitado a 3 paralelas) para abertura instantânea.
  useEffect(() => {
    if (!cache) return;
    const allIds: string[] = [];
    // Aproveita snapshot da home para pegar todos os aula_ids
    getAprenderHomeSnapshot(uid).then((snap) => {
      if (!snap) return;
      Object.values(snap.aulaIdsByArea ?? {}).forEach((ids) => allIds.push(...ids));
      if (allIds.length) prefetchAllAulas(allIds);
    });
  }, [uid, areas.length]);


  const pctSoma = Object.values(stats).reduce((acc, s) => acc + (s.pct ?? 0) * (s.totalAulas || 0), 0);
  const pctTotal = Object.values(stats).reduce((acc, s) => acc + (s.totalAulas || 0), 0);
  const pct = pctTotal > 0 ? Math.round(pctSoma / pctTotal) : (totalAulas > 0 ? Math.round((totalConcluidas / totalAulas) * 100) : 0);

  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c - (pct / 100) * c;

  const mobileHeader = (
    <PageHeader
      title="Aprender"
      onBack={() => navigate('/')}
      rightAction={
        <button
          onClick={() => setLembretesOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40"
          aria-label="Lembretes"
        >
          <Bell className="h-4 w-4" />
          Lembretes
        </button>
      }
    />
  );

  const proximaCover = proxima ? getAreaCover(proxima.area_nome) : null;

  return (
    <DesktopPageLayout
      activeId="aprender"
      title="Aprender"
      subtitle="Seu hub de estudos"
      mobileHeader={mobileHeader}
    >
      <div className="mx-auto w-full max-w-3xl pb-32">
        {/* Hero amarelo full-bleed */}
        <section
          className="bg-hero-yellow relative isolate overflow-hidden border-b border-black/10"
          aria-label="Seu progresso em trilhas"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.18),transparent_65%)]" />

          {/* Ilustração real (não transparente) no canto direito */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-[46%] sm:w-[38%] overflow-hidden"
            aria-hidden="true"
          >
            {HERO_ILLUSTRATIONS.map((url, i) => (
              <img
                key={url}
                src={url}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="absolute inset-y-0 right-0 h-full w-auto object-contain object-right transition-opacity duration-[1400ms] ease-in-out"
                style={{ opacity: i === heroIdx ? 1 : 0 }}
              />
            ))}
            {/* Leve véu amarelo (multiply) só para integrar a ilustração ao hero,
                sem apagar o personagem como o antigo mix-blend-color fazia. */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                background: 'linear-gradient(135deg, #EFE039 0%, #F5EA5A 100%)',
                mixBlendMode: 'multiply',
              }}
            />
            {/* Fade suave na borda esquerda pra proteger o texto */}
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#EFE039] via-[#EFE039]/60 to-transparent" />
          </div>

          <div className="relative p-4 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-black/70">
              Sua trilha
            </p>
            <h1 className="mt-1 font-display text-[26px] font-black leading-tight text-black sm:text-[32px]">
              Aulas
              <span className="ml-2 font-display text-[18px] font-semibold italic text-black/70 sm:text-[22px]">
                em trilhas
              </span>
            </h1>
            <p
              className="mt-1 max-w-[62%] text-[13px] leading-snug text-black/70 sm:text-sm"
              style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
            >
              Trilhas didáticas por matéria, com slides, flashcards e questões.
            </p>

            {/* Anel de progresso ancorado à esquerda, sem tapar a ilustração */}
            <div className="mt-4 flex items-center gap-3">
              <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                  <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(0,0,0,0.15)" strokeWidth={stroke} fill="none" />
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="#111"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={c}
                    strokeDashoffset={dash}
                    style={{ transition: 'stroke-dashoffset 600ms ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-lg font-black leading-none text-black">
                    {pct}%
                  </span>
                  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-black/60">
                    Progresso
                  </span>
                </div>
              </div>
            </div>

            {/* Barra única com as 3 métricas — vai abaixo, não atrapalha a arte */}
            <div className="relative mt-4 rounded-xl bg-black/85 text-white backdrop-blur-sm ring-1 ring-black/20 shadow-lg">
              <div className="grid grid-cols-3 divide-x divide-white/10">
                <div className="flex flex-col items-center justify-center px-2 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Matérias</span>
                  <span className="mt-0.5 font-display text-lg font-black leading-none">{areas.length}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-2 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Aulas</span>
                  <span className="mt-0.5 font-display text-lg font-black leading-none">{totalAulas}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-2 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Concluídas</span>
                  <span className="mt-0.5 font-display text-lg font-black leading-none text-[hsl(var(--hero-yellow-from,48_98%_54%))]">
                    {totalConcluidas}<span className="text-white/50">/{totalAulas}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>


        <div className="px-4 sm:px-6 space-y-5 pt-5">
          {/* Continue de onde parou */}
          {proxima && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                Continue de onde parou
              </p>
              <button
                onClick={() => navigate(`/aprender/aula/${proxima.aula_id}`)}
                onPointerEnter={() => prefetchAprenderAula(proxima.aula_id)}
                onFocus={() => prefetchAprenderAula(proxima.aula_id)}
                onTouchStart={() => prefetchAprenderAula(proxima.aula_id)}
                className="group relative w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.995]"
              >
                {proximaCover?.cover && (
                  <>
                    <img
                      src={proximaCover.cover}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover opacity-40"
                      loading="eager"
                      fetchPriority="high"
                      decoding="sync"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, rgba(23,23,23,0.92) 0%, rgba(38,38,38,0.75) 55%, rgba(0,0,0,0.85) 100%)',
                      }}
                    />
                  </>
                )}
                <div className="relative flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EFE039] shadow-lg sm:h-14 sm:w-14">
                    <Play className="h-5 w-5 fill-black text-black sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/85">
                      {proxima.area_nome}
                    </p>
                    <p
                      className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-white sm:text-base"
                      style={{ fontFamily: "'Barlow', system-ui, sans-serif", letterSpacing: '-0.005em' }}
                    >
                      {proxima.aula_titulo}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-[#EFE039] transition-all"
                          style={{ width: `${proxima.pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[12px] font-bold tabular-nums text-white sm:text-[13px]">
                        {proxima.pct}%
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Lista de matérias */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
              Matérias
            </p>
            <div className="space-y-2">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-[76px] rounded-2xl bg-muted animate-pulse" />
                ))
              ) : areas.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                  Nenhuma matéria disponível ainda.
                </div>
              ) : (
                areas.map((a) => {
                  const s: AreaStats = stats[a.id] ?? { totalAulas: 0, concluidas: 0, pct: 0 };
                  const areaPct = s.pct ?? (s.totalAulas > 0 ? Math.round((s.concluidas / s.totalAulas) * 100) : 0);
                  const cover = getAreaCover(a.nome);
                  const iconEntry = areaIconFor(a.slug);
                  return (
                    <button
                      key={a.id}
                      onClick={() => navigate(`/aprender/area/${a.slug}`)}
                      onPointerEnter={() => prefetchAprenderArea(a.slug, uid)}
                      onFocus={() => prefetchAprenderArea(a.slug, uid)}
                      onTouchStart={() => prefetchAprenderArea(a.slug, uid)}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.995] sm:p-3.5"
                    >
                      {iconEntry ? (
                        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center sm:h-[72px] sm:w-[72px] aprender-icon-shine">
                          <iconEntry.Icon
                            className="h-10 w-10 sm:h-11 sm:w-11"
                            strokeWidth={1.9}
                            style={{ color: iconEntry.color }}
                          />
                        </div>
                      ) : (
                        <div
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-[72px] sm:w-[72px]"
                          style={{
                            background: cover?.tint ?? 'linear-gradient(135deg,#EFE039,#c9b83c)',
                          }}
                        >
                          {cover?.cover ? (
                            <>
                              <img
                                src={cover.cover}
                                alt=""
                                aria-hidden="true"
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                              />
                              <div
                                className="absolute inset-0"
                                style={{ background: `linear-gradient(135deg, ${cover.tint} 0%, rgba(0,0,0,0.25) 100%)` }}
                              />
                            </>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <BookOpen className="h-6 w-6 text-white" strokeWidth={2} />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[15px] font-semibold text-foreground sm:text-[16px]"
                          style={{ fontFamily: "'Barlow', system-ui, sans-serif", letterSpacing: '-0.005em' }}
                        >
                          {a.nome}
                        </p>
                        <p className="text-[12px] text-muted-foreground sm:text-[13px]">
                          {s.totalAulas} {s.totalAulas === 1 ? 'aula' : 'aulas'}
                          {s.concluidas > 0 && ` · ${s.concluidas} concluída${s.concluidas === 1 ? '' : 's'}`}
                        </p>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${areaPct}%`, background: '#EFE039' }}
                          />
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-display text-[13px] font-bold tabular-nums text-foreground sm:text-sm">
                          {areaPct}%
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <AprenderBottomNav />
      <AprenderLembretesSheet open={lembretesOpen} onOpenChange={setLembretesOpen} />
    </DesktopPageLayout>
  );
};

const StatRow = ({
  label,
  value,
  pct,
  green,
}: {
  label: string;
  value: string;
  pct: number;
  green?: boolean;
}) => {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] font-semibold text-black/80">
        <span className="truncate">{label}</span>
        <span className="tabular-nums text-black">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/15">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: green ? '#16a34a' : '#111',
          }}
        />
      </div>
    </div>
  );
};

export default Aprender;
