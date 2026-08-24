import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Search, X, BookOpen, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { COLECOES, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { useVisibleColecoes } from '@/hooks/useVisibleColecoes';
import { directImg } from '@/lib/cdnImg';
import { useVoiceInput } from '@/hooks/useVoiceInput';

const PLACEHOLDERS = [
  'Procure um livro…',
  'Procure um autor…',
  'Procure uma área do direito…',
  'Ex.: Constituição, Kelsen, Penal…',
  'Descubra um clássico do direito…',
];

function useTypingPlaceholder(active: boolean) {
  const [text, setText] = useState('');
  const idxRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = PLACEHOLDERS[idxRef.current];
      if (!deletingRef.current) {
        charRef.current += 1;
        setText(current.slice(0, charRef.current));
        if (charRef.current >= current.length) {
          deletingRef.current = true;
          timeout = setTimeout(tick, 1600);
          return;
        }
        timeout = setTimeout(tick, 55);
      } else {
        charRef.current -= 1;
        setText(current.slice(0, charRef.current));
        if (charRef.current <= 0) {
          deletingRef.current = false;
          idxRef.current = (idxRef.current + 1) % PLACEHOLDERS.length;
          timeout = setTimeout(tick, 400);
          return;
        }
        timeout = setTimeout(tick, 25);
      }
    };
    timeout = setTimeout(tick, 400);
    return () => clearTimeout(timeout);
  }, [active]);

  return text;
}

interface Props {
  onAbrirLivro: (livro: LivroNormalizado) => void;
}


/**
 * Normaliza texto: remove acentos, baixa caixa, colapsa espaços.
 */
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

export default function BibliotecaSearchBar({ onAbrirLivro }: Props) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const voice = useVoiceInput((text) => setQuery((prev) => (prev ? prev + ' ' : '') + text));
  const typing = useTypingPlaceholder(!query && !focused && !voice.listening);
  const colecoesVisiveis = useVisibleColecoes();


  const results = useQueries({
    queries: colecoesVisiveis.map((colecao) => ({
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
    })),
  });

  const todosLivros = useMemo<LivroNormalizado[]>(
    () => results.flatMap((r) => (r.data as LivroNormalizado[]) ?? []),
    [results],
  );

  const filtrados = useMemo(() => {
    const q = norm(query);
    if (q.length < 2) return [];
    const tokens = q.split(' ').filter(Boolean);
    const scored: { livro: LivroNormalizado; score: number }[] = [];
    for (const livro of todosLivros) {
      const haystack = [
        norm(livro.titulo),
        norm(livro.autor),
        norm(livro.area),
        norm(livro.sobre),
      ];
      const joined = haystack.join(' | ');
      // Todos os tokens precisam aparecer em algum lugar (AND).
      const matchAll = tokens.every((t) => joined.includes(t));
      if (!matchAll) continue;
      // Score: título > autor > área > sobre; e frase exata soma bônus.
      let score = 0;
      if (haystack[0].includes(q)) score += 100;
      if (haystack[0].startsWith(q)) score += 50;
      tokens.forEach((t) => {
        if (haystack[0].includes(t)) score += 10;
        if (haystack[1].includes(t)) score += 5;
        if (haystack[2].includes(t)) score += 3;
        if (haystack[3].includes(t)) score += 1;
      });
      scored.push({ livro, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 40).map((s) => s.livro);
  }, [query, todosLivros]);

  const colecaoLabel = (id: string) => COLECOES.find((c) => c.id === id)?.label ?? '';

  const carregando = query.length >= 2 && results.some((r) => r.isLoading);

  return (
    <div className="px-4 mb-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            inputMode="search"
            value={voice.listening && voice.partial ? voice.partial : query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={typing || 'Buscar livro, autor, área ou termo…'}
            className="w-full h-14 pl-11 pr-10 rounded-2xl bg-card border border-border/60 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-[0.95] transition"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
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
          {voice.listening && <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />}
          {voice.listening
            ? <MicOff className="w-6 h-6 relative z-[2]" strokeWidth={2.5} />
            : <Mic className="w-6 h-6 relative z-[2]" strokeWidth={2.5} />}
        </button>
      </div>



      <AnimatePresence initial={false}>
        {query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3 rounded-xl border border-border/60 bg-card overflow-hidden"
          >
            <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/50 flex items-center justify-between">
              <span>
                {carregando
                  ? 'Buscando…'
                  : `${filtrados.length} resultado${filtrados.length === 1 ? '' : 's'}`}
              </span>
              <span className="text-primary/80">"{query}"</span>
            </div>

            {!carregando && filtrados.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum livro encontrado para <span className="text-foreground">"{query}"</span>.
              </div>
            )}

            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border/40">
              {filtrados.map((livro) => (
                <li key={`${livro.colecaoId}-${livro.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onAbrirLivro(livro);
                      setQuery('');
                    }}
                    className="w-full flex items-center gap-3.5 p-3 text-left hover:bg-muted/40 active:scale-[0.99] transition"
                  >
                    <div className="w-14 h-20 rounded-md overflow-hidden bg-muted/50 shrink-0 flex items-center justify-center">
                      {livro.capa ? (
                        <img
                          src={directImg(livro.capa)}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground leading-snug line-clamp-2">
                        {livro.titulo}
                      </p>
                      {livro.autor && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{livro.autor}</p>
                      )}
                      <p className="text-[10px] uppercase tracking-widest text-primary/80 mt-1 truncate">
                        {colecaoLabel(livro.colecaoId)}
                        {livro.area ? ` · ${livro.area}` : ''}
                      </p>
                    </div>

                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
