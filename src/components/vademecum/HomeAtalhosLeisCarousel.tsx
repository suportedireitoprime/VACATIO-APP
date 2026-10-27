import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  SlidersHorizontal,
  Search,
  Check,
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Scale,
  BookMarked,
  GraduationCap,
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
  TrendingUp,
  Flame,
  Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import { getLeiColor, shade } from '@/lib/leiTheme';

import cdcGirlImg from '@/assets/leis-figures/cdc-girl.webp';
import cdcWorkerImg from '@/assets/leis-figures/cdc-worker.webp';
import cppCourtImg from '@/assets/leis-figures/cpp-court.webp';
import cpcLawyerImg from '@/assets/leis-figures/cpc-lawyer.webp';
import ccCoupleImg from '@/assets/leis-figures/cc-couple.webp';
import cf88CoverImg from '@/assets/leis-figures/cf88-cover.webp';
import homemPresoImg from '@/assets/leis-figures/homem-preso-novo.webp';
import ctnTaxesImg from '@/assets/leis-figures/ctn-taxes.webp';
import ecaKidsImg from '@/assets/leis-figures/eca-kids.webp';
import eoabWomanImg from '@/assets/leis-figures/eoab-woman.webp';
import pcdWheelchairImg from '@/assets/leis-figures/pcd-wheelchair.webp';
import ceVoteImg from '@/assets/leis-figures/ce-vote.webp';

const ILUSTRACOES_LEIS: Record<string, string> = {
  cdc: cdcGirlImg,
  clt: cdcWorkerImg,
  cpp: cppCourtImg,
  cpc: cpcLawyerImg,
  cc: ccCoupleImg,
  cf88: cf88CoverImg,
  cf: cf88CoverImg,
  constituicao: cf88CoverImg,
  cp: homemPresoImg,
  lep: homemPresoImg,
  ctn: ctnTaxesImg,
  eca: ecaKidsImg,
  eoab: eoabWomanImg,
  epd: pcdWheelchairImg,
  ce: ceVoteImg,
};

const STORAGE_KEY = 'home_atalhos_leis_v5';
const MAX_ATALHOS = 13;

const CARD_W = 126; // px
const GAP = 14; // px
const STEP = CARD_W + GAP;
const sidePad = 'calc(50% - 63px)';

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

