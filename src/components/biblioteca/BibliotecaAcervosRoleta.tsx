import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { COLECOES } from '@/lib/bibliotecaColecoes';

interface BibliotecaAcervosRoletaProps {
  counts: Record<string, number>;
}

export const BibliotecaAcervosRoleta: React.FC<BibliotecaAcervosRoletaProps> = ({ counts }) => {
  const navigate = useNavigate();

  return (
    <section className="pt-8 pb-4">
      {/* Cabeçalho da seção com o mesmo padrão premium do app */}
      <div className="px-4 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-1 h-7 rounded-full bg-primary shrink-0" aria-hidden />
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight truncate normal-case">
              Acervos de Livros
            </h2>
            <p className="text-[12px] sm:text-[13px] text-zinc-400 mt-0.5 line-clamp-1">
              Explore as coleções completas por área, autor e temática jurídica.
            </p>
          </div>
        </div>
      </div>

      {/* Lista normal com a capa do lado esquerdo */}
      <div className="px-4 space-y-3">
        {COLECOES.map((c) => {
          const count = counts[c.id];
          return (
            <div
              key={c.id}
              onClick={() => navigate(`/bibliotecas/${c.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/bibliotecas/${c.id}`);
                }
              }}
              className="group flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800/80 border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99]"
            >
              {/* Capa do lado esquerdo */}
              <div className="w-[70px] sm:w-[82px] h-[100px] sm:h-[116px] rounded-xl overflow-hidden shrink-0 bg-zinc-950 border border-white/10 shadow-md shadow-black/50">
                <img
                  src={c.cover}
                  alt={c.label}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Informações da coleção do lado direito */}
              <div className="flex-1 min-w-0 py-0.5">
                {count ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/15 inline-flex items-center w-fit mb-1.5">
                    {count} {count === 1 ? 'livro' : 'livros'}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/15 inline-flex items-center w-fit mb-1.5">
                    {c.eyebrow || 'Coleção'}
                  </span>
                )}
                <h3 className="text-[15.5px] sm:text-[16.5px] font-semibold tracking-tight text-white group-hover:text-primary transition-colors leading-snug truncate normal-case">
                  {c.label}
                </h3>
                <p className="text-[12px] sm:text-[12.5px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                  {c.subtitle}
                </p>
              </div>

              {/* Ícone seta para direita */}
              <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-primary/20 flex items-center justify-center text-zinc-400 group-hover:text-white transition-all shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
