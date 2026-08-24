import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Info, Sparkles, ArrowUpRight, Flame } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { BLOG_POSTS, TEMAS, TEMA_COLORS, type BlogPost, type BlogTema } from '@/data/blogPosts';
import BlogPostSheet from '@/components/vademecum/BlogPostSheet';
import BlogHeroHeader from '@/components/vademecum/BlogHeroHeader';
import BlogCoverImage from '@/components/BlogCoverImage';
import { blogThumb } from '@/lib/blogImg';
import { useBlogPostsCache } from '@/hooks/useBlogPostsCache';
import { useFeatureLimit } from '@/hooks/useFeatureLimit';
import PremiumGate from '@/components/PremiumGate';
import { supabase } from '@/integrations/supabase/client';
import { useIsDesktop } from '@/hooks/use-desktop';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { BookOpenText, Share2, Copy, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { recordActivity } from '@/lib/continuity';


type BlogFilter = 'trending' | 'todos' | BlogTema;
const TRENDING_CACHE_KEY = 'blog_trending_v1';
const TRENDING_CACHE_TTL_MS = 5 * 60 * 1000;




function formatDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${day} ${months[d.getMonth()]} · ${d.getFullYear()}`;
}

const Blog = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const [selectedFilter, setSelectedFilter] = useState<BlogFilter>('todos');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [trendingIds, setTrendingIds] = useState<string[] | null>(null);
  const { canUse, register, used, config } = useFeatureLimit('blog_read');

  // Carrega posts do Blog Edição com stale-while-revalidate (localStorage cache).
  const { posts: dbPosts, loaded: blogLoaded } = useBlogPostsCache();

  const allPosts = useMemo(() => {
    const byId = new Map<string, BlogPost>();
    [...dbPosts, ...BLOG_POSTS].forEach((p) => byId.set(p.id, p));
    return Array.from(byId.values());
  }, [dbPosts]);


  // Auto-open post from query param (compartilhamento)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('post');
    if (id) {
      const found = allPosts.find((p) => p.id === id);
      if (found) setSelectedPost(found);
    }
  }, [location.search, allPosts]);

  // Busca ranking "Em Alta" via RPC (com cache curto em sessionStorage)
  useEffect(() => {
    if (selectedFilter !== 'trending' || trendingIds !== null) return;
    try {
      const raw = sessionStorage.getItem(TRENDING_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; ids: string[] };
        if (Date.now() - parsed.at < TRENDING_CACHE_TTL_MS) {
          setTrendingIds(parsed.ids);
          return;
        }
      }
    } catch {}
    supabase.rpc('blog_posts_trending', { _limit: 50, _dias: 14 }).then(({ data, error }) => {
      if (error || !data) { setTrendingIds([]); return; }
      const ids = (data as Array<{ post_id: string }>).map((r) => r.post_id);
      setTrendingIds(ids);
      try { sessionStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify({ at: Date.now(), ids })); } catch {}
    });
  }, [selectedFilter, trendingIds]);

  const posts = useMemo(() => {
    const byDate = [...allPosts].sort(
      (a, b) => new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime(),
    );
    if (selectedFilter === 'trending') {
      if (!trendingIds || trendingIds.length === 0) return byDate; // fallback
      const map = new Map(allPosts.map((p) => [p.id, p]));
      const ordered = trendingIds.map((id) => map.get(id)).filter(Boolean) as BlogPost[];
      // completa com posts não ranqueados no final por data
      const seen = new Set(ordered.map((p) => p.id));
      byDate.forEach((p) => { if (!seen.has(p.id)) ordered.push(p); });
      return ordered;
    }
    if (selectedFilter === 'todos') return byDate;
    return byDate.filter((p) => p.tema === selectedFilter);
  }, [allPosts, selectedFilter, trendingIds]);

  const visiblePosts = blogLoaded ? posts : [];

  // Preload das 3 primeiras thumbs — força o browser a começar o download
  // antes do React montar os <img>, deixando o "acima da dobra" quase instantâneo.
  useEffect(() => {
    if (!visiblePosts.length) return;
    const links: HTMLLinkElement[] = [];
    visiblePosts.slice(0, 3).forEach((p) => {
      if (!p.imagem_url) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = blogThumb(p.imagem_url);
      (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = 'high';
      document.head.appendChild(link);
      links.push(link);
    });
    return () => { links.forEach((l) => l.remove()); };
  }, [visiblePosts]);



  return (
    <div className="min-h-dvh bg-background">
      {/* Header compacto no topo — sem capa grande */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Blogger Jurídico"
            subtitle="Artigos, curiosidades e filosofia do Direito"
            onBack={() => navigate(-1)}
            rightAction={
              <button
                onClick={() => setInfoOpen((v) => !v)}
                aria-expanded={infoOpen}
                aria-label="Sobre esta seção"
                className={`w-11 h-11 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors ${
                  infoOpen
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                <Info className="w-4 h-4" />
              </button>
            }
          />
        </div>
      </header>


      <AnimatePresence initial={false}>
        {infoOpen && (
          <motion.div
            key="info-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="overflow-hidden max-w-3xl mx-auto px-4"
          >
            <div className="mt-1 mb-2 rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-sm p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-display text-sm font-bold text-foreground">O que é o Blogger?</h3>
              </div>
              <p className="font-body text-[12.5px] leading-relaxed text-muted-foreground">
                Uma curadoria de <strong className="text-foreground">artigos autorais</strong> sobre
                filosofia do Direito, decisões marcantes do STF e curiosidades que caem em prova.
                Toque no tema para filtrar.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capa grande contextual (Todos + por categoria) */}
      <BlogHeroHeader selectedTema={selectedFilter === 'trending' || selectedFilter === 'todos' ? null : selectedFilter} />


      {/* Chips de tema */}
      <div className="bg-background border-b border-border/40">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 max-w-3xl mx-auto">
          <button
            onClick={() => setSelectedFilter('todos')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-body font-semibold uppercase tracking-wide transition-all ${
              selectedFilter === 'todos'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedFilter('trending')}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-body font-semibold uppercase tracking-wide transition-all ${
              selectedFilter === 'trending'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-amber-400 hover:bg-secondary/80'
            }`}
          >
            <Flame className="w-3.5 h-3.5" strokeWidth={2.5} />
            Em Alta
          </button>
          {[...TEMAS].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((tema) => {
            const active = selectedFilter === tema;
            return (
              <button
                key={tema}
                onClick={() => setSelectedFilter(tema)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-body font-semibold uppercase tracking-wide transition-all ${
                  active ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                {tema}
              </button>
            );
          })}
        </div>
      </div>


      <div className={isDesktop ? 'mx-auto w-full max-w-7xl px-6 py-4 pb-16 flex gap-6 items-start' : 'max-w-3xl mx-auto px-4 py-4 space-y-3 pb-40'}>
        <div className={isDesktop ? 'w-[420px] shrink-0 space-y-3 max-h-[calc(100dvh-260px)] overflow-y-auto pr-2 -mr-2' : 'w-full space-y-3'}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedFilter}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-3 -mx-4 md:mx-0"
          >
            {visiblePosts.map((post, i) => {
              const c = TEMA_COLORS[post.tema];
              const active = isDesktop && selectedPost?.id === post.id;
              const openPost = () => {
                if (!canUse) { setGateOpen(true); return; }
                setSelectedPost(post);
                register(post.id);
                recordActivity({ path: `/blog?post=${post.id}`, label: post.titulo, kind: 'blog' });
              };
              const shareUrl = `${window.location.origin}/blog?post=${post.id}`;
              const copyLink = async () => {
                try { await navigator.clipboard.writeText(shareUrl); toast.success('Link copiado'); }
                catch { toast.error('Não foi possível copiar'); }
              };
              const share = async () => {
                if ((navigator as any).share) {
                  try { await (navigator as any).share({ title: post.titulo, url: shareUrl }); }
                  catch { /* dismissed */ }
                } else {
                  copyLink();
                }
              };
              const favorite = () => {
                try {
                  const key = 'blog:favorites';
                  const cur = new Set<string>(JSON.parse(localStorage.getItem(key) || '[]'));
                  if (cur.has(post.id)) { cur.delete(post.id); toast('Removido dos favoritos'); }
                  else { cur.add(post.id); toast.success('Adicionado aos favoritos'); }
                  localStorage.setItem(key, JSON.stringify([...cur]));
                } catch { /* ignore */ }
              };
              const cardNode = (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35, ease: 'easeOut' }}
                  onClick={openPost}
                  style={{
                    background: `linear-gradient(160deg, ${c.chip}22 0%, hsl(var(--card)) 45%, hsl(var(--card)) 100%)`,
                  }}
                  className={`group relative flex items-stretch gap-0 border-y md:border md:rounded-2xl transition-colors cursor-pointer overflow-hidden ${
                    active ? 'border-primary ring-1 ring-primary/40' : 'border-border/40 hover:border-primary/40'
                  }`}
                >
                  <div className="w-28 sm:w-32 aspect-square shrink-0 relative overflow-hidden news-cover-shine bg-black/40">
                    <BlogCoverImage
                      postId={post.id}
                      remoteUrl={blogThumb(post.imagem_url)}
                      alt={post.titulo}
                      className="absolute inset-0 w-full h-full object-cover object-center"
                      loading={i < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={i < 3 ? 'high' : 'auto'}
                    />

                    {/* Degradê à direita ligando ao card */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-card" />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-2 p-4">
                    <h3 className="font-display text-[15px] sm:text-base font-medium text-foreground leading-snug line-clamp-2 transition-colors">
                      {post.titulo}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-body text-muted-foreground">
                      <span
                        className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: c.chip, color: c.chipText }}
                      >
                        {post.tema}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.tempo_leitura_min} min · {formatDate(post.data_publicacao)}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/60 ml-auto" />
                    </div>
                  </div>
                </motion.div>
              );
              if (!isDesktop) return cardNode;
              return (
                <ContextMenu key={post.id}>
                  <ContextMenuTrigger asChild>{cardNode}</ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuItem onClick={openPost}>
                      <ArrowUpRight className="w-4 h-4 mr-2" /> Abrir artigo
                    </ContextMenuItem>
                    <ContextMenuItem onClick={copyLink}>
                      <Copy className="w-4 h-4 mr-2" /> Copiar link
                    </ContextMenuItem>
                    <ContextMenuItem onClick={share}>
                      <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={favorite}>
                      <Star className="w-4 h-4 mr-2" /> Favoritar
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}

          </motion.div>
        </AnimatePresence>


        {!blogLoaded && (
          <LoadingState variant="list" rows={4} label="Carregando artigos mais recentes" className="-mx-4 md:mx-0" />
        )}

        {blogLoaded && posts.length === 0 && (
          <EmptyState
            icon={BookOpenText}
            title="Nenhum artigo encontrado"
            description="Ainda não há artigos publicados neste tema. Volte em breve."
          />
        )}

        </div>

        {isDesktop && (
          <div className="flex-1 min-w-0 sticky top-[220px] h-[calc(100dvh-260px)]">
            {selectedPost ? (
              <BlogPostSheet
                inline
                post={selectedPost}
                onClose={() => setSelectedPost(null)}
              />
            ) : (
              <div className="h-full w-full rounded-2xl border border-dashed border-border/60 bg-card/30 flex flex-col items-center justify-center text-center px-8">
                <Sparkles className="w-8 h-8 text-primary/70 mb-3" />
                <h3 className="font-display text-lg text-foreground mb-1">Selecione um artigo</h3>
                <p className="font-body text-sm text-muted-foreground max-w-sm">
                  Escolha um post da lista à esquerda para ler aqui, sem sair da página.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {!isDesktop && (
        <BlogPostSheet post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
      <PremiumGate
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        feature="blog"
        title="Limite de leituras atingido"
        description="Assinantes leem todos os artigos do Blog Jurídico sem limites."
        usageLabel={config ? `Você leu ${used} de ${config.limit_value} artigos este mês` : undefined}
      />
    </div>
  );
};

export default Blog;

