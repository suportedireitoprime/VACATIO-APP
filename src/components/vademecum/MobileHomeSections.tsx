import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { getRecentes, LEIS_RECENTES_EVENT, pushRecente, isUuidLike, cleanArtigoNumero } from '@/lib/leisRecentes';
import { getCachedArtigos } from '@/services/legislacaoService';
import {
  Accessibility, Baby, Banknote, BookMarked, Briefcase, BriefcaseBusiness, Building,
  Cannabis, Car, ChevronDown, ChevronRight, CircleDollarSign, Clock, Columns3, Cross, Drama,
  Droplets, Factory, FileCheck, FileLock, FilePlus, FileText, FileWarning, Flame, Gavel,
  Globe, GraduationCap, HandCoins, Handshake, HeartPulse, Hospital, House, IdCard,
  Landmark, LandPlot, LayoutGrid, Leaf, List, Map, Mic, MicOff, Network, NotebookPen,
  PiggyBank, Plane, PocketKnife, RadioTower, ReceiptText, Scale, Scroll, ScrollText, Search,
  Shield, ShieldAlert, ShieldCheck, ShieldX, Ship, ShoppingCart, Siren, Sprout, Stamp, Store,
  Tractor, TreePine, Users, Vote, Wallet, Wifi, X, MessageCircle, BookOpen, Heart, ArrowRight, Sparkles, Crown, History, type LucideIcon,
} from 'lucide-react';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { ESTADOS } from '@/pages/LegislacaoEstadual';

import { PillarIcon } from '@/components/icons/PillarIcon';
import { leiPath, tipoToSlug, leiToSlug } from '@/lib/legislacaoSlugs';
import { getLeiColor, shade } from '@/lib/leiTheme';

import { getFavoritos, toggleFavorito, LEIS_FAVORITOS_EVENT } from '@/lib/leisFavoritos';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import VoiceCaptureOverlay from './VoiceCaptureOverlay';

import HomeAtalhosLeisCarousel from './HomeAtalhosLeisCarousel';
import HomeCard from './HomeCard';
import JurisprudenciaSheet from './JurisprudenciaSheet';
import { bandeiraUF } from '@/data/estadoFlags';

interface Cat {
  id: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: string;
}

const GRID_CATS: Cat[] = [
  { id: 'constituicao',    label: 'CONSTITUIÇÃO',    sublabel: 'CF/88',                     icon: Landmark,   color: '#FACC15' },
  { id: 'codigo',          label: 'CÓDIGOS',         sublabel: 'Civil, Penal, Processo…',   icon: Gavel,      color: '#F87171' },
  { id: 'estatuto',        label: 'ESTATUTOS',       sublabel: 'ECA, Idoso, OAB…',          icon: BookMarked, color: '#3B82F6' },
  { id: 'jurisprudencia',  label: 'JURISPRUDÊNCIA',  sublabel: 'STF, STJ, Vinculantes',     icon: ScrollText, color: '#EC4899' },
  { id: 'lei-ordinaria',   label: 'LEIS ORDINÁRIAS', sublabel: 'Federais complementares',   icon: Columns3,   color: '#38BDF8' },
  { id: 'lei-especial',    label: 'PENAL ESPECIAL',  sublabel: 'Leis penais extravagantes', icon: Scale,      color: '#FB923C' },
];

/** Estatutos em destaque */
const ESTATUTOS_LIST: Array<{
  id: string;
  leiId: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: string;
}> = [
  { id: 'estatuto-eoab', leiId: 'eoab', label: 'OAB', sublabel: 'Estatuto da Advocacia · Lei 8.906/94', icon: Scale, color: '#F59E0B' },
  { id: 'estatuto-eca', leiId: 'eca', label: 'ECA', sublabel: 'Criança e Adolescente · Lei 8.069/90', icon: Baby, color: '#10B981' },
  { id: 'estatuto-ei', leiId: 'ei', label: 'IDOSO', sublabel: 'Estatuto da Pessoa Idosa · Lei 10.741/03', icon: HeartPulse, color: '#8B5CF6' },
  { id: 'estatuto-epd', leiId: 'epd', label: 'PCD', sublabel: 'Pessoa com Deficiência · Lei 13.146/15', icon: Accessibility, color: '#06B6D4' },
];

// Cards de "Outras normas" que apontam para o Radar 360 com filtro pré-selecionado
type RadarCat = Cat & { radarTipo: string; normaSlug: string };
const RADAR_CATS: RadarCat[] = [
  { id: 'radar-lei',       label: 'Ordinárias',          sublabel: 'Leis ordinárias publicadas no DOU',   icon: Scroll,     color: '#FACC15', radarTipo: 'Lei',                normaSlug: 'leis' },
  { id: 'radar-lc',        label: 'Complementares',      sublabel: 'Complementares à Constituição',       icon: ScrollText, color: '#F59E0B', radarTipo: 'Lei Complementar',   normaSlug: 'leis-complementares' },
  { id: 'radar-decreto',   label: 'Decretos',            sublabel: 'Regulamentos do Executivo',           icon: Stamp,      color: '#FBBF24', radarTipo: 'Decreto',            normaSlug: 'decretos' },
  { id: 'radar-mp',        label: 'Medidas Provisórias', sublabel: 'Editadas pelo Presidente',            icon: FileWarning,color: '#FB923C', radarTipo: 'Medida Provisória',  normaSlug: 'medidas-provisorias' },
];

const LIST_CATS: Cat[] = [
  { id: 'decreto',         label: 'Decretos (Coleção)', sublabel: 'Regulamentos do Executivo', icon: Stamp,      color: '#FBBF24' },
];

const ALL_CATS: Cat[] = [...GRID_CATS, ...LIST_CATS];

interface AreaCat extends Cat { leiIds: string[]; }

