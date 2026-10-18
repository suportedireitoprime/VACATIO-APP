import React, { useState, useEffect, useMemo } from 'react';
import { Play, Headphones, BookOpen, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSpotifyAudioStore } from '@/stores/useSpotifyAudioStore';
import {
  fetchLeisDisponiveisComAudio,
  CATALOGO_OFICIAL_AUDIO_LEIS,
  type LeiNarracaoItem,
} from '@/services/narracaoArtigosSyncService';
import { getLeiCover, getLeiColor } from '@/lib/leiTheme';
import { SpotifyRecentTracks } from './SpotifyRecentTracks';

export type CategoryFilter = 'todos' | 'constituicao' | 'codigos' | 'estatutos' | 'especiais';

interface SpotifyExplorarTabProps {
  onSelectLei: (lei: { id: string; nome: string; slug: string; categoria?: string }) => void;
  activeCategory?: CategoryFilter;
  onSelectCategory?: (cat: CategoryFilter) => void;
}

export const SpotifyExplorarTab: React.FC<SpotifyExplorarTabProps> = ({
  onSelectLei,
  activeCategory = 'todos',
}) => {
  const { audioMode } = useSpotifyAudioStore();
  // Inicialização 100% instantânea (0ms) com o catálogo oficial completo de 31 legislações
  const [leis, setLeis] = useState<LeiNarracaoItem[]>(CATALOGO_OFICIAL_AUDIO_LEIS);

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

  // Filtragem por Categoria resiliente e à prova de falhas
  const filteredLeis = useMemo(() => {
    return leis.filter((lei) => {
      if (!lei) return false;
      const cat = (lei.categoria || '').toLowerCase();
      const catFmt = (lei.categoriaFormatada || '').toLowerCase();
      const slug = (lei.slug || '').toLowerCase();
      const nome = (lei.nome || '').toLowerCase();

      if (activeCategory === 'todos') return true;
      if (activeCategory === 'codigos') {
        return cat === 'codigo' || catFmt.includes('código') || catFmt.includes('codigo') || nome.includes('código');
      }
      if (activeCategory === 'estatutos') {
        return (
          cat === 'estatuto' ||
          catFmt.includes('estatuto') ||
          nome.includes('estatuto') ||
          slug.startsWith('estatuto-') ||
          slug === 'lei-servidor' ||
          slug === 'eggm' ||
          slug === 'emot'
        );
      }
      if (activeCategory === 'constituicao') {
        return slug === 'cf' || slug === 'cf88' || catFmt.includes('constitui') || nome.includes('constitui');
      }
      if (activeCategory === 'especiais') {
        return cat === 'lei-especial' || catFmt.includes('ordinária') || catFmt.includes('geral');
      }
      return true;
    });
  }, [leis, activeCategory]);

  return (
    <div className="space-y-8">
      {/* Seção Tocados Recentemente (Aparece se houver histórico) */}
      <SpotifyRecentTracks />

      {/* Seção de Legislações */}
      <section>
        <div className="mb-6">
          <h2 className="text-[22px] font-black text-white uppercase tracking-widest">
            Catálogo de Legislação
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400 line-clamp-1">
            Narrações completas artigo por artigo gravadas em estúdio com voz humana.
          </p>
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
                    className="absolute inset-0 w-full h-full object-cover object-right transition-transform duration-500 group-hover:scale-105 origin-right"
                    loading="lazy"
                  />
                  {/* Degradê apenas de baixo para cima para destacar o texto sem escurecer o restante da capa */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 via-30% to-transparent to-60%" />
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
