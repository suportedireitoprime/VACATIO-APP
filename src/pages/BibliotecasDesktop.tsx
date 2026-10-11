import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';

import { type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { scheduleWarmBiblioteca } from '@/services/bibliotecaWarmup';
import { useVisibleColecoes } from '@/hooks/useVisibleColecoes';

import DesktopOnboardingOverlay from '@/components/desktop/DesktopOnboardingOverlay';
import DesktopSidebar from '@/components/vademecum/desktop/DesktopSidebar';
import DesktopBibliotecaHero from '@/components/desktop/DesktopBibliotecaHero';
import DesktopBibliotecaGrid from '@/components/desktop/DesktopBibliotecaGrid';
import ContinuarLeituraCarousel from '@/components/biblioteca/ContinuarLeituraCarousel';
import RecomendacoesCarousel from '@/components/biblioteca/RecomendacoesCarousel';
import BibliotecaAtalhosBar from '@/components/biblioteca/BibliotecaAtalhosBar';
import { DesktopBibliotecaTabsBar, DESKTOP_TABS } from '@/components/desktop/DesktopBibliotecaTabsBar';
import { DesktopBibliotecaModals } from '@/components/desktop/DesktopBibliotecaModals';
import { DesktopColecaoCard } from '@/components/desktop/DesktopColecaoCard';

const BibliotecasDesktop = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [livroAberto, setLivroAberto] = useState<LivroNormalizado | null>(null);
  const colecoesVisiveis = useVisibleColecoes();
  const acervoRef = useRef<HTMLDivElement>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [assistenteOpen, setAssistenteOpen] = useState(false);

  useEffect(() => scheduleWarmBiblioteca(queryClient), [queryClient]);

  const scrollToAcervo = useCallback(() => {
    if (acervoRef.current) {
      acervoRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleTabChange = useCallback((t: string) => {
    const tab = DESKTOP_TABS.find((x) => x.id === t);
    if (tab) navigate(tab.path);
  }, [navigate]);

  return (
    <div className="h-[calc(100dvh-104px)] bg-background flex flex-col">
      <DesktopOnboardingOverlay />

      <div className="flex flex-1 min-h-0">
        <DesktopSidebar activeTab="biblioteca" onTabChange={handleTabChange} />

        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden relative contain-content overscroll-contain">
          <DesktopBibliotecaTabsBar />

          <AnimatePresence mode="wait">
            <motion.div
              key="biblioteca-desktop"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="px-8 py-6 2xl:px-14"
            >
              <div className="mb-6 -mx-8 -mt-6 2xl:-mx-14">
                <DesktopBibliotecaHero onSearchClick={() => setSearchOpen(true)} />
              </div>

              <div className="mb-8">
                <DesktopBibliotecaGrid
                  onScrollToAcervo={scrollToAcervo}
                  onUploadPdf={() => {}}
                />
              </div>

              <div className="mb-10 space-y-6">
                <ContinuarLeituraCarousel onAbrirLivro={setLivroAberto} />
                <RecomendacoesCarousel onAbrirLivro={setLivroAberto} />
              </div>

              <section className="pb-16" ref={acervoRef}>
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold">
                      Acervo
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-1 h-7 rounded-full bg-primary" />
                      <h2 className="font-display text-2xl text-foreground leading-tight">
                        Explore todas as coleções
                      </h2>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground hidden md:block">
                    {colecoesVisiveis.length} coleções
                  </p>
                </div>

                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                  }}
                  initial="hidden"
                  animate="show"
                >
                  {colecoesVisiveis.map((c) => (
                    <DesktopColecaoCard
                      key={c.id}
                      c={c}
                      onClick={() => navigate(`/bibliotecas/${c.id}`)}
                    />
                  ))}
                </motion.div>
              </section>
            </motion.div>
          </AnimatePresence>
        </div>

        <DesktopBibliotecaModals
          searchOpen={searchOpen}
          onCloseSearch={() => setSearchOpen(false)}
          assistenteOpen={assistenteOpen}
          onCloseAssistente={() => setAssistenteOpen(false)}
          livroAberto={livroAberto}
          onCloseLivro={() => setLivroAberto(null)}
        />
      </div>

      <BibliotecaAtalhosBar onAbrirLivro={setLivroAberto} />
    </div>
  );
};

export default BibliotecasDesktop;