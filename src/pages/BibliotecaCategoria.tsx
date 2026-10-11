import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { findColecao, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { useIsAdmin } from '@/hooks/useVisibleColecoes';
import { useLivroBadges } from '@/hooks/useLivroBadges';
import { getRecentes, subscribeTracking, type LivroSnapshot } from '@/lib/bibliotecaTracking';
import { useTrackArea } from "@/hooks/useTrackArea";
import { useIsDesktop } from '@/hooks/use-desktop';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useLivrosDaColecao } from '@/components/biblioteca/categoria/useLivrosDaColecao';
import { BibliotecaCategoriaDesktopView } from '@/components/biblioteca/categoria/BibliotecaCategoriaDesktopView';
import { BibliotecaCategoriaMobileView } from '@/components/biblioteca/categoria/BibliotecaCategoriaMobileView';

const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const BibliotecaCategoria = () => {
  useTrackArea("biblioteca_categoria_aberta");
  const isDesktop = useIsDesktop();
  const { colecaoId, areaSlug } = useParams<{ colecaoId: string; areaSlug?: string }>();
  const navigate = useNavigate();
  const colecao = colecaoId ? findColecao(colecaoId) : undefined;
  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (colecao?.adminOnly && !isAdmin) navigate('/bibliotecas', { replace: true });
  }, [colecao, isAdmin, navigate]);

  const [recentes, setRecentes] = useState<LivroSnapshot[]>(() => getRecentes());
  useEffect(() => subscribeTracking(() => setRecentes(getRecentes())), []);
  const ultimoLivro = recentes.length > 0 ? recentes[0] : null;

  // SEO & Título dinâmico por Coleção / Área
  useEffect(() => {
    const nomeColecao = colecao?.label || 'Acervo';
    document.title = areaSlug
      ? `${decodeURIComponent(areaSlug)} - ${nomeColecao} | Vade Mecum PRIME`
      : `${nomeColecao} | Vade Mecum PRIME`;
  }, [colecao, areaSlug]);

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

  const mostrarAreas = colecao.modo === 'categorias' && !areaAtiva;

  if (isDesktop) {
    return (
      <BibliotecaCategoriaDesktopView
        colecao={colecao}
        livros={livros}
        livrosVisiveis={livrosVisiveis}
        areas={areas}
        mostrarAreas={mostrarAreas}
        isLoading={isLoading}
        query={query}
        setQuery={setQuery}
        voice={voice}
        ultimoLivro={ultimoLivro}
        livroAberto={livroAberto}
        setLivroAberto={setLivroAberto}
        handleCloseLivro={handleCloseLivro}
        badges={badges}
        norm={norm}
      />
    );
  }

  return (
    <BibliotecaCategoriaMobileView
      colecao={colecao}
      areaAtiva={areaAtiva}
      livros={livros}
      livrosVisiveis={livrosVisiveis}
      areas={areas}
      mostrarAreas={mostrarAreas}
      isLoading={isLoading}
      query={query}
      setQuery={setQuery}
      voice={voice}
      livroAberto={livroAberto}
      setLivroAberto={setLivroAberto}
      handleCloseLivro={handleCloseLivro}
      badges={badges}
      norm={norm}
    />
  );
};

export default BibliotecaCategoria;

