import React, { useState, useEffect, useMemo } from 'react';
import { Play, Sparkles, Headphones, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { useSpotifyAudioStore } from '@/stores/useSpotifyAudioStore';
import { fetchLeisDisponiveisComAudio, type LeiNarracaoItem } from '@/services/narracaoArtigosSyncService';
import { getLeiCover, getLeiColor } from '@/lib/leiTheme';
import { Badge } from '@/components/ui/badge';

interface SpotifyExplorarTabProps {
  onSelectLei: (lei: { id: string; nome: string; slug: string; categoria?: string }) => void;
}

type CategoryFilter = 'todos' | 'codigos' | 'estatutos' | 'constituicao' | 'especiais';

const DEFAULT_LEIS_INITIAL: LeiNarracaoItem[] = [
  {
    id: 'cf9e9292-4fe0-4b23-ae89-611edbb92503',
    slug: 'cp',
    nome: 'Código Penal',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 361,
    totalComAudio: 10,
    totalPendentes: 351,
    percentual: 3,
  },
  {
    id: '246e8691-ebe2-478d-991d-f3930635151a',
    slug: 'cpp',
    nome: 'Código de Processo Penal',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 810,
    totalComAudio: 1,
    totalPendentes: 809,
    percentual: 1,
  },
];

export const SpotifyExplorarTab: React.FC<SpotifyExplorarTabProps> = ({ onSelectLei }) => {
  const { audioMode, playTrack } = useSpotifyAudioStore();
  const [leis, setLeis] = useState<LeiNarracaoItem[]>(DEFAULT_LEIS_INITIAL);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('todos');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await fetchLeisDisponiveisComAudio(audioMode);
        if (isMounted && data.length > 0) {
          setLeis(data);
        }
      } catch (err) {
        console.warn('[SpotifyExplorarTab] Erro ao carregar leis com áudio:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [audioMode]);

  // Filtragem por Categoria
  const filteredLeis = useMemo(() => {
    return leis.filter((lei) => {
      if (activeCategory === 'todos') return true;
      if (activeCategory === 'codigos') return lei.categoriaFormatada === 'Códigos';
      if (activeCategory === 'estatutos') return lei.categoriaFormatada === 'Estatutos';
      if (activeCategory === 'constituicao') return lei.categoriaFormatada === 'Constituição';
      if (activeCategory === 'especiais')
        return (
          lei.categoriaFormatada === 'Leis Ordinárias' ||
          lei.categoria === 'lei-especial' ||
          lei.categoriaFormatada === 'Geral'
        );
      return true;
    });
  }, [leis, activeCategory]);

  // Lei em Destaque no Hero (Código Penal ou Código de Processo Penal)
  const heroLei = useMemo(() => {
    return (
      leis.find((l) => l.slug === 'cp' || l.slug === 'cpp') ||
      leis[0] ||
      null
    );
  }, [leis]);

  return (
    <div className="space-y-6">
      {/* Hero Banner Especial Estilo Spotify */}
      {heroLei && (
        <div
          onClick={() =>
            onSelectLei({
              id: heroLei.id,
              nome: heroLei.nome,
              slug: heroLei.slug,
              categoria: heroLei.categoriaFormatada,
            })
          }
          className="relative overflow-hidden rounded-3xl p-5 sm:p-7 border border-white/10 shadow-2xl cursor-pointer group transition-all hover:border-white/20"
          style={{
            background: `linear-gradient(135deg, ${getLeiColor(heroLei.slug)}40 0%, rgba(15,23,42,0.95) 100%)`,
          }}
        >
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-zinc-900 shrink-0 group-hover:scale-105 transition-transform">
              <img
                src={getLeiCover(heroLei.slug)}
                alt={heroLei.nome}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl">
                  <Play className="w-5 h-5 fill-black ml-0.5" />
                </div>
              </div>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full inline-block">
                ★ Álbum Mais Tocado
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                {heroLei.nome}
              </h2>
              <p className="text-xs text-zinc-300 font-normal leading-relaxed line-clamp-2 max-w-xl">
                {audioMode === 'aulas'
                  ? 'Aulas e explicações artigo por artigo com conceitos doutrinários e exemplos práticos da advocacia.'
                  : 'Narrações oficiais com voz humana em estúdio de todos os artigos do Código Penal compilado.'}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Abrir Álbum
                </span>
                <span className="text-[11px] text-zinc-400">
                  {heroLei.totalComAudio > 0
                    ? `${heroLei.totalComAudio} áudios prontos`
                    : `${heroLei.totalArtigos} artigos`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros em Pílulas Estilo Spotify */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'codigos', label: 'Códigos' },
          { id: 'estatutos', label: 'Estatutos' },
          { id: 'constituicao', label: 'Constituição' },
          { id: 'especiais', label: 'Leis Especiais' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id as CategoryFilter)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
              activeCategory === cat.id
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-zinc-900/80 text-zinc-300 border-white/10 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Álbuns (Leis) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Catálogo de Legislações ({filteredLeis.length})
          </h3>
          <span className="text-[11px] text-zinc-500 font-medium">Toque para ouvir</span>
        </div>

        {filteredLeis.length === 0 ? (
          <div className="py-16 text-center space-y-2 bg-zinc-900/40 rounded-3xl border border-white/5 p-6">
            <Headphones className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-zinc-300">
              {audioMode === 'aulas' ? 'Nenhuma áudio-aula nesta categoria' : 'Nenhuma narração nesta categoria'}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Novas gravações em áudio estão sendo produzidas em estúdio e serão adicionadas automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredLeis.map((lei) => {
              const cover = getLeiCover(lei.slug || lei.id);
              return (
                <div
                  key={lei.id}
                  onClick={() =>
                    onSelectLei({
                      id: lei.id,
                      nome: lei.nome,
                      slug: lei.slug,
                      categoria: lei.categoriaFormatada,
                    })
                  }
                  className="group relative bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-white/15 rounded-2xl p-3 flex flex-col justify-between transition-all cursor-pointer shadow-lg hover:shadow-2xl active:scale-[0.98]"
                >
                  {/* Capa com Botão Play Flutuante */}
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5 bg-zinc-950 shadow-md">
                    <img
                      src={cover}
                      alt={lei.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Botão Play estilo Spotify que surge no hover */}
                    <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-95">
                        <Play className="w-4 h-4 fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Informações da Lei */}
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                      {lei.nome}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="truncate">{lei.categoriaFormatada}</span>
                      {lei.totalComAudio > 0 ? (
                        <span className="text-emerald-400 font-bold shrink-0 text-[10px]">
                          {lei.totalComAudio} áudios
                        </span>
                      ) : (
                        <span className="text-zinc-500 shrink-0 text-[10px]">
                          {lei.totalArtigos} arts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
