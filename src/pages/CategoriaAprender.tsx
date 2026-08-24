import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
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

const CategoriaAprender = () => {
  const { categoriaId } = useParams<{ categoriaId: string }>();
  const navigate = useNavigate();

  const categoria = CATEGORIAS_EDUCACIONAIS.find(c => c.id === categoriaId);
  if (!categoria) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Categoria não encontrada</p>
      </div>
    );
  }

  const Icon = categoria.icon;
  const cover = COVER_MAP[categoria.id] || fundCover;

  return (
    <div className="min-h-dvh bg-background">
      {/* Cover */}
      <div className="relative h-56 sm:h-64 overflow-hidden">
        <img
          src={cover}
          alt={categoria.nome}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {categoria.artigos.length} artigos
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white drop-shadow-lg">
            {categoria.nome}
          </h1>
          <p className="text-white/70 text-sm font-body mt-1 drop-shadow">
            {categoria.descricao}
          </p>
        </div>
      </div>

      {/* Articles list */}
      <div className="px-4 py-4 space-y-2 max-w-3xl mx-auto">
        {categoria.artigos.map((art, i) => (
          <motion.button
            key={art.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 260, damping: 24 }}
            onClick={() => navigate(`/aprender/${art.slug}`)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all text-left group"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                {art.titulo}
              </p>
              <p className="text-[11px] text-muted-foreground font-body mt-0.5 line-clamp-1">
                {art.descricao}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CategoriaAprender;
