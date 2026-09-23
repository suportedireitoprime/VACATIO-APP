import { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, Menu as MenuIcon, Search, X, Gavel, BookMarked, type LucideIcon } from 'lucide-react';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import { LAW_ICON_MAP, CODIGO_DISPLAY_NAMES, ESTATUTO_DISPLAY_NAMES } from '@/data/lawDisplay';
import heroEstudanteImg from '@/assets/covers/hero-justice.webp';
import HeroMotifs from '@/components/vademecum/HeroMotifs';
import HomeCard from '@/components/vademecum/HomeCard';
import HomeActionShortcuts from '@/components/vademecum/HomeActionShortcuts';
import ShapeGrid from '@/components/ui/ShapeGrid';
import NotificationsSheet, { useUnreadNotifCount } from '@/components/vademecum/NotificationsSheet';
import { pushRecente } from '@/lib/leisRecentes';
import { leiPath, slugToTipo } from '@/lib/legislacaoSlugs';
import { haptic } from '@/lib/nativeHaptics';

const SideMenu = lazy(() => import('@/components/vademecum/SideMenu'));

interface PaginaLegislacaoHubProps {
  tipo?: 'codigo' | 'estatuto';
}

const normalizeText = (val: string) =>
  val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const PaginaLegislacaoHub = ({ tipo: propTipo }: PaginaLegislacaoHubProps) => {
  const navigate = useNavigate();
  const params = useParams<{ tipo?: string }>();
  const resolvedTipo = propTipo || (params.tipo ? (slugToTipo(params.tipo) as 'codigo' | 'estatuto') : 'codigo');
  const isCodigo = resolvedTipo === 'codigo';

  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useUnreadNotifCount();

  const CategoryIcon: LucideIcon = isCodigo ? Gavel : BookMarked;
  const pageTitle = isCodigo ? 'Códigos' : 'Estatutos';
  const pageSubtitle = isCodigo ? 'LEGISLAÇÃO CODIFICADA' : 'ESTATUTOS NACIONAIS';
  const pageTagline = isCodigo
    ? 'Consulte os códigos civis, penais e processuais do Brasil.'
    : 'Consulte todos os estatutos e garantias de direitos do Brasil.';
  const displayNames = isCodigo ? CODIGO_DISPLAY_NAMES : ESTATUTO_DISPLAY_NAMES;

  // Lista base do catálogo para esta categoria
  const baseItems = useMemo(() => {
    return LEIS_CATALOG.filter((l) => l.tipo === (isCodigo ? 'codigo' : 'estatuto'));
  }, [isCodigo]);

  // Filtro de busca reativo
  const filteredItems = useMemo(() => {
    const query = normalizeText(searchQuery.trim());
    if (!query) return baseItems;

    return baseItems.filter((lei) => {
      const custom = displayNames[lei.id];
      const customLabel = custom ? custom.label : '';
      const customSub = custom ? custom.sublabel : '';
      const tags = (lei.tags || []).join(' ');

      const haystack = normalizeText(
        `${lei.sigla} ${lei.nome} ${lei.descricao} ${customLabel} ${customSub} ${tags}`
      );
      return haystack.includes(query);
    });
  }, [baseItems, searchQuery, displayNames]);

  const handleOpenLei = (lei: LeiCatalogItem) => {
    haptic.selection();
    pushRecente({
      tipo: lei.tipo,
      leiId: lei.id,
      nome: lei.nome,
      descricao: lei.descricao,
      tabela_nome: lei.tabela_nome,
    });
    navigate(leiPath(lei));
  };

  const handleGoBack = () => {
    haptic.light();
    try {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
    } catch {}
    navigate('/');
  };

  return (
    <div className="min-h-dvh bg-[#050505] text-foreground pb-12 relative overflow-x-hidden">
      {/* Background Animated ShapeGrid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ShapeGrid
          speed={0.5}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(255, 255, 255, 0.05)"
          hoverFillColor="rgba(255, 255, 255, 0.1)"
          shape="square"
          hoverTrailAmount={5}
        />
      </div>

      <div className="relative z-10">
        {/* HERO AMARELO — Idêntico ao início do aplicativo */}
        <div
          className="bg-hero-panel-yellow relative overflow-hidden rounded-b-[36px] shadow-2xl shadow-black/60 pt-[var(--sai-top)] flex flex-col z-20"
          style={{
            transform: 'translateZ(0)',
            backgroundColor: '#050505',
          }}
        >
          {/* Blindagem de overscroll superior contra vazamento do fundo */}
          <div
            className="pointer-events-none absolute -top-[1200px] left-0 right-0 h-[1200px] z-0"
            style={{ backgroundColor: '#050505' }}
            aria-hidden="true"
          />

          {/* Imagem de Capa do Painel do Início (lado direito) — Altura total original sem corte */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <img
              src={heroEstudanteImg}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="absolute top-0 bottom-0 right-0 h-full w-auto max-w-none object-contain object-right select-none"
            />
          </div>

          {/* Overlay amarelo com gradiente e sombra diagonal dupla */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{ filter: 'drop-shadow(25px 0 25px rgba(0,0,0,0.8)) drop-shadow(8px 0 10px rgba(0,0,0,0.95))' }}
          >
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: 'polygon(0 0, 47% 0, 36% 100%, 0% 100%)' }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, #EFE039 0%, #EFE039 55%, #EFE039 100%)',
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.16),transparent_65%)]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

              {/* Motifs jurídicos clássicos */}
              <HeroMotifs />

              {/* Grid Pattern Background */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
            </div>
          </div>

          {/* Header Superior: Botão Voltar à esquerda; Notificação e Menu à direita */}
          <header className="relative z-20 pt-[calc(0.75rem+var(--sai-top,env(safe-area-inset-top,0px)))] md:pt-[calc(1rem+var(--sai-top,env(safe-area-inset-top,0px)))] px-4 pb-2 flex items-center justify-between">
            <button
              onClick={handleGoBack}
              aria-label="Voltar para o início"
              className="grid w-11 h-11 sm:w-12 sm:h-12 shrink-0 place-items-center rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md transition-colors hover:bg-black/60 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.4} />
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setNotifOpen(true)}
                aria-label={`Abrir notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
                className="grid w-11 h-11 sm:w-12 sm:h-12 shrink-0 place-items-center rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md transition-colors hover:bg-black/60 active:scale-95 relative"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.4} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-black text-[10px] font-bold leading-none flex items-center justify-center border border-neutral-900 shadow">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu"
                className="grid w-11 h-11 sm:w-12 sm:h-12 shrink-0 place-items-center rounded-full bg-black/40 border border-white/10 text-white backdrop-blur-md transition-colors hover:bg-black/60 active:scale-95"
              >
                <MenuIcon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.4} />
              </button>
            </div>
          </header>

          {/* Conteúdo: Brasão e Título na área amarela */}
          <div className="relative z-10 pt-2 sm:pt-4 flex-1 flex flex-col justify-start min-h-[95px]">
            <div className="flex flex-col items-center text-center gap-1 z-[10] relative w-[42%] max-w-[160px] ml-2 sm:ml-4">
              {/* Selo / Brasão Circular com o ícone da categoria */}
              <div className="relative h-[72px] mb-1 flex items-center justify-center">
                <div className="relative w-[68px] h-[68px] rounded-full border-2 border-white/90 bg-[#EFE039] flex items-center justify-center overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.5)] logo-shine">
                  <CategoryIcon className="w-8 h-8 text-black" strokeWidth={2.2} />
                </div>
              </div>

              <h1 className="font-serif italic text-white text-[21px] sm:text-[23px] leading-[1.05] font-bold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] whitespace-nowrap">
                {pageTitle}
              </h1>

              <p className="font-body text-white/95 text-[9px] sm:text-[10px] font-bold tracking-[0.22em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1">
                {pageSubtitle}
              </p>

              <div className="mt-2 flex items-center text-left gap-2 w-full justify-center">
                <div className="w-[2px] h-7 bg-white/40 rounded-full shrink-0" />
                <p className="font-serif italic text-white/80 text-[11px] sm:text-[12px] leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {isCodigo ? (
                    <>
                      Principais códigos<br />do Direito brasileiro
                    </>
                  ) : (
                    <>
                      Todos os estatutos<br />e garantias vigentes
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos: Favoritos, Anotações, Grifos, Chat */}
          <div className="relative z-10 px-3 sm:px-5 pt-3 pb-2">
            <HomeActionShortcuts />
          </div>

          {/* Barra de Pesquisa Integrada no Hero (estilo idêntico ao Início) */}
          <div className="relative z-10 px-4 sm:px-6 w-full pb-5 pt-1">
            <div className="relative w-full flex items-center h-16 pl-14 pr-[116px] rounded-2xl bg-black/65 backdrop-blur-md border border-white/15 shadow-lg shadow-black/30 search-bar-shine">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0 pointer-events-none"
                strokeWidth={2.2}
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isCodigo
                    ? 'Buscar códigos (ex: Penal, Civil, CLT, CPC)...'
                    : 'Buscar estatutos (ex: OAB, Criança, Idoso)...'
                }
                className="w-full bg-transparent text-white placeholder-white/50 text-[14px] sm:text-[15px] font-body focus:outline-none"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca"
                  className="absolute right-[112px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <div
                aria-hidden="true"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-12 px-5 rounded-xl bg-primary text-black font-display text-[13px] font-extrabold tracking-wider flex items-center justify-center pointer-events-none select-none uppercase shadow-md shadow-black/30"
              >
                PESQUISAR
              </div>
            </div>
          </div>
        </div>

        {/* CATÁLOGO DE LEIS */}
        <main className="max-w-5xl lg:max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-5">
          {/* Cabeçalho da Seção com Barra Amarela */}
          <div className="flex items-center justify-between px-1 mb-4">
            <h2 className="font-display text-foreground text-[18px] sm:text-[20px] font-bold flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary" />
              {isCodigo ? 'TODOS OS CÓDIGOS' : 'TODOS OS ESTATUTOS'}
            </h2>
            <span className="text-[12px] font-body font-semibold text-muted-foreground bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              {filteredItems.length} {filteredItems.length === 1 ? (isCodigo ? 'código' : 'estatuto') : (isCodigo ? 'códigos' : 'estatutos')}
            </span>
          </div>

          {/* Grid de Cards */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filteredItems.map((lei, i) => {
                const Icon = LAW_ICON_MAP[lei.id] || CategoryIcon;
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
                    delay={Math.min(i * 0.02, 0.25)}
                    className="min-h-[108px] sm:min-h-[116px] py-4 px-3.5"
                    onClick={() => handleOpenLei(lei)}
                    data-track="hub_card_click"
                    data-track-name={cardLabel}
                    data-track-section={isCodigo ? 'codigos' : 'estatutos'}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl bg-[#141416]/60 border border-white/10">
              <CategoryIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-display text-foreground text-lg font-bold">
                Nenhum {isCodigo ? 'código' : 'estatuto'} encontrado
              </p>
              <p className="font-body text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                Não encontramos resultados para &quot;{searchQuery}&quot;. Tente buscar por outro termo ou sigla.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-black font-body text-sm font-semibold hover:bg-primary/90 transition"
              >
                Limpar busca
              </button>
            </div>
          )}
        </main>
      </div>

      {/* SideMenu e Notificações em Suspense */}
      <Suspense fallback={null}>
        {menuOpen && <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />}
        {notifOpen && <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />}
      </Suspense>
    </div>
  );
};

export default PaginaLegislacaoHub;
