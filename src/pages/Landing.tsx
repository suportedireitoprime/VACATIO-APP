import { useState, useEffect } from 'react';
import { pickAsset, srcOf } from '@/lib/assetUrl';
import { supabase } from '@/integrations/supabase/client';
import { trackStartJourney } from '@/lib/fbPixel';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Scale, BookOpen, Radar, Brain, Star, PlayCircle, Headphones,
  ClipboardCheck, GraduationCap, ChevronDown, Check, Zap, ShieldCheck, Menu, X,
} from 'lucide-react';

import logoAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import logoBundled from '@/assets/bundled/logo-vacatio-v2.webp';
import landingVademecumV2 from '@/assets/landing-vademecum-v2.webp';
import landingBibliotecaAsset from '@/assets/landing-biblioteca.webp.asset.json';
import landingBibliotecaBundled from '@/assets/bundled/landing-biblioteca.webp';
import landingEstudarAsset from '@/assets/landing-estudar.webp';
import landingRadarAsset from '@/assets/landing-radar.webp.asset.json';
import landingRadarBundled from '@/assets/bundled/landing-radar.webp';
import landingVideoaulasAsset from '@/assets/landing-videoaulas.webp.asset.json';
import landingVideoaulasBundled from '@/assets/bundled/landing-videoaulas.webp';
import authCourtroomScene from '@/assets/auth-courtroom-scene.webp';
import direitoDoTrabalhoImg from '@/assets/biblioteca/areas/direito-do-trabalho.jpg';
import brasaoRepublica from '@/assets/brasao-republica.webp';

import cargoPP from '@/assets/cargos/policia-penal-rs.webp';
import cargoDF from '@/assets/cargos/policia-civil-df.webp';
import cargoMA from '@/assets/cargos/policia-civil-ma.webp';
import cargoCE from '@/assets/cargos/policia-civil-ce.webp';
import cargoPF from '@/assets/cargos/policia-federal.webp';
import cargoPRF from '@/assets/cargos/policia-rodoviaria-federal.webp';
import cargoPMSP from '@/assets/cargos/policia-militar-sp.webp';

const CARGO_BADGES: { url: string; label: string }[] = [
  { url: cargoPF, label: 'Polícia Federal' },
  { url: cargoPRF, label: 'Polícia Rodoviária Federal' },
  { url: cargoDF, label: 'Polícia Civil DF' },
  { url: cargoPMSP, label: 'Polícia Militar SP' },
  { url: cargoCE, label: 'Polícia Civil CE' },
  { url: cargoMA, label: 'Polícia Civil MA' },
  { url: cargoPP, label: 'Polícia Penal RS' },
];

const logo = pickAsset(logoBundled, logoAsset.url);
const imgVadeMecum = landingVademecumV2;
const imgBiblioteca = pickAsset(landingBibliotecaBundled, landingBibliotecaAsset.url);
const imgEstudar = landingEstudarAsset;
const imgRadar = pickAsset(landingRadarBundled, landingRadarAsset.url);
const imgVideoaulas = pickAsset(landingVideoaulasBundled, landingVideoaulasAsset.url);
const imgDireitoDoTrabalho = direitoDoTrabalhoImg;

const ROTATING_WORDS = ['COMENTADA', 'NARRADA', 'GRIFADA', 'EXPLICADA', 'NA SUA MÃO'];

const HERO_TAGS: { n: string; s: string }[] = [
  { n: 'CF/1988', s: 'Constituição Federal' },
  { n: 'DL 2.848/1940', s: 'Código Penal' },
  { n: 'DL 3.689/1941', s: 'CPP' },
  { n: 'DL 5.452/1943', s: 'CLT' },
  { n: 'Lei 10.406/2002', s: 'Código Civil' },
  { n: 'Lei 13.105/2015', s: 'CPC' },
  { n: 'Lei 8.078/1990', s: 'CDC' },
  { n: 'Lei 8.069/1990', s: 'ECA' },
  { n: 'Lei 11.340/2006', s: 'Maria da Penha' },
  { n: 'Lei 5.172/1966', s: 'CTN' },
  { n: 'Lei 11.343/2006', s: 'Lei de Drogas' },
  { n: 'Lei 7.210/1984', s: 'LEP' },
  { n: 'Lei 8.906/1994', s: 'Estatuto da OAB' },
  { n: 'Lei 9.099/1995', s: 'Juizados Especiais' },
  { n: 'Lei 9.503/1997', s: 'CTB' },
  { n: 'Lei 12.965/2014', s: 'Marco Civil' },
  { n: 'Lei 13.709/2018', s: 'LGPD' },
  { n: 'Lei 8.112/1990', s: 'RJU' },
  { n: 'Lei 14.133/2021', s: 'Nova Licitações' },
  { n: 'Lei 8.666/1993', s: 'Licitações' },
  { n: 'Lei 9.784/1999', s: 'Proc. Administrativo' },
  { n: 'Lei 9.605/1998', s: 'Crimes Ambientais' },
  { n: 'Lei 12.850/2013', s: 'Org. Criminosas' },
  { n: 'Lei 8.429/1992', s: 'Improbidade' },
  { n: 'Lei 14.230/2021', s: 'Nova Improbidade' },
  { n: 'Lei 12.527/2011', s: 'LAI' },
  { n: 'Lei 10.257/2001', s: 'Estatuto da Cidade' },
  { n: 'Lei 10.741/2003', s: 'Estatuto do Idoso' },
  { n: 'Lei 13.146/2015', s: 'Estatuto da PCD' },
  { n: 'Lei 12.288/2010', s: 'Igualdade Racial' },
  { n: 'Lei 11.101/2005', s: 'Recuperação Judicial' },
  { n: 'Lei 9.279/1996', s: 'Propriedade Industrial' },
  { n: 'Lei 9.610/1998', s: 'Direitos Autorais' },
  { n: 'Lei 8.245/1991', s: 'Locações' },
  { n: 'Lei 6.404/1976', s: 'S.A.' },
  { n: 'Lei 4.737/1965', s: 'Código Eleitoral' },
  { n: 'Lei 9.504/1997', s: 'Lei das Eleições' },
  { n: 'Lei 8.213/1991', s: 'Previdência' },
  { n: 'Lei 8.080/1990', s: 'SUS' },
  { n: 'Lei 9.394/1996', s: 'LDB' },
  { n: 'Lei 13.467/2017', s: 'Reforma Trabalhista' },
  { n: 'Lei 13.964/2019', s: 'Pacote Anticrime' },
  { n: 'Lei 12.318/2010', s: 'Alienação Parental' },
  { n: 'Lei 11.419/2006', s: 'Proc. Eletrônico' },
  { n: 'Lei 13.869/2019', s: 'Abuso de Autoridade' },
  { n: 'Lei 12.846/2013', s: 'Anticorrupção' },
  { n: 'Lei 8.137/1990', s: 'Crimes Tributários' },
  { n: 'Lei 9.296/1996', s: 'Interceptações' },
  { n: 'Lei 11.417/2006', s: 'Súmula Vinculante' },
  { n: 'Lei 13.140/2015', s: 'Mediação' },
];

