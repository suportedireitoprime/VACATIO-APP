import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { COLECOES, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { useVisibleColecoes } from '@/hooks/useVisibleColecoes';
import { supabase } from '@/integrations/supabase/client';
import BibliotecaSearchBar from '@/components/biblioteca/BibliotecaSearchBar';
import BibliotecaAtalhosBar from '@/components/biblioteca/BibliotecaAtalhosBar';
import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';
import FilosofosPanel from '@/components/biblioteca/FilosofosPanel';
import RecomendacoesCarousel from '@/components/biblioteca/RecomendacoesCarousel';
import ContinuarLeituraCarousel from '@/components/biblioteca/ContinuarLeituraCarousel';

/**
 * Desktop-native Biblioteca layout. Not a shrunk-down mobile screen: it uses
 * DesktopTopHeader + breadcrumb, a wide 12-col content area, and a
 * multi-column collections grid so the wide side margins are actually put to
 * work (matches the density of Amazon Kindle / Apple Books / Google Play
 * Livros catalog pages).
 */
const BibliotecasDesktop = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [livroAberto, setLivroAberto] = useState<LivroNormalizado | null>(null);
  const colecoesVisiveis = useVisibleColecoes();

  useEffect(() => {
    const prefetch = async () => {
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
                return (data as any[]).map((r) => normalizeLivro(r, colecao));
              },
            })
            .catch(() => {})
        )
      );
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetch, { timeout: 2000 });
    } else {
      setTimeout(prefetch, 300);
    }
  }, [queryClient]);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Global header/breadcrumb já é renderizado por GlobalDesktopHeader
          no App shell — não duplicar aqui. */}
      <main className="flex-1 min-w-0">
        {/* Hero panel: filósofos à esquerda ocupando ~60%, painel de destaque
            à direita com CTA de busca — em vez de empilhar tudo em 1 coluna
            estreita como no mobile. */}
        <section className="max-w-[1400px] mx-auto w-full px-8 pt-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 rounded-3xl overflow-hidden">
              <FilosofosPanel>
                <div className="[&>div]:!px-0 [&>div]:!mb-0">
                  <BibliotecaSearchBar onAbrirLivro={(l) => setLivroAberto(l)} />
                </div>
              </FilosofosPanel>
            </div>
            <aside className="col-span-12 lg:col-span-4 hidden lg:flex flex-col justify-between rounded-3xl border border-border/50 bg-card p-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold">
                  Biblioteca
                </p>
                <h1 className="font-display text-3xl leading-tight mt-2 text-foreground">
                  Todo o acervo jurídico, num só lugar.
                </h1>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  Clássicos, doutrina, súmulas comentadas e conteúdo próprio.
                  Continue de onde parou ou explore por coleção.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-secondary/40 px-3 py-2">
                  <div className="text-xl font-bold text-foreground">{colecoesVisiveis.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">coleções</div>
                </div>
                <div className="rounded-xl bg-secondary/40 px-3 py-2">
                  <div className="text-xl font-bold text-foreground">2k+</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">livros</div>
                </div>
                <div className="rounded-xl bg-secondary/40 px-3 py-2">
                  <div className="text-xl font-bold text-foreground">24/7</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">offline</div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="max-w-[1400px] mx-auto w-full px-8 mt-8">
          <BibliotecaAtalhosBar onAbrirLivro={(l) => setLivroAberto(l)} />
        </section>


        <section className="max-w-[1400px] mx-auto w-full px-8 mt-10">
          <RecomendacoesCarousel onAbrirLivro={(l) => setLivroAberto(l)} />
        </section>

        <section className="max-w-[1400px] mx-auto w-full px-8 mt-12 mb-16">
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
              {colecoesVisiveis.length} coleções · atualizadas continuamente
            </p>
          </div>

          {/* Grid multi-coluna estilo bento — capa larga à esquerda, meta à
              direita, altura fixa; se aproveita das margens laterais do
              desktop em vez de empilhar cards estreitos. */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {colecoesVisiveis.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/bibliotecas/${c.id}`)}
                className="group relative flex items-stretch h-[140px] overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40 transition-all text-left"
              >
                <div className="relative w-[160px] shrink-0 overflow-hidden">
                  <img
                    src={c.cover}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-card pointer-events-none" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center px-5 py-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-primary/90">
                    {c.eyebrow}
                  </p>
                  <h3 className="text-lg font-bold leading-tight mt-1 text-foreground truncate">
                    {c.label}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-snug mt-1.5 line-clamp-2">
                    {c.subtitle}
                  </p>
                </div>
                <div className="flex items-center pr-4 text-muted-foreground group-hover:text-primary transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <LivroDetailSheet
        livro={livroAberto}
        open={!!livroAberto}
        onClose={() => setLivroAberto(null)}
      />
    </div>
  );
};

export default BibliotecasDesktop;