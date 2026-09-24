import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  Search,
  Check,
  RotateCcw,
  X,
  Scale,
  BookMarked,
  Sparkles,
  Landmark,
  Sword,
  Home,
  FileText,
  Gavel,
  Briefcase,
  ShoppingCart,
  Car,
  Vote,
  Shield,
  Trees,
  Ship,
  Plane,
  Droplets,
  Pickaxe,
  Radio,
  Baby,
  HeartPulse,
  Accessibility,
  Handshake,
  Building2,
  Trophy,
  Tent,
  Mountain,
  Globe2,
  Store,
  Ribbon,
  Palette,
} from 'lucide-react';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';

const STORAGE_KEY = 'home_atalhos_leis';

const DEFAULT_ATALHOS_IDS = [
  'cf88',
  'clt',
  'cc',
  'cpc',
  'cp',
  'cpp',
  'eoab',
  'eca',
  'cdc',
  'ctn',
];

const LAW_ICON_MAP: Record<string, React.ElementType> = {
  // Constituição
  cf88: Landmark,
  // Códigos — ícone representativo do tema
  cp: Sword,
  cc: Home,
  cpc: FileText,
  cpp: Gavel,
  ctn: Landmark,
  cdc: ShoppingCart,
  clt: Briefcase,
  ctb: Car,
  ce: Vote,
  cpm: Shield,
  cppm: Shield,
  cflor: Trees,
  ccom: Ship,
  cba: Plane,
  cagua: Droplets,
  cmin: Pickaxe,
  ctel: Radio,
  // Estatutos
  eca: Baby,
  ei: HeartPulse,
  epd: Accessibility,
  eir: Handshake,
  ec: Building2,
  ed: Sword,
  eoab: Scale,
  et: Trophy,
  ej: Sparkles,
  em: Shield,
  eind: Tent,
  eterra: Mountain,
  emig: Globe2,
  eref: Globe2,
  emet: Building2,
  emus: Palette,
  eme: Store,
  epc: Ribbon,
  // Fallbacks
  constituicao: Landmark,
  codigo: Scale,
  estatuto: BookMarked,
};

function getLawIcon(id: string, tipo?: string): React.ElementType {
  if (LAW_ICON_MAP[id]) return LAW_ICON_MAP[id];
  if (tipo && LAW_ICON_MAP[tipo]) return LAW_ICON_MAP[tipo];
  return Scale;
}

interface Props {
  onOpenLei: (leiId: string) => void;
}

