import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, MicOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { directImg } from '@/lib/cdnImg';
import DesktopSidebar from '@/components/vademecum/desktop/DesktopSidebar';
import DesktopBreadcrumb from '@/components/vademecum/desktop/DesktopBreadcrumb';
import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';
import { BibliotecaCategoriaLivroCard } from './BibliotecaCategoriaLivroCard';
import { BibliotecaCategoriaAreaCard, type AreaItem } from './BibliotecaCategoriaAreaCard';
import type { ColecaoConfig, LivroNormalizado } from '@/lib/bibliotecaColecoes';
import type { LivroSnapshot } from '@/lib/bibliotecaTracking';

interface BibliotecaCategoriaDesktopViewProps {
  colecao: ColecaoConfig;
  livros: LivroNormalizado[];
  livrosVisiveis: LivroNormalizado[];
  areas: AreaItem[];
  mostrarAreas: boolean;
  isLoading: boolean;
  query: string;
  setQuery: (q: string) => void;
  voice: { listening: boolean; partial?: string; toggle: () => void };
  ultimoLivro: LivroSnapshot | null;
  livroAberto: LivroNormalizado | null;
  setLivroAberto: (l: LivroNormalizado | null) => void;
  handleCloseLivro: () => void;
  badges: any;
  norm: (s: string) => string;
}

export const BibliotecaCategoriaDesktopView: React.FC<BibliotecaCategoriaDesktopViewProps> = ({
  colecao,
  livros,
  livrosVisiveis,
  areas,
  mostrarAreas,
  isLoading,
  query,
  setQuery,
  voice,
  ultimoLivro,
  livroAberto,
  setLivroAberto,
  handleCloseLivro,
  badges,
  norm,
}) => {
  const navigate = useNavigate();

  return (
    <div className="h-[calc(100dvh-104px)] bg-background flex flex-col">
      <div className="flex flex-1 min-h-0">
        <DesktopSidebar
          activeTab="biblioteca"
          onTabChange={(tab) => {
            if (tab === 'legislacao') navigate('/');
            else if (tab === 'noticias') navigate('/noticias');
            else if (tab === 'ferramentas') navigate('/ferramentas');
            else navigate('/bibliotecas');
          }}
        />
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative contain-content overscroll-contain">
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border flex flex-col">
            <DesktopBreadcrumb />
          </div>

          <div className="px-8 py-6 2xl:px-14">
            {/* Top row: Search + Última Leitura */}
            <div className="flex items-center justify-between gap-6 mb-6">
              {/* Search */}
              <div className="flex items-center gap-2 max-w-2xl flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={voice.listening && voice.partial ? voice.partial : query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={mostrarAreas ? 'Buscar área ou livro…' : 'Buscar livro…'}
                    className="pl-11 pr-3 h-12 text-sm rounded-xl bg-card border border-border/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={voice.toggle}
                  aria-label={voice.listening ? 'Parar gravação' : 'Buscar por voz'}
                  className={`relative overflow-hidden shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition ${
                    voice.listening
                      ? 'bg-red-500 text-white animate-pulse shadow-red-500/40'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {voice.listening && (
                    <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                  )}
                  {voice.listening ? (
                    <MicOff className="w-5 h-5 relative z-[2]" strokeWidth={2} />
                  ) : (
                    <Mic className="w-5 h-5 relative z-[2]" strokeWidth={2} />
                  )}
                </button>
              </div>

              {/* Última Leitura */}
              {ultimoLivro && (
                <button
                  onClick={() => setLivroAberto(ultimoLivro as any)}
                  className="group flex items-center gap-3 p-1.5 pr-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/40 transition-all shadow-sm text-left shrink-0"
                >
                  <div className="w-10 h-12 rounded bg-muted overflow-hidden shrink-0">
                    {ultimoLivro.capa ? (
                      <img
                        src={directImg(ultimoLivro.capa, 100)}
                        alt={ultimoLivro.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-primary mb-0.5">
                      Última leitura
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate max-w-[160px] group-hover:text-primary transition-colors">
                      {ultimoLivro.titulo}
                    </span>
                  </div>
                </button>
              )}
            </div>

            {/* Título da seção do acervo */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold mb-1">
                ACERVO
              </p>
              <div className="flex items-center gap-2">
                <span className="w-1 h-6 rounded-full bg-primary" />
                <h2 className="text-2xl font-bold text-foreground">
                  {mostrarAreas ? 'Áreas do Direito' : 'Todos os livros'}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1 ml-3">
                {mostrarAreas
                  ? 'Escolha uma área para ver as obras daquele campo.'
                  : 'Clique em um livro para abrir, favoritar ou começar a leitura.'}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[148px] rounded-2xl bg-muted animate-pulse border border-border"
                  />
                ))}
              </div>
            ) : livros.length === 0 ? (
              <div className="py-16 text-center border rounded-2xl border-dashed">
                <p className="text-sm text-muted-foreground">
                  Nenhum livro ainda nesta coleção.
                </p>
              </div>
            ) : mostrarAreas ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {areas
                  .filter((a) => !query || norm(a.name).includes(norm(query)))
                  .map((a, index) => (
                    <BibliotecaCategoriaAreaCard
                      key={a.name}
                      area={a}
                      index={index}
                      variant="desktop"
                      onClick={() =>
                        navigate(`/bibliotecas/${colecao.id}/${encodeURIComponent(a.name)}`)
                      }
                    />
                  ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {livrosVisiveis.map((l, i) => (
                  <BibliotecaCategoriaLivroCard
                    key={`${colecao.id}-${l.id}`}
                    livro={l}
                    index={i}
                    priority={i < 15}
                    badge={badges.getBadge(colecao.id, colecao.table, l.id)}
                    onClick={() => setLivroAberto(l)}
                  />
                ))}
                {livrosVisiveis.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">
                    Nenhum livro encontrado.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <LivroDetailSheet
        livro={livroAberto}
        open={!!livroAberto}
        onClose={handleCloseLivro}
      />
    </div>
  );
};
