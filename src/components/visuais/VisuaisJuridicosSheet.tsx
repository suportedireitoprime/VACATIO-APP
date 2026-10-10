import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight, Clock, GitBranch, Layers, Loader2, Mic, Network, Search, Sparkles, Star, X, Brain,
  BookOpen, Scale, Gavel,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { isAdminEmail } from '@/lib/adminEmails';
import { toast } from 'sonner';
import PremiumGate from '@/components/PremiumGate';
import VisualViewer from './VisualViewer';
import { CATEGORIA_INFO, itensDaCategoria, type CatalogoItem } from '@/lib/visuaisJuridicos/catalogo';
import { TIPO_INFO, type VisualCategoria, type VisualRecord, type VisualTipo } from '@/lib/visuaisJuridicos/types';
import { prefetchVisuais, registrarVisual, visuaisEmCache } from '@/lib/visuaisJuridicos/cache';
import { fetchArtigosLei, getCachedArtigos } from '@/services/legislacaoService';
import type { ArtigoLei } from '@/data/mockData';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { iconeDoItem } from '@/lib/visuaisJuridicos/icones';
import {
  fetchAreasResumos,
  fetchTemasResumos,
  fetchSubtemasResumos,
  slugTema,
  type TemaResumo,
  type SubtemaResumo,
} from '@/lib/visuaisJuridicos/materias';
import { listarFavoritos, listarRecentes, registrarRecente, toggleFavorito } from '@/lib/visuaisJuridicos/prefs';
import { useDictation } from '@/hooks/useDictation';




const TIPO_ICON: Record<VisualTipo, typeof Brain> = {
  mapa_mental: Brain,
  infografico: Layers,
  fluxograma: GitBranch,
  diagrama: Network,
};

const TIPO_COR: Record<VisualTipo, string> = {
  mapa_mental: '#ef4444',
  infografico: '#f59e0b',
  fluxograma: '#22c55e',
  diagrama: '#8b5cf6',
};

const CATEGORIA_ICON: Record<VisualCategoria, typeof Brain> = {
  materias: BookOpen,
  leis: Scale,
  jurisprudencia: Gavel,
};

const CATEGORIA_COR: Record<VisualCategoria, string> = {
  materias: '#38bdf8',
  leis: '#e11d48',
  jurisprudencia: '#a78bfa',
};

const ITEM_CORES = ['#e11d48', '#38bdf8', '#f59e0b', '#22c55e', '#a78bfa', '#ec4899', '#14b8a6', '#f97316'];

const TIPOS: VisualTipo[] = ['mapa_mental', 'infografico', 'fluxograma', 'diagrama'];
const CATEGORIAS: VisualCategoria[] = ['materias', 'leis', 'jurisprudencia'];

const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

type Filtro = 'todos' | 'favoritos' | 'recentes';
const FILTROS: { id: Filtro; label: string; Icone: typeof Layers }[] = [
  { id: 'todos', label: 'Todos', Icone: Layers },
  { id: 'favoritos', label: 'Favoritos', Icone: Star },
  { id: 'recentes', label: 'Recentes', Icone: Clock },
];

/** Cabeçalhos estruturais (PARTE GERAL, TÍTULO, CAPÍTULO…) não são artigos. */
const RE_ESTRUTURA = /^(parte|livro|t[ií]tulo|cap[ií]tulo|se[çc][ãa]o|subse[çc][ãa]o|disposi)/i;
function isArtigoReal(a: ArtigoLei) {
  const num = String(a.numero ?? '').trim();
  if (!num) return false;
  if (RE_ESTRUTURA.test(num)) return false;
  return /\d/.test(num);
}

