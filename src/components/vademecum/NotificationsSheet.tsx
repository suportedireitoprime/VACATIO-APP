import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Bell, CheckCheck, Scale, Newspaper, Video, BookOpen, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import brasaoRepublica from '@/assets/brasao-republica.webp';

const LAST_READ_KEY = 'notifications_last_read_at';
const OPENED_IDS_KEY = 'notifications_opened_ids';

export type NotifKind = 'diario' | 'noticia' | 'boletim' | 'blog';

export interface NotifItem {
  id: string;
  kind: NotifKind;
  title: string;
  subtitle?: string;
  createdAt: string;
  to: string;
  image?: string;
}

const KIND_META: Record<NotifKind, { label: string; icon: any; color: string; bg: string }> = {
  diario:  { label: 'Diário Oficial', icon: Scale,     color: '#F59E0B', bg: 'bg-amber-500/15' },
  noticia: { label: 'Notícia',        icon: Newspaper, color: '#A78BFA', bg: 'bg-violet-500/15' },
  boletim: { label: 'Boletim',        icon: Video,     color: '#F87171', bg: 'bg-rose-500/15' },
  blog:    { label: 'Blog',           icon: BookOpen,  color: '#34D399', bg: 'bg-emerald-500/15' },
};

function formatRelative(iso: string): { rel: string; abs: string } {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.max(0, Math.floor(diffMs / 60000));
  const abs = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  let rel: string;
  if (min < 1) rel = 'agora';
  else if (min < 60) rel = `há ${min} min`;
  else {
    const h = Math.floor(min / 60);
    if (h < 24) rel = `há ${h}h`;
    else rel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  return { rel, abs };
}

function readOpenedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(OPENED_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

function writeOpenedIds(set: Set<string>) {
  try {
    const arr = Array.from(set).slice(-500);
    localStorage.setItem(OPENED_IDS_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

function readLastReadMs(): number {
  const value = Number(localStorage.getItem(LAST_READ_KEY) || '0');
  return Number.isFinite(value) ? value : 0;
}

function createdAtMs(iso: string): number {
  const value = new Date(iso).getTime();
  return Number.isFinite(value) ? value : 0;
}

async function loadReadState(userId?: string | null) {
  const localLastRead = readLastReadMs();
  const localOpened = readOpenedIds();
  if (!userId) return { lastRead: localLastRead, openedIds: localOpened };

  try {
    const { data } = await supabase
      .from('notification_read_state' as any)
      .select('last_read_at, opened_ids')
      .eq('user_id', userId)
      .maybeSingle();

    const row = data as { last_read_at?: string | null; opened_ids?: string[] | null } | null;
    const remoteLastRead = row?.last_read_at ? createdAtMs(row.last_read_at) : 0;
    const remoteOpened = new Set<string>(Array.isArray(row?.opened_ids) ? row.opened_ids : []);
    const mergedLastRead = Math.max(localLastRead, remoteLastRead);
    const mergedOpened = new Set<string>([...localOpened, ...remoteOpened]);

    localStorage.setItem(LAST_READ_KEY, String(mergedLastRead));
    writeOpenedIds(mergedOpened);

    return { lastRead: mergedLastRead, openedIds: mergedOpened };
  } catch {
    return { lastRead: localLastRead, openedIds: localOpened };
  }
}

async function saveReadState(userId: string | undefined | null, lastRead: number, openedIds: Set<string>) {
  localStorage.setItem(LAST_READ_KEY, String(lastRead));
  writeOpenedIds(openedIds);
  if (!userId) return;

  await supabase
    .from('notification_read_state' as any)
    .upsert({
      user_id: userId,
      last_read_at: new Date(lastRead).toISOString(),
      opened_ids: Array.from(openedIds).slice(-500),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

async function fetchTodayNotifications(): Promise<NotifItem[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const since = startOfDay.toISOString();
  // Data local YYYY-MM-DD para filtrar publicações do DOU pela data do Diário
  // (evita mostrar leis "de ontem" quando o ingest roda madrugada).
  const hojeLocal = new Date().toLocaleDateString('en-CA');

  const [diario, noticias, boletins, blog] = await Promise.all([
    supabase.from('resenha_diaria' as any)
      .select('id,tipo_ato,numero_ato,ementa,created_at,data_dou')
      .eq('data_dou', hojeLocal)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('noticias_juridicas' as any)
      .select('id,titulo,resumo,imagem_url,created_at,fonte')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('boletins_juridicos' as any)
      .select('id,titulo,subtitulo,thumb_url,thumbnail_url,created_at,status')
      .gte('created_at', since)
      .eq('status', 'pronto')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('blog_edicao_posts' as any)
      .select('id,titulo,resumo,imagem_thumb_url,imagem_url,data_publicacao,publicado')
      .eq('publicado', true)
      .gte('data_publicacao', since)
      .order('data_publicacao', { ascending: false })
      .limit(20),
  ]);

  const items: NotifItem[] = [];
  for (const r of (diario.data as any[] | null) ?? []) {
    const tipo = String(r.tipo_ato || '').trim();
    const numero = String(r.numero_ato || '').trim();
    // Evita "Lei Lei nº 15.443": se número já começa com o tipo, não duplica.
    const title = !numero
      ? tipo
      : numero.toLowerCase().startsWith(tipo.toLowerCase())
        ? numero
        : `${tipo} ${numero}`;
    items.push({
      id: `diario:${r.id}`,
      kind: 'diario',
      title,
      subtitle: r.ementa,
      createdAt: r.created_at,
      to: '/radar-360',
    });
  }
  for (const r of (noticias.data as any[] | null) ?? []) {
    items.push({
      id: `noticia:${r.id}`,
      kind: 'noticia',
      title: r.titulo,
      subtitle: r.resumo || r.fonte,
      createdAt: r.created_at,
      to: `/noticias?item=${encodeURIComponent(r.id)}`,
      image: r.imagem_url || undefined,
    });
  }
  for (const r of (boletins.data as any[] | null) ?? []) {
    items.push({
      id: `boletim:${r.id}`,
      kind: 'boletim',
      title: r.titulo,
      subtitle: r.subtitulo,
      createdAt: r.created_at,
      to: `/boletins?item=${encodeURIComponent(r.id)}`,
      image: r.thumb_url || r.thumbnail_url || undefined,
    });
  }
  for (const r of (blog.data as any[] | null) ?? []) {
    items.push({
      id: `blog:${r.id}`,
      kind: 'blog',
      title: r.titulo,
      subtitle: r.resumo,
      createdAt: r.data_publicacao || r.created_at,
      to: `/blog?post=${encodeURIComponent(r.id)}`,
      image: r.imagem_thumb_url || r.imagem_url || undefined,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items;
}

export function useUnreadNotifCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const recompute = useCallback(async () => {
    try {
      const [items, state] = await Promise.all([
        fetchTodayNotifications(),
        loadReadState(user?.id),
      ]);
      const unread = items.filter((i) => {
        if (state.openedIds.has(i.id)) return false;
        return createdAtMs(i.createdAt) > state.lastRead;
      });
      setCount(unread.length);
    } catch {
      setCount(0);
    }
  }, [user?.id]);

  useEffect(() => {
    recompute();
    const id = setInterval(recompute, 60_000);
    const onVisible = () => document.visibilityState === 'visible' && recompute();
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_READ_KEY || e.key === OPENED_IDS_KEY) recompute();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('storage', onStorage);
    window.addEventListener('notifications-changed', recompute as any);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('notifications-changed', recompute as any);
    };
  }, [recompute]);

  return count;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Refatorado: framer-motion removido. Animação de entrada/saída agora é
 * CSS-only (translate-x + opacity) via classes, aproveitando compositor
 * do browser sem custo de JS por frame. Isso elimina o gargalo que aparecia
 * ao abrir o sheet, especialmente em Android WebView.
 */
export default function NotificationsSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openedIds, setOpenedIds] = useState<Set<string>>(() => readOpenedIds());
  const [lastRead, setLastRead] = useState<number>(() => readLastReadMs());

  // Mount/unmount controlado para permitir animação de saída sem AnimatePresence.
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
      setMounted(true);
      // próximo frame → aplica a classe de "entrado" (dispara transição)
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    closeTimer.current = window.setTimeout(() => setMounted(false), 260);
    return () => {
      if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([fetchTodayNotifications(), loadReadState(user?.id)])
      .then(([nextItems, state]) => {
        setItems(nextItems);
        setLastRead(state.lastRead);
        setOpenedIds(state.openedIds);
      })
      .finally(() => setLoading(false));
  }, [open, user?.id]);

  const visibleItems = useMemo(
    () => items.filter((it) => !openedIds.has(it.id) && createdAtMs(it.createdAt) > lastRead),
    [items, openedIds, lastRead],
  );

  const unreadCount = visibleItems.length;

  const markAllRead = () => {
    const now = Date.now();
    const merged = new Set([...openedIds, ...items.map((i) => i.id)]);
    setOpenedIds(merged);
    setLastRead(now);
    saveReadState(user?.id, now, merged).catch(() => undefined);
    window.dispatchEvent(new Event('notifications-changed'));
  };

  const openItem = (it: NotifItem) => {
    const merged = new Set(openedIds);
    merged.add(it.id);
    setOpenedIds(merged);
    saveReadState(user?.id, lastRead, merged).catch(() => undefined);
    window.dispatchEvent(new Event('notifications-changed'));
    onClose();
    navigate(it.to);
  };

  if (!mounted) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/60 transition-opacity duration-200"
        style={{ opacity: entered ? 1 : 0 }}
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-[91] w-full max-w-md bg-background border-l border-border/50 shadow-2xl flex flex-col will-change-transform"
        style={{
          paddingTop: 'var(--sai-top,env(safe-area-inset-top,0px))',
          paddingBottom: 'var(--sai-bottom,env(safe-area-inset-bottom,0px))',
          transform: entered ? 'translate3d(0,0,0)' : 'translate3d(100%,0,0)',
          transition: 'transform 260ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        <header className="relative border-b border-border/50 bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-5 flex items-start gap-3">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 shadow-sm">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-muted-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="font-display text-foreground text-lg sm:text-xl font-black leading-tight tracking-tight">
                Notificações
              </h2>
              <p className="text-[12px] sm:text-[13px] text-muted-foreground mt-0.5 leading-snug">
                {unreadCount > 0
                  ? `${unreadCount} nova${unreadCount > 1 ? 's' : ''} · atualizado agora`
                  : 'Você está em dia'}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground/80 shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
          {unreadCount > 0 && (
            <div className="px-4 sm:px-5 pb-3 flex justify-end">
              <button
                onClick={markAllRead}
                className="text-[12px] font-semibold text-primary hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 active:scale-95 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas como lidas
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading && (
            <div className="text-center text-muted-foreground py-10 text-sm">Carregando…</div>
          )}
          {!loading && visibleItems.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-secondary flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-display text-foreground font-semibold mb-1">Sem novidades por enquanto</p>
              <p className="text-xs text-muted-foreground">
                Publicações do Diário Oficial, notícias, boletins e artigos do dia aparecem aqui.
              </p>
            </div>
          )}
          {!loading && visibleItems.map((it) => {
            const meta = KIND_META[it.kind];
            const Icon = meta.icon;
            const { rel, abs } = formatRelative(it.createdAt);
            return (
              <button
                key={it.id}
                onClick={() => openItem(it)}
                className="w-full text-left rounded-2xl border p-3 flex gap-3 bg-secondary/50 border-primary/40 active:scale-[0.99] transition-transform animate-fade-in"
              >
                <div className={`w-11 h-11 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 overflow-hidden`}>
                  {it.image ? (
                    <img src={it.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : it.kind === 'diario' ? (
                    <img src={brasaoRepublica} alt="Brasão da República" loading="lazy" className="w-7 h-7 object-contain" />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: meta.color }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span
                      className="text-[9.5px] font-bold uppercase tracking-wider"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-label="não lida" />
                    <span
                      className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary"
                      title={abs}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {rel}
                      <span className="opacity-60">· {abs}</span>
                    </span>
                  </div>
                  <p className="text-[13.5px] font-semibold text-foreground leading-snug line-clamp-2">
                    {it.title}
                  </p>
                  {it.subtitle && (
                    <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                      {it.subtitle}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
