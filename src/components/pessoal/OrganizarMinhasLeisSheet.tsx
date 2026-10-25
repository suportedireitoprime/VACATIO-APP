import { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Check,
  Search,
  ArrowUpDown,
  PlusCircle,
  X,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import {
  type MinhaLei,
  saveMinhasLeisCustomOrder,
  addLeiToMinhasLeis,
  removeLeiFromMinhasLeis,
} from '@/lib/minhasLeis';

interface Props {
  open: boolean;
  onClose: () => void;
  leis: MinhaLei[];
}

const TIPO_FILTER_LABELS: Record<string, string> = {
  todos: 'Todas',
  constituicao: 'Constituição',
  codigo: 'Códigos',
  estatuto: 'Estatutos',
  lei: 'Leis Especiais',
};

export default function OrganizarMinhasLeisSheet({ open, onClose, leis }: Props) {
  const [tab, setTab] = useState<'reordenar' | 'adicionar'>('reordenar');
  const [search, setSearch] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('todos');

  // IDs que já estão nas Minhas Leis
  const addedIds = useMemo(() => new Set(leis.map((l) => l.leiId)), [leis]);

  // Lista local para reordenação instantânea
  const [orderedIds, setOrderedIds] = useState<string[]>(() => leis.map((l) => l.leiId));

  // Sincroniza sempre que abrir
  const currentLeis = useMemo(() => {
    const map = new Map(leis.map((l) => [l.leiId, l]));
    const list: MinhaLei[] = [];
    orderedIds.forEach((id) => {
      const item = map.get(id);
      if (item) list.push(item);
    });
    // Qualquer nova lei adicionada que não estava no orderedIds
    leis.forEach((l) => {
      if (!list.some((it) => it.leiId === l.leiId)) {
        list.push(l);
      }
    });
    return list;
  }, [leis, orderedIds]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= currentLeis.length) return;
    const nextList = [...currentLeis];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(newIdx, 0, moved);
    const newIds = nextList.map((l) => l.leiId);
    setOrderedIds(newIds);
    saveMinhasLeisCustomOrder(newIds);
  };

  const handleRemove = (leiId: string) => {
    removeLeiFromMinhasLeis(leiId);
    setOrderedIds((prev) => prev.filter((id) => id !== leiId));
  };

  const handleToggleAdd = (cat: LeiCatalogItem) => {
    if (addedIds.has(cat.id)) {
      handleRemove(cat.id);
    } else {
      addLeiToMinhasLeis(cat.id);
      setOrderedIds((prev) => (prev.includes(cat.id) ? prev : [...prev, cat.id]));
    }
  };

  // Filtragem do catálogo para adicionar
  const catalogFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LEIS_CATALOG.filter((item) => {
      if (selectedTipo !== 'todos' && item.tipo !== selectedTipo) return false;
      if (!q) return true;
      return (
        item.nome.toLowerCase().includes(q) ||
        (item.sigla && item.sigla.toLowerCase().includes(q)) ||
        (item.descricao && item.descricao.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [search, selectedTipo]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="z-[9999] flex flex-col gap-0 overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#121214] p-0 [&>button:last-child]:hidden h-[90dvh]"
      >
        {/* Handle visual */}
        <div className="shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Top Header */}
        <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-white/5">
          <div>
            <h2 className="font-display text-white text-lg font-bold tracking-wide leading-tight">
              Organizar Minhas Leis
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Reordene suas leis ou acrescente novas à sua lista
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/80 flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Control / Tabs */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] border border-white/5">
            <button
              type="button"
              onClick={() => setTab('reordenar')}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                tab === 'reordenar'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Ordem ({currentLeis.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('adicionar')}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all duration-200 select-none ${
                tab === 'adicionar'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Acrescentar</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Reordenar */}
        {tab === 'reordenar' && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {currentLeis.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-white/30" />
                <p className="text-white/60 text-sm">Nenhuma lei na sua lista ainda.</p>
                <button
                  type="button"
                  onClick={() => setTab('adicionar')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Acrescentar leis
                </button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {currentLeis.map((item, index) => {
                  const isFirst = index === 0;
                  const isLast = index === currentLeis.length - 1;
                  return (
                    <motion.div
                      key={item.leiId}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 hover:border-white/10 transition-colors"
                    >
                      {/* Posição numeral */}
                      <span className="w-5 text-center text-xs font-bold text-white/40 tabular-nums">
                        {index + 1}
                      </span>

                      {/* Badge da lei */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-display font-black text-[12px] shadow-sm"
                        style={{ background: item.iconColor || 'hsl(var(--primary))' }}
                      >
                        {item.sigla || item.nome.slice(0, 3).toUpperCase()}
                      </div>

                      {/* Informações */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-white leading-tight truncate">
                          {item.nome}
                        </p>
                        <p className="text-[11px] text-white/50 truncate mt-0.5">
                          {item.sigla ? `${item.sigla} · ` : ''}
                          {item.descricao || (item.tipo === 'codigo' ? 'Código' : 'Legislação')}
                        </p>
                      </div>

                      {/* Ações de reordenação */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => moveItem(index, 'up')}
                          aria-label="Mover para cima"
                          className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-25 disabled:hover:bg-white/[0.06] text-white/90 flex items-center justify-center transition active:scale-95"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => moveItem(index, 'down')}
                          aria-label="Mover para baixo"
                          className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-25 disabled:hover:bg-white/[0.06] text-white/90 flex items-center justify-center transition active:scale-95"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.leiId)}
                          aria-label="Remover lei"
                          className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition active:scale-95 ml-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* Tab 2: Acrescentar Leis */}
        {tab === 'adicionar' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Campo de Busca */}
            <div className="px-4 pt-1 pb-2 shrink-0 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar lei, código, estatuto..."
                  className="w-full h-10 pl-10 pr-9 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:border-primary/50 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtros por Categoria */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {Object.entries(TIPO_FILTER_LABELS).map(([tipo, label]) => {
                  const active = selectedTipo === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setSelectedTipo(tipo)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors select-none ${
                        active
                          ? 'bg-primary text-white'
                          : 'bg-white/[0.05] hover:bg-white/[0.1] text-white/60'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de Leis do Catálogo */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
              {catalogFiltered.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-xs">
                  Nenhuma lei encontrada para "{search}".
                </div>
              ) : (
                catalogFiltered.map((cat) => {
                  const isAdded = addedIds.has(cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-display font-black text-[12px] shadow-sm"
                        style={{ background: cat.iconColor || 'hsl(var(--primary))' }}
                      >
                        {cat.sigla || cat.nome.slice(0, 3).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-white leading-tight truncate">
                          {cat.nome}
                        </p>
                        <p className="text-[11px] text-white/50 truncate mt-0.5">
                          {cat.sigla ? `${cat.sigla} · ` : ''}
                          {cat.descricao}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleAdd(cat)}
                        className={`h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition active:scale-95 shrink-0 ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                            : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/90 border border-white/10'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Adicionada</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Rodapé fixo com botão Concluir */}
        <div className="p-4 border-t border-white/5 shrink-0 bg-[#121214]">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition active:scale-[0.98] shadow-lg shadow-primary/25"
          >
            Concluir
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
