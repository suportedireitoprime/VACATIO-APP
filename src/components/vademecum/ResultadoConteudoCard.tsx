import { motion } from 'framer-motion';
import { Play, BookOpen, Newspaper, FileText, Film, PenLine } from 'lucide-react';
import type { ConteudoResultado, ConteudoTipo } from '@/hooks/useBuscaConteudo';

const ICONS: Record<ConteudoTipo, React.ComponentType<{ className?: string }>> = {
  videoaula: Play,
  livro: BookOpen,
  blog: PenLine,
  resumo: FileText,
  noticia: Newspaper,
  obra: Film,
};

const LABELS: Record<ConteudoTipo, string> = {
  videoaula: 'Videoaula',
  livro: 'Livro',
  blog: 'Blog',
  resumo: 'Resumo',
  noticia: 'Notícia',
  obra: 'Obra',
};

function highlight(text: string, termo: string) {
  if (!text || !termo) return text;
  try {
    const esc = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${esc})`, 'ig'));
    return parts.map((p, i) =>
      p.toLowerCase() === termo.toLowerCase()
        ? <mark key={i} className="bg-primary/25 text-foreground rounded px-0.5">{p}</mark>
        : <span key={i}>{p}</span>
    );
  } catch {
    return text;
  }
}

export default function ResultadoConteudoCard({
  item, termo, onClick, index = 0,
}: { item: ConteudoResultado; termo: string; onClick: () => void; index?: number }) {
  const Icon = ICONS[item.entity_type] || FileText;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className="w-full flex items-stretch gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 relative">
        {item.thumb_url ? (
          <img src={item.thumb_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Icon className="w-6 h-6 text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] uppercase tracking-wider font-bold text-primary/80">
            {LABELS[item.entity_type] || item.entity_type}
          </span>
          {item.subtitle && (
            <span className="text-[10px] text-muted-foreground truncate">· {item.subtitle}</span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {highlight(item.title || '', termo)}
        </p>
        {item.snippet && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {highlight(item.snippet, termo)}
          </p>
        )}
      </div>
    </motion.button>
  );
}
