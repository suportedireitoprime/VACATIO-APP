import { useState, useEffect, useRef, useCallback } from 'react';
import { pickAsset } from '@/lib/assetUrl';
import { Capacitor } from '@capacitor/core';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  KeyRound,
  Star,
  X 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LegalSheet } from '@/components/auth/LegalSheet';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription 
} from '@/components/ui/drawer';

/** Traduz mensagens de erro comuns do Supabase Auth para PT-BR. */
const traduzirErroAuth = (raw?: string): string => {
  const msg = (raw || '').toLowerCase();
  if (!msg) return 'Ocorreu um erro. Tente novamente.';
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials'))
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
  if (msg.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  if (msg.includes('user not found')) return 'Não encontramos uma conta com este e-mail.';
  if (msg.includes('user already registered') || msg.includes('already registered'))
    return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.';
  if (msg.includes('password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (msg.includes('weak password') || msg.includes('password is too weak'))
    return 'Senha muito fraca. Use letras, números e ao menos 6 caracteres.';
  if (msg.includes('rate limit') || msg.includes('too many requests'))
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (msg.includes('token has expired') || msg.includes('otp expired'))
    return 'O código expirou. Solicite um novo.';
  if (msg.includes('invalid token') || msg.includes('invalid otp'))
    return 'Código inválido. Verifique e tente novamente.';
  if (msg.includes('network') || msg.includes('failed to fetch'))
    return 'Sem conexão. Verifique sua internet e tente novamente.';
  if (msg.includes('email') && msg.includes('invalid')) return 'E-mail inválido.';
  return raw || 'Ocorreu um erro. Tente novamente.';
};

/** Toast de erro flutuante centralizado no topo, estilo card. */
const toastErroAuth = (raw?: string) =>
  toast.error(traduzirErroAuth(raw), {
    position: 'top-center',
    duration: 5000,
    className:
      'rounded-2xl border border-red-400/30 bg-neutral-900/95 backdrop-blur-xl shadow-2xl text-white px-4 py-3',
    style: { minWidth: '320px', maxWidth: '92vw' },
  });
import { useIsDesktop } from '@/hooks/use-desktop';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import logoOABnaRiscaAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import logoOABnaRiscaBundled from '@/assets/bundled/logo-vacatio-v2.webp';
const logoOABnaRisca = pickAsset(logoOABnaRiscaBundled, logoOABnaRiscaAsset.url);
import themisBgAsset from '@/assets/themis-bg.webp';
const themisBg = themisBgAsset;
import themisAuthYellowAsset from '@/assets/themis-auth-yellow.webp.asset.json';
import themisAuthYellowBundled from '@/assets/bundled/themis-auth-yellow.webp';
const themisAuthYellow = pickAsset(themisAuthYellowBundled, themisAuthYellowAsset.url);

import capa1 from '@/assets/capas/capa-1.webp';
import capa2 from '@/assets/capas/capa-2.webp';
import capa3 from '@/assets/capas/capa-3.webp';
import capa4 from '@/assets/capas/capa-4.webp';
import capa5 from '@/assets/capas/capa-5.webp';
import capa6 from '@/assets/capas/capa-6.webp';
import capa7 from '@/assets/capas/capa-7.webp';
import capa8 from '@/assets/capas/capa-8.webp';
import capa9 from '@/assets/capas/capa-9.webp';

const CAPAS_FUNDO = [capa1, capa2, capa3, capa4, capa5, capa6, capa7, capa8, capa9];
import authBgLeftAsset from '@/assets/auth-bg-left.webp';
const authBgLeft = authBgLeftAsset;
import authBgRightAsset from '@/assets/auth-bg-right.webp';
const authBgRight = authBgRightAsset;
import authCourtroomScene from '@/assets/auth-courtroom-scene.webp';
import authThemisImpact from '@/assets/auth-themis-impact.webp';
import brasaoRepublica from '@/assets/brasao-republica.webp';
import landingBibliotecaAsset from '@/assets/landing-biblioteca.webp.asset.json';
import landingBibliotecaBundled from '@/assets/bundled/landing-biblioteca.webp';
const landingBiblioteca = pickAsset(landingBibliotecaBundled, landingBibliotecaAsset.url);
import landingVademecumAsset from '@/assets/landing-vademecum.webp';
const landingVademecum = landingVademecumAsset;
import landingVideoaulasAsset from '@/assets/landing-videoaulas.webp.asset.json';
import landingVideoaulasBundled from '@/assets/bundled/landing-videoaulas.webp';
const landingVideoaulas = pickAsset(landingVideoaulasBundled, landingVideoaulasAsset.url);
import landingEstudarAsset from '@/assets/landing-estudar.webp';
const landingEstudar = landingEstudarAsset;
import landingRadarAsset from '@/assets/landing-radar.webp.asset.json';
import landingRadarBundled from '@/assets/bundled/landing-radar.webp';
const landingRadar = pickAsset(landingRadarBundled, landingRadarAsset.url);

const FEATURES = [
  { label: 'Vade Mecum', desc: 'Lei seca comentada', img: landingVademecum },
  { label: 'Biblioteca', desc: 'Livros jurídicos', img: landingBiblioteca },
  { label: 'Videoaulas', desc: 'Aulas em vídeo', img: landingVideoaulas },
  { label: 'Estudar', desc: 'Flashcards e questões', img: landingEstudar },
  { label: 'Radar', desc: 'Monitoramento legislativo', img: landingRadar },
];

/* CSS for shine animation injected once */
const shineStyleId = 'shine-anim-style';
if (typeof document !== 'undefined' && !document.getElementById(shineStyleId)) {
  const style = document.createElement('style');
  style.id = shineStyleId;
  style.textContent = `
    @keyframes shineSlide {
      0% { transform: translateX(-100%) rotate(25deg); }
      100% { transform: translateX(250%) rotate(25deg); }
    }
    .shine-effect { position: relative; overflow: hidden; }
    .shine-effect::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 40%;
      height: 200%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
      transform: translateX(-100%) rotate(25deg);
      animation: shineSlide 3s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes floatSlow {
      0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
      50% { transform: translateY(-14px) rotate(calc(var(--rot, 0deg) + 4deg)); }
    }
    @keyframes floatSlower {
      0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
      50% { transform: translateY(10px) rotate(calc(var(--rot, 0deg) - 3deg)); }
    }
    .float-slow { animation: floatSlow 6s ease-in-out infinite; }
    .float-slower { animation: floatSlower 8s ease-in-out infinite; }
    @keyframes ringPulse {
      0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.55), 0 0 24px 0 hsl(var(--primary) / 0.25); }
      50% { box-shadow: 0 0 0 8px hsl(var(--primary) / 0), 0 0 32px 4px hsl(var(--primary) / 0.35); }
    }
    .ring-pulse { animation: ringPulse 2.6s ease-in-out infinite; }
    @keyframes badgeShine {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .badge-shine {
      background: linear-gradient(100deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 40%, #fff8b8 50%, hsl(var(--primary)) 60%, hsl(var(--primary)) 100%);
      background-size: 200% 100%;
      animation: badgeShine 3.2s linear infinite;
    }
    @keyframes tagsMarquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .tags-marquee-track {
      animation: tagsMarquee 28s linear infinite;
      will-change: transform;
    }
    @keyframes btnCadastrarShimmer {
      0% {
        transform: translateX(-150%) skewX(-20deg);
        opacity: 0;
      }
      3% {
        opacity: 1;
      }
      22% {
        transform: translateX(250%) skewX(-20deg);
        opacity: 1;
      }
      23%, 100% {
        transform: translateX(250%) skewX(-20deg);
        opacity: 0;
      }
    }
    .animate-btn-cadastrar-shimmer {
      animation: btnCadastrarShimmer 4s ease-in-out infinite;
    }
    @keyframes landIn {
      from { opacity: 0.15; }
      to { opacity: 1; }
    }
    @keyframes capaZoom {
      from { transform: scale(1.01); }
      to { transform: scale(1.07); }
    }
    .land-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(0.76) saturate(1.02);
      transition: opacity 0.55s ease;
      animation: landIn 0.8s ease, capaZoom 5.4s linear forwards;
    }
    .land-shade {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(5,6,10,0.66) 0%, rgba(5,6,10,0.18) 30%, rgba(5,6,10,0.22) 55%, rgba(5,6,10,0.95) 88%);
    }
  `;
  document.head.appendChild(style);
}

function InfiniteCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let pos = 0;
    const speed = 0.4;

    const tick = () => {
      pos += speed;
      if (pos >= 820) pos = 0;
      el.style.transform = `translateX(-${pos}px)`;
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const items = [...FEATURES, ...FEATURES];

  return (
    <div className="overflow-hidden px-4 lg:px-0">
      <div ref={scrollRef} className="flex gap-3 lg:gap-4 will-change-transform" style={{ width: 'max-content' }}>
        {items.map((f, i) => (
          <div
            key={`${f.label}-${i}`}
            className="flex-shrink-0 w-[110px] lg:w-[160px] rounded-2xl overflow-hidden border border-primary/20 shadow-lg shine-effect"
          >
            <div className="relative h-[140px] lg:h-[200px]">
              <img
                src={f.img}
                alt={f.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm lg:text-base font-body font-bold text-foreground drop-shadow-lg">{f.label}</p>
                <p className="text-[10px] lg:text-xs font-body text-foreground/70 mt-0.5">{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Landing Screen ─── */
const LandingScreen = ({ onStart }: { onStart: () => void }) => (
  <motion.main
    key="landing"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, x: '-30%' }}
    transition={{ duration: 0.35 }}
    className="min-h-dvh relative flex flex-col overflow-hidden"
  >
    {/* Background */}
    <div className="absolute inset-0 z-0">
      <img src={themisBg} alt="" loading="eager" decoding="sync" fetchPriority="high" className="w-full h-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40 lg:bg-gradient-to-r lg:from-background lg:via-background/75 lg:to-background/30" />
    </div>

    {/* Content — centered on mobile, left-aligned on desktop */}
    <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center lg:items-center justify-center px-6 lg:px-16 xl:px-24 2xl:px-32 text-center lg:text-left">
      {/* Left column — text */}
      <div className="lg:flex-1 lg:max-w-2xl">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="shine-effect rounded-2xl inline-block"
        >
          <img
            src={logoOABnaRisca}
            alt="Vacatio"
            className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl shadow-xl object-cover mb-4"
          />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="font-display text-3xl lg:text-5xl xl:text-6xl font-bold text-foreground"
        >
          Vacatio
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm lg:text-lg font-body text-muted-foreground mt-1 mb-8"
        >
          Vade Mecum Jurídico Profissional
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="font-display text-xl lg:text-3xl xl:text-4xl font-semibold text-foreground leading-relaxed max-w-xs lg:max-w-lg"
        >
          Toda a{' '}
          <span className="text-primary border-b-2 border-primary/50">legislação brasileira</span>{' '}
          comentada e{' '}
          <span className="text-primary border-b-2 border-primary/50">explicada</span>.
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm lg:text-lg font-body text-muted-foreground mt-4 max-w-xs lg:max-w-md leading-relaxed"
        >
          Lei seca, comentários, explicações artigo por artigo, narração, resumos e muito mais para você{' '}
          <strong className="text-foreground">dominar a legislação</strong>.
        </motion.p>

        {/* CTA */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={onStart}
          className="mt-8 px-8 lg:px-12 py-3.5 lg:py-4 bg-primary text-primary-foreground rounded-full font-body font-semibold text-base lg:text-lg flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity mx-auto lg:mx-0"
        >
          Iniciar Agora
          <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
        </motion.button>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex items-center gap-1.5 text-xs lg:text-sm font-body text-muted-foreground justify-center lg:justify-start"
        >
          <Star className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-yellow-500 fill-yellow-500" />
          +10.000 alunos já estudam com a gente
        </motion.div>
      </div>

      {/* Right column — decorative logo (desktop only) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 150, damping: 20 }}
        className="hidden lg:flex items-center justify-center lg:flex-1"
      >
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-primary/15 rounded-full scale-150" />
          <div className="relative w-48 h-48 xl:w-56 xl:h-56 2xl:w-64 2xl:h-64 rounded-3xl overflow-hidden shadow-2xl border-2 border-primary/20 shine-effect">
            <img src={logoOABnaRisca} alt="Vacatio" className="w-full h-full object-cover" />
          </div>
        </div>
      </motion.div>
    </div>

    {/* Infinite Auto-Scrolling Feature Carousel */}
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.55 }}
      className="relative z-10 pb-6 overflow-hidden"
    >
      <InfiniteCarousel />
    </motion.div>

    <p className="relative z-10 text-center text-[10px] lg:text-xs font-body text-muted-foreground pb-4">
      Vacatio — Vade Mecum © 2026
    </p>
  </motion.main>
);

/* ─── Auth Form Screen (Acessar conta ou Criar conta) ─── */
const AuthFormScreen = ({ onBack }: { onBack: () => void }) => {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [legalOpen, setLegalOpen] = useState<null | 'privacidade' | 'termos'>(null);

  /* Capas rotativas com transição cinematográfica fluida: a nova imagem surge suavemente atrás da atual */
  const [currentCapaIdx, setCurrentCapaIdx] = useState(0);
  const [nextCapaIdx, setNextCapaIdx] = useState(1);
  const [fadeFrontOut, setFadeFrontOut] = useState(false);

  /* Preload de todas as capas para transição instantânea em memória */
  useEffect(() => {
    CAPAS_FUNDO.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  /* Rotação elegante: a imagem da frente desvanece suavemente revelando a imagem de trás */
  useEffect(() => {
    const timer = setInterval(() => {
      setFadeFrontOut(true);

      setTimeout(() => {
        setCurrentCapaIdx((curr) => {
          const next = (curr + 1) % CAPAS_FUNDO.length;
          setNextCapaIdx((next + 1) % CAPAS_FUNDO.length);
          setFadeFrontOut(false);
          return next;
        });
      }, 2000);
    }, 5500);

    return () => clearInterval(timer);
  }, []);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não consegui entrar com o Google.';
      toastErroAuth(msg);
      setGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success('Login realizado com sucesso!');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação';
      toastErroAuth(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      toast.success('Link de recuperação enviado para seu e-mail.');
      setResetEmailSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar e-mail de recuperação.';
      toastErroAuth(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full pl-11 pr-12 py-3.5 bg-white/[0.05] border border-white/10 rounded-2xl text-sm font-body text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/40 transition-all';

  const googleButton = (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={googleLoading}
      className="w-full py-3.5 rounded-2xl bg-white text-neutral-900 font-body font-bold text-base flex items-center justify-center gap-3 border border-neutral-200 hover:bg-neutral-100 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl cursor-pointer"
    >
      {googleLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-neutral-900" />
      ) : (
        <>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Continuar com o Google
        </>
      )}
    </button>
  );

  /* Conteúdo compartilhado do formulário */
  const renderFormBody = () => {
    if (mode === 'login') {
      return (
        <div className="w-full flex flex-col text-left">
          <div className="text-center mb-5">
            <h2 className="font-display text-2xl font-bold text-white">
              Acesse sua conta
            </h2>
            <p className="text-xs font-body text-neutral-400 mt-1">
              Entre com o Google ou com seu e-mail cadastrado.
            </p>
          </div>

          {/* Opção 1: Google */}
          {googleButton}

          {/* Divisor */}
          <div className="relative my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] font-body uppercase tracking-wider text-neutral-400">
              ou com e-mail
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Opção 2: E-mail e Senha */}
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="current-password"
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-body font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/25 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      );
    }

    if (mode === 'signup') {
      return (
        <div className="w-full flex flex-col text-left py-1">
          <div className="text-center mb-5">
            <h2 className="font-display text-2xl font-bold text-white">
              Criar sua conta
            </h2>
            <p className="text-xs font-body text-neutral-400 mt-1 max-w-[320px] mx-auto">
              Cadastre-se rapidamente com sua conta Google para sincronização imediata.
            </p>
          </div>

          {/* Opção exclusiva Google */}
          {googleButton}

          {/* Termos de uso e privacidade exibidos exclusivamente no cadastro */}
          <p className="text-[11px] leading-relaxed font-body text-neutral-400 text-center px-2 mt-4">
            Ao continuar, você concorda com os{' '}
            <button
              type="button"
              onClick={() => setLegalOpen('termos')}
              className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80 cursor-pointer"
            >
              Termos de Uso
            </button>{' '}
            e com a{' '}
            <button
              type="button"
              onClick={() => setLegalOpen('privacidade')}
              className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80 cursor-pointer"
            >
              Política de Privacidade
            </button>
            .
          </p>
        </div>
      );
    }

    /* mode === 'forgot' */
    return (
      <div className="w-full flex flex-col text-left">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
            {resetEmailSent ? (
              <CheckCircle className="w-6 h-6 text-primary" />
            ) : (
              <KeyRound className="w-6 h-6 text-primary" />
            )}
          </div>
          <h2 className="font-display text-xl font-bold text-white">
            {resetEmailSent ? 'E-mail enviado' : 'Recuperar Senha'}
          </h2>
          <p className="text-xs font-body text-neutral-400 mt-1 max-w-[300px] mx-auto">
            {resetEmailSent
              ? `Abra o link enviado para ${email} para criar uma nova senha.`
              : 'Informe seu e-mail cadastrado para enviarmos as instruções de recuperação.'}
          </p>
        </div>

        {!resetEmailSent ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Seu e-mail cadastrado"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-body font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/25 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Enviar link de recuperação'
              )}
            </button>
          </form>
        ) : null}

        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => { setMode('login'); setResetEmailSent(false); }}
            className="text-xs font-body text-primary hover:underline cursor-pointer"
          >
            ← Voltar para entrar
          </button>
        </div>
      </div>
    );
  };

  /* ── Desktop: split-screen layout ── */
  if (isDesktop) {
    const lawItems = LEIS_CATALOG.map((l) => ({ sigla: l.sigla, nome: l.nome }));
    const lawItemsLoop = [...lawItems, ...lawItems];

    return (
      <motion.main
        key="auth-desktop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="h-dvh max-h-dvh relative overflow-hidden bg-black flex items-center justify-center"
      >
        {/* ── Left half: courtroom scene + title ── */}
        <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
          <img
            src={authCourtroomScene}
            alt="Sala de tribunal"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover object-[15%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/55" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/80" />

          {/* Big title */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
            className="absolute bottom-[10%] xl:bottom-[14%] left-8 xl:left-12 max-w-[min(420px,calc(50vw-250px))] z-10"
          >
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logoOABnaRisca}
                alt="Vacatio"
                className="w-11 h-11 rounded-xl shadow-2xl object-cover border-2 border-primary/50"
              />
              <div className="h-px flex-1 bg-gradient-to-r from-primary/60 to-transparent" />
            </div>

            <h1 className="font-display text-[clamp(2.2rem,3.6vw,3.5rem)] font-black text-primary leading-[0.92] tracking-tight drop-shadow-2xl">
              VADE MECUM
            </h1>
            <h2 className="font-display text-[clamp(1rem,1.35vw,1.4rem)] font-semibold text-white/85 leading-tight mt-2 tracking-wide">
              Jurídico Profissional
            </h2>

            <p className="mt-4 font-display text-sm xl:text-base font-medium text-white/90 leading-snug">
              Domine a legislação brasileira como um{' '}
              <span className="text-primary font-bold">verdadeiro profissional do Direito</span>.
            </p>
          </motion.div>
        </div>

        {/* ── Right half: Themis + cascading laws ── */}
        <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
          <img
            src={authThemisImpact}
            alt="Deusa Themis"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'right center' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-black/25" />
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black to-transparent" />

          {/* Brasão da República + título */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
            className="absolute top-10 left-[45%] right-10 z-10 flex flex-col items-center text-center"
          >
            <img
              src={brasaoRepublica}
              alt="Brasão da República"
              className="w-16 xl:w-20 h-auto opacity-95 drop-shadow-[0_4px_16px_hsl(var(--primary)/0.45)]"
            />
            <h3 className="mt-3 font-display text-lg xl:text-xl font-bold text-white tracking-wide">
              Toda a <span className="text-primary">legislação brasileira</span>
            </h3>
            <p className="mt-1 font-body text-xs xl:text-sm text-white/60">
              em um só lugar, comentada e atualizada
            </p>
          </motion.div>

          {/* Cascading laws list */}
          <div
            className="absolute right-10 left-[45%] top-[42%] bottom-8 overflow-hidden pointer-events-none"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
            }}
          >
            <div className="auth-laws-track flex flex-col gap-2">
              {lawItemsLoop.map((law, i) => (
                <div
                  key={`${law.sigla}-${i}`}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/55 backdrop-blur-sm border border-primary/20"
                >
                  <span className="font-display text-sm font-bold text-primary min-w-[70px] tracking-wider">
                    {law.sigla}
                  </span>
                  <span className="font-body text-sm text-white/85 truncate">{law.nome}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="absolute top-6 left-6 z-30 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Form card */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 24 }}
          className="relative z-20 mx-4 my-4 bg-neutral-950/90 backdrop-blur-xl border border-primary/25 rounded-3xl shadow-[0_25px_80px_-20px_rgba(0,0,0,0.9)] w-full max-w-[440px] max-h-[calc(100dvh-2rem)] overflow-y-auto p-7 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-5">
            <img
              src={logoOABnaRisca}
              alt="Vacatio"
              className="w-10 h-10 rounded-xl shadow-xl object-cover border border-primary/50"
            />
            <span className="font-display text-white text-xl font-bold tracking-wider">
              VACATIO
            </span>
          </div>

          {/* Abas superiores no Desktop */}
          {mode !== 'forgot' && (
            <div className="flex mb-6 bg-white/[0.06] border border-white/10 rounded-2xl p-1">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 text-sm font-body font-semibold rounded-xl transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Cadastrar
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 text-sm font-body font-semibold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Entrar
              </button>
            </div>
          )}

          {renderFormBody()}

          <LegalSheet
            open={legalOpen !== null}
            onOpenChange={(o) => !o && setLegalOpen(null)}
            kind={legalOpen ?? 'privacidade'}
          />
        </motion.div>
      </motion.main>
    );
  }

  /* ── Mobile: cinematic layout com capas rotativas automáticas e tipografia oficial de tela de cadastro.html ── */
  return (
    <motion.main
      key="auth-mobile"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="h-dvh max-h-dvh w-full flex flex-col relative overflow-hidden bg-[#0A0B10] select-none touch-none"
    >
      {/* ── Background: transição fluida cinematográfica surgindo atrás da imagem ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {/* Camada de trás (permanece pronta e visível atrás da imagem frontal) */}
        <img
          key={`back-${nextCapaIdx}`}
          src={CAPAS_FUNDO[nextCapaIdx]}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.76] saturate-[1.02]"
          style={{
            animation: 'capaZoom 7s linear infinite alternate',
          }}
        />

        {/* Camada da frente (fade out suave de 2s revelando a imagem que está atrás) */}
        <img
          key={`front-${currentCapaIdx}`}
          src={CAPAS_FUNDO[currentCapaIdx]}
          alt=""
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover filter brightness-[0.76] saturate-[1.02]"
          style={{
            opacity: fadeFrontOut ? 0 : 1,
            transition: 'opacity 2000ms cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'capaZoom 7s linear infinite alternate',
          }}
        />

        {/* Sombra de gradiente cinematográfica */}
        <div className="land-shade" />
      </div>

      {/* ── Top Bar: Brasão SVG + VACATIO centralizado no topo com margem segura ── */}
      <div className="relative z-20 pt-[max(calc(env(safe-area-inset-top)+1.25rem),1.75rem)] px-6 flex items-center justify-center">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 150 150" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round">
            <circle cx="75" cy="75" r="64" stroke="#D9A82E"/>
            <path d="M75 40 L104 55 H46 Z"/>
            <line x1="55" y1="65" x2="55" y2="94"/>
            <line x1="75" y1="65" x2="75" y2="94"/>
            <line x1="95" y1="65" x2="95" y2="94"/>
            <line x1="48" y1="103" x2="102" y2="103"/>
          </svg>
          <span
            className="text-white font-semibold text-[15px] tracking-[0.42em] select-none"
            style={{ fontFamily: "'Iowan Old Style', 'Playfair Display', Georgia, serif" }}
          >
            VACATIO
          </span>
        </div>
      </div>

      {/* Content at the bottom with safe-area spacing */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-[max(calc(env(safe-area-inset-bottom)+2.5rem),3rem)]">
        {/* Headline & Description */}
        <div className="text-left mb-6 max-w-[400px] w-full mx-auto">
          <h1
            className="text-white text-[32px] sm:text-[34px] font-semibold leading-[1.16] tracking-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]"
            style={{ fontFamily: "'Iowan Old Style', 'Playfair Display', Georgia, serif" }}
          >
            O Direito inteiro,<br />
            <em className="italic text-[#E8C766]">no seu bolso.</em>
          </h1>
          <p
            className="text-[#E4DECF] text-[14.5px] leading-[1.55] max-w-[300px] mt-2.5 mb-1 drop-shadow-[0_1px_10px_rgba(0,0,0,0.65)]"
          >
            Toda a legislação brasileira, atualizada, narrada e explicada em um só lugar.
          </p>
        </div>

        {/* Action Buttons: Cadastrar (vermelho) / Entrar (glass) */}
        <div className="flex flex-col gap-3 w-full max-w-[400px] mx-auto">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setDrawerOpen(true);
            }}
            className="relative overflow-hidden group w-full py-4 bg-primary text-primary-foreground rounded-full font-body font-bold text-lg shadow-lg shadow-primary/30 active:scale-95 transition-all cursor-pointer"
          >
            <div className="absolute inset-0 pointer-events-none -translate-x-full animate-btn-cadastrar-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <span className="relative z-10">Cadastrar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setDrawerOpen(true);
            }}
            className="w-full py-4 bg-white/[0.08] backdrop-blur-md text-white border border-white/40 rounded-2xl font-body font-bold text-lg shadow-lg active:scale-95 transition-all hover:bg-white/15 cursor-pointer"
          >
            Entrar
          </button>
        </div>
      </div>

      {/* Bottom Sheet Drawer for Auth Form */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-neutral-950 border-neutral-800 text-white px-6 pt-3 pb-[max(calc(env(safe-area-inset-bottom)+1.5rem),2rem)] outline-none overflow-hidden max-h-[85dvh] rounded-t-[28px]">
          {/* Barra de arraste (handle) no topo */}
          <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-2" />

          {/* Botão de fechar responsivo e confortável ao toque */}
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar"
            className="absolute top-3.5 right-4 z-30 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <DrawerHeader className="sr-only">
            <DrawerTitle>
              {mode === 'login' ? 'Acessar conta' : mode === 'signup' ? 'Criar conta' : 'Recuperar senha'}
            </DrawerTitle>
            <DrawerDescription>
              {mode === 'login' ? 'Entre com Google ou e-mail' : mode === 'signup' ? 'Cadastro via Google' : 'Recupere sua senha'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="pt-2 min-h-[490px] flex flex-col justify-between">
            {renderFormBody()}
          </div>
        </DrawerContent>
      </Drawer>

      <LegalSheet
        open={legalOpen !== null}
        onOpenChange={(o) => !o && setLegalOpen(null)}
        kind={legalOpen ?? 'privacidade'}
      />
    </motion.main>
  );
};

/* ─── Main Auth Page ─── */
const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return (
    <AnimatePresence mode="wait">
      <AuthFormScreen key="auth" onBack={() => navigate('/landing')} />
    </AnimatePresence>
  );
};

export default Auth;
