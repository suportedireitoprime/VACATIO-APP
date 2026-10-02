import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  SlidersHorizontal,
  Search,
  Check,
  Plus,
  RotateCcw,
  ChevronRight,
  ChevronUp,
  ChevronDown,
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
import { getLeiColor, shade } from '@/lib/leiTheme';

const STORAGE_KEY = 'home_atalhos_leis_v5';
const MAX_ATALHOS = 13;

/** Ordem padrão solicitada: CF, CPC, CC, CP, CPP, CLT + restantes */
const DEFAULT_ATALHOS_IDS = [
  'cf88', // 1. CF/88
  'cpc',  // 2. CPC
  'cc',   // 3. Código Civil
  'cp',   // 4. Código Penal
  'cpp',  // 5. Código de Processo Penal
  'clt',  // 6. CLT
  'cdc',  // 7. CDC
  'ctn',  // 8. CTN
  'eoab', // 9. EOAB
  'eca',  // 10. ECA
  'epd',  // 11. Estatuto PCD
  'ce',   // 12. Código Eleitoral
];

interface AlternanciaTab {
  id: string;
  label: string;
}

const ALTERNANCIA_TABS: AlternanciaTab[] = [
  { id: 'em-alta', label: 'Em Alta' },
  { id: 'todos', label: 'Todas' },
  { id: 'penal', label: 'Penal' },
  { id: 'civil', label: 'Civil' },
  { id: 'constitucional', label: 'Constitucional' },
  { id: 'trabalho', label: 'Trabalho' },
  { id: 'tributario', label: 'Tributário' },
  { id: 'estatutos', label: 'Estatutos' },
  { id: 'administrativo', label: 'Administrativo' },
];

