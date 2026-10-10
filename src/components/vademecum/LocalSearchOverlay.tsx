import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Mic, Heart, Clock, PlayCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

type ArtigoType = any;
type CapGroup = { capitulo: string; artigos: ArtigoType[] };
type TituloGroup = { titulo: string; capitulos: CapGroup[] };

interface LocalSearchOverlayProps {
  open: boolean;
  onClose: () => void;
  leiNome: string;
  leiThemeColor: string;
  artigos: ArtigoType[];
  capituloGroups: TituloGroup[];
  onArtigoSelect: (artigo: ArtigoType) => void;
  recentes: ArtigoType[];
  onClearRecentes: () => void;
}

export const LocalSearchOverlay: React.FC<LocalSearchOverlayProps> = ({
  open,
  onClose,
  leiNome,
  leiThemeColor,
  artigos,
  capituloGroups,
  onArtigoSelect,
  recentes,
  onClearRecentes
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('todos'); // 'todos' ou nome do capitulo ou 'recentes'
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco no input ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Resetar estados
      setQuery('');
      setActiveTab('todos');
    }
  }, [open]);

  // Derivar capítulos válidos (com artigos)
  const allCapitulos = React.useMemo(() => {
    return capituloGroups.flatMap(t => t.capitulos).filter(c => c.artigos.length > 0);
  }, [capituloGroups]);

  // Aplicar filtros
  const filteredArtigos = React.useMemo(() => {
    let source = artigos;
    if (activeTab === 'recentes') {
      source = recentes;
    } else if (activeTab !== 'todos') {
      const cap = allCapitulos.find(c => c.capitulo === activeTab);
      if (cap) source = cap.artigos;
    }

    const raw = query.trim().toLowerCase();
    
    // Se estiver em 'todos' e sem query, não mostra a lista inteira de artigos
    if (activeTab === 'todos' && !raw) return [];

    let filtered = source;
    if (raw) {
      filtered = source.filter(a => 
        (a.caput || '').toLowerCase().includes(raw) || 
        (a.numero || '').toLowerCase().includes(raw)
      );
    }
    
    // Remove os itens que são apenas títulos estruturais (Livro, Título, Capítulo, etc.)
    // Assumimos que artigos reais têm `tipo === 'artigo'` ou o número começa com 'Art.'
    return filtered.filter(a => a.tipo === 'artigo' || (a.numero && a.numero.toLowerCase().includes('art.')));
  }, [artigos, allCapitulos, activeTab, query, recentes]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%', opacity: 1 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-[100] flex flex-col bg-background"
        >
          {/* Header customizado com a cor da lei */}
          <div 
            className="pt-[calc(1rem+var(--sai-top,var(--sai-top)))] pb-3 px-4 flex flex-col gap-3 rounded-b-3xl shadow-lg relative z-20"
            style={{ backgroundColor: leiThemeColor || '#c2274a' }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white shrink-0 active:scale-95 transition-transform"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Pesquisar em ${leiNome}`}
                  className="h-[46px] rounded-2xl bg-black/20 border-transparent pl-10 pr-12 text-[14px] text-white placeholder:text-white/60 shadow-inner focus-visible:ring-1 focus-visible:ring-white/50"
                  inputMode="search"
                  enterKeyHint="search"
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/20 text-white shrink-0 active:scale-95 transition-transform"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Menu de Tabs (Todos, Recentes, Capítulos) */}
            <div className="flex items-center overflow-x-auto no-scrollbar gap-2 px-1 pb-1">
              {/* Risquinho para recentes */}
              <button
                onClick={() => setActiveTab('recentes')}
                className={`shrink-0 h-[34px] px-3.5 rounded-full flex items-center justify-center font-bold text-[11px] uppercase tracking-wider transition-colors border ${
                  activeTab === 'recentes' 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-white/80 border-white/30 hover:bg-white/10'
                }`}
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Recentes
              </button>

              <div className="w-[1px] h-5 bg-white/30 shrink-0 mx-1" />

              <button
                onClick={() => setActiveTab('todos')}
                className={`shrink-0 h-[40px] px-4 rounded-xl flex items-center justify-center font-bold text-[11px] uppercase tracking-wider transition-colors border ${
                  activeTab === 'todos' 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-white/80 border-white/30 hover:bg-white/10'
                }`}
              >
                Todos
              </button>

              {allCapitulos.map(cap => {
                const parts = cap.capitulo.split(' - ');
                const title = parts[0];
                const subtitle = parts.slice(1).join(' - ');
                
                return (
                  <button
                    key={cap.capitulo}
                    onClick={() => setActiveTab(cap.capitulo)}
                    className={`shrink-0 h-[40px] px-3.5 rounded-xl flex flex-col items-start justify-center transition-colors border ${
                      activeTab === cap.capitulo 
                        ? 'bg-white text-black border-white' 
                        : 'bg-transparent text-white/80 border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-bold text-[11px] uppercase tracking-wider">{title}</span>
                    {subtitle && (
                      <span className={`text-[9px] max-w-[140px] truncate ${activeTab === cap.capitulo ? 'text-black/70' : 'text-white/60'}`}>
                        {subtitle}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Área de resultados */}
          <div className="flex-1 overflow-y-auto px-4 py-5 bg-background">
            {activeTab === 'recentes' && recentes.length > 0 && (
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1">Buscas Recentes</span>
                <button onClick={onClearRecentes} className="text-xs text-primary font-bold px-2 py-1 rounded hover:bg-primary/10">Limpar</button>
              </div>
            )}
            
            <div className="space-y-3 pb-32">
              {filteredArtigos.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm font-body py-10">
                  {activeTab === 'recentes' 
                    ? 'Nenhum artigo acessado recentemente.' 
                    : activeTab === 'todos' && !query.trim()
                    ? 'Pesquise pelo nmero do artigo ou texto.'
                    : 'Nenhum resultado encontrado.'}
                </div>
              ) : (
                filteredArtigos.map((artigo, idx) => (
                  <button
                    key={artigo.id || idx}
                    onClick={() => {
                      onArtigoSelect(artigo);
                    }}
                    className="w-full text-left bg-card border border-border p-4 rounded-2xl flex flex-col gap-1 hover:border-primary/40 active:scale-[0.99] transition-all"
                  >
                    <h3 className="font-display font-bold text-primary-light text-[15px]">{artigo.numero}</h3>
                    <p className="text-foreground/80 text-sm line-clamp-3 font-body leading-relaxed">
                      {artigo.caput}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocalSearchOverlay;
