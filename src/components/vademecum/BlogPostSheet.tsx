import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Clock,
  BookOpen,
  Share2,
  ArrowUpRight,
  Heart,
  Type,
  Plus,
  Minus,
  MessageCircle,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Headphones,
  Loader2,
  X,
  ZoomIn,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { useIsDesktop } from '@/hooks/use-desktop';
import { toast } from 'sonner';
import ShareSheet from './ShareSheet';
import BlogPostComments from './BlogPostComments';
import ImageZoomModal from './ImageZoomModal';
import type { BlogPost } from '@/data/blogPosts';
import BlogCoverImage from '@/components/BlogCoverImage';
import { blogHero } from '@/lib/blogImg';
import { supabase } from '@/integrations/supabase/client';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { haptic } from '@/lib/nativeHaptics';
import { notifyMediaPlay, subscribeMediaPlay } from '@/lib/mediaCoordinator';
import { speakNative, stopNativeSpeech } from '@/lib/nativeTts';
import { telaAcesa } from '@/lib/nativo/telaAcordada';

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

/** Formata segundos para MM:SS */
function formatAudioTime(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
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

  // Estados de Leitura e UI
  const [fontSize, setFontSize] = useState(17);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [concluido, setConcluido] = useState(false);
  const [conteudo, setConteudo] = useState<string>(post?.conteudo_md || '');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Estados do Player de Narração (Áudio)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioPlayerOpen, setAudioPlayerOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(() => {
    if (!post) return null;
    return post.audio_url || `https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/blog/audios/${post.id}.mp3`;
  });
  const [audioVoice, setAudioVoice] = useState<string>(() => post?.audio_voice || 'Professora');
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt?: string } | null>(null);
  const isUsingTtsFallbackRef = useRef(false);

  const incFont = () => {
    haptic.selection();
    setFontSize((s) => Math.min(26, s + 2));
  };
  const decFont = () => {
    haptic.selection();
    setFontSize((s) => Math.max(13, s - 2));
  };

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
    haptic.success();
    const next = !concluido;
    setConcluido(next);
    try {
      if (next) {
        localStorage.setItem(`blog_concluido_${post.id}`, '1');
      } else {
        localStorage.removeItem(`blog_concluido_${post.id}`);
      }
      window.dispatchEvent(new CustomEvent('blog_status_updated', { detail: { id: post.id, concluido: next } }));
    } catch {}
  };

  // Inicialização e sincronização do áudio
  useEffect(() => {
    if (!post) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      void stopNativeSpeech();
      isUsingTtsFallbackRef.current = false;
      setIsPlaying(false);
      setIsLoadingAudio(false);
      setCurrentTime(0);
      setAudioDuration(0);
      setAudioPlayerOpen(false);
      setAudioUrl(null);
      return;
    }

    const defaultR2Url = `https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/blog/audios/${post.id}.mp3`;
    const initialUrl = post.audio_url || defaultR2Url;
    setAudioUrl(initialUrl);

    if (audioRef.current && (!audioRef.current.src || !audioRef.current.src.includes(post.id))) {
      audioRef.current.src = initialUrl;
      audioRef.current.load();
    }

    if (post.audio_duration_seconds) {
      setAudioDuration(post.audio_duration_seconds);
    }
    if (post.audio_voice) {
      setAudioVoice(post.audio_voice);
    }

    // Busca detalhes mais recentes no Supabase caso ainda não estejam no cache
    supabase
      .from('blog_edicao_posts')
      .select('conteudo_md, audio_url, audio_duration_seconds, audio_voice')
      .eq('id', post.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.conteudo_md && !conteudo) {
          setConteudo(data.conteudo_md as string);
        }
        if (data?.audio_url && data.audio_url !== initialUrl) {
          setAudioUrl(data.audio_url);
          if (audioRef.current && !isPlaying) {
            audioRef.current.src = data.audio_url;
            audioRef.current.load();
          }
        }
        if (data?.audio_duration_seconds) {
          setAudioDuration(data.audio_duration_seconds);
        }
        if (data?.audio_voice) {
          setAudioVoice(data.audio_voice);
        }
      });
  }, [post?.id]);

  // Pausa narração se outro reprodutor do app iniciar
  useEffect(() => {
    return subscribeMediaPlay((active) => {
      if (active !== 'narracao') {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        void stopNativeSpeech();
        setIsPlaying(false);
      }
    });
  }, []);

  // Mantém tela acesa durante a narração
  useEffect(() => {
    void telaAcesa('blog_narracao', isPlaying);
    return () => {
      void telaAcesa('blog_narracao', false);
    };
  }, [isPlaying]);

  // Limpa reprodução ao desmontar
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      void stopNativeSpeech();
    };
  }, []);

  const togglePlay = async () => {
    haptic.light();
    if (!post) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      void stopNativeSpeech();
      isUsingTtsFallbackRef.current = false;
      setIsPlaying(false);
      return;
    }

    setAudioPlayerOpen(true);
    setIsLoadingAudio(true);

    const defaultR2Url = `https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/blog/audios/${post.id}.mp3`;
    const targetUrl = audioUrl || post.audio_url || defaultR2Url;

    notifyMediaPlay('narracao');

    const tryTtsFallback = async () => {
      isUsingTtsFallbackRef.current = true;
      const rawText = (conteudo || post.conteudo_md || post.resumo || post.titulo)
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/[#*_`>~-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (rawText) {
        toast.info('Iniciando narração do artigo...');
        const ok = await speakNative(rawText, { rate: playbackSpeed });
        if (ok) {
          setIsPlaying(true);
          setIsLoadingAudio(false);
        } else {
          setIsPlaying(false);
          setIsLoadingAudio(false);
          toast.error('Não foi possível iniciar a narração deste artigo.');
        }
      } else {
        setIsPlaying(false);
        setIsLoadingAudio(false);
        toast.error('Conteúdo do artigo indisponível para narração.');
      }
    };

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
    }

    if (!audio.src || !audio.src.includes(post.id)) {
      audio.src = targetUrl;
      audio.preload = 'auto';
      audio.load();
    }

    audio.playbackRate = playbackSpeed;

    try {
      await audio.play();
      setIsPlaying(true);
      setIsLoadingAudio(false);
      isUsingTtsFallbackRef.current = false;

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: post.titulo,
            artist: post.autor || 'Redação Vacatio',
            album: 'Blog Jurídico',
            artwork: post.imagem_url ? [{ src: post.imagem_url, sizes: '512x512', type: 'image/jpeg' }] : [],
          });
          navigator.mediaSession.setActionHandler('play', () => {
            notifyMediaPlay('narracao');
            audio?.play().catch(() => {});
            setIsPlaying(true);
          });
          navigator.mediaSession.setActionHandler('pause', () => {
            audio?.pause();
            setIsPlaying(false);
          });
          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (audio && details.seekTime !== undefined) {
              audio.currentTime = details.seekTime;
              setCurrentTime(details.seekTime);
            }
          });
        } catch {}
      }
    } catch (err) {
      console.warn('Erro ao reproduzir MP3, ativando narração por voz nativa:', err);
      await tryTtsFallback();
    }
  };

  const skipAudio = (seconds: number) => {
    haptic.selection();
    if (isUsingTtsFallbackRef.current) return;
    if (!audioRef.current) return;
    const maxDur = audioDuration || audioRef.current.duration || 9999;
    const next = Math.max(0, Math.min(maxDur, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = next;
    setCurrentTime(next);
  };

  const cycleSpeed = () => {
    haptic.selection();
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
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
          className={`font-display font-bold text-xl md:text-2xl mt-5 mb-2.5 ${
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
          className={`font-display font-semibold text-lg md:text-xl mt-4 mb-2 ${
            upper ? 'text-[#FF6B6B] dark:text-[#F87171] tracking-wide' : 'text-foreground'
          }`}
          {...props}
        >
          {children}
        </h3>
      );
    },
    p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => {
      const text = typeof children === 'string' ? children : '';
      if (text.startsWith('Foto:') || text.startsWith('Fonte:') || text.startsWith('Legenda:') || text.startsWith('Figura')) {
        return (
          <p className="text-xs text-muted-foreground italic text-center -mt-3 mb-4" {...props}>
            {children}
          </p>
        );
      }
      return <p className="my-4 leading-[1.75]" {...props}>{children}</p>;
    },
    img: ({ src, alt, ...props }: React.ComponentPropsWithoutRef<'img'>) => (
      <figure className="my-6 flex flex-col items-center">
        <div
          onClick={() => src && setZoomedImage({ src, alt: typeof alt === 'string' ? alt : undefined })}
          className="relative group cursor-zoom-in rounded-2xl overflow-hidden shadow-xl border border-border/50 max-h-[480px] w-full bg-black/20"
        >
          <img
            src={src}
            alt={alt || 'Ilustração do artigo'}
            loading="lazy"
            decoding="async"
            className="w-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
            {...props}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
            <span className="px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl border border-white/10">
              <ZoomIn className="w-3.5 h-3.5 text-primary" />
              Toque para ampliar
            </span>
          </div>
        </div>

        {/* Botão de Zoom solicitado para facilitar toque em mobile */}
        <button
          type="button"
          onClick={() => src && setZoomedImage({ src, alt: typeof alt === 'string' ? alt : undefined })}
          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-foreground text-xs font-semibold border border-border/60 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5 text-primary" />
          <span>Toque para dar zoom</span>
        </button>

        {alt && alt !== 'imagem' && alt !== 'ilustracao' && (
          <figcaption className="text-xs text-muted-foreground italic text-center mt-1.5 px-4">
            {alt}
          </figcaption>
        )}
      </figure>
    ),
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

  // Trava scroll do fundo enquanto o painel estiver aberto
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

      if (!user) {
        try {
          const isLocalFav = localStorage.getItem(`blog_fav_${post.id}`) === '1';
          if (!cancelled) setLiked(isLocalFav);
        } catch {}
        return;
      }
      const { data } = await supabase.from('blog_post_likes')
        .select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle();
      if (!cancelled) setLiked(!!data);
    })();
    return () => { cancelled = true; };
  }, [post?.id]);

  const toggleLike = async () => {
    if (!post || likeBusy) return;
    haptic.selection();
    setLikeBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const next = !liked;
    setLiked(next); // otimista

    // Sincroniza localmente para resposta instantânea e offline
    try {
      if (next) localStorage.setItem(`blog_fav_${post.id}`, '1');
      else localStorage.removeItem(`blog_fav_${post.id}`);
      window.dispatchEvent(new CustomEvent('blog_fav_updated'));
    } catch {}

    if (!user) {
      setLikeBusy(false);
      toast.success(next ? 'Artigo favoritado!' : 'Artigo removido dos favoritos');
      return;
    }

    if (next) {
      const { error } = await supabase.from('blog_post_likes')
        .insert({ post_id: post.id, user_id: user.id });
      if (error) {
        setLiked(false);
        try {
          localStorage.removeItem(`blog_fav_${post.id}`);
          window.dispatchEvent(new CustomEvent('blog_fav_updated'));
        } catch {}
      } else {
        toast.success('Artigo favoritado!');
      }
    } else {
      const { error } = await supabase.from('blog_post_likes')
        .delete().eq('post_id', post.id).eq('user_id', user.id);
      if (error) {
        setLiked(true);
        try {
          localStorage.setItem(`blog_fav_${post.id}`, '1');
          window.dispatchEvent(new CustomEvent('blog_fav_updated'));
        } catch {}
      } else {
        toast.info('Artigo removido dos favoritos');
      }
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

          {/* Elemento de áudio oculto */}
          <audio
            ref={audioRef}
            src={audioUrl || undefined}
            preload="metadata"
            onTimeUpdate={() => {
              if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            }}
            onLoadedMetadata={() => {
              if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
                setAudioDuration(audioRef.current.duration);
              }
            }}
            onWaiting={() => setIsLoadingAudio(true)}
            onPlaying={() => {
              setIsLoadingAudio(false);
              setIsPlaying(true);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
              if (audioRef.current) audioRef.current.currentTime = 0;
              toast.success('Narração concluída!');
            }}
            onError={() => {
              setIsLoadingAudio(false);
              setIsPlaying(false);
            }}
          />

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
              className="flex-1 overflow-y-auto pb-36 relative scroll-smooth"
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

              {/* Barra superior de navegação: botão de fechar/abaixar à esquerda + comentários e atalhos à direita */}
              <div className="sticky top-1 z-30 pointer-events-none flex items-center justify-between px-3 -mt-7 mb-3">
                {/* Botão de fechar / abaixar o artigo */}
                <button
                  onClick={onClose}
                  aria-label="Abaixar artigo"
                  className="pointer-events-auto w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground shadow-xl hover:bg-secondary active:scale-95 transition-all cursor-pointer"
                >
                  <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
                </button>

                {/* Ações da direita no topo */}
                <div className="pointer-events-auto flex items-center gap-2">
                  {showGoTo && (
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/blog', { state: { postId: post.id } });
                      }}
                      aria-label="Ir para o Blog"
                      className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground text-xs font-semibold shadow-xl hover:bg-secondary active:scale-95 transition-all cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Ir para
                    </button>
                  )}

                  {/* Botão de Comentários */}
                  <button
                    onClick={() => {
                      haptic.selection();
                      setCommentsOpen(true);
                    }}
                    aria-label="Comentários"
                    className="w-11 h-11 flex items-center justify-center rounded-full bg-card/95 backdrop-blur-md border border-border text-foreground shadow-xl hover:bg-secondary active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5" />
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
                  {isPlaying && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold animate-pulse border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Reproduzindo narração
                    </span>
                  )}
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
                  {audioDuration > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                        <Headphones className="w-3 h-3" />
                        {formatAudioTime(audioDuration)} de áudio
                      </span>
                    </>
                  )}
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

                {/* Cartão de Conclusão de Leitura */}
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
                  <p className="text-xs text-muted-foreground mt-2.5 text-center">
                    {concluido
                      ? 'Parabéns! Artigo marcado no seu progresso.'
                      : 'Finalizou a leitura? Marque para registrar seu progresso no app.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Seletor Flutuante de Tamanho da Fonte (aparece acima do botão Fonte) */}
            <AnimatePresence>
              {fontOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="fixed bottom-[88px] left-8 sm:left-auto sm:right-32 z-50 flex items-center gap-2 bg-[#232326]/95 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-2xl shadow-2xl text-white select-none"
                >
                  <button
                    onClick={decFont}
                    aria-label="Diminuir fonte"
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition-all text-white cursor-pointer"
                  >
                    <Minus className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <span className="min-w-[48px] text-center font-mono text-xs font-bold text-white">
                    {fontSize}px
                  </span>
                  <button
                    onClick={incFont}
                    aria-label="Aumentar fonte"
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition-all text-white cursor-pointer"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player Flutuante de Narração (aparece acima do Bottom Nav) */}
            <AnimatePresence>
              {audioPlayerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 25, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed bottom-[88px] left-3 right-3 sm:left-auto sm:right-6 sm:w-[420px] z-[70] rounded-2xl bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-white select-none"
                >
                  {/* Header do Player: Título + Voz + Velocidade + Fechar */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate leading-tight">
                          Narração do Artigo
                        </p>
                        <p className="text-[10px] text-white/60 truncate flex items-center gap-1.5 mt-0.5">
                          <span>Voz: {audioVoice}</span>
                          {isPlaying && (
                            <span className="flex items-center gap-0.5 ml-1">
                              <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
                              <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-pulse delay-75" />
                              <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse delay-150" />
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={cycleSpeed}
                        className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white active:scale-95 transition-all cursor-pointer"
                        title="Alterar velocidade"
                      >
                        {playbackSpeed}x
                      </button>
                      <button
                        onClick={() => {
                          if (audioRef.current) audioRef.current.pause();
                          void stopNativeSpeech();
                          isUsingTtsFallbackRef.current = false;
                          setIsPlaying(false);
                          setAudioPlayerOpen(false);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Fechar player"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Barra de Progresso Scrub Interativa */}
                  <div className="space-y-1">
                    <div className="relative w-full flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={audioDuration || 100}
                        value={currentTime}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCurrentTime(val);
                          if (audioRef.current) audioRef.current.currentTime = val;
                        }}
                        className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/60 font-mono">
                      <span>{formatAudioTime(currentTime)}</span>
                      <span>{formatAudioTime(audioDuration)}</span>
                    </div>
                  </div>

                  {/* Controles de Reprodução (-10s, Play/Pause, +10s) */}
                  <div className="flex items-center justify-center gap-6 mt-1.5">
                    <button
                      onClick={() => skipAudio(-10)}
                      className="text-white/70 hover:text-white active:scale-90 transition-all flex flex-col items-center cursor-pointer"
                      title="Voltar 10 segundos"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="text-[9px] -mt-0.5 font-bold">-10s</span>
                    </button>

                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      {isLoadingAudio ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    <button
                      onClick={() => skipAudio(10)}
                      className="text-white/70 hover:text-white active:scale-90 transition-all flex flex-col items-center cursor-pointer"
                      title="Avançar 10 segundos"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span className="text-[9px] -mt-0.5 font-bold">+10s</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Menu de Rodapé do Artigo (estilo BottomNav do início do aplicativo) */}
            <nav
              aria-label="Barra de ações do artigo"
              className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#1C1C1E] backdrop-blur-md rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.6),0_-2px_10px_rgba(0,0,0,0.4)] pb-[var(--sai-bottom,0px)] select-none"
            >
              {/* Degradê escuro subindo do rodapé para dar profundidade */}
              <div
                aria-hidden="true"
                className="absolute bottom-full left-0 right-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"
              />
              <div className="relative z-10 grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto">
                {/* 1. Favoritar */}
                <button
                  onClick={toggleLike}
                  data-track="blog_sheet_favoritar"
                  className="flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer group"
                  aria-label={liked ? 'Desfavoritar' : 'Favoritar'}
                >
                  <Heart
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform group-active:scale-125 ${
                      liked
                        ? 'scale-110 text-rose-500 fill-rose-500 drop-shadow-[0_2px_10px_rgba(244,63,94,0.5)]'
                        : 'text-white/80 hover:text-white drop-shadow-sm'
                    }`}
                    strokeWidth={1.5}
                  />
                  <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center text-white/90 drop-shadow-sm">
                    {liked ? 'Favorito' : 'Favoritar'}
                  </span>
                </button>

                {/* 2. Fonte (A- / A+) */}
                <button
                  onClick={() => {
                    haptic.selection();
                    setFontOpen((v) => !v);
                  }}
                  data-track="blog_sheet_fonte"
                  className="flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer group"
                  aria-label="Tamanho da fonte"
                  aria-expanded={fontOpen}
                >
                  <Type
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform group-active:scale-110 ${
                      fontOpen ? 'scale-110 text-primary drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]' : 'text-white/80 hover:text-white drop-shadow-sm'
                    }`}
                    strokeWidth={1.5}
                  />
                  <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center text-white/90 drop-shadow-sm">
                    Fonte
                  </span>
                </button>

                {/* 3. Narrar (Central FAB - Principal) */}
                <button
                  onClick={togglePlay}
                  data-track="blog_sheet_narrar"
                  className="relative z-[80] flex flex-col items-center justify-end gap-1.5 -mt-11 min-h-[6.25rem] min-w-[5.75rem] touch-manipulation select-none cursor-pointer"
                  aria-label={isPlaying ? 'Pausar narração' : 'Narrar artigo'}
                >
                  <span
                    className={`relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full flex items-center justify-center overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all duration-300 active:scale-95 ${
                      isPlaying
                        ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-amber-400 ring-4 ring-amber-400/40 animate-pulse'
                        : 'bg-primary ring-2 ring-white/10 hover:ring-white/25 hover:scale-105'
                    }`}
                  >
                    {isLoadingAudio ? (
                      <Loader2 className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-8 h-8 sm:w-9 sm:h-9 text-white fill-current drop-shadow-sm" strokeWidth={1.5} />
                    ) : (
                      <Play className="w-8 h-8 sm:w-9 sm:h-9 text-white fill-current ml-1 drop-shadow-sm" strokeWidth={1.5} />
                    )}
                  </span>
                  <span className="font-body text-[11px] sm:text-[12px] font-bold leading-tight text-center text-white drop-shadow-sm truncate px-0.5">
                    {isPlaying ? 'Pausar' : 'Narrar'}
                  </span>
                </button>

                {/* 4. Compartilhar */}
                <button
                  onClick={() => {
                    haptic.selection();
                    setShareOpen(true);
                  }}
                  data-track="blog_sheet_compartilhar"
                  className="flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer group"
                  aria-label="Compartilhar artigo"
                >
                  <Share2 className="w-7 h-7 sm:w-8 sm:h-8 text-white/80 hover:text-white group-active:scale-110 drop-shadow-sm" strokeWidth={1.5} />
                  <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center text-white/90 drop-shadow-sm">
                    Compartilhar
                  </span>
                </button>

                {/* 5. Concluir / Lido */}
                <button
                  onClick={() => {
                    haptic.selection();
                    toggleConcluido();
                  }}
                  data-track="blog_sheet_concluir"
                  className="flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative cursor-pointer group"
                  aria-label={concluido ? 'Leitura concluída' : 'Marcar como lido'}
                >
                  <CheckCircle2
                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform group-active:scale-125 ${
                      concluido
                        ? 'scale-110 text-emerald-400 fill-emerald-500/20 drop-shadow-[0_2px_10px_rgba(52,211,153,0.5)]'
                        : 'text-white/80 hover:text-white drop-shadow-sm'
                    }`}
                    strokeWidth={1.5}
                  />
                  <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center text-white/90 drop-shadow-sm">
                    {concluido ? 'Lido' : 'Concluir'}
                  </span>
                </button>
              </div>
            </nav>
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

          <ImageZoomModal
            src={zoomedImage?.src ?? null}
            alt={zoomedImage?.alt}
            onClose={() => setZoomedImage(null)}
          />
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  if (inline) return content;
  return createPortal(content, document.body);
}
