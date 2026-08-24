import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Landmark, BookOpen, Scale, Gavel, FileText, Shield, ScrollText,
  BookText, Baby, Newspaper, ChevronRight, Gavel as GavelIcon,
  LayoutDashboard, Heart, Columns3, Stamp, Clock, BookMarked, X, Search, Mic, MicOff, HeartOff,
  Home, Sword, Handshake, Briefcase, ShoppingCart, Car, Vote, Trees, Ship, Plane,
  Droplets, Pickaxe, Radio, Users, Accessibility, Building2, Trophy, Sparkles,
  Mountain, Globe2, Store, Ribbon, Palette, Tent, HeartPulse,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import { leiPath } from '@/lib/legislacaoSlugs';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import JurisprudenciaSheet from './JurisprudenciaSheet';

/* ------------------------------------------------------------------ */
/*  Icon / color helpers                                              */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, React.ElementType> = {
  // Constituição
  cf88: Landmark,
  // Códigos — ícone representativo do tema
  cp: Sword,             // Código Penal — arma
  cc: Home,              // Código Civil — casa/família
  cpc: FileText,         // Processo Civil — petição
  cpp: Gavel,            // Processo Penal — martelo do juiz
  ctn: Landmark,         // Tributário — fisco
  cdc: ShoppingCart,     // Consumidor — carrinho
  clt: Briefcase,        // CLT — trabalho
  ctb: Car,              // Trânsito — carro
  ce: Vote,              // Eleitoral — voto
  cpm: Shield,           // Penal Militar — escudo
  cppm: Shield,          // Processo Penal Militar
  cflor: Trees,          // Florestal — árvores
  ccom: Ship,            // Comercial — navegação
  cba: Plane,            // Aeronáutica — avião
  cagua: Droplets,       // Águas — gotas
  cmin: Pickaxe,         // Minas — picareta
  ctel: Radio,           // Telecomunicações — rádio
  // Estatutos
  eca: Baby,             // Criança e Adolescente
  ei: HeartPulse,        // Idoso
  epd: Accessibility,    // Pessoa com Deficiência
  eir: Handshake,        // Igualdade Racial
  ec: Building2,         // Cidade
  ed: Sword,             // Desarmamento
  eoab: Scale,           // OAB
  et: Trophy,            // Torcedor
  ej: Sparkles,          // Juventude
  em: Shield,            // Militares
  eind: Tent,            // Índio
  eterra: Mountain,      // Terra
  emig: Globe2,          // Migração
  eref: Globe2,          // Refugiado
  emet: Building2,       // Metrópole
  emus: Palette,         // Museus
  eme: Store,            // Microempresa
  epc: Ribbon,           // Pessoa com Câncer
  // Diversos
  noticias: Newspaper,
};


const COLOR_MAP: Record<string, string> = {
  cf88: '#22C55E',  // verde vivo
  cp:   '#EF4444',  // vermelho vivo
  cc:   '#3B82F6',  // azul vivo
  cpc:  '#F59E0B',  // âmbar
  cpp:  '#F97316',  // laranja vivo
  ctn:  '#EAB308',  // amarelo/ouro
  cdc:  '#EC4899',  // rosa/pink
  clt:  '#14B8A6',  // teal
  ctb:  '#06B6D4',  // ciano
  ce:   '#8B5CF6',  // roxo
  cpm:  '#64748B',  // slate
  cppm: '#475569',
  cflor:'#16A34A',  // verde floresta
  ccom: '#0EA5E9',  // azul mar
  cba:  '#0284C7',  // azul aéreo
  cagua:'#38BDF8',  // azul água
  cmin: '#A16207',  // dourado escuro
  ctel: '#A855F7',  // violeta
  eca:  '#F472B6',  // rosa
  ei:   '#F87171',  // coral
  epd:  '#60A5FA',  // azul claro
  eir:  '#FB923C',  // laranja claro
  ec:   '#38BDF8',
  ed:   '#DC2626',
  eoab: '#FACC15',
  et:   '#F59E0B',
  ej:   '#EAB308',
  em:   '#94A3B8',
  eind: '#84CC16',
  eterra:'#A3E635',
  emig: '#22D3EE',
  eref: '#2DD4BF',
  emet: '#F472B6',
  emus: '#C084FC',
  eme:  '#FB7185',
  epc:  '#F43F5E',
  noticias: '#60A5FA',
};

