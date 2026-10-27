import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Clock, BookOpen, Share2, ArrowUpRight, Heart, Type, Plus, Minus, MessageCircle, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { useIsDesktop } from '@/hooks/use-desktop';
import { toast } from 'sonner';
import ShareSheet from './ShareSheet';
import BlogPostComments from './BlogPostComments';
import type { BlogPost } from '@/data/blogPosts';
import BlogCoverImage from '@/components/BlogCoverImage';
import { blogHero } from '@/lib/blogImg';
import { supabase } from '@/integrations/supabase/client';
import { useEscapeKey } from '@/hooks/useEscapeKey';

/** Corrige formatações comuns do Word/Drive (ex: espaço antes do fechamento de negrito `**texto **`) */
function sanitizeBlogMarkdown(content: string): string {
  if (!content) return '';
  return content
    // Corrige negrito com espaço antes do fechamento: **texto ** -> **texto**
    .replace(/\*\*([^*\n]+?)\s+\*\*/g, '**$1** ')
    // Garante espaço após fechamento do negrito se colado na palavra seguinte: **Texto:**palavra -> **Texto:** palavra
    .replace(/\*\*([^*\n]+?)\*\*(?=[a-zA-Z0-9À-ÿ])/g, '**$1** ')
    // Corrige itálico com espaço antes do fechamento: *texto * -> *texto*
    .replace(/(^|[^*])\*([^*\n]+?)\s+\*(?!\*)/g, '$1*$2* ')
    // Remove espaços duplos antes de pontuação
    .replace(/\s+([.,;:!?])/g, '$1');
}

/** Verifica se um texto é predominantemente em caixa alta */
function isAllUpper(text: string): boolean {
  if (!text) return false;
  const letters = text.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  return letters.length >= 3 && letters === letters.toUpperCase();
}

interface Props {
  post: BlogPost | null;
  onClose: () => void;
  showGoTo?: boolean;
  /** Renderiza inline (para layout lista+detalhe no desktop) — sem portal, sem overlay, sem lock de scroll. */
  inline?: boolean;
}

