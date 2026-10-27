import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Info,
  Sparkles,
  ArrowUpRight,
  Flame,
  ArrowLeft,
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
  Star,
  ChevronRight,
  Filter,
  Check,
  Heart,
  type LucideIcon,
} from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';
import { PageHeader } from '@/components/vademecum/PageHeader';
import ShapeGrid from '@/components/ui/ShapeGrid';
import {
  BLOG_CATEGORIAS,
  getTemaColor,
  type BlogPost,
  type BlogTema,
  type BlogCategoryMeta,
} from '@/data/blogPosts';
import BlogPostSheet from '@/components/vademecum/BlogPostSheet';
import BlogCoverImage from '@/components/BlogCoverImage';
import { blogThumb } from '@/lib/blogImg';
import { useBlogPostsCache } from '@/hooks/useBlogPostsCache';
import { useFeatureLimit } from '@/hooks/useFeatureLimit';
import PremiumGate from '@/components/PremiumGate';
import { useIsDesktop } from '@/hooks/use-desktop';
import { EmptyState } from '@/components/ui/states';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { recordActivity } from '@/lib/continuity';
import { supabase } from '@/integrations/supabase/client';

// Mapeamento dos ícones para as 10 categorias + Em Alta
const CATEGORY_ICONS: Record<string, LucideIcon> = {
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
  Flame,
};

// Banners ilustrados em estilo Flat para as categorias do Blog
const CATEGORY_BANNERS: Record<string, string> = {
  '09 - História das leis': '/assets/blog-banners/banner_historia_leis.webp',
  'em-alta': '/assets/blog-banners/banner_historia_leis.webp',
};
const DEFAULT_CATEGORY_BANNER = '/assets/blog-banners/banner_historia_leis.webp';

