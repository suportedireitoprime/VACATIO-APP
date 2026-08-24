import type { ConteudoTipo } from '@/hooks/useBuscaConteudo';

export type CategoriaKey = 'tudo' | ConteudoTipo;

const ORDER: { key: CategoriaKey; label: string }[] = [
  { key: 'tudo', label: 'Tudo' },
  { key: 'videoaula', label: 'Videoaulas' },
  { key: 'livro', label: 'Livros' },
  { key: 'blog', label: 'Blog' },
  { key: 'resumo', label: 'Resumos' },
  { key: 'noticia', label: 'Notícias' },
  { key: 'obra', label: 'Filmes' },
];

export default function CategoriaFiltroBar({
  ativo, counts, onChange,
}: {
  ativo: CategoriaKey;
  counts: Record<string, number>;
  onChange: (k: CategoriaKey) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 pb-2 -mx-1">
      {ORDER.map((c) => {
        const total = c.key === 'tudo'
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : counts[c.key] || 0;
        const active = ativo === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onChange(c.key)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-all border ${
              active
                ? 'bg-primary text-primary-foreground border-primary shadow'
                : 'bg-muted text-muted-foreground border-transparent'
            }`}
          >
            {c.label}
            {total > 0 && (
              <span className={`ml-1.5 text-[10px] ${active ? 'opacity-80' : 'opacity-60'}`}>
                {total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
