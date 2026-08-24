import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { prefetchRoute } from '@/lib/routePrefetch';
import { CATEGORIAS_EDUCACIONAIS } from '@/data/artigosEducacionais';
import fundCoverAsset from '@/assets/covers/fundamentos-da-lei.webp';
const fundCover = fundCoverAsset;
import histCoverAsset from '@/assets/covers/historia-da-legislacao.webp';
const histCover = histCoverAsset;
import estCoverAsset from '@/assets/covers/estrutura-do-estado.webp';
const estCover = estCoverAsset;

const COVER_MAP: Record<string, string> = {
  fundamentos: fundCover,
  historia: histCover,
  'estrutura-estado': estCover,
};

const AtualizacaoTab = ({ searchQuery }: { searchQuery: string }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <BookOpen className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-bold text-foreground">Artigos Educacionais</h2>
        <span className="text-[10px] text-muted-foreground font-body">
          ({CATEGORIAS_EDUCACIONAIS.reduce((acc, c) => acc + c.artigos.length, 0)} artigos)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {CATEGORIAS_EDUCACIONAIS.map((cat, i) => {
          const Icon = cat.icon;
          const cover = COVER_MAP[cat.id];
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 260, damping: 24 }}
              onPointerEnter={() => prefetchRoute('categoriaAprender')}
              onClick={() => navigate(`/aprender/categoria/${cat.id}`)}
              className="relative rounded-2xl overflow-hidden cursor-pointer group aspect-[2/1]"
            >
              <img
                src={cover}
                alt={cat.nome}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="relative z-10 h-full flex flex-col justify-end p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {cat.artigos.length} artigos
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-white leading-tight drop-shadow-lg">
                  {cat.nome}
                </h3>
                <p className="text-white/70 text-xs font-body mt-0.5 drop-shadow">
                  {cat.descricao}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AtualizacaoTab;
