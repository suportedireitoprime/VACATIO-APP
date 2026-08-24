import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pickAsset, assetUrl } from '@/lib/assetUrl';
import { Menu as MenuIcon, Search, Scale, BookOpen, Clock, Layers, Eye, Quote, Lightbulb, ScrollText, History, ChevronLeft, User as UserIcon, Mic, Radar, MapPin, Monitor, Library, Bell, GraduationCap, Target, CloudOff, Newspaper, Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSummary } from '@/hooks/useProfileSummary';
import { supabase } from '@/integrations/supabase/client';
import cover2Asset from '@/assets/covers/cover-2.png.asset.json';
import cover2Bundled from '@/assets/covers/cover-2.webp';
import cover3Asset from '@/assets/covers/cover-3.png.asset.json';
import cover3Bundled from '@/assets/covers/cover-3.webp';
import cover4Asset from '@/assets/covers/cover-4.png.asset.json';
import cover4Bundled from '@/assets/covers/cover-4.webp';
import cover5Asset from '@/assets/covers/cover-5.png.asset.json';
import cover5Bundled from '@/assets/covers/cover-5.webp';
import cover6Asset from '@/assets/covers/cover-6.png.asset.json';
import cover6Bundled from '@/assets/covers/cover-6.webp';
import cover7Asset from '@/assets/covers/cover-7.png.asset.json';
import cover7Bundled from '@/assets/covers/cover-7.webp';
import cover8Asset from '@/assets/covers/cover-8.png.asset.json';
import cover8Bundled from '@/assets/covers/cover-8.webp';
import cover9Asset from '@/assets/covers/cover-9.png.asset.json';
import cover9Bundled from '@/assets/covers/cover-9.webp';
import cover10Asset from '@/assets/covers/cover-10.png.asset.json';
import cover10Bundled from '@/assets/covers/cover-10.webp';
import { useHeroHomeImages } from '@/hooks/useHeroHomeImages';
import { useHomeCuriosidades } from '@/hooks/useHomeCuriosidades';
import { useHeroMotifsConfig } from '@/hooks/useHeroMotifsConfig';
import { HERO_ANIMATIONS } from '@/lib/heroAnimations';
const COVER_POSITIONS = ['right', 'left', 'center', 'right', 'left'] as const;
const FALLBACK_COVERS = [
  { url: pickAsset(cover2Bundled, cover2Asset.url), preset: 'ken-burns' },
  { url: pickAsset(cover3Bundled, cover3Asset.url), preset: 'ken-burns' },
  { url: pickAsset(cover4Bundled, cover4Asset.url), preset: 'ken-burns' },
  { url: pickAsset(cover5Bundled, cover5Asset.url), preset: 'ken-burns' },
  { url: pickAsset(cover6Bundled, cover6Asset.url), preset: 'ken-burns' },
  { url: pickAsset(cover7Bundled, cover7Asset.url), preset: 'ken-burns' },
  { url: pickAsset(cover8Bundled, cover8Asset.url), preset: 'ken-burns' },
  { url: pickAsset(cover9Bundled, cover9Asset.url), preset: 'ken-burns' },
  { url: pickAsset(cover10Bundled, cover10Asset.url), preset: 'ken-burns' },
];
const SUBTITLES = [
  'Uso Profissional',
  'Para Estudantes',
  'Para Advogados',
  'Para Concurseiros',
  'Para Professores',
  'Para Servidores',
  'Para Magistrados',
];
import logoVacatioAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import logoVacatioBundled from '@/assets/bundled/logo-vacatio-v2.webp';
const logoVacatio = pickAsset(logoVacatioBundled, logoVacatioAsset.url);
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { leiPath, tipoToSlug, leiToSlug } from '@/lib/legislacaoSlugs';
const SideMenu = lazy(() => import('./SideMenu'));
import SearchOverlay from './SearchOverlay';
import RecentesOverlay from './RecentesOverlay';
import NotificationsSheet, { useUnreadNotifCount } from './NotificationsSheet';
import { pushRecente } from '@/lib/leisRecentes';
import { useShortcutBadges } from '@/hooks/useShortcutBadges';
import { prefetchHeroRoutesIdle, prefetchRoute, type PrefetchKey } from '@/lib/routePrefetch';

const TIME_KEY = 'tempo_no_app_segundos';
const DAILY_GOAL_SECONDS = 60 * 60; // 1h/dia para o anel de progresso

