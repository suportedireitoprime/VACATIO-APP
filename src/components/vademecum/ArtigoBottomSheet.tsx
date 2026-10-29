import { cloneElement, isValidElement, useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Eye, EyeOff, Star, Heart, Highlighter, Copy, Plus, Minus, Type, MessageSquare, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Volume2, VolumeX, Pause, Target, StickyNote, MessageCircle, Loader2, Share2, Network, BookOpen, Sparkles, GraduationCap, Play, Camera, Feather, History, LayoutGrid, Mic, Square, Bell, Scale, Download, Trash2, Lock, Pencil, Layers } from 'lucide-react';
import { getNarracaoArtigo, getCachedNarracaoUrl, isAudioUrlValida } from '@/services/narracaoArtigosSyncService';
const LembretesArtigoSheet = lazy(() => import('./LembretesArtigoSheet'));
const BaixarArtigoSheet = lazy(() => import('./BaixarArtigoSheet'));
// Sheets/overlays pesados são carregados sob demanda: o chunk só desce
// quando o usuário abre o painel. Reduz o bundle inicial que o
// ArtigoBottomSheet arrasta para toda navegação do app.
const GrifoFotoSheet = lazy(() => import('./GrifoFotoSheet'));
const AnotacoesSheet = lazy(() => import('./AnotacoesSheet'));
const PerguntarSheet = lazy(() => import('./PerguntarSheet'));
const GrafoOverlay = lazy(() => import('./GrafoOverlay'));
const GrifoEraseSheet = lazy(() => import('./GrifoEraseSheet'));
const GrifoVoiceSheet = lazy(() => import('./GrifoVoiceSheet'));
import type { VoicePassage } from './GrifoVoiceSheet';
import GrifoVoicePanel, { type GrifoVoicePanelHandle, type VoicePhase } from './GrifoVoicePanel';
const KaraokeOverlay = lazy(() => import('./KaraokeOverlay'));
import { MODOS_PRATICAR, type ModoPraticarId } from './praticar/modosPraticarConfig';
const CompleteArtigoView = lazy(() => import('./praticar/CompleteArtigoView').then(m => ({ default: m.CompleteArtigoView })));
const MonteArtigoView = lazy(() => import('./praticar/MonteArtigoView').then(m => ({ default: m.MonteArtigoView })));
const VerdadeiroFalsoView = lazy(() => import('./praticar/VerdadeiroFalsoView').then(m => ({ default: m.VerdadeiroFalsoView })));
const CasosPraticosView = lazy(() => import('./praticar/CasosPraticosView').then(m => ({ default: m.CasosPraticosView })));
const ContraRelogioView = lazy(() => import('./praticar/ContraRelogioView').then(m => ({ default: m.ContraRelogioView })));
const CacaPalavrasView = lazy(() => import('./praticar/CacaPalavrasView').then(m => ({ default: m.CacaPalavrasView })));
const RelacioneColunasView = lazy(() => import('./praticar/RelacioneColunasView').then(m => ({ default: m.RelacioneColunasView })));
const IdentifiqueErroView = lazy(() => import('./praticar/IdentifiqueErroView').then(m => ({ default: m.IdentifiqueErroView })));
const OucaReciteView = lazy(() => import('./praticar/OucaReciteView').then(m => ({ default: m.OucaReciteView })));
const ComboPraticarView = lazy(() => import('./praticar/ComboPraticarView').then(m => ({ default: m.ComboPraticarView })));
const LicoesArtigoView = lazy(() => import('./praticar/LicoesArtigoView').then(m => ({ default: m.LicoesArtigoView })));
const QuizView = lazy(() => import('@/components/estudar/QuizView'));
const FlashcardView = lazy(() => import('@/components/estudar/FlashcardView'));
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ReactMarkdown from 'react-markdown';
import type { ArtigoLei } from '@/data/mockData';
import { linkifyCrossReferences } from '@/lib/crossReferences';
import brasaoImgAsset from '@/assets/brasao-republica.webp';
const brasaoImg = brasaoImgAsset;

import { useIsDesktop } from '@/hooks/use-desktop';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHighlights, type Highlight } from '@/hooks/useHighlights';
import HighlightColorBar from './HighlightColorBar';
import { readLocalArtigoGrifos, saveArtigoGrifos } from '@/lib/artigosGrifos';
const GeracaoAnimacaoOverlay = lazy(() =>
  import('./GeracaoAnimacaoOverlay').then((m) => ({ default: m.GeracaoAnimacaoOverlay })),
);
import { supabase } from '@/integrations/supabase/client';
import { buildPlanaltoArticleUrl, getLeisCatalog } from '@/services/legislacaoService';
import ShareButtons from './ShareButtons';
const VideoaulaSheet = lazy(() => import('./VideoaulaSheet'));
const VideoaulasListSheet = lazy(() => import('./VideoaulasListSheet'));
import type { VideoaulaItem } from './VideoaulasListSheet';

import { useSubscription } from '@/hooks/useSubscription';
import { usePremiumUsage } from '@/hooks/usePremiumUsage';
import PremiumGate, { type PremiumFeatureKey } from '@/components/PremiumGate';
import { toast } from 'sonner';
import { requireOnline } from '@/lib/offlineFeatures';
import { haptic } from '@/lib/nativeHaptics';

import { getNomenJuris, sanitizePenalArticleText } from '@/data/nomenJurisPenal';
import { setupMediaSession, clearMediaSession } from '@/lib/mediaSession';
import GrifoMagicoLoader from '@/components/vademecum/GrifoMagicoLoader';
import {
  prefetchArtigoFuncoesChunks,
  prefetchArtigoFuncoesDados,
  getCachedData,
  invalidateCache,
  anotacoesKey,
  loadTermosExistentes,
  termosKey,
} from '@/lib/artigoFuncoesPrefetch';
import { getCachedArtigos } from '@/services/legislacaoService';
import { useNarracaoFlutuante } from '@/stores/useNarracaoFlutuante';
import { useLeituraStore } from '@/stores/useLeituraStore';
import { useLocation } from 'react-router-dom';
import { getArtigoExplicadoManual } from '@/data/artigosExplicadosData';
import { 
  IdeiaTabContent, 
  ExplicacaoTabContent, 
  DesdobramentoTabContent, 
  ExemploTabContent, 
  TermosTabContent, 
  JurisprudenciaTabContent 
} from './artigoAbasRenderers';


import { LEIS_SUPABASE_URL, LEIS_SUPABASE_ANON_KEY, LEIS_SUPABASE_PROJECT_ID } from "@/lib/legislacaoBackend";
const SB_URL = LEIS_SUPABASE_URL;
const SB_KEY = LEIS_SUPABASE_ANON_KEY;
const SB_PROJECT_ID = LEIS_SUPABASE_PROJECT_ID;

export interface ModificationInfo {
  tipo: string;        // "Incluído", "Alterada", etc.
  referencia: string;  // "Incluído pela Lei Complementar nº 225, de 2026"
  leiNome: string;     // "Lei Complementar nº 225, de 2026"
  parteModificada: string; // "Artigo inteiro", "§ 4º", "Inciso II", etc.
  linhasModificadas: number[]; // indices of modified lines
}

interface ArtigoBottomSheetProps {
  artigo: ArtigoLei | null;
  onClose: () => void;
  isFavorito?: boolean;
  onToggleFavorito?: () => void;
  showNomenJuris?: boolean;
  tabelaNome?: string;
  leiSlug?: string;
  forceShowRedacao?: boolean;
  modificationInfo?: ModificationInfo | null;
  breadcrumb?: { parte?: string; titulo?: string; tituloDesc?: string } | null;
  initialTab?: string;
  initialPraticarMode?: ModoPraticarId | null;
  onNext?: () => void;
  onPrev?: () => void;
  isFromNovidades?: boolean;
}

// Expressão abrangente para notas de redação, vigência, regulamento e atos normativos
export const EDITORIAL_NOTE_REGEX = /\s*[([]\s*(?:Reda[çc][ãa]o(?:\s+dada)?|Inclu[íi]d[oa]|Acrescid[oa]|Alterad[oa]|Revogad[oa]|Vide|Vig[êe]ncia|Vigente|Regulamento|Vetado|Veto\s+rejeitado|Promulga[çc][ãa]o|Nova\s+reda[çc][ãa]o|Renumerad[oa]|Transformad[oa]|Restabelecid[oa]|Ressalvad[oa]|Suprimid[oa]|Produ[çc][ãa]o\s+de\s+efeitos?|Execu[çc][ãa]o\s+suspensa)\b[^)\]]*[)\]]/gi;

export const EDITORIAL_NOTE_TEST_REGEX = /[([]\s*(?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Acrescid[oa]|Alterad[oa]|Revogad[oa]|Vide|Vig[êe]ncia|Vigente|Regulamento|Vetado|Veto\s+rejeitado|Promulga[çc][ãa]o|Nova\s+reda[çc][ãa]o|Renumerad[oa]|Transformad[oa]|Restabelecid[oa]|Ressalvad[oa]|Suprimid[oa]|Produ[çc][ãa]o\s+de\s+efeitos?|Execu[çc][ãa]o\s+suspensa)\b/i;

export const ARTICLE_PREFIX_STRIP_REGEX = /^Art(?:igo)?\s*\.?\s*\d+(?:\.\d+)*[º°]?(?:-[A-Za-z0-9]+)?(?:\s*[.:–—-]+)*\s*/i;

function stripRedacao(text: string): string {
  return text.replace(EDITORIAL_NOTE_REGEX, '');
}

function normalizeNarracaoToken(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function getWordTokens(text: string): string[] {
  return Array.from(text.matchAll(/[\p{L}\p{N}]+(?:[-–][\p{L}\p{N}]+)*/gu), match => match[0]);
}

function isLineRevogado(line: string): boolean {
  return /[([]\s*Revogad[oa][^)\]]*[)\]]/i.test(line);
}

// Regex que identifica INÍCIO de uma unidade lógica de texto legal.
// Se uma linha NÃO começa com um destes padrões, ela é continuação da anterior
// (quebra de linha física herdada do HTML da Planalto — precisa ser mesclada).
const LEGAL_LINE_START_RE = /^(?:Art(?:igo)?\s*\.|§|Parágrafo\b|[IVXLCDM]+\s*[-–—.)]|[a-z]\s*(?:\)|\s*[-–—.]\s+)|\d+\s*(?:\)|\s*[-–—.]\s+)|LIVRO\b|PARTE\b|TÍTULO\b|CAPÍTULO\b|SEÇÃO\b|SUBSEÇÃO\b)/i;

// Se a linha inteira for só uma nota entre parênteses ou colchetes (Redação/Vigência/Incluído/…),
// mantém como linha separada — o parser de metadados espera assim.
const LEGAL_NOTE_ONLY_RE = /^[([]\s*(?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Acrescid[oa]|Alterad[oa]|Vide|Vig[êe]ncia|Vigente|Regulamento|Revogad[oa]|Vetado|Promulga[çc][ãa]o|Produ[çc][ãa]o\s+de\s+efeitos?)\b/i;

function normalizeLegalLineBreaks(text: string): string {
  if (!text) return '';
  const raw = text.replace(/\r/g, '').split('\n').map(l => l.trim());
  const merged: string[] = [];
  for (const line of raw) {
    if (!line) continue;
    if (
      merged.length === 0 ||
      LEGAL_LINE_START_RE.test(line) ||
      LEGAL_NOTE_ONLY_RE.test(line)
    ) {
      merged.push(line);
    } else {
      // Continuação: mescla no fim da linha anterior com espaço
      const prev = merged[merged.length - 1];
      // Evita espaço duplo se a anterior terminar com hífen de separação silábica
      if (/[a-zA-ZÀ-ÿ][-–]$/.test(prev)) {
        merged[merged.length - 1] = prev.replace(/[-–]$/, '') + line;
      } else {
        merged[merged.length - 1] = prev + ' ' + line;
      }
    }
  }
  return merged.join('\n');
}


function highlightTermos(
  text: string, 
  showRedacao?: boolean, 
  onCrossReferenceClick?: (artigoNum: string) => void, 
  bionicMode?: boolean,
  onHoverEnter?: (artigoNum: string, e: React.MouseEvent) => void,
  onHoverLeave?: () => void
): React.ReactNode[] {
  // Pattern for ALL metadata references (shown in yellow, togglable via eye icon)
  const redacaoPattern = new RegExp(EDITORIAL_NOTE_REGEX.source, 'gi');

  if (showRedacao) {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    redacaoPattern.lastIndex = 0;
    while ((m = redacaoPattern.exec(text)) !== null) {
      if (m.index > lastIndex) parts.push(...highlightTermosOnly(text.slice(lastIndex, m.index), onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave));
      parts.push(
        <span key={`r${m.index}`} className="text-yellow-400 text-xs font-normal bg-yellow-400/10 rounded px-0.5">
          {m[0]}
        </span>
      );
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) parts.push(...highlightTermosOnly(text.slice(lastIndex), onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave));
    return parts.length > 0 ? parts : highlightTermosOnly(text, onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave);
  }
  return highlightTermosOnly(text, onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave);
}

import { applyBionicReading } from '@/lib/bionicReading';

function highlightTermosOnly(
  text: string, 
  onCrossReferenceClick?: (artigoNum: string) => void, 
  bionicMode?: boolean,
  onHoverEnter?: (artigoNum: string, e: React.MouseEvent) => void,
  onHoverLeave?: () => void
): React.ReactNode[] {
  // 1. Inciso: I - , II - , etc. com separador padronizado " - "
  const incisoMatch = text.match(/^([IVXLCDM]+)\s*[-–—.]\s*(.*)$/i);
  if (incisoMatch) {
    const roman = incisoMatch[1].toUpperCase();
    const rest = incisoMatch[2];
    const parts: React.ReactNode[] = [
      <span key="token" className="text-primary-light font-bold">{roman}</span>,
      <span key="sep" className="text-primary-light font-semibold"> - </span>,
    ];
    if (rest) parts.push(...linkifyCrossReferences(rest, onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave));
    return parts;
  }

  // 2. Parágrafo numerado: § 1º , § 2º , § 10 , etc.
  const parMatch = text.match(/^(§\s*\d+[º°]?(?:-[A-Za-z0-9]+)?)\s*[.–—-]?(.*)$/i);
  if (parMatch) {
    const parLabel = parMatch[1].replace(/\s+/g, ' ');
    const rest = parMatch[2];
    const parts: React.ReactNode[] = [
      <span key="token" className="text-primary-light font-bold">{parLabel} </span>,
    ];
    if (rest) parts.push(...linkifyCrossReferences(rest, onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave));
    return parts;
  }

  // 3. Parágrafo único: Parágrafo único.
  const parUnicoMatch = text.match(/^(Parágrafo\s+único)\.?\s*[-–—]?(.*)$/i);
  if (parUnicoMatch) {
    const rest = parUnicoMatch[2];
    const parts: React.ReactNode[] = [
      <span key="token" className="text-primary-light font-bold">Parágrafo único. </span>,
    ];
    if (rest) parts.push(...linkifyCrossReferences(rest, onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave));
    return parts;
  }

  // 4. Alínea: a) , b) , etc. (exige ')' ou traço/ponto com espaço para não confundir com palavras como "Não")
  const alineaMatch = text.match(/^([a-z])\s*(?:\)|\s*[-–—.]\s+)(.*)$/i);
  if (alineaMatch) {
    const letter = alineaMatch[1].toLowerCase();
    const rest = alineaMatch[2];
    const parts: React.ReactNode[] = [
      <span key="token" className="text-primary-light font-bold">{letter}) </span>,
    ];
    if (rest) parts.push(...linkifyCrossReferences(rest, onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave));
    return parts;
  }

  // 5. Artigo no meio do texto ou em linha interna
  const artMatch = text.match(/^(Art(?:igo)?\s*\.?\s*\d+(?:\.\d+)*[º°]?(?:-[A-Za-z0-9]+)?)(?:\s*[.:–—-]+)*\s*(.*)$/i);
  if (artMatch) {
    const artLabel = artMatch[1];
    const rest = artMatch[2];
    const parts: React.ReactNode[] = [
      <span key="token" className="text-primary-light font-bold">{artLabel}</span>,
      <span key="sep"> — </span>,
    ];
    if (rest) parts.push(...linkifyCrossReferences(rest, onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave));
    return parts;
  }

  return linkifyCrossReferences(text, onCrossReferenceClick, bionicMode, onHoverEnter, onHoverLeave);
}

function classifyLine(line: string): { type: 'nomen' | 'caput' | 'inciso' | 'alinea' | 'paragrafo' | 'text'; text: string } {
  if (/^[IVXLCDM]+\s*[-–—.]\s*/i.test(line)) return { type: 'inciso', text: line };
  if (/^[a-z]\s*(?:\)|\s*[-–—.]\s+)/i.test(line)) return { type: 'alinea', text: line };
  if (/^(§\s*\d+[º°]?|Parágrafo\s+único)/i.test(line)) return { type: 'paragrafo', text: line };
  return { type: 'text', text: line };
}

/** Apply highlight marks over existing React nodes for a given line */
function applyHighlightsToText(
  nodes: React.ReactNode[],
  lineHighlights: Highlight[],
  onRemove: (id: string) => void,
  highlightMode: boolean,
  onHoverHighlight?: (id: string | null, rect?: DOMRect) => void,
  onTapHighlight?: (id: string, rect: DOMRect) => void,
): React.ReactNode[] {
  if (lineHighlights.length === 0) return nodes;

  const flatText = nodes.map(n => (typeof n === 'string' ? n : (n && typeof n === 'object' && 'props' in n ? (n as any).props.children : ''))).join('');
  const sorted = [...lineHighlights].sort((a, b) => a.startOffset - b.startOffset);

  type Segment = { start: number; end: number; color?: string; id?: string; hasComment?: boolean };
  const segments: Segment[] = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.startOffset > cursor) segments.push({ start: cursor, end: h.startOffset });
    segments.push({ start: h.startOffset, end: h.endOffset, color: h.color, id: h.id, hasComment: !!(h.comment && h.comment.trim()) });
    cursor = h.endOffset;
  }
  if (cursor < flatText.length) segments.push({ start: cursor, end: flatText.length });

  const result: React.ReactNode[] = [];

  let tokenEnd = 0;
  const tokenNodes: React.ReactNode[] = [];
  for (const n of nodes) {
    if (typeof n !== 'string' && n && typeof n === 'object' && 'props' in n) {
      const len = ((n as any).props.children as string)?.length || 0;
      tokenNodes.push(n);
      tokenEnd += len;
    } else {
      break;
    }
  }

  for (const seg of segments) {
    const segText = flatText.slice(seg.start, seg.end);
    if (!segText) continue;

    if (seg.end <= tokenEnd && !seg.color) {
      if (seg.start === 0) result.push(...tokenNodes);
      continue;
    }

    if (seg.start === 0 && !seg.color && tokenNodes.length > 0) {
      result.push(...tokenNodes);
      const remainder = segText.slice(tokenEnd);
      if (remainder) result.push(remainder);
      continue;
    }

    if (seg.color) {
      result.push(
        <mark
          key={`hl-${seg.id}`}
          style={{ backgroundColor: seg.color, color: 'white', borderRadius: '2px', padding: '0 1px' }}
          className={`${highlightMode ? 'cursor-pointer' : 'cursor-default'} ${seg.hasComment ? 'underline decoration-dotted decoration-white/50' : ''}`}
          onClick={highlightMode ? (e) => { e.stopPropagation(); onRemove(seg.id!); } : (e) => {
            if (onTapHighlight) {
              e.stopPropagation();
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              onTapHighlight(seg.id!, rect);
            }
          }}
          onMouseEnter={!highlightMode && seg.hasComment && onHoverHighlight ? (e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            onHoverHighlight(seg.id!, rect);
          } : undefined}
          onMouseLeave={!highlightMode && onHoverHighlight ? () => onHoverHighlight(null) : undefined}
          title={highlightMode ? 'Clique para remover grifo' : undefined}
        >
          {segText}
        </mark>
      );
    } else {
      result.push(segText);
    }
  }
  return result.length > 0 ? result : nodes;
}

