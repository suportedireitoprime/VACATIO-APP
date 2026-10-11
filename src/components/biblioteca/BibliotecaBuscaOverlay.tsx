import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Search, X, BookOpen, Mic, MicOff, Library } from 'lucide-react';
import { PrimeBottomSheet } from '@/components/vademecum/overlays/PrimeBottomSheet';
import { withBundleFallback, bundle } from '@/services/offlineBundle';
import { supabase } from '@/integrations/supabase/client';
import { COLECOES, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { useVisibleColecoes } from '@/hooks/useVisibleColecoes';
import { directImg } from '@/lib/cdnImg';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { getFavoritos, type LivroSnapshot } from '@/lib/bibliotecaTracking';
import { setPersistedColecao, getPersistedColecao } from '@/services/offlineDb';

type Modo = string; // 'todos' ou id de coleção

interface Props {
  open: boolean;
  onClose: () => void;
  onAbrirLivro: (livro: LivroNormalizado) => void;
}

function norm(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function snapToNormalizado(s: LivroSnapshot): LivroNormalizado {
  return {
    id: s.id,
    titulo: s.titulo,
    autor: s.autor ?? null,
    sobre: s.sobre ?? null,
    capa: s.capa ?? null,
    link: s.link ?? null,
    download: s.download ?? null,
    area: s.area ?? null,
    colecaoId: s.colecaoId,
    capaHorizontal: null,
    anoLancamento: null,
    editora: null,
    curiosidades: null,
    analiseDetalhada: null,
  } as LivroNormalizado;
}

const TAB_LABELS: Record<string, string> = {
  areas: 'Áreas',
  classicos: 'Clássicos',
  oab: 'OAB',
  'fora-da-toga': 'Fora da Toga',
  oratoria: 'Oratória',
  lideranca: 'Liderança',
  portugues: 'Português',
  pesquisa: 'Pesquisa',
};

const BibliotecaBuscaOverlay = ({ open, onClose, onAbrirLivro }: Props) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [modo, setModo] = useState<Modo>('todos');
  const [favoritos, setFavoritos] = useState<LivroSnapshot[]>([]);
  const voice = useVoiceInput((text) => setQuery((prev) => (prev ? prev + ' ' : '') + text));
  const colecoesVisiveis = useVisibleColecoes();

  useEffect(() => {
    if (open) {
      setFavoritos(getFavoritos());
    } else {
      setQuery('');
      setModo('todos');
    }
  }, [open]);

  const results = useQueries({
    queries: colecoesVisiveis.map((colecao) => ({
      queryKey: ['biblioteca-colecao', colecao.id],
      staleTime: 10 * 60 * 1000,
      placeholderData: (prev: any) => prev,
      enabled: open,

      queryFn: async () => {
        try {
          let q: any = supabase.from(colecao.table as any).select(colecao.select);
          if (colecao.orderBy) q = q.order(colecao.orderBy, { ascending: true, nullsFirst: false });
          
          const data = await withBundleFallback(
            q.limit(2000).then((res: any) => {
              if (res.error) throw res.error;
              return res.data;
            }),
            async () => {
               const bundleFnName = 'biblioteca' + colecao.id.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
               if ((bundle as any)[bundleFnName]) {
                 return await (bundle as any)[bundleFnName]();
               }
               return [];
            }
          );
          
          const list = (data as any[]).map((r) => normalizeLivro(r, colecao));
          setPersistedColecao(colecao.id, list).catch(() => {});
          return list;
        } catch (err) {
          const cached = await getPersistedColecao<LivroNormalizado>(colecao.id);
          if (cached && cached.length) return cached;
          return [];
        }
      },
    })),
  });

  const todosLivros = useMemo<LivroNormalizado[]>(
    () => results.flatMap((r) => (r.data as LivroNormalizado[]) ?? []),
    [results],
  );

  const buscar = (lista: LivroNormalizado[]) => {
    const q = norm(deferredQuery);
    if (q.length < 2) return lista;
    const tokens = q.split(' ').filter(Boolean);
    const scored: { livro: LivroNormalizado; score: number }[] = [];
    for (const livro of lista) {
      const haystack = [norm(livro.titulo), norm(livro.autor), norm(livro.area), norm(livro.sobre)];
      const joined = haystack.join(' | ');
      
      let matches = 0;
      tokens.forEach((t) => {
        if (joined.includes(t)) matches++;
      });
      
      // Exige que pelo menos metade dos termos digitados seja encontrada
      if (matches < Math.ceil(tokens.length / 2)) continue;

      let score = 0;
      if (haystack[0].includes(q)) score += 100;
      if (haystack[0].startsWith(q)) score += 50;
      
      tokens.forEach((t) => {
        if (haystack[0].includes(t)) score += 10;
        if (haystack[1].includes(t)) score += 5;
        if (haystack[2].includes(t)) score += 3;
        if (haystack[3].includes(t)) score += 1;
      });
      
      if (score > 0) {
        scored.push({ livro, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.livro);
  };

  const listaTodos = useMemo(() => {
    const q = norm(deferredQuery);
    if (q.length < 2) return todosLivros.slice(0, 40);
    return buscar(todosLivros).slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, todosLivros]);

  const listaFiltrada = useMemo(() => {
    if (modo === 'todos') return listaTodos;
    const daColecao = todosLivros.filter((l) => l.colecaoId === modo);
    const q = norm(deferredQuery);
    if (q.length < 2) return daColecao.slice(0, 100);
    return buscar(daColecao).slice(0, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, deferredQuery, todosLivros, listaTodos]);


  const colecaoLabel = (id: string) => COLECOES.find((c) => c.id === id)?.label ?? '';
  const carregando = results.some((r) => r.isLoading);

  const LivroItem = ({ livro }: { livro: LivroNormalizado }) => (
    <button
      type="button"
      onClick={() => {
        onAbrirLivro(livro);
        onClose();
      }}
      className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-card border border-border text-left active:scale-[0.99] transition"
    >
      <div className="w-14 h-20 rounded-md overflow-hidden bg-muted/50 shrink-0 flex items-center justify-center">
        {livro.capa ? (
          <img src={directImg(livro.capa)} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-[15px] font-bold text-foreground leading-snug line-clamp-2">
          {livro.titulo}
        </p>
        {livro.autor && (
          <p className="font-body text-xs text-muted-foreground truncate mt-0.5">{livro.autor}</p>
        )}
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/90 mt-1 truncate">
          {colecaoLabel(livro.colecaoId)}
          {livro.area ? ` · ${livro.area}` : ''}
        </p>
      </div>
    </button>
  );

  return (
    <PrimeBottomSheet
      open={open}
      onClose={onClose}
      zIndex={60}
      className="!top-[10vh] lg:!top-[10%] rounded-t-3xl lg:max-w-[800px] lg:mx-auto lg:rounded-t-2xl lg:shadow-2xl"
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
              <button
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0"
                aria-label="Fechar"
              >
                <ChevronDown className="w-6 h-6 text-foreground" />
              </button>
              <div className="flex-1 text-center">
                <h2 className="font-display text-lg font-semibold text-foreground tracking-wide">
                  Pesquisar na biblioteca
                </h2>
              </div>
              <div className="w-12 shrink-0" />
            </div>

            {/* Abas — uma por categoria */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
              {[{ id: 'todos', label: 'Todos' }, ...colecoesVisiveis.map((c) => ({ id: c.id, label: TAB_LABELS[c.id] ?? c.label }))].map((t) => {
                const ativo = modo === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setModo(t.id)}
                    className={`shrink-0 h-11 px-4 rounded-xl font-display text-[13px] font-bold flex items-center justify-center gap-1.5 transition ${
                      ativo ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {t.id === 'todos' && <Library className="w-4 h-4" />}
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Campo de busca + voz */}
            <div className="px-4 pb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  autoFocus
                  value={voice.listening && voice.partial ? voice.partial : query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    'Livro, autor, área ou termo…'
                  }
                  className="w-full h-14 pl-12 pr-12 rounded-2xl bg-muted/60 border border-border font-body text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    aria-label="Limpar busca"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
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

            {/* Resultados */}
            <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-2">
              {carregando && listaFiltrada.length === 0 && (
                <p className="py-10 text-center font-body text-sm text-muted-foreground">Buscando…</p>
              )}
              {!carregando && listaFiltrada.length === 0 && (
                <div className="py-10 text-center font-body text-sm text-muted-foreground">
                  <p>Nenhum livro encontrado.</p>
                  <p className="mt-2 text-xs opacity-50">
                    Debug: {todosLivros.length} total.
                    Query: "{query}" (norm: "{norm(query)}").
                    Tokens: {JSON.stringify(norm(query).split(' ').filter(Boolean))}.
                  </p>
                </div>
              )}
              {listaFiltrada.map((l) => (
                <LivroItem key={`${l.colecaoId}-${l.id}`} livro={l} />
              ))}
            </div>
    </PrimeBottomSheet>
  );
};

export default BibliotecaBuscaOverlay;