const AREA_CATS: AreaCat[] = [
  { id: 'area-penal',          label: 'Penal',          sublabel: 'Crimes e execução penal',             icon: ShieldAlert, color: '#EF4444', leiIds: ['cp','cpp','lep','lmp','ld','loc','laa','lcp','lch','ltort','lcsf','lpt','laa'] },
  { id: 'area-civil',          label: 'Civil',          sublabel: 'Pessoas, contratos e família',        icon: House,       color: '#3B82F6', leiIds: ['cc','li','lrp','lalim','lalp','lgpd','mci','ld','laa'] },
  { id: 'area-tributario',     label: 'Tributário',     sublabel: 'Tributos e finanças públicas',        icon: CircleDollarSign, color: '#10B981', leiIds: ['ctn','lrf','lrt'] },
  { id: 'area-constitucional', label: 'Constitucional', sublabel: 'Normas e direitos fundamentais',     icon: Landmark,    color: '#FACC15', leiIds: ['cf88','lindb','lpaf','lai','lap','lap','lmi','lms','lhd'] },
  { id: 'area-processual-civil',  label: 'Processual Civil',  sublabel: 'Prazos, recursos e ritos cíveis', icon: FileText,    color: '#F59E0B', leiIds: ['cpc','lje','lms','lmi','lhd'] },
  { id: 'area-processual-penal',  label: 'Processual Penal',  sublabel: 'Investigação, ritos e recursos',  icon: ShieldCheck, color: '#F97316', leiIds: ['cpp','lit','lpt','lms'] },
  { id: 'area-trabalho',       label: 'Trabalho',       sublabel: 'Relações de emprego e direitos',      icon: Briefcase,   color: '#8B5CF6', leiIds: ['clt'] },
  { id: 'area-empresarial',    label: 'Empresarial',    sublabel: 'Sociedades e direito empresarial',    icon: Store,       color: '#A855F7', leiIds: ['ccom','lsa','lf','la','lpi','lace','lcon','lppp','lmls','lda','eme','lfl'] },
  { id: 'area-administrativo', label: 'Administrativo', sublabel: 'Servidores e gestão pública',        icon: Building,    color: '#06B6D4', leiIds: ['lia','lpaf','nll','lai','lms','l8112','loman','lotcu','ces'] },
  { id: 'area-eleitoral',      label: 'Eleitoral',      sublabel: 'Partidos e processo eleitoral',       icon: Vote,        color: '#6366F1', leiIds: ['ce','lpp','lele','lfl','line'] },
  { id: 'area-previdenciario', label: 'Previdenciário', sublabel: 'Benefícios e seguridade social',     icon: HeartPulse,  color: '#14B8A6', leiIds: ['lbps','lcss','lpc','loas'] },
  { id: 'area-ambiental',      label: 'Ambiental',      sublabel: 'Meio ambiente e sustentabilidade',    icon: TreePine, color: '#16A34A', leiIds: ['cflor','lca','lbio'] },
  { id: 'area-consumidor',     label: 'Consumidor',     sublabel: 'Direitos e relações de consumo',      icon: ShoppingCart, color: '#EC4899', leiIds: ['cdc'] },
  { id: 'area-crianca-idoso',  label: 'Criança, Idoso e PCD', sublabel: 'Proteção integral e inclusão',  icon: Baby,        color: '#F43F5E', leiIds: ['eca','ei','epd'] },
  { id: 'area-militar',        label: 'Militar',        sublabel: 'Direito e processo penal militar',    icon: Shield,      color: '#64748B', leiIds: ['cpm','cppm','em'] },
  { id: 'area-internacional',  label: 'Internacional',  sublabel: 'Tratados e migração',                 icon: Globe,       color: '#0891B2', leiIds: ['emig','eref'] },
];

interface CategoriaFormal extends Cat { route?: string; leiIds?: string[]; }

const CATEGORIA_CATS: CategoriaFormal[] = [
  { id: 'cat-federais',      label: 'Leis Federais',      sublabel: 'Constituição, códigos e estatutos', icon: ScrollText, color: '#FACC15', leiIds: LEIS_CATALOG.map(l => l.id) },
  { id: 'cat-estadual',      label: 'Legislação Estadual', sublabel: '27 unidades federativas',           icon: Map,        color: '#38BDF8', route: '/legislacao-estadual' },
  { id: 'cat-jurisprudencia',label: 'Jurisprudência',      sublabel: 'Súmulas e precedentes',             icon: Gavel,      color: '#EC4899' },
  { id: 'cat-oab',           label: 'OAB',                 sublabel: 'Estatuto, ética e advocacia',       icon: Scale,      color: '#1D4ED8' },
  { id: 'cat-decretos',      label: 'Decretos',            sublabel: 'Regulamentos do Poder Executivo',   icon: Stamp,      color: '#FBBF24', route: '/normas/decretos' },
];

/** Metadados enriquecidos para as Constituições do Brasil */
const CONSTITUICAO_META: Record<string, { ano: string; titulo: string; subtitulo: string; isAtual?: boolean }> = {
  cf88: {
    ano: '1988',
    titulo: 'Constituição de 1988',
    subtitulo: 'Constituição Cidadã · Promulgada em 5 de outubro',
    isAtual: true,
  },
  cf1969: {
    ano: '1969',
    titulo: 'Constituição de 1969',
    subtitulo: 'Emenda Constitucional nº 1/1969 · Regime Militar',
  },
  cf1967: {
    ano: '1967',
    titulo: 'Constituição de 1967',
    subtitulo: 'Constituição do Brasil de 1967 · Regime Militar',
  },
  cf1946: {
    ano: '1946',
    titulo: 'Constituição de 1946',
    subtitulo: 'Estados Unidos do Brasil · Redemocratização',
  },
  cf1937: {
    ano: '1937',
    titulo: 'Constituição de 1937',
    subtitulo: 'A "Polaca" · Estado Novo de Getúlio Vargas',
  },
  cf1934: {
    ano: '1934',
    titulo: 'Constituição de 1934',
    subtitulo: 'Segunda República · Voto feminino e direitos sociais',
  },
  cf1891: {
    ano: '1891',
    titulo: 'Constituição de 1891',
    subtitulo: 'Primeira República · Marechal Deodoro da Fonseca',
  },
  cf1824: {
    ano: '1824',
    titulo: 'Constituição de 1824',
    subtitulo: 'Constituição Política do Império · Dom Pedro I',
  },
};

