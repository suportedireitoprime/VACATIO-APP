import { useState, useEffect, useRef } from 'react';
import { pickAsset } from '@/lib/assetUrl';
import { Capacitor } from '@capacitor/core';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2,
  KeyRound, ArrowLeft, BookOpen, Scale, Video, Star, Brain, Radar, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LegalSheet } from '@/components/auth/LegalSheet';
import { track } from '@/lib/analyticsEvents';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

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
import DesktopQrLogin from '@/components/auth/DesktopQrLogin';
const isElectronApp =
  typeof window !== 'undefined' && Boolean((window as any).desktopApp?.isElectron);
import { LEIS_CATALOG } from '@/data/leisCatalog';
import logoOABnaRiscaAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import logoOABnaRiscaBundled from '@/assets/bundled/logo-vacatio-v2.webp';
const logoOABnaRisca = pickAsset(logoOABnaRiscaBundled, logoOABnaRiscaAsset.url);
import themisBgAsset from '@/assets/themis-bg.webp';
const themisBg = themisBgAsset;
import themisAuthYellowAsset from '@/assets/themis-auth-yellow.webp.asset.json';
import themisAuthYellowBundled from '@/assets/bundled/themis-auth-yellow.webp';
const themisAuthYellow = pickAsset(themisAuthYellowBundled, themisAuthYellowAsset.url);
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
      0%, 100% { box-shadow: 0 0 0 0 rgba(250,204,21,0.55), 0 0 24px 0 rgba(250,204,21,0.25); }
      50% { box-shadow: 0 0 0 8px rgba(250,204,21,0), 0 0 32px 4px rgba(250,204,21,0.35); }
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

