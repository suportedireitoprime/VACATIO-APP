import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Scale, BookOpen, Clock, Camera, Mic, MicOff, X, Loader2, Heart,
  Landmark, Swords, Users, Gavel, Coins, ShieldCheck, Briefcase, Car, Vote,
  Shield, TreePine, Anchor, Pickaxe, Radio, Plane, Droplets,
  Baby, UserCheck, Accessibility, HandHeart, Building2, Target, GraduationCap,
  Star, Sprout, Globe2, Tent, Mountain, Palette, Store, Ribbon,
  Lock, HeartHandshake, Pill, AlertTriangle, Phone, UserCog, FileWarning,
  FileText, ScrollText, Handshake, SquareStack, CircleDot, Wifi, BookMarked,
  ChevronDown, type LucideIcon,
} from 'lucide-react';
import type { LeiCatalogItem } from '@/data/leisCatalog';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';

import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import OcrScanner from './OcrScanner';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { track } from '@/lib/analyticsEvents';

import { LEIS_CATALOG } from '@/data/leisCatalog';
import { getRecentes, getPopularLeiIds, bumpLeiSearch } from '@/lib/leisRecentes';
import { getFavoritos, isFavorito, toggleFavorito, LEIS_FAVORITOS_EVENT, type LeiFavorita } from '@/lib/leisFavoritos';
import { useBuscaConteudo, type ConteudoTipo } from '@/hooks/useBuscaConteudo';
import CategoriaFiltroBar, { type CategoriaKey } from './CategoriaFiltroBar';
import ResultadoConteudoCard from './ResultadoConteudoCard';
import ConteudoBusca from './ConteudoBusca';

// Mapa de ícones temáticos por lei.id
const LEI_ICON_MAP: Record<string, LucideIcon> = {
  cf88: Landmark,
  cp: Swords, cc: Users, cpc: Gavel, cpp: Shield, ctn: Coins,
  cdc: ShieldCheck, clt: Briefcase, ctb: Car, ce: Vote,
  cpm: Shield, cppm: Shield, cflor: TreePine, ccom: Anchor,
  cba: Plane, cagua: Droplets, cmin: Pickaxe, ctel: Radio,
  eca: Baby, ei: UserCheck, epd: Accessibility, eir: HandHeart,
  ec: Building2, ed: Target, eoab: GraduationCap, et: Star,
  ej: Sprout, em: Shield, eind: Tent, eterra: Mountain,
  emig: Globe2, eref: Globe2, emet: Building2, emus: Palette,
  eme: Store, epc: Ribbon,
  lep: Lock, lmp: HeartHandshake, ld: Pill, loc: AlertTriangle,
  laa: FileWarning, lit: Phone, l8112: UserCog, lia: FileWarning,
  nll: FileText, lms: ScrollText, lacp: Handshake, lje: SquareStack,
  lgpd: ShieldCheck, mci: Wifi,
};

const DEFAULT_LEI_ICON: LucideIcon = BookMarked;

function LeiIcon({ lei }: { lei: LeiCatalogItem }) {
  const Icon = LEI_ICON_MAP[lei.id] || DEFAULT_LEI_ICON;
  const color = lei.iconColor || 'hsl(var(--primary))';
  return (
    <div className="w-12 h-12 flex items-center justify-center shrink-0">
      <Icon className="w-7 h-7" style={{ color }} strokeWidth={1.8} />
    </div>
  );
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onSelectLei: (lei: { tipo: string; leiId: string; nome: string; descricao: string; tabela_nome: string; artigoNumero?: string }) => void;
}

type SearchMode = 'todos' | 'constituicao' | 'codigo' | 'estatuto' | 'lei-especial' | 'previdenciario' | 'conteudo' | 'jurisprudencia' | 'favoritos';

// Prioridade padrão de relevância (fallback quando não há histórico de buscas)
const DEFAULT_ORDER = ['cf88', 'cp', 'cc', 'cpc', 'cpp', 'ctn', 'cdc', 'clt', 'eca', 'ctb', 'ei', 'epd'];

