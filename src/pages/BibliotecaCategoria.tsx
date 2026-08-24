import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowLeft, ChevronRight, Mic, MicOff, Bookmark } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import {
  COLECOES,
  findColecao,
  normalizeLivro,
  type LivroNormalizado,
  type ColecaoConfig,
} from '@/lib/bibliotecaColecoes';
import { directImg } from '@/lib/cdnImg';
import { useBibliotecaCapa } from '@/hooks/useBibliotecaAsset';
import { useIsAdmin } from '@/hooks/useVisibleColecoes';
import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';
import BibliotecaAtalhosBar from '@/components/biblioteca/BibliotecaAtalhosBar';
import { getAreaCover } from '@/lib/areasDireitoCovers';
import { useLivroBadges, type LivroBadgeInfo } from '@/hooks/useLivroBadges';

const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Fallback quando não há capa custom mapeada
const FALLBACK_TINTS = [
  'hsla(0, 65%, 45%, 0.85)',
  'hsla(220, 55%, 45%, 0.85)',
  'hsla(150, 45%, 35%, 0.85)',
  'hsla(35, 75%, 45%, 0.85)',
  'hsla(275, 45%, 45%, 0.85)',
  'hsla(195, 55%, 40%, 0.85)',
  'hsla(15, 65%, 45%, 0.85)',
  'hsla(255, 40%, 40%, 0.85)',
  'hsla(90, 40%, 35%, 0.85)',
];
function fallbackTint(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_TINTS[h % FALLBACK_TINTS.length];
}


function useLivrosDaColecao(colecao: ColecaoConfig | undefined) {
  return useQuery({
    queryKey: ['biblioteca-colecao', colecao?.id],
    enabled: !!colecao,
    staleTime: 10 * 60 * 1000,
    // Mantém dados anteriores enquanto revalida — sem skeleton em revisitas.
    placeholderData: (prev) => prev,
    queryFn: async () => {
      if (!colecao) return [] as LivroNormalizado[];
      let q: any = supabase.from(colecao.table as any).select(colecao.select);
      if (colecao.orderBy) q = q.order(colecao.orderBy, { ascending: true, nullsFirst: false });
      q = q.limit(2000);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]).map((r) => normalizeLivro(r, colecao));
    },
  });
}

