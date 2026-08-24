import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { COLECOES, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { useVisibleColecoes } from '@/hooks/useVisibleColecoes';
import { supabase } from '@/integrations/supabase/client';
import { startCapasPrefetch } from '@/services/bibliotecaCapasPrefetch';
import { startLeituraNativaPrefetch } from '@/services/leituraNativaPrefetch';
import { setPersistedColecao } from '@/services/offlineDb';
import BibliotecaAtalhosBar from '@/components/biblioteca/BibliotecaAtalhosBar';
import BibliotecaSearchBar from '@/components/biblioteca/BibliotecaSearchBar';
import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';
import FilosofosPanel from '@/components/biblioteca/FilosofosPanel';
import RecomendacoesCarousel from '@/components/biblioteca/RecomendacoesCarousel';
import ContinuarLeituraCarousel from '@/components/biblioteca/ContinuarLeituraCarousel';
import { useIsDesktop } from '@/hooks/use-desktop';
import { track } from '@/lib/analyticsEvents';

const BibliotecasDesktop = lazy(() => import('./BibliotecasDesktop'));

const Bibliotecas = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [livroAberto, setLivroAberto] = useState<LivroNormalizado | null>(null);
  const isDesktop = useIsDesktop();
  const colecoesVisiveis = useVisibleColecoes();

  useEffect(() => {
    // Hidrata React Query com o cache persistente — abre carrosséis mesmo offline.
    (async () => {
      const { getPersistedColecao } = await import('@/services/offlineDb');
      await Promise.all(
        COLECOES.map(async (colecao) => {
          const cached = await getPersistedColecao<LivroNormalizado>(colecao.id);
          if (cached && cached.length) {
            const existing = queryClient.getQueryData(['biblioteca-colecao', colecao.id]);
            if (!existing) queryClient.setQueryData(['biblioteca-colecao', colecao.id], cached);
          }
        }),
      );
    })().catch(() => {});

    // Prefetch das listas + aquecimento de capas em idle — clique = instantâneo.
    const prefetchColecoes = async () => {
      await Promise.all(
        COLECOES.map((colecao) =>
          queryClient
            .prefetchQuery({
              queryKey: ['biblioteca-colecao', colecao.id],
              staleTime: 10 * 60 * 1000,
              queryFn: async () => {
                let q: any = supabase.from(colecao.table as any).select(colecao.select);
                if (colecao.orderBy) q = q.order(colecao.orderBy, { ascending: true, nullsFirst: false });
                q = q.limit(2000);
                const { data, error } = await q;
                if (error) throw error;
                const list = (data as any[]).map((r) => normalizeLivro(r, colecao));
                setPersistedColecao(colecao.id, list).catch(() => {});
                return list;
              },
            })
            .catch(() => {})
        )
      );
      // Aquece as primeiras capas de cada coleção no cache do browser/SW.
      if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
      const { directImg } = await import('@/lib/cdnImg');
      COLECOES.forEach((colecao) => {
        const list = queryClient.getQueryData<LivroNormalizado[]>(['biblioteca-colecao', colecao.id]) || [];
        list.slice(0, 12).forEach((l) => {
          if (!l.capa) return;
          const img = new Image();
          img.decoding = 'async';
          (img as any).fetchPriority = 'low';
          img.src = directImg(l.capa, 300);
        });
      });
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetchColecoes, { timeout: 2000 });
    } else {
      setTimeout(prefetchColecoes, 300);
    }

    if (!Capacitor.isNativePlatform()) return;
    // Capas: qualquer rede — usuário quer instantâneo offline.
    startCapasPrefetch({ wifiOnly: false }).catch(() => {});
    startLeituraNativaPrefetch({ wifiOnly: true }).catch(() => {});
  }, [queryClient]);

  if (isDesktop) {
    return (
      <Suspense fallback={<div className="min-h-dvh bg-background" />}>
        <BibliotecasDesktop />
      </Suspense>
    );
  }

  return (
    <main className="min-h-dvh bg-background pb-[calc(96px+var(--sai-bottom,0px))]">
      <PageHeader
        title="Biblioteca"
        onBack={() => navigate('/')}
      />

      <div className="max-w-3xl mx-auto w-full">
        {/* Painel marrom flush com o header, com a busca dentro */}
        <FilosofosPanel>
          <div className="[&>div]:!px-0 [&>div]:!mb-0">
            <BibliotecaSearchBar onAbrirLivro={(l) => setLivroAberto(l)} />
          </div>
        </FilosofosPanel>

        <div className="px-4 mt-5 mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold">
            COLEÇÕES
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1 h-6 rounded-full bg-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
              Escolha uma coleção
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-3 truncate max-w-[80%]">
            Navegue pelas categorias do acervo ou busque diretamente.
          </p>
        </div>

        <BibliotecaAtalhosBar onAbrirLivro={(l) => setLivroAberto(l)} />


        <div className="mt-8">
          <RecomendacoesCarousel onAbrirLivro={(l) => setLivroAberto(l)} />
        </div>

        <div className="px-4 mt-8 mb-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold">
            ACERVO
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1 h-6 rounded-full bg-primary" />
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              Acervos de livros
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-3 truncate max-w-[80%]">
            Explore as coleções completas por área, autor e temática.
          </p>
        </div>

        <div className="px-4 flex flex-col gap-2">
          {colecoesVisiveis.map((c, i) => (
            <motion.button
              key={c.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              onClick={() => { track('biblioteca_colecao_opened', { colecao_id: c.id, colecao_label: c.label }); navigate(`/bibliotecas/${c.id}`); }}
              data-track="biblioteca_colecao_click"
              data-colecao-id={c.id}
              data-colecao-label={c.label}
              className="group relative flex items-stretch h-[104px] overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm hover:-translate-y-0.5 transition-transform text-left w-full active:scale-[0.985]"
            >
              <div className="relative w-[140px] shrink-0 overflow-hidden">
                <img
                  src={c.cover}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={i < 2 ? undefined : 'lazy'}
                />
                {/* Fade suave para o card, sem tingir a capa */}
                <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-card pointer-events-none" />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3 bg-card text-foreground">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-primary/90">
                  {c.eyebrow}
                </p>
                <h2 className="text-lg sm:text-xl font-bold leading-tight mt-0.5 truncate">
                  {c.label}
                </h2>
                <p className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-2">
                  {c.subtitle}
                </p>

              </div>

              <div className="flex items-center pr-4 text-muted-foreground">
                <ChevronRight className="w-5 h-5" />
              </div>

              {/* Reflexo cascata ao entrar na biblioteca */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent mix-blend-screen"
                initial={{ x: '-40%', opacity: 0 }}
                animate={{ x: '420%', opacity: [0, 1, 1, 0] }}
                transition={{
                  delay: 0.25 + i * 0.18,
                  duration: 1.1,
                  ease: 'easeInOut',
                  times: [0, 0.15, 0.85, 1],
                }}
              />
            </motion.button>
          ))}
        </div>
      </div>

      <LivroDetailSheet
        livro={livroAberto}
        open={!!livroAberto}
        onClose={() => setLivroAberto(null)}
      />
    </main>
  );
};

export default Bibliotecas;