const getRankedTopLeis = (limit = 12) => {
  const popularIds = getPopularLeiIds();
  const order = [...popularIds, ...DEFAULT_ORDER.filter((id) => !popularIds.includes(id))];
  const byId = new Map(LEIS_CATALOG.map((l) => [l.id, l]));
  const ranked: typeof LEIS_CATALOG = [];
  for (const id of order) {
    const lei = byId.get(id);
    if (lei && !ranked.includes(lei)) ranked.push(lei);
    if (ranked.length >= limit) break;
  }
  return ranked;
};

const sortByRelevance = <T extends { id: string }>(list: T[]) => {
  const popular = getPopularLeiIds();
  const order = [...popular, ...DEFAULT_ORDER.filter((id) => !popular.includes(id))];
  return [...list].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};


const identificarLeiPorTexto = (text: string) => {
  const artMatch = text.match(/art(?:igo)?\.?\s*(\d+[-a-zA-Z]*)/i);
  const artigoNumero = artMatch ? artMatch[1] : undefined;
  const upper = text.toUpperCase();

  // Ordena por sigla mais longa primeiro para evitar match parcial (ex: CPC antes de CP)
  const catalog = [...LEIS_CATALOG].sort((a, b) => b.sigla.length - a.sigla.length);
  for (const lei of catalog) {
    const sigla = lei.sigla.toUpperCase();
    if (!sigla) continue;
    const escaped = sigla.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`);
    if (regex.test(upper)) {
      return { lei, artigoNumero };
    }
  }
  return null;
};

const SearchOverlay = ({ open, onClose, onSelectLei }: SearchOverlayProps) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('todos');
  const [ocrOpen, setOcrOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const voice = useVoiceInput((text) => setQuery((prev) => (prev ? prev + ' ' : '') + text));
  const [favVersion, setFavVersion] = useState(0);
  useEffect(() => {
    const h = () => setFavVersion((v) => v + 1);
    window.addEventListener(LEIS_FAVORITOS_EVENT, h);
    return () => window.removeEventListener(LEIS_FAVORITOS_EVENT, h);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      // Sem autofocus: evita abrir teclado do celular ao subir o sheet
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: Event) => {
      const s = (e as CustomEvent<string>).detail;
      if (typeof s === 'string') setQuery(s);
    };
    window.addEventListener('search:sugestao', handler);
    return () => window.removeEventListener('search:sugestao', handler);
  }, []);
  const isLeisMode = !['conteudo', 'jurisprudencia', 'favoritos'].includes(mode);
  const leisParaFiltrar = isLeisMode
    ? (mode === 'todos' ? LEIS_CATALOG : LEIS_CATALOG.filter(l => l.tipo === mode))
    : [];

  // Fuzzy search por nome/sigla/descrição/tags — usado tanto em "Nº da Lei"
  // quanto em "Nº do Artigo" (quando o usuário digita texto ao invés de número).
  const filteredByNumero = useFuzzySearch(leisParaFiltrar, isLeisMode ? query : '', {
    keys: ['descricao', 'sigla', 'nome', 'tags'],
    threshold: 0.35,
    limit: 40,
  });

  // Também casa por número puro/normalizado (ex.: "8078", "8.078", "8078/1990", "L8078")
  const leiNumericResults = (() => {
    if (!isLeisMode) return [] as typeof LEIS_CATALOG;
    const raw = query.trim();
    if (!raw) return [];
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.length < 3) return [];
    return leisParaFiltrar.filter((l) => {
      const desc = (l.descricao || '').replace(/[^\d]/g, '');
      return desc.includes(digits);
    });
  })();

  const leiResults = (() => {
    if (!isLeisMode || !query.trim()) return [] as typeof LEIS_CATALOG;
    const seen = new Set<string>();
    const merged: typeof LEIS_CATALOG = [];
    for (const l of [...leiNumericResults, ...filteredByNumero]) {
      if (!seen.has(l.id)) { seen.add(l.id); merged.push(l); }
    }
    return merged.slice(0, 40);
  })();


  // Modo artigo: extrai apenas o número, e o restante do texto para detectar o nome da lei
  const artigoQueryDigits = (query.match(/\d+[-a-zA-Z]*/)?.[0] || '').replace(/^[a-zA-Z]+/, '');
  const leiSearchTerm = query
    .toLowerCase()
    .replace(/\d+[-a-zA-Z]*/g, '')
    .replace(/art(?:igo)?\.?/gi, '')
    .replace(/\b(do|da|de|no|na|paragrafo|parágrafo)\b/gi, '')
    .trim();
  const baseArtigoLeis = sortByRelevance(
    LEIS_CATALOG.filter((l) => l.tipo === 'constituicao' || l.tipo === 'codigo' || l.tipo === 'estatuto')
  );
  const artigoLeis = isLeisMode && artigoQueryDigits
    ? (() => {
        if (!leiSearchTerm) return baseArtigoLeis;
        const matched = baseArtigoLeis.filter((l) =>
          l.nome.toLowerCase().includes(leiSearchTerm) ||
          l.descricao.toLowerCase().includes(leiSearchTerm) ||
          leiSearchTerm.includes(l.sigla.toLowerCase()) ||
          l.sigla.toLowerCase() === leiSearchTerm
        );
        return matched.length > 0 ? matched : baseArtigoLeis;
      })()
    : [];

  const favoritos: LeiFavorita[] = mode === 'favoritos' ? (favVersion >= 0 ? getFavoritos() : []) : [];

  const placeholder =
    voice.listening
      ? 'Ouvindo…'
      : isLeisMode
      ? 'Digite o nome ou nº da lei (ex.: CF, 8.078, art 5 CP)…'
      : mode === 'conteudo'
      ? 'Pesquise qualquer termo (ex.: princípios, dolo, boa-fé)…'
      : mode === 'jurisprudencia'
      ? 'Pesquisar na jurisprudência...'
      : 'Buscar em favoritos…';

  const emitSelect = (lei: typeof LEIS_CATALOG[number], artigoNumero?: string) => {
    bumpLeiSearch(lei.id);
    track('search_lei_selecionada', {
      lei_id: lei.id,
      lei_nome: lei.nome,
      modo: mode,
      artigo_numero: artigoNumero,
      query: query.trim().slice(0, 80),
    });
    onSelectLei({
      tipo: lei.tipo,
      leiId: lei.id,
      nome: lei.nome,
      descricao: lei.descricao,
      tabela_nome: lei.tabela_nome,
      artigoNumero,
    });
    onClose();
  };

  const openArtigoInLei = (lei: typeof LEIS_CATALOG[number]) => emitSelect(lei, artigoQueryDigits);


  return (
    <AnimatePresence>
      {open && (
        <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[49] bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed z-50 inset-0 bg-background flex flex-col lg:top-[10%] lg:bottom-auto lg:h-[80vh] lg:max-w-[800px] lg:mx-auto lg:rounded-2xl lg:shadow-2xl"
        >
          {/* Header estilizado (layout APP.PRIME) */}
          <div className="bg-gradient-to-br from-primary to-primary/80 px-4 pb-4 pt-[calc(0.5rem+var(--sai-top,env(safe-area-inset-top,0px)))] shrink-0 shadow-md">
            <div className="flex items-center justify-center pb-2">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                aria-label="Fechar busca"
                className="w-11 h-11 rounded-full bg-black/20 border border-white/20 flex items-center justify-center active:scale-95 transition shrink-0"
              >
                <ChevronDown className="w-6 h-6 text-white" />
              </button>
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                <input
                  ref={inputRef}
                  value={voice.listening && voice.partial ? voice.partial : query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full h-12 pl-11 pr-10 rounded-2xl bg-black/20 border border-white/25 text-white placeholder:text-white/50 outline-none focus:border-white/40 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={voice.toggle}
                aria-label={voice.listening ? "Parar gravação" : "Pesquisar por voz"}
                className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition ${
                  voice.listening
                    ? "bg-red-500 text-white animate-pulse shadow-red-500/40"
                    : "bg-black/20 border border-white/25 text-white hover:bg-black/30"
                }`}
              >
                {voice.listening ? <MicOff className="w-5 h-5" strokeWidth={2.4} /> : <Mic className="w-5 h-5" strokeWidth={2.4} />}
              </button>
            </div>

            {/* Menu de alternância de abas */}
            <div className="mt-4 flex items-center gap-1 p-1 rounded-full bg-black/20 border border-white/15 overflow-x-auto hide-scrollbar scroll-smooth">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'constituicao', label: 'Constituição' },
                { id: 'codigo', label: 'Códigos' },
                { id: 'estatuto', label: 'Estatutos' },
                { id: 'lei-especial', label: 'Leis Especiais' },
                { id: 'previdenciario', label: 'Previdenciário' },
                { id: 'conteudo', label: 'Conteúdo' },
                { id: 'jurisprudencia', label: 'Jurisprudência' },
                { id: 'favoritos', label: 'Favoritos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { track('search_modo_trocado', { modo: tab.id }); setMode(tab.id as SearchMode); }}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-[11px] uppercase tracking-wide font-bold transition-all ${
                    mode === tab.id
                      ? "bg-white text-black shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-2 pb-[calc(3.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] relative border-t border-border/50 pt-2">
            {isLeisMode && (() => {
              const temTextoSemNumero = !artigoQueryDigits && query.trim().length >= 1;
              const leisParaMostrar = temTextoSemNumero ? leiResults : (query.trim() === '' && mode !== 'todos' ? leisParaFiltrar : []);
              const hasLeis = leisParaMostrar.length > 0;
              const hasArtigoLeis = artigoLeis.length > 0;
              const showRecentes = query.trim() === '' && mode === 'todos';
              return (
              <div className="space-y-2">
                {showRecentes && (
                  <>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground py-2 px-3 font-semibold mt-2">
                      Leis mais procuradas
                    </p>
                    {getRankedTopLeis(12).map((lei, i) => {
                      const fav = isFavorito(lei.id);
                      return (
                      <motion.div
                        key={lei.id + ':' + favVersion}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all"
                      >
                        <button
                          onClick={() => emitSelect(lei)}
                          className="flex items-center gap-4 flex-1 min-w-0 text-left"
                        >
                          <LeiIcon lei={lei} />
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-foreground truncate">{lei.nome}</p>
                            <p className="text-sm text-muted-foreground truncate">{lei.descricao}</p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorito({ tipo: lei.tipo, leiId: lei.id, nome: lei.nome, descricao: lei.descricao, tabela_nome: lei.tabela_nome }); }}
                          aria-label={fav ? 'Remover dos favoritos' : 'Favoritar lei'}
                          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform ${fav ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                          <Heart className={`w-6 h-6 ${fav ? 'fill-current' : ''}`} />
                        </button>
                      </motion.div>
                      );
                    })}
                  </>
                )}
                {(temTextoSemNumero || (query.trim() === '' && mode !== 'todos')) && (
                  <>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground py-2 px-3 font-semibold mt-2">
                      {temTextoSemNumero ? 'Leis encontradas' : 'Leis da categoria'}
                    </p>
                    {leisParaMostrar.length === 0 && (
                      <p className="text-center text-muted-foreground text-base py-8">Nenhuma lei encontrada</p>
                    )}
                    {leisParaMostrar.map((lei) => {
                      const fav = isFavorito(lei.id);
                      return (
                      <div
                        key={lei.id + ':' + favVersion}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all"
                      >
                        <button
                          onClick={() => emitSelect(lei)}
                          className="flex items-center gap-4 flex-1 min-w-0 text-left"
                        >
                          <LeiIcon lei={lei} />
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-foreground truncate">{lei.nome}</p>
                            <p className="text-sm text-muted-foreground truncate">{lei.descricao}</p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorito({ tipo: lei.tipo, leiId: lei.id, nome: lei.nome, descricao: lei.descricao, tabela_nome: lei.tabela_nome }); }}
                          aria-label={fav ? 'Remover dos favoritos' : 'Favoritar lei'}
                          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform ${fav ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                          <Heart className={`w-6 h-6 ${fav ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      );
                    })}
                  </>
                )}
                {artigoQueryDigits && (
                  <>
                    <p className="text-sm uppercase tracking-wider text-muted-foreground py-2 px-3">
                      Artigo {artigoQueryDigits} em… (por relevância)
                    </p>
                    <AnimatePresence initial={false}>
                    {artigoLeis.map((lei, i) => (
                      <motion.button
                        key={lei.id}
                        layout
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, type: 'spring', stiffness: 260, damping: 22 }}
                        onClick={() => openArtigoInLei(lei)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                      >
                        <LeiIcon lei={lei} />
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-foreground truncate">{lei.nome}</p>
                          <p className="text-sm text-muted-foreground truncate">{lei.descricao}</p>
                        </div>
                        <div className="shrink-0 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-bold">
                          Art. {artigoQueryDigits}
                        </div>
                      </motion.button>
                    ))}
                    </AnimatePresence>
                  </>
                )}
              </div>
              );
            })()}


            {mode === 'conteudo' && (
              <ConteudoBusca query={query} onNavigate={onClose} />
            )}

            {mode === 'favoritos' && (
              <div className="space-y-2">
                {favoritos.length === 0 && (
                  <div className="text-center text-muted-foreground text-base py-10 space-y-2">
                    <Heart className="w-12 h-12 mx-auto opacity-40" />
                    <p>Nenhuma lei favorita ainda.</p>
                    <p className="text-xs">Toque no coração ao lado da lei para favoritar.</p>
                  </div>
                )}
                {favoritos
                  .filter((r) => !query || r.nome.toLowerCase().includes(query.toLowerCase()))
                  .map((lei) => {
                    const cat = LEIS_CATALOG.find((l) => l.id === lei.leiId) || {
                      id: lei.leiId, tipo: lei.tipo, nome: lei.nome, descricao: lei.descricao,
                      sigla: '', tabela_nome: lei.tabela_nome,
                    } as typeof LEIS_CATALOG[number];
                    return (
                      <div
                        key={lei.leiId + lei.favoritedAt}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                      >
                        <button
                          onClick={() => emitSelect(cat)}
                          className="flex items-center gap-4 flex-1 min-w-0 text-left"
                        >
                          <LeiIcon lei={cat} />
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-foreground truncate">{lei.nome}</p>
                            <p className="text-sm text-muted-foreground truncate">{lei.descricao}</p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorito({ tipo: cat.tipo, leiId: cat.id, nome: cat.nome, descricao: cat.descricao, tabela_nome: cat.tabela_nome }); }}
                          aria-label="Remover dos favoritos"
                          className="w-11 h-11 rounded-full flex items-center justify-center text-primary shrink-0 active:scale-90 transition-transform"
                        >
                          <Heart className="w-6 h-6 fill-current" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

          </div>

          {/* FAB flutuante: câmera OCR (Gemini) — fixado no canto inferior direito do sheet */}
          <button
            onClick={() => setOcrOpen(true)}
            aria-label="Fotografar caderno ou lei (OCR)"
            className="!absolute right-4 bottom-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/40 active:scale-95 transition-transform z-[60]"
          >
            <Camera className="w-6 h-6 relative z-[2]" />
          </button>

        </motion.div>

        <OcrScanner
          open={ocrOpen}
          onClose={() => setOcrOpen(false)}
          onArtigoSelect={(numero) => {
            setQuery(numero);
            setMode('leis');
            setOcrOpen(false);
          }}
        />
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchOverlay;