function LivroCard({ livro, onClick, priority, badge }: { livro: LivroNormalizado; onClick: () => void; priority?: boolean; badge?: LivroBadgeInfo }) {
  const capaUrl = useBibliotecaCapa(livro.capa, 300);
  const pct = badge?.progresso ? Math.round(badge.progresso * 100) : 0;
  const showProgress = !!badge?.progresso && !!badge?.totalPaginas;
  return (
    <button
      onClick={onClick}
      aria-label={`Abrir livro ${livro.titulo}${livro.autor ? ` de ${livro.autor}` : ''}`}
      className="group flex items-stretch gap-3.5 p-3 rounded-2xl bg-card/60 border border-border/60 hover:border-primary/40 hover:bg-secondary/60 transition-colors text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <div className="w-[92px] h-[124px] sm:w-[100px] sm:h-[136px] shrink-0 rounded-lg overflow-hidden bg-muted border border-border shadow-sm">
        {capaUrl ? (
          <img
            src={capaUrl}
            alt={livro.titulo}
            className="w-full h-full object-cover"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            {...(priority ? { fetchpriority: 'high' as any } : {})}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 p-1.5">
            <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight line-clamp-5">
              {livro.titulo}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
        <p className="text-lg sm:text-xl font-normal text-foreground line-clamp-2 sm:line-clamp-3 leading-snug group-hover:text-primary transition-colors break-words">
          {livro.titulo}
        </p>
        {livro.autor && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            {livro.autor}
          </p>
        )}
        {livro.area && (
          <span className="mt-2 self-start text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            {livro.area}
          </span>
        )}

        {(badge?.favorito || showProgress) && (
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {badge?.favorito && (
                <span
                  title="Favorito"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30"
                >
                  <Bookmark className="w-3 h-3 fill-current" />
                  Favorito
                </span>
              )}
              {showProgress && (
                <span
                  title="Progresso na leitura nativa"
                  className="text-[10px] font-semibold text-primary"
                >
                  {pct}% lido
                </span>
              )}
            </div>
            {showProgress && (
              <div
                className="h-1 w-full max-w-[180px] rounded-full bg-muted overflow-hidden"
                aria-label={`Progresso ${pct}% na leitura nativa`}
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            {showProgress && (
              <p className="text-[9px] text-muted-foreground/80 leading-tight">
                * conta apenas via leitura nativa
              </p>
            )}
          </div>
        )}
      </div>
    </button>
  );
}


const BibliotecaCategoria = () => {
  const { colecaoId, areaSlug } = useParams<{ colecaoId: string; areaSlug?: string }>();
  const navigate = useNavigate();
  const colecao = colecaoId ? findColecao(colecaoId) : undefined;
  const isAdmin = useIsAdmin();
  useEffect(() => {
    if (colecao?.adminOnly && !isAdmin) navigate('/bibliotecas', { replace: true });
  }, [colecao, isAdmin, navigate]);
  const { data: livros = [], isLoading } = useLivrosDaColecao(colecao);
  const [query, setQuery] = useState('');
  const [livroAberto, setLivroAberto] = useState<LivroNormalizado | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const livroIdParam = searchParams.get('livro');

  useEffect(() => {
    if (!livroIdParam || livros.length === 0) return;
    const found = livros.find((l) => String(l.id) === livroIdParam);
    if (found) setLivroAberto(found);
  }, [livroIdParam, livros]);

  const handleCloseLivro = () => {
    setLivroAberto(null);
    if (searchParams.get('livro')) {
      const next = new URLSearchParams(searchParams);
      next.delete('livro');
      setSearchParams(next, { replace: true });
    }
  };
  const voice = useVoiceInput((text) => setQuery((prev) => (prev ? prev + ' ' : '') + text));
  const badges = useLivroBadges(colecao?.table);


  const areas = useMemo(() => {
    if (!colecao || colecao.modo !== 'categorias') return [] as { name: string; capa?: string; count: number }[];
    const map = new Map<string, { name: string; capa?: string; count: number }>();
    for (const l of livros) {
      const a = l.area || 'Outros';
      const existing = map.get(a);
      if (existing) existing.count++;
      else map.set(a, { name: a, capa: l.capa || undefined, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [livros, colecao]);

  const areaAtiva = areaSlug ? decodeURIComponent(areaSlug) : null;

  const livrosVisiveis = useMemo(() => {
    let list = livros;
    if (areaAtiva) list = list.filter((l) => (l.area || 'Outros') === areaAtiva);
    const q = norm(query.trim());
    if (q) {
      list = list.filter((l) => norm(`${l.titulo} ${l.autor || ''} ${l.area || ''}`).includes(q));
    }
    return list;
  }, [livros, areaAtiva, query]);

  if (!colecao) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Coleção não encontrada.</p>
      </div>
    );
  }

  // Grid de áreas (só quando modo=categorias e sem área selecionada)
  const mostrarAreas = colecao.modo === 'categorias' && !areaAtiva;

  return (
    <div className="min-h-dvh bg-background pb-[calc(96px+var(--sai-bottom,0px))]">
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
        <img src={colecao.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
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
            {voice.listening && <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />}
            {voice.listening
              ? <MicOff className="w-6 h-6 relative z-[2]" strokeWidth={2.5} />
              : <Mic className="w-6 h-6 relative z-[2]" strokeWidth={2.5} />}
          </button>
        </div>

        {/* Atalhos: Leitura, Favoritos, Recentes, Offline */}
        <div className="-mx-4">
          <BibliotecaAtalhosBar onAbrirLivro={setLivroAberto} />
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
              .map((a, i) => {
                const custom = getAreaCover(a.name);
                const tint = custom?.tint ?? fallbackTint(a.name);
                const coverUrl = custom?.cover ?? (a.capa ? directImg(a.capa, 400) : null);
                return (
                  <button
                    key={a.name}
                    onClick={() => navigate(`/bibliotecas/${colecao.id}/${encodeURIComponent(a.name)}`)}
                    className="group relative flex items-stretch h-[124px] sm:h-[136px] overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm hover:-translate-y-0.5 transition-transform text-left w-full active:scale-[0.985]"
                  >
                    <div className="relative w-[150px] sm:w-[168px] shrink-0 overflow-hidden">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          loading={i < 4 ? 'eager' : 'lazy'}
                          decoding="async"
                          {...(i < 4 ? { fetchpriority: 'high' as any } : {})}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-muted" />
                      )}
                      <div
                        className="absolute inset-0 mix-blend-soft-light opacity-70"
                        style={{ background: `linear-gradient(to top, ${tint}, transparent 70%)` }}
                      />
                      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-card pointer-events-none" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3 bg-card text-foreground">
                      <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-primary/90">
                        ÁREA
                      </p>
                      <h2 className="text-lg sm:text-xl font-bold leading-tight mt-1 line-clamp-2">
                        {a.name}
                      </h2>
                      <p className="text-xs text-muted-foreground leading-tight mt-1">
                        {a.count} {a.count === 1 ? 'livro' : 'livros'}
                      </p>
                    </div>


                    <div className="flex items-center pr-4 text-muted-foreground">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                );
              })}
          </div>


        ) : (
          <div className="flex flex-col gap-2">
            {livrosVisiveis.map((l, i) => (
              <LivroCard
                key={`${colecao.id}-${l.id}`}
                livro={l}
                priority={i < 6}
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

export default BibliotecaCategoria;