const CATEGORY_MAP: Record<string, string[]> = {
  penal: [
    'cp', 'cpp', 'cpm', 'cppm', 'lep', 'lmp', 'ld', 'loc', 'laa', 'lit',
    'lch', 'ltort', 'lcsf', 'lpt', 'lcp', 'lat', 'lci'
  ],
  civil: [
    'cc', 'cpc', 'cdc', 'li', 'lrp', 'lalim', 'lalp', 'lgpd', 'mci',
    'cflor', 'ccom', 'la'
  ],
  constitucional: [
    'cf88', 'lindb', 'lpaf', 'lai', 'lap', 'lmi', 'lms', 'lhd'
  ],
  trabalho: [
    'clt'
  ],
  tributario: [
    'ctn', 'lrf', 'lrt', 'lcsf'
  ],
  estatutos: [
    'eca', 'ei', 'epd', 'eir', 'ec', 'ed', 'eoab', 'et', 'ej', 'em',
    'eind', 'eterra', 'emig', 'eref', 'emet', 'emus', 'eme', 'epc'
  ],
  administrativo: [
    'lia', 'lpaf', 'nll', 'lai', 'lms', 'l8112', 'loman', 'lotcu',
    'ces', 'lcon', 'lppp', 'lace'
  ],
};

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
  const [activeTab, setActiveTab] = useState<string>('em-alta');

  const activeLeis = useMemo(() => {
    const map = new Map<string, LeiCatalogItem>();
    LEIS_CATALOG.forEach((lei) => map.set(lei.id, lei));
    return selectedIds
      .map((id) => map.get(id))
      .filter((item): item is LeiCatalogItem => Boolean(item));
  }, [selectedIds]);

  const filteredCatalog = useMemo(() => {
    let list: LeiCatalogItem[];

    if (activeTab === 'em-alta') {
      const map = new Map<string, LeiCatalogItem>();
      LEIS_CATALOG.forEach((lei) => map.set(lei.id, lei));
      list = selectedIds
        .map((id) => map.get(id))
        .filter((item): item is LeiCatalogItem => Boolean(item));
    } else if (activeTab === 'todos') {
      list = LEIS_CATALOG;
    } else if (CATEGORY_MAP[activeTab]) {
      const allowedIds = new Set(CATEGORY_MAP[activeTab]);
      list = LEIS_CATALOG.filter((l) => allowedIds.has(l.id));
    } else {
      list = LEIS_CATALOG;
    }

    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;

    return list.filter(
      (lei) =>
        lei.sigla.toLowerCase().includes(term) ||
        lei.nome.toLowerCase().includes(term) ||
        lei.descricao.toLowerCase().includes(term) ||
        lei.tags?.some((t) => t.toLowerCase().includes(term))
    );
  }, [activeTab, selectedIds, searchTerm]);

  const toggleLei = useCallback((id: string) => {
    setSelectedIds((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        if (prev.length <= 1) {
          toast.error('Mantenha pelo menos 1 atalho selecionado.');
          return prev;
        }
        next = prev.filter((item) => item !== id);
        toast.info('Atalho removido do Em Alta');
      } else {
        if (prev.length >= MAX_ATALHOS) {
          toast.warning(`Limite de ${MAX_ATALHOS} atalhos atingido. Remova um atalho no "Em Alta" para adicionar outro.`);
          return prev;
        }
        next = [...prev, id];
        toast.success('Atalho adicionado ao Em Alta!');
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
    toast.success('Atalhos restaurados para o padrão.');
  }, []);

  const moveLei = useCallback((id: string, direction: 'up' | 'down') => {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;

      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
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

      {/* Carrossel Horizontal de Cards Vermelhos Bordô (Design APP.PRIME) — Sem margem lateral à direita */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 -mt-10">
        <div
          tabIndex={0}
          aria-label="Carrossel de atalhos de leis em alta"
          className="flex items-center gap-2.5 overflow-x-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-4 pt-10 scrollbar-none focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {activeLeis.map((lei) => {
            const LawIcon = getLawIcon(lei.id, lei.tipo);
            const baseColor = getLeiColor(lei.id, lei.tipo);
            
            let coverImage = null;
            if (lei.id === 'cdc') coverImage = '/assets/cdc-girl.webp';
            else if (lei.id === 'clt') coverImage = '/assets/cdc-worker.webp';
            else if (lei.id === 'cpp') coverImage = '/assets/cpp-court.webp';
            else if (lei.id === 'cpc') coverImage = '/assets/cpc-lawyer.webp';
            else if (lei.id === 'cc') coverImage = '/assets/cc-couple.webp';
            else if (lei.id === 'cf88') coverImage = '/assets/cf88-cover.webp';
            else if (['cp', 'lep'].includes(lei.id)) coverImage = '/assets/homem-preso-novo.webp';
            else if (lei.id === 'ctn') coverImage = '/assets/ctn-taxes.webp';
            else if (lei.id === 'eca') coverImage = '/assets/eca-kids.webp';
            else if (lei.id === 'eoab') coverImage = '/assets/eoab-woman.webp';
            else if (lei.id === 'epd') coverImage = '/assets/epd-wheelchair.webp';
            else if (lei.id === 'ce') coverImage = '/assets/ce-vote.webp';

            return (
              <button
                key={lei.id}
                type="button"
                onClick={() => onOpenLei(lei.id)}
                className="border-0 min-w-[138px] max-w-[148px] sm:min-w-[152px] sm:max-w-[162px] h-[116px] sm:h-[122px] shrink-0 rounded-2xl relative flex flex-col text-left cursor-pointer select-none active:scale-[0.96] transition-all shadow-md group outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {/* Fundo com clip para a cor e o ícone de marca d'água */}
                <div 
                  className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${baseColor} 0%, ${shade(baseColor, -0.3)} 100%)` }}
                >
                  {/* Ícone temático no fundo transparente */}
                  <LawIcon
                    className="absolute -right-2 -bottom-2 w-20 h-20 sm:w-22 sm:h-22 text-white/[0.15] drop-shadow-md group-hover:scale-105 group-hover:text-white/[0.2] transition-all duration-300"
                    strokeWidth={1.3}
                  />
                  {/* Brilho suave no topo do card */}
                  <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10 blur-xl group-hover:bg-white/20 transition-all" />
                </div>

                {coverImage && (
                  <img
                    src={coverImage}
                    alt={`Capa da lei ${lei.sigla}`}
                    className="absolute -top-6 right-0 h-[118px] w-auto max-w-none object-contain pointer-events-none z-10 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_12px_20px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-all duration-300"
                  />
                )}

                {/* Conteúdo visível (Sigla da lei no fundo e ícone no canto superior) */}
                <div className="relative z-20 flex flex-col justify-between w-full h-full p-3 pointer-events-none">
                  {/* Canto superior (Opcional, apenas um pequeno destaque) */}
                  <div className="flex justify-between items-start">
                    <LawIcon
                      className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-200"
                      strokeWidth={1.8}
                    />
                  </div>
                  
                  {/* Canto inferior (Abreviatura) */}
                  <div className="flex justify-between items-end mt-auto">
                    <span className="font-display text-white text-[24px] sm:text-[26px] font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                      {lei.sigla}
                    </span>
                    <ChevronRight
                      className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] mb-1"
                      strokeWidth={2.4}
                    />
                  </div>
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

              {/* Sheet container - 95% da altura da tela */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="relative z-10 w-full sm:max-w-xl bg-[#141416] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl h-[95vh] max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Drag handle no topo em telas mobile */}
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="font-display text-white text-[17px] font-bold">
                      Personalizar Atalhos
                    </h3>
                    <p className="font-body text-neutral-400 text-[12px]">
                      Selecione até {MAX_ATALHOS} leis para o carrossel da tela inicial
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    aria-label="Fechar"
                    className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Busca e Reset */}
                <div className="px-3 sm:px-4 py-2.5 border-b border-white/5 flex items-center gap-2 shrink-0">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800/80 border border-white/10">
                    <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filtrar por sigla, nome ou número..."
                      className="bg-transparent text-white text-[13px] placeholder-neutral-500 w-full focus:outline-none"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        aria-label="Limpar filtro"
                        className="text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={resetDefaults}
                    title="Restaurar padrão inicial (CF, CPC, CC, CP, CPP, CLT...)"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-neutral-800/60 hover:bg-neutral-800 text-[12px] font-medium text-neutral-300 hover:text-white shrink-0 active:scale-95 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Padrão</span>
                  </button>
                </div>

                {/* Menu de alternância de áreas / abas */}
                <div className="px-3 sm:px-4 py-2 border-b border-white/5 overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0">
                  {ALTERNANCIA_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-white text-black shadow-sm'
                            : 'bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-white/5'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.id === 'em-alta' && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isActive ? 'bg-black/15 text-black' : 'bg-white/10 text-neutral-300'
                            }`}
                          >
                            {selectedIds.length}/{MAX_ATALHOS}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Lista de Leis — Visual escuro neutro premium (Sem cor vermelha) */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                  {filteredCatalog.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500 text-[13px]">
                      {activeTab === 'em-alta'
                        ? 'Nenhuma lei no Em Alta. Selecione leis nas outras abas para adicionar.'
                        : 'Nenhuma lei encontrada para o filtro atual.'}
                    </div>
                  ) : (
                    filteredCatalog.map((lei) => {
                      const isSelected = selectedIds.includes(lei.id);
                      const LawIcon = getLawIcon(lei.id, lei.tipo);

                      return (
                        <button
                          key={lei.id}
                          type="button"
                          onClick={() => toggleLei(lei.id)}
                          className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer active:scale-[0.99] group ${
                            isSelected
                              ? 'bg-[#222226] border-white/20 text-white shadow-sm'
                              : 'bg-[#18181B]/80 border-white/5 text-neutral-400 hover:bg-[#222226]/50 hover:text-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0">
                              <LawIcon className="w-4.5 h-4.5 text-white/90" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-display font-bold text-[14px] text-white">
                                  {lei.sigla}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-medium">
                                  {lei.tipo}
                                </span>
                              </div>
                              <p className="font-body text-[12px] truncate mt-0.5 text-neutral-300">
                                {lei.nome}
                              </p>
                              <p className="font-body text-[11px] truncate text-neutral-400">
                                {lei.id === 'cf88' ? 'Constituição de 1988' : lei.descricao}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {activeTab === 'em-alta' && isSelected && (
                              <div className="flex flex-col gap-1 mr-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); moveLei(lei.id, 'up'); }}
                                  disabled={filteredCatalog.indexOf(lei) === 0}
                                  className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); moveLei(lei.id, 'down'); }}
                                  disabled={filteredCatalog.indexOf(lei) === filteredCatalog.length - 1}
                                  className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                                isSelected
                                  ? 'bg-white border-white text-black shadow-sm'
                                  : 'border-white/20 bg-white/5 text-transparent group-hover:border-white/40'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer neutro e informativo */}
                <div className="p-3 pb-8 sm:p-4 sm:pb-4 border-t border-white/10 flex items-center justify-between bg-[#141416] shrink-0">
                  <div className="flex flex-col">
                    <span className="text-[12px] text-neutral-400">
                      <strong className="text-white font-bold">{selectedIds.length}</strong> de <strong className="text-white font-bold">{MAX_ATALHOS}</strong> selecionadas
                    </span>
                    {selectedIds.length >= MAX_ATALHOS && (
                      <span className="text-[10px] text-amber-400 font-medium">Limite do carrossel atingido</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-6 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-[13px] active:scale-95 transition shadow-sm cursor-pointer"
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
