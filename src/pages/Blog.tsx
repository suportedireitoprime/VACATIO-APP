import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Info,
  Sparkles,
  ArrowUpRight,
  Flame,
  Search,
  Scale,
  ScrollText,
  Landmark,
  Users,
  Gavel,
  Shield,
  Crown,
  HeartHandshake,
  Hourglass,
  Eye,
  BookOpen,
  Share2,
  Copy,
  ChevronRight,
  Check,
  Layers,
  X,
  type LucideIcon,
} from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';
import { PageHeader } from '@/components/vademecum/PageHeader';
import ShapeGrid from '@/components/ui/ShapeGrid';
import {
  BLOG_CATEGORIAS,
  getTemaColor,
  type BlogPost,
} from '@/data/blogPosts';
import BlogPostSheet from '@/components/vademecum/BlogPostSheet';
import BlogCoverImage from '@/components/BlogCoverImage';
import { blogThumb } from '@/lib/blogImg';
import { useBlogPostsCache } from '@/hooks/useBlogPostsCache';
import { useFeatureLimit } from '@/hooks/useFeatureLimit';
import { useSubscription } from '@/hooks/useSubscription';
import PremiumGate from '@/components/PremiumGate';
import { useIsDesktop } from '@/hooks/use-desktop';
import { EmptyState } from '@/components/ui/states';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { recordActivity } from '@/lib/continuity';
import { supabase } from '@/integrations/supabase/client';

