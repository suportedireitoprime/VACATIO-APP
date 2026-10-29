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
  BookOpen,
  ChevronRight,
  Check,
  X,
  Share2,
  Copy,
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

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${day} ${months[d.getMonth()]} · ${d.getFullYear()}`;
}

/**
 * Torna títulos em ALL CAPS confortáveis e fáceis de ler, preservando títulos já formatados.
 */
function formatTitleReadable(title: string): string {
  if (!title) return '';
  const trimmed = title.trim();
  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-ZÀ-Ú]/.test(trimmed);
  if (!isAllCaps) return trimmed;

  return trimmed
    .toLowerCase()
    .replace(/(^\p{L})|([:—–-]\s*\p{L})/gu, (char) => char.toUpperCase());
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
  const { posts: allPosts } = useBlogPostsCache();
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

  // Montagem das abas idênticas ao estilo do início do app:
  // Todos, depois História das Leis, e depois as demais matérias
  const tabsList = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
    }> = [
      {
        id: 'todos',
        label: 'Todos',
      },
    ];

    // Adiciona as categorias na ordem definida (História das Leis é a 1ª)
    for (const cat of BLOG_CATEGORIAS) {
      list.push({
        id: cat.id,
        label: cat.titulo,
      });
    }

    // Adiciona também a opção Em Alta
    list.push({
      id: 'em-alta',
      label: 'Em Alta',
    });

    return list;
  }, []);

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

  // Artigos paginados para rolagem 60 FPS
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

  // Nome amigável da aba selecionada para o cabeçalho
  const activeTabLabel = useMemo(() => {
    if (activeTab === 'todos') return 'Todas as Matérias';
    if (activeTab === 'em-alta') return 'Artigos Em Alta';
    return tabsList.find((t) => t.id === activeTab)?.label || 'Matérias';
  }, [activeTab, tabsList]);

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
                  <h3 className="font-card text-sm font-bold text-foreground">Como funciona o Blog Jurídico</h3>
                </div>
                <p className="font-card text-xs leading-relaxed text-muted-foreground">
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
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.65)] animate-pulse shrink-0" />
                <div>
                  <h2 className="font-card text-base sm:text-lg font-bold text-foreground leading-tight tracking-tight">
                    Em Alta
                  </h2>
                  <p className="text-[12px] text-muted-foreground font-card">
                    Artigos mais lidos e comentados da semana
                  </p>
                </div>
              </div>

              {/* Botão Ver todos igual ao estilo das pílulas */}
              <button
                type="button"
                onClick={() => handleTabChange('em-alta')}
                aria-label="Ver todos os artigos em alta"
                className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-card font-semibold bg-secondary/80 hover:bg-secondary text-foreground border border-border/50 shadow-sm transition-all active:scale-95 cursor-pointer touch-manipulation shrink-0"
              >
                <span>Ver todos</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground stroke-[2.5]" />
              </button>
            </div>

            {/* Carrossel Horizontal com Snap */}
            <div className="flex gap-3.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 snap-x snap-mandatory">
              {trendingPosts.map((post) => {
                const themeColor = getTemaColor(post.tema);
                const isRead = isPostRead(post.id);
                const fallbackImg = firstImageByCategory.get(post.tema) || '';
                const cover = post.imagem_url || fallbackImg;
                const cleanTitle = formatTitleReadable(post.titulo);
                const cleanTema = post.tema.replace(/^[0-9]{2}\s*-\s*/, '');

                return (
                  <div
                    key={post.id}
                    onClick={() => openPost(post)}
                    className="snap-start shrink-0 w-[270px] sm:w-[300px] rounded-2xl border border-border/50 bg-card/70 backdrop-blur-md overflow-hidden hover:border-primary/40 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="aspect-[16/9] w-full relative overflow-hidden bg-black/50">
                      <BlogCoverImage
                        postId={post.id}
                        remoteUrl={blogThumb(cover)}
                        alt={cleanTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                      {/* Badge de categoria no topo */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-card font-bold tracking-wide uppercase shadow-md backdrop-blur-md"
                          style={{ background: themeColor.chip, color: themeColor.chipText }}
                        >
                          {cleanTema}
                        </span>
                      </div>

                      {/* Tag Lido / Não lido */}
                      <div className="absolute bottom-2.5 left-2.5 z-10">
                        {isRead ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-card font-bold text-white bg-emerald-600/95 backdrop-blur-md px-2 py-0.5 rounded-md shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                            Lido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-card font-medium text-zinc-300 bg-zinc-900/85 border border-white/10 backdrop-blur-md px-2 py-0.5 rounded-md shadow-sm">
                            Não lido
                          </span>
                        )}
                      </div>

                      {/* Tempo de leitura */}
                      <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 text-[11px] font-card font-medium text-white/90 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-primary" />
                        {post.tempo_leitura_min} min
                      </div>
                    </div>

                    <div className="p-3.5 pb-2.5 flex-1 flex items-start">
                      <h3 className="font-card text-[14.5px] sm:text-[15.5px] font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors tracking-tight">
                        {cleanTitle}
                      </h3>
                    </div>

                    <div className="px-3.5 py-2.5 bg-muted/40 dark:bg-zinc-800/40 border-t border-border/40 flex items-center justify-between text-[11.5px] font-card text-muted-foreground">
                      <span>{formatDate(post.data_publicacao)}</span>
                      <span className="inline-flex items-center gap-0.5 text-primary font-semibold group-hover:translate-x-0.5 transition-transform text-xs">
                        Ler artigo <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. SEÇÃO DE MATÉRIAS: TÍTULO + MENU DE ALTERNÂNCIA (IGUAL INÍCIO DO APP) + LISTA */}
          <section className="space-y-4 pt-1">
            {/* Menu de Alternância (Exatamente como o do Início do App) */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 -mx-4 pb-1 pt-1 snap-x">
              {tabsList.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`snap-start min-h-[44px] px-5 py-2.5 rounded-full text-[13.5px] font-card font-medium flex items-center justify-center whitespace-nowrap transition-all active:scale-95 touch-manipulation cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white shadow-md shadow-primary/25 font-semibold'
                        : 'bg-secondary/60 text-muted-foreground border border-border/50 hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Cabeçalho da Seção com traço vertical (Estilo do Início do App) */}
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-primary shrink-0" />
                <h3 className="font-card text-foreground text-[17px] font-semibold tracking-[-0.01em]">
                  {activeTabLabel}
                </h3>
              </div>

              <span className="text-[12px] font-card text-muted-foreground font-medium">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'artigo' : 'artigos'}
              </span>
            </div>

            {/* Campo de Busca Rápida Estilizado */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayLimit(25);
                }}
                placeholder="Pesquisar artigos por tema ou palavra-chave..."
                className="w-full h-11 pl-10 pr-9 rounded-2xl bg-secondary/40 border border-border/60 text-xs sm:text-sm text-foreground font-card placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:bg-secondary/70 focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar pesquisa"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Lista no estilo Notícia Jurídica: Capa à Esquerda | Detalhes à Direita com Tipografia Legível */}
            <div className="space-y-3.5 pt-1">
              {displayedPosts.length > 0 ? (
                displayedPosts.map((post, idx) => {
                  const themeColor = getTemaColor(post.tema);
                  const isRead = isPostRead(post.id);
                  const fallbackCatImg = firstImageByCategory.get(post.tema) || '';
                  const coverUrl = post.imagem_url || fallbackCatImg;
                  const cleanTitle = formatTitleReadable(post.titulo);
                  const cleanTema = post.tema.replace(/^[0-9]{2}\s*-\s*/, '');

                  const cardItem = (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx, 8) * 0.02, duration: 0.2 }}
                      onClick={() => openPost(post)}
                      className="group relative flex items-stretch bg-card/75 backdrop-blur-md border border-border/50 rounded-2xl hover:border-primary/40 active:bg-secondary/30 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                    >
                      {/* Capa do lado esquerdo */}
                      <div className="w-28 sm:w-36 shrink-0 relative overflow-hidden bg-black/40 border-r border-border/30">
                        <BlogCoverImage
                          postId={post.id}
                          remoteUrl={blogThumb(coverUrl)}
                          alt={cleanTitle}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading={idx < 5 ? 'eager' : 'lazy'}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                        {/* Tag Lido / Não lido */}
                        <div className="absolute bottom-1.5 left-1.5 z-10">
                          {isRead ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-card font-bold text-white bg-emerald-600/90 backdrop-blur-md px-1.5 py-0.5 rounded-md shadow-sm">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                              Lido
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-card font-medium text-zinc-300 bg-zinc-950/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10 shadow-sm">
                              Não lido
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Conteúdo do lado direito com tipografia font-card altamente legível */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5 p-3.5 sm:p-4">
                        <div>
                          {/* Badge da matéria */}
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-card font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                              style={{ background: themeColor.chip, color: themeColor.chipText }}
                            >
                              {cleanTema}
                            </span>
                          </div>

                          {/* Título com tipografia font-card (Plus Jakarta Sans) de leitura fluida */}
                          <h3 className="font-card text-[15px] sm:text-[16px] font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors tracking-tight">
                            {cleanTitle}
                          </h3>

                          {/* Resumo */}
                          {post.resumo && (
                            <p className="mt-1.5 text-xs sm:text-[13px] text-muted-foreground/90 line-clamp-2 font-card leading-relaxed">
                              {post.resumo}
                            </p>
                          )}
                        </div>

                        {/* Rodapé com tempo de leitura, data e 'Ler artigo' */}
                        <div className="flex items-center justify-between text-xs font-card text-muted-foreground pt-2 border-t border-border/30">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-medium text-foreground/85">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              {post.tempo_leitura_min} min
                            </span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                            <span className="text-[11.5px]">{formatDate(post.data_publicacao)}</span>
                          </div>
                          <span className="inline-flex items-center gap-0.5 text-primary font-semibold group-hover:translate-x-0.5 transition-transform text-xs">
                            Ler artigo <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
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
                    className="rounded-full px-6 py-2.5 min-h-[44px] text-xs font-card font-semibold border-border/60 hover:bg-muted"
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