const TIPO_COLOR: Record<string, string> = {
  constituicao: '#22C55E',
  codigo: '#3B82F6',
  estatuto: '#EC4899',
  'lei-especial': '#F97316',
  sumula: '#EAB308',
  jurisprudencia: '#F5C542',
};

const FALLBACK_COLORS = ['#22C55E', '#3B82F6', '#EC4899', '#F97316', '#EAB308', '#14B8A6', '#8B5CF6', '#06B6D4', '#EF4444', '#A855F7'];
function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}
function getIcon(id: string, tipo?: string): React.ElementType {
  if (ICON_MAP[id]) return ICON_MAP[id];
  switch (tipo) {
    case 'constituicao': return Landmark;
    case 'codigo': return BookOpen;
    case 'estatuto': return Shield;
    case 'lei-especial': return ScrollText;
    case 'sumula':
    case 'jurisprudencia': return GavelIcon;
    default: return FileText;
  }
}
function getColor(id: string, tipo?: string): string {
  return COLOR_MAP[id] || (tipo && TIPO_COLOR[tipo]) || hashColor(id);
}

/* ------------------------------------------------------------------ */
/*  Favoritos (leis) — persistência local                              */
/* ------------------------------------------------------------------ */

const FAV_LEIS_KEY = 'vacatio-leis-favoritas';

