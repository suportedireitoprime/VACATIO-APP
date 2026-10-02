import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { Search, X, BookMarked, Gavel, ArrowRight, Zap, MessageCircle, ScrollText, Feather, Heart, Wrench, ShieldAlert, House, CircleDollarSign, Landmark, FileText, ShieldCheck, Briefcase, Store, Building, Vote, HeartPulse, TreePine, ShoppingCart, Baby, Shield, Globe, ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import FavoritosPage from './pessoal/Favoritos';
import AnotacoesPage from './pessoal/Anotacoes';
import GrifosPage from './pessoal/Grifos';
import FerramentasPage from './Ferramentas';

import DesktopTopHeader from '@/components/vademecum/DesktopTopHeader';
import ShapeGrid from '@/components/ui/ShapeGrid';
import HeroMotifs from '@/components/vademecum/HeroMotifs';
import HomeCard from '@/components/vademecum/HomeCard';

import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import { LAW_ICON_MAP, CODIGO_DISPLAY_NAMES, ESTATUTO_DISPLAY_NAMES } from '@/data/lawDisplay';
import { pushRecente } from '@/lib/leisRecentes';
import { leiPath, leiToSlug, tipoToSlug } from '@/lib/legislacaoSlugs';
import { prefetchAllArtigos } from '@/services/legislacaoService';
import { prefetchResenha } from '@/services/atualizacaoService';
import { prefetchNoticias } from '@/services/noticiasService';
import DesktopNewsGrid from '@/components/desktop/DesktopNewsGrid';
import { warmCoverCache } from '@/lib/coverLoader';

const SearchOverlay = lazy(() => import('@/components/vademecum/SearchOverlay'));
const AssistenteOverlay = lazy(() => import('@/components/vademecum/AssistenteOverlay'));

const normalizeText = (val: string) =>
  val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const EM_ALTA_IDS = ['constituicao', 'codigo-civil', 'codigo-penal', 'clt', 'cpc', 'cpp'];

type TabType = 'todos' | 'constituicao' | 'codigo' | 'estatuto' | 'leis-especiais' | 'leis-complementares';

interface AreaCat { id: string; label: string; sublabel: string; icon: LucideIcon; color: string; leiIds: string[]; }
const AREA_CATS: AreaCat[] = [
  { id: 'area-penal',          label: 'Penal',          sublabel: 'CP, CPP, LEP, Lei Maria da Penha…',          icon: ShieldAlert, color: '#EF4444', leiIds: ['cp','cpp','lep','lmp','ld','loc','laa','lcp','lch','ltort','lcsf','lpt','laa'] },
  { id: 'area-civil',          label: 'Civil',          sublabel: 'CC, LI, LRP, alimentos, alienação…',          icon: House,       color: '#3B82F6', leiIds: ['cc','li','lrp','lalim','lalp','lgpd','mci','ld','laa'] },
  { id: 'area-tributario',     label: 'Tributário',     sublabel: 'CTN, LRF, Reforma Tributária…',              icon: CircleDollarSign, color: '#10B981', leiIds: ['ctn','lrf','lrt'] },
  { id: 'area-constitucional', label: 'Constitucional', sublabel: 'CF/88, LINDB, LPAF, LAI…',                  icon: Landmark,    color: '#FACC15', leiIds: ['cf88','lindb','lpaf','lai','lap','lap','lmi','lms','lhd'] },
  { id: 'area-processual-civil',  label: 'Processual Civil',  sublabel: 'CPC, LJE, mandado de segurança…',       icon: FileText,    color: '#F59E0B', leiIds: ['cpc','lje','lms','lmi','lhd'] },
  { id: 'area-processual-penal',  label: 'Processual Penal',  sublabel: 'CPP, interceptação, mandado…',        icon: ShieldCheck, color: '#F97316', leiIds: ['cpp','lit','lpt','lms'] },
  { id: 'area-trabalho',       label: 'Trabalho',    sublabel: 'CLT, legislação trabalhista…',              icon: Briefcase,   color: '#8B5CF6', leiIds: ['clt'] },
  { id: 'area-empresarial',    label: 'Empresarial',    sublabel: 'CCom, LSA, LF, arbitragem, startups…',      icon: Store,       color: '#A855F7', leiIds: ['ccom','lsa','lf','la','lpi','lace','lcon','lppp','lmls','lda','eme','lfl'] },
  { id: 'area-administrativo', label: 'Administrativo', sublabel: 'LIA, LPAF, licitações, improbidade…',       icon: Building,    color: '#06B6D4', leiIds: ['lia','lpaf','nll','lai','lms','l8112','loman','lotcu','ces'] },
  { id: 'area-eleitoral',      label: 'Eleitoral',      sublabel: 'CE, LPP, Lei das Eleições, Ficha Limpa…',   icon: Vote,        color: '#6366F1', leiIds: ['ce','lpp','lele','lfl','line'] },
  { id: 'area-previdenciario', label: 'Previdenciário', sublabel: 'LBPS, LCSS, LPC, LOAS…',                    icon: HeartPulse,  color: '#14B8A6', leiIds: ['lbps','lcss','lpc','loas'] },
  { id: 'area-ambiental',      label: 'Ambiental',      sublabel: 'Código Florestal, crimes ambientais, biossegurança…', icon: TreePine, color: '#16A34A', leiIds: ['cflor','lca','lbio'] },
  { id: 'area-consumidor',     label: 'Consumidor',  sublabel: 'CDC, defesa do consumidor…',                icon: ShoppingCart, color: '#EC4899', leiIds: ['cdc'] },
  { id: 'area-crianca-idoso',  label: 'Criança, Idoso e PCD',   sublabel: 'ECA, Estatuto do Idoso, EPD…',              icon: Baby,        color: '#F43F5E', leiIds: ['eca','ei','epd'] },
  { id: 'area-militar',        label: 'Militar',        sublabel: 'CPM, CPPM, Estatuto dos Militares…',        icon: Shield,      color: '#64748B', leiIds: ['cpm','cppm','em'] },
  { id: 'area-internacional',  label: 'Internacional',  sublabel: 'Estatuto da Migração, Refugiado…',          icon: Globe,       color: '#0891B2', leiIds: ['emig','eref'] },
];

const IndexDesktop = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistenteOpen, setAssistenteOpen] = useState(false);
  const [activeArea, setActiveArea] = useState<AreaCat | null>(null);
  const [modalOpen, setModalOpen] = useState<'favoritos' | 'anotacoes' | 'grifos' | 'ferramentas' | null>(null);

  useHotkeys('mod+k', (e) => { e.preventDefault(); setSearchOpen(true); }, { enableOnFormTags: true });
  useHotkeys('escape', () => { setSearchOpen(false); setAssistenteOpen(false); });

  useEffect(() => { warmCoverCache(); }, []);

  useEffect(() => {
    const ric: (cb: () => void) => number = (window as any).requestIdleCallback
      ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 1500 })
      : (cb) => window.setTimeout(cb, 300);
    const id = ric(() => {
      prefetchAllArtigos(4);
      prefetchResenha();
      prefetchNoticias();
    });
    return () => {
      const cic = (window as any).cancelIdleCallback;
      if (cic) cic(id); else window.clearTimeout(id);
    };
  }, []);

  const handleSearchSelectLei = (lei: { tipo: string; leiId: string; nome: string; descricao: string; tabela_nome: string; artigoNumero?: string }) => {
    pushRecente({ tipo: lei.tipo, leiId: lei.leiId, nome: lei.nome, descricao: lei.descricao, tabela_nome: lei.tabela_nome });
    const slug = leiToSlug({ id: lei.leiId, nome: lei.nome });
    const base = `/legislacao/${tipoToSlug(lei.tipo)}/${slug}`;
    navigate(lei.artigoNumero ? `${base}/${encodeURIComponent(lei.artigoNumero)}` : base);
  };

  const handleOpenLei = (lei: LeiCatalogItem) => {
    pushRecente({
      tipo: lei.tipo,
      leiId: lei.id,
      nome: lei.nome,
      descricao: lei.descricao,
      tabela_nome: lei.tabela_nome,
    });
    navigate(leiPath(lei));
  };

  const emAltaItems = useMemo(() => {
    return EM_ALTA_IDS.map(id => LEIS_CATALOG.find(l => l.id === id)).filter(Boolean) as LeiCatalogItem[];
  }, []);

  const filteredItems = useMemo(() => {
    let base = LEIS_CATALOG;
    if (activeTab === 'constituicao') {
      base = base.filter(l => l.id === 'constituicao');
    } else if (activeTab === 'codigo') {
      base = base.filter(l => l.tipo === 'codigo');
    } else if (activeTab === 'estatuto') {
      base = base.filter(l => l.tipo === 'estatuto');
    } else if (activeTab === 'todos' && activeArea) {
      const ids = new Set(activeArea.leiIds);
      base = base.filter(l => ids.has(l.id));
    }

    const query = normalizeText(searchQuery.trim());
    if (!query) return base;

    return base.filter((lei) => {
      const isCodigo = lei.tipo === 'codigo';
      const displayNames = isCodigo ? CODIGO_DISPLAY_NAMES : ESTATUTO_DISPLAY_NAMES;
      const custom = displayNames[lei.id];
      const customLabel = custom ? custom.label : '';
      const customSub = custom ? custom.sublabel : '';
      const tags = (lei.tags || []).join(' ');

      const haystack = normalizeText(
        `${lei.sigla} ${lei.nome} ${lei.descricao} ${customLabel} ${customSub} ${tags}`
      );
      return haystack.includes(query);
    });
  }, [searchQuery, activeTab]);

  return (
    <div className="min-h-dvh bg-[#050505] flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <ShapeGrid 
          speed={0.5} 
          squareSize={40}
          direction='diagonal'
          borderColor='rgba(255, 255, 255, 0.05)'
          hoverFillColor='rgba(255, 255, 255, 0.1)'
          shape='square'
          hoverTrailAmount={5}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-0 w-full">
        {/* TOP HEADER PRESERVADO */}
        <DesktopTopHeader onAssistenteClick={() => setAssistenteOpen(true)} />

        <div className="flex-1 min-w-0 overflow-y-auto pb-12">
          {/* MENU SUPERIOR (ALTERNÂNCIA) */}
          <div className="w-full bg-black/20 border-b border-white/5 relative z-30 mb-2">
            <div className="max-w-7xl mx-auto px-8 py-4 flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { label: 'Favoritos', icon: Heart, color: 'text-red-400', bg: 'bg-red-400/10', action: () => setModalOpen('favoritos') },
                { label: 'Anotações', icon: ScrollText, color: 'text-sky-400', bg: 'bg-sky-400/10', action: () => setModalOpen('anotacoes') },
                { label: 'Grifos', icon: Feather, color: 'text-emerald-400', bg: 'bg-emerald-400/10', action: () => setModalOpen('grifos') },
                { label: 'Chat', icon: MessageCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', action: () => setAssistenteOpen(true) },
                { label: 'Ferramentas', icon: Wrench, color: 'text-purple-400', bg: 'bg-purple-400/10', action: () => setModalOpen('ferramentas') },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 backdrop-blur-md transition-all cursor-pointer shrink-0"
                >
                   <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg}`}>
                     <item.icon className={`w-4 h-4 ${item.color} group-hover:scale-110 transition-transform`} strokeWidth={2.5} />
                   </div>
                   <span className="font-display font-bold text-[14px] text-white/90 uppercase tracking-wider group-hover:text-white pr-1">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* HERO VERMELHO COM ACESSO RÁPIDO */}
          <div
            className="bg-hero-panel-yellow relative overflow-hidden rounded-b-[36px] shadow-2xl shadow-black/60 pt-6 pb-12 [@media(max-height:800px)]:pb-6 flex flex-col z-20"
            style={{ backgroundColor: '#050505' }}
          >
            {/* Overlay vermelho com gradiente */}
            <div
              className="absolute inset-0 z-[1] pointer-events-none"
              style={{ filter: 'drop-shadow(25px 0 25px rgba(0,0,0,0.8)) drop-shadow(8px 0 10px rgba(0,0,0,0.95))' }}
            >
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 55%, hsl(var(--primary)) 100%)',
                  }}
                />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.16),transparent_65%)] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                {/* Motifs jurídicos clássicos com leve efeito flutuante (Parallax/Idle) */}
                <div className="absolute inset-0 animate-[pulse_12s_ease-in-out_infinite]">
                  <HeroMotifs />
                </div>

                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />
              </div>
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-8 flex flex-col lg:flex-row items-center gap-12 mt-6">
              {/* LADO ESQUERDO: Título e Busca */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full border-2 border-white/90 bg-primary flex items-center justify-center overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.5)] logo-shine">
                    <BookMarked className="w-6 h-6 text-primary-foreground" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h1 className="font-serif italic text-white text-[28px] leading-[1.05] font-bold tracking-tight drop-shadow-md">
                      VACATIO VADEMECUM
                    </h1>
                    <p className="font-body text-white/95 text-[11px] font-bold tracking-[0.22em] uppercase mt-1 drop-shadow-md">
                      TODA A LEGISLAÇÃO BRASILEIRA
                    </p>
                  </div>
                </div>

                <p className="text-white/80 font-body text-sm max-w-lg mb-8 leading-relaxed">
                  Lei seca, comentários, explicações artigo por artigo, narração, resumos e muito mais para você <strong className="text-white">dominar o Direito</strong>.
                </p>

                <button autoFocus className="relative w-full max-w-2xl text-left flex items-center h-16 pl-14 pr-[116px] rounded-2xl bg-black/65 backdrop-blur-md border border-white/15 shadow-lg shadow-black/30 search-bar-shine cursor-pointer group hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-colors" onClick={() => setSearchOpen(true)}>
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-primary shrink-0 pointer-events-none group-hover:scale-110 transition-transform"
                    strokeWidth={2.2}
                  />
                  <span className="w-full text-white/50 text-[15px] font-body">Buscar lei ou artigo (ex: Código Penal, CLT)...</span>
                  <div
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-12 px-5 rounded-xl bg-hero-panel text-white font-display text-[13px] font-bold tracking-wider flex items-center justify-center pointer-events-none uppercase shadow-md shadow-red-950/40"
                    style={{
                      background: 'linear-gradient(135deg, hsl(350 68% 32%) 0%, hsl(350 74% 42%) 50%, hsl(348 80% 50%) 100%)',
                    }}
                  >
                    PESQUISAR
                  </div>
                </button>
              </div>

              {/* LADO DIREITO: Acesso Rápido - Em Alta */}
              <div className="w-full lg:w-[380px] shrink-0">
                <div className="bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl p-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-white font-display font-bold text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary fill-primary" />
                      Acesso Rápido — Em Alta
                    </h3>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {emAltaItems.map((lei) => {
                      const displayNames = lei.tipo === 'codigo' ? CODIGO_DISPLAY_NAMES : ESTATUTO_DISPLAY_NAMES;
                      const custom = displayNames[lei.id];
                      const label = custom ? custom.label : lei.sigla || lei.nome;
                      return (
                        <button
                          key={lei.id}
                          onClick={() => handleOpenLei(lei)}
                          className="flex items-center justify-between w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                              <Gavel className="w-5 h-5" />
                            </div>
                            <span className="font-display font-bold text-[14px] text-white/90 group-hover:text-white transition-colors">{label}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CATÁLOGO ABAIXO DO HERO */}
          <main className="max-w-7xl mx-auto px-8 py-8">
            {/* TABS */}
            <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-white/5 pb-4">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'constituicao', label: 'Constituição' },
                { id: 'codigo', label: 'Códigos' },
                { id: 'estatuto', label: 'Estatutos' },
                { id: 'leis-especiais', label: 'Leis Especiais' },
                { id: 'leis-complementares', label: 'Complementares' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as TabType); setActiveArea(null); setSearchQuery(''); }}
                  className={`px-6 py-3 text-[15px] font-display font-bold uppercase tracking-wider rounded-full transition-all border ${
                    activeTab === tab.id
                      ? 'bg-primary border-primary text-primary-foreground shadow-md'
                      : 'bg-black/40 backdrop-blur-md border-white/10 text-white/70 hover:text-white hover:bg-black/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button className="ml-2 px-5 py-3 text-[15px] font-display font-bold uppercase tracking-wider rounded-full transition-all border bg-black/40 backdrop-blur-md border-white/10 text-white/70 hover:text-white hover:bg-black/60 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list-filter"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
                Filtros
              </button>
              
              <div className="ml-auto relative w-64 hidden md:block">
                 <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar catálogo..."
                    className="w-full h-10 pl-10 pr-4 rounded-full bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-colors"
                 />
                 <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
                 {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                       <X className="w-4 h-4 text-white/40 hover:text-white" />
                    </button>
                 )}
              </div>
            </div>

            {/* Áreas do Direito (se Todos e nenhuma área selecionada) */}
            {activeTab === 'todos' && !activeArea && !searchQuery ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {AREA_CATS.map((area, i) => (
                  <HomeCard
                    key={area.id}
                    icon={area.icon}
                    label={area.label}
                    sublabel={`${area.leiIds.length} leis disponíveis`}
                    color={area.color}
                    delay={Math.min(i * 0.015, 0.2)}
                    className="min-h-[116px] py-4 px-4"
                    onClick={() => setActiveArea(area)}
                    data-track="desktop_home_area_click"
                    data-track-name={area.label}
                  />
                ))}
              </div>
            ) : (
              <>
                {activeArea && (
                  <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                    <button
                      onClick={() => setActiveArea(null)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/80 hover:text-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                        <activeArea.icon className="w-5 h-5" style={{ color: activeArea.color }} />
                        {activeArea.label}
                      </h2>
                      <p className="font-body text-sm text-white/50 mt-0.5">{activeArea.sublabel}</p>
                    </div>
                  </div>
                )}
                {/* Grid de Cards das Leis */}
                {filteredItems.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {filteredItems.map((lei, i) => {
                  const Icon = LAW_ICON_MAP[lei.id] || (lei.tipo === 'codigo' ? Gavel : BookMarked);
                  const isCodigo = lei.tipo === 'codigo';
                  const displayNames = isCodigo ? CODIGO_DISPLAY_NAMES : ESTATUTO_DISPLAY_NAMES;
                  const custom = displayNames[lei.id];
                  const cardLabel = custom ? custom.label : lei.sigla || lei.nome;
                  const cardSublabel = custom ? custom.sublabel : lei.descricao;
                  const badge = EM_ALTA_IDS.includes(lei.id) ? 'ATUALIZADO' : undefined;

                  return (
                    <HomeCard
                      key={lei.id}
                      icon={Icon}
                      label={cardLabel}
                      sublabel={cardSublabel}
                      color={lei.iconColor || (isCodigo ? '#F59E0B' : '#3B82F6')}
                      statusBadge={badge}
                      inlineTitle={true}
                      delay={Math.min(i * 0.015, 0.2)}
                      className="min-h-[116px] py-4 px-4"
                      onClick={() => handleOpenLei(lei)}
                      data-track="desktop_home_card_click"
                      data-track-name={cardLabel}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 px-4 rounded-3xl bg-white/5 border border-white/10">
                <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="font-display text-white text-xl font-bold">
                  Nenhum documento encontrado
                </p>
                <p className="font-body text-white/50 text-base mt-2">
                  Não encontramos resultados para &quot;{searchQuery}&quot; nesta categoria.
                </p>
              </div>
            )}
            </>
            )}
          </main>

          {/* Notícias em Grid de Revista */}
          <DesktopNewsGrid />
        </div>

        <Suspense fallback={null}>
          {searchOpen && (
            <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onSelectLei={handleSearchSelectLei} />
          )}
          {assistenteOpen && (
            <AssistenteOverlay open={assistenteOpen} onClose={() => setAssistenteOpen(false)} />
          )}
        </Suspense>

        {/* Modals de Funcionalidades */}
        <Dialog open={modalOpen === 'favoritos'} onOpenChange={(v) => !v && setModalOpen(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border max-h-[85vh] overflow-y-auto">
            <FavoritosPage onClose={() => setModalOpen(null)} />
          </DialogContent>
        </Dialog>
        
        <Dialog open={modalOpen === 'anotacoes'} onOpenChange={(v) => !v && setModalOpen(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border max-h-[85vh] overflow-y-auto">
            <AnotacoesPage onClose={() => setModalOpen(null)} />
          </DialogContent>
        </Dialog>
        
        <Dialog open={modalOpen === 'grifos'} onOpenChange={(v) => !v && setModalOpen(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border max-h-[85vh] overflow-y-auto">
            <GrifosPage onClose={() => setModalOpen(null)} />
          </DialogContent>
        </Dialog>
        
        <Dialog open={modalOpen === 'ferramentas'} onOpenChange={(v) => !v && setModalOpen(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border max-h-[85vh] overflow-y-auto">
            <FerramentasPage />
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default IndexDesktop;