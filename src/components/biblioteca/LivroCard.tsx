import { directImg } from '@/lib/cdnImg';

export interface LivroUnificado {
  id: string | number;
  titulo: string;
  autor?: string | null;
  sinopse?: string | null;
  capa?: string | null;
  link?: string | null;
  download?: string | null;
  categoria: string;
  area?: string | null;
}

interface LivroCardProps {
  livro: LivroUnificado;
  onClick: () => void;
  priority?: boolean;
}

const LivroCard = ({ livro, onClick, priority }: LivroCardProps) => {
  const capaUrl = livro.capa ? directImg(livro.capa, 300) : '';

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[120px] snap-start group text-left"
    >
      <div className="w-[120px] h-[170px] rounded-lg overflow-hidden bg-muted border border-border shadow-sm group-hover:shadow-md transition-shadow">
        {capaUrl ? (
          <img
            src={capaUrl}
            alt={livro.titulo}
            className="w-full h-full object-cover"
            loading={priority ? undefined : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 p-2">
            <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight line-clamp-4">
              {livro.titulo}
            </span>
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
        {livro.titulo}
      </p>
      {livro.autor && (
        <p className="text-[10px] text-muted-foreground line-clamp-1">{livro.autor}</p>
      )}
    </button>
  );
};

export default LivroCard;