function readFavoritas(): string[] {
  try {
    const raw = localStorage.getItem(FAV_LEIS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}
function writeFavoritas(ids: string[]) {
  try { localStorage.setItem(FAV_LEIS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('vacatio:leis-favoritas-changed')); } catch { /* ignore */ }
}

function useFavoritasLeis() {
  const [ids, setIds] = useState<string[]>(() => readFavoritas());
  useEffect(() => {
    const sync = () => setIds(readFavoritas());
    window.addEventListener('vacatio:leis-favoritas-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('vacatio:leis-favoritas-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const toggle = (id: string) => {
    setIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      writeFavoritas(next);
      return next;
    });
  };
  return { ids, toggle, isFav: (id: string) => ids.includes(id) };
}

/* ------------------------------------------------------------------ */
/*  Display helpers                                                    */
/* ------------------------------------------------------------------ */


/**
 * Para estatutos: remove o prefixo "Estatuto d(a|o|as|os) " e esconde a sigla.
 * Ex.: "Estatuto da Criança e do Adolescente" -> "Criança e do Adolescente"
 * Para outros tipos: mantém "SIGLA — Nome".
 */
function formatLeiDisplayName(nome: string, sigla: string, tipo?: string): string {
  if (tipo === 'estatuto') {
    const cleaned = nome
      .replace(/^Estatuto\s+(d[aoe]s?|Nacional\s+d[aoe]s?)\s+/i, '')
      .replace(/^Estatuto\s+/i, '')
      .trim();
    return cleaned || nome;
  }
  return `${sigla} — ${nome}`;
}



type Mode = 'em-alta' | 'dashboard' | 'favoritos';

const EM_ALTA_IDS = ['cf88', 'cp', 'cc', 'cpc', 'cpp', 'clt', 'cdc', 'ctn'];

interface ListRow {
  id: string;
  sigla: string;
  nome: string;
  descricao?: string;
  tipo?: string;
  color?: string;
}

function leisToRows(leis: LeiCatalogItem[]): ListRow[] {
  return leis.map(l => ({ id: l.id, sigla: l.sigla, nome: l.nome, descricao: l.descricao, tipo: l.tipo }));
}

function emAltaRows(): ListRow[] {
  return EM_ALTA_IDS
    .map(id => LEIS_CATALOG.find(l => l.id === id))
    .filter(Boolean)
    .map(l => ({ id: l!.id, sigla: l!.sigla, nome: l!.nome, descricao: l!.descricao, tipo: l!.tipo }));
}

/* ------------------------------------------------------------------ */
/*  Coleção de leis                                                   */
/* ------------------------------------------------------------------ */

interface CatCard {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  accent: string; // cor apenas do ícone
}

const CAT_PRINCIPAIS: CatCard[] = [
  { id: 'constituicao', label: 'CONSTITUIÇÃO', sublabel: 'CF/88', icon: Landmark, accent: '#22C55E' },
  { id: 'codigo',       label: 'CÓDIGOS',      sublabel: 'Civil, Penal, Processo…', icon: BookMarked, accent: '#60A5FA' },
  { id: 'estatuto',     label: 'ESTATUTOS',    sublabel: 'ECA, Idoso, OAB…', icon: ScrollText, accent: '#F87171' },
  { id: 'jurisprudencia', label: 'JURISPRUDÊNCIA', sublabel: 'STF, STJ e Vinculantes', icon: Gavel, accent: '#F5C542' },
];

const CAT_OUTRAS: CatCard[] = [
  { id: 'lei-especial',   label: 'PENAL ESPECIAL', sublabel: 'Leis penais extravagantes', icon: Scale, accent: '#FB923C' },
  { id: 'lei-ordinaria',  label: 'LEIS ORDINÁRIAS', sublabel: 'Legislação federal complementar', icon: Columns3, accent: '#38BDF8' },
  { id: 'decreto',        label: 'DECRETOS', sublabel: 'Regulamentos do Executivo', icon: Stamp, accent: '#FBBF24' },
  { id: 'previdenciario', label: 'PREVIDENCIÁRIO', sublabel: 'Benefícios e custeio', icon: Clock, accent: '#A78BFA' },
];

const JURISPRUDENCIA_OPCOES = [
  { id: 'STF_VINCULANTE', nome: 'Súmulas Vinculantes', desc: 'Efeito vinculante para o Judiciário' },
  { id: 'STF', nome: 'Súmulas do STF', desc: 'Supremo Tribunal Federal' },
  { id: 'STJ', nome: 'Súmulas do STJ', desc: 'Superior Tribunal de Justiça' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  onSelect?: (id: string) => void;
  onPersonalizarOpen?: (open: boolean) => void;
}

const AtalhosCarousel = ({ onSelect }: Props) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('dashboard');
  const [jurisprudenciaOpen, setJurisprudenciaOpen] = useState(false);
  const [pickerTipo, setPickerTipo] = useState<string | null>(null);
  const [sweepKey, setSweepKey] = useState(0);
  const { ids: favIds, toggle: toggleFav, isFav } = useFavoritasLeis();

  // Reflexo em cascata: reinicia em todos os ícones da Coleção a cada ciclo
  useEffect(() => {
    if (mode !== 'dashboard') return;
    const id = setInterval(() => setSweepKey(k => k + 1), 9000);
    return () => clearInterval(id);
  }, [mode]);

  const rows = useMemo<ListRow[]>(() => {
    if (mode === 'em-alta') return emAltaRows();
    if (mode === 'favoritos') {
      return leisToRows(
        favIds
          .map(id => LEIS_CATALOG.find(l => l.id === id))
          .filter((l): l is LeiCatalogItem => Boolean(l))
      );
    }
    return [];
  }, [mode, favIds]);

  // Todos os tipos com múltiplas leis abrem picker sheet (inclui Códigos agora).
  const PICKER_TIPOS = new Set(['codigo', 'estatuto', 'lei-especial', 'previdenciario', 'lei-ordinaria', 'decreto']);

  const openLeiDireta = (leiId: string) => {
    const lei = LEIS_CATALOG.find(l => l.id === leiId);
    if (!lei) return;
    if (onSelect) { onSelect(leiId); return; }
    navigate(leiPath(lei));
  };

  const handleCategoryClick = (id: string) => {
    if (id === 'jurisprudencia') { navigate('/jurisprudencia'); return; }
    if (id === 'constituicao') { openLeiDireta('cf88'); return; }
    if (PICKER_TIPOS.has(id)) { setPickerTipo(id); return; }
    if (onSelect) onSelect(id);
    else navigate(`/legislacao/${id}`);
  };

  const openTribunal = (tribunalId: string) => {
    setJurisprudenciaOpen(false);
    const slug =
      tribunalId === 'STF_VINCULANTE' ? 'sumulas-vinculantes'
      : tribunalId === 'STJ' ? 'sumulas-stj'
      : 'sumulas-stf';
    navigate(`/jurisprudencia/${slug}`);
  };

  const MODES: { id: Mode; label: string; icon: React.ElementType; big?: boolean }[] = [
    { id: 'em-alta',   label: 'Em alta',   icon: Flame },
    { id: 'dashboard', label: 'Coleção', icon: Landmark, big: true },
    { id: 'favoritos', label: 'Favoritos', icon: Heart },
  ];

  const HEADER_CONFIG: Record<Mode, { title: string; icon: React.ElementType; desc: string; color: string }> = {
    'em-alta':   { title: 'Em alta',   icon: Flame,    desc: 'As normas mais consultadas pelos estudantes', color: '#F97316' },
    'dashboard': { title: 'Coleção',   icon: Landmark, desc: 'Explore por tipo de norma',                  color: 'hsl(var(--primary))' },
    'favoritos': { title: 'Favoritos', icon: Heart,    desc: 'Suas leis salvas para acesso rápido',        color: '#EF4444' },
  };

  const header = HEADER_CONFIG[mode];
  const HeaderIcon = header.icon;

  return (
    <section className="space-y-5 bg-card/40 rounded-none sm:rounded-3xl shadow-2xl shadow-black/15 overflow-hidden">
      <div className="px-3 sm:px-5 py-4 sm:py-5 space-y-5">
      {/* Header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex items-center gap-3 px-1"
        >
          <FrostedIcon icon={HeaderIcon} color={header.color} size="sm" />
          <div className="min-w-0">
            <h2 className="font-display text-[17px] sm:text-lg text-foreground leading-tight font-semibold tracking-[0.06em]">{header.title}</h2>
            <p className="text-muted-foreground text-[11px] sm:text-xs font-body leading-tight">
              {header.desc}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Segmented toggle */}
      <div className="relative w-full rounded-2xl bg-secondary/60 border border-border/60 p-1.5 lg:p-1 flex items-center gap-1.5 lg:gap-1 shadow-md shadow-black/5">
        {MODES.map(m => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              aria-pressed={isActive}
              className={`relative flex items-center justify-center gap-1.5 rounded-xl font-body font-semibold transition-colors
                ${m.big ? 'flex-[1.25] py-2.5 lg:py-1.5 text-[15px] sm:text-[16px] lg:text-[13.5px]' : 'flex-1 py-2 lg:py-1.5 text-[13.5px] sm:text-[14.5px] lg:text-[13px]'}
                ${isActive ? 'text-primary-foreground' : 'text-foreground/70 hover:text-foreground'}`}
            >
              {isActive && (
                <motion.span
                  layoutId="mode-toggle-indicator"
                  className="absolute inset-0 rounded-xl bg-primary shadow-lg shadow-primary/30"
                  transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.6 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className={m.big ? 'w-[18px] h-[18px] lg:w-4 lg:h-4' : 'w-4 h-4 lg:w-[14px] lg:h-[14px]'} strokeWidth={2} />
                {m.label}
              </span>
            </button>
          );
        })}
      </div>




      {/* Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {mode === 'dashboard' && (
            <DashboardPanel onSelect={handleCategoryClick} sweepKey={sweepKey} />
          )}

          {mode === 'em-alta' && (
            <LeisList
              rows={rows}
              isFav={isFav}
              onToggleFav={toggleFav}
              onSelect={openLeiDireta}
              emptyText="Nenhuma lei em alta no momento."
            />
          )}

          {mode === 'favoritos' && (
            rows.length === 0
              ? <EmptyFavoritos />
              : <LeisList
                  rows={rows}
                  isFav={isFav}
                  onToggleFav={toggleFav}
                  onSelect={openLeiDireta}
                  emptyText=""
                />
          )}

        </motion.div>
      </AnimatePresence>

      {/* Jurisprudência bottom sheet */}
      <AnimatePresence>
        {jurisprudenciaOpen && (
          <JurisprudenciaSheet
            open={jurisprudenciaOpen}
            onClose={() => setJurisprudenciaOpen(false)}
          />
        )}
      </AnimatePresence>

      </div>

      {/* Picker genérico por tipo (Códigos, Estatutos, Penal Especial, etc.) */}
      <AnimatePresence>
        {pickerTipo && (() => {
          const cat = [...CAT_PRINCIPAIS, ...CAT_OUTRAS].find(c => c.id === pickerTipo);
          const Icon = cat?.icon ?? BookMarked;
          const accent = cat?.accent ?? '#60A5FA';
          return (
            <CategoryPickerSheet
              tipo={pickerTipo}
              label={cat?.label ?? ''}
              Icon={Icon}
              accent={accent}
              isFav={isFav}
              onToggleFav={toggleFav}
              favIds={favIds}
              onClose={() => setPickerTipo(null)}
              onSelectLei={(leiId) => { setPickerTipo(null); openLeiDireta(leiId); }}
            />
          );
        })()}
      </AnimatePresence>
    </section>
  );

};

export default AtalhosCarousel;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function DashboardPanel({ onSelect, sweepKey }: { onSelect: (id: string) => void; sweepKey?: string | number }) {
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mx-auto w-full max-w-5xl">

        {CAT_PRINCIPAIS.map((c, i) => (
          <CategoryCard key={c.id} card={c} index={i} onClick={() => onSelect(c.id)} sweepKey={sweepKey} />
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="h-px flex-1 bg-border/60" />
          <h3 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-wide">Outras Coleções</h3>
          <div className="h-px flex-1 bg-border/60" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mx-auto w-full max-w-5xl">
          {CAT_OUTRAS.map((c, i) => (
            <CategoryCard key={c.id} card={c} index={i + CAT_PRINCIPAIS.length} onClick={() => onSelect(c.id)} sweepKey={sweepKey} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FrostedIcon({
  icon: Icon, color, size = 'md', sweep = false, sweepIndex = 0, sweepCount = 8, sweepStagger = false, sweepKey,
}: {
  icon: React.ElementType;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  sweep?: boolean;
  sweepIndex?: number;
  sweepCount?: number;
  sweepStagger?: boolean;
  sweepKey?: string | number;
}) {
  const px = size === 'sm' ? 28 : size === 'md' ? 34 : 42;
  const delay = sweepStagger ? 0.12 + sweepIndex * 0.12 : 0.2;
  return (
    <div
      className="relative shrink-0 shimmer-icon-wrap"
      style={{ width: px, height: px }}
    >
      {/* Sombra preta difusa que vaza sobre o card */}
      <div
        aria-hidden
        className="absolute -inset-3 rounded-full blur-2xl opacity-60 pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,0.55), transparent 72%)' }}
      />
      <Icon
        className="absolute inset-0 w-full h-full"
        style={{
          color,
          filter: 'saturate(1.35) brightness(1.15) drop-shadow(0 2px 8px rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(0,0,0,0.35))',
        }}
        strokeWidth={1.6}
      />
      {sweep && (
        <Icon
          key={sweepKey ?? 'sweep'}
          aria-hidden
          className="absolute inset-0 w-full h-full shimmer-icon-sweep pointer-events-none"
          style={{ color: '#ffffff', animationDelay: `${delay}s` }}
          strokeWidth={1.6}
        />
      )}
    </div>
  );
}


function CategoryCard({
  card, index, onClick, compact = false, sweepKey,
}: { card: CatCard; index: number; onClick: () => void; compact?: boolean; sweepKey?: string | number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 280, damping: 24 }}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden border border-border/60 hover:border-primary/40 active:scale-[0.98] transition-all text-left bg-secondary/60 hover:bg-secondary/80 shadow-lg shadow-black/10 hover:shadow-2xl hover:shadow-primary/15"
    >
      {/* Sombra preta sobreposta ao card, vindo do ícone */}
      <div
        aria-hidden
        className="absolute -top-6 -left-6 w-28 h-28 rounded-full blur-3xl opacity-35 group-hover:opacity-50 pointer-events-none transition-opacity duration-500"
        style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,0.55), transparent 70%)' }}
      />
      <div className={`relative flex flex-col ${compact ? 'p-3.5 min-h-[90px]' : 'p-4 min-h-[108px]'}`}>
        <div className="flex items-start justify-between">
          <FrostedIcon
            icon={card.icon}
            color={card.accent}
            size={compact ? 'sm' : 'md'}
            sweep
            sweepIndex={index}
            sweepCount={8}
            sweepStagger
            sweepKey={sweepKey}
          />
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>
        <div className="mt-auto pt-3">
          <p
            className={`font-body font-semibold leading-snug text-foreground ${compact ? 'text-[14px]' : 'text-[16px]'}`}
          >
            {card.label}
          </p>
          <p
            className={`font-body leading-snug mt-1 text-muted-foreground ${compact ? 'text-[10.5px]' : 'text-[11.5px]'}`}
          >
            {card.sublabel}
          </p>
        </div>
      </div>
    </motion.button>
  );
}


function LeisList({
  rows, isFav, onToggleFav, onSelect, emptyText,
}: {
  rows: ListRow[];
  isFav: (id: string) => boolean;
  onToggleFav: (id: string) => void;
  onSelect: (id: string) => void;
  emptyText: string;
}) {
  if (rows.length === 0 && emptyText) {
    return <p className="text-muted-foreground text-sm font-body py-8 text-center">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row, i) => {
        const Icon = getIcon(row.id, row.tipo);
        const color = row.color || getColor(row.id, row.tipo);
        const tag = row.sigla.toUpperCase();
        const fav = isFav(row.id);
        return (
          <motion.li
            key={row.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.025, duration: 0.22, ease: 'easeOut' }}
          >
            <div className="group relative flex items-stretch gap-3 sm:gap-4 pr-3 sm:pr-4 rounded-2xl bg-card/40 border border-border/60 hover:border-primary/40 transition-all overflow-hidden shadow-lg shadow-black/10 hover:shadow-2xl hover:shadow-primary/15">
              <button
                onClick={() => onSelect(row.id)}
                className="flex-1 flex items-stretch gap-3 sm:gap-4 text-left active:scale-[0.99] transition-transform min-w-0"
              >
                <div
                  className="relative w-[86px] sm:w-[96px] md:w-[112px] lg:w-[128px] shrink-0 overflow-hidden flex flex-col items-center justify-center"
                  style={{
                    background: `linear-gradient(155deg, ${color} 0%, ${color}E6 45%, ${color}99 100%)`,
                    boxShadow: 'inset 0 0 0 1px rgba(255,215,120,0.28), inset 0 -1px 0 rgba(0,0,0,0.35)',
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.35),transparent_65%)]" />
                  <div className="absolute top-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
                  <Icon className="relative w-4 h-4 text-white/70 mt-2" strokeWidth={2} />
                  <span
                    className="relative font-display font-bold text-white tracking-wider leading-none mt-1"
                    style={{
                      fontSize: tag.length <= 3 ? '1.9rem' : tag.length <= 5 ? '1.35rem' : '1.05rem',
                      textShadow: '0 1px 0 rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35)',
                    }}
                  >
                    {tag}
                  </span>
                  <span className="relative w-1 h-1 rounded-full bg-amber-200/70 mt-1.5 mb-2" style={{ boxShadow: '0 0 6px rgba(255,215,120,0.6)' }} />
                </div>
                <div className="flex-1 min-w-0 py-4 sm:py-5">
                  <p className="font-display text-[15px] sm:text-[17px] font-semibold text-foreground leading-snug uppercase" style={{ letterSpacing: '0.06em' }}>
                    {row.nome}
                  </p>
                  <p className="font-body text-[12px] sm:text-[13px] text-muted-foreground leading-snug mt-1.5 sm:mt-2">
                    {row.descricao || 'Acesse a norma completa'}
                  </p>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFav(row.id); }}
                aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className="self-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center shrink-0 hover:bg-primary/20 hover:border-primary/50 transition-colors"
              >
                <Heart
                  className={`w-4 h-4 sm:w-[18px] sm:h-[18px] transition-colors ${fav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                />
              </button>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}

function EmptyFavoritos() {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/30 p-8 text-center shadow-md shadow-black/5">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
        <HeartOff className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-display text-base font-semibold text-foreground mt-4">Nenhuma lei favoritada</h3>
      <p className="font-body text-[12.5px] text-muted-foreground mt-1.5 max-w-[280px] mx-auto leading-snug">
        Toque no coração em qualquer lei (na aba <span className="text-foreground font-semibold">Em alta</span> ou dentro de uma coleção) para salvá-la aqui.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category picker sheet — busca + mic + Todos/Favoritos             */
/* ------------------------------------------------------------------ */

function CategoryPickerSheet({
  tipo, label, Icon, accent, isFav, onToggleFav, favIds, onClose, onSelectLei,
}: {
  tipo: string;
  label: string;
  Icon: React.ElementType;
  accent: string;
  isFav: (id: string) => boolean;
  onToggleFav: (id: string) => void;
  favIds: string[];
  onClose: () => void;
  onSelectLei: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'todos' | 'favoritos'>('todos');
  const inputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput((text) => setQuery((prev) => (prev ? prev + ' ' : '') + text));

  const base = useMemo(() => LEIS_CATALOG.filter(l => l.tipo === tipo), [tipo]);
  const scoped = useMemo(
    () => (scope === 'favoritos' ? base.filter(l => favIds.includes(l.id)) : base),
    [base, scope, favIds]
  );
  const filtered = useFuzzySearch(scoped, query, {
    keys: ['nome', 'sigla', 'descricao'],
    threshold: 0.35,
    limit: 100,
  });

  // Não focar automaticamente para não abrir o teclado ao abrir o sheet

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-[90] bg-card border-t border-border rounded-t-3xl pb-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] h-[88vh] flex flex-col overflow-hidden"
      >
        {/* Cabeçalho fixo 100% ofuscado */}
        <div className="sticky top-0 z-10 bg-card backdrop-blur-xl border-b border-border/40 shrink-0">
          <div className="flex items-center justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between px-5 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <FrostedIcon icon={Icon} color={accent} size="sm" />
              <div className="min-w-0">
                <h3 className="font-display text-lg text-foreground font-bold leading-none truncate">{label}</h3>
                <p className="text-muted-foreground text-[11px] font-body mt-0.5">Escolha uma lei</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Barra de busca com mic transbordante */}
          <div className="px-4 pb-3 pt-1 pr-6">
            <div className={`relative flex items-center gap-2 rounded-2xl border transition-colors pl-3 pr-14 h-12
              ${voice.listening
                ? 'bg-background border-primary/70 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]'
                : 'bg-background/80 border-border/70 focus-within:border-primary/60 focus-within:bg-background'}`}
            >
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />

              <input
                ref={inputRef}
                value={voice.listening ? voice.partial : query}
                onChange={(e) => setQuery(e.target.value)}
                readOnly={voice.listening}
                placeholder={voice.listening ? 'Ouvindo…' : 'Pesquise por nome, sigla ou nº'}
                className={`flex-1 bg-transparent outline-none text-[14px] font-body text-foreground placeholder:text-muted-foreground/70 ${voice.listening ? 'caret-transparent' : ''}`}
              />
              {voice.listening && (
                <span
                  aria-hidden
                  className="inline-block w-[2px] h-4 bg-primary animate-pulse rounded-full -ml-1 shrink-0"
                />
              )}

              {query && !voice.listening && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Limpar"
                  className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}

              {/* Mic FAB - só pulsa quando gravando */}
              <button
                onClick={voice.toggle}
                aria-label={voice.listening ? 'Parar gravação' : 'Ditar por voz'}
                className={`absolute -right-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all
                  ${voice.listening
                    ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/50 animate-pulse'
                    : 'bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:brightness-110 active:scale-95'}`}
              >
                {voice.listening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping" />
                    <span className="absolute inset-[-6px] rounded-full border-2 border-primary/40 animate-pulse" />
                  </>
                )}
                {voice.listening ? <MicOff className="w-5 h-5 relative" /> : <Mic className="w-5 h-5 relative" />}
              </button>
            </div>
          </div>


          {/* Toggle Todos / Favoritos */}
          <div className="px-4 pb-3">
            <div className="relative w-full rounded-xl bg-secondary/60 border border-border/60 p-1 flex items-center gap-1">
              {(['todos', 'favoritos'] as const).map(s => {
                const active = scope === s;
                return (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12.5px] font-body font-semibold transition-colors
                      ${active ? 'text-primary-foreground' : 'text-foreground/70 hover:text-foreground'}`}
                  >
                    {active && (
                      <motion.span
                        layoutId={`picker-scope-${tipo}`}
                        className="absolute inset-0 rounded-lg bg-primary shadow shadow-primary/25"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative flex items-center gap-1.5">
                      {s === 'todos' ? <BookMarked className="w-3.5 h-3.5" /> : <Heart className="w-3.5 h-3.5" />}
                      {s === 'todos' ? 'Todos' : 'Favoritos'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>


        {/* Lista */}
        <div className="px-4 pt-1 pb-4 flex flex-col gap-2.5 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              {scope === 'favoritos'
                ? 'Nenhuma lei favoritada nesta coleção.'
                : 'Nenhuma lei encontrada.'}
            </p>
          )}
          {filtered.map((lei, i) => {
            const fav = isFav(lei.id);
            const ItemIcon = getIcon(lei.id, lei.tipo);
            const itemColor = getColor(lei.id, lei.tipo);
            return (
              <motion.div
                key={lei.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.03 }}
                className="group flex items-center gap-2 rounded-xl bg-secondary/60 border border-border hover:border-primary/50 hover:bg-secondary transition-all shadow-sm shadow-black/5 hover:shadow-md hover:shadow-primary/10"
              >
                <button
                  onClick={() => onSelectLei(lei.id)}
                  className="flex-1 flex items-center gap-3 px-3.5 py-5 text-left min-w-0 min-h-[76px]"
                >
                  <FrostedIcon icon={ItemIcon} color={itemColor} size="sm" sweep sweepIndex={i} sweepStagger />

                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[14.5px] font-bold text-foreground leading-tight truncate">
                      {formatLeiDisplayName(lei.nome, lei.sigla, tipo)}
                    </p>
                    <p className="font-body text-[12px] text-muted-foreground leading-snug mt-1 line-clamp-2">
                      {lei.descricao}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFav(lei.id); }}
                  aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  className="mr-2 w-9 h-9 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center shrink-0 hover:bg-primary/20 hover:border-primary/50 transition-colors"
                >
                  <Heart className={`w-4 h-4 transition-colors ${fav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
