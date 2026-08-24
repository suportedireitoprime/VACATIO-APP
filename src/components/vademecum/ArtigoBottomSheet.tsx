import { cloneElement, isValidElement, useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Star, Heart, Highlighter, Copy, Plus, Minus, Type, MessageSquare, ChevronUp, ChevronDown, ChevronRight, ExternalLink, Volume2, Pause, Target, StickyNote, MessageCircle, Loader2, Share2, Network, BookOpen, Layers, Sparkles, GraduationCap, Play, Camera, Feather, History, LayoutGrid, Mic, Square, Bell, Scale, Download, Trash2 } from 'lucide-react';
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
const GeracaoAnimacaoOverlay = lazy(() =>
  import('./GeracaoAnimacaoOverlay').then((m) => ({ default: m.GeracaoAnimacaoOverlay })),
);
import { supabase } from '@/integrations/supabase/client';
import { buildPlanaltoArticleUrl } from '@/services/legislacaoService';
import ShareButtons from './ShareButtons';
const VideoaulaSheet = lazy(() => import('./VideoaulaSheet'));
const VideoaulasListSheet = lazy(() => import('./VideoaulasListSheet'));
import type { VideoaulaItem } from './VideoaulasListSheet';

import { useSubscription } from '@/hooks/useSubscription';
import { usePremiumUsage } from '@/hooks/usePremiumUsage';
import PremiumGate, { type PremiumFeatureKey } from '@/components/PremiumGate';
import { toast } from 'sonner';
import { requireOnline } from '@/lib/offlineFeatures';

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
  forceShowRedacao?: boolean;
  modificationInfo?: ModificationInfo | null;
  breadcrumb?: { parte?: string; titulo?: string; tituloDesc?: string } | null;
}

function stripRedacao(text: string): string {
  return text.replace(/\s*\((?:Redação|Incluído|Acrescido|Alterado|Vide|Regulamento|Vetado)[^)]*\)/gi, '');
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
  return /\(Revogado[^)]*\)/i.test(line);
}

// Regex que identifica INÍCIO de uma unidade lógica de texto legal.
// Se uma linha NÃO começa com um destes padrões, ela é continuação da anterior
// (quebra de linha física herdada do HTML da Planalto — precisa ser mesclada).
const LEGAL_LINE_START_RE = /^(?:Art\s*\.|§|Parágrafo\b|[IVXLCDM]+\s*[-–.)]|[a-z]\)|LIVRO\b|PARTE\b|TÍTULO\b|CAPÍTULO\b|SEÇÃO\b|SUBSEÇÃO\b)/i;

// Se a linha inteira for só uma nota entre parênteses (Redação/Incluído/…),
// mantém como linha separada — o parser de metadados espera assim.
const LEGAL_NOTE_ONLY_RE = /^\((?:Redação|Incluído|Acrescido|Alterado|Vide|Regulamento|Revogado|Vetado)\b/i;

function normalizeLegalLineBreaks(text: string): string {
  const raw = text.split('\n').map(l => l.trim());
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
      // Evita espaço duplo se a anterior terminar com hífen de quebra
      if (/[-–]$/.test(prev)) {
        merged[merged.length - 1] = prev.replace(/[-–]$/, '') + line;
      } else {
        merged[merged.length - 1] = prev + ' ' + line;
      }
    }
  }
  return merged.join('\n');
}


function highlightTermos(text: string, showRedacao?: boolean, onCrossReferenceClick?: (artigoNum: string) => void, bionicMode?: boolean): React.ReactNode[] {
  // Pattern for ALL metadata references (shown in yellow, togglable via eye icon)
  const redacaoPattern = /\((?:Redação|Incluído|Acrescido|Alterado|Vide|Regulamento|Revogado|Vetado)[^)]*\)/gi;

  if (showRedacao) {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    redacaoPattern.lastIndex = 0;
    while ((m = redacaoPattern.exec(text)) !== null) {
      if (m.index > lastIndex) parts.push(...highlightTermosOnly(text.slice(lastIndex, m.index), onCrossReferenceClick, bionicMode));
      parts.push(
        <span key={`r${m.index}`} className="text-yellow-400 text-xs font-normal bg-yellow-400/10 rounded px-0.5">
          {m[0]}
        </span>
      );
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) parts.push(...highlightTermosOnly(text.slice(lastIndex), onCrossReferenceClick, bionicMode));
    return parts.length > 0 ? parts : highlightTermosOnly(text, onCrossReferenceClick, bionicMode);
  }
  return highlightTermosOnly(text, onCrossReferenceClick, bionicMode);
}

import { applyBionicReading } from '@/lib/bionicReading';

function highlightTermosOnly(text: string, onCrossReferenceClick?: (artigoNum: string) => void, bionicMode?: boolean): React.ReactNode[] {
  const patterns = [
    /^(Art\.\s*\d+[º°]?(?:-[A-Z])?)(\s*[–-]\s*)?/i,
    /^(§\s*\d+[º°]?(?:-[A-Z])?)(\s*[.–-]?\s*)?/i,
    /^(Parágrafo\s+único)(\.?\s*[–-]?\s*)?/i,
    /^([IVXLC]+\s*[-–.])\s*/i,
    /^([a-z]\))\s*/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const fullMatch = match[0];
    const leadingToken = match[1] || fullMatch;
    const separator = fullMatch.slice(leadingToken.length);
    const rest = text.slice(fullMatch.length);
    const parts: React.ReactNode[] = [];
    parts.push(<span key="token" className="text-primary-light font-bold">{leadingToken}</span>);
    if (separator) parts.push(<span key="sep">{separator}</span>);
    if (rest) parts.push(...linkifyCrossReferences(rest, onCrossReferenceClick, bionicMode));
    return parts;
  }
  return linkifyCrossReferences(text, onCrossReferenceClick, bionicMode);
}

function classifyLine(line: string): { type: 'nomen' | 'caput' | 'inciso' | 'alinea' | 'paragrafo' | 'text'; text: string } {
  if (/^[IVXLC]+\s*[-–.]\s*/i.test(line)) return { type: 'inciso', text: line };
  if (/^[a-z]\)\s*/i.test(line)) return { type: 'alinea', text: line };
  if (/^(§\s*\d+[º°]?\s*[-–.]?\s*|Parágrafo\s+único)/i.test(line)) return { type: 'paragrafo', text: line };
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

