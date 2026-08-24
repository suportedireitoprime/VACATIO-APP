import { useState, useMemo } from 'react';
import { EXPLICACOES, CATEGORIAS, Explicacao } from '@/data/mockData';
import { Search, FileText, User, Calendar, Tag, ArrowLeft, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

const ExplicacaoTab = ({ searchQuery }: { searchQuery: string }) => {
  const [selectedExplicacao, setSelectedExplicacao] = useState<Explicacao | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [localSearch, setLocalSearch] = useState('');

  const query = searchQuery || localSearch;

  const filteredExplicacoes = useMemo(() => {
    let result = EXPLICACOES;
    if (categoriaFiltro) {
      result = result.filter(e => e.categoria === categoriaFiltro);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(e =>
        e.titulo.toLowerCase().includes(q) ||
        e.resumo.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [query, categoriaFiltro]);

  const usedCategorias = useMemo(() => {
    const cats = new Set(EXPLICACOES.map(e => e.categoria));
    return CATEGORIAS.filter(c => cats.has(c));
  }, []);

  if (selectedExplicacao) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedExplicacao(null)}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos artigos
        </button>

        <article className="border border-border rounded-lg bg-card p-5 space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {selectedExplicacao.categoria}
            </span>
            <h1 className="font-display text-xl text-foreground leading-tight">
              {selectedExplicacao.titulo}
            </h1>
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {selectedExplicacao.autor}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(selectedExplicacao.dataPublicacao).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            {selectedExplicacao.conteudo.split('\n\n').map((p, i) => (
              <p key={i} className="text-foreground/85 font-body text-sm leading-relaxed mb-3">
                {p}
              </p>
            ))}
          </div>

          {selectedExplicacao.leisRelacionadas.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="font-display text-sm text-foreground mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Legislação Relacionada
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedExplicacao.leisRelacionadas.map((lei, i) => (
                  <span key={i} className="text-xs font-body px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
                    {lei}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-2">
            {selectedExplicacao.tags.map((tag, i) => (
              <span key={i} className="text-[10px] font-body px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground">
                #{tag}
              </span>
            ))}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!searchQuery && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar artigos explicativos..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 bg-secondary border-border font-body"
          />
        </div>
      )}

      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setCategoriaFiltro('')}
            className={`whitespace-nowrap text-xs font-body px-3 py-1.5 rounded-full transition-colors ${
              !categoriaFiltro ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Todas
          </button>
          {usedCategorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat === categoriaFiltro ? '' : cat)}
              className={`whitespace-nowrap text-xs font-body px-3 py-1.5 rounded-full transition-colors ${
                categoriaFiltro === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="grid gap-3">
        {filteredExplicacoes.map((exp, i) => (
          <motion.button
            key={exp.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setSelectedExplicacao(exp)}
            className="w-full text-left border border-border rounded-lg p-4 bg-card hover:border-primary/40 hover:bg-secondary/50 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {exp.categoria}
                </span>
                <h3 className="font-display text-sm text-foreground mt-1.5 group-hover:text-primary transition-colors leading-tight">
                  {exp.titulo}
                </h3>
                <p className="text-muted-foreground text-xs font-body mt-1 line-clamp-2">
                  {exp.resumo}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-body">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {exp.autor}
                  </span>
                  <span>
                    {new Date(exp.dataPublicacao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
        {filteredExplicacoes.length === 0 && (
          <p className="text-center text-muted-foreground py-8 font-body">Nenhum artigo encontrado.</p>
        )}
      </div>
    </div>
  );
};

export default ExplicacaoTab;
