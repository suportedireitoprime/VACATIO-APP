import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Clock, BookOpen, Share2, ArrowUpRight, Heart, Type, Plus, Minus, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { useIsDesktop } from '@/hooks/use-desktop';
import ShareSheet from './ShareSheet';
import BlogPostComments from './BlogPostComments';
import type { BlogPost } from '@/data/blogPosts';
import BlogCoverImage from '@/components/BlogCoverImage';
import { blogHero } from '@/lib/blogImg';
import { supabase } from '@/integrations/supabase/client';
import { useEscapeKey } from '@/hooks/useEscapeKey';

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
  // O conteúdo completo é carregado sob demanda (a lista vem sem markdown para
  // abrir o Blogger instantaneamente).
  const [conteudo, setConteudo] = useState<string>(post?.conteudo_md || '');
  const scrollRef = useRef<HTMLDivElement>(null);
  const incFont = () => setFontSize((s) => Math.min(24, s + 2));
  const decFont = () => setFontSize((s) => Math.max(12, s - 2));

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
        if (!cancelled && data?.conteudo_md) setConteudo(data.conteudo_md as string);
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
                : 'fixed inset-x-0 bottom-0 z-50 h-[90vh] bg-card rounded-t-3xl flex flex-col overflow-hidden shadow-2xl mx-auto max-w-3xl'
            }

          >
            <div ref={scrollRef} className="flex-1 overflow-y-auto pb-8 relative">
              <div className={`relative w-full ${isDesktop ? 'h-[220px]' : 'aspect-square max-h-[60vh]'}`}>
                <BlogCoverImage
                  postId={post.id}
                  remoteUrl={blogHero(post.imagem_url)}
                  alt={post.titulo}
                  className={`w-full h-full ${isDesktop ? 'object-cover object-top' : 'object-contain'} bg-black`}
                  decoding="async"
                  fetchPriority="high"
                />


                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card via-card/80 to-transparent" />
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="absolute top-4 left-4 w-11 h-11 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg hover:bg-white/30 active:scale-95 transition-all"
                >
                  <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
                </button>

                <button
                  onClick={toggleLike}
                  aria-label={liked ? 'Descurtir' : 'Curtir'}
                  aria-pressed={liked}
                  className={`absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full shadow-lg active:scale-95 transition-all z-10 ${
                    liked
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} strokeWidth={2.5} />
                </button>
              </div>

              {/* Barra de ações sticky — fica fixa no topo ao rolar, começando logo abaixo da capa */}
              <div className="sticky top-2 z-20 pointer-events-none flex flex-row-reverse items-center gap-2 px-3 -mt-6 mb-2">
                <button
                  onClick={() => setShareOpen(true)}
                  aria-label="Compartilhar"
                  className="pointer-events-auto w-11 h-11 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:brightness-110 active:scale-95 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCommentsOpen(true)}
                  aria-label="Comentar"
                  className="pointer-events-auto w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground shadow-xl hover:bg-secondary active:scale-95 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <div className="pointer-events-auto flex flex-row items-center bg-card/95 backdrop-blur-md border border-border rounded-full shadow-xl overflow-hidden">
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
                          className="w-10 h-11 flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all"
                        >
                          <Minus className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <span className="min-w-[44px] text-center text-[11px] font-bold tabular-nums text-foreground">
                          {fontSize}px
                        </span>
                        <button
                          onClick={incFont}
                          aria-label="Aumentar fonte"
                          className="w-10 h-11 flex items-center justify-center text-foreground hover:bg-secondary active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4" strokeWidth={2.5} />
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
                {showGoTo && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/blog', { state: { postId: post.id } });
                    }}
                    aria-label="Ir para o Blog"
                    className="pointer-events-auto inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground text-xs font-semibold shadow-xl hover:bg-secondary active:scale-95 transition-all"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Ir para
                  </button>
                )}
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
                <h2 className="font-display text-2xl md:text-3xl text-foreground leading-[1.15] font-bold tracking-tight">
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
                  "
                >
                  {conteudo ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {conteudo}
                    </ReactMarkdown>
                  ) : (
                    <div className="space-y-3 animate-pulse" aria-label="Carregando artigo">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-3 rounded bg-muted/60" style={{ width: `${90 - (i % 4) * 12}%` }} />
                      ))}
                    </div>
                  )}
                </article>

                <div className="h-24" />
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