function HomeAtalhosLeisCarousel({ onOpenLei }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_ATALHOS_IDS;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const activeLeis = useMemo(() => {
    const map = new Map<string, LeiCatalogItem>();
    LEIS_CATALOG.forEach((lei) => map.set(lei.id, lei));
    return selectedIds
      .map((id) => map.get(id))
      .filter((item): item is LeiCatalogItem => Boolean(item));
  }, [selectedIds]);

  const filteredCatalog = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return LEIS_CATALOG;
    return LEIS_CATALOG.filter(
      (lei) =>
        lei.sigla.toLowerCase().includes(term) ||
        lei.nome.toLowerCase().includes(term) ||
        lei.descricao.toLowerCase().includes(term) ||
        lei.tags?.some((t) => t.toLowerCase().includes(term))
    );
  }, [searchTerm]);

  const toggleLei = useCallback((id: string) => {
    setSelectedIds((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Mantém pelo menos 1 atalho
        next = prev.filter((item) => item !== id);
      } else {
        next = [...prev, id];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setSelectedIds(DEFAULT_ATALHOS_IDS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ATALHOS_IDS));
    } catch {}
  }, []);

  return (
    <section className="space-y-3">
      {/* Cabeçalho da Seção com alinhamento px-1 idêntico a Legislação Brasileira */}
      <div className="px-1 min-h-[50px] flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-foreground text-[18px] font-bold uppercase flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
            <span className="truncate">Em Alta</span>
          </h3>
          <p className="font-body text-muted-foreground text-[12.5px] leading-snug ml-3 truncate">
            Meus atalhos de leis mais consultadas
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSearchTerm('');
            setModalOpen(true);
          }}
          aria-label="Personalizar atalhos de leis"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card hover:bg-neutral-800 px-3.5 py-1.5 text-[12px] font-semibold text-foreground active:scale-[0.96] transition-all shadow-sm cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          <span>Personalizar</span>
        </button>
      </div>

      {/* Carrossel Horizontal de Cards Vermelhos Bordô (Design APP.PRIME) */}
      <div className="relative w-full overflow-hidden">
        <div
          tabIndex={0}
          aria-label="Carrossel de atalhos de leis em alta"
          className="flex items-center gap-2.5 overflow-x-auto px-1 pb-2 pt-1 scrollbar-none focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {activeLeis.map((lei) => {
            const LawIcon = getLawIcon(lei.id, lei.tipo);

            return (
              <button
                key={lei.id}
                type="button"
                onClick={() => onOpenLei(lei.id)}
                className="bg-card-red-gradient border-0 min-w-[138px] max-w-[148px] sm:min-w-[152px] sm:max-w-[162px] h-[116px] sm:h-[122px] shrink-0 p-3 rounded-2xl relative overflow-hidden flex flex-col justify-between text-left cursor-pointer select-none active:scale-[0.96] transition-all shadow-md group"
              >
                {/* Ícone temático no fundo transparente, do lado direito (substituindo a balança) */}
                <LawIcon
                  className="pointer-events-none absolute -right-2 -bottom-2 w-20 h-20 sm:w-22 sm:h-22 text-white/[0.12] group-hover:scale-105 group-hover:text-white/[0.18] transition-all duration-300"
                  strokeWidth={1.3}
                />

                {/* Brilho suave no topo do card */}
                <div className="pointer-events-none absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10 blur-xl group-hover:bg-white/20 transition-all" />

                {/* Linha superior: Ícone temático branco do lado esquerdo antes do título/sigla */}
                <div className="flex items-center gap-2 relative z-10">
                  <LawIcon
                    className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-200"
                    strokeWidth={1.8}
                  />
                  <span className="font-display text-white text-[20px] sm:text-[22px] font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                    {lei.sigla}
                  </span>
                </div>

                {/* Linha inferior: Nome completo e número/ano da lei */}
                <div className="relative z-10">
                  <p className="font-body text-white font-bold text-[11px] sm:text-[11.5px] leading-tight line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    {lei.nome}
                  </p>
                  <p className="font-body text-white/80 text-[9.5px] sm:text-[10px] font-medium truncate mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    {lei.id === 'cf88' ? 'Constituição de 1988' : lei.descricao}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal / Bottom Sheet de Personalização dos Atalhos */}
      {modalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <div className="fixed inset-0 z-[1500] flex items-end sm:items-center justify-center">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setModalOpen(false)}
                className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              />

              {/* Sheet container */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="relative z-10 w-full sm:max-w-lg bg-neutral-900 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-white text-[17px] font-bold">
                      Personalizar Atalhos
                    </h3>
                    <p className="font-body text-neutral-400 text-[12px]">
                      Selecione quais leis aparecem no carrossel da tela inicial
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    aria-label="Fechar"
                    className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Busca e Reset */}
                <div className="p-3 sm:p-4 border-b border-white/5 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800/80 border border-white/10">
                    <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filtrar por sigla ou nome..."
                      className="bg-transparent text-white text-[13px] placeholder-neutral-500 w-full focus:outline-none"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        aria-label="Limpar filtro"
                        className="text-neutral-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={resetDefaults}
                    title="Restaurar padrão inicial"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-white/10 bg-neutral-800/60 hover:bg-neutral-800 text-[11px] font-medium text-neutral-300 hover:text-white shrink-0 active:scale-95 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Padrão</span>
                  </button>
                </div>

                {/* Lista de Leis para Selecionar com Ícone */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                  {filteredCatalog.map((lei) => {
                    const isSelected = selectedIds.includes(lei.id);
                    const LawIcon = getLawIcon(lei.id, lei.tipo);

                    return (
                      <button
                        key={lei.id}
                        type="button"
                        onClick={() => toggleLei(lei.id)}
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer active:scale-[0.99] ${
                          isSelected
                            ? 'bg-primary/15 border-primary/40 text-white'
                            : 'bg-neutral-800/40 border-white/5 text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                            <LawIcon className="w-4 h-4 text-white/90" strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-[14px] text-white">
                                {lei.sigla}
                              </span>
                              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                                {lei.tipo}
                              </span>
                            </div>
                            <p className="font-body text-[12px] truncate mt-0.5 text-neutral-300">
                              {lei.nome}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                            isSelected
                              ? 'bg-primary border-primary text-white shadow-sm'
                              : 'border-white/20 bg-white/5'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="p-3 sm:p-4 border-t border-white/10 flex items-center justify-between bg-neutral-900/90">
                  <span className="text-[12px] text-neutral-400">
                    <strong className="text-white">{selectedIds.length}</strong> selecionada(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-[13px] active:scale-95 transition shadow-sm"
                  >
                    Concluir
                  </button>
                </div>
              </motion.div>
            </div>
          </AnimatePresence>,
          document.body
        )}
    </section>
  );
}

export default HomeAtalhosLeisCarousel;