/* ─────────────────────────── TOP BAR ─────────────────────────── */
function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-background/85 backdrop-blur-md border-b border-primary/20' : 'bg-transparent'
        }`}
        style={{
          paddingTop: 'var(--sai-top, env(safe-area-inset-top, 0px))',
          paddingLeft: 'var(--sai-left, env(safe-area-inset-left, 0px))',
          paddingRight: 'var(--sai-right, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 lg:px-8 h-16">
          <Link to="/landing" className="flex items-center gap-2.5">
            <img src={logo} alt="Vacatio" className="w-9 h-9 rounded-md object-cover" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-2xl text-foreground tracking-wide">
                VACATIO
              </span>
              <span className="font-body text-[10px] sm:text-xs text-white/80 dark:text-white/70 tracking-[0.18em] uppercase mt-0.5">
                Vade Mecum 2026
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 font-body text-sm text-muted-foreground">
            <a href="#recursos" className="hover:text-primary transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-primary transition-colors">Como funciona</a>
            <a href="#planos" className="hover:text-primary transition-colors">Planos</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link to="/auth" className="font-body text-sm text-foreground/80 hover:text-primary transition">
              Entrar
            </Link>
            <Link
              to="/auth"
              className="bg-primary text-primary-foreground font-display tracking-wide text-base px-5 py-2 rounded-md hover:bg-primary-light active:scale-95 transition"
            >
              COMEÇAR AGORA
            </Link>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="lg:hidden w-10 h-10 rounded-md border border-border flex items-center justify-center text-foreground"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-lg lg:hidden"
          >
            <div
              className="flex items-center justify-between px-4 h-16 border-b border-border"
              style={{ paddingTop: 'var(--sai-top, env(safe-area-inset-top, 0px))' }}
            >
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="Vacatio" className="w-9 h-9 rounded-md object-cover" />
                <div className="flex flex-col leading-none">
                  <span className="font-display text-2xl">VACATIO</span>
                  <span className="font-body text-[10px] tracking-[0.18em] uppercase text-white/80 mt-0.5">
                    Vade Mecum 2026
                  </span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-10 h-10 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col p-6 gap-5 font-display text-3xl">
              {[
                ['#recursos', 'RECURSOS'],
                ['#como-funciona', 'COMO FUNCIONA'],
                ['#planos', 'PLANOS'],
                ['#faq', 'FAQ'],
              ].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setOpen(false)} className="text-foreground hover:text-primary transition">
                  {label}
                </a>
              ))}
              <div className="pt-4 flex flex-col gap-3">
                <Link to="/auth" onClick={() => setOpen(false)} className="text-center py-3 border border-border rounded-md font-body text-base">
                  Entrar
                </Link>
                <Link to="/auth" onClick={() => setOpen(false)} className="text-center py-3 bg-primary text-primary-foreground rounded-md font-display tracking-wide text-lg">
                  COMEÇAR AGORA
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────── LEGAL ICONS BACKDROP ─────────────────────── */
/* SVGs jurídicos flutuando ao redor do hero — mesmo espírito do painel amarelo */
function LegalIconsBackdrop() {
  const icons: Array<{
    pos: string;
    size: string;
    delay: number;
    duration: number;
    rotate?: number;
    svg: JSX.Element;
  }> = [
    {
      // Themis (silhueta com balança) — topo esquerdo
      pos: 'top-[8%] left-[4%] sm:left-[6%]',
      size: 'w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32',
      delay: 0,
      duration: 6,
      rotate: 3,
      svg: (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="10" r="4" />
          <path d="M32 14v34" />
          <path d="M22 48h20" />
          <path d="M26 54h12" />
          <path d="M12 22h40" />
          <path d="M18 22l-6 10h12z" />
          <path d="M46 22l-6 10h12z" />
          <path d="M12 32a6 6 0 0 0 12 0" />
          <path d="M40 32a6 6 0 0 0 12 0" />
        </svg>
      ),
    },
    {
      // Balança — topo direito
      pos: 'top-[10%] right-[4%] sm:right-[8%]',
      size: 'w-14 h-14 sm:w-20 sm:h-20 lg:w-28 lg:h-28',
      delay: 0.8,
      duration: 5,
      rotate: -4,
      svg: (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 8v44" />
          <path d="M18 52h28" />
          <path d="M10 18h44" />
          <path d="M4 34a8 8 0 0 0 16 0L12 18z" />
          <path d="M44 34a8 8 0 0 0 16 0L52 18z" />
        </svg>
      ),
    },
    {
      // Martelo (gavel) — meio esquerdo
      pos: 'top-[45%] left-[2%] sm:left-[4%]',
      size: 'w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24',
      delay: 1.4,
      duration: 5.5,
      rotate: 6,
      svg: (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="30" y="6" width="24" height="12" rx="2" transform="rotate(45 42 12)" />
          <path d="M20 26l14 14" />
          <path d="M8 50l14-14" />
          <path d="M6 58h24" />
        </svg>
      ),
    },
    {
      // Coluna romana — meio direito
      pos: 'top-[42%] right-[2%] sm:right-[5%]',
      size: 'w-12 h-16 sm:w-16 sm:h-24 lg:w-20 lg:h-32',
      delay: 2,
      duration: 6,
      rotate: -2,
      svg: (
        <svg viewBox="0 0 40 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="28" height="6" />
          <rect x="4" y="10" width="32" height="4" />
          <path d="M12 14v40" />
          <path d="M20 14v40" />
          <path d="M28 14v40" />
          <rect x="4" y="54" width="32" height="4" />
          <rect x="6" y="58" width="28" height="6" />
        </svg>
      ),
    },
    {
      // Coroa de louros — inferior esquerdo
      pos: 'bottom-[12%] left-[5%] sm:left-[10%]',
      size: 'w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28',
      delay: 0.5,
      duration: 5,
      rotate: 4,
      svg: (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 12v40" />
          <path d="M32 20c-8-4-14 0-14 8s6 14 14 14" />
          <path d="M32 20c8-4 14 0 14 8s-6 14-14 14" />
          <path d="M22 24c-4 0-6 3-6 6" />
          <path d="M42 24c4 0 6 3 6 6" />
          <path d="M20 34c-3 0-5 3-4 6" />
          <path d="M44 34c3 0 5 3 4 6" />
          <path d="M28 52h8" />
        </svg>
      ),
    },
    {
      // Livro/código aberto — inferior direito
      pos: 'bottom-[14%] right-[5%] sm:right-[10%]',
      size: 'w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28',
      delay: 1.8,
      duration: 5.5,
      rotate: -3,
      svg: (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 18C24 12 12 12 6 14v36c6-2 18-2 26 4" />
          <path d="M32 18c8-6 20-6 26-4v36c-6-2-18-2-26 4z" />
          <path d="M32 18v40" />
          <path d="M12 24h14" />
          <path d="M12 32h14" />
          <path d="M38 24h14" />
          <path d="M38 32h14" />
        </svg>
      ),
    },
    {
      // Pena escrevendo — flutuando perto do CTA
      pos: 'bottom-[30%] left-[42%] hidden lg:block',
      size: 'lg:w-16 lg:h-16',
      delay: 2.5,
      duration: 6,
      rotate: 8,
      svg: (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 58l12-12" />
          <path d="M18 46c8-4 20-16 32-40-4 20-12 32-24 40-4 3-8 3-8 0z" />
          <path d="M22 42l8-8" />
        </svg>
      ),
    },
    {
      // Emblema (escudo) — topo central atrás
      pos: 'top-[4%] left-1/2 -translate-x-1/2 hidden md:block',
      size: 'md:w-16 md:h-16 lg:w-20 lg:h-20',
      delay: 1.2,
      duration: 7,
      rotate: 0,
      svg: (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 6l22 6v18c0 14-10 24-22 28-12-4-22-14-22-28V12z" />
          <path d="M24 32l6 6 12-12" />
        </svg>
      ),
    },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {icons.map((it, i) => (
        <motion.div
          key={i}
          className={`absolute ${it.pos} ${it.size} text-primary/25`}
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: [0.15, 0.35, 0.15],
            y: [0, -10, 0],
            rotate: it.rotate ? [0, it.rotate, 0] : 0,
          }}
          transition={{
            duration: it.duration,
            delay: it.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {it.svg}
        </motion.div>
      ))}
    </div>
  );
}

/* ─────────────────────────── HERO ─────────────────────────── */

function Hero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  const tagsLoop = [...HERO_TAGS, ...HERO_TAGS];

  return (
    <section className="relative min-h-[100vh] flex flex-col overflow-hidden bg-black pt-16">
      {/* ── DESKTOP: painel duplo com texto centralizado ── */}
      <div className="hidden lg:block relative flex-1 min-h-[calc(100vh-64px)] overflow-hidden">
        {/* LEFT: Direito Penal / tribunal */}
        <div className="absolute inset-y-0 left-0 w-[42%] xl:w-[40%]">
          <img
            src={authCourtroomScene}
            alt="Tribunal brasileiro — Direito Penal"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/70 to-black" />
        </div>

        {/* RIGHT: Direito do Trabalho */}
        <div className="absolute inset-y-0 right-0 w-[42%] xl:w-[40%]">
          <img
            src={imgDireitoDoTrabalho}
            alt="Direito do Trabalho"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-black/70 to-black" />
        </div>

        {/* CENTER: headline + CTA centralizado */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8"
        >
          <div className="text-center max-w-2xl">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img
                src={logo}
                alt="Vacatio"
                className="w-11 h-11 rounded-lg object-cover border-2 border-primary/50 shadow-2xl"
              />
              <div className="h-px w-20 bg-gradient-to-r from-primary/60 to-transparent" />
              <span className="font-body text-[10px] uppercase tracking-[0.3em] text-primary/80">
                Est. 2026
              </span>
            </div>

            <h1 className="font-display text-6xl xl:text-7xl leading-[0.9] uppercase text-white">
              <motion.span
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="block"
              >
                Todas as leis
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="block"
              >
                do Brasil
              </motion.span>
              <span className="block relative h-[1em] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={ROTATING_WORDS[wordIndex]}
                    initial={{ y: '100%', opacity: 0, filter: 'blur(6px)' }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                    exit={{ y: '-100%', opacity: 0, filter: 'blur(6px)' }}
                    transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                    className="block text-primary"
                  >
                    {ROTATING_WORDS[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 font-body text-lg xl:text-xl text-white/85 max-w-lg mx-auto leading-snug"
            >
              <span className="text-white font-semibold">Comentada, narrada e sempre atualizada para você dominar o direito onde estiver.</span>{' '}
              Consulte, estude e tire dúvidas com a{' '}
              <span className="text-primary font-semibold">IA Jurídica</span> 24/7.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                to="/auth"
                onClick={() => trackStartJourney('hero_desktop')}
                className="group inline-flex items-center gap-2 bg-primary text-primary-foreground font-display tracking-wide text-lg px-8 py-4 rounded-md hover:bg-primary-light active:scale-95 transition-all shadow-hazard"
              >
                INICIAR JORNADA
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#recursos"
                className="inline-flex items-center gap-2 font-body text-sm text-white/75 hover:text-primary transition"
              >
                <PlayCircle className="w-5 h-5" /> Ver como funciona
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 flex items-center justify-center gap-2 text-sm font-body text-white/70"
            >
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span>
                <strong className="text-white">+10.000</strong> juristas, estudantes e concurseiros já estudam aqui
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Hazard-tape rodapé */}
        <div className="absolute bottom-0 inset-x-0 h-3 hazard-tape opacity-90 z-20" />
      </div>

      {/* ── MOBILE: hero cinematográfico ── */}
      <div className="lg:hidden relative flex-1 flex flex-col bg-black">
        {/* Cover cinematográfica compacta */}
        <div className="relative h-[44vh] min-h-[340px] max-h-[440px] overflow-hidden">
          <img
            src={authCourtroomScene}
            alt="Tribunal brasileiro"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black" />

          {/* Headline principal na base da cover */}
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="absolute bottom-5 left-4 right-4 z-10 text-center"
          >
            <motion.img
              src={brasaoRepublica}
              alt="Brasão da República"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="w-24 h-auto mx-auto mb-3 opacity-40 drop-shadow-[0_4px_18px_rgba(250,204,21,0.35)]"
            />
            <span className="inline-block mb-2 font-body text-[10px] uppercase tracking-[0.4em] text-primary/90">
              A Bíblia Jurídica Digital
            </span>
            <h1 className="font-display uppercase text-white leading-[0.9] text-[clamp(34px,10vw,44px)]">
              <span className="block">Todas as leis</span>
              <span className="block">do Brasil</span>
              <span className="block relative h-[1em] overflow-hidden mt-0.5">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={ROTATING_WORDS[wordIndex]}
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                    className="block text-primary"
                  >
                    {ROTATING_WORDS[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
            <p className="mt-3 font-body text-[13.5px] leading-snug text-white/80 max-w-[320px] mx-auto">
              Narrada, comentada e sempre atualizada — para você <span className="text-white font-semibold">dominar o Direito</span> onde estiver.
            </p>
          </motion.div>

        </div>

        {/* CTA em destaque — acima da dobra */}
        <div className="relative px-4 pt-5 pb-4">
          <Link
            to="/auth"
            onClick={() => trackStartJourney('hero_mobile')}
            className="group relative w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display tracking-wide text-[19px] px-6 py-4 rounded-2xl active:scale-[0.98] transition-all shadow-[0_10px_30px_-8px_rgba(250,204,21,0.55)] search-bar-shine"
          >
            INICIAR JORNADA
            <ArrowRight className="w-5 h-5" />
          </Link>

          <div className="mt-3 flex items-center gap-1.5 justify-center text-[11.5px] font-body text-white/70">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span>
              <strong className="text-white">+10.000</strong> juristas estudam aqui
            </span>
          </div>
        </div>

        {/* Marquee: brasões de cargos jurídicos (transparentes) */}
        <div className="relative border-y border-primary/15 bg-black">
          <div className="relative overflow-hidden py-4">
            <div
              className="flex items-center gap-8 whitespace-nowrap badges-marquee-track"
              style={{ width: 'max-content' }}
            >
              {[...CARGO_BADGES, ...CARGO_BADGES, ...CARGO_BADGES].map((b, i) => (
                <div
                  key={`${b.label}-${i}`}
                  className="relative badge-shine flex-shrink-0"
                  aria-label={b.label}
                >
                  <img
                    src={b.url}
                    alt={b.label}
                    className="h-16 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black to-transparent" />
          </div>
        </div>


        {/* Descrição curta */}
        <div className="px-5 py-6 text-center">
          <p className="font-body text-[14.5px] text-white/80 leading-relaxed">
            <span className="text-white font-semibold">Comentada, narrada e sempre atualizada para você dominar o direito onde estiver.</span>{' '}
            Estude e tire dúvidas com nosso time de especialistas.
          </p>
        </div>

        <div className="h-2 hazard-tape opacity-90" />
      </div>
    </section>
  );
}


/* ─────────────────────────── STATS TICKER ─────────────────────────── */
const STATS = [
  { n: '+10.000', l: 'Alunos ativos' },
  { n: '+200', l: 'Leis catalogadas' },
  { n: '24/7', l: 'IA disponível' },
  { n: '+1.200', l: 'Artigos comentados' },
  { n: '+500', l: 'Videoaulas' },
  { n: 'AO VIVO', l: 'Radar legislativo' },
];

function StatsTicker() {
  const items = [...STATS, ...STATS];
  return (
    <section className="bg-primary text-primary-foreground py-4 overflow-hidden border-y-2 border-primary-foreground/10">
      <div className="flex gap-12 whitespace-nowrap animate-ticker" style={{ width: 'max-content' }}>
        {items.map((s, i) => (
          <div key={i} className="flex items-center gap-3 font-display text-2xl tracking-wide">
            <span className="text-3xl">{s.n}</span>
            <span className="opacity-70 text-lg">— {s.l}</span>
            <span className="opacity-40 ml-6">/</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── SECTION HELPERS ─────────────────────────── */
function SectionTag({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="font-display text-3xl text-primary tracking-wider">{n}</span>
      <span className="h-px flex-1 max-w-[80px] bg-primary/60" />
      <span className="font-body text-xs uppercase tracking-[0.3em] text-primary/80">{label}</span>
    </div>
  );
}

function SectionHeadline({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="font-display text-5xl lg:text-7xl leading-[0.95] uppercase mb-5"
    >
      {children}
    </motion.h2>
  );
}

function SectionCopy({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="font-body text-base lg:text-lg leading-relaxed mb-6"
    >
      {children}
    </motion.p>
  );
}

function FeatureVisual({ src, alt, invert = false }: { src: string; alt: string; invert?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="relative rounded-xl overflow-hidden border-2 border-primary/30 shadow-hazard"
    >
      <div className={`absolute inset-0 ${invert ? 'bg-gradient-to-tr from-primary/20 to-transparent' : 'bg-gradient-to-tr from-background/70 to-transparent'}`} />
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur border border-primary/40 px-2.5 py-1 rounded font-body text-[10px] uppercase tracking-widest text-primary">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Preview
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── FEATURES ─────────────────────────── */
function FeatureVadeMecum() {
  return (
    <section id="recursos" className="py-24 lg:py-32 px-5 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <SectionTag n="01" label="Vade Mecum comentado" />
          <SectionHeadline>
            Lei seca?<br />
            <span className="text-primary">Nunca mais.</span>
          </SectionHeadline>
          <SectionCopy>
            Todo artigo da Constituição, dos Códigos e das leis especiais vem com{' '}
            <strong className="text-foreground">comentários, exemplos práticos, jurisprudência e explicação artigo por artigo</strong>{' '}
            gerada por IA jurídica treinada em milhares de decisões.
          </SectionCopy>
          <ul className="space-y-3 font-body text-sm text-muted-foreground">
            {[
              'Grifos coloridos com anotações salvas por artigo',
              'Explicação simples + explicação técnica',
              'Jurisprudência relacionada em 1 toque',
              'Modo áudio para estudar no trânsito',
            ].map((it) => (
              <li key={it} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
        <FeatureVisual src={imgVadeMecum} alt="Vade Mecum comentado" />
      </div>
    </section>
  );
}

function FeatureIA() {
  return (
    <section className="py-24 lg:py-32 px-5 lg:px-8 bg-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-3 hazard-tape opacity-90" />
      <div className="absolute bottom-0 inset-x-0 h-3 hazard-tape opacity-90" />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="order-2 lg:order-1"
        >
          <div className="bg-background text-foreground rounded-xl border-2 border-background shadow-hazard p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-display text-xl leading-none">IA JURÍDICA</div>
                <div className="font-body text-xs text-muted-foreground">Assistente IA</div>
              </div>
              <span className="ml-auto text-[10px] font-body uppercase tracking-widest text-primary">Online</span>
            </div>
            <div className="flex justify-end">
              <div className="bg-secondary text-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] font-body text-sm">
                Explica o Art. 5º, LXVIII, com um exemplo prático.
              </div>
            </div>
            <div className="flex">
              <div className="bg-primary/10 border border-primary/30 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] font-body text-sm leading-relaxed">
                <strong>Habeas Corpus.</strong> Sempre que alguém sofrer ou se achar ameaçado de sofrer violência
                ou coação em sua liberdade de locomoção por ilegalidade ou abuso de poder…
                <br /><br />
                <em className="text-muted-foreground">Exemplo: um pedreiro preso sem flagrante nem ordem judicial pode impetrar HC imediatamente.</em>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              {['Simplifique', 'Cite jurisprudência', 'Faça uma questão'].map((c) => (
                <span key={c} className="text-[11px] font-body px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="order-1 lg:order-2">
          <SectionTag n="02" label="IA Jurídica" />
          <h2 className="font-display text-5xl lg:text-7xl leading-[0.95] uppercase mb-5">
            Sua tutora<br />
            <span className="underline decoration-[6px] underline-offset-4">24/7.</span>
          </h2>
          <p className="font-body text-base lg:text-lg leading-relaxed mb-6">
            Nossa IA é treinada em toda legislação brasileira. Ela{' '}
            <strong>explica qualquer artigo</strong>, faz analogias, cria questões objetivas
            e resume decisões — direto do seu bolso.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { i: Zap, l: 'Resposta em segundos' },
              { i: ShieldCheck, l: 'Fontes citadas' },
              { i: Brain, l: 'Contexto do artigo' },
              { i: Headphones, l: 'Áudio narrado' },
            ].map(({ i: Icon, l }) => (
              <div key={l} className="flex items-center gap-2 bg-background/20 backdrop-blur border border-primary-foreground/20 rounded-md px-3 py-2 font-body text-sm">
                <Icon className="w-4 h-4" /> {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BibliotecaCoversMosaic() {
  const [capas, setCapas] = useState<string[]>([]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from('biblioteca_classicos')
        .select('imagem')
        .not('imagem', 'is', null)
        .order('id', { ascending: true })
        .limit(24);
      if (!ativo || !data) return;
      const urls = data.map((r: any) => r.imagem).filter(Boolean);
      setCapas(urls);
    })();
    return () => { ativo = false; };
  }, []);

  // Fallback enquanto carrega: usa a imagem antiga de biblioteca
  if (capas.length === 0) {
    return <FeatureVisual src={imgBiblioteca} alt="Clássicos do Direito" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
      className="relative rounded-xl overflow-hidden border-2 border-primary/30 shadow-hazard bg-gradient-to-br from-stone-900 via-stone-950 to-black aspect-[4/3]"
    >
      <div className="absolute inset-0 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 p-2">
        {capas.slice(0, 24).map((url, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-sm shadow-lg ring-1 ring-primary/10"
          >
            <img
              src={url}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur border border-primary/40 px-2.5 py-1 rounded font-body text-[10px] uppercase tracking-widest text-primary">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Clássicos do Direito
      </div>
    </motion.div>
  );
}

function FeatureBiblioteca() {
  return (
    <section className="py-24 lg:py-32 px-5 lg:px-8">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <BibliotecaCoversMosaic />
        <div>
          <SectionTag n="03" label="Biblioteca digital" />
          <SectionHeadline>
            Mais de <span className="text-primary">500</span><br /> livros<br />jurídicos.
          </SectionHeadline>
          <SectionCopy>
            Dos <strong className="text-foreground">clássicos que formaram o Direito</strong> às
            doutrinas mais atuais — todo o acervo que um jurista de verdade precisa,
            na palma da sua mão, pronto para ler, estudar e citar em qualquer lugar.
          </SectionCopy>
          <div className="flex flex-wrap gap-2">
            {['Clássicos', 'Doutrinas', 'Estudos', 'Liderança', 'Oratória'].map((t) => (
              <span key={t} className="font-body text-xs px-3 py-1.5 border border-primary/40 rounded-full text-primary">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureVideoaulas() {
  return (
    <section className="py-24 lg:py-32 px-5 lg:px-8 bg-card">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <SectionTag n="04" label="Videoaulas + Transcrição IA" />
          <SectionHeadline>Assiste,<br />transcreve,<br /><span className="text-primary">resume.</span></SectionHeadline>
          <SectionCopy>
            Aulas curadas do YouTube com <strong className="text-foreground">transcrição automática, resumo por IA e
            geração de flashcards</strong> — assistir vira estudo estruturado.
          </SectionCopy>
          <div className="flex items-center gap-3 font-body text-sm text-muted-foreground">
            <PlayCircle className="w-5 h-5 text-primary" /> +500 aulas indexadas
          </div>
        </div>
        <FeatureVisual src={imgVideoaulas} alt="Videoaulas com transcrição" />
      </div>
    </section>
  );
}

function FeatureRadar() {
  const pls = [
    { pl: 'PL 2338/2023', tema: 'Marco legal da IA', status: 'Em votação' },
    { pl: 'PL 1904/2024', tema: 'Reforma tributária', status: 'Aprovado CCJ' },
    { pl: 'PLP 108/2024', tema: 'Estatuto do Advogado', status: 'Relatoria' },
    { pl: 'PL 4/2025', tema: 'Redução de pena', status: 'Aguardando' },
  ];
  return (
    <section className="py-24 lg:py-32 px-5 lg:px-8">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="order-2 lg:order-1 bg-card border-2 border-primary/30 rounded-xl p-5 shadow-hazard"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-display tracking-wider text-primary">AO VIVO</span>
            </div>
            <Radar className="w-5 h-5 text-primary" />
          </div>
          <ul className="space-y-2">
            {pls.map((p, i) => (
              <motion.li
                key={p.pl}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
                className="flex items-center justify-between gap-3 p-3 bg-secondary/50 rounded-md border border-border hover:border-primary/40 transition"
              >
                <div>
                  <div className="font-display text-lg leading-none text-primary">{p.pl}</div>
                  <div className="font-body text-xs text-muted-foreground mt-0.5">{p.tema}</div>
                </div>
                <span className="font-body text-[10px] uppercase tracking-widest text-foreground/70 whitespace-nowrap">{p.status}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
        <div className="order-1 lg:order-2">
          <SectionTag n="05" label="Radar legislativo" />
          <SectionHeadline>Câmara,<br />Senado,<br /><span className="text-primary">tempo real.</span></SectionHeadline>
          <SectionCopy>
            Monitore proposições, votações e alterações legislativas assim que elas acontecem.
            IA gera manchetes contextuais e resume o que <strong className="text-foreground">pode mudar na lei</strong>.
          </SectionCopy>
        </div>
      </div>
    </section>
  );
}


function FeatureNarracao() {
  return (
    <section className="py-24 lg:py-32 px-5 lg:px-8">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative bg-card border-2 border-primary/30 rounded-xl p-6 shadow-hazard"
        >
          <div className="flex items-center gap-3 mb-4">
            <button className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center animate-pulse-hazard">
              <PlayCircle className="w-6 h-6" />
            </button>
            <div>
              <div className="font-display text-xl leading-none">Art. 5º · CF/88</div>
              <div className="font-body text-xs text-muted-foreground">Narrado por IA · 2:14</div>
            </div>
          </div>
          <div className="flex items-end gap-1 h-16">
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                className="flex-1 bg-primary rounded-sm animate-waveform"
                style={{
                  height: `${20 + Math.random() * 80}%`,
                  animationDelay: `${(i * 60) % 900}ms`,
                }}
              />
            ))}
          </div>
        </motion.div>
        <div>
          <SectionTag n="07" label="Narração em áudio" />
          <SectionHeadline>Ouça a lei<br /><span className="text-primary">como podcast.</span></SectionHeadline>
          <SectionCopy>
            Narração natural gerada com Gemini TTS de qualquer artigo, com{' '}
            <strong className="text-foreground">playlist offline</strong> para estudar no trânsito, na academia, onde for.
          </SectionCopy>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── HOW IT WORKS ─────────────────────────── */
function HowItWorks() {
  const steps = [
    { n: '01', t: 'Abra qualquer lei', d: 'Constituição, Códigos, Estatutos e leis especiais — indexadas, atualizadas e pesquisáveis por artigo.' },
    { n: '02', t: 'Consulte do seu jeito', d: 'Ouça a narração, leia os comentários, grife em 5 cores, anote, veja jurisprudência ou pergunte à IA.' },
    { n: '03', t: 'Domine o Direito', d: 'Flashcards, mapas mentais e videoaulas — tudo gerado a partir do artigo que você está lendo.' },
  ];
  return (
    <section id="como-funciona" className="py-24 lg:py-32 px-5 lg:px-8 bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-body text-xs uppercase tracking-[0.3em] mb-3 opacity-70">Como funciona</div>
          <h2 className="font-display text-5xl lg:text-8xl uppercase leading-[0.9]">
            Consulte a lei.<br />Domine o Direito.
          </h2>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="border-2 border-background/20 bg-background/10 backdrop-blur rounded-xl p-6"
            >
              <div className="font-display text-7xl leading-none opacity-40 mb-4">{s.n}</div>
              <h3 className="font-display text-3xl uppercase mb-2">{s.t}</h3>
              <p className="font-body text-sm leading-relaxed opacity-80">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── TESTIMONIALS ─────────────────────────── */
function Testimonials() {
  const items = [
    { name: 'Rafaela M.', role: 'Aprovada OAB 40', quote: 'A IA me acompanhou os 6 meses inteiros. Passei na 1ª tentativa.' },
    { name: 'Diego S.', role: 'Estudante 8º semestre', quote: 'Nunca mais abri PDF de lei. Aqui tudo é comentado e narrado.' },
    { name: 'Camila R.', role: 'Advogada tributarista', quote: 'O radar legislativo me economiza umas 3h por semana lendo diário oficial.' },
  ];
  return (
    <section className="py-24 lg:py-32 px-5 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionTag n="08" label="Depoimentos" />
          <h2 className="font-display text-5xl lg:text-7xl uppercase">Quem estuda,<br /><span className="text-primary">recomenda.</span></h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <motion.div
              key={it.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/60 transition"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="font-body text-base leading-relaxed mb-4">"{it.quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center font-display text-primary">
                  {it.name[0]}
                </div>
                <div>
                  <div className="font-display text-lg leading-none">{it.name.toUpperCase()}</div>
                  <div className="font-body text-xs text-muted-foreground mt-0.5">{it.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── PRICING ─────────────────────────── */
function Pricing() {
  const plans = [
    {
      name: 'Gratuito',
      price: 'R$ 0',
      per: 'sempre',
      recommended: false,
      features: ['Vade Mecum completo', '3 perguntas para IA / mês', 'Grifos e anotações locais', 'Radar legislativo'],
    },
    {
      name: 'Premium',
      price: 'R$ 29',
      per: '/mês',
      recommended: true,
      features: [
        'Tudo do plano gratuito',
        'IA Jurídica ilimitada',
        'Biblioteca completa',
        'Videoaulas + resumos IA',
        
        'Narração em áudio ilimitada',
        'Sincronização entre dispositivos',
      ],
    },
  ];
  return (
    <section id="planos" className="py-24 lg:py-32 px-5 lg:px-8 bg-card">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <SectionTag n="09" label="Planos" />
          <h2 className="font-display text-5xl lg:text-7xl uppercase">Um preço<br /><span className="text-primary">para dominar tudo.</span></h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((p) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              className={`relative rounded-xl p-8 border-2 ${
                p.recommended ? 'border-primary bg-background shadow-hazard' : 'border-border bg-background/60'
              }`}
            >
              {p.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground font-display tracking-widest text-xs px-3 py-1 rounded-full">
                  RECOMENDADO
                </div>
              )}
              <div className="font-display text-3xl tracking-wide mb-2">{p.name.toUpperCase()}</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-6xl text-primary">{p.price}</span>
                <span className="font-body text-sm text-muted-foreground">{p.per}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 font-body text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`block text-center py-3 rounded-md font-display tracking-wide text-lg transition ${
                  p.recommended
                    ? 'bg-primary text-primary-foreground hover:bg-primary-light active:scale-95'
                    : 'border border-border text-foreground hover:border-primary'
                }`}
              >
                {p.recommended ? 'ASSINAR PREMIUM' : 'COMEÇAR GRÁTIS'}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FAQ ─────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="font-display text-xl lg:text-2xl uppercase tracking-wide pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-primary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="font-body text-sm text-muted-foreground pb-5 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQ() {
  const items = [
    { q: 'A legislação fica atualizada?', a: 'Sim. Sincronizamos com o Planalto e a Câmara diariamente e sinalizamos artigos revogados na hora.' },
    { q: 'A IA erra?', a: 'Ela cita as fontes de cada resposta. Se algo estiver impreciso, o botão de feedback treina o modelo e você recebe correção.' },
    { q: 'Funciona offline?', a: 'Vade Mecum, grifos e anotações funcionam 100% offline. Áudios ficam em cache local depois da 1ª geração.' },
    { q: 'Posso cancelar quando quiser?', a: 'Sim, direto pela loja (Google Play ou App Store) sem burocracia. Sem multa, sem fidelidade.' },
    { q: 'Serve para OAB e concursos?', a: 'Sim. Temos cronograma inteligente adaptável a qualquer edital, resumos, mapas mentais e questões geradas por IA.' },
  ];
  return (
    <section id="faq" className="py-24 lg:py-32 px-5 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <SectionTag n="10" label="Dúvidas frequentes" />
          <h2 className="font-display text-5xl lg:text-7xl uppercase">Perguntas<br /><span className="text-primary">rápidas.</span></h2>
        </div>
        <div>
          {items.map((it) => (
            <FAQItem key={it.q} {...it} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── FINAL CTA + FOOTER ─────────────────────────── */
function FinalCTA() {
  return (
    <section className="relative py-28 lg:py-40 px-5 lg:px-8 bg-primary text-primary-foreground overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-3 hazard-tape opacity-90" />
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-display text-6xl lg:text-9xl uppercase leading-[0.9] mb-6"
        >
          Comece hoje.<br />Chegue lá.
        </motion.h2>
        <p className="font-body text-lg lg:text-xl mb-10 max-w-xl mx-auto">
          Grátis para sempre no plano básico. Sem cartão, sem enrolação — só estudo de verdade.
        </p>
        <Link
          to="/auth"
          onClick={() => trackStartJourney('final_cta')}
          className="inline-flex items-center gap-2 bg-background text-foreground font-display tracking-wide text-xl px-10 py-5 rounded-md hover:scale-105 active:scale-95 transition-transform"
        >
          INICIAR JORNADA
          <ArrowRight className="w-6 h-6" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-background border-t border-border py-12 px-5 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Vacatio" className="w-9 h-9 rounded-md object-cover" />
          <div>
            <div className="font-display text-xl leading-none">VACATIO</div>
            <div className="font-body text-xs text-muted-foreground">Vade Mecum Jurídico · 2026</div>
          </div>
        </div>
        <div className="flex items-center gap-6 font-body text-sm text-muted-foreground">
          <a href="#recursos" className="hover:text-primary">Recursos</a>
          <a href="#planos" className="hover:text-primary">Planos</a>
          <a href="#faq" className="hover:text-primary">FAQ</a>
          <Link to="/auth" className="hover:text-primary">Entrar</Link>
        </div>
        <div className="font-body text-xs text-muted-foreground">
          © 2026 Vacatio · Todos os direitos reservados
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────── PAGE ─────────────────────────── */
export default function Landing() {
  return (
    <main className="bg-background text-foreground overflow-x-hidden">
      <TopBar />
      <Hero />
      <StatsTicker />
      <FeatureVadeMecum />
      <FeatureIA />
      <FeatureBiblioteca />
      <FeatureVideoaulas />
      <FeatureRadar />
      
      <FeatureNarracao />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
