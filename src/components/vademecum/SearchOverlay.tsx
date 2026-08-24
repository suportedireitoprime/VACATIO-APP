import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Scale, BookOpen, Clock, Camera, Mic, MicOff, X, Loader2, Heart } from 'lucide-react';
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

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onSelectLei: (lei: { tipo: string; leiId: string; nome: string; descricao: string; tabela_nome: string; artigoNumero?: string }) => void;
}

type SearchMode = 'leis' | 'conteudo' | 'favoritos';

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
  const [mode, setMode] = useState<SearchMode>('leis');
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

  // Fuzzy search por nome/sigla/descrição/tags — usado tanto em "Nº da Lei"
  // quanto em "Nº do Artigo" (quando o usuário digita texto ao invés de número).
  const filteredByNumero = useFuzzySearch(LEIS_CATALOG, mode === 'leis' ? query : '', {
    keys: ['descricao', 'sigla', 'nome', 'tags'],
    threshold: 0.35,
    limit: 40,
  });

  // Também casa por número puro/normalizado (ex.: "8078", "8.078", "8078/1990", "L8078")
  const leiNumericResults = (() => {
    if (mode !== 'leis') return [] as typeof LEIS_CATALOG;
    const raw = query.trim();
    if (!raw) return [];
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.length < 3) return [];
    return LEIS_CATALOG.filter((l) => {
      const desc = (l.descricao || '').replace(/[^\d]/g, '');
      return desc.includes(digits);
    });
  })();

  const leiResults = (() => {
    if (mode !== 'leis' || !query.trim()) return [] as typeof LEIS_CATALOG;
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
  const artigoLeis = mode === 'leis' && artigoQueryDigits
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
      : mode === 'leis'
      ? 'Digite o nome ou nº da lei (ex.: CF, 8.078, art 5 CP)…'
      : mode === 'conteudo'
      ? 'Pesquise qualquer termo (ex.: princípios, dolo, boa-fé)…'
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
          className="fixed z-50 inset-x-0 bottom-0 top-[10vh] bg-background flex flex-col rounded-t-3xl lg:top-[10%] lg:max-w-[800px] lg:mx-auto lg:rounded-t-2xl lg:shadow-2xl"
        >
          {/* Header: back + título */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0"
              aria-label="Fechar"
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </button>
            <div className="flex-1 text-center">
              <h2 className="font-display text-lg font-semibold text-foreground tracking-wide">Pesquise leis e artigos</h2>
            </div>
            <div className="w-12 shrink-0" />
          </div>

          {/* Mode toggle: Nº do Artigo | Nº da Lei | Recentes */}
          <div className="flex gap-2 px-4 py-3">
            <button
              onClick={() => { track('search_modo_trocado', { modo: 'leis' }); setMode('leis'); }}
              data-track="search_modo_trocado"
              data-modo="leis"
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'leis' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Scale className="w-5 h-5" />
              <span className="whitespace-nowrap">Leis</span>
            </button>
            <button
              onClick={() => { track('search_modo_trocado', { modo: 'conteudo' }); setMode('conteudo'); }}
              data-track="search_modo_trocado"
              data-modo="conteudo"
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'conteudo' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="whitespace-nowrap">Conteúdo</span>
            </button>
            <button
              onClick={() => { track('search_modo_trocado', { modo: 'favoritos' }); setMode('favoritos'); }}
              data-track="search_modo_trocado"
              data-modo="favoritos"
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                mode === 'favoritos' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Heart className={`w-5 h-5 ${mode === 'favoritos' ? 'fill-current' : ''}`} />
              <span className="whitespace-nowrap">Favoritos</span>
            </button>
          </div>


          {/* Barra de pesquisa — sempre visível nos três modos */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={voice.listening && voice.partial ? voice.partial : query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                inputMode="text"
                className="pl-11 pr-4 h-14 bg-muted border-none text-base rounded-xl"
              />
            </div>
            <button
              onClick={voice.toggle}
              aria-label={voice.listening ? 'Parar' : 'Buscar por voz'}
              className={`btn-attention-shine w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all shadow-lg ${
                voice.listening
                  ? 'bg-red-500 text-white animate-pulse shadow-red-500/40'
                  : 'bg-primary text-primary-foreground shadow-primary/30'
              }`}
            >
              {voice.listening ? <MicOff className="w-6 h-6 relative z-[2]" /> : <Mic className="w-6 h-6 relative z-[2]" />}
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-2 pb-6 relative">
            {mode === 'leis' && (() => {
              const temTextoSemNumero = !artigoQueryDigits && query.trim().length >= 1;
              const leisPorTexto = temTextoSemNumero ? filteredByNumero.slice(0, 40) : [];
              return (
              <div className="space-y-2">
                {!artigoQueryDigits && !temTextoSemNumero && (
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
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{lei.sigla}</span>
                          </div>
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
                {temTextoSemNumero && (
                  <>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground py-2 px-3 font-semibold mt-2">
                      Leis encontradas
                    </p>
                    {leisPorTexto.length === 0 && (
                      <p className="text-center text-muted-foreground text-base py-8">Nenhuma lei encontrada</p>
                    )}
                    {leisPorTexto.map((lei) => {
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
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{lei.sigla}</span>
                          </div>
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
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{lei.sigla}</span>
                        </div>
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
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{cat.sigla || 'LEI'}</span>
                          </div>
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