// Mapeamento dos ícones para as categorias do Blog
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Hourglass,
  Scale,
  ScrollText,
  Landmark,
  Users,
  Gavel,
  Shield,
  Crown,
  HeartHandshake,
  Eye,
  Flame,
  Layers,
  BookOpen,
};

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${day} ${months[d.getMonth()]} · ${d.getFullYear()}`;
}

const Blog = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();

  // Aba ativa do menu de alternância ('todos' | id da categoria | 'em-alta')
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(25);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  // Controle de artigos favoritados
  const [favPostIds, setFavPostIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('blog_fav_') && localStorage.getItem(key) === '1') {
          set.add(key.replace('blog_fav_', ''));
        }
      }
    } catch {}
    return set;
  });

  // Métricas do Supabase para artigos "Em Alta"
  const [trendingPostIds, setTrendingPostIds] = useState<string[]>([]);
  const [trendingMetrics, setTrendingMetrics] = useState<
    Map<string, { views: number; likes: number; score: number }>
  >(new Map());

  useEffect(() => {
    let cancelled = false;

    // 1. Carrega artigos em alta ordenados por pontuação
    (async () => {
      try {
        const { data, error } = await supabase.rpc('blog_metricas_em_alta' as any, { _dias: 30 });
        if (!cancelled && !error && Array.isArray(data) && data.length > 0) {
          const map = new Map<string, { views: number; likes: number; score: number }>();
          const ids: string[] = [];
          for (const row of (data as any[])) {
            if (row?.post_id) {
              ids.push(row.post_id);
              map.set(row.post_id, {
                views: Number(row.total_views || 0),
                likes: Number(row.total_likes || 0),
                score: Number(row.score || 0),
              });
            }
          }
          setTrendingPostIds(ids);
          setTrendingMetrics(map);
        }
      } catch (err) {
        console.warn('[Blog] Erro ao carregar métricas em alta:', err);
      }
    })();

    // 2. Sincroniza curtidas do usuário no Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !cancelled) {
        supabase
          .from('blog_post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .then(({ data, error }) => {
            if (!cancelled && !error && Array.isArray(data) && data.length > 0) {
              setFavPostIds((prev) => {
                const next = new Set(prev);
                for (const row of data) {
                  if (row?.post_id) {
                    next.add(row.post_id);
                    try {
                      localStorage.setItem(`blog_fav_${row.post_id}`, '1');
                    } catch {}
                  }
                }
                return next;
              });
            }
          });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Controle de artigos lidos/concluídos
  const [readPostIds, setReadPostIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('blog_concluido_') && localStorage.getItem(key) === '1') {
          set.add(key.replace('blog_concluido_', ''));
        }
      }
    } catch {}
    return set;
  });

  useEffect(() => {
    const handleStatusSync = () => {
      const set = new Set<string>();
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('blog_concluido_') && localStorage.getItem(key) === '1') {
            set.add(key.replace('blog_concluido_', ''));
          }
        }
      } catch {}
      setReadPostIds(set);
    };

    window.addEventListener('blog_status_updated', handleStatusSync);
    window.addEventListener('storage', handleStatusSync);
    return () => {
      window.removeEventListener('blog_status_updated', handleStatusSync);
      window.removeEventListener('storage', handleStatusSync);
    };
  }, []);

  const isPostRead = (id: string) => readPostIds.has(id);

  const { isPremium } = useSubscription();
  const { register } = useFeatureLimit('blog_read');
  const { posts: allPosts, loaded: blogLoaded } = useBlogPostsCache();
  const safePosts = useMemo(() => (Array.isArray(allPosts) ? allPosts : []), [allPosts]);

  // Auto-open post from query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('post');
    const cat = params.get('cat');
    if (id && safePosts.length > 0) {
      const found = safePosts.find((p) => p.id === id);
      if (found) setSelectedPost(found);
    }
    if (cat) {
      const match = BLOG_CATEGORIAS.find((c) => c.id === cat || c.numero === cat);
      if (match) setActiveTab(match.id);
    }
  }, [location.search, safePosts]);

  // Contagem de artigos por categoria
  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of safePosts) {
      const cat = p.tema || '';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return map;
  }, [safePosts]);

  // Mapa com a primeira imagem válida encontrada para cada categoria (para servir de fallback garantido)
  const firstImageByCategory = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of safePosts) {
      if (p.tema && p.imagem_url && !map.has(p.tema)) {
        map.set(p.tema, p.imagem_url);
      }
    }
    return map;
  }, [safePosts]);

  // Artigos "Em Alta" (destaque no topo)
  const trendingPosts = useMemo(() => {
    if (!safePosts || safePosts.length === 0) return [];
    if (trendingPostIds.length === 0) {
      return safePosts.slice(0, 10);
    }
    const map = new Map<string, BlogPost>();
    for (const p of safePosts) map.set(p.id, p);

    const result: BlogPost[] = [];
    const seen = new Set<string>();

    for (const id of trendingPostIds) {
      const p = map.get(id);
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
      if (result.length >= 10) break;
    }

    if (result.length < 10) {
      for (const p of safePosts) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          result.push(p);
        }
        if (result.length >= 10) break;
      }
    }

    return result;
  }, [safePosts, trendingPostIds]);

  // Montagem das abas do menu de alternância: Todos, depois História das Leis, e depois as demais matérias
  const tabsList = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      iconName?: string;
      count: number;
      accentColor?: string;
    }> = [
      {
        id: 'todos',
        label: 'Todos',
        iconName: 'Layers',
        count: safePosts.length,
      },
    ];

    // Adiciona as categorias na ordem definida (História das Leis é a 1ª)
    for (const cat of BLOG_CATEGORIAS) {
      list.push({
        id: cat.id,
        label: cat.titulo,
        iconName: cat.iconName,
        count: countsByCategory.get(cat.id) || 0,
        accentColor: cat.accentColor,
      });
    }

    // Adiciona também a opção Em Alta para acesso rápido
    list.push({
      id: 'em-alta',
      label: 'Em Alta',
      iconName: 'Flame',
      count: trendingPosts.length,
      accentColor: '#f97316',
    });

    return list;
  }, [safePosts.length, countsByCategory, trendingPosts.length]);

  // Filtragem dos artigos conforme a aba ativa e a busca por texto
  const filteredPosts = useMemo(() => {
    let list: BlogPost[] = [];

    if (activeTab === 'todos') {
      list = safePosts;
    } else if (activeTab === 'em-alta') {
      list = trendingPosts;
    } else {
      list = safePosts.filter((p) => p.tema === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          (p.resumo && p.resumo.toLowerCase().includes(q))
      );
    }

    return list;
  }, [safePosts, activeTab, trendingPosts, searchQuery]);

  // Artigos paginados para evitar renderização pesada no DOM
  const displayedPosts = useMemo(() => {
    return filteredPosts.slice(0, displayLimit);
  }, [filteredPosts, displayLimit]);

  const handleTabChange = (tabId: string) => {
    haptic.light();
    setActiveTab(tabId);
    setDisplayLimit(25);
  };

  const openPost = (post: BlogPost) => {
    if (!isPremium) {
      setGateOpen(true);
      return;
    }
    setSelectedPost(post);
    register(post.id);
    recordActivity({ path: `/blog?post=${post.id}`, label: post.titulo, kind: 'blog' });
  };

  return (
    <div className="min-h-dvh bg-background pb-[calc(7rem+var(--sai-bottom,0px))] lg:pb-12 text-foreground relative overflow-hidden">
      {/* Fundo animado de quadrados */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ShapeGrid 
          speed={0.5} 
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(255, 255, 255, 0.05)"
          hoverFillColor="rgba(255, 255, 255, 0.1)"
          shape="square"
          hoverTrailAmount={5}
        />
      </div>

      <div className="relative z-10">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-4xl mx-auto px-4">
            <PageHeader
              title="Blog Jurídico"
              subtitle="Artigos, conceitos e bastidores do Direito"
              onBack={() => navigate(-1)}
              rightAction={
                <button
                  onClick={() => setInfoOpen((v) => !v)}
                  aria-expanded={infoOpen}
                  aria-label="Sobre o Blog"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    infoOpen
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Info className="w-4 h-4" />
                </button>
              }
            />
          </div>
        </header>

        {/* Info Drawer Panel */}
        <AnimatePresence initial={false}>
          {infoOpen && (
            <motion.div
              key="info-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="overflow-hidden max-w-4xl mx-auto px-4"
            >
              <div className="mt-3 mb-2 rounded-2xl border border-primary/30 bg-card/70 backdrop-blur-md p-4 space-y-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-sm font-bold text-foreground">Como funciona o Blog Jurídico</h3>
                </div>
                <p className="font-body text-xs leading-relaxed text-muted-foreground">
                  Artigos profundos, didáticos e sem juridiquês, divididos em <strong className="text-foreground">10 trilhas fundamentais</strong>.
                  Cada trilha reúne dezenas de artigos com tabelas comparativas, exemplos práticos e análises dos bastidores do poder.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="max-w-4xl mx-auto px-4 py-5 space-y-7">
          {/* 1. SEÇÃO EM ALTA (CARROSSEL HORIZONTAL) */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <Flame className="w-6 h-6 text-orange-500 fill-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.65)] animate-pulse shrink-0" />
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-foreground leading-tight tracking-tight uppercase">
                    Em Alta
                  </h2>
                  <p className="text-[11.5px] text-muted-foreground font-body">
                    Artigos mais lidos e comentados da semana
                  </p>
                </div>
              </div>

              {/* Botão Ver todos cinza com texto branco */}
              <button
                type="button"
                onClick={() => handleTabChange('em-alta')}
                aria-label="Ver todos os artigos em alta"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-full text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white border border-zinc-600/60 shadow-md transition-all active:scale-95 cursor-pointer touch-manipulation shrink-0"
              >
                <span className="text-white font-medium">Ver todos</span>
                <ChevronRight className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              </button>
            </div>

            {/* Carrossel Horizontal com Snap */}
            <div className="flex gap-3.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 snap-x snap-mandatory">
              {trendingPosts.map((post) => {
                const themeColor = getTemaColor(post.tema);
                const isRead = isPostRead(post.id);
                const fallbackImg = firstImageByCategory.get(post.tema) || '';
                const cover = post.imagem_url || fallbackImg;

                return (
                  <div
                    key={post.id}
                    onClick={() => openPost(post)}
                    className="snap-start shrink-0 w-[270px] sm:w-[300px] rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden hover:border-primary/40 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="aspect-[16/9] w-full relative overflow-hidden bg-black/50">
                      <BlogCoverImage
                        postId={post.id}
                        remoteUrl={blogThumb(cover)}
                        alt={post.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Badge de categoria no topo */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-md backdrop-blur-md"
                          style={{ background: themeColor.chip, color: themeColor.chipText }}
                        >
                          {post.tema.replace(/^[0-9]{2}\s*-\s*/, '')}
                        </span>
                      </div>

                      {/* Tag Lido / Não lido */}
                      <div className="absolute bottom-2.5 left-2.5 z-10">
                        {isRead ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600/95 backdrop-blur-md px-2.5 py-0.5 rounded-full shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                            Lido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-300 bg-zinc-900/85 border border-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full shadow-sm">
                            Não lido
                          </span>
                        )}
                      </div>

                      {/* Tempo de leitura */}
                      <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 text-[10.5px] font-medium text-white/90 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        {post.tempo_leitura_min} min
                      </div>
                    </div>

                    <div className="p-3.5 pb-3 flex-1 flex items-start">
                      <h3 className="font-display text-[13.5px] sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {post.titulo}
                      </h3>
                    </div>

                    <div className="px-3.5 py-2.5 bg-muted/60 dark:bg-zinc-800/60 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{formatDate(post.data_publicacao)}</span>
                      <span className="inline-flex items-center gap-0.5 text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
                        Ler artigo <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. SEÇÃO DE MATÉRIAS: TÍTULO + MENU DE ALTERNÂNCIA + LISTA ESTILO NOTÍCIA JURÍDICA */}
          <section className="space-y-4 pt-2">
            {/* Título da seção */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-foreground leading-tight tracking-tight uppercase">
                    Matérias
                  </h2>
                  <p className="text-[11.5px] text-muted-foreground font-body">
                    Selecione a matéria para filtrar os artigos
                  </p>
                </div>
              </div>

              <span className="text-[11.5px] font-bold text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full border border-border/50">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'artigo' : 'artigos'}
              </span>
            </div>

            {/* Menu de Alternância (Pills Horizontais roláveis) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 snap-x">
              {tabsList.map((tab) => {
                const isSelected = activeTab === tab.id;
                const Icon = tab.iconName && CATEGORY_ICONS[tab.iconName] ? CATEGORY_ICONS[tab.iconName] : BookOpen;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`snap-start shrink-0 inline-flex items-center gap-2 min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer touch-manipulation active:scale-95 shadow-sm ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-primary/25 shadow-md border border-primary font-bold'
                        : 'bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border border-border/50 font-medium'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="whitespace-nowrap">{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isSelected
                          ? 'bg-black/25 text-primary-foreground font-bold'
                          : 'bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative pt-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayLimit(25);
                }}
                placeholder="Pesquisar artigos por título ou assunto..."
                className="w-full h-10 pl-10 pr-9 rounded-xl bg-card/60 backdrop-blur-sm border border-border/60 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar pesquisa"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Lista no estilo Notícia Jurídica: Capa à Esquerda | Detalhes à Direita */}
            <div className="space-y-3 pt-1">
              {displayedPosts.length > 0 ? (
                displayedPosts.map((post, idx) => {
                  const themeColor = getTemaColor(post.tema);
                  const isRead = isPostRead(post.id);
                  // Primeira imagem da categoria caso o artigo não tenha imagem própria
                  const fallbackCatImg = firstImageByCategory.get(post.tema) || '';
                  const coverUrl = post.imagem_url || fallbackCatImg;

                  const cardItem = (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx, 10) * 0.02, duration: 0.2 }}
                      onClick={() => openPost(post)}
                      className="group flex items-stretch gap-0 bg-card border rounded-2xl border-border/60 hover:border-primary/40 active:bg-secondary/30 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                    >
                      {/* Capa do lado esquerdo (igual notícia jurídica) */}
                      <div className="w-28 sm:w-36 shrink-0 relative overflow-hidden bg-black/40 border-r border-border/40">
                        <BlogCoverImage
                          postId={post.id}
                          remoteUrl={blogThumb(coverUrl)}
                          alt={post.titulo}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading={idx < 5 ? 'eager' : 'lazy'}
                        />
                        {/* Tag Lido / Não lido */}
                        <div className="absolute bottom-1.5 left-1.5 z-10">
                          {isRead ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-emerald-600/95 backdrop-blur-md px-1.5 py-0.5 rounded shadow-sm">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              Lido
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-semibold text-zinc-300 bg-zinc-950/80 backdrop-blur-md px-1.5 py-0.5 rounded shadow-sm">
                              Não lido
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Conteúdo do lado direito (igual notícia jurídica) */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5 p-3 sm:p-3.5">
                        <div>
                          {/* Badge da matéria */}
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span
                              className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                              style={{ background: themeColor.chip, color: themeColor.chipText }}
                            >
                              {post.tema.replace(/^[0-9]{2}\s*-\s*/, '')}
                            </span>
                          </div>

                          {/* Título */}
                          <h3 className="font-display text-[13.5px] sm:text-[15px] font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {post.titulo}
                          </h3>

                          {/* Resumo */}
                          {post.resumo && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 font-body leading-relaxed">
                              {post.resumo}
                            </p>
                          )}
                        </div>

                        {/* Rodapé com tempo de leitura, data e 'Ler artigo' */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/30">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-medium text-foreground/85">
                              <Clock className="w-3 h-3 text-primary" />
                              {post.tempo_leitura_min} min
                            </span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                            <span>{formatDate(post.data_publicacao)}</span>
                          </div>
                          <span className="inline-flex items-center gap-0.5 text-primary font-semibold group-hover:translate-x-0.5 transition-transform text-[11px]">
                            Ler artigo <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );

                  if (!isDesktop) return cardItem;

                  return (
                    <ContextMenu key={post.id}>
                      <ContextMenuTrigger asChild>{cardItem}</ContextMenuTrigger>
                      <ContextMenuContent className="w-56">
                        <ContextMenuItem onClick={() => openPost(post)}>
                          <ArrowUpRight className="w-4 h-4 mr-2" /> Abrir artigo
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/blog?post=${post.id}`);
                            toast.success('Link copiado!');
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" /> Copiar link
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => {
                            if ('share' in navigator && typeof navigator.share === 'function') {
                              navigator.share({
                                title: post.titulo,
                                url: `${window.location.origin}/blog?post=${post.id}`,
                              }).catch(() => {});
                            }
                          }}
                        >
                          <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })
              ) : (
                <EmptyState
                  title="Nenhum artigo encontrado"
                  description="Não encontramos artigos correspondentes ao filtro ou busca selecionada."
                />
              )}

              {/* Botão para carregar mais artigos caso haja excedente */}
              {filteredPosts.length > displayLimit && (
                <div className="pt-3 pb-2 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayLimit((prev) => prev + 25)}
                    className="rounded-full px-6 py-2 min-h-[42px] text-xs font-semibold border-border/60 hover:bg-muted"
                  >
                    Carregar mais artigos ({filteredPosts.length - displayLimit} restantes)
                  </Button>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Sheet Leitor do Artigo Completo */}
        <BlogPostSheet
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />

        {/* Gate para controle de limites / assinaturas */}
        <PremiumGate
          open={gateOpen}
          onClose={() => setGateOpen(false)}
          feature="blog"
        />
      </div>
    </div>
  );
};

export default Blog;
