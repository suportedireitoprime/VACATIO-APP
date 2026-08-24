import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Tema } from '@/hooks/useLeitorPrefs';

interface Pagina {
  index: number;
  ocrPage: number;
  chapterTitulo: string;
  md: string;
}

interface Match {
  pageIndex: number;
  ocrPage: number;
  chapterTitulo: string;
  snippet: string;
  matchStart: number;
}

interface Props {
  paginas: Pagina[];
  tema: Tema;
  onJump: (pageIndex: number) => void;
  onHighlight: (term: string) => void;
}

const SNIPPET_RADIUS = 60;

export default function BuscaNoLivro({ paginas, tema, onJump, onHighlight }: Props) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    onHighlight(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const matches = useMemo<Match[]>(() => {
    if (debounced.length < 3) return [];
    const needle = debounced.toLowerCase();
    const out: Match[] = [];
    for (const p of paginas) {
      const plain = p.md.replace(/[#*_>`~\-]/g, ' ').replace(/\s+/g, ' ');
      const low = plain.toLowerCase();
      let idx = low.indexOf(needle);
      while (idx !== -1 && out.length < 200) {
        const start = Math.max(0, idx - SNIPPET_RADIUS);
        const end = Math.min(plain.length, idx + needle.length + SNIPPET_RADIUS);
        const snippet =
          (start > 0 ? '…' : '') +
          plain.slice(start, end).trim() +
          (end < plain.length ? '…' : '');
        out.push({
          pageIndex: p.index,
          ocrPage: p.ocrPage,
          chapterTitulo: p.chapterTitulo,
          snippet,
          matchStart: idx,
        });
        idx = low.indexOf(needle, idx + needle.length);
        // limita a 3 ocorrências por página para não explodir a lista
        if (out.filter((m) => m.pageIndex === p.index).length >= 3) break;
      }
      if (out.length >= 200) break;
    }
    return out;
  }, [debounced, paginas]);

  const highlightSnippet = (snippet: string) => {
    if (!debounced) return snippet;
    const parts = snippet.split(new RegExp(`(${escapeRegex(debounced)})`, 'gi'));
    return parts.map((p, i) =>
      p.toLowerCase() === debounced.toLowerCase() ? (
        <mark
          key={i}
          style={{ background: 'hsl(var(--primary) / 0.35)', color: 'inherit', padding: '0 2px', borderRadius: 3 }}
        >
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="flex items-center gap-2 rounded-xl px-3 h-11 shrink-0"
        style={{ background: tema.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
      >
        <Search className="w-4 h-4 opacity-60 shrink-0" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar palavra, artigo…"
          className="flex-1 bg-transparent outline-none text-[14px] placeholder:opacity-50 min-w-0"
          style={{ color: tema.text }}
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="w-6 h-6 flex items-center justify-center rounded-full opacity-60 hover:opacity-100"
            aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="mt-3 text-[11px] uppercase tracking-wider opacity-60 shrink-0">
        {debounced.length < 3
          ? 'Digite ao menos 3 letras'
          : matches.length === 0
            ? 'Nenhum resultado'
            : `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}`}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto mt-2 -mx-1 pr-1 space-y-1">
        {matches.map((m, i) => (
          <button
            key={`${m.pageIndex}-${m.matchStart}-${i}`}
            onClick={() => onJump(m.pageIndex)}
            className="w-full text-left px-3 py-2.5 rounded-lg transition"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = tema.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <p className="text-[11px] opacity-60 mb-1 flex items-center gap-2">
              <span className="truncate">{m.chapterTitulo}</span>
              <span className="opacity-70">· p.{m.ocrPage}</span>
            </p>
            <p className="text-[13px] leading-snug">{highlightSnippet(m.snippet)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
