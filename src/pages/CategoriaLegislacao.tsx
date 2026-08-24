import { useMemo, useState, useEffect, useCallback, useRef, useLayoutEffect, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Search, BookOpen, ChevronRight, ChevronDown, Scale, ArrowLeft, Landmark, Shield, FileText, ScrollText, Loader2, Star, Heart, Gavel, Building2, Briefcase, ShieldCheck, DollarSign, Car, Vote, Droplets, Plane, Bus, ListMusic, Sparkles, StickyNote, Calendar, ExternalLink, ArrowUp, BadgeCheck, Ban, Play, Pause, CheckCircle2, Radar, GitBranch, Info, BookMarked, HeartPulse, History, Mic, MicOff, Volume2, Camera, LayoutGrid, X as XIcon } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { supabase } from '@/integrations/supabase/client';
import { LEIS_SUPABASE_URL, leisAuthHeaders } from '@/lib/legislacaoBackend';
import { useSubscription } from '@/hooks/useSubscription';
import PremiumGate from '@/components/PremiumGate';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeisPorTipo, fetchArtigosPaginado, fetchArtigosInstant, getCachedArtigos, setCachedArtigos, prefetchAllArtigos, loadPersistedArtigos, ANOS_LEIS_ORDINARIAS, ANOS_DECRETOS, fetchLeisOrdinariasPorAno, fetchDecretosPorAno, type LeiOrdinaria } from '@/services/legislacaoService';
import { fetchSumulas, type Sumula, SUMULA_TRIBUNAIS } from '@/services/sumulasService';
import SumulaVinculanteSheet from '@/components/vademecum/SumulaVinculanteSheet';
import ArtigoCard from '@/components/vademecum/ArtigoCard';
import { cascadeContainer } from '@/components/vademecum/staggerVariants';
import ArtigoBottomSheet from '@/components/vademecum/ArtigoBottomSheet';
import GrafoOverlay from '@/components/vademecum/GrafoOverlay';
import LeiOrdinariaDetail from '@/components/vademecum/LeiOrdinariaDetail';
import OcrScanner from '@/components/vademecum/OcrScanner';
import type { ArtigoLei } from '@/data/mockData';
import brasaoImgAsset from '@/assets/brasao-republica.webp';
const brasaoImg = brasaoImgAsset;
import { useIsDesktop } from '@/hooks/use-desktop';
import RadarLegislacaoContent, { prefetchRadarData } from '@/components/vademecum/RadarLegislacaoContent';
import { getLeiColor, getLeiCover, shade } from '@/lib/leiTheme';
import { warmCoverCache } from '@/lib/coverLoader';
import { slugToTipo, tipoToSlug, leiToSlug, leiPath, findLeiBySlug, CATEGORIAS_FIXAS } from '@/lib/legislacaoSlugs';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { Navigate } from 'react-router-dom';
import { track } from '@/lib/analyticsEvents';
import { toggleArtigoFavorito, listNumerosFavoritosByTabela, ARTIGOS_FAV_EVENT } from '@/lib/artigosFavoritos';
import { isFavorito as isLeiFavorita, toggleFavorito as toggleLeiFavorito, LEIS_FAVORITOS_EVENT } from '@/lib/leisFavoritos';

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string }> = {
  constituicao: { label: 'Constituição', icon: Landmark, bg: 'from-amber-500/90 to-amber-700/80' },
  codigo: { label: 'Códigos', icon: Scale, bg: 'from-sky-500/90 to-sky-700/80' },
  estatuto: { label: 'Estatutos', icon: Shield, bg: 'from-emerald-500/90 to-emerald-700/80' },
  'lei-ordinaria': { label: 'Leis Ordinárias', icon: FileText, bg: 'from-violet-500/90 to-violet-700/80' },
  decreto: { label: 'Decretos', icon: ScrollText, bg: 'from-orange-500/90 to-orange-700/80' },
  sumula: { label: 'Jurisprudência', icon: Gavel, bg: 'from-pink-500/90 to-pink-700/80' },
  'lei-especial': { label: 'Leis Especiais', icon: BookMarked, bg: 'from-indigo-500/90 to-indigo-700/80' },
  previdenciario: { label: 'Previdenciário', icon: HeartPulse, bg: 'from-teal-500/90 to-teal-700/80' },
};

const MOBILE_ARTIGOS_VIRTUAL_THRESHOLD = 120;

// Subcategorias para Leis Especiais
const LEI_ESPECIAL_SUBCATEGORIAS: { id: string; label: string; ids: Set<string> }[] = [
  { id: 'todas', label: 'Todas', ids: new Set() },
  { id: 'penal', label: 'Penal', ids: new Set(['lep','lmp','ld','loc','laa','lit','lat','lch','ltort','lca','lrac','llav','lcp','lcsf','lpt','lci']) },
  { id: 'admin', label: 'Administrativo', ids: new Set(['l8112','lia','nll','lpaf','lrf','lai','lap','lace','lotcu','ces','lomp','loman']) },
  { id: 'civil', label: 'Civil / Família', ids: new Set(['lindb','li','lrp','la','lalp','lalim','lpsu','lda']) },
  { id: 'processual', label: 'Processual', ids: new Set(['lms','lacp','lje','lhd','lmi']) },
  { id: 'empresarial', label: 'Empresarial', ids: new Set(['lf','lgpd','mci','lsa','lpi','lcon','lppp','lcade','lle','lmls','lrt']) },
  { id: 'eleitoral', label: 'Eleitoral', ids: new Set(['lpp','lele','lfl','line']) },
  { id: 'social', label: 'Social / Saúde', ids: new Set(['ldb','lsus','lbio']) },
];

const LEI_ICON_MAP: Record<string, React.ElementType> = {
  CP: Gavel,
  CC: Building2,
  CPC: FileText,
  CPP: ShieldCheck,
  CLT: Briefcase,
  CDC: ShieldCheck,
  CTN: DollarSign,
  CTB: Car,
  CE: Vote,
  CA: Droplets,
  CBA: Plane,
  CBT: Bus,
};