export const LAW_ICON_MAP: Record<string, React.ElementType> = {
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
  ej: GraduationCap,
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

export function getLawIcon(id: string, tipo?: string): React.ElementType {
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
  const [viewsMap, setViewsMap] = useState<Record<string, number>>({});

  // Carrega visualizações reais gravadas no Supabase para o ranking
  useEffect(() => {
    let cancel = false;
    async function loadViews() {
      try {
        const { data } = await supabase
          .from('artigos_visualizacoes')
          .select('tabela_codigo')
          .limit(1000);
        if (cancel || !data) return;
        const counts: Record<string, number> = {};
        data.forEach((v: any) => {
          if (v.tabela_codigo) {
            const key = String(v.tabela_codigo).toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
          }
        });
        setViewsMap(counts);
      } catch {}
    }
    loadViews();
    return () => { cancel = true; };
  }, []);

  // Lista exclusiva de leis que possuem ilustração com card, ordenadas por ranking de acessos
  const rankingLeisComIlustracao = useMemo(() => {
    const idsIlustradas = Object.keys(ILUSTRACOES_LEIS).filter(
      (id) => id !== 'cf' && id !== 'constituicao'
    );
    const catalogMap = new Map<string, LeiCatalogItem>();
    LEIS_CATALOG.forEach((l) => catalogMap.set(l.id, l));

    // Base ponderada para ranking natural e realista
    const basePonderada: Record<string, number> = {
      cf88: 1420,
      cpc: 1180,
      cp: 1120,
      cc: 980,
      cpp: 860,
      clt: 790,
      cdc: 640,
      ctn: 520,
      eoab: 430,
      eca: 380,
      epd: 290,
      ce: 210,
    };

    const itens = idsIlustradas
      .map((id) => catalogMap.get(id))
      .filter((item): item is LeiCatalogItem => Boolean(item))
      .map((lei) => {
        const tabelaKey = (lei.tabela_nome || lei.id).toLowerCase();
        const acessosReais = (viewsMap[tabelaKey] || 0) + (viewsMap[lei.id.toLowerCase()] || 0);
        const totalAcessos = acessosReais + (basePonderada[lei.id] || 50);
        return {
          lei,
          totalAcessos,
        };
      });

    return itens.sort((a, b) => b.totalAcessos - a.totalAcessos);
  }, [viewsMap]);

  const activeLeis = useMemo(() => {
    const map = new Map<string, LeiCatalogItem>();
    LEIS_CATALOG.forEach((lei) => map.set(lei.id, lei));
    return selectedIds
      .map((id) => map.get(id))
      .filter((item): item is LeiCatalogItem => Boolean(item));
  }, [selectedIds]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const didInitRef = useRef(false);

  // Triplica para simular loop infinito com fluidez perfeita: [base | base | base]
  const lista = useMemo(() => (activeLeis.length ? [...activeLeis, ...activeLeis, ...activeLeis] : []), [activeLeis]);
  const BASE_LEN = activeLeis.length;

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startScroll: number;
    moved: number;
    pointerId: number;
  } | null>(null);

  const lastOpenRef = useRef(0);

  const tapRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    leiId: string;
    itemIdx: number;
    t: number;
    moved: number;
    startScroll: number;
  } | null>(null);

  // Detecta o item central via scroll
  const updateActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !BASE_LEN) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    const first = el.querySelector<HTMLElement>('[data-cover-item]');
    if (!first) return;
    const startOffset = first.offsetLeft + first.offsetWidth / 2;
    const idx = Math.round((center - startOffset) / STEP);
    const clamped = Math.max(0, Math.min(lista.length - 1, idx));
    setActiveIdx(clamped);
  }, [lista.length, BASE_LEN]);

  // Salta invisivelmente para o bloco central se estiver muito perto das bordas
  const normalizeLoop = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !BASE_LEN) return;
    const items = el.querySelectorAll<HTMLElement>('[data-cover-item]');
    if (items.length < BASE_LEN * 3) return;
    const centerOf = (i: number) =>
      items[i].offsetLeft - (el.clientWidth - items[i].offsetWidth) / 2;
    if (activeIdx < BASE_LEN * 0.5) {
      el.scrollTo({ left: centerOf(activeIdx + BASE_LEN), behavior: 'auto' });
    } else if (activeIdx >= BASE_LEN * 2.5) {
      el.scrollTo({ left: centerOf(activeIdx - BASE_LEN), behavior: 'auto' });
    }
  }, [activeIdx, BASE_LEN]);

  // Inicializa o scroll no meio (bloco central) antes da pintura do browser para evitar snap visual
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || !BASE_LEN || didInitRef.current) return;
    const items = el.querySelectorAll<HTMLElement>('[data-cover-item]');
    if (items.length < BASE_LEN * 3) return;
    const mid = items[BASE_LEN];
    el.scrollTo({
      left: mid.offsetLeft - (el.clientWidth - mid.offsetWidth) / 2,
      behavior: 'auto',
    });
    didInitRef.current = true;
    updateActive();
  }, [BASE_LEN, updateActive, lista.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateActive();
    const onScroll = () => updateActive();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [updateActive]);

  // Normaliza loop quando o usuário para de interagir
  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(normalizeLoop, 200);
    return () => clearTimeout(t);
  }, [paused, activeIdx, normalizeLoop]);

  // Auto-avanço a cada 3.5s (pausa ao interagir)
  useEffect(() => {
    if (paused || lista.length === 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    const id = window.setInterval(() => {
      if (document.querySelector('[role="dialog"],[data-state="open"][data-radix-dialog-content]')) return;
      const next = (activeIdx + 1) % lista.length;
      const target = el.querySelectorAll<HTMLElement>('[data-cover-item]')[next];
      if (target) {
        const left = target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
        el.scrollTo({ left, behavior: 'smooth' });
      }
    }, 3500);
    return () => clearInterval(id);
  }, [paused, activeIdx, lista.length]);

  const onScrollerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setPaused(true);
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTo({ left: scroller.scrollLeft, behavior: 'auto' });
    if (e.pointerType !== 'mouse') return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: 0,
      pointerId: e.pointerId,
    };
  };

  const onScrollerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d?.active || e.pointerId !== d.pointerId) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > 6) {
      if (!el.hasPointerCapture(e.pointerId)) {
        try { el.setPointerCapture(e.pointerId); } catch {}
        el.style.cursor = 'grabbing';
      }
      el.scrollLeft = d.startScroll - dx;
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const el = scrollerRef.current;
    if (el) el.style.cursor = '';
    if (d?.active && el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    setTimeout(() => setPaused(false), 1500);
    if (d) {
      setTimeout(() => {
        if (dragRef.current === d) dragRef.current = null;
      }, 0);
    }
  };

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

        <div className="flex items-center gap-2">
          {/* Controles de navegação para Desktop */}
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const el = scrollerRef.current;
                if (!el || lista.length === 0) return;
                const prev = (activeIdx - 1 + lista.length) % lista.length;
                const target = el.querySelectorAll<HTMLElement>('[data-cover-item]')[prev];
                if (target) {
                  const left = target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
                  el.scrollTo({ left, behavior: 'smooth' });
                }
              }}
              aria-label="Atalho anterior"
              className="w-8 h-8 rounded-full border border-white/10 bg-card hover:bg-neutral-800 flex items-center justify-center text-foreground hover:text-primary transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const el = scrollerRef.current;
                if (!el || lista.length === 0) return;
                const next = (activeIdx + 1) % lista.length;
                const target = el.querySelectorAll<HTMLElement>('[data-cover-item]')[next];
                if (target) {
                  const left = target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
                  el.scrollTo({ left, behavior: 'smooth' });
                }
              }}
              aria-label="Próximo atalho"
              className="w-8 h-8 rounded-full border border-white/10 bg-card hover:bg-neutral-800 flex items-center justify-center text-foreground hover:text-primary transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setModalOpen(true);
            }}
            aria-label="Ver todas as leis em alta"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card hover:bg-neutral-800 px-3.5 py-1.5 text-[12px] font-semibold text-foreground active:scale-[0.96] transition-all shadow-sm cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span>Ver todos</span>
          </button>
        </div>
      </div>

      {/* Carrossel de Atalhos fluido (mesmo motor nativo de Selecionados Para Você) */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 -mt-6">
        <div
          ref={scrollerRef}
          className="overflow-x-auto no-scrollbar snap-x snap-mandatory md:cursor-grab select-none pb-4 pt-6"
          style={{ scrollPaddingInline: sidePad }}
          onPointerDown={onScrollerPointerDown}
          onPointerMove={onScrollerPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => setPaused(false)}
          tabIndex={0}
          aria-label="Carrossel de atalhos de leis em alta"
        >
          <div
            className="flex items-center"
            style={{ gap: `${GAP}px`, paddingInline: sidePad }}
          >
            {lista.map((lei, index) => {
              const LawIcon = getLawIcon(lei.id, lei.tipo);
              const baseColor = getLeiColor(lei.id, lei.tipo);
              const isCenter = index === activeIdx;
              const cardKey = `${lei.id}-${index}`;

              const ilustracao = ILUSTRACOES_LEIS[lei.id] || null;

              const openThis = () => {
                const now = Date.now();
                if (now - lastOpenRef.current < 250) return;
                lastOpenRef.current = now;
                onOpenLei(lei.id);
              };

              return (
                <button
                  key={cardKey}
                  data-cover-item
                  type="button"
                  onMouseEnter={() => {
                    import('@/pages/CategoriaLegislacao').catch(() => {});
                  }}
                  onPointerDown={(e) => {
                    import('@/pages/CategoriaLegislacao').catch(() => {});
                    const sc = scrollerRef.current;
                    if (sc) sc.scrollTo({ left: sc.scrollLeft, behavior: 'auto' });
                    tapRef.current = {
                      pointerId: e.pointerId,
                      x: e.clientX,
                      y: e.clientY,
                      leiId: lei.id,
                      itemIdx: index,
                      t: Date.now(),
                      moved: 0,
                      startScroll: sc?.scrollLeft ?? 0,
                    };
                  }}
                  onPointerMove={(e) => {
                    const t = tapRef.current;
                    if (!t || t.pointerId !== e.pointerId) return;
                    t.moved = Math.max(t.moved, Math.abs(e.clientX - t.x), Math.abs(e.clientY - t.y));
                  }}
                  onPointerUp={(e) => {
                    const t = tapRef.current;
                    tapRef.current = null;
                    if (!t || t.pointerId !== e.pointerId || t.itemIdx !== index) return;
                    const dx = Math.abs(e.clientX - t.x);
                    const dy = Math.abs(e.clientY - t.y);
                    if (dx > 12 || dy > 12) return;
                    const scrolled = Math.abs((scrollerRef.current?.scrollLeft ?? 0) - t.startScroll);
                    if (scrolled > 6) return;
                    if (Date.now() - t.t > 800) return;
                    if ((dragRef.current?.moved ?? 0) > 6) return;
                    e.preventDefault();
                    openThis();
                  }}
                  onPointerCancel={() => {
                    tapRef.current = null;
                  }}
                  onClick={(e) => {
                    if ((dragRef.current?.moved ?? 0) > 6) {
                      e.preventDefault();
                      return;
                    }
                    openThis();
                  }}
                  draggable={false}
                  className={`border-0 w-[124px] sm:w-[136px] h-[106px] sm:h-[114px] shrink-0 snap-center rounded-2xl relative flex flex-col text-left cursor-pointer select-none transition-all duration-300 shadow-md group outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isCenter ? 'scale-105 z-20 shadow-xl' : 'scale-95 opacity-80 z-10'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Fundo com clip para a cor e o ícone de marca d'água */}
                  <div 
                    className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${baseColor} 0%, ${shade(baseColor, -0.3)} 100%)` }}
                  >
                    <LawIcon
                      className="absolute -right-2 -bottom-2 w-16 h-16 sm:w-20 sm:h-20 text-white/[0.15] drop-shadow-md group-hover:scale-105 group-hover:text-white/[0.2] transition-all duration-300"
                      strokeWidth={1.3}
                    />
                    <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10 blur-xl group-hover:bg-white/20 transition-all" />
                  </div>

                  {ilustracao && (
                    <img
                      src={ilustracao}
                      alt={`Ilustração da lei ${lei.sigla}`}
                      className={`absolute -top-3.5 sm:-top-4 right-0 h-[88px] sm:h-[94px] w-auto max-w-none object-contain pointer-events-none z-10 drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)] transition-all duration-300 ${
                        isCenter ? 'scale-105 drop-shadow-[0_10px_18px_rgba(0,0,0,0.65)]' : 'scale-100'
                      }`}
                    />
                  )}

                  {/* Conteúdo visível (Sigla da lei no fundo e ícone no canto superior) */}
                  <div className="relative z-20 flex flex-col justify-between w-full h-full p-2.5 pointer-events-none">
                    <div className="flex justify-between items-start">
                      <LawIcon
                        className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-200"
                        strokeWidth={1.8}
                      />
                    </div>
                    
                    <div className="flex justify-between items-end mt-auto">
                      <div className="flex flex-col">
                        <span className="font-display text-white text-[22px] sm:text-[24px] font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] leading-none">
                          {lei.sigla}
                        </span>
                        {lei.tipo && (
                          <span className="text-white/80 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-0.5">
                            {lei.tipo}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        className="w-3.5 h-3.5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] mb-0.5"
                        strokeWidth={2.4}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Sheet de "Ver Todos" — Ranking de Leis Mais Acessadas (Exclusivo leis com ilustrações) */}
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
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              {/* Sheet container - de baixo para cima */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="relative z-10 w-full sm:max-w-xl bg-[#141416] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
              >
                {/* Drag handle no topo em telas mobile */}
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                      <Flame className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-white text-[17px] font-bold truncate flex items-center gap-2">
                        Leis Mais Acessadas
                      </h3>
                      <p className="font-body text-neutral-400 text-[12px] truncate">
                        Ranking por número de consultas dos estudantes
                      </p>
                    </div>
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

                {/* Lista em Bottom Sheet das Leis com Imagens dos Cards e Ranking */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
                  {rankingLeisComIlustracao.map(({ lei, totalAcessos }, index) => {
                    const LawIcon = getLawIcon(lei.id, lei.tipo);
                    const baseColor = getLeiColor(lei.id, lei.tipo);
                    const ilustracao = ILUSTRACOES_LEIS[lei.id] || null;
                    const posicao = index + 1;

                    return (
                      <button
                        key={lei.id}
                        type="button"
                        onClick={() => {
                          setModalOpen(false);
                          onOpenLei(lei.id);
                        }}
                        className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-[#18181B] hover:bg-[#202024] active:scale-[0.99] border border-white/10 hover:border-white/20 transition-all text-left shadow-sm group relative overflow-hidden"
                      >
                        {/* Posição no Ranking */}
                        <div className="w-7 text-center shrink-0">
                          <span
                            className={`font-display font-black text-[15px] ${
                              posicao === 1
                                ? 'text-amber-400'
                                : posicao === 2
                                ? 'text-slate-300'
                                : posicao === 3
                                ? 'text-amber-600'
                                : 'text-neutral-500'
                            }`}
                          >
                            #{posicao}
                          </span>
                        </div>

                        {/* Miniatura do Card com a Ilustração Original */}
                        <div
                          className="w-16 h-14 rounded-xl relative overflow-hidden shrink-0 flex items-center justify-center shadow-md"
                          style={{
                            background: `linear-gradient(135deg, ${baseColor} 0%, ${shade(baseColor, -0.3)} 100%)`,
                          }}
                        >
                          <LawIcon
                            className="absolute -right-2 -bottom-2 w-10 h-10 text-white/[0.15]"
                            strokeWidth={1.3}
                          />
                          {ilustracao ? (
                            <img
                              src={ilustracao}
                              alt={lei.sigla}
                              className="absolute -top-1.5 right-0 h-14 w-auto max-w-none object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <LawIcon className="w-6 h-6 text-white" strokeWidth={1.8} />
                          )}
                        </div>

                        {/* Informações da Lei */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-[15px] text-white group-hover:text-primary transition-colors truncate">
                              {lei.sigla}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 shrink-0">
                              {lei.tipo}
                            </span>
                          </div>
                          <p className="font-body text-[12.5px] font-medium text-neutral-300 truncate mt-0.5">
                            {lei.nome}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
                              <Eye className="w-3.5 h-3.5 text-primary/80" />
                              <strong className="text-white/90">{totalAcessos.toLocaleString('pt-BR')}</strong> acessos
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="p-3 pb-6 sm:p-4 sm:pb-4 border-t border-white/10 flex items-center justify-between bg-[#141416] shrink-0">
                  <span className="text-[12px] text-neutral-400">
                    <strong className="text-white font-bold">{rankingLeisComIlustracao.length}</strong> legislações em destaque
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-6 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-[13px] active:scale-95 transition shadow-sm cursor-pointer"
                  >
                    Fechar
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
