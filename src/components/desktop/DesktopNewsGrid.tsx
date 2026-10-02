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
      <div className="max-w-7xl mx-auto px-8 py-8 border-t border-border/40">
        <Skeleton className="w-48 h-6 mb-6" />
        <div className="grid grid-cols-3 gap-6 h-[400px]">
          <Skeleton className="col-span-2 h-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="flex-1 rounded-2xl" />
            <Skeleton className="flex-1 rounded-2xl" />
            <Skeleton className="flex-1 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const mainNews = noticias[0];
  const sideNews = noticias.slice(1, 4);

  return (
    <div className="max-w-7xl mx-auto px-8 py-8 border-t border-border/40 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
          <Newspaper className="w-6 h-6 text-primary" />
          Notícias em Destaque
        </h2>
        <button
          onClick={() => navigate('/noticias')}
          className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
        >
          Ver todas <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
        {/* Notícia Principal */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate('/noticias', { state: { noticiaId: mainNews.id } })}
          className="lg:col-span-2 rounded-3xl overflow-hidden relative group cursor-pointer border border-border/40 shadow-lg"
        >
          {mainNews.imagem_url && (
            <img
              src={directImg(mainNews.imagem_url, 800)}
              alt={mainNews.titulo}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            {mainNews.categoria && (
              <span className="inline-block px-3 py-1 mb-4 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider">
                {mainNews.categoria}
              </span>
            )}
            <h3 className="font-display font-bold text-3xl md:text-4xl text-white leading-tight mb-2 group-hover:text-primary transition-colors">
              {mainNews.titulo}
            </h3>
            {mainNews.data_publicacao && (
              <p className="text-white/60 text-sm">
                {new Date(mainNews.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </motion.div>

        {/* Notícias Menores */}
        <div className="flex flex-col gap-4">
          {sideNews.map((news, i) => (
            <motion.div
              key={news.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * (i + 1) }}
              onClick={() => navigate('/noticias', { state: { noticiaId: news.id } })}
              className="flex-1 rounded-2xl overflow-hidden relative group cursor-pointer border border-border/40 shadow-md flex items-center bg-card hover:bg-secondary/40 transition-colors"
            >
              {news.imagem_url && (
                <div className="w-1/3 h-full shrink-0 overflow-hidden">
                  <img
                    src={directImg(news.imagem_url, 300)}
                    alt={news.titulo}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              )}
              <div className="p-4 flex-1">
                {news.categoria && (
                  <span className="text-primary text-[10px] font-bold uppercase tracking-wider mb-1 block">
                    {news.categoria}
                  </span>
                )}
                <h4 className="font-display font-bold text-[14px] leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-3">
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