const HomeHeaderHero = ({ onSearchOpenChange }: { onSearchOpenChange?: (open: boolean) => void } = {}) => {
  const navigate = useNavigate();
  const shortcutBadges = useShortcutBadges();
  const { user } = useAuth();
  const { data: profileSummary } = useProfileSummary();
  const { images: dbImages } = useHeroHomeImages();
  const { config: motifsConfig } = useHeroMotifsConfig();
  // Serve Supabase-hosted images via the image transform endpoint so the
  // browser gets a compressed WebP (with long-lived Cache-Control) instead of
  // the original PNG upload. Non-Supabase URLs and bundled assets pass through.
  const toOptimized = (url: string): string => {
    try {
      if (!url) return url;
      if (url.includes('/storage/v1/object/public/')) {
        const opt = url.replace('/object/public/', '/render/image/public/');
        const sep = opt.includes('?') ? '&' : '?';
        return `${opt}${sep}width=1024&quality=78&format=origin`;
      }
      return url;
    } catch { return url; }
  };
  const HERO_COVERS = dbImages.length > 0
    ? dbImages.map((i) => ({ url: toOptimized(i.imagem_url), preset: i.animation_preset }))
    : FALLBACK_COVERS;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentesOpen, setRecentesOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useUnreadNotifCount();
  const [coverIndex, setCoverIndex] = useState(() => Math.floor(Math.random() * Math.max(1, HERO_COVERS.length)));
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [motifTick, setMotifTick] = useState(0);
  const [perfilLabel, setPerfilLabel] = useState<string>('');

  // Prefetch dos 4 chunks das rotas dos atalhos em idle (Radares, Boletim, Blog, Biblioteca)
  useEffect(() => { prefetchHeroRoutesIdle(); }, []);

  // Warm the browser cache for the *next* hero cover in idle time so the
  // crossfade is instant. Uses `<link rel="preload">` when possible and falls
  // back to `new Image()`.
  useEffect(() => {
    if (HERO_COVERS.length <= 1) return;
    const next = HERO_COVERS[(coverIndex + 1) % HERO_COVERS.length];
    if (!next?.url) return;
    const w: any = window;
    const idle = w.requestIdleCallback || ((cb: any) => setTimeout(cb, 400));
    const cancel = w.cancelIdleCallback || clearTimeout;
    const handle = idle(() => {
      const img = new Image();
      img.decoding = 'async';
      img.src = next.url;
    });
    return () => cancel(handle);
  }, [coverIndex, HERO_COVERS]);



  useEffect(() => {
    if (HERO_COVERS.length <= 1) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(() => setCoverIndex((i) => (i + 1) % HERO_COVERS.length), 9000);
    };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [HERO_COVERS.length]);

  // Rotação suave dos ícones jurídicos: a cada ~6s a constelação muda de
  // preset (topo → meio ao redor do logo → laterais → base) com transição
  // elegante de transform+opacity via CSS.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(() => setMotifTick((t) => t + 1), 6000);
    };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, []);


  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('perfil_contexto, perfil_tipos')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.perfil_contexto) setPerfilLabel(String(data.perfil_contexto));
      else if (Array.isArray(data?.perfil_tipos) && data.perfil_tipos.length > 0) {
        const mapa: Record<string, string> = {
          faculdade: 'Estudante de Direito',
          oab: 'Concurseiro OAB',
          concurso: 'Concurseiro',
          advogado: 'Advogado(a)',
        };
        setPerfilLabel(mapa[data.perfil_tipos[0] as string] || 'Estudante de Direito');
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    onSearchOpenChange?.(searchOpen);
  }, [searchOpen, onSearchOpenChange]);


  const nome =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.email ? user.email.split('@')[0] : 'Bem-vindo');
  const avatarUrl =
    (profileSummary?.avatarUrl || undefined) ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined);
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  return (
    <>
      {/* Unified yellow shell — hero cover as full background; gray profile card floats inset with side margins */}
      <div
        className="relative overflow-hidden rounded-b-[36px] border-b border-primary/30 shadow-2xl shadow-black/50 pt-[var(--sai-top,env(safe-area-inset-top,0px))]"
        style={{
          background:
            'linear-gradient(135deg, #EFE039 0%, #EFE039 55%, #EFE039 100%)',
          // Força layer de composição próprio no Android WebView. Sem isso, ao
          // sair/voltar da viewport o WebView descarta o raster do conteúdo
          // filho (profile + logo + Vade Mecum) e só o fundo amarelo permanece
          // até um novo repaint. transform:translateZ(0) + isolation:isolate
          // dá stacking-context + camada GPU dedicada, evitando o bug.
          transform: 'translateZ(0)',
          isolation: 'isolate',
          contain: 'paint',
        }}
      >
        {/* Subtle radial warmth */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.35),transparent_65%)]" />

        {/* Decorative legal motifs — apenas ao redor das bordas, com float + shimmer */}
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.32]"
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <defs>
            {/*
              Família unificada — monoline gravado a buril, traço 2.0,
              desenhados dentro de uma caixa de ~56x56 centrada na origem,
              para leitura clara e proporção idêntica entre símbolos.
            */}
            {/* Balança da justiça — coluna, viga, pratos e base evidentes */}
            <g id="legal-scales" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="0" cy="-26" r="2.4" fill="rgba(0,0,0,0.95)" stroke="none" />
              <line x1="0" y1="-24" x2="0" y2="18" />
              {/* Viga */}
              <line x1="-22" y1="-18" x2="22" y2="-18" />
              {/* Correntes */}
              <line x1="-22" y1="-18" x2="-22" y2="-10" />
              <line x1="22" y1="-18" x2="22" y2="-10" />
              {/* Prato esquerdo */}
              <path d="M -30 -10 Q -22 -2 -14 -10" />
              <line x1="-30" y1="-10" x2="-14" y2="-10" />
              {/* Prato direito */}
              <path d="M 14 -10 Q 22 -2 30 -10" />
              <line x1="14" y1="-10" x2="30" y2="-10" />
              {/* Base */}
              <path d="M -12 18 L 12 18 L 9 22 L -9 22 Z" />
              <line x1="-14" y1="22" x2="14" y2="22" />
            </g>
            {/* Martelo do juiz (gavel) — cabeça + sound block visíveis */}
            <g id="legal-gavel" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <g transform="rotate(-30)">
                {/* Cabeça */}
                <rect x="-16" y="-9" width="32" height="14" rx="2.5" />
                <line x1="-10" y1="-9" x2="-10" y2="5" />
                <line x1="10" y1="-9" x2="10" y2="5" />
                {/* Cabo */}
                <line x1="6" y1="5" x2="22" y2="21" strokeWidth="2.6" />
                <circle cx="22" cy="21" r="1.8" fill="rgba(0,0,0,0.95)" stroke="none" />
              </g>
              {/* Sound block */}
              <rect x="-18" y="16" width="36" height="5" rx="1.2" />
              <line x1="-16" y1="21" x2="16" y2="21" />
            </g>
            {/* Livro aberto — páginas com linhas de texto claras */}
            <g id="legal-book" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Lombada */}
              <line x1="0" y1="-14" x2="0" y2="16" />
              {/* Página esquerda */}
              <path d="M 0 -12 Q -12 -16 -22 -14 L -22 14 Q -12 12 0 16 Z" />
              {/* Página direita */}
              <path d="M 0 -12 Q 12 -16 22 -14 L 22 14 Q 12 12 0 16 Z" />
              {/* Linhas de texto */}
              <line x1="-18" y1="-8" x2="-4" y2="-6" />
              <line x1="-18" y1="-2" x2="-4" y2="0" />
              <line x1="-18" y1="4"  x2="-4" y2="6" />
              <line x1="4" y1="-6"  x2="18" y2="-8" />
              <line x1="4" y1="0"   x2="18" y2="-2" />
              <line x1="4" y1="6"   x2="18" y2="4" />
            </g>
            {/* Espada — mesma família, ~56 de altura */}
            <g id="legal-sword" stroke="rgba(0,0,0,0.95)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="0" y1="-26" x2="0" y2="14" />
              <path d="M -3 -26 Q 0 -30 3 -26" />
              <line x1="-12" y1="14" x2="12" y2="14" />
              <line x1="0" y1="14" x2="0" y2="24" />
              <path d="M -5 24 Q 0 28 5 24" />
            </g>
          </defs>

          {/*
            Distribuição organizada: grade simétrica ao longo das bordas
            (topo, laterais e base), com rotações discretas para não competir
            com o personagem. Icons ficam estáticos — visíveis, ordenados,
            sem shuffle contínuo que polui a leitura.
          */}
          {(() => {
            type Spot = { x: number; y: number; r: number; s: number };
            // Quatro constelações — a cada tick a mesma <g> vai para a
            // posição correspondente na próxima constelação, criando a
            // sensação de que os símbolos "flutuam" pelo painel, inclusive
            // orbitando o logo/personagem no centro.
            const LAYOUTS: Spot[][] = [
              // 0) Topo + laterais altas
              [
                { x:  70, y:  46, r: -8, s: 1.0  },
                { x: 200, y:  36, r:  0, s: 1.15 },
                { x: 330, y:  46, r:  8, s: 1.0  },
                { x:  34, y: 118, r: -14, s: 0.95 },
                { x: 366, y: 118, r:  14, s: 0.95 },
                { x:  30, y: 210, r:  10, s: 0.9  },
                { x: 370, y: 210, r: -10, s: 0.9  },
                { x: 110, y: 268, r:   6, s: 0.9  },
                { x: 200, y: 276, r:   0, s: 1.0  },
                { x: 290, y: 268, r:  -6, s: 0.9  },
              ],
              // 1) Orbitando o logo/personagem (constelação central)
              [
                { x: 200, y:  56, r:   0, s: 1.05 },
                { x: 110, y:  96, r: -18, s: 0.95 },
                { x: 290, y:  96, r:  18, s: 0.95 },
                { x:  56, y: 160, r: -10, s: 0.9  },
                { x: 344, y: 160, r:  10, s: 0.9  },
                { x: 110, y: 220, r:  12, s: 0.95 },
                { x: 290, y: 220, r: -12, s: 0.95 },
                { x: 200, y: 250, r:   0, s: 1.1  },
                { x:  30, y:  90, r: -30, s: 0.85 },
                { x: 370, y:  90, r:  30, s: 0.85 },
              ],
              // 2) Diagonal — cascata elegante do canto sup-esq ao inf-dir
              [
                { x:  40, y:  50, r: -12, s: 0.95 },
                { x: 108, y:  86, r:  -6, s: 1.0  },
                { x: 178, y: 122, r:   0, s: 1.05 },
                { x: 248, y: 158, r:   6, s: 1.0  },
                { x: 318, y: 194, r:  12, s: 0.95 },
                { x:  60, y: 232, r:  18, s: 0.9  },
                { x: 360, y:  72, r: -18, s: 0.9  },
                { x: 200, y:  36, r:   0, s: 0.95 },
                { x: 130, y: 270, r:  10, s: 0.9  },
                { x: 290, y: 270, r: -10, s: 0.9  },
              ],
              // 3) Base + laterais baixas (espelha o preset 0)
              [
                { x:  70, y: 264, r:   8, s: 1.0  },
                { x: 200, y: 274, r:   0, s: 1.15 },
                { x: 330, y: 264, r:  -8, s: 1.0  },
                { x:  34, y: 200, r:  14, s: 0.95 },
                { x: 366, y: 200, r: -14, s: 0.95 },
                { x:  30, y: 110, r: -10, s: 0.9  },
                { x: 370, y: 110, r:  10, s: 0.9  },
                { x: 110, y:  48, r:  -6, s: 0.9  },
                { x: 200, y:  40, r:   0, s: 1.0  },
                { x: 290, y:  48, r:   6, s: 0.9  },
              ],
            ];
            const ICONS = [
              'legal-scales',
              'legal-gavel',
              'legal-book',
              'legal-scales',
              'legal-gavel',
              'legal-book',
              'legal-scales',
              'legal-gavel',
              'legal-book',
              'legal-scales',
            ];
            const preset = LAYOUTS[motifTick % LAYOUTS.length];
            return ICONS.map((id, i) => {
              const slot = preset[i];
              return (
                <g
                  key={i}
                  className="hero-legal-icon"
                  style={{
                    transform: `translate(${slot.x}px, ${slot.y}px) rotate(${slot.r}deg) scale(${slot.s})`,
                    transition:
                      'transform 1400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 900ms ease',
                  }}
                >
                  <use href={`#${id}`} />
                </g>
              );
            });
          })()}
        </svg>



        {/* Reflexo horizontal passando sobre os ícones esmaecidos */}
        


        {/* Cover art — cross-fading Ken Burns rotation, alternating positions */}
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <AnimatePresence initial={false}>
            {(() => {
              const current = HERO_COVERS[coverIndex % HERO_COVERS.length];
              if (!current) return null;
              const pos = COVER_POSITIONS[coverIndex % COVER_POSITIONS.length];
              const posClass =
                pos === 'right'
                  ? 'right-[4%] left-auto origin-bottom-right'
                  : pos === 'left'
                  ? 'left-[4%] right-auto origin-bottom-left'
                  : 'left-1/2 -translate-x-1/2 origin-bottom';
              // Fade-in com um leve zoom (entrada suave, sem "seca").
              // Mantém-se leve em mobile/tablet: sem spring, sem loop.
              // Crossfade: incoming fades in slowly while outgoing fades out —
              // exit runs at the same time as enter, giving no dry cuts.
              const preset = {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
                transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] as const },
              };
              // Continuous Ken Burns pan+zoom while displayed. Alternates
              // direction per image so it always feels like it's breathing.
              const kenBurnsAnim = (coverIndex % 2 === 0)
                ? 'ken-burns-a 12s ease-in-out infinite alternate'
                : 'ken-burns-b 12s ease-in-out infinite alternate';
              return (
                <motion.img
                  key={coverIndex}
                  src={current.url}
                  alt=""
                  loading="eager"
                  decoding="async"
                  // @ts-expect-error non-standard yet-widely-supported hint
                  fetchpriority="high"
                  width={1024}
                  height={1024}
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.style.opacity = '0';
                  }}
                  initial={preset.initial}
                  animate={preset.animate}
                  exit={preset.exit}
                  transition={preset.transition}
                  style={{ animation: kenBurnsAnim, willChange: 'transform' }}
                  className={`absolute bottom-0 h-[88%] w-auto max-w-[70%] object-contain object-bottom drop-shadow-[0_10px_28px_rgba(0,0,0,0.35)] ${posClass}`}
                />
              );
            })()}
          </AnimatePresence>
        </div>

        {/* Bottom-up gradient for text legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

        {/* Floating gray profile card — inset with lateral margins */}
        <header className="relative px-3 pt-3 md:px-6 md:pt-6 lg:px-8 lg:pt-8 flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 pr-3 pl-1">
            <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden border-2 border-white bg-black/40 flex items-center justify-center shrink-0 shadow-lg shadow-black/50">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={nome}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  className="w-full h-full object-cover"
                />
              ) : iniciais ? (
                <span className="font-display text-white text-[14px] md:text-[16px] lg:text-[18px] font-bold">{iniciais}</span>
              ) : (
                <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-white/80" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-white text-[17px] md:text-[19px] lg:text-[21px] font-bold leading-[1.15] truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                {nome}
              </p>
              {perfilLabel && (
                <p className="font-body text-white/95 text-[13.5px] md:text-[15px] lg:text-[16px] font-medium leading-tight truncate mt-0.5 md:mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                  {perfilLabel}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button
              onClick={() => setNotifOpen(true)}
              aria-label={`Abrir notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
              className="relative w-11 h-11 md:w-12 md:h-12 lg:w-13 lg:h-13 rounded-full bg-neutral-900/85 border border-white/15 backdrop-blur-md shadow-lg shadow-black/40 flex items-center justify-center active:scale-95 transition"
            >
              <Bell className="w-5 h-5 md:w-[22px] md:h-[22px] text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] md:min-w-[20px] md:h-[20px] px-1 rounded-full bg-red-500 text-gray-900 text-[10px] md:text-[11px] font-bold leading-none flex items-center justify-center border border-neutral-900 shadow">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="w-11 h-11 md:w-12 md:h-12 lg:w-13 lg:h-13 rounded-full bg-neutral-900/85 border border-white/15 backdrop-blur-md shadow-lg shadow-black/40 flex items-center justify-center active:scale-95 transition"
            >
              <MenuIcon className="w-5 h-5 md:w-[22px] md:h-[22px] text-white" />
            </button>
          </div>
        </header>

        <div className="relative px-4 pt-5 pb-5 min-h-[240px] flex flex-col gap-4">
          {/* Centered brand block */}
          <div className="flex flex-col items-center text-center gap-2 pt-1">
            <div className="relative w-20 h-20 rounded-full border border-white/90 bg-primary flex items-center justify-center overflow-hidden shadow-[0_6px_18px_rgba(0,0,0,0.45)] logo-shine">
              <img
                src={logoVacatio}
                alt="OAB na Risca"
                width={80}
                height={80}
                loading="eager"
                decoding="sync"
                {...({ fetchpriority: 'high' } as any)}
                className="w-full h-full rounded-full object-cover scale-[1.06]"
              />

            </div>
            <h1 className="font-display text-white text-[28px] leading-none font-black tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
              Vade Mecum
            </h1>
            <div className="relative h-[16px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={subtitleIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="font-body text-white/85 text-[12.5px] font-medium tracking-wide uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] whitespace-nowrap"
                >
                  {SUBTITLES[subtitleIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Search bar */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Pesquisar artigos e leis"
            className="mt-auto relative w-full flex items-center h-16 pl-14 pr-[112px] rounded-2xl bg-black/45 backdrop-blur-md border border-primary/40 shadow-lg shadow-black/30 active:scale-[0.99] transition search-bar-shine"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-primary shrink-0" strokeWidth={2.2} />
            <span className="relative z-[2] font-body text-white/70 text-[15px] font-medium truncate text-left">
              <TypingHint />
            </span>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-12 px-5 rounded-xl bg-primary text-primary-foreground font-display text-[13px] font-bold tracking-wider flex items-center justify-center shadow-md">
              PESQUISAR
            </div>
          </button>


          {/* Atalhos rápidos — abaixo da barra de pesquisa */}
          <div className="grid grid-cols-4 gap-2 mt-1">
            {[
              { label: 'Anotações',  icon: ScrollText,  to: '/pessoal/anotacoes', color: '#38BDF8', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
              { label: 'Grifos',     icon: Quote,       to: '/pessoal/grifos',    color: '#34D399', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
              { label: 'Favoritos',  icon: Bookmark,    to: '/pessoal/favoritos', color: '#F97316', badgeColor: null, badgeKey: null, prefetch: null as PrefetchKey | null },
              { label: 'Radares',    icon: Radar,       to: '/radares',           color: '#EFE039', badgeColor: null, badgeKey: null, prefetch: 'radar360' as PrefetchKey },
            ].map((item) => {
              const Icon = item.icon;
              const badgeCount = item.badgeKey ? shortcutBadges.counts[item.badgeKey] : 0;
              return (
                <button
                  key={item.label}
                  onPointerDown={() => item.prefetch && prefetchRoute(item.prefetch)}
                  onMouseEnter={() => item.prefetch && prefetchRoute(item.prefetch)}
                  onFocus={() => item.prefetch && prefetchRoute(item.prefetch)}
                  onClick={() => {
                    if (item.badgeKey) shortcutBadges.markSeen(item.badgeKey);
                    navigate(item.to);
                  }}
                  className="group relative flex flex-col items-center justify-center gap-1 h-[72px] rounded-2xl bg-black/45 backdrop-blur-md border border-white/15 shadow-lg shadow-black/30 active:scale-[0.96] transition"
                >
                  {badgeCount > 0 && item.badgeColor && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold leading-none flex items-center justify-center border border-white/20 shadow z-10"
                      style={{ backgroundColor: item.badgeColor }}
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}

                  <Icon
                    className="w-6 h-6"
                    style={{ color: item.color, filter: 'saturate(1.3) drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}
                    strokeWidth={1.6}
                  />
                  <span className="font-display text-white text-[12px] font-bold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </div>







      <Suspense fallback={null}>{menuOpen && <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />}</Suspense>
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectLei={(lei) => {
          setSearchOpen(false);
          pushRecente({ tipo: lei.tipo, leiId: lei.leiId, nome: lei.nome, descricao: lei.descricao, tabela_nome: lei.tabela_nome });
          const slug = leiToSlug({ id: lei.leiId, nome: lei.nome });
          const base = `/legislacao/${tipoToSlug(lei.tipo)}/${slug}`;
          navigate(lei.artigoNumero ? `${base}/${encodeURIComponent(lei.artigoNumero)}` : base);
        }}
      />
      <RecentesOverlay
        open={recentesOpen}
        onClose={() => setRecentesOpen(false)}
        onSelectLei={(lei) => {
          setRecentesOpen(false);
          pushRecente(lei);
          navigate(`/legislacao/${tipoToSlug(lei.tipo)}/${leiToSlug({ id: lei.leiId, nome: lei.nome })}`);
        }}
      />
    </>
  );
};

const HINTS = [
  'Pesquise o artigo...',
  'Pesquise a lei...',
  'Pesquise o número da lei...',
  'Pesquise trechos...',
  'Pesquise normas...',
  'Pesquise jurisprudência...',
  'Pesquise súmulas...',
  'Pesquise por voz...',
];

const TypingHint = () => {
  const [text, setText] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'paused' | 'erasing'>('typing');

  useEffect(() => {
    const current = HINTS[hintIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (text.length < current.length) {
        timer = setTimeout(() => setText(current.slice(0, text.length + 1)), 90);
      } else {
        timer = setTimeout(() => setPhase('paused'), 1500);
      }
    } else if (phase === 'paused') {
      timer = setTimeout(() => setPhase('erasing'), 100);
    } else if (phase === 'erasing') {
      if (text.length > 0) {
        timer = setTimeout(() => setText(text.slice(0, text.length - 1)), 50);
      } else {
        setHintIndex((i) => (i + 1) % HINTS.length);
        setPhase('typing');
      }
    }

    return () => clearTimeout(timer);
  }, [text, hintIndex, phase]);

  return (
    <span className="inline-flex items-center">
      {text}
      <span className="ml-0.5 inline-block w-[2px] h-[14px] bg-white/80 animate-pulse" />
    </span>
  );
};


type CardItem =
  | {
      type: 'stat';
      icon: React.ElementType;
      label: string;
      getValue: () => string;
      subtitle: string;
    }
  | {
      type: 'quote';
      icon: React.ElementType;
      label: string;
      frase: string;
      autor: string;
    }
  | {
      type: 'curiosity';
      icon: React.ElementType;
      label: string;
      texto: string;
    }
  | {
      type: 'termo';
      icon: React.ElementType;
      label: string;
      termo: string;
      significado: string;
    }
  | {
      type: 'db-curiosity';
      icon: React.ElementType;
      label: string;
      texto: string;
      cor: string;
      imagem_url: string | null;
    };

const PHILOSOPHER_QUOTES = [
  { frase: 'Onde não há lei, não há liberdade.', autor: 'Aristóteles' },
  { frase: 'A justiça é a alma da sociedade.', autor: 'Platão' },
  { frase: 'A justiça é a constante vontade de dar a cada um o que lhe é devido.', autor: 'Ulpiano' },
  { frase: 'A lei deve ser a razão do governo.', autor: 'Montesquieu' },
  { frase: 'Justiça é a virtude que ordena a sociedade.', autor: 'Cícero' },
  { frase: 'Sem justiça, o Estado não passa de uma grande quadrilha.', autor: 'Santo Agostinho' },
  { frase: 'O direito é a vontade geral manifestada nas leis.', autor: 'Rousseau' },
  { frase: 'A liberdade consiste em fazer tudo o que as leis permitem.', autor: 'Montesquieu' },
  { frase: 'A injustiça em qualquer lugar é uma ameaça à justiça em todo lugar.', autor: 'Martin Luther King' },
  { frase: 'A justiça atrasada não é justiça, senão injustiça qualificada e manifesta.', autor: 'Rui Barbosa' },
  { frase: 'O direito não socorre aos que dormem.', autor: 'Brocardo latino' },
  { frase: 'Dura lex, sed lex — a lei é dura, mas é a lei.', autor: 'Ulpiano' },
  { frase: 'Fiat justitia, ruat caelum — faça-se justiça, ainda que caiam os céus.', autor: 'Sêneca' },
  { frase: 'Todo poder emana do povo.', autor: 'Rousseau' },
  { frase: 'O homem é um animal político por natureza.', autor: 'Aristóteles' },
  { frase: 'A pena deve ser proporcional ao crime.', autor: 'Beccaria' },
  { frase: 'É melhor prevenir os crimes do que puni-los.', autor: 'Cesare Beccaria' },
  { frase: 'Não há crime sem lei anterior que o defina.', autor: 'Feuerbach' },
  { frase: 'A liberdade de um termina onde começa a do outro.', autor: 'John Stuart Mill' },
  { frase: 'A propriedade é um roubo.', autor: 'Proudhon' },
];

const LEGAL_CURIOSITIES = [
  { texto: 'A Constituição Federal de 1988 é a 7ª da história do Brasil.' },
  { texto: 'O Código Civil brasileiro atual tem 2.046 artigos e entrou em vigor em 2003.' },
  { texto: 'A OAB foi criada em 1930, meses antes da Revolução.' },
  { texto: 'O Código Penal vigente foi sancionado em 1940 por Getúlio Vargas.' },
  { texto: 'O STF foi criado em 1891, junto com a primeira República.' },
  { texto: 'A Lei Maria da Penha leva o nome da farmacêutica Maria da Penha Maia Fernandes.' },
  { texto: 'A CLT foi assinada em 1º de maio de 1943 e ainda está em vigor.' },
  { texto: 'A Constituição de 1988 é chamada de "Constituição Cidadã" por Ulysses Guimarães.' },
  { texto: 'Habeas Corpus significa literalmente "que tenhas o teu corpo".' },
  { texto: 'O Brasil já teve 7 Constituições: 1824, 1891, 1934, 1937, 1946, 1967 e 1988.' },
  { texto: 'A Lei Áurea (1888) tem apenas 2 artigos — uma das mais curtas do Brasil.' },
  { texto: 'O júri popular está previsto na Constituição desde 1822.' },
  { texto: 'O Código de Defesa do Consumidor é de 1990 (Lei 8.078).' },
  { texto: 'A Lei da Ficha Limpa (2010) surgiu por iniciativa popular com 1,6 milhão de assinaturas.' },
  { texto: 'O voto feminino no Brasil foi conquistado em 1932.' },
  { texto: 'A pena de morte é proibida no Brasil, salvo em caso de guerra declarada.' },
  { texto: 'O Marco Civil da Internet (Lei 12.965/2014) foi pioneiro no mundo.' },
  { texto: 'O Estatuto da Criança e do Adolescente (ECA) é de 1990.' },
  { texto: 'A Lei de Introdução às Normas do Direito Brasileiro (LINDB) é de 1942.' },
  { texto: 'O CPC atual entrou em vigor em 2016, substituindo o de 1973.' },
  { texto: 'Rui Barbosa é chamado de "Águia de Haia" por sua atuação na Conferência da Paz de 1907.' },
  { texto: 'A LGPD (Lei Geral de Proteção de Dados) entrou em vigor em 2020.' },
  { texto: 'O Tribunal do Júri no Brasil julga apenas crimes dolosos contra a vida.' },
  { texto: 'A Lei Seca brasileira (Lei 11.705/2008) reduziu em 40% as mortes no trânsito.' },
  { texto: 'A Constituição de 1824 foi outorgada por Dom Pedro I e durou 65 anos.' },
];

const TERMOS_JURIDICOS = [
  { termo: 'Ab initio', significado: 'Desde o início.' },
  { termo: 'Ad hoc', significado: 'Para uma finalidade específica.' },
  { termo: 'Data venia', significado: 'Com o devido respeito.' },
  { termo: 'De cujus', significado: 'Pessoa falecida cuja sucessão se discute.' },
  { termo: 'Erga omnes', significado: 'Que produz efeitos contra todos.' },
  { termo: 'Ex tunc', significado: 'Efeito retroativo, desde então.' },
  { termo: 'Ex nunc', significado: 'Efeito a partir de agora, sem retroagir.' },
  { termo: 'Habeas Data', significado: 'Ação para acessar/corrigir informações pessoais em registros públicos.' },
  { termo: 'In dubio pro reo', significado: 'Na dúvida, decide-se em favor do réu.' },
  { termo: 'Inter partes', significado: 'Efeito que vale apenas entre as partes envolvidas.' },
  { termo: 'Litispendência', significado: 'Existência de duas ações idênticas em curso.' },
  { termo: 'Mandado de Segurança', significado: 'Ação que protege direito líquido e certo contra ato de autoridade.' },
  { termo: 'Nulla poena sine lege', significado: 'Não há pena sem lei anterior que a defina.' },
  { termo: 'Pacta sunt servanda', significado: 'Os pactos devem ser cumpridos.' },
  { termo: 'Res judicata', significado: 'Coisa julgada — decisão da qual não cabe mais recurso.' },
  { termo: 'Sub judice', significado: 'Assunto que ainda está sendo julgado.' },
  { termo: 'Ubi lex non distinguit', significado: 'Onde a lei não distingue, não cabe ao intérprete distinguir.' },
  { termo: 'Vacatio legis', significado: 'Período entre a publicação e a entrada em vigor da lei.' },
  { termo: 'Amicus curiae', significado: '"Amigo da corte" — terceiro que auxilia o tribunal.' },
  { termo: 'Bis in idem', significado: 'Punir alguém duas vezes pelo mesmo fato.' },
  { termo: 'Caput', significado: 'Cabeça do artigo — parte principal antes dos parágrafos.' },
  { termo: 'Culpa in vigilando', significado: 'Culpa por falta de vigilância.' },
  { termo: 'Dolo', significado: 'Vontade consciente de praticar o ato ilícito.' },
  { termo: 'Fumus boni iuris', significado: 'Fumaça do bom direito — plausibilidade do direito alegado.' },
  { termo: 'Periculum in mora', significado: 'Perigo na demora — risco de dano pelo atraso.' },
];

export const RotatingStatCard = ({ wide = false }: { wide?: boolean } = {}) => {
  const { items: dbCuriosidades } = useHomeCuriosidades();
  const [seconds, setSeconds] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = Number(localStorage.getItem(TIME_KEY) || '0');
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  });
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    const persist = setInterval(() => {
      try { localStorage.setItem(TIME_KEY, String(secondsRef.current)); } catch {}
    }, 5000);
    const flush = () => { try { localStorage.setItem(TIME_KEY, String(secondsRef.current)); } catch {} };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', flush);
    return () => {
      clearInterval(tick);
      clearInterval(persist);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  const totalMinutes = Math.floor(seconds / 60);
  const displayTime =
    totalMinutes < 60
      ? `${totalMinutes}:${(seconds % 60).toString().padStart(2, '0')}`
      : `${Math.floor(totalMinutes / 60)}h ${(totalMinutes % 60).toString().padStart(2, '0')}min`;
  const pct = Math.min(100, (seconds / DAILY_GOAL_SECONDS) * 100);

  const totalLeis = LEIS_CATALOG.length.toLocaleString('pt-BR');

  const [artigosVistos, setArtigosVistos] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem('artigos_vistos') || '0');
  });
  useEffect(() => {
    const sync = () => setArtigosVistos(Number(localStorage.getItem('artigos_vistos') || '0'));
    const t = setInterval(sync, 3000);
    window.addEventListener('focus', sync);
    return () => { clearInterval(t); window.removeEventListener('focus', sync); };
  }, []);

  const artigosSubtitle =
    artigosVistos === 0
      ? 'Abra um artigo para começar'
      : artigosVistos < 10
        ? 'Bom começo, continue!'
        : artigosVistos < 50
          ? 'Você está evoluindo 🔥'
          : artigosVistos < 200
            ? 'Estudante dedicado'
            : 'Referência em conhecimento';

  const baseItems: CardItem[] = [
    {
      type: 'stat',
      icon: Layers,
      label: 'Leis no acervo',
      getValue: () => totalLeis,
      subtitle: 'sempre atualizadas',
    },
    {
      type: 'stat',
      icon: Clock,
      label: 'Tempo de estudo',
      getValue: () => displayTime,
      subtitle: 'meta diária 1h',
    },
    {
      type: 'stat',
      icon: Eye,
      label: 'Artigos visualizados',
      getValue: () => artigosVistos.toLocaleString('pt-BR'),
      subtitle: artigosSubtitle,
    },
    ...PHILOSOPHER_QUOTES.map((q): CardItem => ({
      type: 'quote',
      icon: Quote,
      label: 'Pensamento jurídico',
      frase: q.frase,
      autor: q.autor,
    })),
    ...LEGAL_CURIOSITIES.map((c): CardItem => ({
      type: 'curiosity',
      icon: Lightbulb,
      label: 'Curiosidade jurídica',
      texto: c.texto,
    })),
    ...TERMOS_JURIDICOS.map((t): CardItem => ({
      type: 'termo',
      icon: ScrollText,
      label: 'Termo jurídico',
      termo: t.termo,
      significado: t.significado,
    })),
    ...dbCuriosidades.map((c): CardItem => ({
      type: 'db-curiosity',
      icon: Lightbulb,
      label: 'Curiosidade',
      texto: c.texto,
      cor: c.cor,
      imagem_url: c.imagem_url,
    })),
  ];

  const items = baseItems;

  // Persist rotation so user sees a different card each visit; loops after seeing all.
  const IDX_KEY = 'home_stat_card_idx';
  const [idx, setIdx] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const raw = Number(localStorage.getItem(IDX_KEY) || '0');
    const next = (Number.isFinite(raw) ? raw : 0) % baseItems.length;
    try { localStorage.setItem(IDX_KEY, String((next + 1) % baseItems.length)); } catch {}
    return next;
  });
  useEffect(() => {
    const it = setInterval(() => setIdx((i) => {
      const n = (i + 1) % items.length;
      try { localStorage.setItem(IDX_KEY, String((n + 1) % items.length)); } catch {}
      return n;
    }), 10000);
    return () => clearInterval(it);
  }, [items.length]);


  const renderCard = (item: CardItem, i: number, keyed = false) => {
    const Icon = item.icon;
    const isStat = item.type === 'stat';
    const isTempo = isStat && item.label === 'Tempo de estudo';
    const isDbCur = item.type === 'db-curiosity';
    const accent = isDbCur ? item.cor : undefined;
    return (
      <div
        key={keyed ? i : undefined}
        className={`relative ${wide ? 'min-h-[160px]' : 'w-[220px] sm:w-[245px] md:w-[280px] lg:w-[300px] aspect-[4/3.6]'} rounded-2xl bg-[#212121]/95 border border-white/10 p-3.5 sm:p-4 md:p-5 backdrop-blur-md overflow-hidden shadow-xl shadow-black/40`}
        style={isDbCur ? { borderColor: `${accent}55` } : undefined}
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/15 via-white/[0.03] to-transparent pointer-events-none"
          style={isDbCur ? { background: `linear-gradient(135deg, ${accent}20, transparent 60%)` } : undefined}
        />
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-6 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
        {isDbCur && item.imagem_url ? (
          <img
            src={item.imagem_url}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-contain object-right opacity-[0.28] pointer-events-none mix-blend-screen"
          />
        ) : (
          <Icon className="absolute -right-3 -bottom-3 w-24 h-24 text-primary/[0.06] pointer-events-none" strokeWidth={1.5} />
        )}

        <div className="relative h-full flex flex-col">
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 shrink-0">
              {isTempo ? (
                <>
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${pct * 0.97} 100`}
                      style={{ transition: 'stroke-dasharray 0.8s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                </>
              ) : isDbCur ? (
                <div
                  className="w-full h-full rounded-xl border flex items-center justify-center"
                  style={{ background: `${accent}22`, borderColor: `${accent}55` }}
                >
                  <Icon className="w-5 h-5" style={{ color: accent }} />
                </div>
              ) : (
                <div className="w-full h-full rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
            <p
              className="font-body text-white/70 text-[10px] uppercase tracking-[0.14em] leading-tight flex-1 min-w-0"
              style={isDbCur ? { color: `${accent}dd` } : undefined}
            >
              {item.label}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center min-w-0 mt-1">
            {isStat ? (
              <>
                <p className="font-display text-white text-[26px] sm:text-[28px] font-bold leading-none tabular-nums truncate">
                  {item.getValue()}
                </p>
                <p className="font-body text-white/60 text-[11px] leading-snug mt-1.5 line-clamp-2">
                  {item.subtitle}
                </p>
              </>
            ) : item.type === 'quote' ? (
              <div className="space-y-1">
                <p className="font-body text-white text-[13px] sm:text-[14px] leading-snug line-clamp-3">
                  “{item.frase}”
                </p>
                <p className="font-body text-primary/80 text-[11px] leading-tight">
                  — {item.autor}
                </p>
              </div>
            ) : item.type === 'termo' ? (
              <div className="space-y-1">
                <p className="font-display text-primary text-[15px] sm:text-[16px] font-bold leading-tight truncate">
                  {item.termo}
                </p>
                <p className="font-body text-white/85 text-[11.5px] leading-snug line-clamp-3">
                  {item.significado}
                </p>
              </div>
            ) : item.type === 'db-curiosity' ? (
              <p
                className="font-body text-white text-[13px] sm:text-[14px] leading-snug line-clamp-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]"
                style={{ textShadow: `0 0 20px ${accent}22` }}
              >
                {item.texto}
              </p>
            ) : (
              <p className="font-body text-white text-[13px] sm:text-[14px] leading-snug line-clamp-4">
                {item.texto}
              </p>
            )}
          </div>

          <div className="flex items-end justify-between gap-2 mt-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <ScrollText className="w-3 h-3 text-primary/70 shrink-0" />
              <p className="font-body text-white/50 text-[9px] sm:text-[10px] leading-tight truncate">
                {totalLeis} leis disponíveis
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (wide) {
    // Duplicamos os itens para dar sensação de carrossel infinito (loop visual).
    const looped = [...items, ...items];
    return (
      <div
        className="-mx-4 pl-10 pr-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollPaddingLeft: '2.5rem', scrollPaddingRight: '1rem' }}
      >
        {looped.map((item, i) => (
          <div
            key={i}
            className="snap-start shrink-0 w-[82%]"
          >
            {renderCard(item, i)}
          </div>
        ))}
      </div>
    );
  }


  const current = items[idx];
  return (
    <div key={idx} className="animate-in fade-in slide-in-from-right-3 duration-500">
      {renderCard(current, idx)}
    </div>
  );
};

/* Avatar with graceful fallback (Google photo often 403s without no-referrer) */
const AvatarWithFallback = ({ src, nome, iniciais }: { src?: string; nome: string; iniciais: string }) => {
  const [errored, setErrored] = useState(false);
  const show = src && !errored;
  return show ? (
    <img
      src={src}
      alt={nome}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      loading="eager"
      decoding="async"
      onError={() => setErrored(true)}
      className="w-12 h-12 rounded-full object-cover border-[2.5px] border-primary/70 shadow-lg shadow-black/40 shrink-0 bg-primary/20"
    />
  ) : (
    <div className="w-12 h-12 rounded-full bg-primary/20 border-[2.5px] border-primary/70 flex items-center justify-center shadow-lg shadow-black/40 shrink-0">
      <span className="font-display text-primary text-base font-bold">{iniciais || 'V'}</span>
    </div>
  );
};

export default HomeHeaderHero;