const CATEGORIA_CARDS: AreaCat[] = [
  {
    id: 'cat-cf',
    label: 'Constituição',
    sublabel: 'Constituições do Brasil (1824 a 1988)',
    icon: Landmark,
    color: '#FACC15',
    leiIds: LEIS_CATALOG.filter(l => l.tipo === 'constituicao').map(l => l.id),
  },
  { id: 'cat-codigo', label: 'Códigos', sublabel: 'Principais códigos nacionais', icon: BookOpen, color: '#3B82F6', leiIds: LEIS_CATALOG.filter(l => l.tipo === 'codigo').map(l => l.id) },
  { id: 'cat-estatuto', label: 'Estatutos', sublabel: 'Principais estatutos nacionais', icon: Shield, color: '#10B981', leiIds: LEIS_CATALOG.filter(l => l.tipo === 'estatuto').map(l => l.id) },
  { id: 'cat-oab', label: 'OAB & Advocacia', sublabel: 'Normas e ética da advocacia', icon: Scale, color: '#1D4ED8', leiIds: ['ced2015', 'ced1995', 'eoab', 'reg_oab', 'prov205', 'prov188', 'prov112', 'prov144', 'res02', 'res01'] },
  { id: 'cat-lei', label: 'Ordinárias', sublabel: 'Legislação ordinária federal', icon: FileText, color: '#F59E0B', leiIds: LEIS_CATALOG.filter(l => l.tipo === 'lei-especial' && !l.descricao.includes('Decreto') && !l.descricao.includes('Complementar') && !l.descricao.includes('LC')).map(l => l.id) },
  { id: 'cat-lei-complementar', label: 'Complementares', sublabel: 'Legislação complementar federal', icon: FilePlus, color: '#8B5CF6', leiIds: LEIS_CATALOG.filter(l => l.descricao.includes('Complementar') || l.descricao.includes('LC nº')).map(l => l.id) },
  { id: 'cat-decreto', label: 'Decretos', sublabel: 'Regulamentos do Poder Executivo', icon: Stamp, color: '#06B6D4', leiIds: LEIS_CATALOG.filter(l => l.descricao.includes('Decreto nº') && !l.descricao.includes('Decreto-Lei')).map(l => l.id) },
  { id: 'cat-decreto-lei', label: 'Decretos-Leis', sublabel: 'Atos com força de lei', icon: Stamp, color: '#F97316', leiIds: LEIS_CATALOG.filter(l => l.descricao.includes('Decreto-Lei')).map(l => l.id) },
  { id: 'cat-mp', label: 'Medidas Provisórias', sublabel: 'Medidas do Poder Executivo', icon: FileWarning, color: '#EF4444', leiIds: LEIS_CATALOG.filter(l => l.descricao.includes('Medida Provisória') || l.descricao.includes('MPv')).map(l => l.id) },
  { id: 'cat-leis-especiais', label: 'Leis Especiais', sublabel: 'Legislação extravagante e especial', icon: BookMarked, color: '#EC4899', leiIds: LEIS_CATALOG.filter(l => l.tipo === 'lei-especial' || l.tipo === 'previdenciario').map(l => l.id) },
];

const OAB_CARDS: AreaCat[] = [
  {
    id: 'oab-codigos',
    label: 'Códigos',
    sublabel: 'Código de Ética e Disciplina',
    icon: Scale,
    color: '#EF4444',
    leiIds: ['ced2015', 'ced1995'],
  },
  {
    id: 'oab-estatuto',
    label: 'Estatuto',
    sublabel: 'Estatuto da Advocacia e da OAB',
    icon: Landmark,
    color: '#2563EB',
    leiIds: ['eoab'],
  },
  {
    id: 'oab-regulamentos',
    label: 'Regulamentos',
    sublabel: 'Regulamento Geral da OAB',
    icon: ScrollText,
    color: '#10B981',
    leiIds: ['reg_oab'],
  },
  {
    id: 'oab-provimentos',
    label: 'Provimentos',
    sublabel: 'Provimentos do Conselho Federal',
    icon: FileText,
    color: '#F59E0B',
    leiIds: ['prov205', 'prov188', 'prov112', 'prov144'],
  },
  {
    id: 'oab-resolucoes',
    label: 'Resoluções',
    sublabel: 'Resoluções e regimento interno',
    icon: Stamp,
    color: '#8B5CF6',
    leiIds: ['res02', 'res01'],
  },
];

const JURI_OPCOES = [
  { id: 'STF_VINCULANTE', nome: 'Súmulas Vinculantes', desc: 'Efeito vinculante para o Judiciário' },
  { id: 'STF',            nome: 'Súmulas do STF',      desc: 'Supremo Tribunal Federal' },
  { id: 'STJ',            nome: 'Súmulas do STJ',      desc: 'Superior Tribunal de Justiça' },
];

const LAW_ICON_MAP: Record<string, LucideIcon> = {
  cf: Crown,
  cf88: Crown,
  constituicao: Crown,
  'constituicao-federal': Crown,
  ced2015: Scale,
  ced1995: Scale,
  reg_oab: ScrollText,
  prov205: FileText,
  prov188: FileText,
  prov112: FileText,
  prov144: FileText,
  res02: Stamp,
  res01: Stamp,
  cp: PocketKnife,
  cc: House,
  cpc: FileText,
  cpp: ShieldCheck,
  ctn: CircleDollarSign,
  cdc: ShoppingCart,
  clt: Briefcase,
  ctb: Car,
  ce: Vote,
  cpm: Shield,
  cppm: ShieldAlert,
  cflor: TreePine,
  ccom: BriefcaseBusiness,
  cba: Plane,
  cagua: Droplets,
  cmin: LandPlot,
  ctel: RadioTower,
  eca: Baby,
  ei: HeartPulse,
  epd: Accessibility,
  eir: Users,
  ec: Building,
  ed: ShieldX,
  eoab: Scale,
  et: Drama,
  ej: GraduationCap,
  em: Shield,
  eind: Leaf,
  eterra: Tractor,
  emig: Globe,
  eref: Handshake,
  emet: Map,
  emus: Landmark,
  eme: Factory,
  epc: Cross,
  lep: ShieldAlert,
  lmp: ShieldCheck,
  ld: Cannabis,
  loc: Network,
  laa: Gavel,
  lit: RadioTower,
  l8112: IdCard,
  lia: FileWarning,
  nll: ReceiptText,
  lms: FileCheck,
  lacp: Users,
  lje: Handshake,
  lgpd: FileLock,
  mci: Wifi,
  lf: PiggyBank,
  la: Scale,
  li: House,
  lrp: NotebookPen,
  lindb: Scroll,
  ldb: GraduationCap,
  lsus: Hospital,
  lbio: Sprout,
  lrf: Wallet,
  lai: FileText,
  lap: Banknote,
  lpp: Vote,
  lele: Vote,
  lfl: Vote,
  lsa: BriefcaseBusiness,
  lpi: HandCoins,
  loman: Gavel,
  lat: ShieldAlert,
  lch: ShieldAlert,
  ltort: ShieldAlert,
  lca: TreePine,
  lrac: Users,
  llav: CircleDollarSign,
  lpaf: FileText,
  lcp: ShieldAlert,
  lomp: Landmark,
  lda: NotebookPen,
  lace: ShieldAlert,
  lcon: Building,
  lppp: Handshake,
  lhd: FileLock,
  lmi: FileCheck,
  lcsf: PiggyBank,
  lpt: ShieldCheck,
  lpsu: LandPlot,
  lalp: Baby,
  lalim: HeartPulse,
  lcade: Scale,
  lci: RadioTower,
  line: Vote,
  lotcu: Landmark,
  lle: CircleDollarSign,
  ces: IdCard,
  lmls: Store,
  lrt: ReceiptText,
  // Leis Especiais — Extravagantes Federais
  'lei-desapropriacao': House,
  'lei-identificacao-criminal': IdCard,
  'lei-adpf': Landmark,
  'lei-adi-adc': Scale,
  'lei-juizados-fazenda': Building,
  'lei-juizados-federais': Scale,
  'lei-crimes-responsabilidade': Gavel,
  'lei-crimes-tributario': CircleDollarSign,
  'lei-defensoria': Scale,
  'lei-governo-digital': Globe,
  'lei-residuos-solidos': TreePine,
  'lei-superendividamento': CircleDollarSign,
  'lei-greve': Users,
  'lei-prisao-temporaria': ShieldAlert,
  'lei-pacote-anticrime': ShieldCheck,
  'lei-meio-ambiente': TreePine,
  'lei-recursos-hidricos': Droplets,
  'lei-mediacao': Handshake,
  'lei-execucao-fiscal': ReceiptText,
  'lei-henry-borel': Baby,
  'lei-escuta-protegida': Shield,
  'lei-sinase': GraduationCap,
  'lei-oscip': Building,
  // Previdenciário
  lbps: HeartPulse,
  lcss: HandCoins,
  lpc: PiggyBank,
  loas: HeartPulse,
};

