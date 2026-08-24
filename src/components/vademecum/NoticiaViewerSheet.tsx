import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Clock, Scale, ExternalLink, Share2, MessageCircle, Heart, Type, Plus, Minus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useIsDesktop } from '@/hooks/use-desktop';
import { newsImg } from '@/lib/cdnImg';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type Noticia, fetchNoticiaConteudo } from '@/services/noticiasService';
import NoticiaComentarios from '@/components/vademecum/NoticiaComentarios';
import ShareSheet from './ShareSheet';
import { useFavoritoNoticia } from '@/hooks/useNoticiaTracking';

function cleanMd(md: string): string {
  if (!md) return '';
  let out = md;
  out = out.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  out = out.replace(/<img[^>]*>/gi, '');
  out = out.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  out = out.replace(/\[Leia Mais /g, '\n\n[Leia Mais ');
  return out.trim();
}

interface Props {
  noticia: Noticia | null;
  onClose: () => void;
}

export default function NoticiaViewerSheet({ noticia, onClose }: Props) {
  const isDesktop = useIsDesktop();
  const [comentariosOpen, setComentariosOpen] = useState(false);
  const [comentariosCount, setComentariosCount] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [fontSize, setFontSize] = useState(17);
  const [fontOpen, setFontOpen] = useState(false);
  const [fullMd, setFullMd] = useState<string | null>(null);
  const [loadingMd, setLoadingMd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const incFont = () => setFontSize((s) => Math.min(24, s + 2));
  const decFont = () => setFontSize((s) => Math.max(12, s - 2));
  const { fav, toggle: toggleFav } = useFavoritoNoticia(noticia?.id ?? null);

  useEffect(() => {
    if (noticia && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    setFullMd(noticia?.conteudo_md ?? null);
  }, [noticia?.id]);

  // Carrega conteúdo completo sob demanda quando o sheet abre sem conteudo_md
  useEffect(() => {
    if (!noticia) return;
    if (noticia.conteudo_md && noticia.conteudo_md.length > 0) {
      setFullMd(noticia.conteudo_md);
      return;
    }
    let cancelled = false;
    setLoadingMd(true);
    fetchNoticiaConteudo(noticia.id)
      .then((md) => {
        if (cancelled) return;
        if (md) setFullMd(md);
      })
      .finally(() => { if (!cancelled) setLoadingMd(false); });
    return () => { cancelled = true; };
  }, [noticia?.id]);

  // Trava scroll do fundo enquanto o painel estiver aberto
  useEffect(() => {
    if (!noticia) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [noticia]);

  useEffect(() => {
    if (!noticia) {
      setComentariosCount(0);
      return;
    }
    (async () => {
      const { count } = await supabase
        .from('noticias_comentarios')
        .select('*', { count: 'exact', head: true })
        .eq('noticia_ref', noticia.id);
      setComentariosCount(count || 0);
    })();
  }, [noticia]);

  return createPortal(
    <AnimatePresence>
      {noticia && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/85"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className={
              isDesktop
                ? 'fixed z-50 inset-x-0 mx-auto top-[4vh] bottom-[4vh] bg-card border border-border rounded-2xl flex flex-col w-[880px] max-w-[92vw] shadow-2xl overflow-hidden'
                : 'fixed inset-x-0 bottom-0 z-50 h-[90dvh] bg-card rounded-t-3xl flex flex-col overflow-hidden shadow-2xl mx-auto max-w-3xl'
            }
          >
            <div ref={scrollRef} className="flex-1 overflow-y-auto pb-8 relative">
              <div className="relative w-full h-[32vh] md:h-[38vh]">
                {noticia.imagem_url ? (
                  <img
                    src={newsImg(noticia.imagem_url!, 1200)}
                    alt={noticia.titulo}
                    className="w-full h-full object-cover"
                    decoding="async"
                    fetchPriority="high"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
                )}
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
                  onClick={toggleFav}
                  aria-label={fav ? 'Desfavoritar' : 'Favoritar'}
                  aria-pressed={fav}
                  className={`absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full shadow-lg active:scale-95 transition-all z-10 ${
                    fav
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} strokeWidth={2.5} />
                </button>
              </div>

              {/* Barra de ações sticky — fica fixa no topo ao rolar, começando logo abaixo da capa */}
              <div className="sticky top-2 z-20 pointer-events-none flex flex-row-reverse items-center gap-2 px-3 -mt-6 mb-2">
                <a
                  href={noticia.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toast('Abrindo notícia original', { description: 'Você vai sair do app.' })}
                  aria-label="Ver notícia na íntegra"
                  className="pointer-events-auto w-11 h-11 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:brightness-110 active:scale-95 transition-all"
                >
                  <ExternalLink className="w-5 h-5" strokeWidth={2.2} />
                </a>
                <button
                  onClick={() => setShareOpen(true)}
                  aria-label="Compartilhar"
                  className="pointer-events-auto w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground shadow-xl hover:bg-secondary active:scale-95 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setComentariosOpen(true)}
                  aria-label="Comentar"
                  className="pointer-events-auto relative w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground shadow-xl hover:bg-secondary active:scale-95 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  {comentariosCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {comentariosCount > 99 ? '99+' : comentariosCount}
                    </span>
                  )}
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
              </div>

              <div className="space-y-4 px-5 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground uppercase tracking-wide">
                    <Scale className="w-3 h-3" />
                    Migalhas
                  </span>
                  {noticia.categoria && (
                    <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                      {noticia.categoria}
                    </span>
                  )}
                </div>
                <h2 className="font-display text-2xl md:text-3xl text-foreground leading-[1.15] font-bold tracking-tight">
                  {noticia.titulo}
                </h2>
                <p className="text-muted-foreground text-xs font-body flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {new Date(noticia.data_publicacao).toLocaleDateString('pt-BR')} –{' '}
                  {new Date(noticia.data_publicacao).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
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
                    prose-img:hidden
                  "
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanMd(fullMd || noticia.conteudo_md || noticia.conteudo || noticia.resumo || 'Conteúdo não disponível.')}
                  </ReactMarkdown>
                  {loadingMd && !fullMd && (
                    <p className="text-xs text-muted-foreground italic mt-3">Carregando conteúdo completo…</p>
                  )}
                </article>

                <div className="h-24" />
              </div>
            </div>
          </motion.div>

          <ShareSheet
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            title={noticia.titulo}
            text={noticia.resumo}
            url={noticia.link}
          />

          <AnimatePresence>
            {comentariosOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-[60] bg-black/50"
                  onClick={() => setComentariosOpen(false)}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                  className={
                    isDesktop
                      ? 'fixed z-[60] bottom-0 left-0 right-0 mx-auto bg-card border border-border rounded-t-2xl flex flex-col w-[600px] max-h-[80vh] shadow-2xl'
                      : 'fixed inset-x-0 bottom-0 z-[60] rounded-t-3xl bg-card border-t border-border flex flex-col max-h-[80vh]'
                  }
                >
                  <div className="flex items-center justify-between px-5 pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                    <button
                      onClick={() => setComentariosOpen(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                    >
                      <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="px-5 pb-2">
                    <h3 className="font-display text-lg text-foreground flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      Comentários
                      {comentariosCount > 0 && (
                        <span className="text-xs text-muted-foreground font-body font-normal">
                          ({comentariosCount})
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 pb-8">
                    <NoticiaComentarios
                      noticiaRef={noticia.id}
                      onCountChange={setComentariosCount}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