const ArtigoBottomSheet = ({ 
  artigo, 
  onClose, 
  isFavorito, 
  onToggleFavorito, 
  showNomenJuris = false, 
  tabelaNome, 
  leiSlug,
  forceShowRedacao, 
  modificationInfo, 
  breadcrumb,
  initialTab,
  initialPraticarMode,
  onNext,
  onPrev,
  isFromNovidades = false,
}: ArtigoBottomSheetProps) => {
  const [showRedacao, setShowRedacao] = useState(forceShowRedacao ?? false);

  const friendlyLeiNome = useMemo(() => {
    if (!tabelaNome) return '';
    try {
      const cat = getLeisCatalog();
      const found = cat.find(l => l.tabela_nome === tabelaNome);
      if (found?.nome) return found.nome;
    } catch {}
    return tabelaNome.replace(/_/g, ' ');
  }, [tabelaNome]);

  // Reset showRedacao when forceShowRedacao changes (e.g. opening from novidades)
  useEffect(() => {
    if (forceShowRedacao !== undefined) setShowRedacao(forceShowRedacao);
  }, [forceShowRedacao, artigo?.id]);

  // GA4: view_artigo ao abrir/trocar de artigo
  useEffect(() => {
    if (!artigo?.numero) return;
    import('@/lib/appEvents').then(({ appEvents }) =>
      appEvents.viewArtigo({ tabela: tabelaNome, numero: artigo.numero })
    ).catch(() => {});
  }, [artigo?.id, tabelaNome]);

  // Prefetch de jurisprudência: começa em background assim que o artigo abre,
  // para a tela abrir instantaneamente quando o usuário clicar em "Jurisprudência".
  useEffect(() => {
    if (!artigo?.numero || !tabelaNome) return;
    const t = setTimeout(() => {
      import('@/lib/jurisprudenciaCache')
        .then(({ prefetchJurisprudenciaArtigo }) =>
          prefetchJurisprudenciaArtigo(tabelaNome, artigo.numero)
        )
        .catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [artigo?.id, tabelaNome]);

  // Prefetch das demais funções (chunks + dados) assim que o artigo abre,
  // para que cada item do menu "Funções" abra instantaneamente.
  useEffect(() => {
    if (!artigo?.numero) return;
    prefetchArtigoFuncoesChunks();
    let cancelado = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelado) return;
      prefetchArtigoFuncoesDados({
        tabela: tabelaNome,
        numero: String(artigo.numero),
        userId: data.user?.id ?? null,
      });
    }).catch(() => {});
    return () => { cancelado = true; };
  }, [artigo?.id, artigo?.numero, tabelaNome]);
  const [fontSize, setFontSize] = useState(18);
  const [showFontControls, setShowFontControls] = useState(false);
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [showPraticarSheet, setShowPraticarSheet] = useState(!!initialPraticarMode);
  const [activePraticarMode, setActivePraticarMode] = useState<ModoPraticarId | null>(initialPraticarMode || null);

  useEffect(() => {
    if (initialPraticarMode) {
      setShowPraticarSheet(true);
      setActivePraticarMode(initialPraticarMode);
    }
  }, [initialPraticarMode, artigo?.id]);
  
  const [videoaula, setVideoaula] = useState<{ titulo: string; url: string; canal: string; videoId: string; transcricao?: string } | null>(null);
  const [videoaulasLoading, setVideoaulasLoading] = useState(false);
  const [showVideoaulaSheet, setShowVideoaulaSheet] = useState(false);
  const [showVideoaulasListSheet, setShowVideoaulasListSheet] = useState(false);
  
  const [showAnotacoesSheet, setShowAnotacoesSheet] = useState(false);
  const [showPerguntarSheet, setShowPerguntarSheet] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || 'artigo');
  const [aiContent, setAiContent] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiGeneratingMode, setAiGeneratingMode] = useState<null | 'ideia' | 'explicacao' | 'desdobramento' | 'exemplo' | 'termos' | 'jurisprudencia'>(null);
  const [aiGeneratingStep, setAiGeneratingStep] = useState(0);
  const [commentPrompt, setCommentPrompt] = useState<{ id: string; show: boolean; mode: 'create' | 'view' } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentTags, setCommentTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [tooltipData, setTooltipData] = useState<{ id: string; rect: DOMRect } | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showGrafo, setShowGrafo] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<null | 'funcoes' | 'grifar'>(null);
  const [selectionPill, setSelectionPill] = useState<{ x: number; y: number } | null>(null);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [premiumGateDesc, setPremiumGateDesc] = useState<string | undefined>(undefined);
  const [premiumGateFeature, setPremiumGateFeature] = useState<PremiumFeatureKey>('default');
  const [showHistoricoSheet, setShowHistoricoSheet] = useState(false);
  const [showLembretesLocal, setShowLembretesLocal] = useState(false);
  const [showBaixarSheet, setShowBaixarSheet] = useState(false);
  
  const [crossRefArtigo, setCrossRefArtigo] = useState<ArtigoLei | null>(null);
  const [hoveredCrossRef, setHoveredCrossRef] = useState<{ artigoNum: string; rect: DOMRect; artigo: ArtigoLei } | null>(null);

  const handleCrossReferenceClick = (artigoNum: string) => {
    if (!tabelaNome) return;
    const artigos = getCachedArtigos(tabelaNome);
    if (artigos) {
      const found = artigos.find(a => a.numero === artigoNum || a.numero === `Art. ${artigoNum}` || a.numero === `Art. ${artigoNum}º` || a.numero === `Art. ${artigoNum}°`);
      if (found) {
        setCrossRefArtigo(found);
        setHoveredCrossRef(null);
        return;
      }
    }
    toast.error('Artigo não encontrado para visualização rápida.');
  };

  const handleCrossReferenceHover = (artigoNum: string, e: React.MouseEvent) => {
    if (!tabelaNome || !isDesktop) return;
    const artigos = getCachedArtigos(tabelaNome);
    if (artigos) {
      const found = artigos.find(a => a.numero === artigoNum || a.numero === `Art. ${artigoNum}` || a.numero === `Art. ${artigoNum}º` || a.numero === `Art. ${artigoNum}°`);
      if (found) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setHoveredCrossRef({ artigoNum, rect, artigo: found });
      }
    }
  };

  const handleCrossReferenceLeave = () => {
    setHoveredCrossRef(null);
  };

  useEffect(() => { setShowLembretesLocal(false); }, [artigo?.numero, tabelaNome]);
  // Desktop: pílula flutuante Narrar/Grifar quando há seleção de texto no artigo
  useEffect(() => {
    if (!isDesktop || !artigo) { setSelectionPill(null); return; }
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setSelectionPill(null); return; }
      const range = sel.getRangeAt(0);
      const container = scrollContainerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) { setSelectionPill(null); return; }
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) { setSelectionPill(null); return; }
      setSelectionPill({ x: rect.left + rect.width / 2, y: rect.top });
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [isDesktop, artigo?.numero]);

  // Desktop: Navegação por setas de teclado (Item 40)
  useEffect(() => {
    if (!isDesktop || !artigo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' && onNext) {
        onNext();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, artigo, onNext, onPrev]);
  // Prefetch do sheet de Lembretes assim que o menu Funções abre,
  // para que o clique em "Lembretes" seja instantâneo.
  useEffect(() => {
    if (activeActionMenu === 'funcoes') {
      import('./LembretesArtigoSheet');
    }
  }, [activeActionMenu]);
  const { isPremium } = useSubscription();
  const { canUse, canUseRef, registerUsage } = usePremiumUsage();

  const openPremiumGate = (feature: PremiumFeatureKey, desc?: string) => {
    setPremiumGateFeature(feature);
    setPremiumGateDesc(desc);
    setShowPremiumGate(true);
  };

  /**
   * Bloqueio rigoroso de funcionalidades (apenas Premium).
   */
  const strictGateFeature = (
    gateKey: PremiumFeatureKey,
    action: () => void,
  ) => {
    if (isPremium) {
      action();
    } else {
      openPremiumGate(gateKey);
    }
  };


  // ─── Grifo Mágico state ───
  interface MagicGrifo {
    trechoExato: string;
    cor: 'amarelo' | 'verde' | 'azul' | 'rosa' | 'laranja';
    explicacao: string;
    hierarquia: string;
  }
  const [magicMode, setMagicMode] = useState(false);
  const [showGrifoFoto, setShowGrifoFoto] = useState(false);
  const [magicHighlights, setMagicHighlights] = useState<MagicGrifo[]>([]);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicTooltip, setMagicTooltip] = useState<{ grifo: MagicGrifo; rect: DOMRect } | null>(null);
  // Preferência: mostrar Grifo Mágico por padrão ao abrir o artigo (persistida em localStorage).
  const GRIFO_IA_DEFAULT_KEY = 'vacatio:grifoia:default:on';
  const [grifoIaDefaultOn, setGrifoIaDefaultOn] = useState<boolean>(() => {
    try {
      const v = typeof localStorage !== 'undefined' ? localStorage.getItem(GRIFO_IA_DEFAULT_KEY) : null;
      return v == null ? true : v === '1';
    } catch { return true; }
  });
  const setGrifoIaDefault = useCallback((on: boolean) => {
    setGrifoIaDefaultOn(on);
    try { localStorage.setItem(GRIFO_IA_DEFAULT_KEY, on ? '1' : '0'); } catch { /* ignore */ }
  }, []);
  // Contador de anotações persistidas para o badge do rodapé.
  const [anotacoesCount, setAnotacoesCount] = useState<number>(0);
  // Bump manual para forçar releitura da contagem depois de gravar anotações
  // (o efeito abaixo roda antes das inserções do grifo mágico terminarem).
  const [anotacoesRefreshTick, setAnotacoesRefreshTick] = useState(0);

  const MAGIC_COLORS: Record<string, string> = {
    amarelo: 'rgba(234, 179, 8, 0.55)',
    verde: 'rgba(34, 197, 94, 0.55)',
    azul: 'rgba(59, 130, 246, 0.55)',
    rosa: 'rgba(236, 72, 153, 0.55)',
    laranja: 'rgba(249, 115, 22, 0.55)',
  };

  const MAGIC_LABELS: Record<string, string> = {
    amarelo: 'Chave',
    verde: 'Exceção',
    azul: 'Efeito',
    rosa: 'Termo',
    laranja: 'Pegadinha',
  };

  // Persiste grifos IA em `artigos_grifos` (1 linha/artigo) e cria uma
  // anotação por grifo em `artigos_anotacoes`, com dedupe por texto.
  // Chamado tanto quando o usuário clica em "Grifo mágico" quanto quando
  // os grifos são reidratados do cache ao abrir o artigo.
  const persistMagicHighlights = useCallback(async (grifos: MagicGrifo[]) => {
    if (!artigo?.numero || !tabelaNome || !grifos?.length) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const artigoId = `${tabelaNome}::${artigo.numero}`;
      const buildComment = (g: MagicGrifo) =>
        `${MAGIC_LABELS[g.cor] || 'Grifo IA'}: ${g.explicacao || ''}`.trim();

      // artigos_grifos: preserva os grifos manuais existentes e salva grifos mágicos
      const highlightsPayload = grifos.map((g, i) => ({
        id: `ia_${g.cor}_${i}`,
        text: g.trechoExato,
        trechoExato: g.trechoExato,
        color: MAGIC_COLORS[g.cor] || MAGIC_COLORS.amarelo,
        cor: MAGIC_COLORS[g.cor] || MAGIC_COLORS.amarelo,
        corNome: g.cor,
        categoria: MAGIC_LABELS[g.cor] || 'Grifo IA',
        comment: buildComment(g),
        explicacao: g.explicacao,
        hierarquia: g.hierarquia,
        origem: 'ia' as const,
        lineIndex: -1,
        startOffset: 0,
        endOffset: g.trechoExato.length,
        createdAt: Date.now() + i,
      }));

      const existingLocal = readLocalArtigoGrifos(tabelaNome, artigo.numero, artigo.id);
      const manualOnly = existingLocal.filter((h) => h.origem !== 'ia');
      const combined = [...manualOnly, ...highlightsPayload];

      await saveArtigoGrifos({
        tabela_codigo: tabelaNome,
        numero_artigo: artigo.numero,
        highlights: combined,
        legacyId: artigo.id,
      });

      // artigos_anotacoes: N linhas com dedupe por texto exato.
      const { data: existing } = await supabase
        .from('artigos_anotacoes')
        .select('anotacao')
        .eq('user_id', user.id)
        .eq('tabela_codigo', tabelaNome)
        .eq('numero_artigo', artigo.numero);
      const existingSet = new Set(
        (existing || []).map((n: any) => String(n.anotacao || '').trim()),
      );
      const notasRows = grifos
        .map((g) => ({
          user_id: user.id,
          tabela_codigo: tabelaNome,
          numero_artigo: artigo.numero,
          artigo_id: artigoId,
          anotacao: buildComment(g),
        }))
        .filter((row) => row.anotacao && !existingSet.has(row.anotacao));
      if (notasRows.length > 0) {
        const { error: notesInsertError } = await supabase.from('artigos_anotacoes').insert(notasRows);
        if (notesInsertError && notesInsertError.code !== '23505') throw notesInsertError;
        window.dispatchEvent(new CustomEvent('artigos:anotacoes:changed'));
      }
      invalidateCache(anotacoesKey(tabelaNome, artigo.numero, user.id));
      setAnotacoesRefreshTick((t) => t + 1);
    } catch (err) {
      console.warn('persistMagicHighlights falhou', err);
      setAnotacoesRefreshTick((t) => t + 1);
    }
  }, [artigo?.numero, tabelaNome]);

  // Realtime Presence: show how many users are reading this article
  const [onlineCount, setOnlineCount] = useState(0);
  useEffect(() => {
    if (!tabelaNome || !artigo?.numero) return;
    const channelName = `artigo:${tabelaNome}:${artigo.numero}`;
    const channel = supabase.channel(channelName);
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [tabelaNome, artigo?.numero]);

  // Narration state - inicialização síncrona instantânea (0ms) sem atraso cinza
  const [narracaoUrl, setNarracaoUrl] = useState<string | null>(() => {
    return getCachedNarracaoUrl({
      artigoId: artigo?.id,
      tabelaNome,
      leiSlug,
      artigoNumero: artigo?.numero,
      narracaoUrl: (artigo as any)?.narracao_url,
    });
  });
  const [narracaoWordTimings, setNarracaoWordTimings] = useState<Array<{ word: string; start: number; end: number }> | null>(null);
  const [narracaoLoading, setNarracaoLoading] = useState(false);
  const [narracaoStepIdx, setNarracaoStepIdx] = useState(0);
  const [narracaoPlaying, setNarracaoPlaying] = useState(false);
  // Índice da palavra ativa — só re-renderiza o texto quando MUDA (não a 60fps)
  const [narracaoActiveWordIndex, setNarracaoActiveWordIndex] = useState(-1);
  // Índice da linha/seção ativa na narração (Caput, Inciso I, Inciso II...)
  const [narracaoActiveLineIndex, setNarracaoActiveLineIndex] = useState<number>(-1);
  const narracaoActiveLineIdxRef = useRef<number>(-1);
  const narracaoLineRangesRef = useRef<Array<{ lineIndex: number; start: number; end: number; startPct?: number; endPct?: number }>>([]);
  const narracaoAudioRef = useRef<HTMLAudioElement | null>(null);
  const narracaoAnimRef = useRef<number | null>(null);
  // Refs imperativos para UI contínua (barra de progresso, tempo, anel) sem re-render
  const narracaoProgressFillRef = useRef<HTMLDivElement | null>(null);
  const narracaoRingRef = useRef<SVGCircleElement | null>(null);
  const narracaoTimeRef = useRef<HTMLSpanElement | null>(null);
  const narracaoTotalTimeRef = useRef<HTMLSpanElement | null>(null);
  const narracaoTimingsRef = useRef<Array<{ word: string; start: number; end: number }> | null>(null);
  const narracaoActiveIdxRef = useRef<number>(-1);
  const narrarPressGuardRef = useRef(0);
  const narrarActionInFlightRef = useRef(false);
  const narracaoAdoptedRef = useRef(false);

  // URL efetiva calculada síncrona a cada ciclo de renderização
  const effectiveNarracaoUrl = narracaoUrl || getCachedNarracaoUrl({
    artigoId: artigo?.id,
    tabelaNome,
    leiSlug,
    artigoNumero: artigo?.numero,
    narracaoUrl: (artigo as any)?.narracao_url,
  });

  // Floating mini-player integration
  const location = useLocation();
  const adoptNarracao = useNarracaoFlutuante((s) => s.adopt);
  const reclaimNarracao = useNarracaoFlutuante((s) => s.reclaim);
  const closeFlutuante = useNarracaoFlutuante((s) => s.close);

  // Check for existing narration when artigo changes
  useEffect(() => {
    // Se este artigo é o que está tocando no player flutuante, retoma o áudio.
    const reclaimed = artigo?.id ? reclaimNarracao(artigo.id) : null;

    const initialDirectUrl = getCachedNarracaoUrl({
      artigoId: artigo?.id,
      tabelaNome,
      leiSlug,
      artigoNumero: artigo?.numero,
      narracaoUrl: (artigo as any)?.narracao_url,
    });

    setNarracaoUrl(initialDirectUrl);
    setNarracaoWordTimings(null);
    setNarracaoActiveWordIndex(-1);
    narracaoActiveIdxRef.current = -1;
    setNarracaoActiveLineIndex(-1);
    narracaoActiveLineIdxRef.current = -1;

    if (narracaoAdoptedRef.current) {
      // Áudio foi transferido para o player flutuante: não tocar/pausar aqui.
      narracaoAdoptedRef.current = false;
      narracaoAudioRef.current = null;
      setNarracaoPlaying(false);
    } else if (reclaimed) {
      // Reassume o áudio que estava no flutuante
      narracaoAudioRef.current = reclaimed;
      reclaimed.onended = () => {
        setNarracaoPlaying(false);
        setNarracaoActiveWordIndex(-1);
        narracaoActiveIdxRef.current = -1;
        setNarracaoActiveLineIndex(-1);
        narracaoActiveLineIdxRef.current = -1;
        narracaoAudioRef.current = null;
        clearMediaSession();
      };
      reclaimed.onerror = null;
      setNarracaoPlaying(!reclaimed.paused);
      startProgressTracking(reclaimed);
    } else {
      setNarracaoPlaying(false);
      if (narracaoAudioRef.current) {
        narracaoAudioRef.current.pause();
        narracaoAudioRef.current = null;
      }
    }
    if ((!tabelaNome && !leiSlug) || !artigo?.numero) return;

    let cancelado = false;
    (async () => {
      try {
        const result = await getNarracaoArtigo({
          tabelaNome,
          leiSlug,
          artigoNumero: artigo.numero,
          artigoId: artigo.id,
          narracaoUrl: (artigo as any)?.narracao_url || initialDirectUrl,
        });

        if (cancelado) return;
        if (result?.audioUrl) {
          setNarracaoUrl(result.audioUrl);
          if (result.wordTimings) {
            setNarracaoWordTimings(result.wordTimings);
          } else {
            setNarracaoWordTimings(null);
          }
        } else {
          setNarracaoUrl(initialDirectUrl);
          setNarracaoWordTimings(null);
        }
      } catch (e) {
        console.error('Erro ao verificar narração:', e);
      }
    })();

    return () => { cancelado = true; };
  }, [tabelaNome, leiSlug, artigo?.id, artigo?.numero]);

  // Formata tempo em mm:ss
  const formatNarracaoTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const RING_CIRCUMFERENCE = 2 * Math.PI * 26;

  const startProgressTracking = useCallback((audio: HTMLAudioElement) => {
    const update = () => {
      const t = audio.currentTime || 0;
      const dur = audio.duration || 0;

      // Barra de progresso (imperativo — sem re-render)
      if (dur > 0) {
        const pct = Math.min(100, (t / dur) * 100);
        if (narracaoProgressFillRef.current) {
          narracaoProgressFillRef.current.style.width = `${pct}%`;
        }
        if (narracaoRingRef.current) {
          narracaoRingRef.current.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - pct / 100)}`;
        }
      }
      if (narracaoTimeRef.current) {
        narracaoTimeRef.current.textContent = formatNarracaoTime(t);
      }
      if (narracaoTotalTimeRef.current && dur > 0 && narracaoTotalTimeRef.current.textContent !== formatNarracaoTime(dur)) {
        narracaoTotalTimeRef.current.textContent = formatNarracaoTime(dur);
      }

      // Palavra ativa: só setState quando muda
      const timings = narracaoTimingsRef.current;
      if (timings && timings.length) {
        let idx = -1;
        // Busca a partir da última posição conhecida (otimização — texto sempre avança)
        const start = Math.max(0, narracaoActiveIdxRef.current);
        for (let i = start; i < timings.length; i++) {
          if (t >= timings[i].start && t < timings[i].end) { idx = i; break; }
          if (timings[i].start > t) break;
        }
        // Se não achou pra frente (usuário voltou), busca do zero
        if (idx === -1) {
          for (let i = 0; i < timings.length; i++) {
            if (t >= timings[i].start && t < timings[i].end) { idx = i; break; }
          }
        }
        // Passou de tudo: mantém a última
        if (idx === -1 && t >= (timings[timings.length - 1]?.end ?? 0)) {
          idx = timings.length - 1;
        }
        if (idx !== narracaoActiveIdxRef.current) {
          narracaoActiveIdxRef.current = idx;
          setNarracaoActiveWordIndex(idx);
        }
      }

      // Linha/seção ativa na narração (Caput, Incisos, etc.)
      const ranges = narracaoLineRangesRef.current;
      if (ranges && ranges.length > 0) {
        let activeLine = -1;
        if (dur > 0 && typeof ranges[0].startPct === 'number') {
          for (let i = 0; i < ranges.length; i++) {
            const r = ranges[i];
            const startSec = (r.startPct ?? 0) * dur;
            const endSec = (r.endPct ?? 1) * dur;
            if (t >= startSec && (t < endSec || i === ranges.length - 1)) {
              activeLine = r.lineIndex;
              break;
            }
          }
        } else {
          for (let i = 0; i < ranges.length; i++) {
            if (t >= ranges[i].start && (t < ranges[i].end || i === ranges.length - 1)) {
              activeLine = ranges[i].lineIndex;
              break;
            }
          }
        }

        if (activeLine === -1 && t >= 0 && ranges.length > 0) {
          activeLine = ranges[0].lineIndex;
        }

        if (activeLine !== narracaoActiveLineIdxRef.current) {
          narracaoActiveLineIdxRef.current = activeLine;
          setNarracaoActiveLineIndex(activeLine);
        }
      }

      if (!audio.paused && !audio.ended) {
        narracaoAnimRef.current = requestAnimationFrame(update);
      }
    };
    narracaoAnimRef.current = requestAnimationFrame(update);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (narracaoAnimRef.current) {
      cancelAnimationFrame(narracaoAnimRef.current);
      narracaoAnimRef.current = null;
    }
  }, []);

  const playNarracao = useCallback(async (audioUrl: string, options?: { onRecover?: () => void }) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine && /^https?:\/\//i.test(audioUrl)) {
      toast.error('Conecte-se à internet para reproduzir áudios e narrações.');
      return false;
    }

    // Se havia outro artigo tocando no player flutuante, encerra
    closeFlutuante();
    if (narracaoAudioRef.current) {
      narracaoAudioRef.current.pause();
      stopProgressTracking();
    }

    const audio = new Audio(audioUrl);
    audio.preload = 'auto';

    const clearAudioState = () => {
      setNarracaoPlaying(false);
      setNarracaoActiveWordIndex(-1);
      narracaoActiveIdxRef.current = -1;
      setNarracaoActiveLineIndex(-1);
      narracaoActiveLineIdxRef.current = -1;
      if (narracaoProgressFillRef.current) narracaoProgressFillRef.current.style.width = '0%';
      if (narracaoRingRef.current) narracaoRingRef.current.style.strokeDashoffset = `${RING_CIRCUMFERENCE}`;
      if (narracaoTimeRef.current) narracaoTimeRef.current.textContent = '0:00';
      stopProgressTracking();
      narracaoAudioRef.current = null;
      clearMediaSession();
    };

    audio.onended = clearAudioState;
    audio.onerror = () => {
      clearAudioState();
      setNarracaoUrl(null);
      if (options?.onRecover) {
        toast('Atualizando a narração salva...');
        options.onRecover();
      } else {
        toast.error('Não consegui tocar esta narração. Toque em Narrar para gerar novamente.');
      }
    };

    narracaoAudioRef.current = audio;
    setNarracaoPlaying(true);
    try {
      await audio.play();
      setupMediaSession({
        title: `Art. ${artigo?.numero || ''}`,
        album: tabelaNome || '',
        audio,
      });
      startProgressTracking(audio);
      return true;
    } catch (e) {
      console.error('Erro ao tocar narração:', e);
      clearAudioState();
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        toast('Narração pronta. Toque em Ouvir para reproduzir.');
      } else if (options?.onRecover) {
        setNarracaoUrl(null);
        toast('Atualizando a narração salva...');
        options.onRecover();
      } else {
        toast.error('Não consegui tocar esta narração. Toque em Ouvir para tentar novamente.');
      }
      return false;
    }
  }, [artigo?.numero, tabelaNome, startProgressTracking, stopProgressTracking]);

  const gerarNarracao = useCallback(async (options?: { autoplay?: boolean; silent?: boolean; forceRegenerate?: boolean }) => {
    if (!artigo || !tabelaNome) return;

    const autoplay = options?.autoplay ?? true;
    const silent = options?.silent ?? false;

    if (!silent) {
      setNarracaoLoading(true);
      setNarracaoStepIdx(0);
    }
    try {
      const leiCatalog = (await import('@/services/legislacaoService')).getLeisCatalog();
      const lei = leiCatalog.find((l: any) => l.tabela_nome === tabelaNome);

      // Etapa 1: preparando → etapa 2: gerando (imediatamente antes do fetch)
      if (!silent) {
        await new Promise((r) => setTimeout(r, 350));
        setNarracaoStepIdx(1);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token || SB_KEY;

      const res = await fetch(
        `${SB_URL}/functions/v1/narrar-artigo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SB_KEY,
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify((() => {
            const STRUCT_RE = /^(PARTE|LIVRO|T[IÍ]TULO|CAP[IÍ]TULO|SEÇ[AÃ]O|SUBSEÇ[AÃ]O)\b/i;
            const tituloIsEpig = artigo.titulo && !STRUCT_RE.test(artigo.titulo);
            const epig = tituloIsEpig ? artigo.titulo : null;
            const breadcrumbTitle = breadcrumb?.tituloDesc || breadcrumb?.titulo || null;
            const hier = breadcrumbTitle || artigo.capitulo || (!tituloIsEpig ? artigo.titulo : null) || null;
            return {
              tabela_nome: tabelaNome,
              artigo_numero: artigo.numero,
              artigo_texto: artigo.caput,
              lei_nome: lei?.nome || tabelaNome,
              hierarquia: hier,
              titulo_artigo: hier,
              epigrafe: epig,
              force_regenerate: options?.forceRegenerate ?? false,
            };
          })()),
        }
      );

      if (res.ok) {
        const { audio_url, word_timings } = await res.json();
        if (!audio_url) throw new Error('Resposta sem audio_url');
        if (!silent) setNarracaoStepIdx(2);
        setNarracaoUrl(audio_url);
        if (Array.isArray(word_timings)) setNarracaoWordTimings(word_timings);
        if (autoplay) {
          if (!silent) setNarracaoStepIdx(3);
          // Fecha o overlay depois de 700ms e dispara o play
          setTimeout(async () => {
            if (!silent) setNarracaoLoading(false);
            await playNarracao(audio_url);
          }, silent ? 0 : 700);
        } else if (!silent) {
          setNarracaoLoading(false);
        }
        return;
      }
      const errorBody = await res.text().catch(() => '');
      if (res.status === 402 || errorBody.includes('daily_narration_limit_reached')) {
        setNarracaoLoading(false);
        setNarracaoStepIdx(0);
        openPremiumGate('narracao', 'Você usou suas 3 narrações gratuitas deste mês. Comece 7 dias grátis para ouvir sem limite.');
        return;
      }
      if (res.status === 401 || errorBody.includes('authentication_required')) {
        setNarracaoLoading(false);
        setNarracaoStepIdx(0);
        openPremiumGate('narracao', 'Entre na sua conta para usar as narrações gratuitas.');
        return;
      }
      console.error(`Erro ao gerar narração [${res.status}]:`, errorBody);
      if (!silent) toast.error('Não consegui gerar a narração agora. Tente novamente.');
    } catch (e) {
      console.error('Erro ao gerar narração:', e);
      if (!silent) toast.error('Não consegui gerar a narração agora. Tente novamente.');
    }
    if (!silent) setNarracaoLoading(false);
  }, [artigo, tabelaNome, breadcrumb?.tituloDesc, breadcrumb?.titulo, playNarracao, openPremiumGate]);

  const handleNarrar = async () => {
    if (!artigo) {
      toast.error('Não encontrei os dados deste artigo para reproduzir.');
      return;
    }

    if (!isPremium) {
      openPremiumGate('narracao', 'Ouvir artigos narrados e audioleis completas é exclusivo para assinantes.');
      return;
    }

    if (narracaoPlaying) {
      if (narracaoAudioRef.current) {
        narracaoAudioRef.current.pause();
        stopProgressTracking();
        setNarracaoPlaying(false);
      }
      return;
    }

    const urlToPlay = effectiveNarracaoUrl;
    if (urlToPlay) {
      const played = await playNarracao(urlToPlay);
      if (played) return;
    }

    // Se ainda não há áudio gerado, solicita geração sob demanda
    await gerarNarracao({ autoplay: true });
  };

  // Índice ativo agora vem direto do state (atualizado só quando muda)
  const activeNarracaoWordIndex = narracaoPlaying ? narracaoActiveWordIndex : -1;

  const handleNarrarButtonPress = useCallback(async (event?: React.SyntheticEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    const now = Date.now();
    if (now - narrarPressGuardRef.current < 650) return;
    narrarPressGuardRef.current = now;
    if (narrarActionInFlightRef.current) return;
    if (narracaoLoading) return;
    narrarActionInFlightRef.current = true;

    try {
      await handleNarrar();
    } catch (e) {
      console.error('Erro na narração:', e);
    } finally {
      narrarActionInFlightRef.current = false;
    }
  }, [artigo?.numero, handleNarrar, narracaoLoading]);

  const planaltoUrl = useMemo(() => {
    if (!tabelaNome || !artigo?.numero) return null;
    return buildPlanaltoArticleUrl(tabelaNome, artigo.numero);
  }, [tabelaNome, artigo?.numero]);

  const {
    highlights,
    highlightMode,
    selectedColor,
    containerRef,
    setSelectedColor,
    toggleMode,
    addHighlight,
    addHighlightAtOffsets,
    removeHighlight,
    removeHighlightsByColor,
    updateHighlightComment,
    updateHighlightTags,
    clearAll,
    getLineHighlights,
  } = useHighlights({
    artigoId: artigo?.id || null,
    tabelaNome,
    numeroArtigo: artigo?.numero || null,
    magicHighlights,
  });
  const [showEraseSheet, setShowEraseSheet] = useState(false);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [voiceGrifoActive, setVoiceGrifoActive] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const voicePanelRef = useRef<GrifoVoicePanelHandle | null>(null);
  const lastCreatedHlRef = useRef<string | null>(null);

  // Auto-scroll suave para o parágrafo/trecho narrado ativo
  useEffect(() => {
    if (!narracaoPlaying || narracaoActiveLineIndex < 0) return;
    const el = containerRef.current?.querySelector(`[data-line-index="${narracaoActiveLineIndex}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [narracaoPlaying, narracaoActiveLineIndex, containerRef]);

  // Auto-inicia gravação ao ativar Grifar por voz
  useEffect(() => {
    if (voiceGrifoActive && voicePhase === 'idle') {
      const t = setTimeout(() => { voicePanelRef.current?.start(); }, 150);
      return () => clearTimeout(t);
    }
  }, [voiceGrifoActive]);


  // Reset magic highlights when artigo changes; se a preferência "mostrar
  // grifo por padrão" estiver ligada e houver cache local, já reidrata os
  // grifos IA imediatamente (sem chamar a Edge Function).
  useEffect(() => {
    setMagicHighlights([]);
    setMagicTooltip(null);
    setMagicMode(false);
    if (!artigo || !tabelaNome) return;
    if (!grifoIaDefaultOn) return;
    let cancelled = false;
    (async () => {
      try {
        const { getLocalAiCache, setLocalAiCache } = await import('@/lib/aiCacheLocal');
        let cachedRaw: string | null = null;
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          const { data: saved } = await supabase
            .from('artigos_grifos')
            .select('highlights')
            .eq('tabela_codigo', tabelaNome)
            .eq('numero_artigo', artigo.numero)
            .maybeSingle();
          if (saved && Array.isArray(saved.highlights)) {
            const savedMagic = saved.highlights
              .filter((item: any) => item?.origem === 'ia')
              .map((item: any) => ({
                trechoExato: item.trechoExato || item.text,
                cor: item.corNome || Object.keys(MAGIC_COLORS).find((key) => MAGIC_COLORS[key] === item.color || MAGIC_COLORS[key] === item.cor) || 'amarelo',
                explicacao: item.explicacao || String(item.comment || '').replace(/^[^:]+:\s*/, ''),
                hierarquia: item.hierarquia || '',
              }));
            cachedRaw = JSON.stringify(savedMagic);
            setLocalAiCache(tabelaNome, artigo.numero, 'grifo_magico', cachedRaw);
          }
        }
        if (!cachedRaw) cachedRaw = getLocalAiCache(tabelaNome, artigo.numero, 'grifo_magico');
        if (!cachedRaw && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
          const { data: cached } = await supabase
            .from('artigo_ai_cache')
            .select('conteudo')
            .eq('tabela_codigo', tabelaNome)
            .eq('numero_artigo', artigo.numero)
            .eq('tipo', 'grifo_magico')
            .maybeSingle();
          cachedRaw = (cached?.conteudo as string) || null;
        }
        if (cancelled || !cachedRaw) return;
        try {
          let cleaned = cachedRaw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          const m = cleaned.match(/\[[\s\S]*\]/);
          if (m) cleaned = m[0];
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.trechoExato) {
            setMagicHighlights(parsed as MagicGrifo[]);
            setMagicMode(true);
            // Auto-persistência: garante que grifos e anotações estejam
            // salvos mesmo quando os destaques vieram do cache.
            persistMagicHighlights(parsed as MagicGrifo[]);
          }
        } catch { /* ignore parse */ }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [artigo?.id, tabelaNome, grifoIaDefaultOn]);

  // Carrega a mesma contagem única exibida na tela de anotações. As explicações
  // do Grifo Mágico existem no snapshot de grifos e podem também ter uma linha
  // persistida; ambas representam uma única anotação para o usuário.
  useEffect(() => {
    if (!artigo?.numero || !tabelaNome) { setAnotacoesCount(0); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) setAnotacoesCount(0); return; }
        const [notesResult, highlightsResult] = await Promise.all([
          supabase
            .from('artigos_anotacoes')
            .select('anotacao, audio_url')
            .eq('user_id', user.id)
            .eq('tabela_codigo', tabelaNome)
            .eq('numero_artigo', artigo.numero),
          supabase
            .from('artigos_grifos')
            .select('highlights')
            .eq('user_id', user.id)
            .eq('tabela_codigo', tabelaNome)
            .eq('numero_artigo', artigo.numero)
            .maybeSingle(),
        ]);
        if (notesResult.error) throw notesResult.error;
        if (highlightsResult.error) throw highlightsResult.error;
        const uniqueNotes = new Set<string>();
        for (const note of notesResult.data || []) {
          const key = note.audio_url
            ? `audio:${note.audio_url}`
            : String(note.anotacao || '').trim().toLocaleLowerCase('pt-BR');
          if (key) uniqueNotes.add(key);
        }
        if (Array.isArray(highlightsResult.data?.highlights)) {
          for (const item of highlightsResult.data.highlights as any[]) {
            if (item?.origem !== 'ia') continue;
            const comment = String(item.comment || item.comentario || '').trim().toLocaleLowerCase('pt-BR');
            if (comment) uniqueNotes.add(comment);
          }
        }
        if (!cancelled) setAnotacoesCount(uniqueNotes.size);
      } catch { if (!cancelled) setAnotacoesCount(0); }
    })();
    return () => { cancelled = true; };
  }, [artigo?.id, tabelaNome, showAnotacoesSheet, magicHighlights.length, anotacoesRefreshTick]);

  const persistMagicRemoval = useCallback(async (next: MagicGrifo[], removed: MagicGrifo[]) => {
    if (!artigo?.numero || !tabelaNome) return;
    setMagicHighlights(next);
    setMagicMode(next.length > 0);
    setMagicTooltip(null);
    setAnotacoesCount((count) => Math.max(0, count - removed.length));
    const { setLocalAiCache, deleteLocalAiCache } = await import('@/lib/aiCacheLocal');
    if (next.length > 0) setLocalAiCache(tabelaNome, artigo.numero, 'grifo_magico', JSON.stringify(next));
    else deleteLocalAiCache(tabelaNome, artigo.numero, 'grifo_magico');

    const artigoId = `${tabelaNome}::${artigo.numero}`;
    try {
      const { db } = await import('@/services/offlineDb');
      const localRows = await db.highlights.where('artigoId').equals(artigoId).toArray();
      const removedTexts = new Set(removed.map((item) => item.trechoExato));
      const ids = localRows.filter((row) => {
        try {
          const data = JSON.parse(row.data);
          return data?.origem === 'ia' && removedTexts.has(data.text);
        } catch { return false; }
      }).map((row) => row.id);
      if (ids.length > 0) await db.highlights.bulkDelete(ids);
    } catch (error) {
      console.warn('Não foi possível limpar o espelho local dos grifos', error);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
      const payload = next.map((g, i) => ({
        id: `ia_${g.cor}_${i}`,
        text: g.trechoExato,
        trechoExato: g.trechoExato,
        color: MAGIC_COLORS[g.cor] || MAGIC_COLORS.amarelo,
        cor: MAGIC_COLORS[g.cor] || MAGIC_COLORS.amarelo,
        corNome: g.cor,
        categoria: MAGIC_LABELS[g.cor] || 'Grifo IA',
        comment: `${MAGIC_LABELS[g.cor] || 'Grifo IA'}: ${g.explicacao || ''}`.trim(),
        explicacao: g.explicacao,
        hierarquia: g.hierarquia,
        origem: 'ia' as const,
        lineIndex: -1,
        startOffset: 0,
        endOffset: g.trechoExato.length,
        createdAt: Date.now() + i,
      }));

      const existingLocal = readLocalArtigoGrifos(tabelaNome, artigo.numero, artigo.id);
      const manualOnly = existingLocal.filter((h) => h.origem !== 'ia');
      const combined = [...manualOnly, ...payload];

      await saveArtigoGrifos({
        tabela_codigo: tabelaNome,
        numero_artigo: artigo.numero,
        highlights: combined,
        legacyId: artigo.id,
      });

      const removedComments = removed.map((g) => `${MAGIC_LABELS[g.cor] || 'Grifo IA'}: ${g.explicacao || ''}`.trim());
      if (removedComments.length > 0) {
        const { error: notesError } = await supabase
          .from('artigos_anotacoes')
          .delete()
          .eq('user_id', user.id)
          .eq('tabela_codigo', tabelaNome)
          .eq('numero_artigo', artigo.numero)
          .in('anotacao', removedComments);
        if (notesError) throw notesError;
        window.dispatchEvent(new CustomEvent('artigos:anotacoes:changed'));
      }
    } catch (error) {
      console.error('Erro ao sincronizar exclusão de grifos:', error);
      toast.error('Os grifos foram apagados neste aparelho, mas a sincronização falhou');
    }
  }, [artigo?.numero, tabelaNome]);

  const eraseSheetHighlights = useMemo(() => [
    ...highlights,
    ...magicHighlights.map((grifo, index) => ({
      id: `magic_${index}`,
      lineIndex: -1,
      startOffset: 0,
      endOffset: grifo.trechoExato.length,
      text: grifo.trechoExato,
      color: MAGIC_COLORS[grifo.cor] || MAGIC_COLORS.amarelo,
    })),
  ], [highlights, magicHighlights]);

  const handleRemoveGrifosByColor = useCallback((color: string) => {
    const removedMagic = magicHighlights.filter((grifo) => (MAGIC_COLORS[grifo.cor] || MAGIC_COLORS.amarelo) === color);
    removeHighlightsByColor(color);
    if (removedMagic.length > 0) {
      void persistMagicRemoval(magicHighlights.filter((grifo) => !removedMagic.includes(grifo)), removedMagic);
    }
  }, [magicHighlights, persistMagicRemoval, removeHighlightsByColor]);

  const handleClearAllGrifos = useCallback(() => {
    clearAll();
    if (magicHighlights.length > 0) void persistMagicRemoval([], magicHighlights);
  }, [clearAll, magicHighlights, persistMagicRemoval]);

  const handleToggleMagic = useCallback(async () => {
    if (magicMode) {
      setMagicMode(false);
      setMagicTooltip(null);
      return;
    }
    if (magicHighlights.length > 0) {
      setMagicMode(true);
      // Garante que anotações existam mesmo quando os grifos vieram do cache.
      persistMagicHighlights(magicHighlights);
      return;
    }
    if (!artigo || !tabelaNome) return;

    setMagicLoading(true);
    try {
      // Helper to parse and validate grifos JSON
      const parseGrifos = (raw: string): MagicGrifo[] | null => {
        try {
          let cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          const arrMatch = cleaned.match(/\[[\s\S]*\]/);
          if (arrMatch) cleaned = arrMatch[0];
          let parsed: unknown;
          try {
            parsed = JSON.parse(cleaned);
          } catch {
            cleaned = cleaned.replace(/,\s*([}\]])/g, '$1').replace(/'/g, '"');
            parsed = JSON.parse(cleaned);
          }
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.trechoExato) {
            return parsed as MagicGrifo[];
          }
          return null;
        } catch {
          return null;
        }
      };

      // Local mirror first (funciona offline), depois Supabase
      const { getLocalAiCache, setLocalAiCache, deleteLocalAiCache } = await import('@/lib/aiCacheLocal');
      let cachedRaw: string | null = getLocalAiCache(tabelaNome, artigo.numero, 'grifo_magico');
      if (!cachedRaw && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
        const { data: cached } = await supabase
          .from('artigo_ai_cache')
          .select('conteudo')
          .eq('tabela_codigo', tabelaNome)
          .eq('numero_artigo', artigo.numero)
          .eq('tipo', 'grifo_magico')
          .maybeSingle();
        cachedRaw = (cached?.conteudo as string) || null;
        if (cachedRaw) setLocalAiCache(tabelaNome, artigo.numero, 'grifo_magico', cachedRaw);
      }

      let grifos: MagicGrifo[] | null = null;

      if (cachedRaw) {
        grifos = parseGrifos(cachedRaw);
        // If cached data is corrupt, delete it and re-fetch
        if (!grifos) {
          deleteLocalAiCache(tabelaNome, artigo.numero, 'grifo_magico');
          await supabase.from('artigo_ai_cache')
            .delete()
            .eq('tabela_codigo', tabelaNome)
            .eq('numero_artigo', artigo.numero)
            .eq('tipo', 'grifo_magico');
        }
      }

      if (!grifos) {
        // Build full article text
        const fullParts: string[] = [artigo.caput || ''];
        if (artigo.incisos?.length) {
          fullParts.push(...artigo.incisos.map((x: any) => typeof x === 'string' ? x : x?.texto).filter(Boolean));
        }
        if (artigo.paragrafos?.length) {
          fullParts.push(...artigo.paragrafos.map((x: any) => typeof x === 'string' ? x : x?.texto).filter(Boolean));
        }
        const fullText = fullParts.join('\n\n');

        // Try up to 2 times
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const { generateOmniText } = await import('@/lib/omniRouteClient');
            
            const sys = `Você é um professor de Direito Brasileiro especialista em concursos e OAB. Você vai grifar o artigo abaixo como um professor experiente grifa o material do aluno: SELETIVO e cirúrgico. Grifar tudo é o mesmo que não grifar nada — marque só o que o aluno precisa mesmo saber para a prova.

FORMATO
- Responda SOMENTE com um array JSON válido, sem markdown, sem texto antes ou depois.
- Cada item: "trechoExato" (trecho EXATO copiado do texto), "cor" (uma das 5 cores), "explicacao" (1 a 2 frases dizendo por que importa e como cai em prova), "hierarquia" (nome exato da categoria da cor).

CORES E CATEGORIAS (classifique corretamente — não jogue tudo em amarelo/verde)
- "amarelo" = "Conceito-chave" — a regra principal, o núcleo normativo, o verbo do comando legal, o sujeito obrigado, o objeto protegido.
- "verde" = "Exceção / Condição" — requisitos, condicionantes ("desde que", "salvo", "ressalvado", "quando", "se", "exceto"), prazos, hipóteses de incidência e de afastamento.
- "azul" = "Efeito jurídico" — consequência, pena, sanção, nulidade, responsabilidade, competência atribuída, direito gerado.
- "rosa" = "Termo técnico" — institutos e expressões que o aluno precisa saber definir.
- "laranja" = "Pegadinha de prova" — palavras que invertem sentido ou trocam regime ("não", "somente", "sempre", "vedado", "facultado", "poderá" x "deverá"), números, prazos e quóruns trocáveis, rol taxativo x exemplificativo.

SELETIVIDADE (o ponto mais importante)
- REGRA DE OURO: no máximo ~25% do texto do artigo pode ficar grifado. Se ao final você grifou mais que isso, corte os grifos menos decisivos antes de responder.
- Quantidade: 3 a 6 grifos em artigos curtos (caput simples), 6 a 12 em artigos longos (com vários parágrafos/incisos). Nunca mais que 12.
- Não é obrigatório grifar todo parágrafo/inciso: dispositivos repetitivos, meramente remissivos ou procedimentais ficam SEM grifo.
- Trechos curtos e cirúrgicos (2 a 8 palavras). Jamais grife uma frase inteira, um inciso inteiro ou o caput inteiro.
- NUNCA grife conectivos, expressões vazias ou texto genérico ("na forma da lei", "para os efeitos deste artigo") a não ser que sejam a pegadinha em si.
- Varie as categorias: se o artigo tem pena/consequência, use azul; se tem instituto técnico, use rosa; se tem palavra que inverte sentido, número ou prazo, use laranja. Não devolva um resultado só com amarelo e verde quando as outras categorias existirem no texto.
- Nunca marque o mesmo trecho duas vezes e não sobreponha trechos que se contenham.
- Ordene os grifos na mesma sequência em que aparecem no texto.

TESTE FINAL antes de responder: para cada grifo pergunte "uma banca cobraria exatamente isso?". Se a resposta for não, remova.

PRECISÃO
- O "trechoExato" DEVE ser copiado caractere por caractere do texto (acentos, maiúsculas, pontuação, "§", numerais). Se não tiver certeza da grafia exata, escolha outro trecho.
- Não invente trechos, não parafraseie, não junte partes distantes do texto.
- Explicações objetivas, em português brasileiro, sem repetir a mesma justificativa em vários grifos.`;
            
            const prompt = `LEGISLAÇÃO: ${tabelaNome || ''}\nARTIGO: ${artigo.numero}\nTEXTO:\n${fullText}`;
            
            const rawReply = await generateOmniText({ 
              prompt, 
              systemPrompt: sys, 
              complexity: 'high', 
              responseFormat: 'json' 
            });

            const rawStr = typeof rawReply === 'string' ? rawReply : JSON.stringify(rawReply);
            grifos = parseGrifos(rawStr);
            if (grifos) break;
          } catch (error) {
            console.error('Grifo mágico invoke error:', error);
            continue;
          }
          console.warn(`Grifo mágico: parse failed attempt ${attempt + 1}, retrying...`);
        }

        if (grifos) {
          const payload = JSON.stringify(grifos);
          setLocalAiCache(tabelaNome, artigo.numero, 'grifo_magico', payload);
          // Save valid data to cache
          await supabase.from('artigo_ai_cache').upsert({
            tabela_codigo: tabelaNome,
            numero_artigo: artigo.numero,
            tipo: 'grifo_magico',
            conteudo: payload,
          }, { onConflict: 'tabela_codigo,numero_artigo,tipo' });
        }
      }

      if (grifos && grifos.length > 0) {
        setMagicHighlights(grifos);
        setMagicMode(true);
        // Persiste os N grifos IA:
        // 1) Mirror local (Dexie) para leitura offline instantânea.
        // 2) `artigos_grifos` no Supabase (1 linha por artigo com N highlights no JSON)
        //    → alimenta o badge "grifado" na lista e a página "Meus grifos".
        // 3) `artigos_anotacoes` no Supabase (N linhas, uma por grifo, com a
        //    explicação da IA) → alimenta o badge "anotado" e "Minhas anotações".
        try {
          const { db } = await import('@/services/offlineDb');
          const artigoId = `${tabelaNome}::${artigo.numero}`;
          const existing = await db.highlights.where('artigoId').equals(artigoId).toArray();
          const existingKeys = new Set<string>();
          for (const h of existing) {
            try {
              const d = JSON.parse(h.data);
              if (d?.origem === 'ia' && d?.text) existingKeys.add(`${d.text}::${d.cor || d.color}`);
            } catch { /* ignore */ }
          }
          const LABELS: Record<string, string> = {
            amarelo: 'Chave',
            verde: 'Exceção',
            azul: 'Efeito',
            rosa: 'Termo',
            laranja: 'Pegadinha',
          };
          const now = Date.now();
          const buildComment = (g: MagicGrifo) =>
            `${LABELS[g.cor] || 'Grifo IA'}: ${g.explicacao || ''}`.trim();
          const toInsert = grifos
            .map((g, i) => {
              const color = MAGIC_COLORS[g.cor] || MAGIC_COLORS.amarelo;
              return {
                id: `magic_${artigoId}_${g.cor}_${i}_${now}`,
                artigoId,
                data: JSON.stringify({
                  text: g.trechoExato,
                  color,
                  cor: color,
                  comment: buildComment(g),
                  comentario: buildComment(g),
                  categoria: LABELS[g.cor] || 'Grifo IA',
                  hierarquia: g.hierarquia,
                  origem: 'ia',
                  createdAt: now + i,
                }),
              };
            })
            .filter((item) => {
              try {
                const d = JSON.parse(item.data);
                return !existingKeys.has(`${d.text}::${d.cor}`);
              } catch {
                return true;
              }
            });
          if (toInsert.length > 0) await db.highlights.bulkPut(toInsert);

          // Sincronia com Supabase (best-effort — se offline ou sem sessão, o
          // mirror local acima já garante a UX).
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
              const highlightsPayload = grifos.map((g, i) => ({
                id: `ia_${g.cor}_${i}`,
                text: g.trechoExato,
                trechoExato: g.trechoExato,
                color: MAGIC_COLORS[g.cor] || MAGIC_COLORS.amarelo,
                cor: MAGIC_COLORS[g.cor] || MAGIC_COLORS.amarelo,
                corNome: g.cor,
                categoria: LABELS[g.cor] || 'Grifo IA',
                comment: buildComment(g),
                explicacao: g.explicacao,
                hierarquia: g.hierarquia,
                origem: 'ia',
                createdAt: now + i,
              }));

              const existingLocal = readLocalArtigoGrifos(tabelaNome, artigo.numero, artigo.id);
              const manualOnly = existingLocal.filter((h) => h.origem !== 'ia');
              const combined = [...manualOnly, ...highlightsPayload];

              await saveArtigoGrifos({
                tabela_codigo: tabelaNome,
                numero_artigo: artigo.numero,
                highlights: combined,
                legacyId: artigo.id,
              });

              // N linhas em anotações — uma por grifo — com dedupe por texto.
              const { data: existingNotas } = await supabase
                .from('artigos_anotacoes')
                .select('anotacao')
                .eq('user_id', user.id)
                .eq('artigo_id', artigoId);
              const existingNotasSet = new Set(
                (existingNotas || []).map((n: any) => String(n.anotacao || '').trim()),
              );
              const notasRows = grifos
                .map((g) => ({
                  user_id: user.id,
                  tabela_codigo: tabelaNome,
                  numero_artigo: artigo.numero,
                  artigo_id: artigoId,
                  anotacao: buildComment(g),
                }))
                .filter((row) => row.anotacao && !existingNotasSet.has(row.anotacao));
              if (notasRows.length > 0) {
                const { error: notesInsertError } = await supabase.from('artigos_anotacoes').insert(notasRows);
                if (notesInsertError && notesInsertError.code !== '23505') throw notesInsertError;
                window.dispatchEvent(new CustomEvent('artigos:anotacoes:changed'));
              }
              // Só agora as linhas existem no banco: invalida o cache do sheet de
              // anotações (senão ele abre com o snapshot antigo, zerado) e recarrega a contagem.
              invalidateCache(anotacoesKey(tabelaNome, artigo.numero, user.id));
              setAnotacoesRefreshTick((t) => t + 1);
            }
          } catch (syncErr) {
            console.warn('grifo mágico: sync supabase falhou', syncErr);
            setAnotacoesRefreshTick((t) => t + 1);
          }

          toast.success(
            grifos.length === 1
              ? '1 grifo salvo com anotação'
              : `${grifos.length} grifos salvos com anotações`,
            { position: 'top-center' },
          );
        } catch (err) {
          console.warn('grifo mágico: falha ao salvar em anotações', err);
        }
      } else {
        console.warn('Grifo mágico: no valid highlights generated');
      }
    } catch (e) {
      console.error('Grifo mágico error:', e);
    } finally {
      setMagicLoading(false);
    }
  }, [magicMode, magicHighlights, artigo, tabelaNome]);

  const handleCopy = async () => {
    if (!artigo) return;
    const text = `Art. ${artigo.numero}${tabelaNome ? ` — ${tabelaNome}` : ''}\n\n${artigo.caput}`;
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Clipboard } = await import('@capacitor/clipboard');
        await Clipboard.write({ string: text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      toast.success('Artigo copiado', { position: 'top-center' });
    } catch (e) {
      try { await navigator.clipboard.writeText(text); toast.success('Artigo copiado', { position: 'top-center' }); }
      catch { toast.error('Não foi possível copiar', { position: 'top-center' }); }
    }
  };

  const openCreatePrompt = useCallback((newId: string) => {
    setCommentPrompt({ id: newId, show: true, mode: 'create' });
    setCommentText('');
    setCommentTags([]);
    setTagDraft('');
  }, []);

  const handleTextSelection = useCallback(() => {
    if (!highlightMode) return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
      const anchor = sel.anchorNode;
      if (!anchor || !containerRef.current?.contains(anchor)) return;
      const newId = addHighlight();
      if (newId && lastCreatedHlRef.current !== newId) {
        lastCreatedHlRef.current = newId;
        requestAnimationFrame(() => openCreatePrompt(newId));
      }
      sel.removeAllRanges();
    }, 10);
  }, [highlightMode, addHighlight, openCreatePrompt, containerRef]);

  // Mobile: only fire when the user has FINISHED adjusting the selection.
  // Uses `selectionchange` with a debounce so iOS/Android drag-handles don't
  // trigger the annotation card mid-drag (which was the "grifo não funciona
  // no mobile" bug — the card popped up before the user finished selecting).
  useEffect(() => {
    if (!highlightMode || !isMobile) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastText = '';

    const scheduleCommit = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(commitIfStable, 650);
    };

    const commitIfStable = () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const text = sel.toString().trim();
        if (!text) return;
      // Wait until the selection is stable across two ticks before opening
      // the annotation card — this is what makes drag-handles feel natural.
      if (text !== lastText) {
        lastText = text;
        scheduleCommit();
        return;
      }
        const anchor = sel.anchorNode;
        if (anchor && containerRef.current?.contains(anchor)) {
          const newId = addHighlight();
          if (newId && lastCreatedHlRef.current !== newId) {
            lastCreatedHlRef.current = newId;
            haptic.selection();
            requestAnimationFrame(() => openCreatePrompt(newId));
          }
        }
      lastText = '';
    };

    const onSelChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { lastText = ''; return; }
      scheduleCommit();
    };

    document.addEventListener('selectionchange', onSelChange);
    return () => {
      document.removeEventListener('selectionchange', onSelChange);
      if (timer) clearTimeout(timer);
    };
  }, [highlightMode, isMobile, addHighlight, containerRef, openCreatePrompt]);


  const handleScrollUp = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ top: -150, behavior: 'smooth' });
  }, []);

  const handleScrollDown = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ top: 150, behavior: 'smooth' });
  }, []);

  const handleSaveComment = useCallback(() => {
    if (commentPrompt) {
      if (commentText.trim()) updateHighlightComment(commentPrompt.id, commentText.trim());
      updateHighlightTags(commentPrompt.id, commentTags);
    }
    setCommentPrompt(null);
    setCommentText('');
    setCommentTags([]);
    setTagDraft('');
  }, [commentPrompt, commentText, commentTags, updateHighlightComment, updateHighlightTags]);

  const handleDismissComment = useCallback(() => {
    setCommentPrompt(null);
    setCommentText('');
    setCommentTags([]);
    setTagDraft('');
  }, []);

  const addTagFromDraft = useCallback(() => {
    const t = tagDraft.trim().replace(/^#+/, '');
    if (!t) return;
    setCommentTags(prev => prev.includes(t) ? prev : [...prev, t]);
    setTagDraft('');
  }, [tagDraft]);

  const handleHoverHighlight = useCallback((id: string | null, rect?: DOMRect) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    if (id && rect) {
      setTooltipData({ id, rect });
    } else {
      tooltipTimeoutRef.current = setTimeout(() => setTooltipData(null), 200);
    }
  }, []);

  const handleTapHighlight = useCallback((id: string, _rect: DOMRect) => {
    // Abre o card flutuante em modo visualização/edição
    const h = highlights.find(x => x.id === id);
    if (!h) return;
    setCommentPrompt({ id, show: true, mode: 'view' });
    setCommentText(h.comment || '');
    setCommentTags(h.tags || []);
    setTagDraft('');
  }, [highlights]);

  const handleScrollToHighlight = useCallback((highlightId: string) => {
    const mark = containerRef.current?.querySelector(`[data-highlight-id="${highlightId}"]`) ||
      containerRef.current?.querySelector(`mark`);
    // Find the mark with matching key
    const marks = containerRef.current?.querySelectorAll('mark');
    marks?.forEach(m => {
      if (m.getAttribute('data-hl-id') === highlightId) {
        m.scrollIntoView({ behavior: 'smooth', block: 'center' });
        m.classList.add('ring-2', 'ring-primary');
        setTimeout(() => m.classList.remove('ring-2', 'ring-primary'), 2000);
      }
    });
    setShowCommentPanel(false);
  }, [containerRef]);

  const tooltipHighlight = tooltipData ? highlights.find(h => h.id === tooltipData.id) : null;

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (!artigo) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow === 'hidden' ? '' : prevOverflow;
      document.body.style.touchAction = prevTouchAction === 'none' ? '' : prevTouchAction;
      document.documentElement.style.overflow = '';
    };
  }, [artigo]);

  // Auto-scroll to first modified line when opening from novidades
  useEffect(() => {
    if (!artigo || !modificationInfo || modificationInfo.linhasModificadas.length === 0) return;
    const targetLine = modificationInfo.linhasModificadas[0];
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const el = container.querySelector(`[data-line-index="${targetLine}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 400); // wait for animation
    return () => clearTimeout(timer);
  }, [artigo?.id, modificationInfo]);

  // Pre-load all cached AI content when artigo changes
  useEffect(() => {
    setAiContent({});
    setAiLoading({});
    setActiveTab(initialTab || 'artigo');

    if (!artigo || !tabelaNome) return;

    // Pre-fetch all cached modes from DB at once
    const modes = ['ideia', 'explicacao', 'desdobramento', 'exemplo', 'termos', 'jurisprudencia'];
    // Hidrata do mirror local / bundle manual primeiro (funciona offline)
    (async () => {
      const { getLocalAiCache } = await import('@/lib/aiCacheLocal');
      const local: Record<string, string> = {};
      for (const m of modes) {
        const manual = getArtigoExplicadoManual(tabelaNome, artigo.numero, m);
        if (manual) {
          local[m] = manual;
          continue;
        }
        const v = getLocalAiCache(tabelaNome, artigo.numero, m);
        if (v) local[m] = v;
      }
      if (Object.keys(local).length) setAiContent(prev => ({ ...local, ...prev }));
    })();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    supabase
      .from('artigo_ai_cache')
      .select('tipo, conteudo')
      .eq('tabela_codigo', tabelaNome)
      .eq('numero_artigo', artigo.numero)
      .in('tipo', modes)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const cached: Record<string, string> = {};
          import('@/lib/aiCacheLocal').then(({ setLocalAiCache }) => {
            data.forEach((row: any) => {
              cached[row.tipo] = row.conteudo;
              setLocalAiCache(tabelaNome, artigo.numero, row.tipo, row.conteudo);
            });
            setAiContent(prev => ({ ...prev, ...cached }));
          });
        }
      });
  }, [artigo?.id]);

  // Helper to split AI content into accordion sections
  const splitSections = useCallback((text: string, marker: string) => {
    const parts = text.split(marker).filter(s => s.trim());
    return parts.map((part, i) => {
      const lines = part.trim().split('\n');
      const titleLine = lines.find(l => l.startsWith('## ') || l.startsWith('**'));
      const title = titleLine 
        ? titleLine.replace(/^##\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').trim()
        : `Seção ${i + 1}`;
      const body = lines.filter(l => l !== titleLine).join('\n').trim();
      return { title, body: body || part.trim() };
    });
  }, []);

  // Fetch AI content: check manual bundle / DB cache first, then generate
  useEffect(() => {
    if (activeTab === 'artigo' || !artigo) return;
    if (aiContent[activeTab] || aiLoading[activeTab]) return;
    if (modificationInfo && activeTab !== 'explicacao') return;

    // Se temos conteúdo verificado no bundle (ex: primeiros artigos do ECA), injeta imediatamente
    const manual = getArtigoExplicadoManual(tabelaNome, artigo.numero, activeTab);
    if (manual) {
      setAiContent(prev => ({ ...prev, [activeTab]: manual }));
      setAiLoading(prev => ({ ...prev, [activeTab]: false }));
      return;
    }

    const cacheKey = { tabela: tabelaNome || 'unknown', numero: artigo.numero, modo: activeTab };

    setAiLoading(prev => ({ ...prev, [activeTab]: true }));

    // Local mirror primeiro
    import('@/lib/aiCacheLocal').then(({ getLocalAiCache, setLocalAiCache }) => {
      const localVal = getLocalAiCache(cacheKey.tabela, cacheKey.numero, cacheKey.modo);
      if (localVal) {
        setAiContent(prev => ({ ...prev, [activeTab]: localVal }));
        setAiLoading(prev => ({ ...prev, [activeTab]: false }));
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setAiContent(prev => ({ ...prev, [activeTab]: 'Sem internet — este conteúdo ainda não foi gerado. Conecte-se para gerar.' }));
        setAiLoading(prev => ({ ...prev, [activeTab]: false }));
        return;
      }
      // Check DB cache first
      supabase
      .from('artigo_ai_cache')
      .select('conteudo')
      .eq('tabela_codigo', cacheKey.tabela)
      .eq('numero_artigo', cacheKey.numero)
      .eq('tipo', cacheKey.modo)
      .maybeSingle()
      .then(({ data: cached }) => {
        if (cached?.conteudo) {
          setLocalAiCache(cacheKey.tabela, cacheKey.numero, cacheKey.modo, cached.conteudo as string);
          setAiContent(prev => ({ ...prev, [activeTab]: cached.conteudo as string }));
          setAiLoading(prev => ({ ...prev, [activeTab]: false }));
          return;
        }

        // Generate with AI — mostra overlay animado
        const mode = activeTab as 'ideia' | 'explicacao' | 'desdobramento' | 'exemplo' | 'termos' | 'jurisprudencia';
        setAiGeneratingMode(mode);
        setAiGeneratingStep(0);
        const stepInterval = setInterval(() => {
          setAiGeneratingStep(prev => (prev < 2 ? prev + 1 : prev));
        }, 1800);

        (async () => {
          try {
            const { generateOmniText } = await import('@/lib/omniRouteClient');
            
            let sys = '';
            if (mode === 'ideia') {
              sys = `Você é um jurista e professor que formula a ideia central de artigos de lei para estudantes e concurseiros.
Sua missão é entregar a PORTA DE ENTRADA MENTAL do artigo em 1 ou 2 frases curtas, profundas e diretas.

REGRAS ABSOLUTAS:
- Responda em 1 a 2 frases no máximo (60 a 90 palavras).
- Responda: "No fundo, o que este artigo decide ou garante?"
- Linguagem acolhedora, humana e de alto impacto pedagógico.
- NUNCA se apresente, nunca use saudações, nunca use preâmbulos como "Este artigo trata de" ou "Em suma".
- NUNCA use travessão (—). Use vírgula, dois-pontos ou parênteses.
- Destaque em **negrito** os 2 ou 3 conceitos-chave.`;
            } else if (mode === 'explicacao') {
              sys = `Você é um jurista brasileiro que explica artigos de lei de forma direta, técnica e didática — o mesmo método usado no chat jurídico do app.

REGRAS ABSOLUTAS DE ESTILO (NUNCA VIOLE):
- NUNCA se apresente. NUNCA use saudações como "Olá", "Oi", "Bem-vindo", "Prazer", "meus caros alunos", "pessoal", "galera".
- NUNCA fale sobre você mesmo, sobre "hoje vamos aprender", "vamos descomplicar", "professor aqui". Vá DIRETO ao conteúdo.
- A primeira linha de cada seção já entra na explicação do dispositivo, sem preâmbulo.
- NUNCA use travessão (—).
- Tom técnico-didático, sem enrolação, sem "espero ter ajudado" no final. Como o chat jurídico do app.
- Português brasileiro, com markdown (negrito, listas) quando ajudar a leitura.
- CITE ARTIGOS NO FORMATO CANÔNICO quando referir outra norma: "art. N do CP", "art. N da CF", "art. N da Lei nº 8.429/1992".

ESTRUTURA:
- Organize a explicação por CADA PARTE do artigo separadamente. Use o marcador "---SECAO---" em uma linha sozinha entre as seções.
- A primeira seção DEVE ser "## Caput" e explicar o caput.
- Depois, para CADA inciso presente: "## Inciso I", "## Inciso II", etc.
- Para cada parágrafo: "## Parágrafo único" ou "## § 1º", "## § 2º", etc.
- Alíneas ficam dentro do inciso correspondente.
- Cada seção explica aquela parte com clareza; não repita o texto do artigo, apenas explique.`;
            } else if (mode === 'desdobramento') {
              sys = `Você é um jurista analítico especialista em hermenêutica legislativa.
Você deve destrinchar o artigo trecho por trecho (Caput, cada Parágrafo, cada Inciso).
NUNCA agrupe incisos ou parágrafos. Cada um tem seu próprio trecho.
NUNCA use travessão (—).

Para CADA trecho presente no artigo, use rigorosamente o marcador:
---TRECHO---
## [Nome do Trecho: ex: Caput, Parágrafo único, Inciso I]
**Texto oficial**: [reprodução exata daquele trecho]

### Explicação do trecho
[Explicação humana, didática e clara da regra deste trecho]

### Por que a lei fez assim?
[A justificativa e razão de ser da escolha do legislador]

### Palavra por palavra deste trecho
---PALAVRA---
**Palavra**: [termo decisivo]
- **O que significa aqui**: [significado no contexto]
- **Por que a lei escolheu esta palavra**: [razão técnica da escolha]
- **E se fosse outra?**: [efeito prático e perigo se fosse utilizado sinônimo inadequado]`;
            } else if (mode === 'exemplo') {
              sys = `Você é um jurista brasileiro que ilustra artigos de lei com exemplos práticos — mesmo método direto e técnico do chat jurídico do app.

REGRAS ABSOLUTAS DE ESTILO (NUNCA VIOLE):
- NUNCA se apresente. NUNCA use saudações como "Olá, meus caros alunos e alunas", "pessoal", "galera", "professor aqui".
- NUNCA fale sobre si mesmo nem sobre o que "vamos aprender". Vá DIRETO ao exemplo.
- NUNCA use travessão (—).
- Cada exemplo abre com a situação em si (nome fictício + fato), sem preâmbulo. Sem "espero ter ajudado" no final.
- Tom técnico-didático, direto ao ponto, igual ao chat jurídico. Português brasileiro, markdown quando ajudar.
- CITE ARTIGOS NO FORMATO CANÔNICO quando referir a norma explicada ou outras: "art. N do CP", "art. N da CF".

ESTRUTURA:
- Crie histórias práticas, realistas e diferentes entre si.
- Use nomes fictícios (Maria, João, empresa XYZ).
- Separe os exemplos com o marcador "---EXEMPLO---" em uma linha sozinha antes de cada título.
- Cada exemplo tem título "## Exemplo 1: Título", "## Exemplo 2: Título", etc.
- Cada exemplo contém: a situação narrada de forma objetiva e como o artigo se aplica (com o dispositivo citado).`;
            } else if (mode === 'termos') {
              sys = `Você é um glossarista jurídico que traduz termos técnicos do Direito para linguagem popular. Analise o texto do artigo e identifique TODOS os termos jurídicos ou técnicos que um leigo não entenderia.

Regras:
- Responda SEMPRE em português brasileiro
- NUNCA use travessão (—).
- Identifique cada termo técnico presente no artigo
- IMPORTANTE: Separe cada termo com o marcador "---TERMO---" em uma linha sozinha antes do termo
- Para cada termo, use como título o próprio termo: "## República Federativa", "## Estado Democrático de Direito", etc.
- Depois do título, forneça:
  - **Definição simples**: [Em palavras cotidianas, acessíveis para qualquer pessoa]
  - **Definição técnica**: [Rigor doutrinário e jurisprudencial exato]`;
            } else { // mode === 'jurisprudencia'
              sys = `Você é um pesquisador sênior de jurisprudência dos Tribunais Superiores (STF e STJ).
Sua missão é apresentar até 3 precedentes judiciais REAIS, HISTÓRICOS ou SÚMULAS vinculados diretamente ao artigo legal informado.

REGRAS ABSOLUTAS:
- Apenas julgados reais e verificáveis do STF ou STJ (Súmulas, Temas de Repercussão Geral, Recursos Repetitivos, ADIs, REsps marcantes).
- NUNCA invente números de processos. Se houver súmula do tribunal sobre o artigo, cite-a.
- NUNCA use travessão (—).

Separe cada julgado com:
---JULGADO---
## [Tribunal] - [Processo / Súmula / Tema] ([Ano])
- **O Caso**: [Resumo em linguagem simples do conflito que chegou ao tribunal]
- **A Decisão**: [A tese jurídica fixada pelo tribunal]
- **Por que importa para o artigo**: [Como esse precedente orienta a aplicação prática deste artigo]
- **Fonte oficial**: [URL oficial do STF/STJ ou termo de busca oficial]`;
            }

            const fullTextForAI = [artigo.caput, ...(artigo.incisos || []), ...(artigo.paragrafos || [])].filter(Boolean).join('\n');
            const prompt = `LEGISLAÇÃO: ${tabelaNome || ''}\nARTIGO: ${artigo.numero}\nTEXTO:\n${fullTextForAI}`;
            
            const reply = await generateOmniText({ 
              prompt, 
              systemPrompt: sys, 
              complexity: 'low' 
            });
            
            clearInterval(stepInterval);
            if (reply) {
              setAiGeneratingStep(3);
              setAiContent(prev => ({ ...prev, [activeTab]: reply }));
              setLocalAiCache(cacheKey.tabela, cacheKey.numero, cacheKey.modo, reply);
              // Save to DB cache
              supabase.from('artigo_ai_cache').upsert({
                tabela_codigo: cacheKey.tabela,
                numero_artigo: cacheKey.numero,
                tipo: cacheKey.modo,
                conteudo: reply,
              }, { onConflict: 'tabela_codigo,numero_artigo,tipo' }).then(() => {});
            } else {
              setAiContent(prev => ({ ...prev, [activeTab]: 'Não foi possível gerar o conteúdo. Tente novamente.' }));
            }
            setAiLoading(prev => ({ ...prev, [activeTab]: false }));
            setTimeout(() => setAiGeneratingMode(null), 500);
          } catch (error) {
            clearInterval(stepInterval);
            setAiContent(prev => ({ ...prev, [activeTab]: 'Não foi possível gerar o conteúdo. Tente novamente.' }));
            setAiLoading(prev => ({ ...prev, [activeTab]: false }));
            setTimeout(() => setAiGeneratingMode(null), 500);
          }
        })();
      });
    });
  }, [activeTab, artigo?.id]);

  useEffect(() => {
    if (!artigo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [artigo, onClose]);

  if (!artigo) return null;

  // Nomen juris & sanitização inteligente para Código Penal (CP) e Código Penal Militar (CPM)
  const isCodigoPenal = Boolean(
    leiSlug === 'cp' ||
    leiSlug === 'cpm' ||
    (tabelaNome && /^(CP_|CPM_)/i.test(tabelaNome)) ||
    showNomenJuris
  );

  const sanitizedCaput = isCodigoPenal
    ? sanitizePenalArticleText(artigo.caput || '', artigo.numero, leiSlug || tabelaNome)
    : (artigo.caput || '');

  const fullText = normalizeLegalLineBreaks(sanitizedCaput);
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
  let nomenJuris: string | null = null;
  let contentLines = lines;
  const structuralPattern = /^(LIVRO|PARTE|TÍTULO)\s+/i;
  contentLines = contentLines.filter(l => !structuralPattern.test(l.trim()));

  if (isCodigoPenal) {
    nomenJuris = getNomenJuris(leiSlug || tabelaNome, artigo.numero, artigo.titulo);

    if (contentLines.length > 0) {
      const firstLine = contentLines[0].trim();
      const firstLineClean = firstLine.replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase();
      const nomenClean = (nomenJuris || '').trim().toLowerCase();

      // Se a primeira linha contiver apenas o nomen juris ou for idêntica a ele, consome a linha
      if (nomenClean && (firstLineClean === nomenClean || firstLineClean.startsWith(nomenClean))) {
        contentLines = contentLines.slice(1);
      } else if (!nomenJuris && contentLines.length > 1) {
        // Fallback heurístico caso não esteja no catálogo mas a primeira linha seja um título válido
        const isNomen =
          firstLineClean.length > 0 &&
          firstLineClean.length <= 60 &&
          /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÇ]/i.test(firstLineClean) &&
          !/^(Art\.|§|Parágrafo|[IVXLC]+\s*[-–.]|[a-z]\))/i.test(firstLineClean) &&
          !/[.;:!?]/.test(firstLineClean) &&
          !/\b(não|será|é|foi|são|tem|houver|aplica|considera)\b/i.test(firstLineClean);

        if (isNomen) {
          nomenJuris = firstLine;
          contentLines = contentLines.slice(1);
        }
      }
    }
  }

  const rawContent = contentLines.join('\n');
  const rawLines = rawContent.split('\n').filter(l => l.trim() !== '');
  // Keep revoked lines in the display even when redação is stripped
  const processedLines = rawLines.map(l => {
    if (isLineRevogado(l)) return l; // always keep revoked lines as-is
    return showRedacao ? l : stripRedacao(l);
  }).filter(l => l.trim() !== '');
  const isRevogado = processedLines.length === 0 && rawLines.length > 0;
  const initialDisplayLines = isRevogado ? rawLines : processedLines;
  const displayLines: string[] = [];
  initialDisplayLines.forEach(line => {
    if (isLineRevogado(line) && line.trim().startsWith('(')) {
      if (displayLines.length > 0) {
        displayLines[displayLines.length - 1] += ` ${line.trim()}`;
        return;
      }
    }
    displayLines.push(line);
  });

  const navChips: { chip: string; index: number }[] = [];
  if (displayLines && displayLines.length > 1) {
    displayLines.forEach((line, i) => {
      if (i === 0) {
        navChips.push({ chip: 'Caput', index: i });
        return;
      }
      const t = line.trim();
      if (/^[a-z]\)\s*/i.test(t)) {
        const m = t.match(/^([a-z])\)/i);
        if (m) navChips.push({ chip: `Alínea ${m[1].toLowerCase()}`, index: i });
      } else if (/^§\s*(\d+)/i.test(t)) {
        const m = t.match(/^§\s*(\d+)/i);
        if (m) navChips.push({ chip: `Parágrafo ${m[1]}º`, index: i });
      } else if (/^Par[áa]grafo\s+[úu]nico/i.test(t)) {
        navChips.push({ chip: 'Parágrafo único', index: i });
      } else if (/^([IVXLCDM]+)\s*[-–.)]/i.test(t)) {
        const m = t.match(/^([IVXLCDM]+)/i);
        if (m) navChips.push({ chip: `Inciso ${m[1].toUpperCase()}`, index: i });
      }
    });
  }

  const getRenderedLineText = (line: string, lineIndex: number, isFirst: boolean) => {
    const isModifiedLine = modificationInfo && modificationInfo.linhasModificadas.includes(lineIndex);
    const displayText = modificationInfo
      ? (isModifiedLine && showRedacao ? line : stripRedacao(line))
      : (showRedacao ? line : stripRedacao(line));

    if (isFirst && !isRevogado) {
      return displayText
        .replace(ARTICLE_PREFIX_STRIP_REGEX, '')
        .replace(/^[.:–—-]+/, '');
    }
    return displayText;
  };

  const renderedLineTexts = displayLines.map((line, index) => getRenderedLineText(line, index, index === 0));
  const lineWordStartIndexes: number[] = [];
  let renderedWordCursor = 0;
  for (const text of renderedLineTexts) {
    lineWordStartIndexes.push(renderedWordCursor);
    renderedWordCursor += getWordTokens(text).length;
  }

  const renderedArticleTokens = renderedLineTexts
    .flatMap(getWordTokens)
    .map(normalizeNarracaoToken)
    .filter(Boolean);
  const timingTokens = (narracaoWordTimings || [])
    .map(t => normalizeNarracaoToken(t.word))
    .filter(Boolean);
  const articleTimingStartIndex = (() => {
    if (!renderedArticleTokens.length || !timingTokens.length) return -1;
    const sample = renderedArticleTokens.slice(0, Math.min(5, renderedArticleTokens.length));
    for (let i = 0; i <= timingTokens.length - sample.length; i++) {
      if (sample.every((token, offset) => timingTokens[i + offset] === token)) return i;
    }
    const first = renderedArticleTokens[0];
    return timingTokens.findIndex(token => token === first);
  })();

  // Cobertura: se faltam timings pro final do texto, distribui uniformemente entre
  // o fim do último timing e a duração do áudio (fallback pra karaokê nunca parar antes do fim).
  // Sem useMemo/useEffect aqui porque este trecho está depois de um early-return (linha 1047).
  const effectiveTimings = (() => {
    if (!narracaoWordTimings?.length) return narracaoWordTimings;
    if (articleTimingStartIndex < 0) return narracaoWordTimings;
    const coveredCount = timingTokens.length - articleTimingStartIndex;
    const missing = renderedArticleTokens.length - coveredCount;
    if (missing <= 0) return narracaoWordTimings;

    const audioDur = narracaoAudioRef.current?.duration || 0;
    const last = narracaoWordTimings[narracaoWordTimings.length - 1];
    if (!last || audioDur <= last.end) return narracaoWordTimings;

    const slice = (audioDur - last.end) / missing;
    const startFrom = renderedArticleTokens.length - missing;
    const extra = Array.from({ length: missing }, (_, i) => ({
      word: renderedArticleTokens[startFrom + i] || '',
      start: last.end + i * slice,
      end: last.end + (i + 1) * slice,
    }));
    return [...narracaoWordTimings, ...extra];
  })();

  // Atualiza o ref usado pelo RAF direto no render (seguro — ref não dispara re-render)
  narracaoTimingsRef.current = effectiveTimings ?? null;

  // Prepara os intervalos de tempo de cada linha para sincronização do destaque animado (amarelo)
  // Sem useMemo aqui porque este trecho está após o early-return de if (!artigo)
  const computedLineRanges = (() => {
    if (!displayLines.length) return [];
    
    // 1. Se temos timings exatos de palavras
    if (effectiveTimings && effectiveTimings.length > 0) {
      return displayLines.map((_, lineIdx) => {
        const startWordIdx = lineWordStartIndexes[lineIdx] ?? 0;
        const nextWordIdx = lineWordStartIndexes[lineIdx + 1] ?? effectiveTimings.length;
        const lineTimings = effectiveTimings.slice(startWordIdx, nextWordIdx);
        const start = lineTimings[0]?.start ?? (lineIdx === 0 ? 0 : 9999);
        const end = lineTimings[lineTimings.length - 1]?.end ?? start;
        return { lineIndex: lineIdx, start, end };
      });
    }

    // 2. Se não temos timings por palavra, distribuímos proporcionalmente pela contagem de palavras
    const totalWords = renderedLineTexts.reduce((acc, t) => acc + (getWordTokens(t).length || 1), 0) || 1;
    let accumWords = 0;
    return displayLines.map((_, lineIdx) => {
      const wordsInLine = getWordTokens(renderedLineTexts[lineIdx] || '').length || 1;
      const startPct = accumWords / totalWords;
      accumWords += wordsInLine;
      const endPct = accumWords / totalWords;
      return { lineIndex: lineIdx, startPct, endPct, start: 0, end: 0 };
    });
  })();

  narracaoLineRangesRef.current = computedLineRanges;

  const activeRenderedWordIndex = articleTimingStartIndex >= 0 && activeNarracaoWordIndex >= articleTimingStartIndex
    ? activeNarracaoWordIndex - articleTimingStartIndex
    : -1;

  const renderLine = (line: string, lineIndex: number, isFirst: boolean) => {
    const classified = classifyLine(line);
    const lineHighlights = getLineHighlights(lineIndex);
    const lineIsRevogado = isLineRevogado(line);

    // When opened from novidades, only show the specific modification reference on modified lines
    // and strip ALL references from non-modified lines
    const isModifiedLine = modificationInfo && modificationInfo.linhasModificadas.includes(lineIndex);
    const displayText = modificationInfo
      ? (isModifiedLine && showRedacao ? line : stripRedacao(line))
      : (showRedacao ? line : stripRedacao(line));

    // If this specific line is revoked (inciso/paragraph with only "(Revogado...)"), show it styled
    if (lineIsRevogado && !isRevogado) {
      const revogadoDisplay = showRedacao ? line : line;
      const noteMatch = revogadoDisplay.match(/^(.*?)(\(Revogado.*\))$/i);
      
      if (noteMatch && noteMatch[1].trim()) {
        return (
          <p key={lineIndex} data-line-index={lineIndex} className={`leading-[1.8] ${classified.type === 'inciso' ? 'mt-2.5 pl-4 border-l-2 border-primary/30' : classified.type === 'alinea' ? 'mt-1.5 pl-8' : classified.type === 'paragrafo' ? 'mt-2' : ''}`} style={{ fontSize: `${fontSize}px` }}>
            <span className="text-foreground mr-1.5 font-semibold">{noteMatch[1]}</span>
            <span className="bg-purple-500/20 text-purple-300 rounded px-1.5 py-0.5 italic" style={{ fontSize: `${Math.max(fontSize - 2, 10)}px` }}>{noteMatch[2]}</span>
          </p>
        );
      }

      return (
        <p key={lineIndex} data-line-index={lineIndex} className={`italic leading-[1.8] ${classified.type === 'inciso' ? 'pl-4 border-l-2 border-purple-400/30' : classified.type === 'alinea' ? 'pl-8' : classified.type === 'paragrafo' ? 'mt-2' : ''}`} style={{ fontSize: `${Math.max(fontSize - 1, 10)}px` }}>
          <span className="bg-purple-500/20 text-purple-300 rounded px-1 py-0.5">{revogadoDisplay}</span>
        </p>
      );
    }

    let baseNodes: React.ReactNode[];
    let offsetShift = 0;
    if (isFirst && !isRevogado) {
      // Remove the article number prefix from the first line since the header already shows it
      const cleanedText = displayText
        .replace(ARTICLE_PREFIX_STRIP_REGEX, '')
        .replace(/^[.:–—-]+/, '');
      offsetShift = displayText.length - cleanedText.length;
      baseNodes = highlightTermos(cleanedText, modificationInfo ? isModifiedLine && showRedacao : showRedacao, handleCrossReferenceClick, undefined, handleCrossReferenceHover, handleCrossReferenceLeave);
    } else {
      baseNodes = highlightTermos(displayText, modificationInfo ? isModifiedLine && showRedacao : showRedacao, handleCrossReferenceClick, undefined, handleCrossReferenceHover, handleCrossReferenceLeave);
    }

    // Adjust highlight offsets to match rendered (prefix-stripped) text.
    // Discard any highlight that falls entirely inside the stripped prefix.
    const adjustedHighlights = offsetShift > 0
      ? lineHighlights
          .map(h => ({
            ...h,
            startOffset: Math.max(0, h.startOffset - offsetShift),
            endOffset: h.endOffset - offsetShift,
          }))
          .filter(h => h.endOffset > 0 && h.endOffset > h.startOffset)
      : lineHighlights;

    let finalNodes = applyHighlightsToText(baseNodes, adjustedHighlights, removeHighlight, highlightMode, handleHoverHighlight, handleTapHighlight);


    // Apply magic highlights on top — works on the full line text, not individual nodes
    if (magicMode && magicHighlights.length > 0) {
      // Extract all text content from finalNodes to build a flat string
      const extractText = (nodes: React.ReactNode[]): string => {
        return nodes.map(n => {
          if (typeof n === 'string') return n;
          if (n && typeof n === 'object' && 'props' in (n as any)) {
            const props = (n as any).props;
            if (typeof props?.children === 'string') return props.children;
            if (Array.isArray(props?.children)) return extractText(props.children);
          }
          return '';
        }).join('');
      };
      
      const fullLineText = extractText(finalNodes);
      
      // Find magic grifo matches in the full line text
      const magicMatches: { start: number; end: number; grifo: typeof magicHighlights[0] }[] = [];
      for (const grifo of magicHighlights) {
        const idx = fullLineText.indexOf(grifo.trechoExato);
        if (idx !== -1) {
          magicMatches.push({ start: idx, end: idx + grifo.trechoExato.length, grifo });
        }
      }
      
      if (magicMatches.length > 0) {
        magicMatches.sort((a, b) => a.start - b.start);
        // Remove overlaps
        const filtered: typeof magicMatches = [];
        for (const m of magicMatches) {
          if (filtered.length === 0 || m.start >= filtered[filtered.length - 1].end) {
            filtered.push(m);
          }
        }
        
        // Rebuild nodes: walk through finalNodes tracking character position
        const newNodes: React.ReactNode[] = [];
        let charPos = 0;
        
        const wrapWithMagic = (text: string, offsetInLine: number, nodeKey: string): React.ReactNode[] => {
          const parts: React.ReactNode[] = [];
          let localPos = 0;
          for (const m of filtered) {
            const relStart = m.start - offsetInLine;
            const relEnd = m.end - offsetInLine;
            if (relEnd <= 0 || relStart >= text.length) continue;
            const clampStart = Math.max(0, relStart);
            const clampEnd = Math.min(text.length, relEnd);
            if (clampStart > localPos) parts.push(text.slice(localPos, clampStart));
            parts.push(
              <mark
                key={`magic-${nodeKey}-${m.start}`}
                style={{ backgroundColor: MAGIC_COLORS[m.grifo.cor] || MAGIC_COLORS.amarelo, color: 'white', borderRadius: '3px', padding: '1px 3px', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setMagicTooltip(prev => prev?.grifo.trechoExato === m.grifo.trechoExato ? null : { grifo: m.grifo, rect });
                }}
              >
                {text.slice(clampStart, clampEnd)}
              </mark>
            );
            localPos = clampEnd;
          }
          if (localPos < text.length) parts.push(text.slice(localPos));
          return parts.length > 0 ? parts : [text];
        };
        
        const processNode = (node: React.ReactNode, idx: number): React.ReactNode => {
          if (typeof node === 'string') {
            const result = wrapWithMagic(node, charPos, `s${idx}`);
            charPos += node.length;
            return result.length === 1 ? result[0] : result;
          }
          if (node && typeof node === 'object' && 'props' in (node as any)) {
            const el = node as React.ReactElement;
            const children = el.props?.children;
            if (typeof children === 'string') {
              const result = wrapWithMagic(children, charPos, `e${idx}`);
              charPos += children.length;
              if (result.length === 1 && typeof result[0] === 'string') return node; // unchanged
              const { children: _, ...restProps } = el.props;
              // @ts-ignore
              return <el.type {...restProps} key={el.key || `mn${idx}`}>{result}</el.type>;
            }
            if (Array.isArray(children)) {
              const newChildren = children.map((c: React.ReactNode, ci: number) => processNode(c, idx * 100 + ci));
              const { children: _, ...restProps } = el.props;
              // @ts-ignore
              return <el.type {...restProps} key={el.key || `mn${idx}`}>{newChildren}</el.type>;
            }
          }
          return node;
        };
        
        finalNodes = finalNodes.map((n, i) => processNode(n, i)).flat();
      }
    }

    if (narracaoPlaying && activeRenderedWordIndex >= 0) {
      let wordIndex = lineWordStartIndexes[lineIndex] || 0;
      const highlightTextNode = (text: string, keyPrefix: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const matches = Array.from(text.matchAll(/[\p{L}\p{N}]+(?:[-–][\p{L}\p{N}]+)*/gu));

        matches.forEach((match, matchIndex) => {
          const start = match.index ?? 0;
          const end = start + match[0].length;
          const currentWordIndex = wordIndex++;
          if (currentWordIndex !== activeRenderedWordIndex) return;

          if (start > lastIndex) parts.push(text.slice(lastIndex, start));
          parts.push(
            <motion.mark
              key={`narracao-${keyPrefix}-${matchIndex}`}
              initial={{ backgroundSize: '0% 108%' }}
              animate={{ backgroundSize: '100% 108%' }}
              transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
              className="rounded-[4px] bg-transparent text-inherit"
              style={{
                backgroundImage: 'linear-gradient(hsl(var(--primary) / 0.62), hsl(var(--primary) / 0.62))',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left 50%',
                padding: '0 1px',
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}
            >
              {match[0]}
            </motion.mark>
          );
          lastIndex = end;
        });

        if (lastIndex < text.length) parts.push(text.slice(lastIndex));
        return parts.length ? parts : [text];
      };

      const processNarracaoNode = (node: React.ReactNode, keyPrefix: string): React.ReactNode => {
        if (typeof node === 'string') {
          const parts = highlightTextNode(node, keyPrefix);
          return parts.length === 1 ? parts[0] : parts;
        }
        if (isValidElement(node)) {
          const children = (node.props as any)?.children;
          if (typeof children === 'string') {
            const parts = highlightTextNode(children, keyPrefix);
            return cloneElement(node as React.ReactElement<any>, { key: node.key || keyPrefix }, parts.length === 1 ? parts[0] : parts);
          }
          if (Array.isArray(children)) {
            return cloneElement(
              node as React.ReactElement<any>,
              { key: node.key || keyPrefix },
              children.map((child, index) => processNarracaoNode(child, `${keyPrefix}-${index}`)),
            );
          }
        }
        return node;
      };

      finalNodes = finalNodes.map((node, index) => processNarracaoNode(node, `l${lineIndex}-${index}`)).flat();
    }

    if (isRevogado) {
      return (
        <p key={lineIndex} data-line-index={lineIndex} className="leading-[1.8]" style={{ fontSize: `${Math.max(fontSize - 2, 10)}px` }}>
          <span className="bg-purple-500/20 text-purple-300 rounded px-1 py-0.5">{line}</span>
        </p>
      );
    }

    const isCurrentNarratingLine = narracaoPlaying && narracaoActiveLineIndex === lineIndex;

    const extra =
      classified.type === 'inciso' ? 'mt-2.5 pl-4 border-l-2 border-primary/30' :
      classified.type === 'alinea' ? 'mt-1.5 pl-8' :
      classified.type === 'paragrafo' ? 'mt-3.5' : '';

    const highlightBg = isCurrentNarratingLine
      ? 'animate-narracao-active border-l-4 border-primary text-foreground rounded-r-xl py-2.5 px-3 -mx-2.5 ring-1 ring-primary/40 shadow-sm shadow-primary/20 transition-all duration-500 ease-out'
      : isModifiedLine
      ? 'bg-violet-500/20 border-l-3 border-violet-400 pl-3 rounded-r-lg'
      : !modificationInfo && showRedacao && EDITORIAL_NOTE_TEST_REGEX.test(line)
        ? 'bg-primary/5 border-l-2 border-primary/40 pl-2 rounded-r'
        : '';

    const artLabel = (() => {
      const num = (artigo?.numero || '').trim();
      if (/^\d/.test(num)) return `Art. ${num}`;
      return num;
    })();

    return (
      <p
        key={lineIndex}
        data-line-index={lineIndex}
        className={`text-foreground leading-[1.8] relative overflow-hidden ${extra} ${highlightBg}`}
        style={{ fontSize: `${fontSize}px` }}
      >
        {isCurrentNarratingLine && (
          <span
            key={`sheen-${lineIndex}`}
            className="narracao-sheen-bar pointer-events-none"
            aria-hidden="true"
          />
        )}
        {isFirst && !isRevogado && artLabel && (
          <>
            <span className="font-bold text-primary-light">{artLabel}</span>
            <span className="text-foreground/60"> — </span>
          </>
        )}
        {finalNodes}
      </p>
    );
  };


  const commentsWithText = highlights.filter(h => h.comment && h.comment.trim().length > 0);

  const handleSheetClose = () => {
    // Se a narração está tocando, transfere o áudio para o player flutuante
    // em vez de destruí-lo. Assim a pessoa continua ouvindo mesmo após fechar.
    const currentAudio = narracaoAudioRef.current;
    if (narracaoPlaying && currentAudio && artigo) {
      narracaoAdoptedRef.current = true;
      stopProgressTracking();
      adoptNarracao({
        audio: currentAudio,
        artigo,
        tabelaNome,
        leiNome: tabelaNome,
        returnPath: location.pathname + location.search,
      });
    }
    onClose();
  };

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {Boolean(artigo) && (
            <>
              {/* Backdrop suave */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={handleSheetClose}
                className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-[2px]"
              />

              {/* Sheet com mecânica nativa ultra fluida idêntica a Códigos */}
              <motion.div
                initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
                animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
                exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                }}
                className={
                  isDesktop
                    ? "fixed inset-0 m-auto z-[9999] flex min-h-0 flex-col gap-0 overflow-hidden overscroll-contain border border-white/10 bg-background p-0 shadow-2xl rounded-2xl h-[85vh] w-[640px] max-w-[90vw]"
                    : "fixed inset-x-0 bottom-0 z-[9999] flex min-h-0 flex-col gap-0 overflow-hidden overscroll-contain rounded-t-3xl border-t border-white/5 bg-background p-0 h-[96dvh] max-h-[96dvh]"
                }
              >
                {!isDesktop && (
                  <div className="shrink-0 flex justify-center pt-3 pb-1 bg-background">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                  </div>
                )}

        {/* Scrollable content area: header, tabs and article content scroll up; bottom nav stays fixed */}
        <div 
          ref={scrollContainerRef as any} 
          className="flex-1 overflow-y-auto min-h-0 relative overscroll-contain"
        >

        {/* Top bar: heart/eye (left) + online count + close (right) */}
        <div className="px-4 pt-1 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!highlightMode && !isFromNovidades && (
              <>
                <motion.button
                  onClick={() => {
                    if (!isPremium) {
                      openPremiumGate('favorito', 'Favoritar artigos e montar sua pasta pessoal é exclusivo para assinantes.');
                      return;
                    }
                    import('@/lib/appEvents').then(({ appEvents }) =>
                      appEvents.favoritarArtigo({ tabela: tabelaNome, numero: artigo.numero, on: !isFavorito })
                    ).catch(() => {});
                    if (onToggleFavorito) {
                      onToggleFavorito();
                    } else if (tabelaNome && artigo?.numero) {
                      const num = String(artigo.numero).replace(/^Art\.\s*/i, '').trim();
                      const preview = String(artigo.caput || '').slice(0, 240);
                      import('@/lib/artigosFavoritos').then(({ toggleArtigoFavorito }) => {
                        toggleArtigoFavorito({
                          tabela_codigo: tabelaNome,
                          numero_artigo: num,
                          conteudo_preview: preview || null,
                        }).catch(() => {});
                      });
                    }
                  }}
                  whileTap={{ scale: 0.85 }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${isFavorito ? 'bg-rose-500/15' : 'hover:bg-secondary active:bg-secondary'}`}
                  title={isFavorito ? 'Remover favorito' : 'Favoritar'}
                  aria-label={isFavorito ? 'Remover favorito' : 'Favoritar'}
                >
                  <motion.span
                    key={isFavorito ? 'on' : 'off'}
                    initial={{ scale: isFavorito ? 0.6 : 1 }}
                    animate={{ scale: isFavorito ? [0.6, 1.35, 1] : 1 }}
                    transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                    className="inline-flex"
                  >
                    <Heart
                      className={`w-6 h-6 transition-colors ${isFavorito ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.55)]' : 'text-muted-foreground'}`}
                      strokeWidth={2}
                    />
                  </motion.span>
                </motion.button>
                <motion.button
                  onClick={() => setShowRedacao(!showRedacao)}
                  whileTap={{ scale: 0.9 }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${showRedacao ? 'bg-primary/20' : 'hover:bg-secondary active:bg-secondary'}`}
                  title={showRedacao ? 'Ocultar redações' : 'Mostrar redações'}
                  aria-label={showRedacao ? 'Ocultar redações' : 'Mostrar redações'}
                >
                  {showRedacao
                    ? <Eye className="w-6 h-6 text-primary" />
                    : <EyeOff className="w-6 h-6 text-muted-foreground" />
                  }
                </motion.button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onlineCount > 1 && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-400/10 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {onlineCount}
              </span>
            )}
            {!highlightMode && (
              <button 
                onClick={handleSheetClose} 
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-400 hover:bg-amber-500 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm" 
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-black" />
              </button>
            )}
          </div>
        </div>

        {/* Big Art. Nº + Ver no Planalto */}
        <div className="px-5 pt-1 pb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-3xl font-bold text-foreground">
            {/^\d/.test(artigo.numero) ? `Art. ${artigo.numero}` : artigo.numero}
          </h3>
          {planaltoUrl && !highlightMode && (
            <a
              href={planaltoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 pl-3.5 pr-4 py-2 rounded-full bg-neutral-900/85 border border-white/10 shadow-lg shadow-black/40 text-white/90 hover:text-white hover:bg-neutral-800 active:scale-95 transition shrink-0"
              aria-label="Ver no Planalto"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-[13px] font-medium whitespace-nowrap">Ver no Planalto</span>
            </a>
          )}
        </div>

        {/* Share panel */}
        <AnimatePresence>
          {showSharePanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 pb-2 overflow-hidden"
            >
              <ShareButtons
                artigoNumero={artigo.numero}
                artigoTexto={artigo.caput}
                leiNome={tabelaNome}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(highlightMode || voiceGrifoActive) && (
            <HighlightColorBar
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              onClearAll={clearAll}
            />
          )}
        </AnimatePresence>

        {/* Magic Highlights Legend */}
        <AnimatePresence>
          {magicMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 pb-2 overflow-hidden"
            >
              <div className="flex items-center gap-3 flex-wrap py-1.5">
                {(() => {
                  const LABELS: Record<string, string> = {
                    amarelo: 'Chave',
                    verde: 'Exceção',
                    azul: 'Efeito',
                    rosa: 'Termo',
                    laranja: 'Pegadinha',
                  };
                  const ORDER = ['amarelo', 'verde', 'azul', 'rosa', 'laranja'];
                  const present = new Set(magicHighlights.map((g) => g.cor));
                  return ORDER.filter((c) => present.has(c as any)).map((cor) => (
                    <span key={cor} className="flex items-center gap-1 text-[10px] text-foreground/70">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: MAGIC_COLORS[cor], boxShadow: `0 0 0 1px ${MAGIC_COLORS[cor]}` }}
                      />
                      {LABELS[cor]}
                    </span>
                  ));
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs value={activeTab} onValueChange={(v) => {
          if (!isPremium && v !== 'artigo') {
            const keyMap: Record<string, PremiumFeatureKey> = {
              ideia: 'ideia',
              explicacao: 'explicacao',
              desdobramento: 'desdobramento',
              exemplo: 'exemplo',
              termos: 'termos',
              jurisprudencia: 'jurisprudencia',
              historico: 'historico',
            };
            const gateKey = keyMap[v] || 'default';
            strictGateFeature(gateKey, () => setActiveTab(v));
            return;
          }
          setActiveTab(v);
        }} className="flex flex-col">
          {(() => {
            const articleFullText = [artigo?.caput, ...(artigo?.incisos || []), ...(artigo?.paragrafos || [])].join('\n');
            const hasHistorico = /\((?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Revogad[oa]|Acrescid[oa]|Alterad[oa])/i.test(articleFullText);
            
            return (
              <TabsList className="ml-5 mr-0 bg-secondary/60 rounded-l-2xl rounded-r-none h-11 flex overflow-x-auto p-1 pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden justify-start snap-x snap-mandatory">
                <TabsTrigger value="artigo" className="rounded-xl flex-shrink-0 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 snap-start">
                  Artigo
                </TabsTrigger>
                <TabsTrigger value="ideia" className="rounded-xl flex-shrink-0 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 snap-start">
                  Ideia
                </TabsTrigger>
                <TabsTrigger value="explicacao" className="rounded-xl flex-shrink-0 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 snap-start">
                  Explicação
                </TabsTrigger>
                <TabsTrigger value="desdobramento" className="rounded-xl flex-shrink-0 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 snap-start">
                  Raio-X
                </TabsTrigger>
                {!modificationInfo && (
                  <>
                    <TabsTrigger value="exemplo" className="rounded-xl flex-shrink-0 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 snap-start">
                      Exemplo
                    </TabsTrigger>
                    <TabsTrigger value="termos" className="rounded-xl flex-shrink-0 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 snap-start">
                      Termos
                    </TabsTrigger>
                    <TabsTrigger value="jurisprudencia" className="rounded-xl flex-shrink-0 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 snap-start">
                      Jurisprudência
                    </TabsTrigger>
                  </>
                )}
                {hasHistorico && (
                  <TabsTrigger value="historico" className="rounded-xl flex-shrink-0 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 snap-start">
                    Histórico
                  </TabsTrigger>
                )}
              </TabsList>
            );
          })()}


          <TabsContent value="artigo" className="px-5 pb-[calc(9rem+var(--sai-bottom,var(--sai-bottom)))] pt-4 relative">
            {/* Barra de progresso da narração (sticky no topo) */}
            {narracaoPlaying && (
              <div className="sticky top-0 z-30 -mx-5 -mt-4 mb-3 bg-background/95 backdrop-blur-md border-b border-white/5 px-5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleNarrarButtonPress}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-colors"
                    aria-label="Pausar narração"
                  >
                    <Pause className="w-3.5 h-3.5 text-primary-foreground" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div
                      className="h-1.5 rounded-full bg-white/10 overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        const audio = narracaoAudioRef.current;
                        if (!audio || !audio.duration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        audio.currentTime = pct * audio.duration;
                        narracaoActiveIdxRef.current = -1;
                      }}
                    >
                      <div
                        ref={narracaoProgressFillRef}
                        className="h-full bg-gradient-to-r from-primary to-amber-400 transition-[width] duration-100 ease-out"
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-[10.5px] font-mono text-foreground/70 tabular-nums">
                    <span ref={narracaoTimeRef}>0:00</span>
                    <span className="text-foreground/40"> / </span>
                    <span ref={narracaoTotalTimeRef}>0:00</span>
                  </div>
                </div>
              </div>
            )}
            {/* Brasão watermark fixo */}
            <div className="sticky top-1/2 -translate-y-1/2 left-0 right-0 flex items-center justify-center pointer-events-none z-0" style={{ height: 0 }}>
              <img src={brasaoImg} alt="" className="w-48 h-48 opacity-[0.06] object-contain" />
            </div>

            <div
              ref={scrollContainerRef as any}
              className=""
            >
              {nomenJuris && (
                <div className="mb-5 pt-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Nomen Juris
                  </div>
                  <h3 className="font-heading font-black text-xl sm:text-2xl text-primary tracking-wide uppercase leading-snug">
                    {showRedacao ? highlightTermos(nomenJuris, true) : stripRedacao(nomenJuris)}
                  </h3>
                  {/* Linha divisória e respiro antes do texto da norma */}
                  <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent mt-3" />
                </div>
              )}

              {isRevogado && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1 text-purple-300 text-xs font-semibold">
                  Dispositivo revogado
                </div>
              )}

              {/* Epígrafe adicional do artigo caso não coincida com o nomenJuris já exibido */}
              {artigo.titulo &&
                (!nomenJuris || artigo.titulo.toLowerCase().trim() !== nomenJuris.toLowerCase().trim()) &&
                !/^(PARTE|LIVRO|T[IÍ]TULO|CAP[IÍ]TULO|SEÇ[AÃ]O|SUBSEÇ[AÃ]O)\b/i.test(artigo.titulo) && (
                  <p className="mb-4 border-l-2 border-primary/70 pl-3 text-[13px] italic text-primary/90 font-body leading-snug">
                    {artigo.titulo}
                  </p>
                )}


              {/* Menu de alternância (Chips para alínea, caput, etc.) */}
              {navChips.length > 1 && (
                <div className="mb-4 -mx-5 px-5">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {navChips.map((chip, idx) => {
                      const isChipActive = narracaoPlaying && (
                        narracaoActiveLineIndex === chip.index ||
                        (narracaoActiveLineIndex >= chip.index && (idx === navChips.length - 1 || narracaoActiveLineIndex < navChips[idx + 1].index))
                      );

                      return (
                        <button
                          key={idx}
                          data-chip-active={isChipActive}
                          onClick={() => {
                            const el = containerRef.current?.querySelector(`[data-line-index="${chip.index}"]`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('animate-narracao-active', 'border-l-4', 'border-primary', 'ring-2', 'ring-primary/40', 'rounded-xl', 'px-2');
                              setTimeout(() => {
                                el.classList.remove('animate-narracao-active', 'border-l-4', 'border-primary', 'ring-2', 'ring-primary/40', 'px-2');
                              }, 1400);
                            }
                            if (narracaoPlaying && narracaoAudioRef.current && computedLineRanges[chip.index]) {
                              const r = computedLineRanges[chip.index] as any;
                              const dur = narracaoAudioRef.current.duration || 0;
                              const targetT = typeof r.startPct === 'number' && dur > 0 ? r.startPct * dur : r.start;
                              if (Number.isFinite(targetT)) {
                                narracaoAudioRef.current.currentTime = targetT;
                              }
                            }
                          }}
                          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-extrabold transition-all duration-300 ${
                            isChipActive
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105 ring-2 ring-primary/60'
                              : 'bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary'
                          }`}
                        >
                          {chip.chip}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                ref={containerRef}
                className={`space-y-4 font-legal text-base ${highlightMode ? 'highlight-selectable' : ''}`}
                style={highlightMode ? {
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  ['--hl-selection' as any]: selectedColor,
                } : undefined}
                onPointerDown={highlightMode ? (e) => {
                  if (e.pointerType === 'mouse' && e.button !== 0) return;
                  const getCaretRange = (x: number, y: number) => {
                    if (typeof document.caretRangeFromPoint === 'function') return document.caretRangeFromPoint(x, y);
                    if ((document as any).caretPositionFromPoint) {
                      const pos = (document as any).caretPositionFromPoint(x, y);
                      if (pos) { const r = document.createRange(); r.setStart(pos.offsetNode, pos.offset); r.collapse(true); return r; }
                    }
                    return null;
                  };
                  const range = getCaretRange(e.clientX, e.clientY);
                  if (range) {
                    (containerRef.current as any)._paintState = { isDragging: true, startNode: range.startContainer, startOffset: range.startOffset };
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  }
                } : undefined}
                onPointerMove={highlightMode ? (e) => {
                  const state = (containerRef.current as any)?._paintState;
                  if (!state?.isDragging) return;
                  const getCaretRange = (x: number, y: number) => {
                    if (typeof document.caretRangeFromPoint === 'function') return document.caretRangeFromPoint(x, y);
                    if ((document as any).caretPositionFromPoint) return (document as any).caretPositionFromPoint(x, y);
                    return null;
                  };
                  const point = getCaretRange(e.clientX, e.clientY);
                  if (point && state.startNode) {
                    const sel = window.getSelection();
                    if (point.startContainer) { // caretRange
                      sel?.setBaseAndExtent(state.startNode, state.startOffset, point.startContainer, point.startOffset);
                    } else if (point.offsetNode) { // caretPosition
                      sel?.setBaseAndExtent(state.startNode, state.startOffset, point.offsetNode, point.offset);
                    }
                  }
                } : undefined}
                onPointerUp={highlightMode ? (e) => {
                  const state = (containerRef.current as any)?._paintState;
                  if (state) state.isDragging = false;
                  handleTextSelection();
                } : undefined}
                onPointerCancel={highlightMode ? (e) => {
                  const state = (containerRef.current as any)?._paintState;
                  if (state) state.isDragging = false;
                  window.getSelection()?.removeAllRanges();
                } : undefined}
                onMouseUp={!highlightMode ? handleTextSelection : undefined}
              >
                {displayLines.map((line, i) => renderLine(line, i, i === 0))}
              </div>

            </div>




            {/* Floating card: create or view highlight note + tags */}
            <AnimatePresence>
              {commentPrompt?.show && (() => {
                const currentHl = highlights.find(h => h.id === commentPrompt.id);
                const isView = commentPrompt.mode === 'view';
                return createPortal(
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[69] bg-black/55"
                      onClick={handleDismissComment}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
                      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[calc(100vw-2rem)] max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6"
                    >
                      <div className="flex items-center gap-2.5 mb-4">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: currentHl?.color || selectedColor }}
                        />
                        <p className="text-foreground text-base sm:text-lg font-semibold flex-1">
                          {isView ? 'Sua anotação' : 'Nova anotação'}
                        </p>
                        {isView && (
                          <button
                            onClick={() => { if (currentHl) { removeHighlight(currentHl.id); handleDismissComment(); } }}
                            className="text-xs font-semibold text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-md"
                          >
                            Remover
                          </button>
                        )}
                      </div>

                      {currentHl?.text && (
                        <div
                          className="text-sm italic text-foreground/80 border-l-2 pl-3 mb-4 line-clamp-4"
                          style={{ borderColor: currentHl.color }}
                        >
                          "{currentHl.text}"
                        </div>
                      )}

                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Escreva sua anotação..."
                        className="w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm sm:text-base text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={5}
                      />

                      <div className="mt-4">
                        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Tags</p>
                        <div className="flex flex-wrap gap-2 mb-2.5">
                          {commentTags.map(t => (
                            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary text-xs font-semibold px-2.5 py-1.5">
                              #{t}
                              <button
                                onClick={() => setCommentTags(prev => prev.filter(x => x !== t))}
                                className="opacity-70 hover:opacity-100"
                                aria-label={`Remover tag ${t}`}
                              >×</button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={tagDraft}
                            onChange={(e) => setTagDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagFromDraft(); } }}
                            placeholder="Adicionar tag (ex: prova, importante)"
                            className="flex-1 bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            onClick={addTagFromDraft}
                            className="px-4 rounded-xl text-sm font-semibold bg-secondary hover:bg-secondary/80 text-foreground"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-5">
                        <button
                          onClick={handleDismissComment}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold text-muted-foreground bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          {isView ? 'Fechar' : 'Pular'}
                        </button>
                        <button
                          onClick={handleSaveComment}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
                        >
                          Salvar
                        </button>
                      </div>
                    </motion.div>
                  </>,
                  document.body
                );
              })()}
            </AnimatePresence>


            {/* Tooltip for highlighted text with comment */}
            <AnimatePresence>
              {tooltipData && tooltipHighlight?.comment && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="fixed z-[80] w-[min(20rem,calc(100vw-2rem))] bg-popover border border-border rounded-xl shadow-xl px-4 py-3"
                  style={{
                    top: tooltipData.rect.top - 8,
                    left: Math.max(16, Math.min(tooltipData.rect.left, window.innerWidth - 336)),
                    transform: 'translateY(-100%)',
                  }}
                  onMouseEnter={() => { if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); }}
                  onMouseLeave={() => setTooltipData(null)}
                >
                  <p className="text-[clamp(1rem,4.2vw,1.125rem)] text-foreground leading-[1.5]">{tooltipHighlight.comment}</p>
                  <div
                    className="absolute w-2 h-2 bg-popover border-r border-b border-border rotate-45"
                    style={{ bottom: -5, left: 16 }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Magic grifo tooltip — blurred overlay + centered card */}
            <AnimatePresence>
              {magicTooltip && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[79] bg-black/60 backdrop-blur-sm"
                    onClick={() => setMagicTooltip(null)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="fixed z-[80] left-4 right-4 top-1/2 -translate-y-1/2 max-w-md mx-auto max-h-[80dvh] overflow-y-auto overscroll-contain bg-popover border border-border rounded-2xl shadow-2xl px-5 py-5 sm:px-6 sm:py-6"
                  >
                    <button
                      onClick={() => setMagicTooltip(null)}
                      aria-label="Fechar comentário"
                      className="absolute top-2.5 right-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2.5 mb-3 pr-11">
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: MAGIC_COLORS[magicTooltip.grifo.cor] }}
                      />
                      <span className="text-[clamp(0.8125rem,3.4vw,0.9375rem)] font-bold text-foreground/80 uppercase tracking-wider">
                        {magicTooltip.grifo.hierarquia}
                      </span>
                    </div>
                    <p className="text-[clamp(1.0625rem,4.4vw,1.25rem)] text-foreground leading-[1.55] mb-4">
                      {magicTooltip.grifo.explicacao}
                    </p>
                    <div className="text-[clamp(0.9375rem,3.9vw,1.0625rem)] text-muted-foreground italic leading-[1.5] border-t border-border/40 pt-3">
                      "{magicTooltip.grifo.trechoExato}"
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

          </TabsContent>

          <TabsContent value="ideia" className="px-5 pb-[calc(8rem+var(--sai-bottom,var(--sai-bottom)))] pt-4">
            {aiLoading.ideia ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-body">Sintetizando a ideia central com IA...</p>
              </div>
            ) : aiContent.ideia ? (
              <IdeiaTabContent content={aiContent.ideia} artigoNumero={artigo.numero} fontSize={fontSize} />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Clique na aba para gerar a ideia central.</p>
            )}
          </TabsContent>

          <TabsContent value="explicacao" className="px-5 pb-[calc(8rem+var(--sai-bottom,var(--sai-bottom)))] pt-4">
            {modificationInfo ? (
              <div className="space-y-5">
                <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-4">
                  <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">O que mudou</h4>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {(() => {
                      const parte = modificationInfo.parteModificada;
                      const tipo = modificationInfo.tipo.toLowerCase();
                      const lei = modificationInfo.leiNome;
                      if (/incluíd|acrescid/i.test(modificationInfo.tipo)) {
                        return parte === 'Artigo inteiro'
                          ? `O ${artigo.numero} foi inteiramente incluído no ordenamento jurídico pela ${lei}.`
                          : `O ${parte} do ${artigo.numero} foi incluído pela ${lei}. Na aba "Artigo", ele está destacado em roxo.`;
                      }
                      if (/alterad|redaç/i.test(modificationInfo.tipo)) {
                        return parte === 'Artigo inteiro'
                          ? `Todo o ${artigo.numero} teve sua redação alterada pela ${lei}.`
                          : `O ${parte} do ${artigo.numero} teve sua redação modificada pela ${lei}. Na aba "Artigo", o trecho está destacado em roxo.`;
                      }
                      if (/revogad/i.test(modificationInfo.tipo)) {
                        return `Este dispositivo foi revogado pela ${lei} e não produz mais efeitos jurídicos.`;
                      }
                      return `O ${parte} do ${artigo.numero} foi ${tipo} pela ${lei}.`;
                    })()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-400">{modificationInfo.tipo}</span>
                  <span className="text-xs text-foreground/60 font-medium">{modificationInfo.parteModificada}</span>
                </div>
                <div className="rounded-2xl bg-card border border-border p-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Lei modificadora</h4>
                  <p className="text-sm font-semibold text-foreground mb-1">{modificationInfo.leiNome}</p>
                  <p className="text-xs text-muted-foreground italic mb-3">{modificationInfo.referencia}</p>
                  {(() => {
                    const leiMatch = modificationInfo.leiNome.match(/(?:Lei(?:\s+Complementar)?|Decreto(?:-Lei)?|Emenda\s+Constitucional)\s+n[º°]?\s*([\d.]+)/i);
                    if (leiMatch) {
                      const num = leiMatch[1].replace(/\./g, '');
                      const isLC = /complementar/i.test(modificationInfo.leiNome);
                      const searchUrl = isLC
                        ? `https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp${num}.htm`
                        : `https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/L${num}.htm`;
                      return (
                        <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver texto oficial no Planalto
                        </a>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {aiLoading.explicacao ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-body">Gerando explicação com IA...</p>
                  </div>
                ) : aiContent.explicacao ? (
                  <ExplicacaoTabContent
                    content={aiContent.explicacao}
                    artigoNumero={artigo.numero}
                    fontSize={fontSize}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-8">Clique para gerar a explicação.</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="desdobramento" className="px-5 pb-[calc(8rem+var(--sai-bottom,var(--sai-bottom)))] pt-4">
            {aiLoading.desdobramento ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-body">Analisando o Raio-X do artigo trecho a trecho...</p>
              </div>
            ) : aiContent.desdobramento ? (
              <DesdobramentoTabContent content={aiContent.desdobramento} fontSize={fontSize} />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Clique na aba para ver o Raio-X do artigo.</p>
            )}
          </TabsContent>

          <TabsContent value="exemplo" className="px-5 pb-[calc(8rem+var(--sai-bottom,var(--sai-bottom)))] pt-4">
            {aiLoading.exemplo ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-body">Gerando exemplos práticos com IA...</p>
              </div>
            ) : aiContent.exemplo ? (
              <ExemploTabContent
                content={aiContent.exemplo}
                artigoNumero={artigo.numero}
                fontSize={fontSize}
              />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Clique para gerar exemplos.</p>
            )}
          </TabsContent>

          <TabsContent value="termos" className="px-5 pb-[calc(8rem+var(--sai-bottom,var(--sai-bottom)))] pt-4">
            {aiLoading.termos ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-body">Analisando termos jurídicos com IA...</p>
              </div>
            ) : aiContent.termos ? (
              <TermosTabContent content={aiContent.termos} fontSize={fontSize} />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Carregando termos...</p>
            )}
          </TabsContent>

          <TabsContent value="jurisprudencia" className="px-5 pb-[calc(8rem+var(--sai-bottom,var(--sai-bottom)))] pt-4">
            {aiLoading.jurisprudencia ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-body">Pesquisando julgados dos Tribunais Superiores...</p>
              </div>
            ) : aiContent.jurisprudencia ? (
              <JurisprudenciaTabContent
                content={aiContent.jurisprudencia}
                tabelaNome={tabelaNome}
                artigoNumero={artigo.numero}
                onExploreMore={() => {
                  if (tabelaNome && artigo?.numero) {
                    navigate(`/jurisprudencia/${tabelaNome}/${encodeURIComponent(String(artigo.numero))}`);
                  }
                }}
                fontSize={fontSize}
              />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Clique na aba para carregar a jurisprudência.</p>
            )}
          </TabsContent>

          <TabsContent value="historico" className="px-5 pb-[calc(8rem+var(--sai-bottom,var(--sai-bottom)))] pt-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground text-lg font-display">Histórico de Alterações</h3>
              <button 
                onClick={() => {
                  if (!isPremium) {
                    strictGateFeature('explicacao', () => setActiveTab('explicacao'));
                  } else {
                    setActiveTab('explicacao');
                  }
                }}
                className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-full flex items-center gap-1.5 transition-colors hover:bg-primary/90 shadow-sm shadow-primary/20"
              >
                {!isPremium && <Lock className="w-3 h-3 opacity-70" />}
                Explicar
              </button>
            </div>
            
            <div className="flex flex-col gap-5 pl-1 mt-2">
              {(() => {
                const articleFullText = [artigo?.caput, ...(artigo?.incisos || []), ...(artigo?.paragrafos || [])].join('\n');
                const linhas = articleFullText.split('\n');
                let mapAnos: Record<string, { contexto: string, nota: string }[]> = {};
                
                let contextQueue: string[] = [];
                
                for (let j = 0; j < linhas.length; j++) {
                  const linha = linhas[j].trim();
                  if (!linha) continue;
                  
                  const isModificada = /\((?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Revogad[oa]|Acrescid[oa]|Alterad[oa])/i.test(linha);
                  
                  if (isModificada) {
                    const m = /(?:de\s+(?:\d{1,2}\.\d{1,2}\.(\d{4})|(\d{4})))/i.exec(linha);
                    const year = m ? (m[1] || m[2]) : "Outros";
                    
                    if (!mapAnos[year]) mapAnos[year] = [];
                    
                    let ctx = contextQueue.length > 0 ? contextQueue[contextQueue.length - 1] : "Caput";
                    
                    if (ctx.length < 3 && contextQueue.length > 1) {
                      ctx = contextQueue[contextQueue.length - 2] + ' ' + ctx;
                    }
                    
                    mapAnos[year].push({ contexto: ctx, nota: linha });
                    contextQueue = []; 
                  } else {
                    contextQueue.push(linha);
                  }
                }
                
                const anosOrd = Object.keys(mapAnos).sort((a,b) => b.localeCompare(a));
                
                if (anosOrd.length === 0) {
                  return (
                    <div className="text-sm text-foreground leading-relaxed border-l-2 border-primary/40 pl-3">
                      {linhas.map((linha: string, idx: number) => {
                        const isMod = /\((?:Reda[çc][ãa]o|Inclu[íi]d[oa]|Revogad[oa]|Acrescid[oa]|Alterad[oa])/i.test(linha);
                        return (
                          <div key={idx} className={isMod ? 'bg-primary/10 text-primary font-semibold px-2 py-1 rounded-md my-1' : 'py-1'}>
                            {linha}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                return anosOrd.map(ano => (
                  <div key={ano} className="relative border-l-2 border-border pl-4 pb-2">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                    <p className="text-sm font-extrabold text-primary mb-3 leading-none font-display">{ano}</p>
                    <div className="flex flex-col gap-3">
                      {mapAnos[ano].map((item, idx) => {
                        let blockId = "";
                        let blockText = item.contexto;
                        const matchId = /^(Art\.\s*\d+[a-zº°]*|[IVXLCDM]+\s*-|§\s*\d+[º°]*|Parágrafo único)\s*(.*)/i.exec(item.contexto);
                        if (matchId) {
                          blockId = matchId[1];
                          blockText = matchId[2] || "";
                        }

                        return (
                          <div key={idx} className="bg-secondary/40 rounded-xl border border-border/60 p-3.5 shadow-sm">
                            <p className="text-[13px] text-foreground leading-relaxed mb-2.5 font-body">
                              {blockId && <span className="font-bold mr-1.5 text-primary/90">{blockId}</span>}
                              <span className="opacity-95">{blockText}</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium italic border-l-[3px] border-primary/30 pl-2.5 py-0.5 font-body">
                              {item.nota}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </TabsContent>
        </Tabs>


        </div>

        {/* Floating FABs — Font size */}
        <div className={`absolute ${activeTab === 'artigo' ? 'bottom-32 sm:bottom-36' : 'bottom-6'} right-4 sm:right-5 z-[60] flex flex-col items-end gap-2`}>
          <AnimatePresence>
            {showFontControls && (
              <motion.div
                key="font-controls"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="flex flex-col gap-2 mb-2"
              >
                <div className="bg-card border border-border rounded-2xl shadow-lg p-3 flex flex-col items-center gap-2 self-end">
                  <button
                    onClick={() => setFontSize(prev => Math.min(prev + 1, 24))}
                    className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4 text-foreground" />
                  </button>
                  <span className="text-foreground text-xs font-bold">{fontSize}px</span>
                  <button
                    onClick={() => setFontSize(prev => Math.max(prev - 1, 10))}
                    className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Bottom-up action sheet for Funções / Grifar */}
          {activeTab === 'artigo' && (
              <AnimatePresence>
                {activeActionMenu && (() => {
                  const refTabelaGrafo = tabelaNome || leiSlug || '';

                  // Bloco 1: Funções Principais de Estudo
                  const funcoesPrincipais = [
                    { icon: Play, label: 'Videoaulas', desc: 'Aulas em vídeo sobre este artigo', color: '#EF4444', onClick: () => {
                      setActiveActionMenu(null);
                      if (!requireOnline('Videoaulas')) return;
                      strictGateFeature('videoaula', () => setShowVideoaulasListSheet(true));
                    } },
                    { icon: Scale, label: 'Jurisprudência', desc: 'Súmulas, temas e acórdãos do STF/STJ', color: '#D4AF37', onClick: () => {
                      setActiveActionMenu(null);
                      if (!requireOnline('Jurisprudência')) return;
                      if (!refTabelaGrafo || !artigo?.numero) { toast.error('Artigo não identificado'); return; }
                      strictGateFeature('jurisprudencia', () =>
                        navigate(`/jurisprudencia/${refTabelaGrafo}/${encodeURIComponent(String(artigo.numero))}`),
                      );
                    } },
                    { icon: MessageCircle, label: 'Perguntar', desc: 'Tire dúvidas com a IA', color: '#A855F7', onClick: () => {
                      setActiveActionMenu(null);
                      if (!requireOnline('Perguntar à IA')) return;
                      strictGateFeature('perguntar', () => setShowPerguntarSheet(true));
                    } },
                    { icon: Network, label: 'Grafo de conexões', desc: 'Ver relações do artigo', color: '#10B981', onClick: () => {
                      setActiveActionMenu(null);
                      strictGateFeature('grafo', () => setShowGrafo(true));
                    } },
                  ];

                  // Bloco 2: Outras Funções do Artigo
                  const outrasFuncoes = [
                    { icon: Copy, label: 'Copiar artigo', desc: 'Texto para a área de transferência', color: '#8B5CF6', onClick: () => {
                      setActiveActionMenu(null);
                      handleCopy();
                    } },
                    { icon: History, label: 'Histórico', desc: 'Histórico de alterações', color: '#F97316', onClick: () => {
                      setActiveActionMenu(null);
                      setShowHistoricoSheet(true);
                    } },
                    { icon: Bell, label: 'Lembretes', desc: 'Avisar ao chegar em um local', color: '#F59E0B', onClick: () => {
                      setActiveActionMenu(null);
                      import('./LembretesArtigoSheet');
                      strictGateFeature('lembretes', () => setShowLembretesLocal(true));
                    } },
                    { icon: Download, label: 'Baixar artigo', desc: 'PDF ou imagem, lei seca ou comentado', color: '#0EA5E9', onClick: () => {
                      setActiveActionMenu(null);
                      setShowBaixarSheet(true);
                    } },
                    { icon: Share2, label: 'Compartilhar', desc: 'Enviar para outro app', color: '#06B6D4', onClick: () => {
                      setActiveActionMenu(null);
                      setShowSharePanel(p => !p);
                    } },
                  ];

                  const gateGrifo = (label: string, action: () => void) =>
                    strictGateFeature('grifo', action);
                  const grifarItems = [
                    { icon: Highlighter, label: highlightMode ? 'Desativar grifo manual' : 'Grifo manual', desc: 'Marcar com o dedo', color: '#EC4899', active: highlightMode, onClick: () => { setActiveActionMenu(null); if (highlightMode) { toggleMode(); return; } gateGrifo('Grifar', () => toggleMode()); } },
                    { icon: Sparkles, label: 'Grifo mágico (IA)', desc: 'Destaques automáticos', color: '#F59E0B', active: magicMode, spin: magicLoading, badge: magicHighlights.length, onClick: () => { setActiveActionMenu(null); gateGrifo('Grifar', () => handleToggleMagic()); } },
                    { icon: Mic, label: 'Grifar por voz', desc: 'Dite o trecho a destacar', color: '#EAB308', onClick: () => { setActiveActionMenu(null); gateGrifo('Grifar', () => setVoiceGrifoActive(true)); } },
                    { icon: Camera, label: 'Grifar de foto', desc: 'OCR de imagem', color: '#3B82F6', onClick: () => { setActiveActionMenu(null); gateGrifo('Grifar', () => setShowGrifoFoto(true)); } },
                    { icon: Trash2, label: 'Apagar grifos', desc: 'Escolha por cor ou apague todos', color: '#EF4444', badge: eraseSheetHighlights.length, onClick: () => { setActiveActionMenu(null); setShowEraseSheet(true); } },
                  ];
                  const isGrifar = activeActionMenu === 'grifar';
                  const title = isGrifar ? 'Grifar' : 'Funções';
                  const HeaderIcon = isGrifar ? Feather : LayoutGrid;

                  const renderItem = (item: any, isLast: boolean, key: string | number) => {
                    const Icon = item.icon;
                    return (
                      <div key={key}>
                        <button
                          onClick={item.onClick}
                          className={`w-full min-h-[68px] flex items-center gap-3 px-5 py-3.5 transition-colors text-left ${item.active ? 'bg-amber-300/10' : 'hover:bg-secondary/60'}`}
                        >
                          <span
                            className="w-9 h-9 flex items-center justify-center shrink-0"
                            style={{ color: item.color }}
                          >
                            <Icon className={`w-[22px] h-[22px] ${item.spin ? 'animate-spin' : ''}`} strokeWidth={2} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14.5px] font-medium text-foreground truncate">{item.label}</span>
                            <span className="block text-[12px] text-foreground/60 truncate mt-0.5">{item.desc}</span>
                          </span>
                          {item.badge > 0 && (
                            <span className="ml-2 inline-flex min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-400 text-black text-[11px] font-bold items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </button>
                        {!isLast && (
                          <div className="mx-5 h-px bg-border/60" />
                        )}
                      </div>
                    );
                  };

                  return (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveActionMenu(null)}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
                      />
                      <motion.aside
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                        className="fixed bottom-0 left-0 right-0 z-[71] bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col pb-[var(--sai-bottom,var(--sai-bottom))] min-h-[74vh] max-h-[92vh] mx-auto max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 md:top-auto md:w-[92vw] md:max-w-2xl md:rounded-3xl md:border md:border-border md:shadow-2xl"
                      >
                        <div className="pt-3 pb-2 flex justify-center">
                          <span className="w-10 h-1 rounded-full bg-border" />
                        </div>
                        <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
                          <div className="flex items-center gap-2">
                            <HeaderIcon className={`w-5 h-5 ${isGrifar ? 'text-amber-400' : 'text-primary'}`} />
                            <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
                          </div>
                          <button
                            onClick={() => setActiveActionMenu(null)}
                            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70"
                            aria-label="Fechar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2">
                          {isGrifar ? (
                            grifarItems.map((item, i, arr) => renderItem(item, i === arr.length - 1, i))
                          ) : (
                            <>
                              {funcoesPrincipais.map((item, i, arr) => renderItem(item, i === arr.length - 1, 'fp-' + i))}
                              <div className="pt-5 pb-2 px-5 flex items-center gap-3">
                                <span className="text-[11px] font-extrabold tracking-wider text-muted-foreground/80 uppercase">
                                  Outras Funções
                                </span>
                                <div className="flex-1 h-px bg-border/60" />
                              </div>
                              {outrasFuncoes.map((item, i, arr) => renderItem(item, i === arr.length - 1, 'of-' + i))}
                            </>
                          )}
                          {isGrifar && (
                            <div className="mt-2 mx-5 p-3 rounded-2xl bg-secondary/40 border border-border flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-medium text-foreground">Mostrar grifo por padrão</p>
                                <p className="text-[11.5px] text-foreground/60 mt-0.5">Ao abrir o artigo, exibe os grifos da IA automaticamente.</p>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={grifoIaDefaultOn}
                                onClick={() => setGrifoIaDefault(!grifoIaDefaultOn)}
                                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${grifoIaDefaultOn ? 'bg-amber-400' : 'bg-muted'}`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${grifoIaDefaultOn ? 'translate-x-5' : ''}`}
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.aside>
                    </>
                  );
                })()}
              </AnimatePresence>
          )}
          <button
            onClick={() => { setShowFontControls(!showFontControls); setShowCommentPanel(false); }}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Type className="w-5 h-5" />
          </button>
        </div>


        {/* Bottom nav bar — only visible on "artigo" tab; fixed as a flex item below the scrollable area */}
        {(activeTab ?? 'artigo') === 'artigo' && !isDesktop && (
        <div className="shrink-0 relative z-[55] bg-card/95 backdrop-blur-md border-t border-border rounded-t-3xl shadow-lg shadow-black/10 pb-[var(--sai-bottom,var(--sai-bottom))]">
          <div className="relative grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto">
            {(highlightMode || voiceGrifoActive) ? (
              <button
                onClick={() => setShowEraseSheet(true)}
                className="flex flex-col items-center justify-end gap-1.5 py-1.5 text-foreground hover:text-red-400 transition-colors"
              >
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                <span className="font-body text-[11px] sm:text-[12px] leading-tight">Apagar</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveActionMenu('funcoes')}
                className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors ${activeActionMenu === 'funcoes' ? 'text-primary' : 'text-foreground hover:text-primary'}`}
              >
                <LayoutGrid className="w-7 h-7 sm:w-8 sm:h-8" />
                <span className="font-body text-[11px] sm:text-[12px] leading-tight">Funções</span>
              </button>
            )}
            {(highlightMode || voiceGrifoActive) ? (
              <div aria-hidden="true" />
            ) : (
              <button
                onClick={() => {
                  if (!isPremium) {
                    openPremiumGate('praticar', 'Praticar com flashcards e questões é exclusivo para assinantes.');
                    return;
                  }
                  setShowPraticarSheet(true);
                }}
                className="flex flex-col items-center justify-end gap-1.5 py-1.5 text-foreground hover:text-primary transition-colors"
              >
                <Target className="w-7 h-7 sm:w-8 sm:h-8" />
                <span className="font-body text-[11px] sm:text-[12px] leading-tight">Praticar</span>
              </button>
            )}

            {/* FAB central: Narrar por padrão; vira gravador quando Grifar por voz está ativo */}
            {voiceGrifoActive ? (
              <button
                onClick={() => {
                  if (voicePhase === 'recording') voicePanelRef.current?.stop();
                  else if (voicePhase === 'idle') voicePanelRef.current?.start();
                }}
                disabled={voicePhase === 'processing'}
                className="relative z-[80] flex flex-col items-center justify-end gap-1.5 -mt-11 min-h-[6.25rem] min-w-[5.75rem] touch-manipulation select-none"
                aria-label={voicePhase === 'recording' ? 'Parar gravação' : 'Gravar voz'}
              >
                <span className={`relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-lg ring-4 ring-card transition-all duration-300 ${voicePhase === 'recording' ? 'bg-red-500 shadow-red-500/40 scale-105' : voicePhase === 'processing' ? 'bg-secondary' : 'bg-amber-400 shadow-amber-400/40'}`}>
                  {voicePhase === 'recording' && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" style={{ animationDuration: '1.2s' }} />
                      <span className="absolute -inset-1 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '0.2s' }} />
                    </>
                  )}
                  {voicePhase === 'processing' ? (
                    <Loader2 className="w-8 h-8 sm:w-9 sm:h-9 text-foreground animate-spin relative z-20" />
                  ) : voicePhase === 'recording' ? (
                    <Square className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-white relative z-20" />
                  ) : (
                    <Mic className="w-8 h-8 sm:w-9 sm:h-9 text-black relative z-20" />
                  )}
                </span>
                <span className="font-body text-[11px] sm:text-[12px] font-semibold text-amber-400 leading-tight">
                  {voicePhase === 'recording' ? 'Parar' : voicePhase === 'processing' ? 'Analisando' : 'Gravar'}
                </span>
              </button>
            ) : (
              <button
                onPointerDown={handleNarrarButtonPress}
                onTouchStart={handleNarrarButtonPress}
                onClick={handleNarrarButtonPress}
                className="relative z-[80] flex flex-col items-center justify-end gap-1.5 -mt-11 min-h-[6.25rem] min-w-[5.75rem] touch-manipulation select-none"
                aria-label={narracaoPlaying ? 'Pausar narração' : effectiveNarracaoUrl ? 'Ouvir narração' : 'Narração indisponível'}
              >
                <span
                  className={`relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-lg ring-4 ring-card transition-all duration-300 ${
                    narracaoPlaying
                      ? 'bg-primary shadow-primary/40 scale-105'
                      : effectiveNarracaoUrl
                      ? 'bg-primary shadow-primary/30 hover:bg-primary/90 cursor-pointer active:scale-95'
                      : 'bg-zinc-800 text-zinc-500 shadow-none opacity-60 ring-zinc-800/80 cursor-not-allowed'
                  }`}
                >
                  {narracaoPlaying && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '1.5s' }} />
                      <span className="absolute -inset-1 rounded-full bg-primary/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                    </>
                  )}
                  {narracaoPlaying && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 z-10 pointer-events-none" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="26" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="3" strokeOpacity="0.2" />
                      <circle
                        ref={narracaoRingRef}
                        cx="28" cy="28" r="26" fill="none"
                        stroke="hsl(var(--primary-foreground))"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${RING_CIRCUMFERENCE}`}
                        strokeDashoffset={`${RING_CIRCUMFERENCE}`}
                      />
                    </svg>
                  )}
                  {narracaoPlaying ? (
                    <Pause className="w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground relative z-20" />
                  ) : effectiveNarracaoUrl ? (
                    <Volume2 className="w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground relative z-20" />
                  ) : (
                    <VolumeX className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-500 relative z-20" />
                  )}
                </span>
                <span
                  className={`font-body text-[11px] sm:text-[12px] font-semibold leading-tight ${
                    narracaoPlaying || effectiveNarracaoUrl ? 'text-primary' : 'text-zinc-500'
                  }`}
                >
                  {narracaoPlaying ? 'Pausar' : effectiveNarracaoUrl ? 'Ouvir' : 'Sem áudio'}
                </span>
              </button>
            )}
            {(highlightMode || voiceGrifoActive) ? (
              <div aria-hidden="true" />
            ) : (
              <button
                onClick={() => {
                  if (!isPremium) {
                    openPremiumGate('anotacoes', 'Fazer anotações no artigo é exclusivo para assinantes.');
                    return;
                  }
                  setShowAnotacoesSheet(true);
                  setShowFontControls(false);
                }}
                className="relative flex flex-col items-center justify-end gap-1.5 py-1.5 text-foreground hover:text-primary transition-colors"
              >
                <span className="relative">
                  <StickyNote className="w-7 h-7 sm:w-8 sm:h-8" />
                  {anotacoesCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[10px] font-bold text-black flex items-center justify-center leading-none shadow-md ring-2 ring-card">
                      {anotacoesCount > 99 ? '99+' : anotacoesCount}
                    </span>
                  )}
                </span>
                <span className="font-body text-[11px] sm:text-[12px] leading-tight">Anotações</span>
              </button>
            )}
            {(highlightMode || voiceGrifoActive) ? (
              <button
                onClick={() => {
                  if (voiceGrifoActive) {
                    try { voicePanelRef.current?.stop(); } catch {}
                    setVoiceGrifoActive(false);
                  } else {
                    toggleMode();
                  }
                }}
                className="flex flex-col items-center justify-end gap-1.5 py-1.5 text-amber-400 hover:text-amber-300 transition-colors"
              >
                <X className="w-7 h-7 sm:w-8 sm:h-8" />
                <span className="font-body text-[11px] sm:text-[12px] font-semibold leading-tight">Fechar</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!isPremium) {
                    openPremiumGate('grifo', 'Grifar artigos com cores, por voz ou IA é exclusivo para assinantes.');
                    return;
                  }
                  setActiveActionMenu('grifar');
                }}
                className={`relative flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors ${activeActionMenu === 'grifar' || magicMode || highlightMode ? 'text-amber-400' : 'text-foreground hover:text-primary'}`}
              >
                <span className="relative">
                  <Feather className={`w-7 h-7 sm:w-8 sm:h-8 ${magicLoading ? 'animate-spin' : ''}`} />
                  {(highlights.length + magicHighlights.length) > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[10px] font-bold text-black flex items-center justify-center leading-none shadow-md ring-2 ring-card">
                      {(highlights.length + magicHighlights.length) > 99 ? '99+' : (highlights.length + magicHighlights.length)}
                    </span>
                  )}
                </span>
                <span className="font-body text-[11px] sm:text-[12px] leading-tight">Grifar</span>
              </button>
            )}

          </div>
        </div>
        )}

        <GrifoMagicoLoader open={magicLoading} />

        {/* Floating "Fechar grifo" button + rodapé de ações when highlight mode is active */}
        <AnimatePresence>
          {(highlightMode || voiceGrifoActive) && (activeTab ?? 'artigo') === 'artigo' && (
            <>
              {createPortal(
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed top-0 left-0 right-0 h-20 z-[10000] bg-gradient-to-b from-black/40 to-transparent backdrop-blur-[1px] pointer-events-none"
                  aria-hidden="true"
                />,
                document.body
              )}
              {createPortal(
                <div className="fixed top-[calc(0.75rem+var(--sai-top,var(--sai-top)))] left-0 right-0 z-[10001] flex justify-center pointer-events-none">
                  <motion.button
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    onClick={() => {
                      if (voiceGrifoActive) {
                        try { voicePanelRef.current?.stop(); } catch {}
                        setVoiceGrifoActive(false);
                      } else {
                        toggleMode();
                      }
                    }}
                    className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full bg-amber-400 text-black shadow-xl shadow-amber-400/30 font-semibold text-sm hover:bg-amber-300 transition-colors"
                    aria-label="Fechar grifo"
                  >
                    <X className="w-4 h-4" />
                    Fechar grifo
                  </motion.button>
                </div>,
                document.body
              )}
              {null}

            </>
          )}

        </AnimatePresence>

        <Suspense fallback={null}>
          {showEraseSheet && (
            <GrifoEraseSheet
              open={showEraseSheet}
              onClose={() => setShowEraseSheet(false)}
              highlights={eraseSheetHighlights}
              onRemoveByColor={handleRemoveGrifosByColor}
              onClearAll={handleClearAllGrifos}
            />
          )}

          {showVoiceSheet && (
            <GrifoVoiceSheet
              open={showVoiceSheet}
              onClose={() => setShowVoiceSheet(false)}
              linhas={displayLines}
              onApplyPassages={(passages: VoicePassage[]) => {
                for (const p of passages) {
                  addHighlightAtOffsets(p.lineIndex, p.startOffset, p.endOffset, p.text, p.color);
                }
              }}
            />
          )}

          {/* GrifoVoicePanel usa ref imperativo — mantido eager */}
          <GrifoVoicePanel
            ref={voicePanelRef}
            active={voiceGrifoActive}
            linhas={displayLines}
            onPhaseChange={setVoicePhase}
            onDeactivate={() => setVoiceGrifoActive(false)}
            onApplyPassages={(passages) => {
              for (const p of passages) {
                addHighlightAtOffsets(p.lineIndex, p.startOffset, p.endOffset, p.text, p.color);
              }
            }}
          />

          {/* Overlay do gatinho + checklist enquanto gera a narração */}
          {narracaoLoading && (
            <GeracaoAnimacaoOverlay
              open={narracaoLoading}
              titulo="Gerando sua narração"
              steps={[
                'Preparando o texto do artigo',
                'Gerando narração realista em HD',
                'Salvando narração',
                'Pronto para ouvir',
              ]}
              stepIdx={narracaoStepIdx}
              stepRanges={[[0, 15], [15, 92], [92, 98], [100, 100]]}
              estTotalSec={22}
            />
          )}

          {/* Overlay animado ao gerar Explicação / Exemplo / Termos com IA */}
          {aiGeneratingMode !== null && (
            <GeracaoAnimacaoOverlay
              open={aiGeneratingMode !== null}
              titulo={
                aiGeneratingMode === 'ideia' ? 'Sintetizando a ideia central' :
                aiGeneratingMode === 'explicacao' ? 'Gerando explicação com IA' :
                aiGeneratingMode === 'desdobramento' ? 'Gerando Raio-X do artigo' :
                aiGeneratingMode === 'exemplo' ? 'Gerando exemplos práticos' :
                aiGeneratingMode === 'termos' ? 'Analisando termos jurídicos' :
                aiGeneratingMode === 'jurisprudencia' ? 'Pesquisando jurisprudência' :
                'Gerando conteúdo'
              }
              steps={[
                'Preparando o texto do artigo',
                'Consultando a IA',
                'Formatando conteúdo',
                'Pronto para ler',
              ]}
              stepIdx={aiGeneratingStep}
              stepRanges={[[0, 20], [20, 85], [85, 98], [100, 100]]}
              estTotalSec={12}
            />
          )}
        </Suspense>

        {/* Praticar Sheet - Tela Inteira Fullscreen */}
        <AnimatePresence>
          {showPraticarSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 z-[10001] backdrop-blur-sm"
                onClick={() => setShowPraticarSheet(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-0 z-[10002] bg-card flex flex-col w-full h-full max-h-screen overflow-hidden pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))]"
              >
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border/80 bg-background/50 backdrop-blur-md shrink-0 pt-[max(0.875rem,env(safe-area-inset-top))]">
                  <button
                    onClick={() => {
                      if (activePraticarMode && !initialPraticarMode) {
                        setActivePraticarMode(null);
                      } else {
                        setShowPraticarSheet(false);
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-secondary/80 hover:bg-secondary border border-border/60 flex items-center justify-center text-foreground transition-all active:scale-95 shrink-0 shadow-sm"
                    aria-label="Voltar"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {activePraticarMode === 'questoes' && <Target className="w-5 h-5 text-[#FACC15] shrink-0" strokeWidth={2.2} />}
                    {activePraticarMode === 'flashcards' && <Layers className="w-5 h-5 text-[#34D399] shrink-0" strokeWidth={2.2} />}
                    {activePraticarMode === 'licoes' && <Pencil className="w-5 h-5 text-[#38BDF8] shrink-0" strokeWidth={2.2} />}
                    <h3 className="font-heading text-base sm:text-lg font-bold text-foreground truncate uppercase tracking-wider">
                      {activePraticarMode === 'questoes'
                        ? `Questões • Art. ${artigo?.numero}`
                        : activePraticarMode === 'flashcards'
                        ? `Flashcards • Art. ${artigo?.numero}`
                        : activePraticarMode === 'licoes'
                        ? `Lições • Art. ${artigo?.numero}`
                        : activePraticarMode === 'complete'
                        ? `Complete o Artigo • Art. ${artigo?.numero}`
                        : activePraticarMode === 'monte'
                        ? `Monte o Artigo • Art. ${artigo?.numero}`
                        : activePraticarMode === 'verdadeiro_falso'
                        ? `Certo ou Errado • Art. ${artigo?.numero}`
                        : `Praticar • Art. ${artigo?.numero}`}
                    </h3>
                  </div>
                </div>

                {/* Se um modo interativo estiver ativo, renderiza sua tela dedicada em tela cheia */}
                <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                  {activePraticarMode === 'questoes' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#FACC15]" />Carregando questões do artigo...</div>}>
                      <QuizView
                        tabelaNome={String(tabelaNome || '')}
                        artigoNumero={String(artigo?.numero || '')}
                        leiNome={String(tabelaNome || '')}
                        onBack={() => setActivePraticarMode(null)}
                        hideHeader={true}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'flashcards' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#34D399]" />Carregando flashcards do artigo...</div>}>
                      <FlashcardView
                        tabelaNome={String(tabelaNome || '')}
                        artigoNumero={String(artigo?.numero || '')}
                        leiNome={String(tabelaNome || '')}
                        onBack={() => setActivePraticarMode(null)}
                        hideHeader={true}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'licoes' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60 flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#38BDF8]" />Carregando lições de fixação...</div>}>
                      <LicoesArtigoView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'complete' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60">Carregando exercício...</div>}>
                      <CompleteArtigoView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'monte' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60">Carregando quebra-cabeça...</div>}>
                      <MonteArtigoView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'verdadeiro_falso' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60">Carregando afirmativas...</div>}>
                      <VerdadeiroFalsoView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'casos_praticos' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60">Carregando casos práticos...</div>}>
                      <CasosPraticosView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'contra_relogio' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60">Carregando desafio contra o relógio...</div>}>
                      <ContraRelogioView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'caca_palavras' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60">Carregando caça-palavras...</div>}>
                      <CacaPalavrasView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'relacione' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60">Carregando colunas...</div>}>
                      <RelacioneColunasView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'identifique_erro' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60">Carregando exercício de detecção de erro...</div>}>
                      <IdentifiqueErroView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {activePraticarMode === 'ouca_recite' && (
                    <Suspense fallback={<div className="p-8 text-center text-sm text-foreground/60">Carregando reconhecimento de voz...</div>}>
                      <OucaReciteView
                        artigoNumero={String(artigo?.numero || '')}
                        artigoTexto={String(artigo?.texto || artigo?.caput || '')}
                        leiNome={String(tabelaNome || '')}
                        onVoltar={() => setActivePraticarMode(null)}
                      />
                    </Suspense>
                  )}

                  {/* Menu de seleção dos Modos de Prática: Questões, Flashcards e Lições */}
                  {!activePraticarMode && (() => {
                    const itensPrincipais = [
                      MODOS_PRATICAR.find((m) => m.id === 'questoes'),
                      MODOS_PRATICAR.find((m) => m.id === 'flashcards'),
                      MODOS_PRATICAR.find((m) => m.id === 'licoes'),
                    ].filter(Boolean) as (typeof MODOS_PRATICAR)[number][];

                    return (
                      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[13px] sm:text-sm text-foreground/70 font-medium">
                            Art. {artigo?.numero} — Escolha o modo de estudo e fixação
                          </p>
                        </div>

                        {/* Modos Principais: Questões, Flashcards e Lições */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="font-display text-[13px] sm:text-[14px] font-bold text-foreground/90 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-1.5 h-4 rounded-full bg-amber-500" />
                              Modos de Estudo
                            </h4>
                          </div>

                          <div className="space-y-3">
                            {itensPrincipais.map((item) => {
                              const Icon = item.icon;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => setActivePraticarMode(item.id)}
                                  className="w-full flex items-center gap-4 p-4 min-h-[82px] rounded-2xl bg-[#18181b] hover:bg-[#202024] active:scale-[0.99] border border-white/10 hover:border-white/20 transition-all text-left shadow-sm group"
                                >
                                  {/* Ícone direto sem fundo ou moldura quadrada */}
                                  <Icon
                                    className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 transition-transform duration-200 group-hover:scale-110"
                                    style={{ color: item.color }}
                                    strokeWidth={2.2}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-body text-[15px] sm:text-base font-bold text-white">
                                        {item.label}
                                      </span>
                                      {item.badge && (
                                        <span
                                          className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                                          style={{
                                            backgroundColor: `${item.color}20`,
                                            color: item.color,
                                            borderColor: `${item.color}40`,
                                            borderWidth: 1,
                                            borderStyle: 'solid',
                                          }}
                                        >
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-body text-[12px] sm:text-[12.5px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                                      {item.desc}
                                    </div>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Estudar Sheet removido */}


        <Suspense fallback={null}>
          {/* Videoaula full-screen sheet */}
          {showVideoaulaSheet && (
            <VideoaulaSheet
              open={showVideoaulaSheet}
              onClose={() => setShowVideoaulaSheet(false)}
              video={videoaula}
              tabelaNome={tabelaNome || ''}
              artigoNumero={artigo?.numero || ''}
              artigoTexto={artigo?.caput || ''}
            />
          )}

          {showVideoaulasListSheet && (
            <VideoaulasListSheet
              open={showVideoaulasListSheet}
              onClose={() => setShowVideoaulasListSheet(false)}
              tabelaNome={tabelaNome || ''}
              artigoNumero={artigo?.numero || ''}
              leiNome={friendlyLeiNome || tabelaNome}
              onSelectVideo={(v) => {
                setVideoaula({ titulo: v.titulo, url: v.url, canal: v.canal, videoId: v.videoId });
                setShowVideoaulasListSheet(false);
                setShowVideoaulaSheet(true);
              }}
            />
          )}

          {showAnotacoesSheet && (
            <AnotacoesSheet
              open={showAnotacoesSheet}
              onClose={() => setShowAnotacoesSheet(false)}
              tabelaNome={tabelaNome || 'unknown'}
              artigoNumero={artigo.numero}
              artigoTexto={artigo.caput}
              onCountChange={setAnotacoesCount}
            />
          )}

          {showPerguntarSheet && (
            <PerguntarSheet
              open={showPerguntarSheet}
              onClose={() => setShowPerguntarSheet(false)}
              tabelaNome={tabelaNome || 'unknown'}
              artigoNumero={artigo.numero}
              artigoTexto={artigo.caput}
            />
          )}
        </Suspense>

        {/* Histórico Sheet (aberto pelo menu Funções) */}
        <Sheet open={showHistoricoSheet} onOpenChange={(open) => setShowHistoricoSheet(open)}>
          <SheetContent side="bottom" className="h-[90vh] max-w-lg mx-auto rounded-t-3xl p-0 flex flex-col">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <History className="w-5 h-5 text-orange-400" />
              <h3 className="font-heading text-base font-semibold text-foreground flex-1">Histórico</h3>
              <button onClick={() => setShowHistoricoSheet(false)} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
            {(() => {
              const modRegex = /\(((?:Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vetad[oa]|Regulamento|Renumerado|Transformado|Suprimido|Restabelecido|Produção de efeito)[^)]*)\)/gi;
              const found: { texto: string; ano: number }[] = [];
              const seen = new Set<string>();
              let m: RegExpExecArray | null;
              const src = artigo?.caput || '';
              while ((m = modRegex.exec(src)) !== null) {
                const t = m[1].trim();
                if (seen.has(t)) continue;
                seen.add(t);
                const y = t.match(/\b(1\d{3}|20\d{2})\b/);
                found.push({ texto: t, ano: y ? Number(y[1]) : 0 });
              }
              found.sort((a, b) => b.ano - a.ano);

              return (
                <div className="space-y-3">
                  {found.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-8 text-center">
                      Este artigo não possui alterações registradas em seu texto oficial.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {found.map((item, i) => (
                        <li key={i} className="rounded-xl bg-secondary/40 border border-border/60 border-l-4 border-l-primary/70 px-4 py-3">
                          {item.ano > 0 && (
                            <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
                              {item.ano}
                            </p>
                          )}
                          <p className="text-[14px] text-foreground/90 leading-relaxed">{item.texto}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[11px] text-muted-foreground/70 text-center pt-2">
                    Fonte: metadados oficiais do dispositivo.
                  </p>
                </div>
              );
            })()}
            </div>
          </SheetContent>
        </Sheet>

          {crossRefArtigo && (
            <ArtigoBottomSheet
              artigo={crossRefArtigo}
              tabelaNome={tabelaNome}
              onClose={() => setCrossRefArtigo(null)}
              isFavorito={false}
            />
          )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

        {/* Paywall rigoroso (sem limites gratuitos) */}
        <PremiumGate 
          open={showPremiumGate} 
          onClose={() => setShowPremiumGate(false)} 
          feature={premiumGateFeature} 
          description={premiumGateDesc}
          onListenExample={() => {
            const synth = window.speechSynthesis;
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance('Artigo 4º do Código Penal: Diz-se praticado o crime no momento da ação ou omissão, ainda que outro seja o momento do resultado.');
            utterance.lang = 'pt-BR';
            synth.speak(utterance);
          }}
        />

      <Suspense fallback={null}>
        {(tabelaNome || leiSlug) && artigo && showGrafo && (
          <GrafoOverlay
            open={showGrafo}
            onClose={() => setShowGrafo(false)}
            tabelaNome={tabelaNome || leiSlug || ''}
            leiNome={friendlyLeiNome || tabelaNome || leiSlug || ''}
            artigoNumero={artigo.numero}
          />
        )}
        <PremiumGate open={showPremiumGate} onClose={() => setShowPremiumGate(false)} feature={premiumGateFeature} description={premiumGateDesc} />
        {showLembretesLocal && (
          <LembretesArtigoSheet
            open={showLembretesLocal}
            onClose={() => setShowLembretesLocal(false)}
            artigoRef={`${tabelaNome || 'artigo'}::${artigo?.numero ?? 'x'}`}
            artigoTitulo={artigo ? `Art. ${artigo.numero}${tabelaNome ? ' — ' + tabelaNome : ''}` : 'Artigo'}
          />
        )}
        {showBaixarSheet && (
          <BaixarArtigoSheet
            open={showBaixarSheet}
            onClose={() => setShowBaixarSheet(false)}
            artigo={artigo ? { numero: String(artigo.numero), caput: artigo.caput || '', incisos: (artigo as any).incisos, paragrafos: (artigo as any).paragrafos } : null}
            tabelaNome={tabelaNome}
          />
        )}
        {showGrifoFoto && (
          <GrifoFotoSheet open={showGrifoFoto} onClose={() => setShowGrifoFoto(false)} />
        )}
        {narracaoPlaying && !!narracaoAudioRef.current && (
          <KaraokeOverlay
            open={narracaoPlaying && !!narracaoAudioRef.current}
            audio={narracaoAudioRef.current}
            timings={narracaoWordTimings}
            fullText={artigo?.caput || ''}
            title={artigo ? `Art. ${artigo.numero}` : undefined}
          />
        )}
      </Suspense>

      {/* Desktop: barra lateral única com todas as ações à direita */}
      {isDesktop && artigo && (activeTab ?? 'artigo') === 'artigo' && createPortal(
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-[10000] flex flex-col gap-3">
          <button
            onClick={(e) => { handleNarrarButtonPress(e as any); }}
            className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3.5 shadow-xl border border-white/10 backdrop-blur-md transition-all ${
              narracaoPlaying
                ? 'bg-primary text-black scale-105'
                : effectiveNarracaoUrl
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-zinc-800 text-zinc-500 opacity-60 cursor-not-allowed'
            }`}
            title={narracaoPlaying ? 'Pausar' : effectiveNarracaoUrl ? 'Ouvir narração' : 'Sem áudio'}
          >
            {narracaoPlaying ? (
              <Pause className="w-5 h-5 shrink-0" />
            ) : effectiveNarracaoUrl ? (
              <Volume2 className="w-5 h-5 shrink-0" />
            ) : (
              <VolumeX className="w-5 h-5 shrink-0 text-zinc-500" />
            )}
            <span className="font-display text-[13px] font-bold tracking-wider max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[140px] group-hover:opacity-100 group-hover:ml-1">
              {narracaoPlaying ? 'Pausar' : effectiveNarracaoUrl ? 'Ouvir' : 'Sem áudio'}
            </span>
          </button>
          <button
            onClick={() => {
              if (!isPremium) {
                openPremiumGate('praticar', 'Praticar com flashcards e questões é exclusivo para assinantes.');
                return;
              }
              setShowPraticarSheet(true);
            }}
            className="group flex items-center gap-3 rounded-2xl px-3.5 py-3.5 shadow-xl border border-white/10 backdrop-blur-md bg-card/95 text-foreground hover:bg-secondary transition-all"
            title="Praticar"
          >
            <Target className="w-5 h-5 shrink-0" />
            <span className="font-display text-[13px] font-bold tracking-wider max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[140px] group-hover:opacity-100 group-hover:ml-1">Praticar</span>
          </button>
          <button
            onClick={() => {
              if (!isPremium) {
                openPremiumGate('anotacoes', 'Fazer anotações no artigo é exclusivo para assinantes.');
                return;
              }
              setShowAnotacoesSheet(true);
            }}
            className="group flex items-center gap-3 rounded-2xl px-3.5 py-3.5 shadow-xl border border-white/10 backdrop-blur-md bg-card/95 text-foreground hover:bg-secondary transition-all"
            title="Anotações"
          >
            <StickyNote className="w-5 h-5 shrink-0" />
            <span className="font-display text-[13px] font-bold tracking-wider max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[140px] group-hover:opacity-100 group-hover:ml-1">Anotações</span>
          </button>
          <button
            onClick={() => {
              if (!isPremium) {
                openPremiumGate('grifo', 'Grifar artigos com cores, por voz ou IA é exclusivo para assinantes.');
                return;
              }
              setActiveActionMenu('grifar');
            }}
            className="group flex items-center gap-3 rounded-2xl px-3.5 py-3.5 shadow-xl border border-white/10 backdrop-blur-md bg-card/95 text-foreground hover:bg-secondary transition-all"
            title="Grifar"
          >
            <Feather className="w-5 h-5 shrink-0" />
            <span className="font-display text-[13px] font-bold tracking-wider max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[140px] group-hover:opacity-100 group-hover:ml-1">Grifar</span>
          </button>
          <button
            onClick={() => setActiveActionMenu('funcoes')}
            className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3.5 shadow-xl border border-white/10 backdrop-blur-md transition-all ${activeActionMenu === 'funcoes' ? 'bg-primary/20 text-primary' : 'bg-card/95 text-foreground hover:bg-secondary'}`}
            title="Mais Funções"
          >
            <LayoutGrid className="w-5 h-5 shrink-0" />
            <span className="font-display text-[13px] font-bold tracking-wider max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[140px] group-hover:opacity-100 group-hover:ml-1">Mais Funções</span>
          </button>
        </div>,
        document.body
      )}

      {/* Desktop/Mobile: pílula flutuante Narrar / Grifar ao selecionar trecho */}
      {artigo && selectionPill && createPortal(
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[10002] -translate-x-1/2 -translate-y-full"
          style={{ left: selectionPill.x, top: selectionPill.y - 8 }}
        >
          <div className="flex items-center gap-1 rounded-full bg-[#1C1C1E] backdrop-blur-md border border-white/10 shadow-2xl shadow-black/50 px-1.5 py-1">
            {effectiveNarracaoUrl && (
              <>
                <button
                  onClick={(e) => { handleNarrarButtonPress(e as any); }}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{narracaoPlaying ? 'Pausar' : 'Ouvir'}</span>
                </button>
                <span className="w-px h-5 bg-white/10" />
              </>
            )}
            <button
              onClick={() => setActiveActionMenu('grifar')}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
            >
              <Feather className="w-4 h-4" />
              <span>Grifar</span>
            </button>
            <span className="w-px h-5 bg-white/10" />
            <button
              onClick={() => setShowAnotacoesSheet(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-sky-400 hover:bg-sky-400/10 transition-colors"
            >
              <StickyNote className="w-4 h-4" />
              <span>Anotar</span>
            </button>
            <span className="w-px h-5 bg-white/10" />
            <button
              onClick={() => {
                const sel = window.getSelection();
                if (sel && !sel.isCollapsed) {
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(sel.toString())}`, '_blank');
                  setSelectionPill(null);
                }
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Pesquisar</span>
            </button>
          </div>
        </motion.div>,
        document.body
      )}

      {isDesktop && hoveredCrossRef && createPortal(
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[10005] pointer-events-none"
          style={{ 
            left: Math.min(hoveredCrossRef.rect.left, window.innerWidth - 320), 
            top: hoveredCrossRef.rect.top > 250 ? hoveredCrossRef.rect.top - 10 : hoveredCrossRef.rect.bottom + 10,
            transform: hoveredCrossRef.rect.top > 250 ? 'translateY(-100%)' : 'none'
          }}
        >
          <div className="w-[300px] p-4 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-md shadow-2xl text-popover-foreground">
            <h4 className="font-bold text-sm text-primary mb-1">{hoveredCrossRef.artigo.numero}</h4>
            <p className="text-xs leading-relaxed line-clamp-4 text-foreground/80">{hoveredCrossRef.artigo.caput}</p>
          </div>
        </motion.div>,
        document.body
      )}

      </>
  );
};

export default ArtigoBottomSheet;
