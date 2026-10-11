import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, MicOff } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/navigation/PageHeader';
import { Input } from '@/components/ui/input';
import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';
import BibliotecaAtalhosBar from '@/components/biblioteca/BibliotecaAtalhosBar';
import BibliotecaBottomNav from '@/components/biblioteca/BibliotecaBottomNav';
import { BibliotecaCategoriaLivroCard } from './BibliotecaCategoriaLivroCard';
import { BibliotecaCategoriaAreaCard, type AreaItem } from './BibliotecaCategoriaAreaCard';
import type { ColecaoConfig, LivroNormalizado } from '@/lib/bibliotecaColecoes';

interface BibliotecaCategoriaMobileViewProps {
  colecao: ColecaoConfig;
  areaAtiva: string | null;
  livros: LivroNormalizado[];
  livrosVisiveis: LivroNormalizado[];
  areas: AreaItem[];
  mostrarAreas: boolean;
  isLoading: boolean;
  query: string;
  setQuery: (q: string) => void;
  voice: { listening: boolean; partial?: string; toggle: () => void };
  livroAberto: LivroNormalizado | null;
  setLivroAberto: (l: LivroNormalizado | null) => void;
  handleCloseLivro: () => void;
  badges: any;
  norm: (s: string) => string;
}

export const BibliotecaCategoriaMobileView: React.FC<BibliotecaCategoriaMobileViewProps> = ({
  colecao,
  areaAtiva,
  livros,
  livrosVisiveis,
  areas,
  mostrarAreas,
  isLoading,
  query,
  setQuery,
  voice,
  livroAberto,
  setLivroAberto,
  handleCloseLivro,
  badges,
  norm,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-[calc(24px+var(--sai-bottom,0px))]">
      <PageHeader
        title={areaAtiva || colecao.label}
        subtitle={areaAtiva ? colecao.label : undefined}
        onBack={() => {
          if (areaAtiva) navigate(`/bibliotecas/${colecao.id}`);
          else navigate('/bibliotecas');
        }}
      />

      {/* Hero */}
      <div className={`relative h-32 bg-gradient-to-r ${colecao.gradient} overflow-hidden`}>
        <img
          src={colecao.cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative h-full flex flex-col justify-end px-4 pb-3 text-white">
          <p className="text-[9px] uppercase tracking-[0.22em] font-bold text-white/80">
            {colecao.eyebrow}
          </p>
          <p className="text-xs text-white/85 line-clamp-2 mt-1">{colecao.subtitle}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 pt-4">
        {/* Search */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              value={voice.listening && voice.partial ? voice.partial : query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mostrarAreas ? 'Buscar área ou livro…' : 'Buscar livro…'}
              className="pl-11 pr-3 h-14 text-base rounded-2xl bg-card border border-border/60"
            />
          </div>
          <button
            type="button"
            onClick={voice.toggle}
            aria-label={voice.listening ? 'Parar gravação' : 'Buscar por voz'}
            className={`relative overflow-hidden shrink-0 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-[0.95] transition ${
              voice.listening
                ? 'bg-red-500 text-white animate-pulse shadow-red-500/40'
                : 'bg-primary text-primary-foreground shadow-primary/30'
            }`}
          >
            {voice.listening && (
              <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
            )}
            {voice.listening ? (
              <MicOff className="w-6 h-6 relative z-[2]" strokeWidth={2.5} />
            ) : (
              <Mic className="w-6 h-6 relative z-[2]" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Atalhos: Leitura, Favoritos, Recentes, Offline */}
        <div className="-mx-4">
          <BibliotecaAtalhosBar
            onAbrirLivro={setLivroAberto}
            filtroArea={areaAtiva ?? null}
          />
        </div>

        {/* Título da seção do acervo */}
        <div className="mt-2 mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold">
            ACERVO
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1 h-6 rounded-full bg-primary" />
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
              {mostrarAreas ? 'Áreas do Direito' : 'Todos os livros'}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-3">
            {mostrarAreas
              ? 'Escolha uma área para ver as obras daquele campo.'
              : 'Toque em um livro para abrir, favoritar ou começar a leitura.'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[104px] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : livros.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum livro ainda nesta coleção.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Rode a importação em Admin → Atualização para popular o acervo.
            </p>
          </div>
        ) : mostrarAreas ? (
          <div className="flex flex-col gap-2">
            {areas
              .filter((a) => !query || norm(a.name).includes(norm(query)))
              .map((a, index) => (
                <BibliotecaCategoriaAreaCard
                  key={a.name}
                  area={a}
                  index={index}
                  variant="mobile"
                  onClick={() =>
                    navigate(`/bibliotecas/${colecao.id}/${encodeURIComponent(a.name)}`)
                  }
                />
              ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {livrosVisiveis.map((l, i) => (
              <BibliotecaCategoriaLivroCard
                key={`${colecao.id}-${l.id}`}
                livro={l}
                index={i}
                priority={i < 12}
                badge={badges.getBadge(colecao.id, colecao.table, l.id)}
                onClick={() => setLivroAberto(l)}
              />
            ))}
            {livrosVisiveis.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum livro encontrado.
              </p>
            )}
          </div>
        )}
      </div>

      <LivroDetailSheet
        livro={livroAberto}
        open={!!livroAberto}
        onClose={handleCloseLivro}
      />
    </div>
  );
};
