import { useState, useEffect } from 'react';
import { Newspaper, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getNoticiasCache, prefetchNoticias, type Noticia } from '@/services/noticiasService';
import { directImg } from '@/lib/cdnImg';
import { Skeleton } from '@/components/ui/skeleton';

export default function DesktopNewsGrid() {
  const navigate = useNavigate();
  const [noticias, setNoticias] = useState<Noticia[]>(() => {
    const cached = getNoticiasCache();
    return cached ? cached.slice(0, 4) : [];
  });

  useEffect(() => {
    if (noticias.length >= 4) return;
    prefetchNoticias();
    const interval = setInterval(() => {
      const cached = getNoticiasCache();
      if (cached && cached.length >= 4) {
        setNoticias(cached.slice(0, 4));
        clearInterval(interval);
      }
    }, 200);
    const timeout = setTimeout(() => clearInterval(interval), 8000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  if (noticias.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-6 border-t border-border/40">
        <Skeleton className="w-48 h-5 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-auto lg:h-[280px]">
          <Skeleton className="lg:col-span-7 h-[220px] lg:h-full rounded-2xl" />
          <div className="lg:col-span-5 flex flex-col gap-3">
            <Skeleton className="flex-1 rounded-xl" />
            <Skeleton className="flex-1 rounded-xl" />
            <Skeleton className="flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const mainNews = noticias[0];
  const sideNews = noticias.slice(1, 4);

  return (
    <div className="max-w-7xl mx-auto px-8 py-6 border-t border-border/40 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl text-foreground flex items-center gap-2.5">
          <Newspaper className="w-5 h-5 text-primary" />
          Notícias em Destaque
        </h2>
        <button
          onClick={() => navigate('/noticias')}
          className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
        >
          Ver todas <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-auto lg:h-[280px]">
        {/* Notícia Principal — compacta e responsiva */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate('/noticias', { state: { noticiaId: mainNews.id } })}
          className="lg:col-span-7 h-[220px] lg:h-full rounded-2xl overflow-hidden relative group cursor-pointer border border-border/40 shadow-md"
        >
          {mainNews.imagem_url && (
            <img
              src={directImg(mainNews.imagem_url, 800)}
              alt={mainNews.titulo}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
            {mainNews.categoria && (
              <span className="inline-block px-2.5 py-0.5 mb-2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                {mainNews.categoria}
              </span>
            )}
            <h3 className="font-display font-bold text-lg md:text-xl text-white leading-snug mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
              {mainNews.titulo}
            </h3>
            {mainNews.data_publicacao && (
              <p className="text-white/60 text-xs">
                {new Date(mainNews.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </motion.div>

        {/* Notícias Menores */}
        <div className="lg:col-span-5 flex flex-col gap-3 h-full">
          {sideNews.map((news, i) => (
            <motion.div
              key={news.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.08 * (i + 1) }}
              onClick={() => navigate('/noticias', { state: { noticiaId: news.id } })}
              className="flex-1 rounded-xl overflow-hidden relative group cursor-pointer border border-border/40 shadow-xs flex items-center bg-card hover:bg-secondary/40 transition-colors p-1"
            >
              {news.imagem_url && (
                <div className="w-24 md:w-28 h-full shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={directImg(news.imagem_url, 300)}
                    alt={news.titulo}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="px-3 py-2 flex-1 min-w-0">
                {news.categoria && (
                  <span className="text-primary text-[9.5px] font-bold uppercase tracking-wider mb-0.5 block truncate">
                    {news.categoria}
                  </span>
                )}
                <h4 className="font-display font-bold text-[12.5px] md:text-[13px] leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {news.titulo}
                </h4>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
