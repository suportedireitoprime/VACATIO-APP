import React, { useState, useEffect, useMemo } from 'react';
import { Play, Headphones, BookOpen, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSpotifyAudioStore } from '@/stores/useSpotifyAudioStore';
import { fetchLeisDisponiveisComAudio, type LeiNarracaoItem } from '@/services/narracaoArtigosSyncService';
import { getLeiCover, getLeiColor } from '@/lib/leiTheme';
import { SpotifyRecentTracks } from './SpotifyRecentTracks';

interface SpotifyExplorarTabProps {
  onSelectLei: (lei: { id: string; nome: string; slug: string; categoria?: string }) => void;
}

type CategoryFilter = 'todos' | 'codigos' | 'estatutos' | 'constituicao' | 'especiais';

const DEFAULT_LEIS_INITIAL: LeiNarracaoItem[] = [
  {
    id: '246e8691-ebe2-478d-991d-f3930635151a',
    slug: 'cpp',
    nome: 'Código de Processo Penal',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 810,
    totalComAudio: 779,
    totalPendentes: 31,
    percentual: 96,
  },
  {
    id: 'cf9e9292-4fe0-4b23-ae89-611edbb92503',
    slug: 'cp',
    nome: 'Código Penal',
    categoria: 'codigo',
    categoriaFormatada: 'Códigos',
    totalArtigos: 361,
    totalComAudio: 144,
    totalPendentes: 217,
    percentual: 40,
  },
  {
    id: '2986d542-bf86-4c70-b30f-8e16684db5ab',
    slug: 'estatuto-oab',
    nome: 'Estatuto da OAB',
    categoria: 'estatuto',
    categoriaFormatada: 'Estatutos',
    totalArtigos: 87,
    totalComAudio: 99,
    totalPendentes: 0,
    percentual: 100,
  },
];

export const SpotifyExplorarTab: React.FC<SpotifyExplorarTabProps> = ({ onSelectLei }) => {
  const { audioMode } = useSpotifyAudioStore();
  const [leis, setLeis] = useState<LeiNarracaoItem[]>(DEFAULT_LEIS_INITIAL);
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

  return (
    <div className="space-y-8">
      {/* Seção Tocados Recentemente (Aparece se houver histórico) */}
      <SpotifyRecentTracks />

      {/* Seção de Legislações — Idêntica a Áudio Aulas */}
      <section>
        <div className="mb-6">
          <h2 className="text-[22px] font-black text-white uppercase tracking-widest">
            Catálogo de Legislação
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400 line-clamp-1">
            Narrações completas artigo por artigo gravadas em estúdio com voz humana.
          </p>
        </div>

        {/* Filtros em Pílulas Estilo Audio Aulas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
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
                  ? 'bg-primary text-primary-foreground border-primary/40 shadow-md shadow-primary/25'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {filteredLeis.length === 0 ? (
          <div className="py-16 text-center space-y-2 bg-white/[0.02] rounded-3xl border border-white/5 p-6">
            <Headphones className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-zinc-300">
              {audioMode === 'aulas' ? 'Nenhuma áudio-aula nesta categoria' : 'Nenhuma narração nesta categoria'}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Novas gravações em áudio estão sendo produzidas em estúdio e serão adicionadas automaticamente.
            </p>
          </div>
        ) : (
          /* Grade de Cards Idêntica ao AudioaulasGridAreas */
          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
          >
            {filteredLeis.map((lei, i) => {
              if (!lei || !lei.id) return null;
              const cover = getLeiCover(lei.slug || lei.id);
              const totalAudios = typeof lei.totalComAudio === 'number' ? lei.totalComAudio : 0;
              const totalArts = typeof lei.totalArtigos === 'number' ? lei.totalArtigos : 0;
              return (
                <motion.button
                  key={lei.id || `lei-${i}`}
                  variants={{
                    hidden: { opacity: 0, scale: 0.95, y: 0 },
                    show: {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: { type: 'spring', stiffness: 300, damping: 24 },
                    },
                  }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.97 }}
                  animate={{
                    y: [0, -8, 0],
                    transition: {
                      duration: 4 + (i % 3),
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.2,
                    },
                  }}
                  onClick={() =>
                    onSelectLei({
                      id: lei.id,
                      nome: lei.nome,
                      slug: lei.slug,
                      categoria: lei.categoriaFormatada,
                    })
                  }
                  className="group relative aspect-square rounded-2xl overflow-hidden text-left transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/20 border border-white/10 focus-visible:outline-none"
                >
                  <img
                    src={cover}
                    alt={lei.nome}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                  <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                    <span className="self-start h-9 w-9 grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-black/40">
                      <Headphones className="h-5 w-5" />
                    </span>
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0 pr-1">
                        <p className="font-bold leading-tight text-white text-sm sm:text-base line-clamp-2">
                          {lei.nome}
                        </p>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          {totalAudios > 0
                            ? `${totalAudios} áudio(s)`
                            : `${totalArts} artigos`}
                        </p>
                      </div>
                      <span className="shrink-0 h-8 w-8 grid place-items-center rounded-full bg-white/20 text-white backdrop-blur group-hover:bg-primary group-hover:text-primary-foreground transition">
                        <ChevronRight className="h-5 w-5" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default SpotifyExplorarTab;
