import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X, ChevronRight, Camera, Pencil, Check,
  StickyNote, Highlighter, Star, BookMarked,
  Scale, FileText, Film, Gavel, BookOpen, Sparkles, Clock, MousePointerClick, Heart,
} from "lucide-react";
import { haptic } from "@/lib/nativeHaptics";
import { supabase } from "@/integrations/supabase/client";
import { getRecentes } from "@/lib/leisRecentes";
import { flushAppMetricsNow, getPendingMetrics } from "@/lib/appMetrics";
import { PESSOAL_COVERS, getCoverSrc } from "@/assets/pessoal/covers";
import { getCache, setCache } from "@/lib/pessoalCache";

const PESSOAL_SNAP = "sheet_snapshot";
const prefetchRoute = (path: string) => {
  switch (path) {
    case '/pessoal/leis': import("@/pages/pessoal/Leis.tsx"); break;
    case '/pessoal/artigos': import("@/pages/pessoal/Artigos.tsx"); break;
    case '/pessoal/anotacoes': import("@/pages/pessoal/Anotacoes.tsx"); break;
    case '/pessoal/grifos': import("@/pages/pessoal/Grifos.tsx"); break;
    case '/pessoal/livros': import("@/pages/pessoal/Livros.tsx"); break;
    case '/pessoal/filmes': import("@/pages/pessoal/Filmes.tsx"); break;
  }
};

interface PessoalSheetProps {
  open: boolean;
  onClose: () => void;
}

type FeedItem = {
  id: string;
  kind: 'anotacao' | 'grifo' | 'artigo' | 'lei' | 'livro' | 'jurisprudencia' | 'tematica';
  title: string;
  subtitle?: string;
  ts: number;
  path?: string;
  icon: any;
};

const KIND_LABEL: Record<FeedItem['kind'], string> = {
  anotacao: 'Anotação',
  grifo: 'Grifo',
  artigo: 'Artigo favorito',
  lei: 'Lei acessada',
  livro: 'Livro favorito',
  jurisprudencia: 'Jurisprudência',
  tematica: 'Temática',
};

function formatSeconds(s: number) {
  if (!s || s < 60) return `${Math.max(0, Math.floor(s))}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h${rest}m` : `${h}h`;
}

function timeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(ts).toLocaleDateString('pt-BR');
}

