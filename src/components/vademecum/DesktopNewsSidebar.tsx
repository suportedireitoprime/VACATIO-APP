import { useState, useEffect } from 'react';
import { Newspaper, BookOpen, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getNoticiasCache, prefetchNoticias, type Noticia } from '@/services/noticiasService';
import { useBlogPostsCache } from '@/hooks/useBlogPostsCache';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { directImg } from '@/lib/cdnImg';
import BlogPostSheet from '@/components/vademecum/BlogPostSheet';
import type { BlogPost } from '@/data/blogPosts';

type Tab = 'blog' | 'noticias' | 'boletins';

type BoletimLite = {
  id: string;
  titulo: string;
  thumbnail_url: string | null;
  data_ref: string;
  tipo: string;
};

const TABS: { id: Tab; label: string; icon: typeof Newspaper }[] = [
  { id: 'blog', label: 'Blog', icon: BookOpen },
  { id: 'noticias', label: 'Notícias', icon: Newspaper },
  { id: 'boletins', label: 'Boletins', icon: Radio },
];

const DesktopNewsSidebar = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('blog');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  // Notícias
  const [noticias, setNoticias] = useState<Noticia[]>(() => {
    const cached = getNoticiasCache();
    return cached ? cached.slice(0, 12) : [];
  });
  useEffect(() => {
    if (noticias.length > 0) return;
    prefetchNoticias();
    const interval = setInterval(() => {
      const cached = getNoticiasCache();
      if (cached && cached.length > 0) {
        setNoticias(cached.slice(0, 12));
        clearInterval(interval);
      }
    }, 200);
    const timeout = setTimeout(() => clearInterval(interval), 8000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  // Blog
  const { posts } = useBlogPostsCache();

  // Boletins
  const [boletins, setBoletins] = useState<BoletimLite[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('boletins_juridicos')
        .select('id,titulo,thumbnail_url,data_ref,tipo')
        .eq('status', 'pronto')
        .order('data_ref', { ascending: false })
        .limit(12);
      if (!cancelled) setBoletins((data as any) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  const goSeeAll = () => {
    if (tab === 'blog') navigate('/blog');
    else if (tab === 'noticias') navigate('/noticias');
    else navigate('/boletins');
  };

  return (
    <aside className="w-[240px] lg:w-[280px] xl:w-[320px] shrink-0 sticky top-0 min-h-dvh overflow-y-auto border-l border-border bg-card/50">
      {/* Tabs */}
      <div className="px-4 pt-4 pb-2 sticky top-0 bg-card/80 backdrop-blur z-10 border-b border-border/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = TABS.find(t => t.id === tab)!.icon;
              return <Icon className="w-4 h-4 text-primary" />;
            })()}
            <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">
              {TABS.find(t => t.id === tab)!.label}
            </h2>
          </div>
          <button
            onClick={goSeeAll}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/15"
          >
            Ver todas →
          </button>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  active ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lists */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3 px-4 py-4"
        >
          {tab === 'noticias' && (
            <>
              {noticias.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
              {noticias.filter(n => n.imagem_url?.trim()).map((n, i) => (
                <ListRow
                  key={n.id}
                  i={i}
                  image={directImg(n.imagem_url!, 200)}
                  title={n.titulo}
                  tag={n.categoria || 'Notícia'}
                  date={n.data_publicacao
                    ? new Date(n.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : ''}
                  onClick={() => navigate('/noticias', { state: { noticiaId: n.id } })}
                />
              ))}
            </>
          )}

          {tab === 'blog' && (
            <>
              {posts.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
              {posts.slice(0, 12).map((p, i) => (
                <ListRow
                  key={p.id}
                  i={i}
                  image={p.imagem_url ? directImg(p.imagem_url, 200) : undefined}
                  title={p.titulo}
                  tag={p.tema || 'Blog'}
                  date={p.data_publicacao
                    ? new Date(p.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : ''}
                  onClick={() => setSelectedPost(p as unknown as BlogPost)}
                />
              ))}
            </>
          )}

          {tab === 'boletins' && (
            <>
              {boletins.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
              {boletins.map((b, i) => (
                <ListRow
                  key={b.id}
                  i={i}
                  image={b.thumbnail_url || undefined}
                  title={b.titulo}
                  tag={b.tipo === 'noticias' ? 'Notícias' : 'Jurídico'}
                  date={b.data_ref
                    ? new Date(b.data_ref).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : ''}
                  onClick={() =>
                    navigate(b.tipo === 'noticias' ? `/boletins-noticias/${b.id}` : `/boletins/${b.id}`)
                  }
                />
              ))}
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <BlogPostSheet post={selectedPost} onClose={() => setSelectedPost(null)} showGoTo />
    </aside>
  );
};

const SkeletonRow = () => (
  <div className="rounded-lg overflow-hidden bg-card border border-border flex gap-3">
    <Skeleton className="h-[70px] w-[90px] shrink-0" />
    <div className="py-2 pr-2 flex-1 space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
);

interface RowProps {
  i: number;
  image?: string;
  title: string;
  tag: string;
  date: string;
  onClick: () => void;
}
const ListRow = ({ i, image, title, tag, date, onClick }: RowProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(i * 0.04, 0.35), type: 'spring', stiffness: 260, damping: 24 }}
    onClick={onClick}
    className="rounded-lg overflow-hidden bg-card border border-border hover:border-primary/30 transition-all group cursor-pointer flex gap-3"
  >
    <div className="relative w-[90px] h-[70px] shrink-0 overflow-hidden rounded-l-lg bg-muted">
      {image && (
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
    </div>
    <div className="py-2 pr-2 flex flex-col justify-center min-w-0 flex-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[8px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full truncate max-w-[110px]">
          {tag}
        </span>
        {date && <span className="text-muted-foreground text-[9px]">{date}</span>}
      </div>
      <h4 className="font-display text-[11px] font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {title}
      </h4>
    </div>
  </motion.div>
);

export default DesktopNewsSidebar;