const ArtigoBottomSheet = ({ artigo, onClose, isFavorito, onToggleFavorito, showNomenJuris = false, tabelaNome, forceShowRedacao, modificationInfo, breadcrumb }: ArtigoBottomSheetProps) => {
  const [showRedacao, setShowRedacao] = useState(forceShowRedacao ?? false);

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
  const [showPraticarSheet, setShowPraticarSheet] = useState(false);
  
  const [videoaula, setVideoaula] = useState<{ titulo: string; url: string; canal: string; videoId: string; transcricao?: string } | null>(null);
  const [videoaulasLoading, setVideoaulasLoading] = useState(false);
  const [showVideoaulaSheet, setShowVideoaulaSheet] = useState(false);
  const [showVideoaulasListSheet, setShowVideoaulasListSheet] = useState(false);
  
  const [showAnotacoesSheet, setShowAnotacoesSheet] = useState(false);
  const [showPerguntarSheet, setShowPerguntarSheet] = useState(false);
  const [activeTab, setActiveTab] = useState('artigo');
  const [aiContent, setAiContent] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiGeneratingMode, setAiGeneratingMode] = useState<null | 'explicacao' | 'exemplo' | 'termos'>(null);
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
  const [showTermosSheet, setShowTermosSheet] = useState(false);
  const [showLembretesLocal, setShowLembretesLocal] = useState(false);
  const [showBaixarSheet, setShowBaixarSheet] = useState(false);
  
  const [crossRefArtigo, setCrossRefArtigo] = useState<ArtigoLei | null>(null);
  const handleCrossReferenceClick = (artigoNum: string) => {
    if (!tabelaNome) return;
    const artigos = getCachedArtigos(tabelaNome);
    if (artigos) {
      const found = artigos.find(a => a.numero === artigoNum || a.numero === `Art. ${artigoNum}` || a.numero === `Art. ${artigoNum}º` || a.numero === `Art. ${artigoNum}°`);
      if (found) {
        setCrossRefArtigo(found);
        return;
      }
    }
    toast.error('Artigo não encontrado para visualização rápida.');
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
   * Gate padrão das funções do artigo: 3 usos/mês na conta gratuita.
   * O mesmo artigo não consome cota duas vezes (contagem por `ref_key`).
   */
  const gateFeature = async (
    featureKey: string,
    gateKey: PremiumFeatureKey,
    label: string,
    action: () => void,
  ) => {
    if (isPremium) { action(); return; }
    const ref = `${tabelaNome}_${artigo?.numero}`;
    try {
      const ok = await canUseRef(featureKey, ref);
      if (!ok) {
        openPremiumGate(gateKey, `Você usou seus 3 usos gratuitos deste mês em ${label}. Comece 7 dias grátis para liberar.`);
        return;
      }
      await registerUsage(featureKey, ref);
    } catch { /* falha de rede: não bloqueia */ }
    action();
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

      // artigos_grifos: substitui o snapshot com o array atual de N grifos.
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
        origem: 'ia',
        createdAt: Date.now() + i,
      }));
      await supabase.from('artigos_grifos').upsert(
        {
          user_id: user.id,
          tabela_codigo: tabelaNome,
          numero_artigo: artigo.numero,
          artigo_id: artigoId,
          highlights: highlightsPayload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tabela_codigo,numero_artigo' },
      );

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

  // Narration state
  const [narracaoUrl, setNarracaoUrl] = useState<string | null>(null);
  const [narracaoWordTimings, setNarracaoWordTimings] = useState<Array<{ word: string; start: number; end: number }> | null>(null);
  const [narracaoLoading, setNarracaoLoading] = useState(false);
  const [narracaoStepIdx, setNarracaoStepIdx] = useState(0);
  const [narracaoPlaying, setNarracaoPlaying] = useState(false);
  // Índice da palavra ativa — só re-renderiza o texto quando MUDA (não a 60fps)
  const [narracaoActiveWordIndex, setNarracaoActiveWordIndex] = useState(-1);
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

  // Floating mini-player integration
  const location = useLocation();
  const adoptNarracao = useNarracaoFlutuante((s) => s.adopt);
  const reclaimNarracao = useNarracaoFlutuante((s) => s.reclaim);
  const closeFlutuante = useNarracaoFlutuante((s) => s.close);

  // Check for existing narration when artigo changes
  useEffect(() => {
    // Se este artigo é o que está tocando no player flutuante, retoma o áudio.
    const reclaimed = artigo?.id ? reclaimNarracao(artigo.id) : null;

    setNarracaoUrl(null);
    setNarracaoWordTimings(null);
    setNarracaoActiveWordIndex(-1);
    narracaoActiveIdxRef.current = -1;

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
    if (!tabelaNome || !artigo?.numero) return;

    (async () => {
      try {
        const res = await fetch(
          `${SB_URL}/rest/v1/narracoes_artigos?tabela_nome=eq.${tabelaNome}&artigo_numero=eq.${encodeURIComponent(artigo.numero)}&select=audio_url,word_timings&limit=1`,
          {
            headers: {
              apikey: SB_KEY,
              Authorization: `Bearer ${SB_KEY}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const row = data?.[0];
          const hasTimings = Array.isArray(row?.word_timings) && row.word_timings.length > 0;
          // Só reaproveita cache que já tenha karaokê (word_timings). Caches antigos
          // sem timings ou sem o novo prefixo ("Código Civil, Título I, artigo…")
          // são ignorados para forçar regeneração no próximo Narrar.
          if (row?.audio_url && hasTimings) {
            setNarracaoUrl(row.audio_url);
            setNarracaoWordTimings(row.word_timings);
          }
        }
      } catch (e) {
        console.error('Erro ao verificar narração:', e);
      }
    })();
  }, [tabelaNome, artigo?.id, artigo?.numero]);

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
    if (!artigo || !tabelaNome) {
      toast.error('Não encontrei os dados deste artigo para narrar.');
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

    if (narracaoUrl) {
      const played = await playNarracao(narracaoUrl, {
        onRecover: () => { gerarNarracao({ autoplay: true, forceRegenerate: false }).catch(() => {}); },
      });
      if (played) return;
    }

    await gerarNarracao();
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
      // Gate premium: bloqueia ao iniciar a reprodução de outro artigo, inclusive cache já gerado.
      const articleRefKey = tabelaNome && artigo?.numero ? `${tabelaNome}_${artigo.numero}` : null;
      const iniciandoReproducao = !narracaoPlaying && !!articleRefKey;
      if (iniciandoReproducao && !isPremium && !(await canUseRef('narracao', articleRefKey))) {
        openPremiumGate('narracao', 'Você usou suas 3 narrações gratuitas deste mês. Comece 7 dias grátis para ouvir sem limite.');
        return;
      }

      if (iniciandoReproducao && !isPremium && articleRefKey) {
        await registerUsage('narracao', articleRefKey);
      }
      await handleNarrar();
    } catch (e) {
      console.error('Erro ao validar limite de narração:', e);
      openPremiumGate('narracao', 'Não consegui validar seu limite gratuito agora. Assine para ouvir sem limite.');
    } finally {
      narrarActionInFlightRef.current = false;
    }
  }, [artigo?.numero, canUseRef, handleNarrar, isPremium, narracaoLoading, narracaoPlaying, registerUsage, tabelaNome]);

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
  } = useHighlights(artigo?.id || null);
  const [showEraseSheet, setShowEraseSheet] = useState(false);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [voiceGrifoActive, setVoiceGrifoActive] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const voicePanelRef = useRef<GrifoVoicePanelHandle | null>(null);
  const lastCreatedHlRef = useRef<string | null>(null);

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
        origem: 'ia',
        createdAt: Date.now() + i,
      }));
      const { error: highlightsError } = await supabase.from('artigos_grifos').upsert({
        user_id: user.id,
        tabela_codigo: tabelaNome,
        numero_artigo: artigo.numero,
        artigo_id: artigoId,
        highlights: payload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,tabela_codigo,numero_artigo' });
      if (highlightsError) throw highlightsError;
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
          const { data, error } = await supabase.functions.invoke('assistente-juridica', {
            body: {
              mode: 'grifo_magico',
              artigoTexto: fullText,
              artigoNumero: artigo.numero,
              leiNome: tabelaNome,
            },
          });
          if (error) { console.error('Grifo mágico invoke error:', error); continue; }
          const rawReply = data?.reply ?? data?.response ?? data?.text ?? data?.content ?? '';
          const rawStr = typeof rawReply === 'string' ? rawReply : JSON.stringify(rawReply);
          grifos = parseGrifos(rawStr);
          if (grifos) break;
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

              // 1 linha por artigo com N highlights no array
              await supabase.from('artigos_grifos').upsert(
                {
                  user_id: user.id,
                  tabela_codigo: tabelaNome,
                  numero_artigo: artigo.numero,
                  artigo_id: artigoId,
                  highlights: highlightsPayload,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,tabela_codigo,numero_artigo' },
              );

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
    // Desktop: mouseup fires this. Mobile uses the selectionchange effect below.
    if (isMobile) return;
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
    }, 10);
  }, [highlightMode, addHighlight, isMobile, openCreatePrompt, containerRef]);

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
        if (!anchor || !containerRef.current?.contains(anchor)) return;
        const newId = addHighlight();
        if (newId && lastCreatedHlRef.current !== newId) {
          lastCreatedHlRef.current = newId;
          requestAnimationFrame(() => openCreatePrompt(newId));
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
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
    setActiveTab('artigo');

    if (!artigo || !tabelaNome) return;

    // Pre-fetch all cached modes from DB at once
    const modes = ['explicacao', 'exemplo', 'termos'];
    // Hidrata do mirror local primeiro (funciona offline)
    (async () => {
      const { getLocalAiCache } = await import('@/lib/aiCacheLocal');
      const local: Record<string, string> = {};
      for (const m of modes) {
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

  // Fetch AI content: check DB cache first, then generate
  useEffect(() => {
    if (activeTab === 'artigo' || !artigo) return;
    if (aiContent[activeTab] || aiLoading[activeTab]) return;
    if (modificationInfo && activeTab !== 'explicacao') return;

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
        const mode = activeTab as 'explicacao' | 'exemplo';
        setAiGeneratingMode(mode);
        setAiGeneratingStep(0);
        const stepInterval = setInterval(() => {
          setAiGeneratingStep(prev => (prev < 2 ? prev + 1 : prev));
        }, 1800);

        supabase.functions.invoke('assistente-juridica', {
          body: {
            mode: activeTab,
            artigoTexto: artigo.caput,
            artigoNumero: artigo.numero,
            leiNome: tabelaNome || '',
          },
        }).then(({ data, error }) => {
          clearInterval(stepInterval);
          if (!error && data?.reply) {
            setAiGeneratingStep(3);
            setAiContent(prev => ({ ...prev, [activeTab]: data.reply }));
            setLocalAiCache(cacheKey.tabela, cacheKey.numero, cacheKey.modo, data.reply);
            // Save to DB cache
            supabase.from('artigo_ai_cache').upsert({
              tabela_codigo: cacheKey.tabela,
              numero_artigo: cacheKey.numero,
              tipo: cacheKey.modo,
              conteudo: data.reply,
            }, { onConflict: 'tabela_codigo,numero_artigo,tipo' }).then(() => {});
          } else {
            setAiContent(prev => ({ ...prev, [activeTab]: 'Não foi possível gerar o conteúdo. Tente novamente.' }));
          }
          setAiLoading(prev => ({ ...prev, [activeTab]: false }));
          // Pequeno delay para o usuário ver o passo "Pronto"
          setTimeout(() => setAiGeneratingMode(null), 500);
        });
      });
    });
  }, [activeTab, artigo?.id]);

  // Fetch termos when the Termos sheet is opened (independent of tab selection)
  useEffect(() => {
    if (!showTermosSheet || !artigo) return;
    if (aiContent.termos || aiLoading.termos) return;
    const cacheKey = { tabela: tabelaNome || 'unknown', numero: artigo.numero };
    setAiLoading(prev => ({ ...prev, termos: true }));
    import('@/lib/aiCacheLocal').then(({ getLocalAiCache, setLocalAiCache }) => {
      const localVal = getLocalAiCache(cacheKey.tabela, cacheKey.numero, 'termos');
      if (localVal) {
        setAiContent(prev => ({ ...prev, termos: localVal }));
        setAiLoading(prev => ({ ...prev, termos: false }));
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setAiContent(prev => ({ ...prev, termos: 'Sem internet — termos ainda não gerados.' }));
        setAiLoading(prev => ({ ...prev, termos: false }));
        return;
      }
      supabase
      .from('artigo_ai_cache')
      .select('conteudo')
      .eq('tabela_codigo', cacheKey.tabela)
      .eq('numero_artigo', cacheKey.numero)
      .eq('tipo', 'termos')
      .maybeSingle()
      .then(({ data: cached }) => {
        if (cached?.conteudo) {
          setLocalAiCache(cacheKey.tabela, cacheKey.numero, 'termos', cached.conteudo as string);
          setAiContent(prev => ({ ...prev, termos: cached.conteudo as string }));
          setAiLoading(prev => ({ ...prev, termos: false }));
          return;
        }
        setAiGeneratingMode('termos');
        setAiGeneratingStep(0);
        const stepInterval = setInterval(() => {
          setAiGeneratingStep(prev => (prev < 2 ? prev + 1 : prev));
        }, 1800);
        supabase.functions.invoke('assistente-juridica', {
          body: { mode: 'termos', artigoTexto: artigo.caput, artigoNumero: artigo.numero, leiNome: tabelaNome || '' },
        }).then(({ data, error }) => {
          clearInterval(stepInterval);
          if (!error && data?.reply) {
            setAiGeneratingStep(3);
            setAiContent(prev => ({ ...prev, termos: data.reply }));
            setLocalAiCache(cacheKey.tabela, cacheKey.numero, 'termos', data.reply);
            supabase.from('artigo_ai_cache').upsert({
              tabela_codigo: cacheKey.tabela,
              numero_artigo: cacheKey.numero,
              tipo: 'termos',
              conteudo: data.reply,
            }, { onConflict: 'tabela_codigo,numero_artigo,tipo' }).then(() => {});
          } else {
            setAiContent(prev => ({ ...prev, termos: 'Não foi possível gerar os termos. Tente novamente.' }));
          }
          setAiLoading(prev => ({ ...prev, termos: false }));
          setTimeout(() => setAiGeneratingMode(null), 500);
        });
      });
    });
  }, [showTermosSheet, artigo?.id]);


  if (!artigo) return null;

  const fullText = normalizeLegalLineBreaks(artigo.caput || '');
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
  let nomenJuris: string | null = null;
  let contentLines = lines;
  const structuralPattern = /^(LIVRO|PARTE|TÍTULO)\s+/i;
  contentLines = contentLines.filter(l => !structuralPattern.test(l.trim()));

  // Nomen juris only for CP (Código Penal) and CPM (Código Penal Militar)
  const isCodigoPenal = tabelaNome && /^(CP_|CPM_)/i.test(tabelaNome);
  if (isCodigoPenal && showNomenJuris && contentLines.length > 1) {
    const firstLine = contentLines[0].trim();
    const firstLineClean = firstLine.replace(/\s*\([^)]*\)\s*/g, '').trim();
    const isNomen =
      firstLineClean.length > 0 &&
      firstLineClean.length <= 50 &&
      /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÇ]/.test(firstLineClean) &&
      !/^(Art\.|§|Parágrafo|[IVXLC]+\s*[-–.]|[a-z]\))/i.test(firstLineClean) &&
      !/[.;:!?]/.test(firstLineClean) &&
      !/\b(não|será|é|foi|são|tem|houver|aplica|considera)\b/i.test(firstLineClean);

    if (isNomen) {
      nomenJuris = firstLine;
      contentLines = contentLines.slice(1);
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
  const displayLines = isRevogado ? rawLines : processedLines;

  const getRenderedLineText = (line: string, lineIndex: number, isFirst: boolean) => {
    const isModifiedLine = modificationInfo && modificationInfo.linhasModificadas.includes(lineIndex);
    const displayText = modificationInfo
      ? (isModifiedLine && showRedacao ? line : stripRedacao(line))
      : (showRedacao ? line : stripRedacao(line));

    if (isFirst && !isRevogado) {
      return displayText.replace(/^Art\s*\.\s*\d+[º°]?(?:-[A-Z])?\s*[–-]?\s*/i, '');
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
      const cleanedText = displayText.replace(/^Art\s*\.\s*\d+[º°]?(?:-[A-Z])?\s*[–-]?\s*/i, '');
      offsetShift = displayText.length - cleanedText.length;
      baseNodes = highlightTermos(cleanedText, modificationInfo ? isModifiedLine && showRedacao : showRedacao, handleCrossReferenceClick);
    } else {
      baseNodes = highlightTermos(displayText, modificationInfo ? isModifiedLine && showRedacao : showRedacao, handleCrossReferenceClick);
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

    const extra =
      classified.type === 'inciso' ? 'pl-4 border-l-2 border-primary/30' :
      classified.type === 'alinea' ? 'pl-8' :
      classified.type === 'paragrafo' ? 'mt-2' : '';

    const highlightBg = isModifiedLine
      ? 'bg-violet-500/20 border-l-3 border-violet-400 pl-3 rounded-r-lg'
      : !modificationInfo && showRedacao && /\((?:Redação|Incluído|Acrescido|Alterado|Revogado|Vetado)[^)]*\)/i.test(line)
        ? 'bg-yellow-400/5 border-l-2 border-yellow-400/40 pl-2 rounded-r'
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
        className={`text-foreground leading-[1.8] ${extra} ${highlightBg}`}
        style={{ fontSize: `${fontSize}px` }}
      >
        {isFirst && !isRevogado && artLabel && (
          <>
            <span className="font-bold text-amber-400">{artLabel}</span>
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
      <Sheet open={Boolean(artigo)} onOpenChange={(open) => { if (!open) handleSheetClose(); }}>
        <SheetContent
          side="bottom"
          className={
            isDesktop
              ? "z-[9999] flex min-h-0 flex-col gap-0 overflow-hidden overscroll-contain rounded-2xl border border-white/5 bg-[#0f0f0f] p-0 shadow-2xl [&>button:last-child]:hidden top-[5%] bottom-[5%] inset-x-0 mx-auto max-w-[860px] h-[90dvh] max-h-[90dvh]"
              : "z-[9999] flex min-h-0 flex-col gap-0 overflow-hidden overscroll-contain rounded-t-3xl border-t border-white/5 bg-[#0f0f0f] p-0 [&>button:last-child]:hidden top-auto bottom-0 h-[90dvh] max-h-[90dvh]"
          }

        >
        <div className="shrink-0 flex justify-center pt-3 pb-1 bg-[#0f0f0f]">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Scrollable content area: header, tabs and article content scroll up; bottom nav stays fixed */}
        <div ref={scrollContainerRef as any} className="flex-1 overflow-y-auto min-h-0 relative overscroll-contain">

        {/* Top bar: heart/eye (left) + online count + close (right) */}
        <div className="px-4 pt-1 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!highlightMode && (
              <>
                <motion.button
                  onClick={() => {
                    import('@/lib/appEvents').then(({ appEvents }) =>
                      appEvents.favoritarArtigo({ tabela: tabelaNome, numero: artigo.numero, on: !isFavorito })
                    ).catch(() => {});
                    onToggleFavorito?.();
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
              <button onClick={handleSheetClose} className="w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-500 transition-colors flex items-center justify-center" aria-label="Fechar">
                <X className="w-5 h-5 text-black" />
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumb: PARTE > TÍTULO / descrição */}
        {(breadcrumb?.parte || breadcrumb?.titulo) && (
          <div className="px-5 pb-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {breadcrumb?.parte && <span>{breadcrumb.parte}</span>}
              {breadcrumb?.parte && breadcrumb?.titulo && <ChevronRight className="w-3 h-3" />}
              {breadcrumb?.titulo && <span>{breadcrumb.titulo}</span>}
            </div>
            {breadcrumb?.tituloDesc && (
              <p className="text-[11px] uppercase tracking-wide text-foreground/70 font-body leading-snug mt-0.5">
                {breadcrumb.tituloDesc}
              </p>
            )}
          </div>
        )}

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

        {/* Título (fallback if no breadcrumb prop) */}
        {!breadcrumb && artigo.titulo && (() => {
          const parts = artigo.titulo.match(/^(T[IÍ]TULO\s+[IVXLC\d]+)\s*[-–]?\s*(.*)/i);
          if (parts) {
            return (
              <div className="px-5 pb-1">
                <p className="text-[11px] text-foreground/70 font-body uppercase tracking-wide">{parts[1]}</p>
                <p className="text-[11px] text-foreground font-body leading-snug">{parts[2]}</p>
              </div>
            );
          }
          return (
            <div className="px-5 pb-1">
              <p className="text-[11px] text-foreground font-body leading-snug">{artigo.titulo}</p>
            </div>
          );
        })()}

        {/* Capítulo (fallback if no breadcrumb prop) */}
        {!breadcrumb && artigo.capitulo && (() => {
          const parts = artigo.capitulo.match(/^(CAP[IÍ]TULO\s+[IVXLC\d]+)\s*[-–]?\s*(.*)/i);
          if (parts) {
            return (
              <div className="px-5 pb-2">
                <p className="text-[11px] text-foreground/70 font-body uppercase tracking-wide">{parts[1]}</p>
                <p className="text-[11px] text-foreground font-body leading-snug">{parts[2]}</p>
              </div>
            );
          }
          return (
            <div className="px-5 pb-2">
              <p className="text-[11px] text-foreground font-body leading-snug">{artigo.capitulo}</p>
            </div>
          );
        })()}

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
          if (!isPremium && (v === 'explicacao' || v === 'exemplo')) {
            const label = v === 'explicacao' ? 'Explicação' : 'Exemplo';
            gateFeature(v, v as PremiumFeatureKey, label, () => setActiveTab(v));
            return;
          }
          setActiveTab(v);
        }} className="flex flex-col">
          {modificationInfo ? (
            <TabsList className="mx-5 bg-secondary/60 rounded-2xl h-11 grid grid-cols-2 w-auto p-1">
              <TabsTrigger value="artigo" className="rounded-xl text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">Artigo</TabsTrigger>
              <TabsTrigger value="explicacao" className="rounded-xl text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">Explicação</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="mx-5 bg-secondary/60 rounded-2xl h-11 grid grid-cols-4 w-auto p-1">
              <TabsTrigger value="artigo" className="rounded-xl text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">Artigo</TabsTrigger>
              <TabsTrigger value="explicacao" className="rounded-xl text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">Explicação</TabsTrigger>
              <TabsTrigger value="exemplo" className="rounded-xl text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">Exemplo</TabsTrigger>
              <TabsTrigger value="historico" className="rounded-xl text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2">Histórico</TabsTrigger>
            </TabsList>

          )}


          <TabsContent value="artigo" className="px-5 pb-[calc(9rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] pt-4 relative">
            {/* Barra de progresso da narração (sticky no topo) */}
            {narracaoPlaying && (
              <div className="sticky top-0 z-30 -mx-5 -mt-4 mb-3 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-white/5 px-5 py-2.5">
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
                <div className="mb-3">
                  <h4 className="text-primary-light font-bold text-base">
                    {showRedacao ? highlightTermos(nomenJuris, true) : stripRedacao(nomenJuris)}
                  </h4>
                </div>
              )}

              {isRevogado && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1 text-purple-300 text-xs font-semibold">
                  Dispositivo revogado
                </div>
              )}

              {/* Epígrafe do artigo (ex: "Anterioridade da Lei") */}
              {artigo.titulo && !/^(PARTE|LIVRO|T[IÍ]TULO|CAP[IÍ]TULO|SEÇ[AÃ]O|SUBSEÇ[AÃ]O)\b/i.test(artigo.titulo) && (
                <p className="mb-3 border-l-2 border-primary/70 pl-3 text-[13px] italic text-primary/90 font-body leading-snug">
                  {artigo.titulo}
                </p>
              )}


              <div
                ref={containerRef}
                className={`space-y-4 font-legal text-base ${highlightMode ? 'select-text cursor-text highlight-selectable' : ''}`}
                style={highlightMode ? {
                  WebkitUserSelect: 'text',
                  userSelect: 'text',
                  WebkitTouchCallout: 'default' as any,
                  WebkitTapHighlightColor: selectedColor,
                  ['--hl-selection' as any]: selectedColor,
                } : undefined}

                onMouseUp={handleTextSelection}
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


          <TabsContent value="explicacao" className="px-5 pb-[calc(8rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] pt-4">
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
                  (() => {
                    const sections = splitSections(aiContent.explicacao, '---SECAO---');
                    if (sections.length <= 1) {
                      return (
                        <div className="prose prose-sm dark:prose-invert max-w-none font-body leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:font-bold [&_strong]:text-foreground" style={{ fontSize: `${fontSize}px` }}>
                          <ReactMarkdown>{aiContent.explicacao}</ReactMarkdown>
                        </div>
                      );
                    }
                    return (
                      <Accordion type="multiple" className="space-y-2">
                        {sections.map((sec, i) => {
                          const borderColors = ['border-l-red-500/70', 'border-l-amber-500/70', 'border-l-emerald-500/70', 'border-l-sky-500/70', 'border-l-violet-500/70', 'border-l-pink-500/70', 'border-l-orange-500/70'];
                          const strongColors = ['[&_strong]:text-red-400', '[&_strong]:text-amber-400', '[&_strong]:text-emerald-400', '[&_strong]:text-sky-400', '[&_strong]:text-violet-400', '[&_strong]:text-pink-400', '[&_strong]:text-orange-400'];
                          return (
                          <AccordionItem key={i} value={`exp-${i}`} className={`border border-border rounded-xl overflow-hidden bg-secondary/30 border-l-4 ${borderColors[i % borderColors.length]}`}>
                            <AccordionTrigger className="px-4 py-4 text-base font-semibold text-foreground text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                              {sec.title}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className={`prose prose-sm dark:prose-invert max-w-none font-body leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 ${strongColors[i % strongColors.length]}`} style={{ fontSize: `${fontSize}px` }}>
                                <ReactMarkdown>{sec.body}</ReactMarkdown>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          );
                        })}
                      </Accordion>
                    );
                  })()
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-8">Clique para gerar a explicação.</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exemplo" className="px-5 pb-[calc(8rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] pt-4">
            {aiLoading.exemplo ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-body">Gerando exemplos práticos com IA...</p>
              </div>
            ) : aiContent.exemplo ? (
              (() => {
                const sections = splitSections(aiContent.exemplo, '---EXEMPLO---');
                if (sections.length <= 1) {
                  return (
                    <div className="prose prose-sm dark:prose-invert max-w-none font-body leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:font-bold [&_strong]:text-foreground" style={{ fontSize: `${fontSize}px` }}>
                      <ReactMarkdown>{aiContent.exemplo}</ReactMarkdown>
                    </div>
                  );
                }
                return (
                  <Accordion type="single" collapsible className="space-y-2">
                    {sections.map((sec, i) => {
                      const borderColors = ['border-l-emerald-500/70', 'border-l-sky-500/70', 'border-l-amber-500/70', 'border-l-violet-500/70'];
                      const strongColors = ['[&_strong]:text-emerald-400', '[&_strong]:text-sky-400', '[&_strong]:text-amber-400', '[&_strong]:text-violet-400'];
                      return (
                      <AccordionItem key={i} value={`ex-${i}`} className={`border border-border rounded-xl overflow-hidden bg-secondary/30 border-l-4 ${borderColors[i % borderColors.length]}`}>
                        <AccordionTrigger className="px-4 py-4 text-base font-semibold text-foreground text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                          {sec.title}
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className={`prose prose-sm dark:prose-invert max-w-none font-body leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 ${strongColors[i % strongColors.length]}`} style={{ fontSize: `${fontSize}px` }}>
                            <ReactMarkdown>{sec.body}</ReactMarkdown>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      );
                    })}
                  </Accordion>
                );
              })()
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Clique para gerar exemplos.</p>
            )}
          </TabsContent>

          <TabsContent value="historico" className="px-5 pb-[calc(8rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] pt-4">
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
                  <div className="flex items-center gap-2 text-primary">
                    <History className="w-4 h-4" />
                    <p className="text-sm font-semibold uppercase tracking-wider">Histórico de alterações</p>
                  </div>
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
                <div className="bg-card border border-border rounded-2xl shadow-lg p-4 flex items-center justify-between gap-4 self-end">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-foreground leading-tight">Leitura Dinâmica</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Bionic Reading</span>
                  </div>
                  <button
                    onClick={() => setBionicReading(!bionicReading)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 relative ${bionicReading ? 'bg-primary' : 'bg-secondary border border-border'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${bionicReading ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Bottom-up action sheet for Funções / Grifar */}
          {activeTab === 'artigo' && (
              <AnimatePresence>
                {activeActionMenu && (() => {
                  const funcoesItems = [
                    { icon: Scale, label: 'Jurisprudência', desc: 'Súmulas, temas e acórdãos do STF/STJ', color: '#D4AF37', onClick: () => {
                      setActiveActionMenu(null);
                      if (!requireOnline('Jurisprudência')) return;
                      if (!tabelaNome || !artigo?.numero) { toast.error('Artigo não identificado'); return; }
                      gateFeature('jurisprudencia', 'jurisprudencia', 'Jurisprudência', () =>
                        navigate(`/jurisprudencia/${tabelaNome}/${encodeURIComponent(String(artigo.numero))}`),
                      );
                    } },
                    { icon: Play, label: 'Videoaulas', desc: 'Aulas em vídeo sobre este artigo', color: '#EF4444', onClick: () => {
                      setActiveActionMenu(null);
                      if (!requireOnline('Videoaulas')) return;
                      gateFeature('videoaula', 'videoaula', 'Videoaulas', () => setShowVideoaulasListSheet(true));
                    } },
                    
                    { icon: BookOpen, label: 'Termos jurídicos', desc: 'Vocabulário do artigo explicado', color: '#F97316', onClick: () => { setActiveActionMenu(null); if (!requireOnline('Termos jurídicos')) return; gateFeature('termos', 'termos', 'Termos jurídicos', () => setShowTermosSheet(true)); } },
                    { icon: MessageCircle, label: 'Perguntar', desc: 'Tire dúvidas com a IA', color: '#A855F7', onClick: () => { setActiveActionMenu(null); if (!requireOnline('Perguntar à IA')) return; gateFeature('perguntar', 'perguntar', 'Perguntar à IA', () => setShowPerguntarSheet(true)); } },
                    ...(tabelaNome ? [{ icon: Network, label: 'Grafo de conexões', desc: 'Ver relações do artigo', color: '#10B981', onClick: () => { setActiveActionMenu(null); gateFeature('grafo', 'grafo', 'Grafo de conexões', () => setShowGrafo(true)); } }] : []),
                    { icon: Copy, label: 'Copiar artigo', desc: 'Texto para a área de transferência', color: '#8B5CF6', onClick: () => { setActiveActionMenu(null); handleCopy(); } },
                    { icon: Bell, label: 'Lembretes', desc: 'Avisar ao chegar em um local', color: '#F59E0B', onClick: () => { setActiveActionMenu(null); import('./LembretesArtigoSheet'); gateFeature('lembretes', 'lembretes', 'Lembretes', () => setShowLembretesLocal(true)); } },
                    { icon: Download, label: 'Baixar artigo', desc: 'PDF ou imagem, lei seca ou comentado', color: '#0EA5E9', onClick: () => { setActiveActionMenu(null); setShowBaixarSheet(true); } },
                    { icon: Share2, label: 'Compartilhar', desc: 'Enviar para outro app', color: '#06B6D4', onClick: () => { setActiveActionMenu(null); setShowSharePanel(p => !p); } },
                  ];

                  const gateGrifo = (label: string, action: () => void) =>
                    gateFeature('grifo', 'grifo', label, action);
                  const grifarItems = [
                    { icon: Highlighter, label: highlightMode ? 'Desativar grifo manual' : 'Grifo manual', desc: 'Marcar com o dedo', color: '#EC4899', active: highlightMode, onClick: () => { setActiveActionMenu(null); if (highlightMode) { toggleMode(); return; } gateGrifo('Grifar', () => toggleMode()); } },
                    { icon: Sparkles, label: 'Grifo mágico (IA)', desc: 'Destaques automáticos', color: '#F59E0B', active: magicMode, spin: magicLoading, badge: magicHighlights.length, onClick: () => { setActiveActionMenu(null); gateGrifo('Grifar', () => handleToggleMagic()); } },
                    { icon: Mic, label: 'Grifar por voz', desc: 'Dite o trecho a destacar', color: '#EAB308', onClick: () => { setActiveActionMenu(null); gateGrifo('Grifar', () => setVoiceGrifoActive(true)); } },
                    { icon: Camera, label: 'Grifar de foto', desc: 'OCR de imagem', color: '#3B82F6', onClick: () => { setActiveActionMenu(null); gateGrifo('Grifar', () => setShowGrifoFoto(true)); } },
                    { icon: Trash2, label: 'Apagar grifos', desc: 'Escolha por cor ou apague todos', color: '#EF4444', badge: eraseSheetHighlights.length, onClick: () => { setActiveActionMenu(null); setShowEraseSheet(true); } },
                  ];
                  const isGrifar = activeActionMenu === 'grifar';
                  const items = isGrifar ? grifarItems : funcoesItems;
                  const title = isGrifar ? 'Grifar' : 'Funções';
                  const HeaderIcon = isGrifar ? Feather : LayoutGrid;
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
                        className="fixed bottom-0 left-0 right-0 z-[71] bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] min-h-[74vh] max-h-[92vh] mx-auto max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 md:top-auto md:w-[92vw] md:max-w-2xl md:rounded-3xl md:border md:border-border md:shadow-2xl"
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
                          {items.map((item, i, arr) => {
                            const Icon = item.icon;
                            return (
                              <div key={i}>
                                <button
                                  onClick={item.onClick}
                                  className={`w-full min-h-[68px] flex items-center gap-3 px-5 py-3.5 transition-colors text-left ${(item as any).active ? 'bg-amber-300/10' : 'hover:bg-secondary/60'}`}
                                >
                                  <span
                                    className="w-9 h-9 flex items-center justify-center shrink-0"
                                    style={{ color: item.color }}
                                  >
                                    <Icon className={`w-[22px] h-[22px] ${(item as any).spin ? 'animate-spin' : ''}`} strokeWidth={2} />
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-[14.5px] font-medium text-foreground truncate">{item.label}</span>
                                    <span className="block text-[12px] text-foreground/60 truncate mt-0.5">{item.desc}</span>
                                  </span>
                                  {(item as any).badge > 0 && (
                                    <span className="ml-2 inline-flex min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-400 text-black text-[11px] font-bold items-center justify-center">
                                      {(item as any).badge}
                                    </span>
                                  )}
                                </button>
                                {i < arr.length - 1 && (
                                  <div className="mx-5 h-px bg-border/60" />
                                )}
                              </div>
                            );
                          })}
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
        <div className="shrink-0 relative z-[55] bg-card/95 backdrop-blur-md border-t border-border rounded-t-3xl shadow-lg shadow-black/10 pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))]">
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
                onClick={() => gateFeature('praticar', 'praticar', 'Praticar', () => setShowPraticarSheet(true))}
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
                disabled={narracaoLoading}
                className="relative z-[80] flex flex-col items-center justify-end gap-1.5 -mt-11 min-h-[6.25rem] min-w-[5.75rem] touch-manipulation select-none"
                aria-label="Narrar"
              >
                <span className={`relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-lg ring-4 ring-card transition-all duration-300 ${narracaoPlaying ? 'bg-primary shadow-primary/40 scale-105' : 'bg-primary shadow-primary/30 hover:bg-primary/90'}`}>
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
                  {narracaoLoading ? (
                    <Loader2 className="w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground animate-spin relative z-20" />
                  ) : narracaoPlaying ? (
                    <Pause className="w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground relative z-20" />
                  ) : (
                    <Volume2 className="w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground relative z-20" />
                  )}
                </span>
                <span className="font-body text-[11px] sm:text-[12px] font-semibold text-primary leading-tight">
                  {narracaoPlaying ? 'Pausar' : narracaoUrl ? 'Ouvir' : 'Narrar'}
                </span>
              </button>
            )}
            {(highlightMode || voiceGrifoActive) ? (
              <div aria-hidden="true" />
            ) : (
              <button
                onClick={() => gateFeature('lei_anotacao', 'anotacoes', 'Anotações', () => { setShowAnotacoesSheet(true); setShowFontControls(false); })}
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
                onClick={() => setActiveActionMenu('grifar')}
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
                <div className="fixed top-[calc(0.75rem+var(--sai-top,env(safe-area-inset-top,0px)))] left-0 right-0 z-[10001] flex justify-center pointer-events-none">
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
                aiGeneratingMode === 'explicacao' ? 'Gerando explicação com IA' :
                aiGeneratingMode === 'exemplo' ? 'Gerando exemplos práticos' :
                aiGeneratingMode === 'termos' ? 'Analisando termos jurídicos' :
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





        {/* Praticar Sheet */}
        <AnimatePresence>
          {showPraticarSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[60]"
                onClick={() => setShowPraticarSheet(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[61] bg-card rounded-t-3xl border-t border-border pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] h-[85vh] max-h-[85vh] overflow-y-auto mx-auto max-w-lg flex flex-col md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 md:top-auto md:w-[92vw] md:max-w-2xl md:rounded-3xl md:border md:border-border md:shadow-2xl"
              >
                <div className="pt-3 pb-2 flex justify-center">
                  <span className="w-10 h-1 rounded-full bg-border" />
                </div>
                <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h3 className="font-heading text-base font-semibold text-foreground">Praticar</h3>
                  </div>
                  <button
                    onClick={() => setShowPraticarSheet(false)}
                    className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70"
                    aria-label="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="px-5 pt-3 text-[12.5px] text-foreground/60">Art. {artigo?.numero} — Escolha o modo de estudo</p>
                <div className="flex-1 py-2">
                  {[
                    { icon: Target, label: 'Questões', desc: 'Múltipla escolha com comentários e exemplos', color: '#F59E0B', onClick: () => { setShowPraticarSheet(false); navigate(`/estudos?mode=questoes&tabela=${tabelaNome}&artigo=${artigo?.numero}`); } },
                    { icon: Layers, label: 'Flashcards', desc: 'Cards com flip animado e exemplos práticos', color: '#EAB308', onClick: () => { setShowPraticarSheet(false); navigate(`/estudos?mode=flashcards&tabela=${tabelaNome}&artigo=${artigo?.numero}`); } },
                  ].map((item, i, arr) => {
                    const Icon = item.icon;
                    return (
                      <div key={i}>
                        <button
                          onClick={item.onClick}
                          className="w-full flex items-center gap-4 px-5 py-5 transition-colors text-left hover:bg-secondary/60"
                        >
                          <span className="w-11 h-11 flex items-center justify-center shrink-0" style={{ color: item.color }}>
                            <Icon className="w-[26px] h-[26px]" strokeWidth={2} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[15.5px] font-medium text-foreground truncate">{item.label}</span>
                            <span className="block text-[12.5px] text-foreground/60 truncate mt-0.5">{item.desc}</span>
                          </span>
                          <ChevronRight className="w-5 h-5 text-foreground/40 shrink-0" />
                        </button>
                        {i < arr.length - 1 && <div className="mx-5 h-px bg-border/60" />}
                      </div>
                    );
                  })}
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
              leiNome={tabelaNome}
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

        {/* Termos jurídicos Sheet (aberto pelo menu Grifar) */}
        <Sheet open={showTermosSheet} onOpenChange={(open) => setShowTermosSheet(open)}>
          <SheetContent side="bottom" className="h-[90vh] max-w-lg mx-auto rounded-t-3xl p-0 flex flex-col">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <BookOpen className="w-5 h-5 text-orange-400" />
              <h3 className="font-heading text-base font-semibold text-foreground flex-1">Termos jurídicos</h3>
              <button onClick={() => setShowTermosSheet(false)} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {aiLoading.termos ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground font-body">Analisando termos jurídicos com IA...</p>
                </div>
              ) : aiContent.termos ? (
                (() => {
                  const sections = splitSections(aiContent.termos, '---TERMO---');
                  if (sections.length <= 1) {
                    return (
                      <div className="prose prose-sm dark:prose-invert max-w-none font-body leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:font-bold [&_strong]:text-foreground" style={{ fontSize: `${fontSize}px` }}>
                        <ReactMarkdown>{aiContent.termos}</ReactMarkdown>
                      </div>
                    );
                  }
                  return (
                    <Accordion type="single" collapsible className="space-y-2">
                      {sections.map((sec, i) => {
                        const borderColors = ['border-l-pink-500/70', 'border-l-orange-500/70', 'border-l-cyan-500/70', 'border-l-red-500/70', 'border-l-indigo-500/70', 'border-l-lime-500/70'];
                        const strongColors = ['[&_strong]:text-pink-400', '[&_strong]:text-orange-400', '[&_strong]:text-cyan-400', '[&_strong]:text-red-400', '[&_strong]:text-indigo-400', '[&_strong]:text-lime-400'];
                        return (
                          <AccordionItem key={i} value={`term-${i}`} className={`border border-border rounded-xl overflow-hidden bg-secondary/30 border-l-4 ${borderColors[i % borderColors.length]}`}>
                            <AccordionTrigger className="px-4 py-4 text-base font-semibold text-foreground text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                              {sec.title}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className={`prose prose-sm dark:prose-invert max-w-none font-body leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 ${strongColors[i % strongColors.length]}`} style={{ fontSize: `${fontSize}px` }}>
                                <ReactMarkdown>{sec.body}</ReactMarkdown>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  );
                })()
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">Carregando termos...</p>
              )}
            </div>
          </SheetContent>
          {crossRefArtigo && (
            <ArtigoBottomSheet
              artigo={crossRefArtigo}
              tabelaNome={tabelaNome}
              onClose={() => setCrossRefArtigo(null)}
              isFavorito={false}
            />
          )}
        </Sheet>
        </SheetContent>
      </Sheet>


      <Suspense fallback={null}>
        {tabelaNome && artigo && showGrafo && (
          <GrafoOverlay
            open={showGrafo}
            onClose={() => setShowGrafo(false)}
            tabelaNome={tabelaNome}
            leiNome={tabelaNome}
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

      {/* Desktop: barras laterais retráteis (Funções/Praticar à esquerda, Anotações à direita) */}
      {isDesktop && artigo && (activeTab ?? 'artigo') === 'artigo' && createPortal(
        <>
          <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[10000] flex flex-col gap-2 rounded-2xl bg-card/95 backdrop-blur-md border border-border p-2 shadow-xl shadow-black/40">
            <button
              onClick={() => setActiveActionMenu('funcoes')}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${activeActionMenu === 'funcoes' ? 'bg-primary/15 text-primary' : 'text-foreground hover:bg-secondary'}`}
              title="Funções"
              aria-label="Funções"
            >
              <LayoutGrid className="w-6 h-6 shrink-0" />
              <span className="font-body text-sm font-medium max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-[140px] group-hover:opacity-100 group-hover:ml-0">Funções</span>
            </button>
            <button
              onClick={() => gateFeature('praticar', 'praticar', 'Praticar', () => setShowPraticarSheet(true))}
              className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-foreground hover:bg-secondary transition-colors"
              title="Praticar"
              aria-label="Praticar"
            >
              <Target className="w-6 h-6 shrink-0" />
              <span className="font-body text-sm font-medium max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-[140px] group-hover:opacity-100">Praticar</span>
            </button>
          </div>
          <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[10000] flex flex-col gap-2 rounded-2xl bg-card/95 backdrop-blur-md border border-border p-2 shadow-xl shadow-black/40">
            <button
              onClick={() => gateFeature('lei_anotacao', 'anotacoes', 'Anotações', () => setShowAnotacoesSheet(true))}
              className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-foreground hover:bg-secondary transition-colors"
              title="Anotações"
              aria-label="Anotações"
            >
              <StickyNote className="w-6 h-6 shrink-0" />
              <span className="font-body text-sm font-medium max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-[140px] group-hover:opacity-100">Anotações</span>
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Desktop: pílula flutuante Narrar / Grifar ao selecionar trecho */}
      {isDesktop && artigo && selectionPill && createPortal(
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[10002] -translate-x-1/2 -translate-y-full"
          style={{ left: selectionPill.x, top: selectionPill.y - 8 }}
        >
          <div className="flex items-center gap-1 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl shadow-black/40 px-1.5 py-1">
            <button
              onClick={(e) => { handleNarrarButtonPress(e as any); }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
              <span>Narrar</span>
            </button>
            <span className="w-px h-5 bg-border" />
            <button
              onClick={() => setActiveActionMenu('grifar')}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
            >
              <Feather className="w-4 h-4" />
              <span>Grifar</span>
            </button>
          </div>
        </motion.div>,
        document.body
      )}

      </>
  );
};

export default ArtigoBottomSheet;
