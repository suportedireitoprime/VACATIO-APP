import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { Scale, BookOpen, Gavel, Timer, BookOpenText, ScanEye, Sparkles, GraduationCap, Library, Wrench, MessageSquare, Newspaper, User as UserFn } from 'lucide-react';
import heroImageAsset from '@/assets/hero-vademecum.webp';
const heroImage = heroImageAsset;
import vacatioLogoAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import vacatioLogoBundled from '@/assets/bundled/logo-vacatio-v2.webp';
import { pickAsset } from '@/lib/assetUrl';
const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);
import camaraHeroAsset from '@/assets/radar/camara-hero.webp';
const camaraHero = camaraHeroAsset;
import senadoHeroAsset from '@/assets/radar/senado-hero.webp';
const senadoHero = senadoHeroAsset;
import DesktopNewsSidebar from '@/components/vademecum/DesktopNewsSidebar';
import DesktopHeroBanner from '@/components/vademecum/DesktopHeroBanner';
import DesktopTopHeader from '@/components/vademecum/DesktopTopHeader';
import DesktopOnboardingOverlay from '@/components/desktop/DesktopOnboardingOverlay';
import DesktopBreadcrumb from '@/components/vademecum/DesktopBreadcrumb';
import DesktopSidebar from '@/components/vademecum/DesktopSidebar';
import AtualizacaoTab from '@/components/vademecum/AtualizacaoTab';
import AtalhosCarousel from '@/components/vademecum/AtalhosCarousel';
import HomeNoticiasCarousel from '@/components/vademecum/HomeNoticiasCarousel';
import DesktopFunctionRow from '@/components/vademecum/DesktopFunctionRow';
import ContinueBanner from '@/components/desktop/ContinueBanner';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { leiPath, tipoToSlug, leiToSlug } from '@/lib/legislacaoSlugs';
// Overlays only mount when opened — lazy so they don't inflate the initial
// desktop chunk.
const SearchOverlay = lazy(() => import('@/components/vademecum/SearchOverlay'));
const AssistenteOverlay = lazy(() => import('@/components/vademecum/AssistenteOverlay'));
import { prefetchAllArtigos } from '@/services/legislacaoService';
import { prefetchResenha } from '@/services/atualizacaoService';
import { prefetchNoticias } from '@/services/noticiasService';
import { pushRecente } from '@/lib/leisRecentes';
import { warmCoverCache } from '@/lib/coverLoader';

const HERO_CONFIG: Record<string, { image: string; title: string }> = {
  radar: { image: camaraHero, title: 'Radar Legislativo' },
  legislacao: { image: heroImage, title: 'Legislação' },
  noticias: { image: senadoHero, title: 'Aprender' },
};

type Tab = 'legislacao' | 'noticias' | 'ferramentas';

const DESKTOP_TABS: { id: string; label: string; icon: typeof Scale }[] = [
  { id: 'legislacao', label: 'Legislação', icon: Scale },
  { id: 'biblioteca', label: 'Biblioteca', icon: Library },
  { id: 'ferramentas', label: 'Ferramentas', icon: Gavel },
];

const DESKTOP_TOOLS = [
  { id: 'dicionario', label: 'Dicionário Jurídico', desc: 'Consulte termos e conceitos do Direito', icon: BookOpenText, color: 'from-primary/80 to-primary/50' },
  { id: 'radar360', label: 'Radar 360', desc: 'Alterações recentes e projetos de lei', icon: ScanEye, color: 'from-primary/90 to-primary/60' },
  { id: 'assistente', label: 'Assistente IA', desc: 'IA jurídica para tirar dúvidas', icon: Sparkles, color: 'from-primary/70 to-primary' },
  { id: 'estudar', label: 'Estudar', desc: 'Questões e flashcards por IA', icon: GraduationCap, color: 'from-primary to-primary/80' },
];