/* ─── Auth Form Screen ─── */
const AuthFormScreen = ({ onBack }: { onBack: () => void }) => {
  const { signIn, signUp, resetPassword, signInWithGoogle, signInWithApple } = useAuth();
  const navigateForm = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [legalOpen, setLegalOpen] = useState<null | 'privacidade' | 'termos'>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Reseta o form de e-mail ao fechar o drawer ou mudar de aba
  useEffect(() => {
    if (!drawerOpen) setShowEmailForm(false);
  }, [drawerOpen, mode]);

  // Pré-carrega o bundle da triagem para abrir sem delay logo após signup.
  useEffect(() => {
    if (mode !== 'signup') return;
    import('@/components/onboarding/CadastroOnboardingOverlay').catch(() => {});
    import('@/components/onboarding/CadastroFeaturesReel').catch(() => {});
  }, [mode]);


  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: any) {
      toastErroAuth(err.message || 'Não consegui entrar com o Google.');
      setGoogleLoading(false);
    }
  };

  const [appleLoading, setAppleLoading] = useState(false);
  const handleApple = async () => {
    setAppleLoading(true);
    try {
      const { error } = await signInWithApple();
      if (error) throw error;
    } catch (err: any) {
      toastErroAuth(err.message || 'Não consegui entrar com a Apple.');
      setAppleLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    track(`${mode}_attempted`, { email_domain: email.split('@')[1] ?? 'unknown' });
    try {
      if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        track('password_reset_sent', { email_domain: email.split('@')[1] ?? 'unknown' });
        toast.success('Enviamos o link de recuperação para seu email.');
        setResetEmailSent(true);
      } else if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        track('login_success', { method: 'email' });
      } else {
        if (password !== confirmPassword) {
          toastErroAuth('As senhas não coincidem.');
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, displayName);
        if (error) throw error;
        track('signup_success', { method: 'email', has_display_name: Boolean(displayName) });
        // Ao criar conta, o usuário aceita os Termos e a Política de Privacidade,
        // incluindo o uso de analytics anônimo (LGPD — Consent Mode v2).
        try { (await import('@/lib/analytics')).grantConsent(); } catch {}
        toast.success('Conta criada! Verifique seu email para confirmar.');
        // Se a sessão já foi criada (confirmação de email desativada), leva
        // direto pra triagem — sem depender de nova interação do usuário.
        // A sessão pode demorar alguns ms pra ser persistida — tenta algumas
        // vezes antes de desistir, pra triagem abrir sozinha após o cadastro.
        let sessao = null as Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];
        for (let i = 0; i < 6 && !sessao; i++) {
          const { data: sess } = await supabase.auth.getSession();
          sessao = sess.session;
          if (!sessao) await new Promise((r) => setTimeout(r, 250));
        }
        if (sessao) navigateForm('/onboarding', { replace: true });
      }
    } catch (err: any) {
      track(`${mode}_failed`, { erro: err.message ?? 'unknown' });
      toastErroAuth(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full pl-5 pr-14 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-base font-body text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/40 transition-all";

  const isDesktop = useIsDesktop();

  /* ── Shared form content ── */
  const formContent = (
    <>
      {/* Tabs */}
      {mode !== 'forgot' && (
        <div className="hidden md:flex mb-5 bg-white/[0.04] border border-white/10 rounded-2xl p-1">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-3 text-sm font-body font-medium rounded-xl transition-all ${
                mode === m
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          ))}
        </div>
      )}

      {/* Google sign in */}
      {mode !== 'forgot' && (
        <>
          {(() => {
            const googleBtn = (
              <button
                key="google"
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full py-4 mb-3 rounded-2xl bg-white text-neutral-900 font-body font-semibold text-base flex items-center justify-center gap-2.5 border border-neutral-200 hover:bg-neutral-50 transition-colors disabled:opacity-50 shadow-sm"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                    </svg>
                    Continuar com Google
                  </>
                )}
              </button>
            );
            const appleBtn = (
              <button
                key="apple"
                type="button"
                onClick={handleApple}
                disabled={appleLoading}
                className="w-full py-4 mb-3 rounded-2xl bg-white text-neutral-900 font-body font-semibold text-base flex items-center justify-center gap-2.5 border border-neutral-200 hover:bg-neutral-50 transition-colors disabled:opacity-50 shadow-sm"
              >
                {appleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.92 15.35 3.71 7.56 9.6 7.23c1.27.07 2.17.74 2.92.8 1.17-.24 2.29-.93 3.57-.84 1.36.1 2.36.66 3.05 1.68-2.76 1.68-2.29 5.98.22 7.13-.57 1.5-1.31 2.99-2.31 4.28zm-5.85-15.1c.07-2.04 1.76-3.79 3.74-3.95.29 2.32-1.93 4.48-3.74 3.95z"/>
                    </svg>
                    Continuar com Apple
                  </>
                )}
              </button>
            );
            // No iOS (App Store guideline), Apple aparece primeiro.
            const isIOS = Capacitor.getPlatform() === 'ios';
            return isIOS ? [appleBtn, googleBtn] : [googleBtn, appleBtn];
          })()}

          <div className="relative mb-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] font-body uppercase tracking-widest text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </>
      )}

      {/* Mode title (desktop) */}
      {isDesktop && mode !== 'forgot' && (
        <div className="text-center mb-4">
          <h2 className="font-display text-xl font-bold text-foreground">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </h2>
          <p className="text-xs font-body text-muted-foreground mt-1">
            {mode === 'login' ? 'Entre com suas credenciais para acessar' : 'Preencha os dados para criar sua conta'}
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!showEmailForm && mode !== 'forgot' ? (
          <motion.div
            key="email-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full py-4 rounded-2xl bg-white/[0.04] text-white font-body font-semibold text-base flex items-center justify-center gap-2.5 border border-white/10 hover:bg-white/10 transition-colors shadow-sm"
            >
              <Mail className="w-5 h-5 text-white/50" />
              Usar e-mail
            </button>
          </motion.div>
        ) : (
          <motion.form
          key={mode + (resetEmailSent ? '-sent' : '')}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {mode === 'forgot' && (
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
                {resetEmailSent ? <CheckCircle className="w-6 h-6 text-primary" /> : <KeyRound className="w-6 h-6 text-primary" />}
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">
                {resetEmailSent ? 'Email enviado' : 'Recuperar Senha'}
              </h2>
              <p className="text-xs font-body text-muted-foreground mt-1">
                {resetEmailSent
                  ? `Abra o link enviado para ${email} para criar uma nova senha.`
                  : 'Informe seu email para receber o link de redefinição'}
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <div className="relative">
              <input type="text" name="name" autoComplete="name" placeholder="Nome de exibição" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          )}

          {(mode !== 'forgot' || !resetEmailSent) && (
            <div className="relative">
              <input type="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name={mode === 'signup' ? 'new-password' : 'current-password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputCls} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="confirm-password" autoComplete="new-password" placeholder="Confirmar senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className={inputCls} />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          )}

          {!resetEmailSent && (
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-body font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/25"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Entrar'}
                  {mode === 'signup' && 'Criar Conta'}
                  {mode === 'forgot' && 'Enviar link de recuperação'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}

          {mode === 'signup' && (
            <p className="text-[11px] leading-relaxed font-body text-white/60 text-center px-2">
              Ao criar sua conta, você concorda com os{' '}
              <button
                type="button"
                onClick={() => setLegalOpen('termos')}
                className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80"
              >
                Termos de Uso
              </button>{' '}
              e com a{' '}
              <button
                type="button"
                onClick={() => setLegalOpen('privacidade')}
                className="text-primary font-semibold underline underline-offset-2 hover:text-primary/80"
              >
                Política de Privacidade
              </button>
              , incluindo o uso de dados anônimos (Google Analytics) para melhorar o Vacatio. Nada é vinculado à sua identidade sem permissão.
            </p>
          )}

          {mode === 'login' && (
            <button type="button" onClick={() => { setMode('forgot'); setResetEmailSent(false); }} className="w-full text-center text-xs font-body text-primary hover:underline">
              Esqueci minha senha
            </button>
          )}

          {mode === 'forgot' && (
            <button type="button" onClick={() => { setMode('login'); setResetEmailSent(false); }} className="w-full text-center text-xs font-body text-primary hover:underline">
              {resetEmailSent ? 'Entendi, voltar ao login' : 'Voltar ao login'}
            </button>
          )}
        </motion.form>
        )}
      </AnimatePresence>

      <LegalSheet
        open={legalOpen !== null}
        onOpenChange={(o) => !o && setLegalOpen(null)}
        kind={legalOpen ?? 'privacidade'}
      />
    </>
  );

  /* ── Desktop: split-screen layout ── */
  if (isDesktop) {
    const lawItems = LEIS_CATALOG.map(l => ({ sigla: l.sigla, nome: l.nome }));
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
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/55" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/70" />

          {/* Big title — bottom-left, hierarquia harmônica */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
            className="absolute bottom-[16%] left-10 right-10 z-10 max-w-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logoOABnaRisca}
                alt="Vacatio"
                className="w-11 h-11 rounded-xl shadow-2xl object-cover border-2 border-primary/50"
              />
              <div className="h-px flex-1 bg-gradient-to-r from-primary/60 to-transparent" />
            </div>

            {/* Hierarquia principal */}
            <h1 className="font-display text-[clamp(2.5rem,4.4vw,3.75rem)] font-black text-primary leading-[0.9] tracking-tight drop-shadow-2xl">
              VADE MECUM
            </h1>
            <h2 className="font-display text-[clamp(1rem,1.5vw,1.5rem)] font-semibold text-white/85 leading-tight mt-2 tracking-wide">
              Jurídico Profissional
            </h2>

            {/* Subheadline única, mais respiro */}
            <p className="mt-4 font-display text-[clamp(0.95rem,1.25vw,1.25rem)] font-medium text-white/90 leading-snug max-w-md">
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

          {/* Brasão da Justiça + título — topo da coluna direita */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
            className="absolute top-10 left-[45%] right-10 z-10 flex flex-col items-center text-center"
          >
            <img
              src={brasaoRepublica}
              alt="Brasão da República"
              className="w-16 xl:w-20 h-auto opacity-95 drop-shadow-[0_4px_16px_rgba(250,204,21,0.35)]"
            />
            <h3 className="mt-3 font-display text-lg xl:text-xl font-bold text-white tracking-wide">
              Toda a <span className="text-primary">legislação brasileira</span>
            </h3>
            <p className="mt-1 font-body text-xs xl:text-sm text-white/60">
              em um só lugar, comentada e atualizada
            </p>
          </motion.div>

          {/* Cascading laws list — começa de baixo, abaixo do brasão */}
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
          className="absolute top-6 left-6 z-30 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Form / QR card */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 24 }}
          className={`relative z-20 mx-4 my-4 bg-neutral-950/85 backdrop-blur-xl border border-primary/20 rounded-3xl shadow-[0_25px_80px_-20px_rgba(0,0,0,0.9)] w-full max-w-[440px] max-h-[calc(100dvh-2rem)] overflow-hidden p-6 xl:p-7`}
        >
          <DesktopQrLogin />

        </motion.div>
      </motion.main>
    );
  }


  /* ── Mobile: dark gray layout with cinematic hero ── */
  return (
    <motion.main
      key="auth-mobile"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="min-h-dvh flex flex-col relative overflow-hidden bg-black"
    >
      {/* ── Fullscreen background image ── */}
      <div className="absolute inset-0 z-0">
        <img
          src={themisAuthYellow}
          alt="Themis e a advocacia"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="w-full h-full object-cover object-center pointer-events-none select-none opacity-85"
        />
        {/* Gradients to ensure text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        aria-label="Voltar"
        className="absolute top-[max(var(--sai-top,env(safe-area-inset-top,0px)),1rem)] left-4 z-20 w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center active:scale-95 transition"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* Content at the bottom */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-[max(var(--sai-bottom,env(safe-area-inset-bottom,0px)),1.5rem)]">
        
        {/* Brand block */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative shrink-0 mb-4">
            <div className="absolute inset-0 rounded-3xl ring-pulse" />
            <img
              src={logoOABnaRisca}
              alt="Vacatio"
              className="relative w-20 h-20 rounded-3xl object-cover border-2 border-primary/60 shadow-xl"
            />
          </div>
          <h2 className="font-display text-white text-3xl font-bold leading-none drop-shadow">Vacatio</h2>
          <p className="font-body text-white/70 text-sm mt-2 drop-shadow">Vade Mecum Jurídico Profissional</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-[400px] mx-auto">
          <button
            onClick={() => { setMode('login'); setDrawerOpen(true); }}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-body font-bold text-base shadow-lg active:scale-95 transition-transform"
          >
            Acessar conta
          </button>
          
          <button
            onClick={() => { setMode('signup'); setDrawerOpen(true); }}
            className="w-full py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl font-body font-bold text-base shadow-lg active:scale-95 transition-transform"
          >
            Criar uma conta
          </button>

          <button
            onClick={() => { setMode('forgot'); setDrawerOpen(true); }}
            className="mt-2 text-white/70 font-body text-sm font-medium hover:text-white transition-colors py-2 active:scale-95 transition-transform"
          >
            Preciso de ajuda
          </button>
        </div>
        
        <p className="text-center text-[10px] font-body text-white/50 mt-6">
          Vacatio — Vade Mecum © 2026
        </p>
      </div>

      {/* Bottom Sheet Drawer for Auth Form */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-neutral-900 border-neutral-800 px-5 pt-6 pb-[max(var(--sai-bottom,env(safe-area-inset-bottom,0px)),1.5rem)] outline-none">
          {formContent}
        </DrawerContent>
      </Drawer>

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
