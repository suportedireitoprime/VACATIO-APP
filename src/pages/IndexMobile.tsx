import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

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
import BottomNav from '@/components/vademecum/BottomNav';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { leiPath, tipoToSlug, leiToSlug } from '@/lib/legislacaoSlugs';
// Heavy overlays are only rendered when opened — lazy-load their chunks so
// the initial mobile bundle stays lean and the home paints faster.
const SideMenu = lazy(() => import('@/components/vademecum/SideMenu'));
const SearchOverlay = lazy(() => import('@/components/vademecum/SearchOverlay'));
const AssistenteOverlay = lazy(() => import('@/components/vademecum/AssistenteOverlay'));
import HomeHeaderHero from '@/components/vademecum/HomeHeaderHero';
import MobileHomeSections from '@/components/vademecum/MobileHomeSections';
import { prefetchAllArtigos } from '@/services/legislacaoService';
import { prefetchResenha } from '@/services/atualizacaoService';
import { prefetchNoticias } from '@/services/noticiasService';
import { pushRecente } from '@/lib/leisRecentes';
import { warmCoverCache } from '@/lib/coverLoader';
import { track } from '@/lib/analyticsEvents';

const HERO_CONFIG = { radar: camaraHero, legislacao: heroImage, noticias: senadoHero } as const;

type Tab = 'legislacao' | 'noticias' | 'ferramentas';

const IndexMobile = () => {
  const navigate = useNavigate();
  const [, setActiveTab] = useState<Tab>('legislacao');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [heroSearchOpen, setHeroSearchOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<'categorias' | 'emalta' | 'areas'>('emalta');
  const [newsOpen, setNewsOpen] = useState(false);
  const [assistenteOpen, setAssistenteOpen] = useState(false);
  const [personalizarOpen] = useState(false);
  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { hidden?: boolean } | undefined;
      if (detail && typeof detail.hidden === 'boolean') {
        setBottomNavHidden(detail.hidden);
      }
    };
    window.addEventListener('vacatio:bottom-nav-visibility', handler as EventListener);
    return () => window.removeEventListener('vacatio:bottom-nav-visibility', handler as EventListener);
  }, []);

  useEffect(() => { warmCoverCache(); }, []);

  useEffect(() => {
    const ric: (cb: () => void) => number = (window as any).requestIdleCallback
      ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 1500 })
      : (cb) => window.setTimeout(cb, 300);
    const id = ric(() => {
      [vacatioLogo, ...Object.values(HERO_CONFIG)].forEach(src => {
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
    track('lei_search_selected', { tipo: lei.tipo, lei_id: lei.leiId, lei_nome: lei.nome, has_artigo: Boolean(lei.artigoNumero) });
    pushRecente({ tipo: lei.tipo, leiId: lei.leiId, nome: lei.nome, descricao: lei.descricao, tabela_nome: lei.tabela_nome });
    const slug = leiToSlug({ id: lei.leiId, nome: lei.nome });
    const base = `/legislacao/${tipoToSlug(lei.tipo)}/${slug}`;
    navigate(lei.artigoNumero ? `${base}/${encodeURIComponent(lei.artigoNumero)}` : base);
  };

  // Silence unused import warning; retained for future navigation flows.
  void LEIS_CATALOG;
  void leiPath;

  return (
    <div className="min-h-dvh bg-background pb-20">
      <HomeHeaderHero onSearchOpenChange={setHeroSearchOpen} />
      <main ref={contentRef} className="max-w-5xl lg:max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-2">
        <img src={vacatioLogo} alt="" aria-hidden="true" loading="eager" decoding="sync" fetchPriority="high" className="absolute w-0 h-0 opacity-0 pointer-events-none" />
        <MobileHomeSections onTabChange={setHomeTab} onNewsOpenChange={setNewsOpen} />
      </main>
      {!personalizarOpen && !searchOpen && !heroSearchOpen && !newsOpen && !bottomNavHidden && <BottomNav />}
      <Suspense fallback={null}>
        {menuOpen && (
          <SideMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onNavigate={(section) => {
              if (section === 'atualizacao') setActiveTab('noticias');
              else if (section === 'novidades') { /* handled by SideMenu */ }
              else setActiveTab('legislacao');
            }}
          />
        )}
        {searchOpen && (
          <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onSelectLei={handleSearchSelectLei} />
        )}
        {assistenteOpen && (
          <AssistenteOverlay open={assistenteOpen} onClose={() => setAssistenteOpen(false)} />
        )}
      </Suspense>
    </div>
  );
};

export default IndexMobile;