const IndexDesktop = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('legislacao');
  const [searchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistenteOpen, setAssistenteOpen] = useState(false);
  const [typingHint, setTypingHint] = useState('');

  useHotkeys('mod+k', (e) => { e.preventDefault(); setSearchOpen(true); }, { enableOnFormTags: true });
  useHotkeys('escape', () => { setSearchOpen(false); setAssistenteOpen(false); });

  useEffect(() => { warmCoverCache(); }, []);

  useEffect(() => {
    const hints = ['Buscar lei...', 'Ler artigo...', 'Consultar código...', 'Pesquisar jurisprudência...'];
    let hintIndex = 0;
    let charIndex = 0;
    let direction = 1;
    let pauseCounter = 0;
    const interval = setInterval(() => {
      if (pauseCounter > 0) { pauseCounter--; return; }
      const current = hints[hintIndex];
      if (direction === 1) {
        charIndex++;
        setTypingHint(current.slice(0, charIndex));
        if (charIndex === current.length) { direction = -1; pauseCounter = 15; }
      } else {
        charIndex--;
        setTypingHint(current.slice(0, charIndex));
        if (charIndex === 0) { direction = 1; hintIndex = (hintIndex + 1) % hints.length; pauseCounter = 5; }
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ric: (cb: () => void) => number = (window as any).requestIdleCallback
      ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 1500 })
      : (cb) => window.setTimeout(cb, 300);
    const id = ric(() => {
      [vacatioLogo, ...Object.values(HERO_CONFIG).map(c => c.image)].forEach(src => {
        const img = new Image();
        img.src = src;
      });
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

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <DesktopOnboardingOverlay />
      <DesktopTopHeader onAssistenteClick={() => setAssistenteOpen(true)} />
      <DesktopBreadcrumb />
      <div className="flex flex-1 min-h-0">
        <DesktopSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
            <div className="flex items-center gap-1 px-8 h-12">
              {DESKTOP_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      const routes: Record<string, string> = {
                        noticias: '/noticias',
                        ferramentas: '/ferramentas',
                        biblioteca: '/bibliotecas',
                      };
                      if (routes[tab.id]) { navigate(routes[tab.id]); return; }
                      setActiveTab(tab.id as Tab);
                    }}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium transition-colors ${
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-foreground/60 hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {isActive && <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-8 py-6">
            <div key={activeTab} className="animate-fade-in">
              {activeTab === 'legislacao' && (
                <>
                  <div className="mb-6 -mx-8 -mt-6">
                    <DesktopHeroBanner typingHint={typingHint} onSearchClick={() => setSearchOpen(true)} />
                  </div>
                  <div className="mb-8">
                    <DesktopFunctionRow
                      items={[
                        { id: 'ferramentas', label: 'Ferramentas', description: 'Recursos de estudo', icon: Wrench, onClick: () => setActiveTab('ferramentas') },
                        { id: 'chat', label: 'Chat', description: 'Assistente IA', icon: MessageSquare, onClick: () => setAssistenteOpen(true) },
                        { id: 'blog', label: 'Blog', description: 'Artigos jurídicos', icon: Newspaper, onClick: () => navigate('/blog') },
                        { id: 'pessoal', label: 'Pessoal', description: 'Anotações e grifos', icon: UserFn, onClick: () => navigate('/pessoal/artigos') },
                      ]}
                    />
                  </div>
                  <div className="mb-6"><ContinueBanner /></div>
                  <div className="mb-10 -mx-8"><HomeNoticiasCarousel /></div>
                  <div className="mb-8"><AtalhosCarousel /></div>
                </>
              )}
              {activeTab === 'noticias' && <AtualizacaoTab searchQuery={searchQuery} />}
              {activeTab === 'ferramentas' && (
                <div>
                  <h2 className="font-display text-xl text-foreground mb-1">Ferramentas</h2>
                  <p className="text-muted-foreground text-sm font-body mb-6">Recursos para potencializar seus estudos</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {DESKTOP_TOOLS.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            if (tool.id === 'assistente') setAssistenteOpen(true);
                            else if (tool.id === 'radar360') navigate('/radar-360');
                            else if (tool.id === 'estudar') navigate('/estudos');
                          }}
                          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:bg-card/80 active:translate-y-0 transition-all text-center group cursor-pointer"
                        >
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-md`}>
                            <Icon className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-display text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">{tool.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">{tool.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <DesktopNewsSidebar />
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