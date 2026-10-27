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
} from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
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

// Mapeamento dos ícones para as 10 categorias
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
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

  // Estados principais
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

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

  // Artigos "Em Alta" (destaque no topo)
  const trendingPosts = useMemo(() => {
    if (!allPosts || allPosts.length === 0) return [];
    // Prioriza artigos emblemáticos e variados
    return allPosts.slice(0, 10);
  }, [allPosts]);

  // Artigos filtrados para a categoria selecionada
  const activeCategoryMeta = useMemo(() => {
    if (!selectedCategory) return null;
    return BLOG_CATEGORIAS.find((c) => c.id === selectedCategory) || null;
  }, [selectedCategory]);

  const categoryPosts = useMemo(() => {
    if (!selectedCategory) return [];
    let list = allPosts.filter((p) => p.tema === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.titulo.toLowerCase().includes(q) ||
          p.resumo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPosts, selectedCategory, searchQuery]);

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
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-[calc(5.5rem+var(--sai-bottom))] lg:pb-12 text-foreground">
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
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <Flame className="w-4 h-4 fill-amber-500" />
                    </div>
                    <div>
                      <h2 className="font-display text-base sm:text-lg font-bold text-foreground leading-tight">
                        Em Alta
                      </h2>
                      <p className="text-[11.5px] text-muted-foreground font-body">
                        Artigos mais lidos e comentados da semana
                      </p>
                    </div>
                  </div>
                </div>

                {/* Carrossel Horizontal com Snap */}
                <div className="flex gap-3.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 snap-x snap-mandatory">
                  {trendingPosts.map((post) => {
                    const themeColor = getTemaColor(post.tema);
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
                          <div className="absolute top-2.5 left-2.5">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-md backdrop-blur-md"
                              style={{ background: themeColor.chip, color: themeColor.chipText }}
                            >
                              {post.tema.replace(/^[0-9]{2}\s*-\s*/, '')}
                            </span>
                          </div>

                          {/* Tempo de leitura */}
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[10.5px] font-medium text-white/90 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            {post.tempo_leitura_min} min
                          </div>
                        </div>

                        <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                          <h3 className="font-display text-[13.5px] sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                            {post.titulo}
                          </h3>
                          <p className="text-[11.5px] text-muted-foreground line-clamp-2 leading-relaxed font-body">
                            {post.resumo}
                          </p>
                          <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/30">
                            <span>{formatDate(post.data_publicacao)}</span>
                            <span className="inline-flex items-center gap-0.5 text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                              Ler artigo <ArrowUpRight className="w-3 h-3" />
                            </span>
                          </div>
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
                <div className="relative z-10 px-4 py-1 rounded-full bg-secondary/80 backdrop-blur-md border border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  10 Trilhas Temáticas em Zigue-Zague
                </div>
              </div>

              {/* 3. FLUXO EM ZIGUE-ZAGUE DAS 10 CATEGORIAS */}
              <section className="relative py-6">
                {/* SVG Connecting Curved Path */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-0"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="zigzagGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                      <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.4" />
                      <stop offset="60%" stopColor="#a855f7" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                  {/* Curva conectando os nós verticais em zigzag */}
                  {BLOG_CATEGORIAS.slice(0, -1).map((_, i) => {
                    const itemHeight = 160; // espaçamento vertical aproximado entre nós
                    const y1 = 40 + i * itemHeight;
                    const y2 = 40 + (i + 1) * itemHeight;
                    const isEven1 = i % 2 === 0;
                    const x1 = isEven1 ? 'calc(50% - 60px)' : 'calc(50% + 60px)';
                    const x2 = isEven1 ? 'calc(50% + 60px)' : 'calc(50% - 60px)';

                    return (
                      <path
                        key={`path-${i}`}
                        d={`M ${x1} ${y1} C ${x1} ${y1 + 80}, ${x2} ${y2 - 80}, ${x2} ${y2}`}
                        stroke="url(#zigzagGradient)"
                        strokeWidth="3.5"
                        strokeDasharray="6 4"
                        fill="none"
                        className="opacity-70"
                      />
                    );
                  })}
                </svg>

                {/* Lista Vertical com nós alternados em Zigue-Zague */}
                <div className="relative z-10 flex flex-col items-center gap-14 sm:gap-16">
                  {BLOG_CATEGORIAS.map((cat, idx) => {
                    const isEven = idx % 2 === 0;
                    const offsetClass = isEven
                      ? '-translate-x-[45px] sm:-translate-x-[65px]'
                      : 'translate-x-[45px] sm:translate-x-[65px]';
                    const IconComp = CATEGORY_ICONS[cat.iconName] || BookOpen;
                    const totalArticles = countsByCategory.get(cat.id) || 50;

                    return (
                      <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, scale: 0.9, y: 15 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ delay: 0.05 * idx, duration: 0.3 }}
                        className={`relative flex flex-col items-center ${offsetClass}`}
                      >
                        {/* Botão Grande Circular */}
                        <button
                          onClick={() => setSelectedCategory(cat.id)}
                          className="group relative flex flex-col items-center focus:outline-none"
                          aria-label={`Abrir categoria ${cat.titulo}`}
                        >
                          {/* Aura de brilho pulsante no hover */}
                          <div
                            className="absolute -inset-2.5 rounded-full opacity-30 group-hover:opacity-75 blur-md transition-all duration-300 pointer-events-none"
                            style={{ background: cat.accentColor }}
                          />

                          {/* Círculo Principal */}
                          <div
                            className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${cat.colorGradient} shadow-2xl border-2 border-white/30 group-hover:scale-105 active:scale-95 transition-transform duration-200`}
                          >
                            <IconComp className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow-md" strokeWidth={2.2} />

                            {/* Badge do número da categoria */}
                            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border border-border text-foreground font-display text-[10px] font-black flex items-center justify-center shadow-md">
                              {cat.numero}
                            </span>
                          </div>

                          {/* Informações da categoria abaixo do botão */}
                          <div className="mt-2.5 flex flex-col items-center text-center max-w-[150px] sm:max-w-[170px]">
                            <h4 className="font-display text-xs sm:text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                              {cat.titulo}
                            </h4>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                              {cat.subtitulo}
                            </p>
                            <span
                              className="mt-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold tracking-wide"
                              style={{ background: cat.badgeBg, color: cat.badgeText }}
                            >
                              {totalArticles} artigos
                            </span>
                          </div>
                        </button>
                      </motion.div>
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
              {/* Banner da Categoria Ativa */}
              {activeCategoryMeta && (
                <div
                  className={`relative rounded-3xl p-5 sm:p-6 overflow-hidden border border-white/10 bg-gradient-to-br ${activeCategoryMeta.colorGradient} text-white shadow-xl flex items-center justify-between gap-4`}
                >
                  <div className="space-y-1 relative z-10">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10.5px] font-bold uppercase tracking-wider text-white">
                      Trilha {activeCategoryMeta.numero}
                    </span>
                    <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight">
                      {activeCategoryMeta.titulo}
                    </h2>
                    <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-body max-w-lg">
                      {activeCategoryMeta.subtitulo}
                    </p>
                    <div className="pt-2 text-xs font-semibold text-white/90">
                      {categoryPosts.length} artigos encontrados
                    </div>
                  </div>

                  <div className="hidden sm:flex shrink-0 w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md items-center justify-center border border-white/20 text-white">
                    {(() => {
                      const Icon = CATEGORY_ICONS[activeCategoryMeta.iconName] || BookOpen;
                      return <Icon className="w-8 h-8" strokeWidth={2} />;
                    })()}
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

              {/* Botão de retorno rápido para as categorias */}
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar para todas as 10 categorias
              </button>

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
                ) : (
                  <EmptyState
                    title="Nenhum artigo encontrado"
                    description="Tente buscar por outras palavras-chave ou limpe a busca."
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
        feature="blog_read"
      />
    </div>
  );
};

export default Blog;