const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const CHAT_HINTS = [
  'Tire dúvidas sobre lei seca em segundos',
  'Resolva casos complexos com IA avançada',
  'Sua pesquisa jurídica muito mais rápida',
  'Encontre jurisprudências em um clique',
  'Descomplique termos jurídicos na hora',
  'Seu assistente virtual 24 horas por dia',
  'Analise contratos de forma eficiente',
  'Obtenha teses jurídicas fundamentadas',
  'Ganhe tempo na rotina de estudos',
  'Consulte a constituição sem complicação'
];

function formatParouNoArtigo(artigoNumero?: string | null): string {
  if (!artigoNumero || isUuidLike(artigoNumero)) return '';
  const clean = artigoNumero.trim();
  if (!clean) return '';
  if (/^(?:art|adct)/i.test(clean)) {
    return `Parou no ${clean}`;
  }
  return `Parou no Art. ${clean}`;
}

function TypewriterText({ hints }: { hints: string[] }) {
  const [text, setText] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'paused' | 'erasing'>('typing');

  useEffect(() => {
    const current = hints[hintIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (text.length < current.length) {
        timer = setTimeout(() => setText(current.slice(0, text.length + 1)), 50);
      } else {
        timer = setTimeout(() => setPhase('paused'), 2000);
      }
    } else if (phase === 'paused') {
      timer = setTimeout(() => setPhase('erasing'), 50);
    } else if (phase === 'erasing') {
      if (text.length > 0) {
        timer = setTimeout(() => setText(text.slice(0, text.length - 1)), 25);
      } else {
        setHintIndex((i) => (i + 1) % hints.length);
        setPhase('typing');
      }
    }
    return () => clearTimeout(timer);
  }, [text, hintIndex, phase, hints]);

  return (
    <span className="inline-flex items-center min-h-[15px]">
      {text}
      <span className="ml-[1px] inline-block w-[1.5px] h-[12px] bg-black/80 animate-pulse" />
    </span>
  );
}

function resolveUltimaLeiSnapshot(): ReturnType<typeof getRecentes>[0] | null {
  try {
    const recentes = getRecentes();
    if (recentes.length > 0) {
      const top = { ...recentes[0] };
      const cleanTop = cleanArtigoNumero(top.artigoNumero);
      if (!cleanTop) {
        top.artigoNumero = undefined;
        const salvo = localStorage.getItem(`ultimo_artigo_numero_${top.tabela_nome || top.leiId}`) ||
                      localStorage.getItem(`ultimo_artigo_numero_${top.leiId}`);
        const cleanSalvo = cleanArtigoNumero(salvo);
        if (cleanSalvo) {
          top.artigoNumero = cleanSalvo;
        } else {
          const raw = localStorage.getItem(`recentes_artigos_${top.tabela_nome || top.leiId}`);
          if (raw) {
            const arr = JSON.parse(raw);
            if (arr && arr[0]) {
              const first = String(arr[0]);
              const cleanFirst = cleanArtigoNumero(first);
              if (cleanFirst) {
                top.artigoNumero = cleanFirst;
              } else if (isUuidLike(first) && top.tabela_nome) {
                const cached = getCachedArtigos(top.tabela_nome);
                const hit = cached?.find(a => a.id === first);
                if (hit?.numero) {
                  const cleanHit = cleanArtigoNumero(hit.numero);
                  if (cleanHit) top.artigoNumero = cleanHit;
                }
              }
            }
          }
        }
      } else {
        top.artigoNumero = cleanTop;
      }
      return top;
    }
  } catch {}
  return null;
}

interface Props {
  onTabChange?: (tab: string) => void;
  onNewsOpenChange?: (open: boolean) => void;
}

