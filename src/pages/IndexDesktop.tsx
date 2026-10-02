import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { Search, X, BookMarked, Gavel, ArrowRight, Zap } from 'lucide-react';

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

const IndexDesktop = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistenteOpen, setAssistenteOpen] = useState(false);

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
          {/* HERO VERMELHO COM ACESSO RÁPIDO */}
          <div
            className="bg-hero-panel-yellow relative overflow-hidden rounded-b-[36px] shadow-2xl shadow-black/60 pt-6 pb-12 flex flex-col z-20"
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

                {/* Motifs jurídicos clássicos */}
                <HeroMotifs />

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

                <div className="relative w-full max-w-lg flex items-center h-16 pl-14 pr-[116px] rounded-2xl bg-black/65 backdrop-blur-md border border-white/15 shadow-lg shadow-black/30 search-bar-shine cursor-pointer group hover:border-white/30 transition-colors" onClick={() => setSearchOpen(true)}>
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
                </div>
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
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`px-5 py-2.5 text-[14px] font-display font-bold uppercase tracking-wider rounded-full transition-all border ${
                    activeTab === tab.id
                      ? 'bg-primary border-primary text-primary-foreground shadow-md'
                      : 'bg-black/40 backdrop-blur-md border-white/10 text-white/70 hover:text-white hover:bg-black/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              
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

            {/* Grid de Cards */}
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((lei, i) => {
                  const Icon = LAW_ICON_MAP[lei.id] || (lei.tipo === 'codigo' ? Gavel : BookMarked);
                  const isCodigo = lei.tipo === 'codigo';
                  const displayNames = isCodigo ? CODIGO_DISPLAY_NAMES : ESTATUTO_DISPLAY_NAMES;
                  const custom = displayNames[lei.id];
                  const cardLabel = custom ? custom.label : lei.sigla || lei.nome;
                  const cardSublabel = custom ? custom.sublabel : lei.descricao;

                  return (
                    <HomeCard
                      key={lei.id}
                      icon={Icon}
                      label={cardLabel}
                      sublabel={cardSublabel}
                      color={lei.iconColor || (isCodigo ? '#F59E0B' : '#3B82F6')}
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
          </main>
        </div>

        <Suspense fallback={null}>
          {searchOpen && (
            <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onSelectLei={handleSearchSelectLei} />
          )}
          {assistenteOpen && (
            <AssistenteOverlay open={assistenteOpen} onClose={() => setAssistenteOpen(false)} />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default IndexDesktop;