const PessoalSheet = ({ open, onClose }: PessoalSheetProps) => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [isPremium, setIsPremium] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [bioDraft, setBioDraft] = useState<string>('');
  const [editingBio, setEditingBio] = useState(false);
  const [capaId, setCapaId] = useState<string>('capa1');
  const [interacoes, setInteracoes] = useState<number>(0);
  const [segundos, setSegundos] = useState<number>(0);
  const [favTotal, setFavTotal] = useState<number>(0);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Hidrata instantaneamente do cache
    const snap: any = getCache(PESSOAL_SNAP);
    if (snap) {
      setDisplayName(snap.displayName ?? '');
      setIsPremium(!!snap.isPremium);
      setAvatarUrl(snap.avatarUrl ?? '');
      setBio(snap.bio ?? '');
      setCapaId(snap.capaId ?? 'capa1');
      setInteracoes(Number(snap.interacoes ?? 0));
      setSegundos(Number(snap.segundos ?? 0));
      setFavTotal(Number(snap.favTotal ?? 0));
      const KIND_ICON: Record<FeedItem['kind'], any> = {
        anotacao: StickyNote, grifo: Highlighter, artigo: Star,
        lei: Scale, livro: BookMarked, jurisprudencia: Gavel, tematica: Film,
      };
      setFeed(Array.isArray(snap.feed) ? snap.feed.map((it: any) => ({ ...it, icon: KIND_ICON[it.kind as FeedItem['kind']] ?? Scale })) : []);
      setEmail(snap.email ?? '');
    }
    let cancel = false;
    const load = async () => {
      try { await flushAppMetricsNow(); } catch {}
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancel) return;
      setUserId(user.id);
      setEmail(user.email ?? '');

      const [profileRes, favArtigos, anot, grifos, favLivros, favJuris, favTematica] = await Promise.all([
        supabase.from('profiles').select('display_name,nome_preferido,is_premium,bio,capa_id,interacoes_total,segundos_em_tela,avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('artigos_favoritos').select('id,tabela_codigo,numero_artigo,artigo_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('artigos_anotacoes').select('id,tabela_codigo,numero_artigo,artigo_id,anotacao,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(30),
        supabase.from('artigos_grifos').select('id,tabela_codigo,numero_artigo,artigo_id,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(30),
        supabase.from('biblioteca_favoritos').select('id,livro_key,categoria,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('jurisprudencia_favoritos').select('id,titulo,categoria,slug_local,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('tematica_favoritos').select('obra_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      ]);

      if (cancel) return;
      const p: any = profileRes.data ?? {};
      setDisplayName(p.nome_preferido || p.display_name || (user.email ?? '').split('@')[0] || 'Usuário');
      setIsPremium(!!p.is_premium);
      setAvatarUrl(
        p.avatar_url ||
        (user.user_metadata as any)?.avatar_url ||
        (user.user_metadata as any)?.picture ||
        ''
      );
      setBio(p.bio ?? '');
      setBioDraft(p.bio ?? '');
      setCapaId(p.capa_id ?? 'capa1');
      setInteracoes(Number(p.interacoes_total ?? 0));
      setSegundos(Number(p.segundos_em_tela ?? 0));

      const items: FeedItem[] = [];
      (anot.data ?? []).forEach((r: any) => items.push({
        id: `an-${r.id}`, kind: 'anotacao',
        title: `Art. ${r.numero_artigo} — ${String(r.tabela_codigo || '').toUpperCase()}`,
        subtitle: (r.anotacao || '').slice(0, 90),
        ts: new Date(r.updated_at).getTime(),
        path: `/lei/${r.tabela_codigo}#art-${r.numero_artigo}`,
        icon: StickyNote,
      }));
      (grifos.data ?? []).forEach((r: any) => items.push({
        id: `gr-${r.id}`, kind: 'grifo',
        title: `Art. ${r.numero_artigo} — ${String(r.tabela_codigo || '').toUpperCase()}`,
        subtitle: 'Trecho destacado',
        ts: new Date(r.updated_at).getTime(),
        path: `/lei/${r.tabela_codigo}#art-${r.numero_artigo}`,
        icon: Highlighter,
      }));
      (favArtigos.data ?? []).forEach((r: any) => items.push({
        id: `af-${r.id}`, kind: 'artigo',
        title: `Art. ${r.numero_artigo} — ${String(r.tabela_codigo || '').toUpperCase()}`,
        ts: new Date(r.created_at).getTime(),
        path: `/lei/${r.tabela_codigo}#art-${r.numero_artigo}`,
        icon: Star,
      }));
      (favLivros.data ?? []).forEach((r: any) => items.push({
        id: `bl-${r.id}`, kind: 'livro',
        title: r.livro_key || 'Livro',
        subtitle: r.categoria || undefined,
        ts: new Date(r.created_at).getTime(),
        path: '/biblioteca',
        icon: BookMarked,
      }));
      (favJuris.data ?? []).forEach((r: any) => items.push({
        id: `jr-${r.id}`, kind: 'jurisprudencia',
        title: r.titulo || 'Jurisprudência',
        subtitle: r.categoria || undefined,
        ts: new Date(r.created_at).getTime(),
        path: '/jurisprudencia',
        icon: Gavel,
      }));
      (favTematica.data ?? []).forEach((r: any) => items.push({
        id: `tm-${r.obra_id}`, kind: 'tematica',
        title: 'Obra temática',
        subtitle: 'Favorita',
        ts: new Date(r.created_at).getTime(),
        path: '/tematica-juridica',
        icon: Film,
      }));
      // Leis recentes (localStorage)
      getRecentes().slice(0, 15).forEach((r) => items.push({
        id: `lr-${r.leiId}`, kind: 'lei',
        title: r.nome,
        subtitle: r.descricao,
        ts: r.openedAt,
        icon: Scale,
      }));

      items.sort((a, b) => b.ts - a.ts);
      const finalFeed = items.slice(0, 80);
      setFeed(finalFeed);
      const totalFav =
        (favArtigos.data?.length ?? 0) +
        (favLivros.data?.length ?? 0) +
        (favJuris.data?.length ?? 0) +
        (favTematica.data?.length ?? 0);
      setFavTotal(totalFav);
      // Snapshot para abertura instantânea na próxima vez
      setCache(PESSOAL_SNAP, {
        email: user.email ?? '',
        displayName: p.nome_preferido || p.display_name || (user.email ?? '').split('@')[0] || 'Usuário',
        isPremium: !!p.is_premium,
        avatarUrl: p.avatar_url || (user.user_metadata as any)?.avatar_url || (user.user_metadata as any)?.picture || '',
        bio: p.bio ?? '',
        capaId: p.capa_id ?? 'capa1',
        interacoes: Number(p.interacoes_total ?? 0),
        segundos: Number(p.segundos_em_tela ?? 0),
        favTotal: totalFav,
        feed: finalFeed.map(({ icon, ...rest }) => rest),
      });
    };
    void load();
    return () => { cancel = true; };
  }, [open]);

  // Live update stats when metrics flush
  useEffect(() => {
    if (!open || !userId) return;
    const handler = async () => {
      const { data } = await supabase.from('profiles').select('interacoes_total,segundos_em_tela').eq('id', userId).maybeSingle();
      if (data) {
        setInteracoes(Number((data as any).interacoes_total ?? 0));
        setSegundos(Number((data as any).segundos_em_tela ?? 0));
      }
    };
    window.addEventListener('app-metrics-flushed', handler);
    return () => window.removeEventListener('app-metrics-flushed', handler);
  }, [open, userId]);

  // Live ticker: reflect pending (unflushed) clicks/seconds every second
  const [pendingClicks, setPendingClicks] = useState(0);
  const [pendingSecs, setPendingSecs] = useState(0);
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const p = getPendingMetrics();
      setPendingClicks(p.clicks);
      setPendingSecs(p.seconds);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => clearInterval(id);
  }, [open]);

  const handle = useMemo(() => {
    const base = (email.split('@')[0] || 'usuario').toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return `@${base}`;
  }, [email]);

  const saveBio = async () => {
    if (!userId) return;
    const val = bioDraft.trim().slice(0, 240);
    setBio(val);
    setEditingBio(false);
    await supabase.from('profiles').update({ bio: val }).eq('id', userId);
    haptic.success();
  };

  const pickCover = async (id: string) => {
    setCapaId(id);
    setCoverPickerOpen(false);
    haptic.selection();
    if (userId) await supabase.from('profiles').update({ capa_id: id }).eq('id', userId);
  };

  const go = (path: string) => {
    haptic.selection();
    onClose();
    navigate(path);
  };

  const QUICK = [
    { label: 'Minhas leis', icon: Scale, path: '/pessoal/leis' },
    { label: 'Meus artigos', icon: FileText, path: '/pessoal/artigos' },
    { label: 'Minhas anotações', icon: StickyNote, path: '/pessoal/anotacoes' },
    { label: 'Meus grifos', icon: Highlighter, path: '/pessoal/grifos' },
    { label: 'Meus livros', icon: BookOpen, path: '/pessoal/livros' },
    { label: 'Meus filmes', icon: Film, path: '/pessoal/filmes' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[80] bg-background overflow-y-auto"
        >
          {/* Cover */}
          <div className="relative w-full h-52 sm:h-64 bg-secondary overflow-hidden">
            <img
              src={getCoverSrc(capaId)}
              alt="Capa do perfil"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background" />
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Fechar meu espaço"
              className="absolute top-3 left-3 w-11 h-11 rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Trocar capa */}
            <button
              onClick={() => setCoverPickerOpen(true)}
              className="absolute top-3 right-3 h-11 px-4 rounded-full bg-black/55 backdrop-blur flex items-center gap-2 text-white text-sm font-medium active:scale-95 transition"
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

            {/* Stats */}
            <div className="mt-5 w-full max-w-md grid grid-cols-3 gap-2">
              <StatCell icon={MousePointerClick} label="Interações" value={(interacoes + pendingClicks).toLocaleString('pt-BR')} />
              <StatCell icon={Heart} label="Favoritos" value={favTotal.toLocaleString('pt-BR')} />
              <StatCell icon={Clock} label="Em tela" value={formatSeconds(segundos + pendingSecs)} />
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
                    onPointerEnter={() => prefetchRoute(q.path)}
                    onTouchStart={() => prefetchRoute(q.path)}
                    className="min-h-[88px] rounded-2xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 active:scale-[0.98] transition p-3 flex flex-col items-start justify-between text-left"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-[13px] font-semibold text-foreground leading-tight">{q.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feed */}
          <div className="px-5 mt-6 pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Minha atividade</p>
            {feed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Ainda não há atividade. Favorite artigos, faça anotações e grifos — tudo aparece aqui.
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
                {feed.map((it) => {
                  const Icon = it.icon;
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
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{KIND_LABEL[it.kind]} · {timeAgo(it.ts)}</div>
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function StatCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/40 border border-border/60 p-3 flex flex-col items-center justify-center text-center">
      <Icon className="w-4 h-4 text-primary mb-1" />
      <div className="font-display text-lg font-bold text-foreground leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">{label}</div>
    </div>
  );
}

export default PessoalSheet;