export default function BlogPostSheet({ post, onClose, showGoTo = false, inline = false }: Props) {
  useEscapeKey(!!post && !inline, onClose);
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [fontSize, setFontSize] = useState(17);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [concluido, setConcluido] = useState(false);
  // O conteúdo completo é carregado sob demanda (a lista vem sem markdown para
  // abrir o Blogger instantaneamente).
  const [conteudo, setConteudo] = useState<string>(post?.conteudo_md || '');
  const scrollRef = useRef<HTMLDivElement>(null);
  const incFont = () => setFontSize((s) => Math.min(24, s + 2));
  const decFont = () => setFontSize((s) => Math.max(12, s - 2));

  // Carrega status de conclusão do artigo
  useEffect(() => {
    if (!post?.id) return;
    try {
      const done = localStorage.getItem(`blog_concluido_${post.id}`) === '1';
      setConcluido(done);
    } catch {}
  }, [post?.id]);

  const toggleConcluido = () => {
    if (!post?.id) return;
    const next = !concluido;
    setConcluido(next);
    try {
      if (next) {
        localStorage.setItem(`blog_concluido_${post.id}`, '1');
        toast.success('Artigo marcado como concluído! Parabéns pela leitura.');
      } else {
        localStorage.removeItem(`blog_concluido_${post.id}`);
        toast.info('Artigo desmarcado.');
      }
      window.dispatchEvent(new CustomEvent('blog_status_updated', { detail: { id: post.id, concluido: next } }));
    } catch {}
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const total = el.scrollHeight - el.clientHeight;
    if (total > 0) {
      const pct = Math.min(100, Math.max(0, (el.scrollTop / total) * 100));
      setScrollProgress(pct);
    }
  };

  const sanitizedConteudo = useMemo(() => sanitizeBlogMarkdown(conteudo), [conteudo]);

  // Componentes customizados para ReactMarkdown: estiliza títulos em caixa alta em vermelho suave
  const markdownComponents = useMemo(() => ({
    h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => {
      const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
      const upper = isAllUpper(text);
      return (
        <h1
          className={`font-display font-bold text-2xl md:text-3xl mt-6 mb-3 ${
            upper ? 'text-[#FF6B6B] dark:text-[#F87171] tracking-wide' : 'text-foreground'
          }`}
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => {
      const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
      const upper = isAllUpper(text);
      return (
        <h2
          className={`font-display font-bold text-xl md:text-2xl mt-6 mb-3 ${
            upper ? 'text-[#FF6B6B] dark:text-[#F87171] tracking-wide' : 'text-foreground'
          }`}
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => {
      const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
      const upper = isAllUpper(text);
      return (
        <h3
          className={`font-display font-bold text-lg md:text-xl mt-5 mb-2 ${
            upper ? 'text-[#FF6B6B] dark:text-[#F87171] tracking-wide' : 'text-foreground'
          }`}
          {...props}
        >
          {children}
        </h3>
      );
    },
    strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => {
      const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
      const upper = isAllUpper(text);
      return (
        <strong
          className={`font-bold ${
            upper ? 'text-[#FF6B6B] dark:text-[#F87171]' : 'text-foreground'
          }`}
          {...props}
        >
          {children}
        </strong>
      );
    },
  }), []);

  useEffect(() => {
    if (post && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [post?.id]);

  useEffect(() => {
    if (!post) return;
    if (post.conteudo_md) { setConteudo(post.conteudo_md); return; }
    let cancelled = false;
    setConteudo('');
    supabase
      .from('blog_edicao_posts')
      .select('conteudo_md')
      .eq('id', post.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.conteudo_md) {
          setConteudo(data.conteudo_md as string);
        } else if (!cancelled) {
          import('@/data/blogPosts').then(({ BLOG_POSTS }) => {
            const found = BLOG_POSTS.find((p) => p.id === post.id);
            if (found?.conteudo_md && !cancelled) setConteudo(found.conteudo_md);
          });
        }
      });
    return () => { cancelled = true; };
  }, [post?.id, post?.conteudo_md]);

  // Trava scroll do fundo enquanto o painel estiver aberto — evita que
  // toques/roladas vazem para a página atrás do sheet.
  useEffect(() => {
    if (!post || inline) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [post, inline]);

  // Registra visualização + carrega estado de curtida do usuário
  useEffect(() => {
    if (!post) return;
    let cancelled = false;
    import('@/lib/appEvents').then(({ appEvents }) =>
      appEvents.abrirBlog({ post_id: post.id, titulo: (post as any).titulo || (post as any).title })
    ).catch(() => {});
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // view (best-effort, sem bloquear UI)
      supabase.from('blog_post_views').insert({
        post_id: post.id,
        user_id: user?.id ?? null,
        session_id: typeof window !== 'undefined' ? (window.sessionStorage.getItem('sid') || (() => {
          const s = crypto.randomUUID();
          window.sessionStorage.setItem('sid', s);
          return s;
        })()) : null,
      }).then(() => {});
      if (!user) { if (!cancelled) setLiked(false); return; }
      const { data } = await supabase.from('blog_post_likes')
        .select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle();
      if (!cancelled) setLiked(!!data);
    })();
    return () => { cancelled = true; };
  }, [post?.id]);

  const toggleLike = async () => {
    if (!post || likeBusy) return;
    setLikeBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLikeBusy(false); return; }
    const next = !liked;
    setLiked(next); // otimista
    if (next) {
      const { error } = await supabase.from('blog_post_likes')
        .insert({ post_id: post.id, user_id: user.id });
      if (error) setLiked(false);
    } else {
      const { error } = await supabase.from('blog_post_likes')
        .delete().eq('post_id', post.id).eq('user_id', user.id);
      if (error) setLiked(true);
    }
    setLikeBusy(false);
  };

  const content = (
    <AnimatePresence>
      {post && (
        <>
          {!inline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
              onClick={onClose}
            />
          )}
          <motion.div
            key={inline ? post.id : 'sheet'}
            initial={inline ? { opacity: 0, y: 8 } : { y: '100%' }}
            animate={inline ? { opacity: 1, y: 0 } : { y: 0 }}
            exit={inline ? { opacity: 0, y: 8 } : { y: '100%' }}
            transition={inline ? { duration: 0.22, ease: 'easeOut' } : { type: 'spring', damping: 30, stiffness: 340 }}
            className={
              inline
                ? 'relative h-full w-full bg-card border border-border rounded-2xl flex flex-col overflow-hidden shadow-xl'
                : isDesktop
                ? 'fixed z-50 inset-x-0 mx-auto top-[4vh] bottom-[4vh] bg-card border border-border rounded-2xl flex flex-col w-[880px] max-w-[92vw] shadow-2xl overflow-hidden'
                : 'fixed inset-x-0 bottom-0 z-50 h-[92vh] bg-card rounded-t-3xl flex flex-col overflow-hidden shadow-2xl mx-auto max-w-3xl'
            }
          >
            {/* Barra de progresso de leitura suave no topo */}
            <div className="absolute top-0 inset-x-0 h-1 bg-white/10 z-40 pointer-events-none">
              <div
                className="h-full bg-gradient-to-r from-primary to-[#FF6B6B] transition-all duration-150"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto pb-8 relative scroll-smooth"
            >
              {/* Capa Principal: começa no topo com cantos arredondados, preenchendo toda a largura sem faixas pretas */}
              <div className={`relative w-full ${isDesktop ? 'h-[240px]' : 'aspect-[16/10] sm:aspect-[16/9] max-h-[46vh]'} overflow-hidden rounded-t-3xl bg-card`}>
                <BlogCoverImage
                  postId={post.id}
                  remoteUrl={blogHero(post.imagem_url)}
                  alt={post.titulo}
                  className="w-full h-full object-cover object-center"
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card via-card/75 to-transparent" />
              </div>

              {/* Barra de ações sticky: botão de abaixar o artigo (ChevronDown) à esquerda + botões de ação à direita */}
              <div className="sticky top-1 z-30 pointer-events-none flex items-center justify-between px-3 -mt-7 mb-3">
                {/* Botão de abaixar / fechar o artigo — acompanha o scroll o tempo todo */}
                <button
                  onClick={onClose}
                  aria-label="Abaixar artigo"
                  className="pointer-events-auto w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground shadow-xl hover:bg-secondary active:scale-95 transition-all"
                >
                  <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
                </button>

                {/* Ações da direita: Ir para (desktop), Tamanho da fonte, Comentários, Curtir, Compartilhar */}
                <div className="pointer-events-auto flex items-center gap-2">
                  {showGoTo && (
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/blog', { state: { postId: post.id } });
                      }}
                      aria-label="Ir para o Blog"
                      className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground text-xs font-semibold shadow-xl hover:bg-secondary active:scale-95 transition-all"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Ir para
                    </button>
                  )}

                  {/* Controle de Fonte */}
                  <div className="flex flex-row items-center bg-card/95 backdrop-blur-md border border-border rounded-full shadow-xl overflow-hidden">
                    <AnimatePresence initial={false}>
                      {fontOpen && (
                        <motion.div
                          key="font-controls"
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 'auto', opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="flex items-center overflow-hidden"
                        >
                          <button
                            onClick={decFont}
                            aria-label="Diminuir fonte"
                            className="w-9 h-11 flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all"
                          >
                            <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[40px] text-center text-[11px] font-bold tabular-nums text-foreground">
                            {fontSize}px
                          </span>
                          <button
                            onClick={incFont}
                            aria-label="Aumentar fonte"
                            className="w-9 h-11 flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                          <div className="w-px h-5 bg-border" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={() => setFontOpen((v) => !v)}
                      aria-label="Ajustar tamanho do texto"
                      aria-expanded={fontOpen}
                      className="w-11 h-11 flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all"
                    >
                      <Type className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Comentários */}
                  <button
                    onClick={() => setCommentsOpen(true)}
                    aria-label="Comentar"
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground shadow-xl hover:bg-secondary active:scale-95 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>

                  {/* Curtir */}
                  <button
                    onClick={toggleLike}
                    aria-label={liked ? 'Descurtir' : 'Curtir'}
                    aria-pressed={liked}
                    className={`w-11 h-11 flex items-center justify-center rounded-full shadow-xl active:scale-95 transition-all ${
                      liked
                        ? 'bg-rose-500 text-white'
                        : 'bg-card/95 backdrop-blur-md border border-border text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} strokeWidth={2.5} />
                  </button>

                  {/* Compartilhar */}
                  <button
                    onClick={() => setShareOpen(true)}
                    aria-label="Compartilhar"
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 px-5 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground uppercase tracking-wide">
                    <BookOpen className="w-3 h-3" />
                    Blog
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                    {post.tema}
                  </span>
                </div>
                <h2
                  className={`font-display text-2xl md:text-3xl leading-[1.15] font-bold tracking-tight ${
                    isAllUpper(post.titulo)
                      ? 'text-[#FF6B6B] dark:text-[#F87171] uppercase tracking-wide'
                      : 'text-foreground'
                  }`}
                >
                  {post.titulo}
                </h2>
                <p className="text-muted-foreground text-xs font-body flex items-center gap-3">
                  <span>{post.autor}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {post.tempo_leitura_min} min de leitura
                  </span>
                </p>

                <article
                  style={{ fontSize: `${fontSize}px` }}
                  className="
                    prose prose-sm md:prose-base max-w-none dark:prose-invert font-body
                    prose-headings:font-display prose-headings:text-foreground prose-headings:mt-6 prose-headings:mb-3
                    prose-h2:text-xl prose-h3:text-lg
                    prose-p:text-foreground/90 prose-p:leading-[1.75] prose-p:my-4
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-foreground
                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r
                    prose-ul:my-4 prose-li:my-1
                    prose-table:w-full prose-table:my-6 prose-table:border-collapse
                    prose-th:border prose-th:border-border/60 prose-th:p-2.5 prose-th:bg-secondary/40 prose-th:text-foreground prose-th:font-semibold prose-th:text-xs sm:prose-th:text-sm
                    prose-td:border prose-td:border-border/40 prose-td:p-2.5 prose-td:text-xs sm:prose-td:text-sm
                    prose-img:rounded-2xl prose-img:shadow-xl prose-img:border prose-img:border-border/40 prose-img:mx-auto prose-img:my-6
                  "
                >
                  {sanitizedConteudo ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {sanitizedConteudo}
                    </ReactMarkdown>
                  ) : (
                    <div className="space-y-3 animate-pulse" aria-label="Carregando artigo">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-3 rounded bg-muted/60" style={{ width: `${90 - (i % 4) * 12}%` }} />
                      ))}
                    </div>
                  )}
                </article>

                {/* Botão no Rodapé: Marcar como concluído */}
                <div className="pt-8 pb-10 flex flex-col items-center border-t border-border/40 mt-8">
                  <button
                    type="button"
                    onClick={toggleConcluido}
                    className={`w-full max-w-sm py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 shadow-xl active:scale-95 transition-all cursor-pointer ${
                      concluido
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                        : 'bg-primary text-primary-foreground hover:brightness-110 shadow-primary/30'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {concluido ? 'Leitura Concluída ✓' : 'Marcar como concluído'}
                  </button>
                  <p className="text-xs text-muted-foreground mt-2.5">
                    {concluido
                      ? 'Parabéns! Artigo marcado no seu progresso.'
                      : 'Finalizou a leitura? Marque para registrar seu progresso.'}
                  </p>
                </div>
              </div>
            </div>

          </motion.div>

          <ShareSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            title={post.titulo}
            text={post.resumo}
            url={`${window.location.origin}/blog?post=${post.id}`}
          />

          <BlogPostComments
            postId={post.id}
            open={commentsOpen}
            onClose={() => setCommentsOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  if (inline) return content;
  return createPortal(content, document.body);
}