const MobileHomeSections = ({ onNewsOpenChange }: Props = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('categorias');
  const [juriOpen, setJuriOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState<Cat | AreaCat | CategoriaFormal | null>(null);
  const [sheetAnimationComplete, setSheetAnimationComplete] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [listFilter, setListFilter] = useState<'todos' | 'favoritos'>('todos');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      return new Set(getFavoritos().map(f => f.leiId));
    } catch {
      return new Set();
    }
  });

  const openCategory = useCallback((cat: Cat | AreaCat | CategoriaFormal) => {
    setCategorySearch('');
    setListFilter('todos');
    setSheetAnimationComplete(false);
    setCategoryOpen(cat);
  }, []);

  const closeCategory = useCallback(() => {
    setSheetAnimationComplete(false);
    setCategoryOpen(null);
  }, []);

  // #41 — Continuar Leitura: inicialização síncrona imediata (zero layout shift na abertura)
  const [ultimaLei, setUltimaLei] = useState<ReturnType<typeof getRecentes>[0] | null>(resolveUltimaLeiSnapshot);
  useEffect(() => {
    const carregarUltima = () => {
      setUltimaLei(resolveUltimaLeiSnapshot());
    };

    carregarUltima();

    window.addEventListener('storage', carregarUltima);
    window.addEventListener(LEIS_RECENTES_EVENT, carregarUltima);
    window.addEventListener('focus', carregarUltima);
    const onVisibility = () => {
      if (!document.hidden) carregarUltima();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('storage', carregarUltima);
      window.removeEventListener(LEIS_RECENTES_EVENT, carregarUltima);
      window.removeEventListener('focus', carregarUltima);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!categoryOpen) {
      setSheetAnimationComplete(false);
      return;
    }
    const update = () => setFavoriteIds(new Set(getFavoritos().map(f => f.leiId)));
    window.addEventListener(LEIS_FAVORITOS_EVENT, update);
    // Dispara reflexo nos ícones com segurança após a subida completa (duração da transição 320ms)
    const timer = setTimeout(() => {
      setSheetAnimationComplete(true);
    }, 340);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(LEIS_FAVORITOS_EVENT, update);
    };
  }, [categoryOpen]);

  const handleVoiceSearch = useCallback((text: string) => {
    setCategorySearch(text);
  }, []);
  const voiceSearch = useVoiceInput(handleVoiceSearch);

  const handle = useCallback((id: string) => {
    if (id === 'jurisprudencia') { navigate('/jurisprudencia'); return; }
    const cat = ALL_CATS.find(c => c.id === id);
    if (cat) {
      const leisDaCategoria = LEIS_CATALOG.filter(l => l.tipo === id);
      if (leisDaCategoria.length > 1) {
        openCategory(cat);
        return;
      }
      if (leisDaCategoria.length === 1) {
        navigate(leiPath(leisDaCategoria[0]));
        return;
      }
      navigate(`/legislacao/${tipoToSlug(id)}`);
      return;
    }
    navigate(`/legislacao/${tipoToSlug(id)}`);
  }, [navigate, openCategory]);

  useEffect(() => {
    // Pré-carrega o chunk da legislação para navegação instantânea (0ms)
    const t = setTimeout(() => {
      import('@/pages/CategoriaLegislacao').catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const handleOpenLei = useCallback((leiId: string) => {
    const lei = LEIS_CATALOG.find(l => l.id === leiId);
    if (!lei) return;
    navigate(leiPath(lei));
  }, [navigate]);

  // Memoize the derived lei lists so voice-input keystrokes and unrelated
  // parent re-renders don't reshape/refilter the entire catalog every tick.
  const categoryItems = useMemo(() => {
    if (!categoryOpen) return [] as typeof LEIS_CATALOG;
    if ('leiIds' in categoryOpen) {
      const ids = new Set((categoryOpen as AreaCat).leiIds);
      return LEIS_CATALOG.filter(l => ids.has(l.id));
    }
    return LEIS_CATALOG.filter(l => l.tipo === categoryOpen.id);
  }, [categoryOpen]);

  const filteredCategoryItems = useMemo(() => {
    let base = categoryItems;
    if (listFilter === 'favoritos' && categoryOpen?.id !== 'cat-cf') {
      base = base.filter(l => favoriteIds.has(l.id));
    }
    const term = categorySearch.trim();
    if (!term) return base;
    const needle = normalizeSearch(term);
    return base.filter((lei) => {
      const constMeta = CONSTITUICAO_META[lei.id];
      const extraMeta = constMeta ? `${constMeta.ano} ${constMeta.titulo} ${constMeta.subtitulo} ${constMeta.isAtual ? 'atual vigente' : 'historica'}` : '';
      const haystack = normalizeSearch(`${lei.nome} ${lei.sigla} ${lei.descricao} ${(lei.tags || []).join(' ')} ${extraMeta}`);
      return haystack.includes(needle);
    });
  }, [categoryItems, categorySearch, listFilter, favoriteIds, categoryOpen]);
  const CategorySheetIcon = categoryOpen?.icon || BookMarked;

  // Lock background scroll while any bottom sheet is open
  useEffect(() => {
    const anyOpen = !!categoryOpen || juriOpen;
    if (!anyOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, [categoryOpen, juriOpen]);

  return (
    <div className="space-y-6 pt-2">

      {/* #41 — Card "Continuar Leitura" */}
      {ultimaLei && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => {
            const leiCat = LEIS_CATALOG.find(l => l.id === ultimaLei.leiId);
            const base = leiCat ? leiPath(leiCat) : `/legislacao/${tipoToSlug(ultimaLei.tipo)}/${leiToSlug({ id: ultimaLei.leiId, nome: ultimaLei.nome })}`;
            navigate(base);
          }}
          style={{
            background: `linear-gradient(to right, ${getLeiColor(ultimaLei.leiId, ultimaLei.tipo)}33, ${getLeiColor(ultimaLei.leiId, ultimaLei.tipo)}0D)`,
            borderColor: `${getLeiColor(ultimaLei.leiId, ultimaLei.tipo)}4D`
          }}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left active:scale-[0.98] transition-transform overflow-hidden relative shadow-lg"
        >
          {(() => {
            const bgCor = getLeiColor(ultimaLei.leiId, ultimaLei.tipo);
            const isCf =
              ultimaLei.tipo === 'constituicao' ||
              ultimaLei.leiId === 'cf88' ||
              ultimaLei.leiId === 'cf' ||
              ultimaLei.leiId === 'constituicao' ||
              ultimaLei.nome?.toLowerCase().includes('constitui');
            const IconeLei = isCf ? Landmark : (LAW_ICON_MAP[ultimaLei.leiId] || BookOpen);
            const parouTexto = formatParouNoArtigo(ultimaLei.artigoNumero);
            const displayNome = LEIS_CATALOG.find(l => l.id === ultimaLei.leiId)?.nome || ultimaLei.nome;
            return (
              <>
                <div className="flex items-center justify-center shrink-0 z-10">
                  <IconeLei className="w-8 h-8 drop-shadow-sm" style={{ color: shade(bgCor, 0.2) }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 z-10">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: shade(bgCor, 0.2) }}>Continuar Leitura</p>
                  <p className="font-serif italic text-[15px] sm:text-[16px] font-semibold tracking-tight text-white truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] leading-snug">
                    {displayNome}
                  </p>
                  {parouTexto ? (
                    <p className="text-[11px] font-semibold truncate flex items-center gap-1.5" style={{ color: shade(bgCor, 0.25) }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: bgCor }} />
                      <span>{parouTexto}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium truncate flex items-center gap-1.5" style={{ color: shade(bgCor, 0.25) }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bgCor }} />
                      <span>{ultimaLei.descricao || 'Parou no Art. 1º'}</span>
                    </p>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 shrink-0 z-10" style={{ color: shade(bgCor, 0.2) }} />
                
                {/* Bg decoration — SVG translúcido no lado direito com sombra marcante */}
                <div
                  className="absolute -right-3 -bottom-3 pointer-events-none select-none z-0 overflow-visible flex items-center justify-center"
                  style={{
                    filter: `drop-shadow(0 4px 12px rgba(0,0,0,0.9)) drop-shadow(0 0 10px ${bgCor}40)`,
                  }}
                >
                  <IconeLei 
                    className="w-24 h-24 opacity-30" 
                    style={{ color: bgCor }} 
                    strokeWidth={1.2}
                  />
                </div>
              </>
            );
          })()}
        </motion.button>
      )}

      {/* 1. NO LUGAR DE NOTÍCIAS: CARROSSEL DO EM ALTA (Cards vermelhos com degradê + Personalizar) */}
      <HomeAtalhosLeisCarousel onOpenLei={handleOpenLei} />


      {/* 2. LEGISLAÇÃO BRASILEIRA — ÁREAS DO DIREITO (COM ABAS) */}
      <section className="space-y-3 px-1 pt-1 pb-12 sm:pb-16">
        {/* Menu de Alternância (Tabs) */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 -mr-4 pr-6">
          {[
            { id: 'categorias', label: 'Categorias' },
            { id: 'areas', label: 'Áreas' },
            { id: 'cat-codigo', label: 'Códigos' },
            { id: 'cat-estatuto', label: 'Estatutos' },
            { id: 'cat-leis-especiais', label: 'Leis Especiais' },
            { id: 'cat-oab', label: 'OAB' },
            { id: 'jurisprudencia', label: 'Jurisprudência' },
            { id: 'cat-lei', label: 'Ordinárias' },
            { id: 'cat-lei-complementar', label: 'Complementares' },
            { id: 'cat-decreto', label: 'Decretos' },
            { id: 'cat-decreto-lei', label: 'Decretos-Leis' },
            { id: 'cat-mp', label: 'Medidas Provisórias' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`min-h-[44px] px-5 py-2.5 rounded-full text-[13.5px] font-card font-medium flex items-center justify-center whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-secondary/60 text-muted-foreground border border-border/50 hover:bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pt-1">
          <h3 className="font-card text-foreground text-[17px] font-semibold flex items-center gap-2 tracking-[-0.01em]">
            <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
            <span className="truncate">
              {activeTab === 'categorias' ? 'Legislação Brasileira' : 
               activeTab === 'areas' ? 'Áreas do Direito' :
               activeTab === 'jurisprudencia' ? 'Jurisprudência' : 
               CATEGORIA_CARDS.find(c => c.id === activeTab)?.label || ''}
            </span>
          </h3>
          <p className="font-body text-muted-foreground text-[12.5px] leading-snug ml-3 truncate mt-0.5">
            {activeTab === 'categorias' && 'Constituição, Códigos, Estatutos e mais.'}
            {activeTab === 'areas' && 'Penal, Civil, Constitucional e mais.'}
            {activeTab === 'jurisprudencia' && 'Súmulas STF, STJ e Vinculantes.'}
            {activeTab.startsWith('cat-') && CATEGORIA_CARDS.find(c => c.id === activeTab)?.sublabel}
          </p>
        </div>

        <div className="h-[1.5px] bg-border/70 w-full mb-2" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 min-h-[200px] content-start">
          {activeTab === 'cat-oab' && OAB_CARDS.map((c, i) => (
            <HomeCard
              key={c.id}
              icon={c.icon}
              label={c.label}
              sublabel={c.sublabel}
              color={c.color}
              delay={i * 0.04}
              onClick={() => openCategory(c)}
              data-track="home_card_click"
              data-track-name={c.label}
              data-track-section="oab"
            />
          ))}

          {activeTab === 'areas' && AREA_CATS.map((c, i) => (
            <HomeCard
              key={c.id}
              icon={c.icon}
              label={c.label}
              sublabel={`${c.leiIds.length} leis disponíveis`}
              color={c.color}
              delay={i * 0.04}
              onClick={() => openCategory(c)}
              data-track="home_card_click"
              data-track-name={c.label}
              data-track-section="areas"
            />
          ))}

          {activeTab === 'categorias' && CATEGORIA_CARDS.map((c, i) => (
            <HomeCard
              key={c.id}
              icon={c.icon}
              label={c.label}
              sublabel={c.sublabel}
              color={c.color}
              delay={i * 0.04}
              onClick={() => openCategory(c)}
              data-track="home_card_click"
              data-track-name={c.label}
              data-track-section="categorias"
            />
          ))}

          {activeTab.startsWith('cat-') && activeTab !== 'categorias' && activeTab !== 'cat-oab' && (() => {
            const currentCat = CATEGORIA_CARDS.find(c => c.id === activeTab);
            if (!currentCat) return null;

            const leiIdsToDisplay = currentCat.leiIds;

            return leiIdsToDisplay.map((leiId, i) => {
              const lei = LEIS_CATALOG.find(l => l.id === leiId);
              if (!lei) return null;
              
              const LawIcon = LAW_ICON_MAP[lei.id] || BookMarked;
              
              let displayLabel = lei.sigla || lei.nome;
              let displaySublabel = lei.nome;
              
              if (lei.tipo === 'estatuto') {
                if (lei.id === 'eca') {
                  displayLabel = 'ECA';
                } else if (lei.id === 'epd') {
                  displayLabel = 'PCD';
                } else {
                  displayLabel = lei.nome.replace(/^Estatuto (da|do|de|dos|das|nacional da) /i, '').trim();
                }
                displaySublabel = lei.descricao;
              } else if (lei.tipo === 'oab' || lei.id === 'eoab') {
                displayLabel = lei.sigla || lei.nome;
                displaySublabel = lei.descricao || lei.nome;
              }

              return (
                <HomeCard
                  key={lei.id}
                  icon={LawIcon}
                  label={displayLabel}
                  sublabel={displaySublabel}
                  color={lei.iconColor || currentCat.color || '#38BDF8'}
                  inlineTitle={true}
                  delay={i * 0.03}
                  onClick={() => handleOpenLei(lei.id)}
                  data-track="home_card_click"
                  data-track-name={lei.sigla || lei.nome}
                  data-track-section={activeTab}
                />
              );
            });
          })()}

          {activeTab === 'jurisprudencia' && [
            { id: 'juri-stf-vinc', label: 'Súmulas Vinculantes', sublabel: 'STF', icon: ScrollText, color: '#EC4899' },
            { id: 'juri-stf', label: 'Súmulas STF', sublabel: 'Supremo Tribunal Federal', icon: ScrollText, color: '#EC4899' },
            { id: 'juri-stj', label: 'Súmulas STJ', sublabel: 'Superior Tribunal de Justiça', icon: ScrollText, color: '#EC4899' },
          ].map((c, i) => (
            <HomeCard
              key={c.id}
              icon={c.icon}
              label={c.label}
              sublabel={c.sublabel}
              color={c.color}
              delay={i * 0.04}
              onClick={() => setJuriOpen(true)}
              data-track="home_card_click"
              data-track-name={c.label}
              data-track-section="jurisprudencia"
            />
          ))}
        </div>
      </section>

      {/* ESTATUTOS E CARROSSEL ACABARAM AQUI */}

      {/* Category bottom sheet — opens categories from bottom to top */}
      {createPortal(
      <AnimatePresence>
        {categoryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeCategory}
              className="fixed inset-0 z-[1400] bg-black/85"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              onAnimationComplete={(def) => {
                if (def === 'animate' || (typeof def === 'object' && def !== null && (def as any).y === 0) || categoryOpen) {
                  setSheetAnimationComplete(true);
                }
              }}
              style={{
                willChange: 'transform',
                transform: 'translateZ(0)',
                WebkitBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden',
              }}
              className="fixed inset-0 z-[1401] flex h-[100dvh] w-full flex-col bg-background pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+0.75rem)] pb-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]"
            >
              <div className="flex items-center justify-center pt-1 pb-3 shrink-0">
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/35" />
              </div>
              <div className="flex items-center justify-between px-4 pb-3.5 pt-1.5 sm:pt-2 gap-3 shrink-0">
                {/* Lado esquerdo: Ícone da categoria (sem fundo cinza) + Título e Subtítulo */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <CategorySheetIcon
                    className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 drop-shadow-sm"
                    style={{ color: categoryOpen.color, filter: 'saturate(1.3) brightness(1.1)' }}
                    strokeWidth={1.5}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-card text-[18px] sm:text-[20px] text-foreground font-bold leading-tight truncate tracking-tight">
                      {categoryOpen.label}
                    </h3>
                    <p className="text-muted-foreground text-[12px] sm:text-[13px] font-body leading-tight mt-0.5 truncate">
                      {categoryOpen.sublabel}
                    </p>
                  </div>
                </div>

                {/* Lado direito: Botão de abaixar a tela (ChevronDown), tamanho padrão Apple/Google */}
                <button
                  type="button"
                  onClick={closeCategory}
                  aria-label="Abaixar e fechar"
                  className="w-11 h-11 sm:w-12 sm:h-12 min-h-[44px] min-w-[44px] rounded-full bg-secondary/80 hover:bg-secondary active:scale-95 flex items-center justify-center shrink-0 transition-all text-foreground shadow-sm cursor-pointer"
                >
                  <ChevronDown className="w-6 h-6 text-foreground" strokeWidth={2.2} />
                </button>
              </div>

              <div className="px-4 pb-3">
                <div className="w-full relative flex items-center gap-2.5 rounded-2xl border border-border/60 bg-secondary/45 pl-3.5 pr-1.5 h-12 transition-colors focus-within:border-primary/50 focus-within:bg-secondary/60">
                  <Search className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                  <input
                    value={categorySearch}
                    onChange={(event) => setCategorySearch(event.target.value)}
                    placeholder={
                      categoryOpen && 'leiIds' in categoryOpen
                        ? 'Pesquisar nesta área'
                        : 'Pesquisar nesta categoria'
                    }
                    className="min-w-0 flex-1 bg-transparent font-body text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  {categorySearch && (
                    <button
                      type="button"
                      onClick={() => setCategorySearch('')}
                      aria-label="Limpar texto"
                      className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors mr-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {/* Botão de Gravar Áudio / Busca por Voz dentro da barra com animação de reflexo */}
                  <button
                    type="button"
                    onClick={voiceSearch.toggle}
                    aria-label={voiceSearch.listening ? 'Parar gravação' : 'Pesquisar por voz'}
                    className={`btn-mic-shine relative overflow-hidden shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all select-none cursor-pointer ${
                      voiceSearch.listening
                        ? 'bg-red-500 text-white animate-pulse shadow-red-500/40'
                        : 'bg-primary text-primary-foreground shadow-primary/30'
                    }`}
                  >
                    {voiceSearch.listening ? (
                      <MicOff className="w-4.5 h-4.5 sm:w-5 sm:h-5 relative z-[2]" strokeWidth={2.2} />
                    ) : (
                      <Mic className="w-4.5 h-4.5 sm:w-5 sm:h-5 relative z-[2]" strokeWidth={2.2} />
                    )}
                  </button>
                </div>
              </div>

              {categoryOpen?.id !== 'cat-estadual' && categoryOpen?.id !== 'cat-cf' && (
                <div className="px-4 pb-2">
                  <div className="inline-flex w-full sm:w-auto p-1 rounded-xl bg-secondary/50 border border-border/40 gap-1">
                    <button
                      type="button"
                      onClick={() => setListFilter('todos')}
                      className={`flex-1 sm:flex-initial sm:min-w-[120px] h-8 px-4 rounded-lg text-[12.5px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                        listFilter === 'todos' ? 'bg-primary text-white shadow-sm font-semibold' : 'text-muted-foreground hover:text-white'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setListFilter('favoritos')}
                      className={`flex-1 sm:flex-initial sm:min-w-[120px] h-8 px-4 rounded-lg text-[12.5px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                        listFilter === 'favoritos' ? 'bg-primary text-white shadow-sm font-semibold' : 'text-muted-foreground hover:text-white'
                      }`}
                    >
                      Favoritos
                    </button>
                  </div>
                </div>
              )}

              <div key={categoryOpen?.id} className="flex-1 overflow-y-auto px-4 pb-4">
                {categoryOpen?.id === 'cat-estadual' ? (
                  (() => {
                    const q = normalizeSearch(categorySearch.trim());
                    const estados = [...ESTADOS].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                    const filtered = q
                      ? estados.filter(e => normalizeSearch(`${e.nome} ${e.uf} ${e.capital}`).includes(q))
                      : estados;
                    return (
                      <div className="space-y-2">
                        {filtered.map((estado) => (
                          <button
                            key={estado.uf}
                            type="button"
                            onClick={() => {
                              closeCategory();
                              navigate(`/legislacao-estadual/${estado.uf.toLowerCase()}`);
                            }}
                            className="w-full flex items-center gap-4 p-4 min-h-[76px] rounded-2xl bg-secondary/40 border border-border/50 active:scale-[0.99] transition cursor-pointer"
                          >
                            <div className="w-12 h-12 shrink-0 rounded-xl bg-secondary/80 border border-border/60 flex items-center justify-center overflow-hidden">
                              <img
                                src={bandeiraUF(estado.uf, 96) || ''}
                                alt={`Bandeira de ${estado.nome}`}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const el = e.currentTarget as HTMLImageElement;
                                  el.style.display = 'none';
                                  if (el.parentElement) {
                                    el.parentElement.innerHTML = `<span class="font-display text-[15px] font-bold text-foreground tracking-wider">${estado.uf}</span>`;
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="font-card text-foreground text-[15px] sm:text-[15.5px] font-medium leading-snug line-clamp-1 tracking-[-0.01em]">
                                {estado.nome}
                              </p>
                              <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-1">
                                {estado.capital} · {estado.regiao}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                        {filtered.length === 0 && (
                          <div className="py-8 text-center font-body text-sm text-muted-foreground">
                            Nenhum estado encontrado.
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                <div className="space-y-2">
                  {filteredCategoryItems.map((lei, i) => {
                    const isConstituicaoCat = categoryOpen?.id === 'cat-cf';
                    const isCf88 = lei.id === 'cf88';
                    const isFirstHistorica = isConstituicaoCat && !isCf88 && (i === 1 || filteredCategoryItems[i - 1]?.id === 'cf88');

                    const LawIcon = isCf88 ? Crown : (LAW_ICON_MAP[lei.id] || (CategorySheetIcon === Sparkles ? BookMarked : CategorySheetIcon));
                    const iconColor = isCf88 ? '#FACC15' : (lei.iconColor || categoryOpen.color);
                    
                    const constMeta = CONSTITUICAO_META[lei.id];
                    let displayLabel = lei.nome;
                    let displaySublabel = lei.descricao;
                    let badge = null;
                    
                    if (constMeta) {
                      displayLabel = constMeta.titulo;
                      displaySublabel = constMeta.subtitulo;
                      if (constMeta.isAtual) {
                        badge = (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Atual
                          </span>
                        );
                      }
                    } else if (lei.tipo === 'estatuto') {
                      if (lei.id === 'eca') {
                        displayLabel = 'ECA';
                      } else if (lei.id === 'epd') {
                        displayLabel = 'PCD';
                      } else {
                        displayLabel = lei.nome.replace(/^Estatuto (da|do|de|dos|das|nacional da) /i, '').trim();
                      }
                      displaySublabel = lei.descricao;
                    } else if (lei.tipo === 'oab' || lei.id === 'eoab') {
                      displayLabel = lei.sigla ? `${lei.sigla} · ${lei.nome}` : lei.nome;
                      displaySublabel = lei.descricao;
                    }

                    const isFav = favoriteIds.has(lei.id);

                    return (
                    <div key={lei.id} className="space-y-2">
                      {isFirstHistorica && (
                        <div className="pt-4 pb-1.5 px-1">
                          <div className="flex items-center gap-2.5">
                            <div className="h-px flex-1 bg-border/60" />
                            <span className="text-[11.5px] font-bold tracking-wider uppercase text-muted-foreground/80 font-card flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5 text-muted-foreground/70" />
                              Demais Constituições
                            </span>
                            <div className="h-px flex-1 bg-border/60" />
                          </div>
                        </div>
                      )}

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          closeCategory();
                          navigate(leiPath(lei));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            closeCategory();
                            navigate(leiPath(lei));
                          }
                        }}
                        className="w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 min-h-[82px] rounded-2xl bg-secondary/40 hover:bg-secondary/60 border border-border/50 active:scale-[0.99] transition cursor-pointer select-none"
                      >
                        <div className="relative overflow-hidden rounded-xl shrink-0">
                          <LawIcon
                            className="w-8 h-8 relative"
                            style={{
                              color: iconColor,
                              filter: isCf88
                                ? 'saturate(1.7) brightness(1.3) drop-shadow(0 2px 10px rgba(250,204,21,0.5))'
                                : 'saturate(1.5) brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                            }}
                            strokeWidth={isCf88 ? 1.6 : 1.3}
                          />
                          {sheetAnimationComplete && (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-0 icon-shine"
                              style={{
                                animationDelay: `${Math.min(i * 60, 480)}ms`,
                              }}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-card text-foreground font-medium text-[15px] sm:text-[15.5px] leading-snug line-clamp-1 tracking-[-0.01em]">
                              {displayLabel}
                            </p>
                            {badge}
                          </div>
                          <p className="font-body text-muted-foreground text-[12px] leading-snug mt-1 line-clamp-1 truncate">
                            {displaySublabel}
                          </p>
                        </div>

                        {/* Ações à direita: Botão de Favoritar (exceto em Constituição) + Chevron */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {!isConstituicaoCat && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorito({
                                  leiId: lei.id,
                                  nome: lei.nome,
                                  descricao: lei.descricao,
                                  tipo: lei.tipo,
                                  tabela_nome: lei.tabela_nome,
                                });
                              }}
                              aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                              title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                              className="w-10 h-10 min-h-[44px] min-w-[44px] -mr-1 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                            >
                              <Heart
                                className={`w-5 h-5 transition-all duration-200 ${
                                  isFav
                                    ? 'fill-red-500 text-red-500 scale-110 drop-shadow-[0_2px_8px_rgba(239,68,68,0.4)]'
                                    : 'text-muted-foreground/45 hover:text-red-400 hover:scale-105'
                                }`}
                                strokeWidth={isFav ? 2 : 1.7}
                              />
                            </button>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
                        </div>
                      </div>
                    </div>
                  );})}
                  {filteredCategoryItems.length === 0 && (
                    <div className="py-8 text-center font-body text-sm text-muted-foreground">
                      Nenhuma lei encontrada.
                    </div>
                  )}
                </div>
                )}
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}




      {/* Jurisprudência bottom sheet */}
      <AnimatePresence>
        {juriOpen && (
          <JurisprudenciaSheet open={juriOpen} onClose={() => setJuriOpen(false)} />
        )}
      </AnimatePresence>


      {/* Voice capture full-screen overlay (ChatGPT Live style) */}
      <VoiceCaptureOverlay
        open={voiceSearch.listening}
        partial={voiceSearch.partial}
        onStop={voiceSearch.stop}
      />
    </div>

  );
};

// Parent (IndexMobile) re-renders on scroll/tab state — memo prevents the
// whole 700-line section tree from re-rendering when its props are unchanged.
export default memo(MobileHomeSections);