const CategoriaLegislacao = () => {
  const isDesktop = useIsDesktop();
  const params = useParams<{ tipo: string; leiSlug?: string; artigoNumero?: string }>();
  const rawTipo = params.tipo;
  const leiSlugParam = params.leiSlug;
  const artigoNumeroParam = params.artigoNumero;
  // Aceita slugs plurais (codigos, estatutos, leis-ordinarias...) e converte para o tipo interno.
  const tipo = rawTipo ? slugToTipo(rawTipo) : rawTipo;
  const navigate = useNavigate();
  const location = useLocation();
  // Mobile/tablet não têm telas de lista intermediárias por categoria — as
  // categorias abrem por bottom-sheet a partir da home. Então o botão voltar
  // de qualquer lei (Constituição, Códigos, Estatutos, Leis Ordinárias, Lei
  // Penal Especial, Jurisprudência, etc.) sempre retorna direto para "/".
  const goBack = useCallback(() => {
    // Prefer the browser back stack when the previous entry belongs to this
    // app — it restores the home instantly (with scroll position) instead of
    // pushing a fresh "/" entry that has to remount + re-hydrate.
    try {
      const ref = document.referrer;
      const sameOrigin = ref && new URL(ref).origin === window.location.origin;
      if (sameOrigin && window.history.length > 1) {
        navigate(-1);
        return;
      }
    } catch { /* fall through */ }
    navigate('/');
  }, [navigate]);
  // Prefetch the home route chunks on mount so tapping "Voltar" from a heavy
  // law page paints the home instantly instead of waiting on a lazy import.
  // AdminPassoAPassoLojas → AdminFuncoes feels instant because both are small
  // chunks already in cache; law pages weren't warming Index.
  useEffect(() => {
    const id = (window as any).requestIdleCallback?.(() => {
      void import('./Index').catch(() => {});
      void import('./IndexMobile').catch(() => {});
    }, { timeout: 1500 }) ?? setTimeout(() => {
      void import('./Index').catch(() => {});
      void import('./IndexMobile').catch(() => {});
    }, 400);
    return () => {
      (window as any).cancelIdleCallback?.(id);
      clearTimeout(id as any);
    };
  }, []);
  // Safety: ensure body scroll/touch locks left over from bottom sheets or
  // overlays are always cleared when the page unmounts. Without this a stale
  // `overflow:hidden` + `touchAction:none` on <body> can make the home screen
  // appear "frozen" after tapping Voltar.
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
    };
  }, []);
  const { isPremium } = useSubscription();
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [premiumGateDesc, setPremiumGateDesc] = useState('');
  const [premiumGateFeature, setPremiumGateFeature] = useState<'radar' | 'favorito'>('radar');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeiId, setSelectedLeiId] = useState<string | null>(null);
  const [selectedLeiNome, setSelectedLeiNome] = useState('');
  const [selectedLeiDescricao, setSelectedLeiDescricao] = useState('');
  const [selectedTabelaNome, setSelectedTabelaNome] = useState<string | null>(null);
  const [selectedLeiEmenta, setSelectedLeiEmenta] = useState<string>('');
  const [showEmentaDialog, setShowEmentaDialog] = useState(false);
  const [artigos, setArtigos] = useState<ArtigoLei[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [openArtigo, setOpenArtigo] = useState<ArtigoLei | null>(null);
  const [openFromNovidades, setOpenFromNovidades] = useState(false);
  const [subcat, setSubcat] = useState('todas');
  const [openModInfo, setOpenModInfo] = useState<import('@/components/vademecum/ArtigoBottomSheet').ModificationInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'art' | 'cap' | 'rec' | 'lot'>('art');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [overlayPanel, setOverlayPanel] = useState<'fav' | 'playlist' | 'novidades' | 'anotacoes' | 'radar' | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [stickySearch, setStickySearch] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  // Coreografia de entrada: search+abas → lista → rodapé
  const [showFooter, setShowFooter] = useState(false);
  useEffect(() => {
    if (!selectedLeiId) { setShowFooter(false); return; }
    const t = setTimeout(() => setShowFooter(true), 380);
    return () => clearTimeout(t);
  }, [selectedLeiId]);

  // Busca a ementa oficial (texto vermelho estilo Planalto) da lei selecionada.
  useEffect(() => {
    if (!selectedLeiId) { setSelectedLeiEmenta(''); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from('vade_mecum_leis')
        .select('ementa')
        .eq('slug', selectedLeiId)
        .maybeSingle();
      if (!cancelled) setSelectedLeiEmenta((data?.ementa as string) || '');
    })();
    return () => { cancelled = true; };
  }, [selectedLeiId]);

  // Analytics: lei selecionada
  useEffect(() => {
    if (selectedLeiId) {
      track('legislacao_lei_opened', { lei_id: selectedLeiId, lei_nome: selectedLeiNome, tipo });
    }
  }, [selectedLeiId, selectedLeiNome, tipo]);

  const searchBarRef = useRef<HTMLDivElement | null>(null);
  const artigosListRef = useRef<HTMLDivElement | null>(null);
  const [artigosListOffset, setArtigosListOffset] = useState(0);
  const voiceSearch = useVoiceInput((text) => {
    if (!text) return;
    setSearchQuery(text);
     
    setTimeout(() => handleSearch(text), 0);
  });
  const [expandedTitulo, setExpandedTitulo] = useState<string | null>(null);
  // Playlist state
  const [playlistNarracoes, setPlaylistNarracoes] = useState<Record<string, string>>({});
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [favoritos, setFavoritos] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('vademecum-favoritos');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  // Leis Ordinárias state
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [leisOrdinarias, setLeisOrdinarias] = useState<LeiOrdinaria[]>([]);
  const [loadingLeisOrd, setLoadingLeisOrd] = useState(false);
  const [searchLeisOrd, setSearchLeisOrd] = useState('');
  const [openLeiOrd, setOpenLeiOrd] = useState<LeiOrdinaria | null>(null);
  // Decretos state
  const [selectedAnoDecreto, setSelectedAnoDecreto] = useState<number | null>(null);
  const [decretos, setDecretos] = useState<LeiOrdinaria[]>([]);
  const [loadingDecretos, setLoadingDecretos] = useState(false);
  const [searchDecretos, setSearchDecretos] = useState('');
  const [openDecreto, setOpenDecreto] = useState<LeiOrdinaria | null>(null);
  // Súmulas state
  const [selectedTribunal, setSelectedTribunal] = useState<string | null>(null);
  const [sumulas, setSumulas] = useState<Sumula[]>([]);
  const [loadingSumulas, setLoadingSumulas] = useState(false);
  const [searchSumulas, setSearchSumulas] = useState('');
  const [openSumula, setOpenSumula] = useState<Sumula | null>(null);
  const [showGrafo, setShowGrafo] = useState(false);
  const [dbAlteracoes, setDbAlteracoes] = useState<{ artigo_numero: string; tipo_alteracao: string; texto_anterior: string | null; texto_atual: string | null; detectado_em: string }[]>([]);
  const [loadingDbAlteracoes, setLoadingDbAlteracoes] = useState(false);
  const [grifadoNumeros, setGrifadoNumeros] = useState<Set<string>>(new Set());
  const [anotadoNumeros, setAnotadoNumeros] = useState<Set<string>>(new Set());
  const [favArtigoNumeros, setFavArtigoNumeros] = useState<Set<string>>(new Set());
  const [leiFavToggle, setLeiFavToggle] = useState(0);

  // Load user's grifos & anotacoes for the selected lei (for tag indicators)
  useEffect(() => {
    if (!selectedTabelaNome) { setGrifadoNumeros(new Set()); setAnotadoNumeros(new Set()); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setGrifadoNumeros(new Set()); setAnotadoNumeros(new Set()); return; }
        const [{ data: grifos }, { data: notas }] = await Promise.all([
          supabase.from('artigos_grifos').select('numero_artigo').eq('tabela_codigo', selectedTabelaNome).eq('user_id', user.id),
          supabase.from('artigos_anotacoes').select('artigo_id').eq('user_id', user.id).like('artigo_id', `${selectedTabelaNome}::%`),
        ]);
        if (cancelled) return;
        setGrifadoNumeros(new Set((grifos || []).map((g: any) => String(g.numero_artigo))));
        setAnotadoNumeros(new Set((notas || []).map((n: any) => String(n.artigo_id).split('::')[1]).filter(Boolean)));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [selectedTabelaNome]);

  // Hidrata os favoritos (Meus Artigos) do usuário para a lei selecionada.
  useEffect(() => {
    if (!selectedTabelaNome) { setFavArtigoNumeros(new Set()); return; }
    let cancelled = false;
    const load = () => {
      listNumerosFavoritosByTabela(selectedTabelaNome).then((nums) => {
        if (!cancelled) setFavArtigoNumeros(new Set(nums));
      }).catch(() => {});
    };
    load();
    const onChange = () => load();
    window.addEventListener(ARTIGOS_FAV_EVENT, onChange);
    return () => { cancelled = true; window.removeEventListener(ARTIGOS_FAV_EVENT, onChange); };
  }, [selectedTabelaNome]);

  // Re-render quando o favorito da própria lei mudar.
  useEffect(() => {
    const bump = () => setLeiFavToggle((n) => n + 1);
    window.addEventListener(LEIS_FAVORITOS_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener(LEIS_FAVORITOS_EVENT, bump);
      window.removeEventListener('storage', bump);
    };
  }, []);


  // Fetch DB alteracoes when novidades panel opens
  useEffect(() => {
    if (overlayPanel !== 'novidades' || !selectedTabelaNome) return;
    // legislacao_alteracoes table not available in this deployment
    setDbAlteracoes([]);
    setLoadingDbAlteracoes(false);
  }, [overlayPanel, selectedTabelaNome]);

  // Fetch narrations when playlist tab is active
  useEffect(() => {
    if (overlayPanel !== 'playlist' || !selectedTabelaNome) return;
    let cancelled = false;
    setLoadingPlaylist(true);
    fetch(
      `${LEIS_SUPABASE_URL}/rest/v1/narracoes_artigos?tabela_nome=eq.${encodeURIComponent(selectedTabelaNome)}&select=artigo_numero,audio_url`,
      { headers: leisAuthHeaders() }
    )
      .then(async (res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((rows) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        (Array.isArray(rows) ? rows : []).forEach((row: any) => {
          if (row?.artigo_numero && row?.audio_url) map[row.artigo_numero] = row.audio_url;
        });
        setPlaylistNarracoes(map);
      })
      .catch((e) => {
        if (!cancelled) console.error('Erro ao carregar playlist:', e);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlaylist(false);
      });
    return () => { cancelled = true; };
  }, [overlayPanel, selectedTabelaNome]);

  // Reset playlist when law changes
  useEffect(() => {
    setPlaylistNarracoes({});
  }, [selectedTabelaNome]);

  // Load recent articles per tabela
  useEffect(() => {
    if (!selectedTabelaNome) { setRecentIds([]); return; }
    try {
      const raw = localStorage.getItem(`recentes_artigos_${selectedTabelaNome}`);
      setRecentIds(raw ? JSON.parse(raw) : []);
    } catch { setRecentIds([]); }
  }, [selectedTabelaNome]);

  const openArtigoWithRecent = useCallback((artigo: ArtigoLei) => {
    track('legislacao_artigo_opened', { lei_id: selectedLeiId, lei_nome: selectedLeiNome, tabela: selectedTabelaNome, artigo_id: artigo.id, artigo_numero: artigo.numero });
    setOpenArtigo(artigo);
    if (!selectedTabelaNome) return;
    setRecentIds(prev => {
      const next = [String(artigo.id), ...prev.filter(id => id !== String(artigo.id))].slice(0, 30);
      try { localStorage.setItem(`recentes_artigos_${selectedTabelaNome}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [selectedTabelaNome, selectedLeiId, selectedLeiNome]);

  // Player flutuante de narração: quando a pessoa clica pra voltar ao artigo
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { artigo?: ArtigoLei } | undefined;
      if (detail?.artigo) setOpenArtigo(detail.artigo);
    };
    window.addEventListener('narracao-flutuante:reopen', handler);
    return () => window.removeEventListener('narracao-flutuante:reopen', handler);
  }, []);

  const togglePlayAudio = useCallback((url: string) => {
    if (playingUrl === url && audioRef.current) {
      audioRef.current.pause();
      setPlayingUrl(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => { setPlayingUrl(null); audioRef.current = null; };
    audioRef.current = audio;
    setPlayingUrl(url);
  }, [playingUrl]);

  // Scroll-to-top visibility + sticky search bar
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 320);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      ([entry]) => setStickySearch(!entry.isIntersecting),
      { threshold: 0 }
    );
    const el = searchBarRef.current;
    if (el) observer.observe(el);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (el) observer.unobserve(el);
    };
  }, [selectedLeiId]);
  

  const toggleFavorito = (id: string) => {
    setFavoritos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('vademecum-favoritos', JSON.stringify([...next]));
      return next;
    });
    // Persistência real em Supabase (para aparecer em Meu Espaço → Meus Artigos)
    const artigo = artigos.find((a) => a.id === id);
    if (artigo && selectedTabelaNome) {
      const numero = String(artigo.numero || '').replace(/^Art\.\s*/i, '').trim() || String(artigo.numero || '');
      const preview = String((artigo as any).caput || (artigo as any).texto || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 240);
      // Optimistic set update
      setFavArtigoNumeros((prev) => {
        const next = new Set(prev);
        if (next.has(numero)) next.delete(numero); else next.add(numero);
        return next;
      });
      toggleArtigoFavorito({
        tabela_codigo: selectedTabelaNome,
        numero_artigo: numero,
        conteudo_preview: preview || null,
      }).catch((err) => {
        if (err?.name !== 'FavoritoLimitError') return;
        // Reverte o otimismo e oferece o plano
        setFavArtigoNumeros((prev) => {
          const next = new Set(prev);
          next.delete(numero);
          return next;
        });
        setFavoritos((prev) => {
          const next = new Set(prev);
          next.delete(id);
          localStorage.setItem('vademecum-favoritos', JSON.stringify([...next]));
          return next;
        });
        setPremiumGateFeature('favorito');
        setPremiumGateDesc(`Contas gratuitas podem manter até ${err.limite} artigos favoritos. Comece 7 dias grátis para favoritar sem limite.`);
        setShowPremiumGate(true);
      });
    }
  };

  const isArtigoFav = (a: { id: string; numero: string | number }) => {
    const num = String(a.numero || '').replace(/^Art\.\s*/i, '').trim();
    return favoritos.has(a.id) || favArtigoNumeros.has(num) || favArtigoNumeros.has(String(a.numero));
  };


  const UF_ESTADUAL = tipo && /^estadual_([a-z]{2})$/i.exec(tipo)?.[1]?.toUpperCase();
  const config = tipo
    ? (TIPO_CONFIG[tipo] || (UF_ESTADUAL
        ? { label: `Legislação ${UF_ESTADUAL}`, icon: Landmark, bg: 'from-emerald-500/90 to-emerald-700/80' }
        : null))
    : null;
  const Icon = config?.icon || Scale;


  const [leis, setLeis] = useState<{ id: string; nome: string; sigla: string; descricao: string; tipo: string; tabela_nome: string }[]>([]);
  const [loadingLeis, setLoadingLeis] = useState(true);

  useEffect(() => {
    if (!tipo) return;
    setLoadingLeis(true);
    getLeisPorTipo(tipo).then((data) => {
      setLeis(data);
      setLoadingLeis(false);
      // If only one lei in category, auto-select it
      if (data.length === 1 && !selectedLeiId) {
        const lei = data[0];
        setSelectedLeiId(lei.id);
        setSelectedLeiNome(lei.nome);
        setSelectedLeiDescricao(lei.descricao);
        setSelectedTabelaNome(lei.tabela_nome);
      }
    });
  }, [tipo]);

  // Prefetch artigos em background para carregamento instantâneo (paralelo)
  useEffect(() => {
    if (leis.length === 0) return;
    // Use the centralized parallel prefetch
    prefetchAllArtigos(4);
    // Aquece o cache das capas (CDN → memória do browser) para abrir instantâneo
    warmCoverCache();
  }, [leis]);

  // Jump to top when selecting a lei (instant — the PageTransition zoom-in
  // already provides the sense of movement; smooth scroll adds 250-300ms of
  // dead time before the list becomes visible).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [selectedLeiId, tipo]);

  // Auto-select lei / tribunal from navigation state
  const [pendingArtigoNumero, setPendingArtigoNumero] = useState<string | null>(null);
  useEffect(() => {
    const state = location.state as {
      autoSelectLei?: { leiId: string; nome: string; descricao: string; tabela_nome: string };
      autoSelectTribunal?: string;
      artigoNumero?: string;
    } | null;
    if (state?.autoSelectLei) {
      const lei = state.autoSelectLei;
      setSelectedLeiId(lei.leiId);
      setSelectedLeiNome(lei.nome);
      setSelectedLeiDescricao(lei.descricao);
      setSelectedTabelaNome(lei.tabela_nome);
      if (state.artigoNumero) setPendingArtigoNumero(state.artigoNumero);
      window.history.replaceState({}, '');
    } else if (state?.autoSelectTribunal) {
      setSelectedTribunal(state.autoSelectTribunal);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Auto-select lei baseado no slug da URL (padrão novo /legislacao/<tipo>/<leiSlug>).
  useEffect(() => {
    if (!tipo) return;
    // Constituição é única no seu tipo: URL canônica é /legislacao/constituicao.
    // Se vier com slug redundante (ex.: /legislacao/constituicao/constituicao-federal),
    // redireciona para a rota curta.
    if (tipo === 'constituicao') {
      const cf = LEIS_CATALOG.find((l) => l.tipo === 'constituicao');
      if (cf) {
        if (leiSlugParam) {
          navigate(`/legislacao/${tipoToSlug('constituicao')}`, { replace: true });
          return;
        }
        setSelectedLeiId(cf.id);
        setSelectedLeiNome(cf.nome);
        setSelectedLeiDescricao(cf.descricao);
        setSelectedTabelaNome(cf.tabela_nome);
        if (artigoNumeroParam) setPendingArtigoNumero(artigoNumeroParam);
        return;
      }
    }
    if (!leiSlugParam) return;
    const lei = findLeiBySlug(tipo, leiSlugParam);
    if (lei) {
      setSelectedLeiId(lei.id);
      setSelectedLeiNome(lei.nome);
      setSelectedLeiDescricao(lei.descricao);
      setSelectedTabelaNome(lei.tabela_nome);
      if (artigoNumeroParam) setPendingArtigoNumero(artigoNumeroParam);
      return;
    }
    // Fallback: tipos dinâmicos (estaduais) — casa contra a lista carregada do banco
    const s = leiSlugParam.toLowerCase();
    const dyn = leis.find(l => l.tabela_nome.toLowerCase() === s);
    if (dyn) {
      setSelectedLeiId(dyn.id);
      setSelectedLeiNome(dyn.nome);
      setSelectedLeiDescricao(dyn.descricao);
      setSelectedTabelaNome(dyn.tabela_nome);
      if (artigoNumeroParam) setPendingArtigoNumero(artigoNumeroParam);
    }
  }, [leiSlugParam, tipo, artigoNumeroParam, leis, navigate]);


  // Fetch leis ordinárias when year selected
  useEffect(() => {
    if (!selectedAno) return;
    setLoadingLeisOrd(true);
    fetchLeisOrdinariasPorAno(selectedAno).then((data) => {
      setLeisOrdinarias(data);
      setLoadingLeisOrd(false);
    });
  }, [selectedAno]);

  // Fetch decretos when year selected
  useEffect(() => {
    if (!selectedAnoDecreto) return;
    setLoadingDecretos(true);
    fetchDecretosPorAno(selectedAnoDecreto).then((data) => {
      setDecretos(data);
      setLoadingDecretos(false);
    });
  }, [selectedAnoDecreto]);

  // Fetch sumulas when tribunal selected
  useEffect(() => {
    if (!selectedTribunal) return;
    setLoadingSumulas(true);
    fetchSumulas(selectedTribunal).then((data) => {
      setSumulas(data);
      setLoadingSumulas(false);
    });
  }, [selectedTribunal]);

  const filteredSumulas = useMemo(() => {
    if (!searchSumulas) return sumulas;
    const q = searchSumulas.toLowerCase();
    return sumulas.filter(s =>
      s.enunciado.toLowerCase().includes(q) ||
      String(s.numero).includes(q)
    );
  }, [sumulas, searchSumulas]);

  const filteredLeisOrdinarias = useMemo(() => {
    if (!searchLeisOrd) return leisOrdinarias;
    const q = searchLeisOrd.toLowerCase();
    return leisOrdinarias.filter(l =>
      l.numero_lei.toLowerCase().includes(q) ||
      l.ementa.toLowerCase().includes(q)
    );
  }, [leisOrdinarias, searchLeisOrd]);

  const filteredDecretos = useMemo(() => {
    if (!searchDecretos) return decretos;
    const q = searchDecretos.toLowerCase();
    return decretos.filter(d =>
      d.numero_lei.toLowerCase().includes(q) ||
      d.ementa.toLowerCase().includes(q)
    );
  }, [decretos, searchDecretos]);

  const filteredLeis = useMemo(() => {
    let result = leis;
    // Apply subcategory filter for lei-especial
    if (tipo === 'lei-especial' && subcat !== 'todas') {
      const subcatObj = LEI_ESPECIAL_SUBCATEGORIAS.find(s => s.id === subcat);
      if (subcatObj) result = result.filter(lei => subcatObj.ids.has(lei.id));
    }
    if (!searchQuery) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(lei =>
      lei.nome.toLowerCase().includes(q) ||
      lei.sigla.toLowerCase().includes(q) ||
      lei.descricao.toLowerCase().includes(q)
    );
  }, [leis, searchQuery, tipo, subcat]);

  useEffect(() => {
    if (!selectedLeiId || !selectedTabelaNome) return;
    let cancelled = false;
    const tabelaAtual = selectedTabelaNome;

    // 1) Cache em memória — instant, sem spinner (bundle prime já rodou no boot).
    const cached = getCachedArtigos(tabelaAtual);
    if (cached && cached.length > 0) {
      setArtigos(cached);
      setLoadedKey(tabelaAtual);
      setLoadingArtigos(false);
      // Revalida em background (sem bloquear UI).
      fetchArtigosPaginado(tabelaAtual, 0, 10000).then((fresh) => {
        if (!cancelled && fresh.length > 0) {
          startTransition(() => setArtigos(fresh));
        }
      }).catch(() => {});
      return () => { cancelled = true; };
    }

    // 2) Corrida: bundle JSON local vs Dexie persistido — quem vier primeiro renderiza.
    //    Ambos são "instantâneos" no Android (bundle vem do APK, Dexie da IDB local).
    let settled = false;
    const settle = (arts: ArtigoLei[]) => {
      if (cancelled || settled || !arts || arts.length === 0) return;
      settled = true;
      setArtigos(arts);
      setLoadedKey(tabelaAtual);
      setLoadingArtigos(false);
      // Revalida silenciosamente
      fetchArtigosPaginado(tabelaAtual, 0, 10000).then((fresh) => {
        if (!cancelled && fresh.length > 0) startTransition(() => setArtigos(fresh));
      }).catch(() => {});
    };

    // Bundle nativo (rápido em Android — arquivo do APK).
    import('@/services/lawsBundle').then(async ({ loadManifest, loadBundledLei, getBundleSlugForTabela }) => {
      const manifest = await loadManifest();
      if (!manifest || cancelled || settled) return;
      const slug = getBundleSlugForTabela(tabelaAtual);
      if (!slug) return;
      const bundled = await loadBundledLei(slug);
      if (bundled && bundled.length > 0) {
        setCachedArtigos(tabelaAtual, bundled);
        settle(bundled);
      }
    }).catch(() => {});

    // Dexie (subsequent visits).
    loadPersistedArtigos(tabelaAtual).then((persisted) => {
      if (persisted && persisted.length > 0) settle(persisted);
    }).catch(() => {});

    // 3) Fallback com skeleton apenas se nada aparecer em 180ms.
    const skeletonTimer = setTimeout(() => {
      if (cancelled || settled) return;
      setLoadingArtigos(true);
      fetchArtigosInstant(tabelaAtual, 10)
        .then((first) => {
          if (cancelled) return;
          if (first.length > 0) {
            settle(first);
          } else {
            setArtigos([]);
            setLoadedKey(tabelaAtual);
            setLoadingArtigos(false);
          }
        })
        .catch(() => {
          if (cancelled) return;
          setArtigos([]);
          setLoadedKey(tabelaAtual);
          setLoadingArtigos(false);
        });
    }, 280);

    return () => { cancelled = true; clearTimeout(skeletonTimer); };
  }, [selectedLeiId, selectedTabelaNome]);


  // Prefetch Radar data in background as soon as a law is selected
  useEffect(() => {
    if (!selectedLeiId || !selectedLeiNome) return;
    prefetchRadarData(selectedLeiNome, selectedTabelaNome);
  }, [selectedLeiId, selectedLeiNome, selectedTabelaNome]);

  const filteredArtigos = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return artigos;
    // Extract digits + optional letter suffix (e.g., "55", "2-A")
    const q = raw.replace(/[^\d\-a-zA-Z]/g, '').replace(/^[a-zA-Z]+/, '').toLowerCase();
    if (!q) {
      const lower = raw.toLowerCase();
      return artigos.filter(a =>
        (a.caput || '').toLowerCase().includes(lower) ||
        (a.numero || '').toLowerCase().includes(lower)
      );
    }
    // Exact match by article number — "10" only matches Art. 10, not 100/101.
    return artigos.filter(a => {
      const artNum = (a.numero || '').replace(/^art\.?\s*/i, '').replace(/[º°]/g, '').trim().toLowerCase();
      return artNum === q;
    });
  }, [artigos, searchQuery]);

  const highlightText = (text: string) => text;

  const [highlightedArtigoId, setHighlightedArtigoId] = useState<string | null>(null);

  const handleSearch = (override?: string) => {
    const raw = (override ?? searchQuery).trim();
    if (!raw) return;
    // Extract just digits (and optional suffix like -A) from user input
    const digits = raw.replace(/[^\d\-a-zA-Z]/g, '').replace(/^[a-zA-Z]+/, '');
    if (!digits) return;

    // Find exact article by comparing extracted number
    const found = artigos.find(a => {
      const artNum = a.numero.replace(/^art\.?\s*/i, '').replace(/[º°]/g, '').trim();
      return artNum === digits;
    }) || artigos.find(a => {
      const artNum = a.numero.replace(/^art\.?\s*/i, '').replace(/[º°]/g, '').trim();
      return artNum.startsWith(digits);
    });

    if (found) {
      // Close keyboard to prevent layout shift
      (document.activeElement as HTMLElement)?.blur();
      setHighlightedArtigoId(found.id);

      // Smooth animated scroll to the article, then open it
      const tryScrollAndOpen = (attempts = 0) => {
        const el = document.getElementById(`artigo-${found.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // After the fluid scroll finishes, open the article sheet
          setTimeout(() => {
            setOpenArtigo(found);
            setTimeout(() => setHighlightedArtigoId(null), 2500);
          }, 900);
        } else if (attempts < 20) {
          // list may still be rendering (deferred), retry shortly
          setTimeout(() => tryScrollAndOpen(attempts + 1), 100);
        } else {
          setOpenArtigo(found);
          setTimeout(() => setHighlightedArtigoId(null), 2500);
        }
      };
      // Give the page a beat to settle before scrolling
      setTimeout(() => tryScrollAndOpen(), 200);
    }

  };


  // Auto-abre artigo específico vindo da busca (Nº do Artigo) — sem animação de rolagem.
  useEffect(() => {
    if (!pendingArtigoNumero) return;
    if (artigos.length === 0) return;
    const digits = pendingArtigoNumero.replace(/[^\d\-a-zA-Z]/g, '').replace(/^[a-zA-Z]+/, '');
    if (!digits) { setPendingArtigoNumero(null); return; }
    const found =
      artigos.find((a) => {
        const artNum = a.numero.replace(/^art\.?\s*/i, '').replace(/[º°]/g, '').trim();
        return artNum === digits;
      }) ||
      artigos.find((a) => {
        const artNum = a.numero.replace(/^art\.?\s*/i, '').replace(/[º°]/g, '').trim();
        return artNum.startsWith(digits);
      });
    if (found) {
      setHighlightedArtigoId(found.id);
      setOpenArtigo(found);
      setTimeout(() => setHighlightedArtigoId(null), 2500);
    }
    setPendingArtigoNumero(null);
     
  }, [artigos, pendingArtigoNumero]);



  // Show títulos for laws that have them (check if artigos have titulo filled)
  const showTitulos = useMemo(() => {
    if (artigos.length === 0) return false;
    return artigos.some(a => a.titulo && a.titulo.trim() !== '');
  }, [artigos]);

  // Build hierarchical groups: Título → Capítulo → Artigos
  // If DB has `titulo`/`capitulo` columns filled, use them.
  // Otherwise, derive from inline structural rows (numero = "TÍTULO I", "CAPÍTULO II"...).
  const capituloGroups = useMemo(() => {
    const isTituloRow = (n: string) => /^\s*T[ÍI]TULO\s+[IVXLCDM0-9]/i.test(n || '');
    const isCapituloRow = (n: string) => /^\s*CAP[ÍI]TULO\s+[IVXLCDM0-9]/i.test(n || '');
    const isStructuralRow = (n: string) =>
      /^\s*(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s+[IVXLCDM0-9]/i.test(n || '');

    type CapGroup = { capitulo: string; artigos: typeof artigos };
    type TituloGroup = { titulo: string; capitulos: CapGroup[] };

    const groups: TituloGroup[] = [];
    const tituloMap = new Map<string, TituloGroup>();
    const ensureTitulo = (key: string) => {
      if (!tituloMap.has(key)) {
        const g: TituloGroup = { titulo: key, capitulos: [] };
        tituloMap.set(key, g);
        groups.push(g);
      }
      return tituloMap.get(key)!;
    };
    const ensureCap = (t: TituloGroup, key: string) => {
      let c = t.capitulos.find(x => x.capitulo === key);
      if (!c) { c = { capitulo: key, artigos: [] }; t.capitulos.push(c); }
      return c;
    };

    if (showTitulos) {
      for (const art of artigos) {
        const rawTitulo = art.titulo || 'Sem título';
        const tituloKey = rawTitulo === 'Sem título' ? 'TÍTULO I - DA APLICAÇÃO DA LEI PENAL' : rawTitulo;
        const capKey = art.capitulo || '__sem_capitulo__';
        const t = ensureTitulo(tituloKey);
        ensureCap(t, capKey).artigos.push(art);
      }
      return groups;
    }

    // Derive from inline structural rows
    let currentTitulo: string | null = null;
    let currentCapitulo: string | null = null;
    let sawStructural = false;

    for (const art of artigos) {
      const num = (art.numero || '').trim();
      if (isTituloRow(num)) {
        sawStructural = true;
        let sub = (art.caput || '').replace(/<[^>]+>/g, '').trim();
        // Remove eventual repetição do próprio header no início do subtítulo
        const dupRe = new RegExp(`^${num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—:]?\\s*`, 'i');
        sub = sub.replace(dupRe, '').trim();
        currentTitulo = sub ? `${num} - ${sub}` : num;
        currentCapitulo = null;
        continue;
      }
      if (isCapituloRow(num)) {
        sawStructural = true;
        let sub = (art.caput || '').replace(/<[^>]+>/g, '').trim();
        const dupRe = new RegExp(`^${num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—:]?\\s*`, 'i');
        sub = sub.replace(dupRe, '').trim();
        currentCapitulo = sub ? `${num} - ${sub}` : num;
        if (!currentTitulo) currentTitulo = 'TÍTULO ÚNICO';
        continue;
      }
      if (isStructuralRow(num)) continue;

      const tKey = currentTitulo || '__no_titulo__';
      const cKey = currentCapitulo || '__sem_capitulo__';
      ensureCap(ensureTitulo(tKey), cKey).artigos.push(art);
    }

    if (!sawStructural && artigos.length > 0) {
      const t = ensureTitulo('__no_titulo__');
      ensureCap(t, '__sem_capitulo__').artigos.push(...artigos);
    }

    return groups;
  }, [artigos, showTitulos]);

  const totalCapitulos = useMemo(() => {
    return capituloGroups.reduce((sum, g) => sum + g.capitulos.length, 0);
  }, [capituloGroups]);

  const visibleArtigos = useMemo(() => {
    if (!isDesktop || !expandedTitulo) return filteredArtigos;

    const ids = new Set<string>();
    for (const tg of capituloGroups) {
      for (const cg of tg.capitulos) {
        const ck = `${tg.titulo}__${cg.capitulo}`;
        if (ck === expandedTitulo) {
          cg.artigos.forEach((a) => ids.add(String(a.id)));
          return filteredArtigos.filter((a) => ids.has(String(a.id)));
        }
      }
    }
    return [];
  }, [capituloGroups, expandedTitulo, filteredArtigos, isDesktop]);

  const shouldVirtualizeArtigos = Boolean(
    selectedLeiId &&
    activeTab === 'art' &&
    !isDesktop &&
    !searchQuery.trim() &&
    visibleArtigos.length > MOBILE_ARTIGOS_VIRTUAL_THRESHOLD
  );

  useLayoutEffect(() => {
    if (!shouldVirtualizeArtigos) return;

    const measureOffset = () => {
      const next = artigosListRef.current
        ? artigosListRef.current.getBoundingClientRect().top + window.scrollY
        : 0;
      setArtigosListOffset(next);
    };

    measureOffset();
    const element = artigosListRef.current;
    const resizeObserver = element && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measureOffset)
      : null;

    if (element && resizeObserver) resizeObserver.observe(element);
    window.addEventListener('resize', measureOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureOffset);
    };
  }, [activeTab, selectedLeiId, shouldVirtualizeArtigos, visibleArtigos.length]);

  const artigosVirtualizer = useWindowVirtualizer({
    count: shouldVirtualizeArtigos ? visibleArtigos.length : 0,
    estimateSize: () => 116,
    overscan: 8,
    scrollMargin: artigosListOffset,
  });

  // View: Leis Ordinárias — year selection + list
  if (tipo === 'lei-ordinaria' && !selectedLeiId) {
    // If viewing a specific lei ordinária detail
    if (openLeiOrd) {
      return (
        <LeiOrdinariaDetail
          lei={openLeiOrd}
          onBack={() => setOpenLeiOrd(null)}
        />
      );
    }

    // If a year is selected, show the list of laws
    if (selectedAno) {
      return (
        <div className="min-h-dvh bg-background pb-20 lg:pb-0">
          <div className={`bg-gradient-to-br ${config?.bg || 'from-primary to-primary/80'} px-4 pt-10 pb-6 sm:px-6 md:px-8`}>
            <div className="max-w-5xl mx-auto">
              <button
                onClick={() => { setSelectedAno(null); setSearchLeisOrd(''); }}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-medium transition-all text-sm px-3 py-1.5 rounded-lg mb-4 touch-manipulation select-none"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl text-white font-bold">Leis Ordinárias — {selectedAno}</h1>
                  <p className="text-white/70 text-sm">{leisOrdinarias.length} leis</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou ementa..."
                value={searchLeisOrd}
                onChange={(e) => setSearchLeisOrd(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>

            {loadingLeisOrd ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Carregando leis ordinárias...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLeisOrdinarias.map((lei, i) => (
                  <motion.button
                    key={lei.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015 }}
                    onClick={() => setOpenLeiOrd(lei)}
                    className="w-full text-left rounded-2xl bg-card hover:bg-secondary/60 transition-all group flex overflow-hidden min-h-[82px]"
                  >
                    <div className="w-1.5 bg-primary rounded-l-2xl shrink-0" />
                    <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Scale className="w-4 h-4 text-primary-light" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-display text-[15px] font-bold text-primary-light">
                            {lei.numero_lei}
                          </h4>
                          {lei.data_publicacao && (
                            <span className="text-muted-foreground text-[10px] bg-secondary px-2 py-0.5 rounded-full">
                              {lei.data_publicacao}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] leading-relaxed line-clamp-2 text-foreground/80">
                          {lei.ementa}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-3 transition-colors" />
                    </div>
                  </motion.button>
                ))}
                {filteredLeisOrdinarias.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhuma lei encontrada.</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Year selection view
    return (
      <div className="min-h-dvh bg-background pb-20 lg:pb-0">
        <div className={`bg-gradient-to-br ${config?.bg || 'from-primary to-primary/80'} px-4 pt-10 pb-6 sm:px-6 md:px-8`}>
          <div className="max-w-5xl mx-auto">
            <button
              onClick={goBack}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-medium transition-all text-sm px-3 py-1.5 rounded-lg mb-4 touch-manipulation select-none"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl text-white font-bold">Leis Ordinárias</h1>
                <p className="text-white/70 text-sm">Selecione o ano</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ANOS_LEIS_ORDINARIAS.map((ano, i) => (
              <motion.button
                key={ano}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedAno(ano)}
                className="w-full text-left rounded-xl p-5 bg-card hover:bg-secondary/50 transition-all group flex items-center gap-4"
                style={{ borderLeft: '3px solid hsl(var(--primary))' }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-2xl text-foreground group-hover:text-primary transition-colors font-bold">
                    {ano}
                  </h3>
                  <p className="text-muted-foreground text-sm">Leis Ordinárias</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // View: Decretos — year selection + list (same pattern as lei-ordinaria)
  if (tipo === 'decreto' && !selectedLeiId) {
    if (openDecreto) {
      return (
        <LeiOrdinariaDetail
          lei={openDecreto}
          onBack={() => setOpenDecreto(null)}
        />
      );
    }

    if (selectedAnoDecreto) {
      return (
        <div className="min-h-dvh bg-background pb-20 lg:pb-0">
          <div className={`bg-gradient-to-br ${config?.bg || 'from-primary to-primary/80'} px-4 pt-10 pb-6 sm:px-6 md:px-8`}>
            <div className="max-w-5xl mx-auto">
              <button
                onClick={() => { setSelectedAnoDecreto(null); setSearchDecretos(''); }}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-medium transition-all text-sm px-3 py-1.5 rounded-lg mb-4 touch-manipulation select-none"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <ScrollText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl text-white font-bold">Decretos — {selectedAnoDecreto}</h1>
                  <p className="text-white/70 text-sm">{decretos.length} decretos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou ementa..."
                value={searchDecretos}
                onChange={(e) => setSearchDecretos(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>

            {loadingDecretos ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Carregando decretos...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDecretos.map((dec, i) => (
                  <motion.button
                    key={dec.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015 }}
                    onClick={() => setOpenDecreto(dec)}
                    className="w-full text-left rounded-2xl bg-card hover:bg-secondary/60 transition-all group flex overflow-hidden min-h-[82px]"
                  >
                    <div className="w-1.5 bg-primary rounded-l-2xl shrink-0" />
                    <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <ScrollText className="w-4 h-4 text-primary-light" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-display text-[15px] font-bold text-primary-light">
                            {dec.numero_lei}
                          </h4>
                          {dec.data_publicacao && (
                            <span className="text-muted-foreground text-[10px] bg-secondary px-2 py-0.5 rounded-full">
                              {dec.data_publicacao}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] leading-relaxed line-clamp-2 text-foreground/80">
                          {dec.ementa}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-3 transition-colors" />
                    </div>
                  </motion.button>
                ))}
                {filteredDecretos.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum decreto encontrado.</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Year selection view for decretos
    return (
      <div className="min-h-dvh bg-background pb-20 lg:pb-0">
        <div className={`bg-gradient-to-br ${config?.bg || 'from-primary to-primary/80'} px-4 pt-10 pb-6 sm:px-6 md:px-8`}>
          <div className="max-w-5xl mx-auto">
            <button
              onClick={goBack}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-medium transition-all text-sm px-3 py-1.5 rounded-lg mb-4 touch-manipulation select-none"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <ScrollText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl text-white font-bold">Decretos</h1>
                <p className="text-white/70 text-sm">Selecione o ano</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ANOS_DECRETOS.map((ano, i) => (
              <motion.button
                key={ano}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedAnoDecreto(ano)}
                className="w-full text-left rounded-xl p-5 bg-card hover:bg-secondary/50 transition-all group flex items-center gap-4"
                style={{ borderLeft: '3px solid hsl(var(--primary))' }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-2xl text-foreground group-hover:text-primary transition-colors font-bold">
                    {ano}
                  </h3>
                  <p className="text-muted-foreground text-sm">Decretos</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // View: Súmulas — tribunal selection + list
  if (tipo === 'sumula' && !selectedLeiId) {
    // If a tribunal is selected, show the list of sumulas
    if (selectedTribunal) {
      const tribunalInfo = SUMULA_TRIBUNAIS.find(t => t.id === selectedTribunal);
      return (
        <div className="min-h-dvh bg-background pb-20 lg:pb-0">
          <div className={`bg-gradient-to-br ${config?.bg || 'from-primary to-primary/80'} px-4 pt-10 pb-6 sm:px-6 md:px-8`}>
            <div className="max-w-5xl mx-auto">
              <button
                onClick={() => { setSelectedTribunal(null); setSearchSumulas(''); }}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-medium transition-all text-sm px-3 py-1.5 rounded-lg mb-4 touch-manipulation select-none"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Gavel className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl text-white font-bold">{tribunalInfo?.nome || selectedTribunal}</h1>
                  <p className="text-white/70 text-sm">{sumulas.length} súmulas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou enunciado..."
                value={searchSumulas}
                onChange={(e) => setSearchSumulas(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>

            {loadingSumulas ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm">Carregando jurisprudência...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSumulas.map((sumula, i) => (
                  <motion.button
                    key={sumula.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.01, 0.5) }}
                    onClick={() => setOpenSumula(sumula)}
                    className="w-full text-left rounded-2xl bg-card hover:bg-secondary/60 transition-all group flex overflow-hidden min-h-[82px]"
                  >
                    <div
                      className="w-1.5 rounded-l-2xl shrink-0"
                      style={{ backgroundColor: sumula.situacao === 'cancelada' ? '#ef4444' : (tribunalInfo?.iconColor || 'hsl(var(--primary))') }}
                    />
                    <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Scale className="w-4 h-4 text-primary-light" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-display text-[15px] font-bold text-primary-light">
                            Súmula {selectedTribunal === 'STF_VINCULANTE' ? 'Vinculante ' : ''}{sumula.numero}
                          </h4>
                          {sumula.situacao === 'cancelada' && (
                            <span className="text-[10px] bg-destructive/15 text-destructive px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                              <Ban className="w-3 h-3" /> Cancelada
                            </span>
                          )}
                          {sumula.situacao === 'vigente' && (
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                              <BadgeCheck className="w-3 h-3" /> Vigente
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] leading-relaxed line-clamp-2 text-foreground/80">
                          {searchSumulas ? highlightText(sumula.enunciado) : sumula.enunciado}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-3 transition-colors" />
                    </div>
                  </motion.button>
                ))}
                {filteredSumulas.length === 0 && !loadingSumulas && (
                  <p className="text-center text-muted-foreground py-8">Nenhuma jurisprudência encontrada.</p>
                )}
              </div>
            )}
          </div>

          {/* Bottom sheet for súmula detail */}
          {openSumula && selectedTribunal === 'STF_VINCULANTE' && (
            <SumulaVinculanteSheet sumula={openSumula} onClose={() => setOpenSumula(null)} />
          )}
          {openSumula && selectedTribunal !== 'STF_VINCULANTE' && (
            <ArtigoBottomSheet
              artigo={{
                id: openSumula.id,
                numero: `Súmula ${selectedTribunal === 'STF_VINCULANTE' ? 'Vinculante ' : ''}${openSumula.numero}`,
                caput: openSumula.enunciado,
              }}
              onClose={() => setOpenSumula(null)}
            />
          )}
        </div>
      );
    }

    // Tribunal selection view
    return (
      <div className="min-h-dvh bg-background pb-20 lg:pb-0">
        <div className={`bg-gradient-to-br ${config?.bg || 'from-primary to-primary/80'} px-4 pt-10 pb-6 sm:px-6 md:px-8`}>
          <div className="max-w-5xl mx-auto">
            <button
              onClick={goBack}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-medium transition-all text-sm px-3 py-1.5 rounded-lg mb-4 touch-manipulation select-none"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Gavel className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl text-white font-bold">Jurisprudência</h1>
                <p className="text-white/70 text-sm">Selecione o tribunal</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {SUMULA_TRIBUNAIS.map((trib, i) => (
              <motion.button
                key={trib.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedTribunal(trib.id)}
                className="w-full text-left rounded-xl p-5 bg-card hover:bg-secondary/50 transition-all group flex items-center gap-4"
                style={{ borderLeft: `3px solid ${trib.iconColor}` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${trib.iconColor}20` }}
                >
                  <Gavel className="w-6 h-6" style={{ color: trib.iconColor }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-base text-foreground group-hover:text-primary transition-colors font-bold">
                    {trib.nome}
                  </h3>
                  <p className="text-muted-foreground text-xs">{trib.descricao}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // View: artigos de uma lei selecionada
  if (selectedLeiId) {
    const stripRedacaoFn = (s: string) => s.replace(/\s*\((?:Redação|Incluído|Revogado|Acrescido|Alterado|Vide|Regulamento)[^)]*\)/gi, '').trim();
    const leiAccent = getLeiColor(selectedLeiId, tipo);

    // Desktop: chapters sidebar + articles
    const chaptersPanel = !loadingArtigos && capituloGroups.length > 0 && (
      <div className="space-y-2">
        <p className="text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Capítulos ({totalCapitulos})
        </p>
        {/* "Todos" option to clear filter */}
        {isDesktop && expandedTitulo && (
          <button
            onClick={() => setExpandedTitulo(null)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-body text-primary hover:bg-secondary transition-colors font-semibold"
          >
            ← Todos os artigos
          </button>
        )}
        {capituloGroups.map((tGroup, ti) => (
          <div key={ti}>
            {showTitulos && (
              <div className="mb-1 mt-3 first:mt-0">
                <span className="text-primary-light text-[9px] font-bold uppercase tracking-wider">{stripRedacaoFn(tGroup.titulo)}</span>
              </div>
            )}
            {tGroup.capitulos.map((capGroup, ci) => {
              const capKey = `${tGroup.titulo}__${capGroup.capitulo}`;
              const isExpanded = expandedTitulo === capKey;
              const displayCap = capGroup.capitulo === '__sem_capitulo__'
                ? 'Disposições Gerais'
                : stripRedacaoFn(capGroup.capitulo);
              return (
                <button
                  key={ci}
                  onClick={() => setExpandedTitulo(isExpanded ? null : capKey)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-body transition-colors ${
                    isExpanded ? 'bg-primary/15 text-primary font-semibold' : 'text-foreground/70 hover:bg-secondary'
                  }`}
                >
                  <span className="line-clamp-2">{displayCap}</span>
                  <span className="text-muted-foreground text-[10px]"> ({capGroup.artigos.length})</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );

    // Articles content — skeleton matches real ArtigoCard height to avoid layout jump
    const articlesContent = loadingArtigos ? (
      <div className="space-y-2 pb-8" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-card/60 border border-border/40 overflow-hidden flex min-h-[96px] animate-pulse"
          >
            <div className="w-14 shrink-0 bg-secondary/40" />
            <div className="flex-1 p-4 space-y-2">
              <div className="h-3 w-2/3 bg-secondary/50 rounded" />
              <div className="h-3 w-11/12 bg-secondary/40 rounded" />
              <div className="h-3 w-9/12 bg-secondary/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    ) : activeTab === 'art' ? (
      <div ref={artigosListRef} className={shouldVirtualizeArtigos ? 'pb-8' : 'space-y-2 pb-8'}>
        {shouldVirtualizeArtigos ? (
          <div
            style={{
              height: `${artigosVirtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {artigosVirtualizer.getVirtualItems().map((virtualItem) => {
              const artigo = visibleArtigos[virtualItem.index];
              if (!artigo) return null;
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={artigosVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start - artigosVirtualizer.options.scrollMargin}px)`,
                    paddingBottom: '0.5rem',
                  }}
                >
                  <ArtigoCard
                    artigo={artigo}
                    index={virtualItem.index}
                    onClick={() => openArtigoWithRecent(artigo)}
                    highlightText={undefined}
                    isHighlighted={highlightedArtigoId === artigo.id}
                    accentColor={leiAccent}
                    withShine={virtualItem.index < 6}
                    tags={{ favorito: isArtigoFav(artigo), grifado: grifadoNumeros.has(artigo.numero), anotado: anotadoNumeros.has(artigo.numero) }}
                  />
                </div>
              );
            })}
          </div>
        ) : visibleArtigos.map((artigo, i) => (
          <ArtigoCard
            key={artigo.id}
            artigo={artigo}
            index={i}
            onClick={() => openArtigoWithRecent(artigo)}
            highlightText={searchQuery ? highlightText : undefined}
            isHighlighted={highlightedArtigoId === artigo.id}
            accentColor={leiAccent}
            withShine={i < 6}
            tags={{ favorito: isArtigoFav(artigo), grifado: grifadoNumeros.has(artigo.numero), anotado: anotadoNumeros.has(artigo.numero) }}
          />
        ))}
        {visibleArtigos.length === 0 && loadedKey === selectedTabelaNome && !loadingArtigos && (
          <p className="text-center text-muted-foreground py-8">Nenhum artigo encontrado.</p>
        )}
      </div>
    ) : activeTab === 'cap' ? (
      <div className="space-y-3 pb-8">
        {(() => {
          const splitRe = /^((?:PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s+[IVXLCDM0-9º°]+(?:-[A-Z])?)\s*[–—\-:]?\s*(.+)$/i;
          const _lowerWords = new Set(['a','à','às','ao','aos','o','os','as','e','ou','de','do','da','dos','das','em','no','na','nos','nas','por','para','com','sem','sob','sobre','entre','após','ante','até','contra','desde','perante','trás','um','uma','uns','umas']);
          const toTitleCase = (s: string) => s.toLowerCase().split(/(\s+)/).map((w, i) => {
            if (/^\s+$/.test(w) || !w) return w;
            if (i !== 0 && _lowerWords.has(w)) return w;
            return w.charAt(0).toUpperCase() + w.slice(1);
          }).join('');
          // Se o único "título" é o sintético TÍTULO ÚNICO (lei que só tem capítulos),
          // renderiza os capítulos como cards de topo — sem o wrapper redundante.
          const flatCapitulos = capituloGroups.length === 1 && capituloGroups[0].titulo === 'TÍTULO ÚNICO';
          if (flatCapitulos) {
            const tGroup = capituloGroups[0];
            return tGroup.capitulos.map((capGroup, ci) => {
              const capKey = `flat__${capGroup.capitulo}`;
              const isCapExpanded = expandedTitulo === capKey;
              const fA = capGroup.artigos[0]?.numero || '';
              const lA = capGroup.artigos[capGroup.artigos.length - 1]?.numero || '';
              const rawCap = capGroup.capitulo === '__sem_capitulo__' ? 'Disposições Gerais' : stripRedacaoFn(capGroup.capitulo);
              const cMatch = rawCap.match(splitRe);
              const capHead = cMatch ? cMatch[1].trim() : rawCap;
              const capSub = cMatch ? cMatch[2].trim() : '';
              return (
                <div key={ci}>
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ci * 0.02 }}
                    onClick={() => setExpandedTitulo(isCapExpanded ? null : capKey)}
                    className="w-full text-left rounded-2xl bg-card hover:bg-secondary/60 transition-all flex overflow-hidden min-h-[104px] md:min-h-[112px]"
                  >
                    <div className="w-2 rounded-l-2xl shrink-0" style={{ background: leiAccent }} />
                    <div className="p-4 md:p-5 flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/90">{capHead}</p>
                      {capSub ? (
                        <h5 className="font-serif text-sm md:text-base font-semibold text-foreground leading-snug mt-0.5">{toTitleCase(capSub)}</h5>
                      ) : null}
                      <p className="text-muted-foreground text-xs md:text-sm mt-1">
                        {capGroup.artigos.length} artigos{fA && lA ? ` (${fA} – ${lA})` : ''}
                      </p>
                    </div>
                    <div className="flex items-center pr-4">
                      <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isCapExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </motion.button>
                  {isCapExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-3 mt-2 space-y-2">
                      {capGroup.artigos.map((artigo, i) => (
                        <ArtigoCard key={artigo.id} artigo={artigo} index={i} onClick={() => setOpenArtigo(artigo)} accentColor={leiAccent} tags={{ favorito: isArtigoFav(artigo), grifado: grifadoNumeros.has(artigo.numero), anotado: anotadoNumeros.has(artigo.numero) }} />
                      ))}
                    </motion.div>
                  )}
                </div>
              );
            });
          }
          return capituloGroups.map((tGroup, ti) => {
            const rawTitulo = stripRedacaoFn(tGroup.titulo);
            const tMatch = rawTitulo.match(splitRe);
            const titHead = tMatch ? tMatch[1].trim() : rawTitulo;
            let titSub = tMatch ? tMatch[2].trim() : '';
            // Remove duplicated head prefix (e.g. "TÍTULO I DISPOSIÇÕES PRELIMINARES" -> "DISPOSIÇÕES PRELIMINARES")
            if (titSub && titHead) {
              const dupRe = new RegExp(`^${titHead.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*[-–—:]?\\s*`, 'i');
              titSub = titSub.replace(dupRe, '').trim();
            }
            const totalArts = tGroup.capitulos.reduce((s, c) => s + c.artigos.length, 0);
            const allArts = tGroup.capitulos.flatMap(c => c.artigos);
            const firstArt = allArts[0]?.numero || '';
            const lastArt = allArts[allArts.length - 1]?.numero || '';
            const hasRealCapitulos = tGroup.capitulos.some(c => c.capitulo !== '__sem_capitulo__');
            const titKey = `titulo__${tGroup.titulo}`;
            const isTitExpanded = expandedTitulo === titKey || (expandedTitulo?.startsWith(`${tGroup.titulo}__`) ?? false);
            return (
              <div key={ti}>
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ti * 0.02 }}
                  onClick={() => setExpandedTitulo(isTitExpanded ? null : titKey)}
                  className="w-full text-left rounded-2xl bg-card hover:bg-secondary/60 transition-all flex overflow-hidden min-h-[112px] md:min-h-[124px]"
                >
                  <div className="w-2 rounded-l-2xl shrink-0" style={{ background: leiAccent }} />
                  <div className="p-4 md:p-5 flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/90">{titHead}</p>
                    {titSub ? (
                      <h5 className="font-serif text-base md:text-lg font-semibold text-foreground leading-snug mt-1 line-clamp-2">
                        {toTitleCase(titSub)}
                      </h5>
                    ) : (
                      <h5 className="font-serif text-base md:text-lg font-semibold text-foreground leading-snug mt-1 opacity-0 select-none" aria-hidden>
                        &nbsp;
                      </h5>
                    )}
                    <p className="text-muted-foreground text-xs md:text-sm mt-1.5">
                      {totalArts} artigos{firstArt && lastArt ? ` (${firstArt} – ${lastArt})` : ''}
                    </p>
                  </div>
                  <div className="flex items-center pr-4">
                    <ChevronRight
                      className={`w-6 h-6 md:w-7 md:h-7 transition-transform ${isTitExpanded ? 'rotate-90' : ''}`}
                      style={{ color: leiAccent }}
                      strokeWidth={2.5}
                    />
                  </div>
                </motion.button>
                {isTitExpanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-4 mt-2 space-y-2">
                    {hasRealCapitulos ? (
                      tGroup.capitulos.map((capGroup, ci) => {
                        const capKey = `${tGroup.titulo}__${capGroup.capitulo}`;
                        const isCapExpanded = expandedTitulo === capKey;
                        const fA = capGroup.artigos[0]?.numero || '';
                        const lA = capGroup.artigos[capGroup.artigos.length - 1]?.numero || '';
                        const rawCap = capGroup.capitulo === '__sem_capitulo__'
                          ? 'Disposições Gerais'
                          : stripRedacaoFn(capGroup.capitulo);
                        const cMatch = rawCap.match(splitRe);
                        const capHead = cMatch ? cMatch[1].trim() : rawCap;
                        let capSub = cMatch ? cMatch[2].trim() : '';
                        if (capSub && capHead) {
                          const dupRe = new RegExp(`^${capHead.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*[-–—:]?\\s*`, 'i');
                          capSub = capSub.replace(dupRe, '').trim();
                        }
                        return (
                          <div key={ci}>
                            <button
                              onClick={() => setExpandedTitulo(isCapExpanded ? titKey : capKey)}
                              className="w-full text-left rounded-xl bg-card/70 hover:bg-secondary/60 transition-all flex overflow-hidden border border-border/40"
                            >
                              <div className="p-3 md:p-4 flex-1 min-w-0">
                                {capSub ? (
                                  <>
                                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">{capHead}</p>
                                    <h6 className="font-serif text-sm md:text-base font-semibold text-foreground leading-snug mt-0.5 line-clamp-2">
                                      {toTitleCase(capSub)}
                                    </h6>
                                  </>
                                ) : (
                                  <h6 className="font-display text-sm md:text-base font-bold text-foreground leading-snug">{capHead}</h6>
                                )}
                                <p className="text-muted-foreground text-[11px] md:text-xs mt-1">{capGroup.artigos.length} artigos ({fA} – {lA})</p>
                              </div>
                              <div className="flex items-center pr-3">
                                <ChevronRight
                                  className={`w-5 h-5 md:w-6 md:h-6 transition-transform ${isCapExpanded ? 'rotate-90' : ''}`}
                                  style={{ color: leiAccent }}
                                  strokeWidth={2.5}
                                />
                              </div>
                            </button>
                            {isCapExpanded && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-3 mt-2 space-y-2">
                                {capGroup.artigos.map((artigo, i) => (
                                  <ArtigoCard key={artigo.id} artigo={artigo} index={i} onClick={() => setOpenArtigo(artigo)} accentColor={leiAccent} tags={{ favorito: isArtigoFav(artigo), grifado: grifadoNumeros.has(artigo.numero), anotado: anotadoNumeros.has(artigo.numero) }} />
                                ))}
                              </motion.div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      allArts.map((artigo, i) => (
                        <ArtigoCard key={artigo.id} artigo={artigo} index={i} onClick={() => setOpenArtigo(artigo)} accentColor={leiAccent} tags={{ favorito: isArtigoFav(artigo), grifado: grifadoNumeros.has(artigo.numero), anotado: anotadoNumeros.has(artigo.numero) }} />
                      ))
                    )}
                  </motion.div>
                )}
              </div>
            );
          });
        })()}
      </div>
    ) : activeTab === 'rec' ? (
      <div className="space-y-2 pb-8">
        {(() => {
          const map = new Map(artigos.map(a => [String(a.id), a]));
          const recents = recentIds.map(id => map.get(id)).filter(Boolean) as ArtigoLei[];
          if (recents.length === 0) {
            return <p className="text-center text-muted-foreground py-8">Nenhum artigo visualizado ainda.</p>;
          }
          return recents.map((artigo, i) => (
            <ArtigoCard
              key={artigo.id}
              artigo={artigo}
              index={i}
              onClick={() => openArtigoWithRecent(artigo)}
              accentColor={leiAccent}
              tags={{ favorito: isArtigoFav(artigo), grifado: grifadoNumeros.has(artigo.numero), anotado: anotadoNumeros.has(artigo.numero) }}
            />
          ));
        })()}
      </div>
    ) : activeTab === 'lot' ? (
      <div className="space-y-5 pb-8">
        {(() => {
          const stripRe = (s: string) => s.replace(/\s*\((?:Redação|Incluído|Revogado|Acrescido|Alterado|Vide|Regulamento)[^)]*\)/gi, '').trim();
          const formatNumero = (n: string) => {
            const raw = (n || '').trim();
            // "5-A" / "5 A" / "5º-A" → "5A"; "5º" → "5"; keep letters
            const m = raw.match(/^(\d+)\s*[ºo°]?\s*[-–\s]?\s*([A-Za-z]?)$/);
            if (m) return `${m[1]}${(m[2] || '').toUpperCase()}`;
            return raw.replace(/[ºo°]/g, '');
          };
          if (capituloGroups.length === 0) {
            // Fallback flat grid when no chapters
            return (
              <div>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {filteredArtigos.map(a => (
                    <button
                      key={a.id}
                      onClick={() => openArtigoWithRecent(a)}
                      className="aspect-square rounded-xl bg-secondary/70 hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all text-foreground font-bold text-sm md:text-base flex items-center justify-center border border-border/40"
                      title={`Art. ${a.numero}`}
                    >
                      {formatNumero(a.numero)}
                    </button>
                  ))}
                </div>
              </div>
            );
          }
          return capituloGroups.map((tGroup, ti) => (
            <div key={ti} className="space-y-3">
              {stripRe(tGroup.titulo) && !/^T[ÍI]TULO\s+[ÚU]NICO$/i.test(stripRe(tGroup.titulo)) && (
                <p className="text-primary text-[11px] font-bold uppercase tracking-wider">
                  {stripRe(tGroup.titulo)}
                </p>
              )}
              {tGroup.capitulos.map((cap, ci) => {
                const displayCap = cap.capitulo === '__sem_capitulo__'
                  ? null
                  : stripRe(cap.capitulo);
                return (
                  <div key={ci} className="space-y-2">
                    {displayCap && (
                      <p className="text-foreground/80 text-xs font-semibold px-0.5 line-clamp-2">
                        {displayCap}
                      </p>
                    )}
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {cap.artigos.map(a => (
                        <button
                          key={a.id}
                          onClick={() => openArtigoWithRecent(a)}
                          className="aspect-square rounded-xl bg-secondary/70 hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all text-foreground font-bold text-sm md:text-base flex items-center justify-center border border-border/40"
                          title={`Art. ${a.numero}`}
                        >
                          {formatNumero(a.numero)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>
    ) : null;

    // ---- Overlay panel content builders ----
    const favContent = (
      <div className="space-y-2 pb-8">
        {artigos.filter(a => isArtigoFav(a)).length > 0 ? (
          artigos.filter(a => isArtigoFav(a)).map((artigo, i) => (
            <ArtigoCard key={artigo.id} artigo={artigo} index={i} onClick={() => { setOverlayPanel(null); setOpenArtigo(artigo); }} accentColor={leiAccent} tags={{ favorito: true, grifado: grifadoNumeros.has(artigo.numero), anotado: anotadoNumeros.has(artigo.numero) }} />
          ))
        ) : (
          <div className="flex flex-col items-center py-16 gap-3">
            <Heart className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-foreground text-sm font-medium">Você não tem nenhum artigo favoritado</p>
            <p className="text-muted-foreground/70 text-xs text-center max-w-[240px]">Toque no coração ao abrir um artigo para favoritá-lo.</p>
          </div>
        )}
      </div>
    );

    const playlistContent = loadingPlaylist ? (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Carregando playlist...</p>
      </div>
    ) : (() => {
      const narradosEntries = Object.entries(playlistNarracoes);
      if (narradosEntries.length === 0) {
        return (
          <div className="flex flex-col items-center py-12 gap-2">
            <ListMusic className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Nenhuma narração disponível.</p>
            <p className="text-muted-foreground/60 text-xs">Gere narrações na tela de Narração de Artigos.</p>
          </div>
        );
      }
      const seenNumeros = new Set<string>();
      const narradosArtigos = artigos.filter(a => {
        if (!playlistNarracoes[a.numero]) return false;
        if (seenNumeros.has(a.numero)) return false;
        seenNumeros.add(a.numero);
        return true;
      });
      return (
        <div className="space-y-2 pb-8">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3">
            🎧 {narradosArtigos.length} artigo{narradosArtigos.length !== 1 ? 's' : ''} narrado{narradosArtigos.length !== 1 ? 's' : ''}
          </p>
          {narradosArtigos.map((artigo, i) => {
            const audioUrl = playlistNarracoes[artigo.numero];
            const isPlaying = playingUrl === audioUrl;
            return (
              <motion.div
                key={artigo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="rounded-2xl bg-card hover:bg-secondary/60 transition-all flex overflow-hidden"
              >
                <div className="w-1.5 bg-primary rounded-l-2xl shrink-0" />
                <div className="flex items-center gap-3 p-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => togglePlayAudio(audioUrl)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isPlaying
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/15 text-primary hover:bg-primary/25'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => { setOverlayPanel(null); setOpenArtigo(artigo); }}
                  >
                    <h4 className="font-display text-[15px] font-bold text-primary-light">{artigo.numero}</h4>
                    <p className="text-[13px] leading-relaxed line-clamp-2 text-foreground/80 font-body">
                      {artigo.caput.substring(0, 120)}{artigo.caput.length > 120 ? '...' : ''}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              </motion.div>
            );
          })}
        </div>
      );
    })();

    const anotacoesContent = (
      <div className="space-y-2 pb-8">
        <div className="flex flex-col items-center py-12 gap-2">
          <StickyNote className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Nenhuma anotação ainda.</p>
          <p className="text-muted-foreground/60 text-xs">Grife um trecho e adicione um comentário para criar anotações.</p>
        </div>
      </div>
    );

    const novidadesContent = (() => {
      const modRegex = /\((?:Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vetad[oa]|Regulamento|Vide|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)[^)]*\)/gi;
      const yearRegex = /\b(1\d{3}|20\d{2})\b/;
      const typeRegex = /^\((Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vetad[oa]|Regulamento|Vide|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)/i;

      type ModItem = { artigo: ArtigoLei; tipo: string; referencia: string; ano: number; parteModificada: string; leiNome: string; linhasModificadas: number[]; fromMonitor?: boolean };
      const items: ModItem[] = [];

      for (const artigo of artigos) {
        const lines = artigo.caput.split('\n').filter(l => l.trim());
        const refGroups = new Map<string, { indices: number[]; tipo: string; ref: string; ano: number }>();
        for (let li = 0; li < lines.length; li++) {
          const lineMatches = lines[li].match(modRegex);
          if (!lineMatches) continue;
          const ref = lineMatches[lineMatches.length - 1];
          const refKey = ref.replace(/^\(/, '').replace(/\)$/, '');
          const tm = ref.match(typeRegex);
          const ym = ref.match(yearRegex);
          let tipo = tm ? tm[1].replace(/\s+dada/i, '') : 'Alteração';
          if (/^redaç/i.test(tipo)) tipo = 'Alterada';
          const ano = ym ? parseInt(ym[1]) : 0;
          if (!refGroups.has(refKey)) {
            refGroups.set(refKey, { indices: [], tipo, ref: refKey, ano });
          }
          refGroups.get(refKey)!.indices.push(li);
        }
        if (refGroups.size === 0) continue;
        for (const [refKey, group] of refGroups) {
          let parteModificada = 'Artigo inteiro';
          if (group.indices.length < lines.length) {
            const firstModLine = lines[group.indices[0]];
            if (/^§\s*\d+[º°]?/i.test(firstModLine)) {
              const pMatch = firstModLine.match(/^(§\s*\d+[º°]?)/i);
              parteModificada = pMatch ? pMatch[1].replace(/°/g, 'º') : '§';
            } else if (/^[IVXLC]+\s*[-–.]/i.test(firstModLine)) {
              const iMatch = firstModLine.match(/^([IVXLC]+)/i);
              parteModificada = iMatch ? `Inciso ${iMatch[1]}` : 'Inciso';
            } else if (/^[a-z]\)/i.test(firstModLine)) {
              const aMatch = firstModLine.match(/^([a-z]\))/i);
              parteModificada = aMatch ? `Alínea ${aMatch[1]}` : 'Alínea';
            } else if (/^Parágrafo\s+único/i.test(firstModLine)) {
              parteModificada = 'Parágrafo único';
            } else if (/caput/i.test(refKey)) {
              parteModificada = 'Caput';
            }
            if (group.indices.length > 1) {
              parteModificada += ` (+${group.indices.length - 1})`;
            }
          }
          const leiMatch = refKey.match(/(?:Lei(?:\s+Complementar)?|Decreto(?:-Lei)?|Emenda\s+Constitucional|Medida\s+Provisória)\s+n[º°]?\s*[\d.]+(?:,\s*de\s*\d{4})?/i);
          const leiNome = leiMatch ? leiMatch[0] : refKey;
          items.push({ artigo, tipo: group.tipo, referencia: refKey, ano: group.ano, parteModificada, leiNome, linhasModificadas: group.indices });
        }
      }
      items.sort((a, b) => b.ano - a.ano);

      // Merge DB alteracoes (from monitoramento)
      const parsedKeys = new Set(items.map(i => `${i.artigo.numero}::${i.ano}`));
      for (const dbItem of dbAlteracoes) {
        const ano = dbItem.detectado_em ? new Date(dbItem.detectado_em).getFullYear() : 0;
        const key = `${dbItem.artigo_numero}::${ano}`;
        if (parsedKeys.has(key)) continue; // skip duplicates
        const matchingArtigo = artigos.find(a => a.numero === dbItem.artigo_numero);
        const tipoLabel = dbItem.tipo_alteracao === 'artigo_revogado' ? 'Revogado'
          : dbItem.tipo_alteracao === 'artigo_novo' ? 'Incluído'
          : dbItem.tipo_alteracao === 'texto_alterado' ? 'Alterada'
          : 'Alteração';
        items.push({
          artigo: matchingArtigo || { id: dbItem.artigo_numero, numero: dbItem.artigo_numero, caput: dbItem.texto_atual || dbItem.texto_anterior || '' },
          tipo: tipoLabel,
          referencia: `Detectado pelo monitoramento em ${new Date(dbItem.detectado_em).toLocaleDateString('pt-BR')}`,
          ano,
          parteModificada: 'Artigo inteiro',
          leiNome: 'Monitoramento automático',
          linhasModificadas: [],
          fromMonitor: true,
        });
      }
      items.sort((a, b) => b.ano - a.ano);

      const badgeColor = (tipo: string) => {
        const t = tipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (t.startsWith('revogad')) return 'bg-destructive/20 text-destructive';
        if (t.startsWith('vetad')) return 'bg-destructive/20 text-destructive';
        if (t.startsWith('suprimid')) return 'bg-destructive/20 text-destructive';
        if (t.startsWith('incluid')) return 'bg-emerald-500/20 text-emerald-400';
        if (t.startsWith('acrescid')) return 'bg-emerald-500/20 text-emerald-400';
        if (t.startsWith('redacao') || t.startsWith('alterad')) return 'bg-amber-500/20 text-amber-400';
        if (t.startsWith('renumerad')) return 'bg-sky-500/20 text-sky-400';
        if (t.startsWith('vigencia') || t.startsWith('producao')) return 'bg-violet-500/20 text-violet-400';
        return 'bg-muted text-muted-foreground';
      };

      if (items.length === 0) {
        return loadingDbAlteracoes ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Carregando alterações do monitoramento...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 gap-2">
            <Sparkles className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Nenhuma alteração legislativa encontrada.</p>
          </div>
        );
      }

      const grouped = new Map<number, ModItem[]>();
      for (const item of items) {
        const key = item.ano || 0;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
      }

      return (
        <div className="space-y-6 pb-8">
          {[...grouped.entries()].map(([ano, group]) => (
            <div key={ano}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">{ano > 0 ? ano : 'Sem data'}</h3>
                <span className="text-xs text-muted-foreground">({group.length} {group.length === 1 ? 'alteração' : 'alterações'})</span>
              </div>
              <div className="space-y-2">
                {group.map((item, i) => {
                  const displayNumero = item.artigo.numero;
                  const previewText = item.artigo.caput
                    .replace(/\s*\((?:Redação|Incluído|Revogado|Acrescido|Alterado|Vetado|Vide|Regulamento|Promulgação|Renumerado|Transformado|Suprimido|Restabelecido|Ressalvado|Produção de efeito)[^)]*\)/gi, '')
                    .split('\n').filter(l => l.trim())[0] || '';
                  return (
                    <motion.button
                      key={`${item.artigo.id}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => {
                        setOverlayPanel(null);
                        setOpenFromNovidades(true);
                        setOpenModInfo({
                          tipo: item.tipo,
                          referencia: item.referencia,
                          leiNome: item.leiNome,
                          parteModificada: item.parteModificada,
                          linhasModificadas: item.linhasModificadas,
                        });
                        setOpenArtigo(item.artigo);
                      }}
                      className="w-full text-left rounded-2xl bg-card hover:bg-secondary/60 transition-all group flex overflow-hidden min-h-[82px]"
                    >
                      <div className="w-1.5 bg-primary rounded-l-2xl shrink-0" />
                      <div className="flex-1 min-w-0 p-4">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-display text-[15px] font-bold text-primary-light">{displayNumero}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor(item.tipo)}`}>
                            {item.tipo}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">
                            {item.parteModificada}
                          </span>
                          {item.fromMonitor && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span>
                              Monitoramento
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-1 italic">{item.referencia}</p>
                        {previewText && (
                          <p className="text-[13px] leading-relaxed line-clamp-2 text-foreground/80">{previewText}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-4 mr-3 transition-colors" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    })();

    const radarContent = (
      <RadarLegislacaoContent leiNome={selectedLeiNome} tabelaNome={selectedTabelaNome} navigate={navigate} />
    );

    const overlayLabels: Record<string, { label: string; icon: typeof Star; desc: string }> = {
      fav: { label: 'Favoritos', icon: Heart, desc: 'Aqui ficam os artigos que você marcou com o coração. Favoritar facilita o acesso rápido aos dispositivos que você mais consulta.' },
      playlist: { label: 'Playlist', icon: ListMusic, desc: 'Ouça as narrações dos artigos desta lei. Ideal para estudar enquanto faz outras atividades — basta gerar as narrações na tela de Narração.' },
      anotacoes: { label: 'Anotações', icon: StickyNote, desc: 'Veja todas as suas anotações e grifos desta lei em um só lugar. Para criar, abra um artigo e grife um trecho.' },
      novidades: { label: 'Histórico', icon: History, desc: 'Histórico de alterações legislativas — veja quais artigos foram incluídos, revogados ou modificados, organizados por ano.' },
      radar: { label: 'Radar', icon: Radar, desc: 'Proposições em tramitação no Congresso que podem alterar esta legislação. Acompanhe os projetos de lei em tempo real.' },
    };
    const overlayContents: Record<string, React.ReactNode> = {
      fav: favContent,
      playlist: playlistContent,
      anotacoes: anotacoesContent,
      novidades: novidadesContent,
      radar: radarContent,
    };

    const footerBottomNav = (
      <motion.nav
        initial={{ opacity: 0, y: 14 }}
        animate={showFooter ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ willChange: 'transform, opacity', pointerEvents: showFooter ? 'auto' : 'none' }}
        className="fixed bottom-0 left-0 right-0 z-[58] lg:hidden"
      >
        <div className="bg-secondary/95 backdrop-blur-md border-t border-border rounded-t-3xl shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.45)] pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))]">
          <div className="grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto">
            {[
              { key: 'novidades' as const, icon: History, label: 'Histórico' },
              { key: 'playlist' as const, icon: ListMusic, label: 'Playlist' },
              { key: 'anotacoes' as const, icon: StickyNote, label: 'Anotações' },
              { key: 'radar' as const, icon: Radar, label: 'Radar' },
              { key: 'fav' as const, icon: Heart, label: 'Favoritos' },
            ].map((tab) => {
              const active = overlayPanel === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    if (!isPremium && tab.key === 'radar') {
                      setPremiumGateFeature('radar');
                      setPremiumGateDesc('O Radar Legislativo é exclusivo para assinantes.');
                      setShowPremiumGate(true);
                      return;
                    }
                    setOverlayPanel(tab.key);
                  }}
                  type="button"
                  className={`flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors ${
                    active ? 'text-primary' : 'text-foreground hover:text-primary'
                  }`}
                >
                  <tab.icon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2} fill="none" />
                  <span className="font-body text-[11px] sm:text-[12px] leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.nav>
    );

    const footerOverlayPanels = (
      <AnimatePresence>
        {overlayPanel && (
          <>
            <motion.div
              key={`${overlayPanel}-backdrop`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOverlayPanel(null)}
              className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              key={overlayPanel}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-[60] h-[80vh] bg-[#0f0f0f] border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl lg:max-w-[720px] lg:mx-auto"
              style={{ willChange: 'transform' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 shrink-0">
                <button onClick={() => setOverlayPanel(null)} className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-base font-bold text-foreground truncate">{overlayLabels[overlayPanel]?.label}</h1>
                  <p className="text-xs text-muted-foreground truncate">{selectedLeiNome}</p>
                </div>
              </div>
              {/* Explanatory banner (hidden for Favoritos) */}
              {overlayPanel !== 'fav' && (
                <div className="mx-4 mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 flex gap-3 items-start shrink-0">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {overlayLabels[overlayPanel]?.desc}
                  </p>
                </div>
              )}
              {/* Live monitoring pulse for Novidades & Radar */}
              {(overlayPanel === 'novidades' || overlayPanel === 'radar') && (
                <div className="mx-4 mt-2 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Monitoramento em tempo real
                  </p>
                  <div className="flex-1 h-[1px] relative overflow-hidden rounded-full bg-emerald-500/20">
                    <div className="absolute inset-y-0 w-8 bg-emerald-400/60 rounded-full animate-[liveSlide_2s_ease-in-out_infinite]" />
                  </div>
                </div>
              )}
              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] overscroll-contain">
                {overlayContents[overlayPanel]}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );

    return (
      <div className="min-h-dvh bg-background pb-28 lg:pb-0">
        {/* Cinematic hero cover — sem cabeçalho; botão flutuante em vidro sobre a capa */}
        {(() => {
          const leiColor = getLeiColor(selectedLeiId, tipo);
          const cover = getLeiCover(selectedLeiId, tipo);
          const selectedLei = leis.find(l => l.id === selectedLeiId);
          const planaltoUrl = (selectedLei as any)?.url_planalto;
          return (
            <div
              className="relative overflow-hidden w-full pt-[var(--sai-top,env(safe-area-inset-top,0px))]"
              style={{ aspectRatio: isDesktop ? '21 / 7' : '16 / 10' }}
            >
              <img
                src={cover}
                alt={`Capa — ${selectedLeiNome}`}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Suave tint colorido — deixa os desenhos laterais aparecerem */}
              <div
                className="absolute inset-0 mix-blend-multiply"
                style={{ background: `linear-gradient(135deg, ${leiColor}80 0%, ${shade(leiColor, -0.4)}60 100%)` }}
              />
              {/* Brasão watermark centralizado atrás do título */}
              <img
                src={brasaoImg}
                alt=""
                aria-hidden
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none w-[180px] md:w-[240px] opacity-[0.14] mix-blend-luminosity"
              />
              {/* Degradê inferior — funde com o fundo preto da página */}
              <div
                className="absolute inset-x-0 bottom-0 h-2/3"
                style={{ background: `linear-gradient(180deg, transparent 0%, hsl(var(--background) / 0.55) 55%, hsl(var(--background)) 100%)` }}
              />
              {/* Botão flutuante em vidro — voltar para a rota anterior */}
              <button
                type="button"
                onClick={goBack}
                aria-label="Voltar"
                className="absolute left-4 top-[calc(var(--sai-top,env(safe-area-inset-top,0px))+12px)] z-20 w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none"
              >
                <ArrowLeft className="w-6 h-6 text-white drop-shadow" />
              </button>
              {/* Botão de favoritar a lei — mesma linha do voltar, à direita */}
              {(() => {
                const selectedLei = leis.find((l) => l.id === selectedLeiId);
                if (!selectedLei) return null;
                const fav = isLeiFavorita(selectedLei.id);
                void leiFavToggle; // força re-render em mudanças externas
                return (
                  <button
                    type="button"
                    onClick={() => {
                      toggleLeiFavorito({
                        tipo: selectedLei.tipo,
                        leiId: selectedLei.id,
                        nome: selectedLei.nome,
                        descricao: selectedLei.descricao,
                        tabela_nome: selectedLei.tabela_nome,
                      });
                      setLeiFavToggle((n) => n + 1);
                    }}
                    aria-label={fav ? 'Remover dos favoritos' : 'Favoritar lei'}
                    className={`absolute right-4 top-[calc(var(--sai-top,env(safe-area-inset-top,0px))+12px)] z-20 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl border shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none ${fav ? 'bg-rose-500/25 border-rose-300/50' : 'bg-white/10 border-white/25'}`}
                  >
                    <Heart className={`w-6 h-6 drop-shadow ${fav ? 'text-rose-400 fill-rose-400' : 'text-white'}`} />
                  </button>
                );
              })()}
              {/* Texto */}
              <div className="absolute inset-0 flex flex-col items-center justify-end text-center px-6 pb-5">
                <p
                  className="text-[10px] font-semibold tracking-[0.35em] uppercase mb-2 opacity-80"
                  style={{ color: '#ffffff' }}
                >
                  {config?.label || 'Legislação'}
                </p>
                <h1 className="font-display text-white text-2xl md:text-4xl font-bold uppercase tracking-wide leading-tight drop-shadow-lg">
                  {selectedLeiNome}
                </h1>
                {selectedLeiDescricao && (
                  <p className="text-white/85 text-xs md:text-sm mt-2 max-w-2xl leading-snug">
                    {selectedLeiDescricao}
                  </p>
                )}
                <div
                  className="mt-3 h-0.5 w-16 rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, #ffffff, transparent)` }}
                />
                <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                  {planaltoUrl && (
                    <a
                      href={planaltoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-32 h-9 text-[11px] text-white/90 hover:text-white transition-colors font-medium bg-black/30 backdrop-blur-sm rounded-full border border-white/20 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{/^(estadual|municipal)_/.test(tipo || '') ? 'Ver legislação' : 'Ver no Planalto'}</span>
                    </a>
                  )}

                  {selectedLeiEmenta && (
                    <button
                      type="button"
                      onClick={() => setShowEmentaDialog(true)}
                      className="inline-flex items-center justify-center gap-1.5 w-32 h-9 text-[11px] text-red-100 hover:text-white transition-colors font-medium bg-red-950/40 hover:bg-red-900/50 backdrop-blur-sm rounded-full border border-red-400/40 shrink-0"
                    >
                      <ScrollText className="w-3 h-3" />
                      <span>Ver ementa</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <Dialog open={showEmentaDialog} onOpenChange={setShowEmentaDialog}>
          <DialogContent className="max-w-lg border-red-400/30 bg-gradient-to-b from-red-950/40 to-background/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-200">
                <ScrollText className="w-4 h-4" />
                Ementa
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm md:text-[15px] italic leading-relaxed text-red-100/95 whitespace-pre-line">
              {selectedLeiEmenta}
            </p>
          </DialogContent>
        </Dialog>


        <div id="lei-conteudo" className={`mx-auto px-2 sm:px-4 md:px-6 pt-4 space-y-4 scroll-mt-2 ${isDesktop ? 'max-w-7xl' : 'max-w-5xl'}`}>


          {/* Search bar + Tabs — entram juntos com fade sutil (evita "pop") */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1], delay: 0.06 }}
            className="space-y-4"
          >
            <div ref={searchBarRef} className={`mx-auto ${isDesktop ? 'max-w-xl w-full' : 'w-full'}`}>
              <form
                className="flex items-center gap-2.5 min-w-0"
                onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              >
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
                  <Input
                    value={voiceSearch.listening ? (voiceSearch.partial || searchQuery) : searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar artigo..."
                    className="h-12 rounded-2xl bg-secondary border-border pl-10 pr-20 text-sm font-medium"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery && !voiceSearch.listening && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); handleSearch(''); }}
                        className="p-1.5 rounded-full hover:bg-background/40 text-muted-foreground"
                        aria-label="Limpar busca"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOcrOpen(true)}
                      aria-label="Fotografar artigo (OCR)"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => voiceSearch.toggle()}
                  aria-label={voiceSearch.listening ? 'Parar gravação' : 'Buscar por voz'}
                  className={`relative overflow-hidden shrink-0 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-[0.95] transition ${
                    voiceSearch.listening
                      ? 'bg-red-500 text-white animate-pulse shadow-red-500/40'
                      : 'bg-primary text-primary-foreground shadow-primary/30'
                  }`}
                >
                  {voiceSearch.listening && <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />}
                  {voiceSearch.listening
                    ? <MicOff className="w-6 h-6 relative z-[2]" strokeWidth={2.5} />
                    : <Mic className="w-6 h-6 relative z-[2]" strokeWidth={2.5} />}
                </button>
              </form>
            </div>

            {/* Tabs: Artigos / Capítulos / Recentes / Lotes — sempre renderizadas para evitar layout shift */}
            <div className={`mx-auto flex flex-col gap-3 ${isDesktop ? 'max-w-xl w-full' : 'w-full'}`}>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'art' as const, icon: FileText, label: 'Artigos' },
                  { key: 'cap' as const, icon: BookOpen, label: 'Capítulos' },
                  { key: 'lot' as const, icon: LayoutGrid, label: 'Lotes' },
                  { key: 'rec' as const, icon: History, label: 'Recentes' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    disabled={loadingArtigos}
                    className={`flex items-center justify-center gap-1.5 px-1.5 py-3 md:py-3.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                      activeTab === tab.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:text-foreground'
                    } ${loadingArtigos ? 'opacity-70' : ''}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>





          {/* Sticky floating audio search */}
          <AnimatePresence>
            {stickySearch && (
              <motion.div
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-2.5 shadow-lg"
              >
                <div className={`mx-auto ${isDesktop ? 'max-w-xl w-full' : 'w-full'}`}>
                  <form className="relative min-w-0" onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={voiceSearch.listening ? (voiceSearch.partial || searchQuery) : searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar artigo"
                      className="h-11 rounded-xl bg-secondary border-border pl-9 pr-12 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => voiceSearch.toggle()}
                      aria-label={voiceSearch.listening ? 'Parar gravação' : 'Buscar por voz'}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center ${voiceSearch.listening ? 'bg-red-500/20 text-red-500' : 'bg-primary/10 text-primary'}`}
                    >
                      {voiceSearch.listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lista entra depois de search+abas, com fade curto */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1], delay: 0.16 }}
          >
            {isDesktop ? (
              <div className="flex gap-6">
                {/* Chapters sidebar */}
                <div className="w-[260px] shrink-0 sticky top-4 self-start max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl bg-card border border-border p-3">
                  {chaptersPanel}
                </div>
                {/* Articles */}
                <div className="flex-1 min-w-0">
                  {articlesContent}
                </div>
              </div>
            ) : (
              articlesContent
            )}
          </motion.div>
        </div>

        {/* Floating glass controls once user descended past the cover */}
        <AnimatePresence>
          {showScrollTop && (
            <>
              <motion.button
                key="back-glass"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                onClick={goBack}
                aria-label="Voltar"
                className="fixed left-4 top-[calc(var(--sai-top,env(safe-area-inset-top,0px))+12px)] z-40 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </motion.button>
              <motion.button
                key="up-glass"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18 }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="Voltar ao topo"
                className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-white active:scale-95 transition"
              >
                <ArrowUp className="w-5 h-5" />
              </motion.button>
            </>
          )}
        </AnimatePresence>

        <ArtigoBottomSheet
          artigo={openArtigo}
          onClose={() => { setOpenArtigo(null); setOpenFromNovidades(false); setOpenModInfo(null); setSearchQuery(''); }}
          forceShowRedacao={openFromNovidades}
          modificationInfo={openModInfo}
          isFavorito={openArtigo ? isArtigoFav(openArtigo) : false}
          onToggleFavorito={() => openArtigo && toggleFavorito(openArtigo.id)}
          showNomenJuris={selectedLeiId === 'cp' || selectedLeiId === 'cpm'}
          tabelaNome={selectedTabelaNome || undefined}
          breadcrumb={(() => {
            try {
              if (!openArtigo) return null;
              const idx = artigos.findIndex(a => a.id === openArtigo.id);
              if (idx < 0) return null;
              const LEVELS = ['LIVRO', 'PARTE', 'TITULO', 'CAPITULO', 'SECAO', 'SUBSECAO'] as const;
              type Level = typeof LEVELS[number];
              const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
              const detectLevel = (num: string): Level | null => {
                const n = normalize(num || '');
                for (const l of LEVELS) {
                  if (new RegExp('^' + l + '\\b').test(n)) return l;
                }
                return null;
              };
              const found: { [K in Level]?: { head: string; desc?: string } } = {};
              for (let i = idx - 1; i >= 0; i--) {
                const a = artigos[i] as any;
                const num: string = a?.numero || '';
                const level = detectLevel(num);
                if (!level || found[level]) continue;
                const rawText: string = (a?.caput || a?.texto || num || '').toString();
                const lines = rawText.split('\n').map((s: string) => s.trim()).filter(Boolean);
                const head = (lines[0] || num).toUpperCase();
                const desc = lines.slice(1).join(' — ');
                found[level] = { head, desc: desc || undefined };
              }
              const ordered = LEVELS.filter(l => found[l]);
              if (ordered.length === 0) return null;
              const child = ordered[ordered.length - 1];
              const parent = ordered.length > 1 ? ordered[ordered.length - 2] : undefined;
              const childEntry = found[child];
              const parentEntry = parent ? found[parent] : undefined;
              return {
                parte: parentEntry ? parentEntry.head : undefined,
                titulo: childEntry ? childEntry.head : undefined,
                tituloDesc: childEntry ? childEntry.desc : undefined,
              };
            } catch (e) {
              console.warn('breadcrumb build failed', e);
              return null;
            }
          })()}
        />
        {selectedTabelaNome && (
          <GrafoOverlay
            open={showGrafo}
            onClose={() => setShowGrafo(false)}
            tabelaNome={selectedTabelaNome}
            leiNome={selectedLeiNome || undefined}
          />
        )}

        {/* Footer bottom nav — portal evita ficar preso na transição da página */}
        {typeof document !== 'undefined' && createPortal(footerBottomNav, document.body)}
        {typeof document !== 'undefined' && createPortal(footerOverlayPanels, document.body)}

        <PremiumGate open={showPremiumGate} onClose={() => setShowPremiumGate(false)} feature={premiumGateFeature} description={premiumGateDesc} />

        <OcrScanner
          open={ocrOpen}
          onClose={() => setOcrOpen(false)}
          leiNome={selectedLeiNome}
          leiSlug={selectedTabelaNome}
          onArtigoSelect={(numero) => {
            const clean = String(numero).replace(/[^\d]/g, '');
            const found = artigos.find(a => String(a.numero).replace(/[^\d]/g, '') === clean);
            if (found) {
              openArtigoWithRecent(found);
            } else {
              setSearchQuery(clean);
              handleSearch(clean);
            }
          }}
        />

      </div>
    );
  }

  // Nenhuma tela de lista intermediária: qualquer categoria sem lei selecionada
  // (e sem slug pendente de resolução) volta para a home.
  if ((leiSlugParam || tipo === 'constituicao') && !selectedLeiId) {
    // Aguardando o efeito resolver o slug em uma lei do catálogo.
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <PremiumGate open={showPremiumGate} onClose={() => setShowPremiumGate(false)} feature={premiumGateFeature} description={premiumGateDesc} />
      </div>
    );
  }

  return <Navigate to="/" replace />;
  };

export default CategoriaLegislacao;