/** Barra de pesquisa igual à do buscador do app (input alto + microfone redondo). */
function BarraBusca({
  valor,
  onChange,
  placeholder,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const { state, start, stop } = useDictation((chunk) => onChange(`${valor} ${chunk}`.trim().slice(0, 60)));
  const ouvindo = state === 'recording';
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={valor}
          onChange={(e) => onChange(e.target.value.slice(0, 60))}
          placeholder={placeholder}
          className="h-14 w-full rounded-xl border-none bg-muted pl-11 pr-10 font-body text-base text-foreground placeholder:text-muted-foreground outline-none"
        />
        {!!valor && (
          <button
            onClick={() => onChange('')}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        onClick={() => (ouvindo ? stop() : start())}
        aria-label={ouvindo ? 'Parar ditado' : 'Pesquisar por voz'}
        className={`btn-attention-shine flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-lg transition-all ${
          ouvindo ? 'bg-red-500 text-white animate-pulse shadow-red-500/40' : 'bg-primary text-primary-foreground shadow-primary/30'
        }`}
      >
        <Mic className="w-6 h-6 relative z-[2]" />
      </button>
    </div>
  );
}

/** Abas Todos / Favoritos / Recentes — mesmo padrão do buscador do app. */
function AbasFiltro({ valor, onChange }: { valor: Filtro; onChange: (f: Filtro) => void }) {
  return (
    <div className="flex gap-2">
      {FILTROS.map(({ id, label, Icone }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all ${
            valor === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          <Icone className={`w-5 h-5 ${id === 'favoritos' && valor === id ? 'fill-current' : ''}`} />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );
}


/** Estrela de favorito posicionada no canto da linha. */
function EstrelaFavorito({ ativo, onToggle }: { ativo: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={ativo ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full"
    >
      <Star className={`w-4 h-4 ${ativo ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/60'}`} />
    </button>
  );
}


interface Props {
  open: boolean;
  onClose: () => void;
  /** Quando definido, o componente abre direto neste formato, em tela cheia (rota própria). */
  tipoInicial?: VisualTipo;
  /** 'sheet' = folha de baixo pra cima (escolha do formato). 'page' = tela cheia dedicada. */
  modo?: 'sheet' | 'page';
  /** Chamado ao escolher um formato no passo 1 (usado para navegar para a rota do formato). */
  onEscolherTipo?: (tipo: VisualTipo) => void;
  /** Espelha a navegação interna na URL (ex.: ['materias','direito-civil','lindb']). */
  onRotaChange?: (segmentos: string[]) => void;
}

export default function VisuaisJuridicosSheet({ open, onClose, tipoInicial, modo = 'sheet', onEscolherTipo, onRotaChange }: Props) {
  const emPagina = modo === 'page';
  useBodyScrollLock(open && !emPagina);
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const podeGerar = isPremium || isAdminEmail(user?.email);

  const [tipo, setTipo] = useState<VisualTipo | null>(tipoInicial ?? null);
  const [categoria, setCategoria] = useState<VisualCategoria | null>(null);
  const [item, setItem] = useState<CatalogoItem | null>(null);
  const [artigo, setArtigo] = useState('');
  const [artigos, setArtigos] = useState<ArtigoLei[]>([]);
  const [carregandoArtigos, setCarregandoArtigos] = useState(false);
  const [buscaArtigo, setBuscaArtigo] = useState('');
  const [gerandoKey, setGerandoKey] = useState<string | null>(null);
  const [areas, setAreas] = useState<CatalogoItem[]>([]);
  const [carregandoMaterias, setCarregandoMaterias] = useState(false);
  const [temas, setTemas] = useState<TemaResumo[]>([]);
  const [carregandoTemas, setCarregandoTemas] = useState(false);
  const [tema, setTema] = useState<TemaResumo | null>(null);
  const [subtemas, setSubtemas] = useState<SubtemaResumo[]>([]);
  const [carregandoSubtemas, setCarregandoSubtemas] = useState(false);

  const [busca, setBusca] = useState('');
  const [prontos, setProntos] = useState<Record<string, VisualRecord>>({});
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [aberto, setAberto] = useState<VisualRecord | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [favoritos, setFavoritos] = useState<string[]>(() => listarFavoritos());
  const [recentes, setRecentes] = useState<string[]>(() => listarRecentes());

  const alternarFavorito = useCallback((key: string) => {
    toggleFavorito(key);
    setFavoritos(listarFavoritos());
  }, []);

  const marcarRecente = useCallback((key: string) => {
    registrarRecente(key);
    setRecentes(listarRecentes());
  }, []);

  /** Aplica a aba ativa sobre uma lista já filtrada por texto. */
  const aplicarFiltro = useCallback(
    <T,>(itens: T[], chave: (i: T) => string) => {
      if (filtro === 'favoritos') return itens.filter((i) => favoritos.includes(chave(i)));
      if (filtro === 'recentes') {
        const ordem = new Map(recentes.map((k, i) => [k, i]));
        return itens.filter((i) => ordem.has(chave(i))).sort((a, b) => ordem.get(chave(a))! - ordem.get(chave(b))!);
      }
      return itens;
    },
    [filtro, favoritos, recentes],
  );

  const passo = !tipo ? 1 : !categoria ? 2 : !item ? 3 : 4;


  const reset = useCallback(() => {
    setTipo(tipoInicial ?? null);
    setCategoria(null);
    setItem(null);
    setArtigo('');
    setBusca('');
    setArtigos([]);
    setBuscaArtigo('');
    setTemas([]);
    setTema(null);
    setSubtemas([]);
    setFiltro('todos');
  }, [tipoInicial]);

  // Espelha o passo atual na URL (…/visuais/mapa-mental/materias/direito-civil/lindb).
  useEffect(() => {
    if (!open || !onRotaChange) return;
    const segs: string[] = [];
    if (categoria) segs.push(categoria);
    if (item) segs.push(slugTema(item.label));
    if (tema) segs.push(slugTema(tema.tema));
    onRotaChange(segs);
  }, [open, categoria, item, tema, onRotaChange]);


  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Usa o cache já pré-carregado no início do app — abre instantâneo, sem delay.
  useEffect(() => {
    if (!open || !tipo || !categoria) return;
    let cancelado = false;
    const aplicar = (rows: VisualRecord[]) => {
      if (cancelado) return;
      const map: Record<string, VisualRecord> = {};
      rows.filter((r) => r.tipo === tipo && r.categoria === categoria)
        .forEach((r) => { map[r.item_key] = r; });
      setProntos(map);
      setCarregando(false);
    };
    const cache = visuaisEmCache();
    if (cache) {
      aplicar(cache);
    } else {
      setCarregando(true);
      prefetchVisuais().then(aplicar).catch(() => !cancelado && setCarregando(false));
    }
    return () => { cancelado = true; };
  }, [open, tipo, categoria]);


  const chaveDe = useCallback((base: CatalogoItem, sub?: string, kind: 'artigo' | 'tema' = 'artigo') => {
    const a = (sub || '').trim().replace(/^art\.?\s*/i, '');
    if (!a) return base.key;
    return `${base.key}#${kind === 'tema' ? 'tema' : 'art'}-${norm(a).replace(/[^a-z0-9]+/g, '-')}`;
  }, []);

  const itemKey = useMemo(() => (item ? chaveDe(item, artigo) : ''), [item, artigo, chaveDe]);

  // Matérias reaproveitam a tabela de resumos jurídicos.
  useEffect(() => {
    if (!open || categoria !== 'materias') return;
    let cancelado = false;
    setCarregandoMaterias(true);
    fetchAreasResumos()
      .then((rows) => { if (!cancelado) setAreas(rows); })
      .catch(() => { if (!cancelado) setAreas([]); })
      .finally(() => { if (!cancelado) setCarregandoMaterias(false); });
    return () => { cancelado = true; };
  }, [open, categoria]);

  // Tópicos da matéria escolhida.
  useEffect(() => {
    if (categoria !== 'materias' || !item) { setTemas([]); return; }
    let cancelado = false;
    setCarregandoTemas(true);
    fetchTemasResumos(item.label)
      .then((rows) => { if (!cancelado) setTemas(rows); })
      .catch(() => { if (!cancelado) setTemas([]); })
      .finally(() => { if (!cancelado) setCarregandoTemas(false); });
    return () => { cancelado = true; };
  }, [categoria, item]);

  // Subtemas do tópico escolhido.
  useEffect(() => {
    if (categoria !== 'materias' || !item || !tema) { setSubtemas([]); return; }
    let cancelado = false;
    setCarregandoSubtemas(true);
    fetchSubtemasResumos(item.label, tema.tema)
      .then((rows) => { if (!cancelado) setSubtemas(rows); })
      .catch(() => { if (!cancelado) setSubtemas([]); })
      .finally(() => { if (!cancelado) setCarregandoSubtemas(false); });
    return () => { cancelado = true; };
  }, [categoria, item, tema]);

  const temasFiltrados = useMemo(() => {
    const q = norm(buscaArtigo.trim());
    const base = q ? temas.filter((t) => norm(t.tema).includes(q)) : temas;
    return aplicarFiltro(base, (t) => chaveDe(item!, t.tema, 'tema'));
  }, [temas, buscaArtigo, aplicarFiltro, chaveDe, item]);

  const subtemasFiltrados = useMemo(() => {
    const q = norm(buscaArtigo.trim());
    const base = q ? subtemas.filter((s) => norm(s.subtema).includes(q)) : subtemas;
    return aplicarFiltro(base, (s) => chaveDe(item!, `${tema?.tema ?? ''} ${s.subtema}`, 'tema'));
  }, [subtemas, buscaArtigo, aplicarFiltro, chaveDe, item, tema]);


  // Carrega os artigos da lei escolhida — reaproveita a tabela do Vade Mecum.
  useEffect(() => {
    if (categoria !== 'leis' || !item?.tabela) { setArtigos([]); return; }
    let cancelado = false;
    const cache = getCachedArtigos(item.tabela);
    if (cache?.length) { setArtigos(cache); setCarregandoArtigos(false); return; }
    setCarregandoArtigos(true);
    fetchArtigosLei(item.leiId || item.key, item.tabela)
      .then((rows) => { if (!cancelado) setArtigos(rows || []); })
      .catch(() => { if (!cancelado) setArtigos([]); })
      .finally(() => { if (!cancelado) setCarregandoArtigos(false); });
    return () => { cancelado = true; };
  }, [categoria, item]);

  const artigosFiltrados = useMemo(() => {
    // Só artigos de verdade — sem "Parte Geral", "Título", "Capítulo" etc.
    const reais = artigos.filter(isArtigoReal);
    const q = norm(buscaArtigo.trim());
    const base = q ? reais.filter((a) => norm(`art ${a.numero} ${a.caput}`).includes(q)) : reais;
    return aplicarFiltro(base, (a) => chaveDe(item!, a.numero));
  }, [artigos, buscaArtigo, aplicarFiltro, chaveDe, item]);

  const lista = useMemo(() => {
    if (!categoria) return [];
    const todos = categoria === 'materias' ? areas : itensDaCategoria(categoria);
    const q = norm(busca.trim());
    const filtrados = q ? todos.filter((i) => norm(`${i.label} ${i.sub ?? ''}`).includes(q)) : todos;
    const porAba = aplicarFiltro(filtrados, (i) => i.key);
    if (filtro === 'recentes') return porAba;
    // Já gerados aparecem primeiro.
    return [...porAba].sort((a, b) => Number(Boolean(prontos[b.key])) - Number(Boolean(prontos[a.key])));
  }, [categoria, areas, busca, prontos, aplicarFiltro, filtro]);


  const registroAtual = itemKey ? prontos[itemKey] : undefined;

  const gerar = async (alvo?: CatalogoItem, sub?: string, kind: 'artigo' | 'tema' = 'artigo', temaPai?: string) => {
    const base = alvo || item;
    if (!tipo || !categoria || !base) return;
    if (!podeGerar) { setGateOpen(true); return; }
    const valor = (sub ?? (alvo ? '' : artigo)).trim();
    const chave = chaveDe(base, temaPai ? `${temaPai} ${valor}` : valor, kind);
    const pronto = prontos[chave];
    if (pronto) { marcarRecente(chave); setAberto(pronto); return; }

    setGerando(true);
    setGerandoKey(chave);
    try {
      const rotulo = valor
        ? kind === 'tema'
          ? `${base.label} — ${temaPai ? `${temaPai} · ${valor}` : valor}`
          : `${base.label} — Art. ${valor.replace(/^art\.?\s*/i, '')}`
        : base.label;
      const contexto = valor
        ? kind === 'tema'
          ? temaPai
            ? `${base.contexto} Foque exclusivamente no subtópico "${valor}", dentro do tópico "${temaPai}" desta matéria.`
            : `${base.contexto} Foque exclusivamente no tópico "${valor}" desta matéria.`
          : `${base.contexto} Foque exclusivamente no artigo ${valor}.`
        : base.contexto;
      const { data, error } = await supabase.functions.invoke('visual-juridico-gerar', {
        body: { tipo, categoria, item_key: chave, item_label: rotulo, contexto },
      });
      if (error) throw error;
      const registro = (data as any)?.visual as VisualRecord | undefined;
      if (!registro) throw new Error('resposta vazia');
      registrarVisual(registro);
      setProntos((p) => ({ ...p, [registro.item_key]: registro }));
      marcarRecente(registro.item_key);
      setAberto(registro);

    } catch (e: any) {
      const msg = String(e?.message || '');
      toast.error(msg.includes('429') ? 'Muitas gerações agora. Tente em alguns minutos.' : 'Não foi possível gerar o visual agora.');
    } finally {
      setGerando(false);
      setGerandoKey(null);
    }
  };

  const voltar = () => {
    if (tema) { setTema(null); setBuscaArtigo(''); }
    else if (item) { setItem(null); setBuscaArtigo(''); }
    else if (categoria) { setCategoria(null); setBusca(''); }
    else if (tipo && !tipoInicial) setTipo(null);
    else onClose();
  };


  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {!emPagina && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[60] bg-black/60"
              />
            )}
            <motion.div
              initial={emPagina ? { opacity: 0 } : { y: '100%' }}
              animate={emPagina ? { opacity: 1 } : { y: 0 }}
              exit={emPagina ? { opacity: 0 } : { y: '100%' }}
              transition={emPagina ? { duration: 0.2 } : { type: 'spring', damping: 30, stiffness: 300 }}
              className={
                emPagina
                  ? 'fixed inset-0 z-[61] flex h-[100dvh] flex-col overflow-hidden bg-background'
                  : `fixed inset-x-0 bottom-0 z-[61] flex flex-col overflow-hidden bg-background shadow-2xl ${
                      tipo ? 'top-0 h-[100dvh] rounded-none' : 'max-h-[90dvh] rounded-t-3xl'
                    }`
              }
            >

              {emPagina ? (
                <PageHeader
                  title={
                    passo === 2
                      ? TIPO_INFO[tipo!].label
                      : passo === 3
                        ? CATEGORIA_INFO[categoria!].label
                        : tema
                          ? tema.tema
                          : item!.label
                  }
                  subtitle={
                    passo === 2
                      ? 'De onde vem o conteúdo?'
                      : passo === 3
                        ? 'Escolha o tema — o que já está gerado abre na hora'
                        : categoria === 'materias'
                          ? tema
                            ? `Subtemas de ${tema.tema} — escolha um para gerar`
                            : 'Escolha o tópico para ver os subtemas'
                          : 'Escolha o artigo'
                  }


                  onBack={voltar}
                />
              ) : (
                <>
                  <div className="flex items-center justify-center pt-2 pb-1">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-5 pb-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-bold uppercase tracking-[0.04em] leading-none text-foreground truncate">
                        Visuais jurídicos
                      </h3>
                      <p className="mt-1 font-body text-[12px] leading-tight text-muted-foreground truncate">
                        Escolha o formato que combina com o seu estudo
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      aria-label="Fechar"
                      className="w-11 h-11 shrink-0 rounded-full bg-secondary/70 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <X className="w-6 h-6 text-foreground" strokeWidth={2.2} />
                    </button>
                  </div>
                </>
              )}

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 lg:mx-auto lg:w-full lg:max-w-[900px] lg:px-8">
                {/* 1 — tipo */}
                {passo === 1 && (
                  <div className="space-y-2">
                    {TIPOS.map((t, i) => {
                      const Icon = TIPO_ICON[t];
                      return (
                        <motion.button
                          key={t}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.025, 0.25), duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                          onClick={() => (onEscolherTipo ? onEscolherTipo(t) : setTipo(t))}
                          className="w-full flex items-center gap-4 px-4 h-[84px] rounded-2xl bg-secondary/40 border border-border/50 active:scale-[0.99] transition"
                        >
                          <div className="relative overflow-hidden rounded-xl shrink-0">
                            <Icon
                              className="w-8 h-8 relative"
                              style={{
                                color: TIPO_COR[t],
                                filter: 'saturate(1.5) brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                              }}
                              strokeWidth={1.3}
                            />
                            <span aria-hidden className="pointer-events-none absolute inset-0 icon-shine" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-display text-foreground text-[16px] font-bold leading-tight line-clamp-1 uppercase tracking-[0.08em]">
                              {TIPO_INFO[t].label}
                            </p>
                            <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-2">
                              {TIPO_INFO[t].desc}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* 2 — categoria */}
                {passo === 2 && (
                  <div className="space-y-2">
                    {CATEGORIAS.map((c, i) => {
                      const Icon = CATEGORIA_ICON[c];
                      return (
                        <motion.button
                          key={c}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.025, 0.25), duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                          onClick={() => setCategoria(c)}
                          className="w-full flex items-center gap-4 px-4 h-[84px] rounded-2xl bg-secondary/40 border border-border/50 active:scale-[0.99] transition"
                        >
                          <div className="relative overflow-hidden rounded-xl shrink-0">
                            <Icon
                              className="w-8 h-8 relative"
                              style={{
                                color: CATEGORIA_COR[c],
                                filter: 'saturate(1.5) brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                              }}
                              strokeWidth={1.3}
                            />
                            <span aria-hidden className="pointer-events-none absolute inset-0 icon-shine" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-display text-foreground text-[16px] font-bold leading-tight line-clamp-1 uppercase tracking-[0.08em]">
                              {CATEGORIA_INFO[c].label}
                            </p>
                            <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-2">
                              {CATEGORIA_INFO[c].desc}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* 3 — item */}
                {passo === 3 && (
                  <div className="space-y-2">
                    <div className="sticky top-0 z-10 -mx-1 space-y-4 bg-background px-1 pb-3 pt-0.5">
                      <AbasFiltro valor={filtro} onChange={setFiltro} />
                      <BarraBusca valor={busca} onChange={setBusca} placeholder="Pesquisar nesta área" />
                    </div>


                    {(carregando || carregandoMaterias) && (
                      <p className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{' '}
                        {carregandoMaterias ? 'Carregando matérias…' : 'Verificando o que já está pronto…'}
                      </p>
                    )}

                    {lista.map((i, idx) => {
                      const Icon = iconeDoItem(i.key, i.label, i.sub);
                      const cor = ITEM_CORES[idx % ITEM_CORES.length];
                      const favorito = favoritos.includes(i.key);
                      return (
                        <motion.div
                          key={i.key}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.02, 0.2), duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                          className="relative"
                        >
                          <button
                            disabled={gerando}
                            onClick={() => {
                              setArtigo('');
                              setBuscaArtigo('');
                              setFiltro('todos');
                              if (categoria === 'leis' || categoria === 'materias') setItem(i);
                              else gerar(i);
                            }}
                            className="w-full flex items-center gap-4 px-4 h-[84px] rounded-2xl bg-secondary/40 border border-border/50 active:scale-[0.99] transition"
                          >
                            <div className="relative overflow-hidden rounded-xl shrink-0">
                              <Icon
                                className="w-8 h-8 relative"
                                style={{
                                  color: cor,
                                  filter: 'saturate(1.5) brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
                                }}
                                strokeWidth={1.3}
                              />
                              <span aria-hidden className="pointer-events-none absolute inset-0 icon-shine" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="font-display text-foreground text-[16px] font-bold leading-tight line-clamp-1 uppercase tracking-[0.08em]">
                                {i.label}
                              </p>
                              {i.sub && (
                                <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-1">
                                  {i.sub}
                                </p>
                              )}
                              {favorito && (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-wider text-amber-500">
                                  <Star className="h-2.5 w-2.5 fill-amber-500" /> Favorito
                                </span>
                              )}
                            </div>

                            <span className="mr-7 shrink-0">
                              {gerandoKey === i.key ? (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              ) : prontos[i.key] ? (
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-primary">
                                  PRONTO
                                </span>
                              ) : categoria === 'jurisprudencia' ? (
                                <Sparkles className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                            </span>
                          </button>
                          <EstrelaFavorito ativo={favorito} onToggle={() => alternarFavorito(i.key)} />
                        </motion.div>
                      );
                    })}
                    {!lista.length && !carregando && !carregandoMaterias && (
                      <p className="py-8 text-center font-body text-sm text-muted-foreground">
                        {filtro === 'favoritos'
                          ? 'Nenhum favorito por aqui ainda.'
                          : filtro === 'recentes'
                            ? 'Você ainda não abriu nenhum visual nesta área.'
                            : 'Nenhum tema encontrado.'}
                      </p>
                    )}

                  </div>
                )}

                {/* 4 — tópicos da matéria (resumos) ou artigos da lei */}
                {passo === 4 && (
                  <div className="space-y-2">
                    <div className="sticky top-0 z-10 -mx-1 space-y-4 bg-background px-1 pb-3 pt-0.5">
                      <AbasFiltro valor={filtro} onChange={setFiltro} />
                      <BarraBusca
                        valor={buscaArtigo}
                        onChange={setBuscaArtigo}
                        placeholder={
                          categoria === 'materias'
                            ? tema
                              ? 'Pesquisar subtema'
                              : 'Pesquisar tópico'
                            : 'Pesquisar artigo (ex.: 121)'
                        }
                      />
                    </div>



                    {categoria === 'materias' && !tema && (
                      <>
                        {carregandoTemas && (
                          <p className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando tópicos…
                          </p>
                        )}

                        {temasFiltrados.map((t, idx) => {
                          const chave = chaveDe(item!, t.tema, 'tema');
                          const pronto = prontos[chave];
                          const cor = ITEM_CORES[idx % ITEM_CORES.length];
                          const favorito = favoritos.includes(chave);
                          const Icon = iconeDoItem(`materia:${t.tema}`, t.tema);
                          return (
                            <div key={t.tema} className="relative">
                              <button
                                onClick={() => { setTema(t); setBuscaArtigo(''); setFiltro('todos'); }}
                                disabled={gerando}
                                className="w-full flex items-center gap-4 px-4 h-[84px] rounded-2xl bg-secondary/40 border border-border/50 active:scale-[0.99] transition disabled:opacity-70"
                              >
                                <div className="relative overflow-hidden rounded-xl shrink-0">
                                  <Icon
                                    className="w-8 h-8 relative"
                                    style={{ color: cor, filter: 'saturate(1.5) brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
                                    strokeWidth={1.3}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-display text-foreground text-[16px] font-bold leading-tight line-clamp-1 uppercase tracking-[0.08em]">
                                    {t.tema}
                                  </p>
                                  <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-1">
                                    {t.total} {t.total === 1 ? 'subtema' : 'subtemas'}
                                  </p>
                                  {favorito && (
                                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-wider text-amber-500">
                                      <Star className="h-2.5 w-2.5 fill-amber-500" /> Favorito
                                    </span>
                                  )}
                                </div>
                                <span className="mr-7 shrink-0">
                                  {pronto ? (
                                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-primary">PRONTO</span>
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </span>
                              </button>
                              <EstrelaFavorito ativo={favorito} onToggle={() => alternarFavorito(chave)} />
                            </div>
                          );
                        })}

                        {!carregandoTemas && !temasFiltrados.length && (
                          <p className="py-8 text-center font-body text-sm text-muted-foreground">
                            {filtro === 'favoritos'
                              ? 'Nenhum tópico favoritado ainda.'
                              : filtro === 'recentes'
                                ? 'Nenhum tópico aberto recentemente.'
                                : 'Nenhum tópico encontrado.'}
                          </p>
                        )}
                      </>
                    )}

                    {categoria === 'materias' && tema && (
                      <>
                        {carregandoSubtemas && (
                          <p className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando subtemas…
                          </p>
                        )}

                        {subtemasFiltrados.map((s, idx) => {
                          const chave = chaveDe(item!, `${tema.tema} ${s.subtema}`, 'tema');
                          const pronto = prontos[chave];
                          const carregandoEste = gerandoKey === chave;
                          const cor = ITEM_CORES[idx % ITEM_CORES.length];
                          const favorito = favoritos.includes(chave);
                          const Icon = iconeDoItem(`materia:${s.subtema}`, s.subtema);
                          return (
                            <div key={s.subtema} className="relative">
                              <button
                                onClick={() => gerar(item!, s.subtema, 'tema', tema.tema)}
                                disabled={gerando}
                                className="w-full flex items-center gap-4 px-4 h-[84px] rounded-2xl bg-secondary/40 border border-border/50 active:scale-[0.99] transition disabled:opacity-70"
                              >
                                <div className="relative overflow-hidden rounded-xl shrink-0">
                                  <Icon
                                    className="w-8 h-8 relative"
                                    style={{ color: cor, filter: 'saturate(1.5) brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
                                    strokeWidth={1.3}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-display text-foreground text-[16px] font-bold leading-tight line-clamp-1 uppercase tracking-[0.08em]">
                                    {s.subtema}
                                  </p>
                                  <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-1">
                                    {tema.tema}
                                  </p>
                                  {favorito && (
                                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-wider text-amber-500">
                                      <Star className="h-2.5 w-2.5 fill-amber-500" /> Favorito
                                    </span>
                                  )}
                                </div>
                                <span className="mr-7 shrink-0">
                                  {carregandoEste ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                  ) : pronto ? (
                                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-primary">PRONTO</span>
                                  ) : (
                                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </span>
                              </button>
                              <EstrelaFavorito ativo={favorito} onToggle={() => alternarFavorito(chave)} />
                            </div>
                          );
                        })}

                        {!carregandoSubtemas && !subtemasFiltrados.length && filtro === 'todos' && (() => {
                          const chave = chaveDe(item!, tema.tema, 'tema');
                          const pronto = prontos[chave];
                          const carregandoEste = gerandoKey === chave;
                          const favorito = favoritos.includes(chave);
                          const Icon = iconeDoItem(`materia:${tema.tema}`, tema.tema);
                          return (
                            <div className="relative">
                              <button
                                onClick={() => gerar(item!, tema.tema, 'tema')}
                                disabled={gerando}
                                className="w-full flex items-center gap-4 px-4 h-[84px] rounded-2xl bg-secondary/40 border border-border/50 active:scale-[0.99] transition disabled:opacity-70"
                              >
                                <div className="relative overflow-hidden rounded-xl shrink-0">
                                  <Icon
                                    className="w-8 h-8 relative"
                                    style={{ color: CATEGORIA_COR.materias, filter: 'saturate(1.5) brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
                                    strokeWidth={1.3}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-display text-foreground text-[16px] font-bold leading-tight line-clamp-1 uppercase tracking-[0.08em]">
                                    {tema.tema}
                                  </p>
                                  <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-1">
                                    Este tópico não tem subtemas — gerar direto
                                  </p>
                                </div>
                                <span className="mr-7 shrink-0">
                                  {carregandoEste ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                  ) : pronto ? (
                                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-primary">PRONTO</span>
                                  ) : (
                                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </span>
                              </button>
                              <EstrelaFavorito ativo={favorito} onToggle={() => alternarFavorito(chave)} />
                            </div>
                          );
                        })()}

                        {!carregandoSubtemas && !subtemasFiltrados.length && filtro !== 'todos' && (
                          <p className="py-8 text-center font-body text-sm text-muted-foreground">
                            {filtro === 'favoritos' ? 'Nenhum subtema favoritado ainda.' : 'Nenhum subtema aberto recentemente.'}
                          </p>
                        )}
                      </>
                    )}


                    {categoria === 'leis' && (
                      <>
                        {carregandoArtigos && (
                          <p className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando artigos…
                          </p>
                        )}

                        {artigosFiltrados.slice(0, 400).map((a, idx) => {
                          const chave = chaveDe(item!, a.numero);
                          const pronto = prontos[chave];
                          const carregandoEste = gerandoKey === chave;
                          const cor = ITEM_CORES[idx % ITEM_CORES.length];
                          const favorito = favoritos.includes(chave);
                          return (
                            <div key={a.id || a.numero} className="relative">
                              <button
                                onClick={() => gerar(item!, a.numero)}
                                disabled={gerando}
                                className="w-full flex items-center gap-4 px-4 h-[84px] rounded-2xl bg-secondary/40 border border-border/50 active:scale-[0.99] transition disabled:opacity-70"
                              >
                                <div className="relative overflow-hidden rounded-xl shrink-0">
                                  <BookOpen
                                    className="w-8 h-8 relative"
                                    style={{ color: cor, filter: 'saturate(1.5) brightness(1.2) drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
                                    strokeWidth={1.3}
                                  />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-display text-foreground text-[16px] font-bold leading-tight line-clamp-1 uppercase tracking-[0.08em]">
                                    Art. {a.numero}
                                  </p>
                                  <p className="font-body text-muted-foreground text-[12.5px] leading-snug mt-1 line-clamp-1">
                                    {a.caput}
                                  </p>
                                  {favorito && (
                                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-wider text-amber-500">
                                      <Star className="h-2.5 w-2.5 fill-amber-500" /> Favorito
                                    </span>
                                  )}
                                </div>
                                <span className="mr-7 shrink-0">
                                  {carregandoEste ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                  ) : pronto ? (
                                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-display text-[10px] font-bold tracking-wider text-primary">PRONTO</span>
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </span>
                              </button>
                              <EstrelaFavorito ativo={favorito} onToggle={() => alternarFavorito(chave)} />
                            </div>
                          );
                        })}

                        {!carregandoArtigos && !artigosFiltrados.length && (
                          <p className="py-8 text-center font-body text-sm text-muted-foreground">
                            {filtro === 'favoritos'
                              ? 'Nenhum artigo favoritado ainda.'
                              : filtro === 'recentes'
                                ? 'Nenhum artigo aberto recentemente.'
                                : 'Nenhum artigo encontrado.'}
                          </p>
                        )}
                      </>
                    )}

                  </div>

                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {aberto && <VisualViewer registro={aberto} onClose={() => setAberto(null)} />}
      <PremiumGate open={gateOpen} onClose={() => setGateOpen(false)} feature="mapa_mental" />
    </>
  );
}