type FilterTab = 'todos' | 'em-alta' | 'favoritos';

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

  // Estados principais
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('todos');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  // Controle de artigos favoritados (sincronização síncrona local)
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

  // Métricas do Supabase para artigos "Em Alta" (views + curtidas calculadas no PostgreSQL)
  const [trendingPostIds, setTrendingPostIds] = useState<string[]>([]);
  const [trendingMetrics, setTrendingMetrics] = useState<
    Map<string, { views: number; likes: number; score: number }>
  >(new Map());

  // Busca métricas em alta e sincroniza favoritos do usuário logado no Supabase
  useEffect(() => {
    let cancelled = false;

    // 1. Carrega artigos em alta ordenados por pontuação (views + curtidas)
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

    // 2. Sincroniza curtidas do usuário no Supabase para a lista de favoritos
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

  useEffect(() => {
    const handleFavSync = () => {
      const set = new Set<string>();
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('blog_fav_') && localStorage.getItem(key) === '1') {
            set.add(key.replace('blog_fav_', ''));
          }
        }
      } catch {}
      setFavPostIds(set);
    };

    window.addEventListener('blog_fav_updated', handleFavSync);
    window.addEventListener('storage', handleFavSync);
    return () => {
      window.removeEventListener('blog_fav_updated', handleFavSync);
      window.removeEventListener('storage', handleFavSync);
    };
  }, []);

  // Garante que ao entrar ou trocar de categoria, a visualização sempre comece no topo (cabeçalho)
  useEffect(() => {
    if (selectedCategory) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [selectedCategory]);

  const handleSelectCategory = (catId: string) => {
    haptic.light();
    setSelectedCategory(catId);
    setFilterTab('todos');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Controle de artigos lidos/concluídos pelo usuário (persistência local)
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

  const { canUse, register } = useFeatureLimit('blog_read');
  const { posts: allPosts, loaded: blogLoaded } = useBlogPostsCache();

  // Auto-open post from query param (compartilhamento ou deep-link)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('post');
    const cat = params.get('cat');
    if (id && allPosts.length > 0) {
      const found = allPosts.find((p) => p.id === id);
      if (found) setSelectedPost(found);
    }
    if (cat && !selectedCategory) {
      const match = BLOG_CATEGORIAS.find((c) => c.id === cat || c.numero === cat);
      if (match) setSelectedCategory(match.id);
    }
  }, [location.search, allPosts, selectedCategory]);

  // Contagem de artigos por categoria
  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allPosts) {
      const cat = p.tema || '';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return map;
  }, [allPosts]);

  // Artigos "Em Alta" (destaque no topo): prioriza artigos com maiores métricas reais no Supabase
  const trendingPosts = useMemo(() => {
    if (!allPosts || allPosts.length === 0) return [];
    if (trendingPostIds.length === 0) {
      return allPosts.slice(0, 10);
    }
    const map = new Map<string, BlogPost>();
    for (const p of allPosts) map.set(p.id, p);

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
      for (const p of allPosts) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          result.push(p);
        }
        if (result.length >= 10) break;
      }
    }

    return result;
  }, [allPosts, trendingPostIds]);

  // Artigos filtrados para a categoria selecionada (inclui suporte para "em-alta")
  const activeCategoryMeta = useMemo(() => {
    if (!selectedCategory) return null;
    if (selectedCategory === 'em-alta') {
      return {
        id: 'em-alta',
        numero: '★',
        titulo: 'Artigos Em Alta',
        subtitulo: 'Os artigos mais lidos e comentados da semana em todas as trilhas',
        iconName: 'Flame',
        colorGradient: 'from-amber-500 via-orange-600 to-rose-600',
        accentColor: '#f97316',
        badgeBg: 'rgba(249, 115, 22, 0.15)',
        badgeText: '#fb923c',
      };
    }
    return BLOG_CATEGORIAS.find((c) => c.id === selectedCategory) || null;
  }, [selectedCategory]);

  // Lista base da categoria sem filtros de busca e aba
  const baseCategoryPosts = useMemo(() => {
    if (!selectedCategory) return [];
    if (selectedCategory === 'em-alta') {
      if (!allPosts || allPosts.length === 0) return [];
      if (trendingPostIds.length === 0) return allPosts.slice(0, 30);
      const map = new Map<string, BlogPost>();
      for (const p of allPosts) map.set(p.id, p);
      const result: BlogPost[] = [];
      const seen = new Set<string>();
      for (const id of trendingPostIds) {
        const p = map.get(id);
        if (p && !seen.has(p.id)) {
          seen.add(p.id);
          result.push(p);
        }
      }
      for (const p of allPosts) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          result.push(p);
        }
        if (result.length >= 50) break;
      }
      return result;
    }
    return allPosts.filter((p) => p.tema === selectedCategory);
  }, [allPosts, selectedCategory, trendingPostIds]);

  // Quantidade de favoritos nesta categoria
  const favoriteCountInCategory = useMemo(() => {
    return baseCategoryPosts.filter((p) => favPostIds.has(p.id)).length;
  }, [baseCategoryPosts, favPostIds]);

  // Artigos filtrados conforme a aba (todos | em-alta | favoritos) e a busca
  const categoryPosts = useMemo(() => {
    let list = baseCategoryPosts;

    if (filterTab === 'em-alta') {
      // Artigos mais emblemáticos e com maior pontuação de métricas da trilha
      list = [...list].sort((a, b) => {
        const scoreA = trendingMetrics.get(a.id)?.score || 0;
        const scoreB = trendingMetrics.get(b.id)?.score || 0;
        return scoreB - scoreA;
      }).slice(0, 20);
    } else if (filterTab === 'favoritos') {
      list = list.filter((p) => favPostIds.has(p.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          p.resumo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [baseCategoryPosts, filterTab, favPostIds, searchQuery, trendingMetrics]);

  const openPost = (post: BlogPost) => {
    if (!canUse) {
      setGateOpen(true);
      return;
    }
    setSelectedPost(post);
    register(post.id);
    recordActivity({ path: `/blog?post=${post.id}`, label: post.titulo, kind: 'blog' });
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
      setSearchQuery('');
      setFilterTab('todos');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-[calc(5.5rem+var(--sai-bottom))] lg:pb-12 text-foreground relative overflow-hidden">
      {/* Fundo de Quadrados Animados idêntico à tela inicial do aplicativo */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ShapeGrid 
          speed={0.5} 
          squareSize={40}
          direction='diagonal'
          borderColor='rgba(255, 255, 255, 0.05)'
          hoverFillColor='rgba(255, 255, 255, 0.1)'
          shape='square'
          hoverTrailAmount={5}
        />
      </div>

      <div className="relative z-10">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4">
          <PageHeader
            title={selectedCategory && activeCategoryMeta ? activeCategoryMeta.titulo : 'Blog Jurídico'}
            subtitle={
              selectedCategory && activeCategoryMeta
                ? `${countsByCategory.get(selectedCategory) || categoryPosts.length} artigos disponíveis`
                : 'Artigos, conceitos e bastidores do Direito'
            }
            onBack={handleBack}
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

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-8">
        <AnimatePresence mode="wait">
          {/* ========================================================
              VIEW A: MODO HUB (CARROSSEL "EM ALTA" + ZIGUE-ZAGUE)
              ======================================================== */}
          {!selectedCategory ? (
            <motion.div
              key="hub-view"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="space-y-8"
            >
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
                    onClick={() => handleSelectCategory('em-alta')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white border border-zinc-600/60 shadow-md transition-all active:scale-95 cursor-pointer"
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
                    return (
                      <div
                        key={post.id}
                        onClick={() => openPost(post)}
                        className="snap-start shrink-0 w-[270px] sm:w-[300px] rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden hover:border-primary/40 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="aspect-[16/9] w-full relative overflow-hidden bg-black/50">
                          <BlogCoverImage
                            postId={post.id}
                            remoteUrl={blogThumb(post.imagem_url)}
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

                          {/* Tag Lido / Não lido na parte de baixo do lado esquerdo da capa */}
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

                          {/* Tempo de leitura no canto inferior direito */}
                          <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 text-[10.5px] font-medium text-white/90 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            {post.tempo_leitura_min} min
                          </div>
                        </div>

                        {/* Corpo com apenas o título (sem a prévia do artigo) */}
                        <div className="p-3.5 pb-3 flex-1 flex items-start">
                          <h3 className="font-display text-[13.5px] sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                            {post.titulo}
                          </h3>
                        </div>

                        {/* Rodapé na parte cinza: data à esquerda e 'Ler artigo' à direita */}
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

              {/* 2. LINHA DIVISÓRIA ELEGANTE */}
              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative z-10 px-4 py-1.5 rounded-full bg-secondary/80 backdrop-blur-md border border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 shadow-sm">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>{allPosts.length > 0 ? `${allPosts.length} Artigos divididos em 10 Categorias` : '499 Artigos divididos em 10 Categorias'}</span>
                </div>
              </div>

              {/* 3. FLUXO EM ZIGUE-ZAGUE DAS 10 CATEGORIAS */}
              <section className="relative py-6 max-w-md sm:max-w-lg mx-auto">
                {/* SVG Connecting Curved Path */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-0"
                  viewBox="0 0 100 1900"
                  preserveAspectRatio="none"
                >
                  <defs>
                    {/* Gradiente por segmento: a cor nasce no ícone de origem e se encontra com a cor do próximo ícone */}
                    {BLOG_CATEGORIAS.slice(0, -1).map((_, i) => {
                      const cat1 = BLOG_CATEGORIAS[i];
                      const cat2 = BLOG_CATEGORIAS[i + 1];
                      const isEven1 = i % 2 === 0;
                      return (
                        <linearGradient
                          key={`trilha-grad-${i}`}
                          id={`trilhaSegmentGradient-${i}`}
                          x1={isEven1 ? '22%' : '78%'}
                          y1="0%"
                          x2={isEven1 ? '78%' : '22%'}
                          y2="100%"
                        >
                          {/* Cor correspondente ao ícone de origem */}
                          <stop offset="0%" stopColor={cat1.accentColor} stopOpacity="0.85" />
                          <stop offset="35%" stopColor={cat1.accentColor} stopOpacity="0.70" />
                          {/* Transição suave onde as cores se encontram na metade da curva */}
                          <stop offset="65%" stopColor={cat2.accentColor} stopOpacity="0.70" />
                          {/* Cor correspondente ao ícone de destino */}
                          <stop offset="100%" stopColor={cat2.accentColor} stopOpacity="0.85" />
                        </linearGradient>
                      );
                    })}
                  </defs>

                  {/* Curva conectando os nós verticais em zigue-zague autêntico */}
                  {BLOG_CATEGORIAS.slice(0, -1).map((_, i) => {
                    const cat1 = BLOG_CATEGORIAS[i];
                    const cat2 = BLOG_CATEGORIAS[i + 1];
                    const rowHeight = 190;
                    const y1 = i * rowHeight + 48;
                    const y2 = (i + 1) * rowHeight + 48;
                    const isEven1 = i % 2 === 0;
                    const x1 = isEven1 ? 22 : 78;
                    const x2 = isEven1 ? 78 : 22;
                    const midY = (y1 + y2) / 2;

                    return (
                      <g key={`zigzag-segment-${i}`}>
                        {/* Linha de brilho difuso suave */}
                        <path
                          d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                          stroke={`url(#trilhaSegmentGradient-${i})`}
                          strokeWidth="5"
                          strokeOpacity="0.10"
                          fill="none"
                          vectorEffect="non-scaling-stroke"
                        />
                        {/* Linha principal tracejada mais fina e delicada */}
                        <path
                          d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                          stroke={`url(#trilhaSegmentGradient-${i})`}
                          strokeWidth="2.2"
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                          fill="none"
                          vectorEffect="non-scaling-stroke"
                          className="opacity-70"
                        />
                        {/* Ponto luminoso intermediário exatamente onde as cores se encontram */}
                        <circle
                          cx="50"
                          cy={midY}
                          r="5.5"
                          fill={cat2.accentColor}
                          fillOpacity="0.25"
                          vectorEffect="non-scaling-stroke"
                        />
                        <circle
                          cx="50"
                          cy={midY}
                          r="2.8"
                          fill={cat1.accentColor}
                          vectorEffect="non-scaling-stroke"
                          className="opacity-90"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Lista Vertical de Trilhas em Zigue-Zague */}
                <div className="relative z-10 flex flex-col">
                  {BLOG_CATEGORIAS.map((cat, idx) => {
                    const isEven = idx % 2 === 0;
                    const IconComp = CATEGORY_ICONS[cat.iconName] || BookOpen;
                    const totalArticles = countsByCategory.get(cat.id) || 50;

                    return (
                      <div
                        key={cat.id}
                        className="h-[190px] relative w-full"
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85, y: 15 }}
                          whileInView={{ opacity: 1, scale: 1, y: 0 }}
                          viewport={{ once: true, margin: '-20px' }}
                          transition={{ delay: 0.04 * idx, duration: 0.3 }}
                          className="absolute top-0 flex flex-col items-center"
                          style={{
                            left: isEven ? '22%' : '78%',
                            transform: 'translateX(-50%)',
                          }}
                        >
                          {/* Botão Circular Principal */}
                          <button
                            type="button"
                            onClick={() => handleSelectCategory(cat.id)}
                            className="group relative flex flex-col items-center focus:outline-none cursor-pointer"
                            aria-label={`Abrir trilha ${cat.titulo}`}
                          >
                            {/* Aura de brilho pulsante no hover */}
                            <div
                              className="absolute -inset-2.5 rounded-full opacity-25 group-hover:opacity-75 blur-md transition-all duration-300 pointer-events-none"
                              style={{ background: cat.accentColor }}
                            />

                            {/* Círculo Principal com gradiente */}
                            <div
                              className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${cat.colorGradient} shadow-2xl border-2 border-white/30 group-hover:scale-105 active:scale-95 transition-transform duration-200`}
                            >
                              <IconComp className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow-md" strokeWidth={1.5} />

                              {/* Badge do número da categoria com traço mais fino e discreto */}
                              <span className="absolute -top-1 -right-1 w-5.5 h-5.5 rounded-full bg-zinc-950/95 border border-white/20 text-white font-mono text-[10px] font-medium flex items-center justify-center shadow-lg">
                                {cat.numero}
                              </span>
                            </div>

                            {/* Informações da categoria com largura confortável e sem abreviação */}
                            <div className="mt-2.5 flex flex-col items-center text-center w-[165px] sm:w-[185px] max-w-[195px] px-3 py-2 rounded-2xl bg-background/90 backdrop-blur-md border border-border/50 shadow-md relative z-20 group-hover:border-primary/50 group-hover:bg-background/95 transition-all">
                              <h4 className="font-display text-xs sm:text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                                {cat.titulo}
                              </h4>
                              <p className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-tight mt-1 font-body">
                                {cat.subtitulo}
                              </p>
                              <div className="mt-1.5 flex items-center justify-center">
                                <span
                                  className="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold tracking-wide shadow-sm"
                                  style={{ background: cat.badgeBg, color: cat.badgeText }}
                                >
                                  {totalArticles} artigos
                                </span>
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </motion.div>
          ) : (
            /* ========================================================
               VIEW B: MODO LISTA DA CATEGORIA (SEM MENU DE ALTERNÂNCIA)
               ======================================================== */
            <motion.div
              key={`category-list-${selectedCategory}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-5"
            >
              {/* Banner da Categoria em Estilo Flat Panorâmico */}
              {activeCategoryMeta && (
                <div className="relative w-full h-36 sm:h-44 md:h-48 rounded-2xl sm:rounded-3xl overflow-hidden border border-border/40 shadow-xl bg-card group">
                  <img
                    src={CATEGORY_BANNERS[activeCategoryMeta.id] || DEFAULT_CATEGORY_BANNER}
                    alt={activeCategoryMeta.titulo}
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500"
                    loading="eager"
                  />
                  {/* Gradiente escuro para legibilidade perfeita do título sobre a arte flat */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15 flex flex-col justify-end p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white shadow-sm border border-white/15">
                        Trilha {activeCategoryMeta.numero}
                      </span>
                      <span className="text-[11px] text-white/85 font-medium drop-shadow-sm">
                        {baseCategoryPosts.length} artigos disponíveis
                      </span>
                    </div>
                    <h2 className="font-display text-lg sm:text-2xl font-bold text-white drop-shadow-md leading-tight">
                      {activeCategoryMeta.titulo}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-white/90 line-clamp-1 font-body mt-0.5 max-w-xl drop-shadow-sm">
                      {activeCategoryMeta.subtitulo}
                    </p>
                  </div>
                </div>
              )}

              {/* Barra de Busca dentro da categoria */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Pesquisar nos artigos desta categoria...`}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border/60 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              {/* Menu de Alternância de Abas: Todos | Em alta | Favoritos */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card/80 backdrop-blur-md border border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setFilterTab('todos');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === 'todos'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Todos</span>
                  <span
                    className={`text-[10px] ml-0.5 px-1.5 py-0.2 rounded-full ${
                      filterTab === 'todos'
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {baseCategoryPosts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setFilterTab('em-alta');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === 'em-alta'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Flame
                    className={`w-3.5 h-3.5 ${
                      filterTab === 'em-alta' ? 'text-white fill-white' : 'text-orange-500 fill-orange-500'
                    }`}
                  />
                  <span>Em alta</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setFilterTab('favoritos');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === 'favoritos'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      filterTab === 'favoritos' ? 'text-white fill-white' : 'text-rose-500 fill-rose-500'
                    }`}
                  />
                  <span>Favoritos</span>
                  <span
                    className={`text-[10px] ml-0.5 px-1.5 py-0.2 rounded-full ${
                      filterTab === 'favoritos'
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {favoriteCountInCategory}
                  </span>
                </button>
              </div>

              {/* Lista Vertical de Artigos */}
              <div className="space-y-3">
                {categoryPosts.length > 0 ? (
                  categoryPosts.map((post, idx) => {
                    const themeColor = getTemaColor(post.tema);
                    const cardContent = (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx, 15) * 0.03, duration: 0.2 }}
                        onClick={() => openPost(post)}
                        className="group relative flex items-stretch gap-3 sm:gap-4 p-3 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md hover:border-primary/50 hover:bg-card/90 transition-all cursor-pointer shadow-sm hover:shadow-md overflow-hidden"
                      >
                        {/* Thumbnail */}
                        <div className="w-24 sm:w-28 aspect-square rounded-xl shrink-0 relative overflow-hidden bg-black/40 border border-border/40">
                          <BlogCoverImage
                            postId={post.id}
                            remoteUrl={blogThumb(post.imagem_url)}
                            alt={post.titulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading={idx < 5 ? 'eager' : 'lazy'}
                          />
                          {/* Tag Lido / Não lido no thumbnail */}
                          <div className="absolute bottom-1.5 left-1.5 z-10">
                            {isPostRead(post.id) ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white bg-emerald-600/95 backdrop-blur-md px-1.5 py-0.5 rounded-full shadow-sm">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                Lido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-zinc-300 bg-zinc-900/80 border border-white/10 backdrop-blur-md px-1.5 py-0.5 rounded-full shadow-sm">
                                Não lido
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Conteúdo textual */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <h3 className="font-display text-[14px] sm:text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                              {post.titulo}
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 font-body leading-relaxed">
                              {post.resumo}
                            </p>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-body">
                              <Clock className="w-3 h-3 text-muted-foreground/70" />
                              {post.tempo_leitura_min} min de leitura
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-primary font-semibold text-[11.5px] group-hover:translate-x-0.5 transition-transform">
                              Ler artigo <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );

                    if (!isDesktop) return cardContent;

                    return (
                      <ContextMenu key={post.id}>
                        <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
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
                ) : filterTab === 'favoritos' ? (
                  <EmptyState
                    title="Nenhum favorito nesta categoria"
                    description="Abra um artigo e toque no ícone de coração para salvá-lo como favorito."
                  />
                ) : (
                  <EmptyState
                    title="Nenhum artigo encontrado"
                    description="Tente buscar por outras palavras-chave ou selecione outra aba."
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sheet Leitor do Artigo Completo com fidelidade Word/Markdown */}
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
