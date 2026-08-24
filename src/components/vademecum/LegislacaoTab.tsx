import { useState, useMemo } from 'react';
import { LEIS, Lei, ArtigoLei } from '@/data/mockData';
import { Search, BookOpen, ChevronRight, ChevronDown, Scale, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LegislacaoTabProps {
  searchQuery: string;
  categoriaFiltro?: string | null;
  onClearFiltro?: () => void;
}

const TIPO_LABELS: Record<string, string> = {
  constituicao: 'Constituição',
  codigo: 'Códigos',
  estatuto: 'Estatutos',
  'lei-ordinaria': 'Leis Ordinárias',
  decreto: 'Decretos',
  sumula: 'Jurisprudência',
  'lei-especial': 'Leis Especiais',
  previdenciario: 'Previdenciário',
};

const LegislacaoTab = ({ searchQuery, categoriaFiltro, onClearFiltro }: LegislacaoTabProps) => {
  const [selectedLei, setSelectedLei] = useState<Lei | null>(null);
  const [expandedArtigo, setExpandedArtigo] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  const query = searchQuery || localSearch;

  const filteredLeis = useMemo(() => {
    let leis = LEIS;
    if (categoriaFiltro) {
      leis = leis.filter(lei => lei.tipo === categoriaFiltro);
    }
    if (!query) return leis;
    const q = query.toLowerCase();
    return leis.filter(lei =>
      lei.nome.toLowerCase().includes(q) ||
      lei.sigla.toLowerCase().includes(q) ||
      lei.categoria.toLowerCase().includes(q) ||
      lei.artigos.some(a => a.caput.toLowerCase().includes(q) || a.numero.toLowerCase().includes(q))
    );
  }, [query, categoriaFiltro]);

  const filteredArtigos = useMemo(() => {
    if (!selectedLei) return [];
    if (!query) return selectedLei.artigos;
    const q = query.toLowerCase();
    return selectedLei.artigos.filter(a =>
      a.caput.toLowerCase().includes(q) ||
      a.numero.toLowerCase().includes(q) ||
      a.incisos?.some(i => i.toLowerCase().includes(q)) ||
      a.paragrafos?.some(p => p.toLowerCase().includes(q))
    );
  }, [selectedLei, query]);

  const highlightText = (text: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark>
        : part
    );
  };

  if (selectedLei) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedLei(null); setExpandedArtigo(null); }}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao índice
        </button>

        <div className="border border-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-3 mb-1">
            <Scale className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl text-foreground">{selectedLei.nome}</h2>
          </div>
          <p className="text-muted-foreground text-sm font-body ml-8">{selectedLei.descricao}</p>
        </div>

        {!searchQuery && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artigo por número ou palavra-chave..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 bg-secondary border-border font-body"
            />
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-22rem)]">
          <div className="space-y-2 pr-2">
            {filteredArtigos.map((artigo) => (
              <motion.div
                key={artigo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border rounded-lg overflow-hidden bg-card hover:border-primary/30 transition-colors"
              >
                <button
                  onClick={() => setExpandedArtigo(expandedArtigo === artigo.id ? null : artigo.id)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <span className="text-primary font-display text-sm font-bold whitespace-nowrap mt-0.5">
                    {artigo.numero}
                  </span>
                  <span className="text-foreground/90 font-body text-sm leading-relaxed flex-1">
                    {highlightText(artigo.caput)}
                  </span>
                  {(artigo.incisos || artigo.paragrafos) && (
                    expandedArtigo === artigo.id
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedArtigo === artigo.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 ml-8 space-y-2">
                        {artigo.incisos?.map((inciso, i) => (
                          <p key={i} className="text-foreground/70 font-body text-sm pl-4 border-l-2 border-primary/20">
                            {highlightText(inciso)}
                          </p>
                        ))}
                        {artigo.paragrafos?.map((p, i) => (
                          <p key={i} className="text-foreground/80 font-body text-sm italic pl-4 border-l-2 border-accent/30">
                            {highlightText(p)}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {filteredArtigos.length === 0 && (
              <p className="text-center text-muted-foreground py-8 font-body">Nenhum artigo encontrado.</p>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categoriaFiltro && (
        <button
          onClick={onClearFiltro}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar a todas as categorias
        </button>
      )}

      {categoriaFiltro && (
        <div className="border border-border rounded-lg bg-card p-3">
          <h2 className="font-display text-lg text-foreground">
            {TIPO_LABELS[categoriaFiltro] || categoriaFiltro}
          </h2>
          <p className="text-muted-foreground text-xs font-body">{filteredLeis.length} legislação(ões) encontrada(s)</p>
        </div>
      )}

      {!searchQuery && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar legislação..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 bg-secondary border-border font-body"
          />
        </div>
      )}

      <div className="grid gap-3">
        {filteredLeis.map((lei, i) => (
          <motion.button
            key={lei.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setSelectedLei(lei)}
            className="w-full text-left border border-border rounded-lg p-4 bg-card hover:border-primary/40 hover:bg-secondary/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-base text-foreground group-hover:text-primary transition-colors">
                    {lei.sigla}
                  </h3>
                  <p className="text-muted-foreground text-xs font-body">{lei.nome}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {lei.categoria}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
            <p className="text-muted-foreground text-xs font-body mt-2 ml-[3.25rem]">
              {lei.artigos.length} artigo{lei.artigos.length !== 1 ? 's' : ''} • {lei.descricao}
            </p>
          </motion.button>
        ))}
        {filteredLeis.length === 0 && (
          <p className="text-center text-muted-foreground py-8 font-body">Nenhuma legislação encontrada.</p>
        )}
      </div>
    </div>
  );
};

export default LegislacaoTab;
