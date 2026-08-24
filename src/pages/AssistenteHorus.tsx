import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronLeft, ChevronRight, Sparkles, Bell, Send, Mic, FileText, Image as ImageIcon,
  Gavel, BookOpen, Newspaper, Star, ScanEye, ShieldCheck, ShieldAlert, Settings, Pencil,
  Loader2, RefreshCw, Radio, Rocket, Home, User,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { haptic } from '@/lib/nativeHaptics';
import { pickAsset } from '@/lib/assetUrl';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import HorusVerifyPhoneSheet from '@/components/horus/HorusVerifyPhoneSheet';
import HorusEuSheet from '@/components/horus/HorusEuSheet';
import HorusCapabilitiesRow from '@/components/horus/HorusCapabilitiesRow';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSubscription } from '@/hooks/useSubscription';
type HorusTab = 'main' | 'funcoes' | 'notificacoes' | 'ajustes';
import { PageHeader } from '@/components/vademecum/PageHeader';
import HorusSectionHero from '@/components/horus/HorusSectionHero';
import { Switch } from '@/components/ui/switch';
import HorusOnboardingOverlay from '@/components/horus/onboarding/HorusOnboardingOverlay';
import { useHorusOnboarding } from '@/components/horus/onboarding/useHorusOnboarding';
import { track } from '@/lib/analyticsEvents';
import vacatioLogoAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import vacatioLogoBundled from '@/assets/bundled/logo-vacatio-v2.webp';
import horusOwlAsset from '@/assets/horus/horus-owl.png.asset.json';
import horusOwlBundled from '@/assets/horus/horus-owl.webp';

const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);
const horusOwl = pickAsset(horusOwlBundled, horusOwlAsset.url);


const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
  </svg>
);

const WHATSAPP_NUMERO = '5511914910906';
const WHATSAPP_MSG = 'Olá Horus! Preciso da sua ajuda com uma dúvida jurídica.';

const HORUS_TAGS = ['Explicar', 'Explicar lei', 'Ler PDF', 'Ler imagem', 'Mandar áudio', 'Escutar áudio'];

const TOP_TABS: Array<{ id: 'main' | 'funcoes' | 'notificacoes' | 'ajustes'; label: string; icon: any }> = [
  { id: 'main', label: 'Início', icon: Home },
  { id: 'funcoes', label: 'Funções', icon: Gavel },
  { id: 'notificacoes', label: 'Alertas', icon: Bell },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
];

function TopTabs({ active, onChange }: { active: string; onChange: (t: any) => void }) {
  return (
    <div className="px-4">
      <div className="relative flex items-center gap-1 p-1 rounded-2xl bg-secondary/70 border border-border">
        {TOP_TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { haptic.selection(); onChange(t.id); }}
              data-track="horus_tab_switch"
              data-tab={t.id}
              className="relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-body text-[12px] font-semibold transition-colors"
            >
              {isActive && (
                <motion.span
                  layoutId="horus-top-tab-pill"
                  className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`relative w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} strokeWidth={2} />
              <span className={`relative ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


const HORUS_COLOR: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/20 ring-1 ring-emerald-400/40', text: 'text-emerald-400' },
  sky: { bg: 'bg-sky-500/20 ring-1 ring-sky-400/40', text: 'text-sky-400' },
  rose: { bg: 'bg-rose-500/20 ring-1 ring-rose-400/40', text: 'text-rose-400' },
  violet: { bg: 'bg-violet-500/20 ring-1 ring-violet-400/40', text: 'text-violet-400' },
  amber: { bg: 'bg-amber-500/20 ring-1 ring-amber-400/40', text: 'text-amber-400' },
  cyan: { bg: 'bg-cyan-500/20 ring-1 ring-cyan-400/40', text: 'text-cyan-400' },
};

type NotifPrefs = {
  radar_leis: boolean;
  boletim_juridico: boolean;
  boletim_leis: boolean;
  blog_novos_posts: boolean;
  app_atualizacoes: boolean;
  artigo_favorito: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  radar_leis: true,
  boletim_juridico: true,
  boletim_leis: true,
  blog_novos_posts: true,
  app_atualizacoes: true,
  artigo_favorito: true,
};

const NOTIF_ITEMS: Array<{ key: keyof NotifPrefs; icon: any; color: string; label: string; desc: string }> = [
  { key: 'radar_leis', icon: Radio, color: 'violet', label: 'Radar de Leis', desc: 'Novas leis e decretos publicados no DOU.' },
  { key: 'boletim_juridico', icon: Newspaper, color: 'sky', label: 'Boletim jurídico diário', desc: 'Resumo diário das principais notícias do Direito.' },
  { key: 'boletim_leis', icon: Gavel, color: 'amber', label: 'Boletim de leis diárias', desc: 'Boletim em vídeo das leis publicadas no dia.' },
  { key: 'blog_novos_posts', icon: BookOpen, color: 'cyan', label: 'Novos artigos do blog', desc: 'Aviso sempre que um novo post for publicado.' },
  { key: 'app_atualizacoes', icon: Rocket, color: 'emerald', label: 'Atualizações do aplicativo', desc: 'Novidades, novas versões e melhorias.' },
  { key: 'artigo_favorito', icon: Star, color: 'rose', label: 'Mudança em artigo favorito', desc: 'Quando um artigo que você favoritou for alterado.' },
];

const AssistenteHorus = () => {
  const navigate = useNavigate();
  const { loading: onbLoading, onboarded } = useHorusOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tab, setTab] = useState<HorusTab>('main');
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [euOpen, setEuOpen] = useState(false);
  const [ajustesOpen, setAjustesOpen] = useState(false);
  // Hidrata cache local instantaneamente para evitar "piscar" do selo Verificado
  const HORUS_CACHE_KEY = 'horus:status-cache:v1';
  const cachedInit = (() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(HORUS_CACHE_KEY) : null;
      return raw ? JSON.parse(raw) as { linked: any; profileName: string } : null;
    } catch { return null; }
  })();
  const [statusLoading, setStatusLoading] = useState(!cachedInit);
  const [profileName, setProfileName] = useState<string>(cachedInit?.profileName || '');
  const [linked, setLinked] = useState<{
    phone_e164: string;
    verified_at: string | null;
    nome_preferido: string | null;
    apelido: string | null;
    apelido_ativo: boolean;
    notif_prefs: NotifPrefs | null;
  } | null>(cachedInit?.linked || null);
  const [savingNome, setSavingNome] = useState(false);
  const [nomeEdit, setNomeEdit] = useState<string>(cachedInit?.profileName || cachedInit?.linked?.nome_preferido || '');
  const [apelidoEdit, setApelidoEdit] = useState<string>(cachedInit?.linked?.apelido || '');
  const [apelidoAtivo, setApelidoAtivo] = useState<boolean>(Boolean(cachedInit?.linked?.apelido_ativo));
  const [savingApelido, setSavingApelido] = useState(false);
  const [savingKey, setSavingKey] = useState<keyof NotifPrefs | null>(null);
  const [waIntent, setWaIntent] = useState(false);

  useEffect(() => {
    if (!onbLoading && !onboarded) setShowOnboarding(true);
  }, [onbLoading, onboarded]);

  async function loadStatus() {
    // Se já temos cache, revalida silenciosamente sem "loading"
    if (!cachedInit) setStatusLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatusLoading(false); return; }
    const [{ data }, { data: prof }] = await Promise.all([
      supabase
        .from('horus_whatsapp_users')
        .select('phone_e164, verified_at, nome_preferido, apelido, apelido_ativo, notif_prefs')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle(),
    ]);
    const nextLinked = (data as any) || null;
    const nextProfileName = ((prof as any)?.display_name || '').trim();
    setLinked(nextLinked);
    setProfileName(nextProfileName);
    setNomeEdit(nextProfileName || (nextLinked?.nome_preferido) || '');
    setApelidoEdit((nextLinked?.apelido) || '');
    setApelidoAtivo(Boolean(nextLinked?.apelido_ativo));
    setStatusLoading(false);
    try {
      window.localStorage.setItem(
        HORUS_CACHE_KEY,
        JSON.stringify({ linked: nextLinked, profileName: nextProfileName }),
      );
    } catch {}
  }
  useEffect(() => { loadStatus(); }, []);

  // Realtime: reflete alterações instantâneas no vínculo (verificação, transferência,
  // revogação por outra conta). Sem isso, a UI ficava presa no cache local.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`horus-whatsapp-user-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'horus_whatsapp_users',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            try { window.localStorage.removeItem(HORUS_CACHE_KEY); } catch {}
            loadStatus();
          },
        )
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const prefs: NotifPrefs = useMemo(
    () => ({ ...DEFAULT_PREFS, ...(linked?.notif_prefs || {}) }),
    [linked?.notif_prefs],
  );

  const isVerified = Boolean(linked?.verified_at);
  const lastDigits = linked?.phone_e164 ? linked.phone_e164.slice(-4) : '';
  const displayName = ((linked?.apelido_ativo && (linked?.apelido || '').trim()) || profileName || (linked?.nome_preferido || '').trim() || '').trim();
  const { isPremium } = useSubscription();

  function openWhatsApp() {
    track('horus_whatsapp_redirect', { verified: isVerified, source: 'horus_page' });
    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  function handleWhatsAppClick() {
    haptic.light();
    track('horus_whatsapp_click', { verified: isVerified });
    if (!isVerified) {
      setWaIntent(true);
      setVerifyOpen(true);
      toast.info('Vamos verificar seu número primeiro');
      return;
    }
    openWhatsApp();
  }
  function handleVerified(_info?: { transferred?: boolean }) {
    // Invalida cache local pra não voltar mostrando "Vincular WhatsApp" depois de verificar.
    try { window.localStorage.removeItem(HORUS_CACHE_KEY); } catch {}
    loadStatus();
    if (waIntent) {
      setWaIntent(false);
      setTimeout(openWhatsApp, 400);
    }
  }

  const back = () => {
    haptic.selection();
    if (tab !== 'main') setTab('main');
    else navigate(-1);
  };

  async function savePref(key: keyof NotifPrefs, value: boolean) {
    track('horus_notification_pref_changed', { key, value });
    if (!linked) {
      toast.error('Verifique seu WhatsApp primeiro');
      setVerifyOpen(true);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSavingKey(key);
    const next = { ...prefs, [key]: value };
    // otimista
    setLinked((prev) => (prev ? { ...prev, notif_prefs: next } : prev));
    const { error } = await supabase
      .from('horus_whatsapp_users')
      .update({ notif_prefs: next })
      .eq('user_id', user.id);
    setSavingKey(null);
    if (error) {
      toast.error('Não deu pra salvar');
      loadStatus();
    }
  }

  async function saveNome() {
    const finalName = nomeEdit.trim();
    if (!finalName) return toast.error('Digite um nome');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSavingNome(true);
    // Fonte da verdade = profiles.display_name. Espelha nos registros do Horus.
    const ops: PromiseLike<any>[] = [
      supabase.from('profiles').update({ display_name: finalName }).eq('id', user.id),
    ];
    if (linked) {
      ops.push(
        supabase.from('horus_whatsapp_users').update({ nome_preferido: finalName }).eq('user_id', user.id),
        supabase.from('horus_user_stats').update({ nome_preferido: finalName }).eq('telefone', linked.phone_e164),
      );
    }
    await Promise.all(ops);
    setSavingNome(false);
    haptic.medium();
    toast.success(`Beleza, ${finalName.split(' ')[0]}!`);
    loadStatus();
  }

  async function saveApelido() {
    if (!linked) return toast.error('Verifique seu WhatsApp primeiro');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const finalApelido = apelidoEdit.trim();
    if (apelidoAtivo && !finalApelido) return toast.error('Digite o apelido ou desative');
    setSavingApelido(true);
    await supabase
      .from('horus_whatsapp_users')
      .update({ apelido: finalApelido || null, apelido_ativo: apelidoAtivo && !!finalApelido })
      .eq('user_id', user.id);
    setSavingApelido(false);
    haptic.medium();
    toast.success(apelidoAtivo && finalApelido ? `Vou te chamar de ${finalApelido}!` : 'Apelido desativado');
    loadStatus();
  }

  const titles: Record<HorusTab, string> = {
    main: 'Assistente Horus',
    funcoes: 'Funções',
    notificacoes: 'Notificações',
    ajustes: 'Ajustes',
  };

  return (
    <div className="min-h-dvh bg-background text-foreground pb-10">
      <HorusOnboardingOverlay
        open={showOnboarding}
        initialName={profileName}
        onFinished={() => { setShowOnboarding(false); loadStatus(); }}
      />
      <HorusVerifyPhoneSheet
        open={verifyOpen}
        onClose={() => { setVerifyOpen(false); setWaIntent(false); }}
        onVerified={handleVerified}
        initialPhone={linked?.phone_e164 || ''}
      />
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="max-w-lg mx-auto flex items-center">
          <div className="flex-1 min-w-0">
            <PageHeader title={titles[tab]} onBack={back} />
          </div>
          <button
            onClick={() => { haptic.selection(); setAjustesOpen(true); }}
            className="mr-3 shrink-0 w-10 h-10 rounded-full bg-secondary/70 border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Ajustes"
          >
            <Settings className="w-5 h-5 text-foreground" strokeWidth={1.8} />
          </button>
        </div>
      </header>




      <div className="max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {tab === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-6"
            >
              {/* Hero com spotlight cinza degradê atrás do Horus e do texto */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                className="relative p-5 pr-[140px]"
                style={{ minHeight: 200 }}
              >
                {/* Palco principal — spotlight cinza com degradê (deslocado para baixo, como se o Horus estivesse em cima do botão) */}
                <div
                  className="absolute -right-10 top-6 w-[320px] h-[280px] rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at 60% 55%, hsl(0 0% 100% / 0.22) 0%, hsl(0 0% 100% / 0.08) 35%, transparent 70%)',
                    filter: 'blur(8px)',
                  }}
                />
                <div
                  className="absolute -right-6 top-14 w-[220px] h-[200px] rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at 55% 55%, hsl(0 0% 100% / 0.18) 0%, transparent 65%)',
                    filter: 'blur(4px)',
                  }}
                />

                {/* Floating juridical icons */}
                {[
                  { className: 'top-3 left-4', delay: 0 },
                  { className: 'bottom-3 left-8', delay: 0.8 },
                  { className: 'top-8 left-1/2', delay: 1.4 },
                ].map((f, i) => (
                  <motion.div
                    key={i}
                    className={`absolute ${f.className} pointer-events-none text-white/10`}
                    animate={{ y: [0, -6, 0], rotate: [0, 6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: f.delay, ease: 'easeInOut' }}
                  >
                    <Gavel className="w-5 h-5" />
                  </motion.div>
                ))}

                {/* Owl mascot — descido para parecer em pé sobre o botão */}
                <motion.img
                  src={horusOwl}
                  alt="Horus"
                  width={400}
                  height={400}
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  className="absolute -right-3 -bottom-10 w-[160px] h-[160px] object-contain drop-shadow-xl pointer-events-none select-none z-10"
                  initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
                />

                <div className="relative">
                  <p className="font-display text-sm sm:text-base font-black tracking-[0.14em] text-white/70 uppercase">
                    Assistente jurídico
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-black text-white leading-[0.95] mt-1.5 tracking-tight">
                    {displayName ? `Olá, ${displayName.split(' ')[0]}!` : (statusLoading ? 'Olá!' : 'Olá! Eu sou o Horus')}
                  </h2>
                  <p className="font-body text-base sm:text-lg font-medium text-white/95 leading-snug mt-2.5 max-w-[300px]">
                    Seu assistente jurídico 24h no WhatsApp. Tire dúvidas de Direito para seus estudos a qualquer momento, sem fila e sem complicação.
                  </p>
                </div>
              </motion.div>

              <div className="px-5 pb-6 flex flex-col gap-6">



              <motion.button
                type="button"
                onClick={handleWhatsAppClick}
                data-track="horus_whatsapp_cta_click"
                className="relative overflow-hidden mx-auto w-full max-w-sm h-14 rounded-full active:scale-[0.98] transition-transform flex items-center justify-center gap-2.5 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  boxShadow: '0 8px 24px -6px rgba(37, 211, 102, 0.55)',
                }}
              >
                {/* Shimmer reflex sweeping across the button */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    background:
                      'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)',
                    backgroundSize: '250% 100%',
                    animation: 'horus-btn-shimmer 3.2s ease-in-out infinite',
                    mixBlendMode: 'overlay',
                  }}
                />
                <motion.span
                  className="relative flex items-center gap-2.5"
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformOrigin: 'center' }}
                >
                  <WhatsAppIcon className="w-6 h-6 text-white" />
                  <span className="font-display text-base font-bold" style={{ color: '#ffffff' }}>Falar com Horus</span>
                </motion.span>
              </motion.button>

              <AnimatePresence mode="wait" initial={false}>
                {statusLoading ? (
                  <motion.div
                    key="badge-skeleton"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="mx-auto h-7 w-[150px] rounded-full bg-white/5 border border-white/10 relative overflow-hidden"
                    aria-hidden
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.10) 50%, transparent 70%)',
                        backgroundSize: '250% 100%',
                        animation: 'horus-btn-shimmer 1.4s ease-in-out infinite',
                      }}
                    />
                  </motion.div>
                ) : isVerified ? (
                  <motion.button
                    key="badge-verified"
                    onClick={() => { haptic.selection(); setVerifyOpen(true); }}
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    className="mx-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-body text-[11px] font-medium text-emerald-300 leading-none">Verificado •••• {lastDigits}</span>
                  </motion.button>
                ) : (
                  <motion.button
                    key="badge-link"
                    onClick={() => { haptic.selection(); setVerifyOpen(true); }}
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    className="mx-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/15 transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-body text-[11px] font-semibold text-amber-300 leading-none">Vincular WhatsApp</span>
                    <ChevronRight className="w-3 h-3 text-amber-400 shrink-0" />
                  </motion.button>
                )}
              </AnimatePresence>


              <HorusCapabilitiesRow
                isVerified={isVerified}
                isPremium={isPremium}
                onRequestVerify={() => setVerifyOpen(true)}
              />
              </div>


            </motion.div>
          )}

          {tab === 'funcoes' && (
            <motion.div
              key="funcoes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="flex flex-col gap-2.5"
            >
              <TopTabs active={tab} onChange={setTab} />
              <div className="px-4 pt-2" />
              <HorusSectionHero
                icon={Gavel}
                eyebrow="O que o Horus faz"
                title="Funções do assistente"
                description="Tudo o que você pode pedir ao Horus no WhatsApp — texto, áudio, PDF, imagem e dúvidas jurídicas."
              />

              {[
                { icon: Send, color: 'emerald', label: 'Enviar mensagem', desc: 'Mande qualquer dúvida por texto no WhatsApp e receba resposta na hora.' },
                { icon: Mic, color: 'sky', label: 'Áudio por voz', desc: 'Grave um áudio explicando sua dúvida. O Horus entende e responde em áudio também.' },
                { icon: FileText, color: 'rose', label: 'Ler PDF', desc: 'Envie um PDF de prova, artigo ou trabalho e peça resumo, correção ou explicação.' },
                { icon: ImageIcon, color: 'violet', label: 'Ler imagem', desc: 'Envie foto do caderno, prova ou documento — ele lê e comenta.' },
                { icon: Gavel, color: 'amber', label: 'Dúvidas jurídicas', desc: 'Explica artigos, súmulas, jurisprudência e conceitos de forma simples.' },
                { icon: BookOpen, color: 'cyan', label: 'Explicar lição', desc: 'Peça explicação passo a passo de qualquer conteúdo que estiver estudando.' },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/50 border border-border"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${HORUS_COLOR[f.color].bg}`}>
                      <Icon className={`w-5 h-5 ${HORUS_COLOR[f.color].text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-base font-bold leading-tight">{f.label}</p>
                      <p className="font-body text-sm text-muted-foreground leading-snug mt-1">{f.desc}</p>
                    </div>
                  </motion.div>
                );
              })}

              {/* Sobre o Horus */}
              <div className="px-4 pt-4">
                <div className="p-5 rounded-2xl bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h3 className="font-display text-lg font-bold">Sobre</h3>
                  </div>
                  <div className="font-body text-sm text-foreground/90 leading-relaxed prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {`O **Horus** é o assistente jurídico do Vacatio. Ele nasceu para tirar o peso da burocracia do Direito e deixar o estudo mais leve, direto e produtivo.

## Para que serve?

Imagine ter um colega de Direito disponível **24 horas por dia**, que não se cansa, não julga e explica qualquer tema jurídico como se você estivesse conversando com um amigo. É isso que o Horus faz:

- **Tira dúvidas** sobre artigos, súmulas, jurisprudência e conceitos jurídicos.
- **Lê PDFs** de provas, artigos, trabalhos e petições para resumir ou explicar pontos importantes.
- **Entende imagens** de documentos, cadernos, provas e fotos de tela.
- **Responde áudio** para você poder estudar enquanto dirige, caminha ou descansa.
- **Envia alertas** sobre novas leis, boletins jurídicos e mudanças em artigos favoritados.

## Como ele funciona?

O Horus usa inteligência artificial para interpretar sua pergunta, consultar bases jurídicas e montar uma resposta didática. Ele não substitui um advogado, mas é um **acelerador de estudo** e um **primeiro socorro** para dúvidas do dia a dia.

## Quem pode usar?

Qualquer pessoa que tenha uma conta no Vacatio. Algumas funções são gratuitas e outras fazem parte do Vacatio Premium, desbloqueando acesso ilimitado a PDFs, imagens e áudios.

> **Dica:** quanto mais específica for a sua pergunta, melhor será a resposta. Tente incluir o artigo, a lei ou o contexto que você está estudando.`}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'notificacoes' && (
            <motion.div
              key="notificacoes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="flex flex-col gap-2.5"
            >
              <TopTabs active={tab} onChange={setTab} />
              <div className="px-4 pt-2" />
              <HorusSectionHero
                icon={Bell}
                eyebrow="Central de avisos"
                title="Notificações no WhatsApp"
                description="Escolha o que o Horus vai te avisar: leis novas, boletins, blog e atualizações. Ative ou desative quando quiser."
              />
              {!isVerified && !statusLoading && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 mb-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="font-body text-xs text-amber-300 flex-1 leading-snug">
                    Verifique seu WhatsApp para começar a receber estas notificações.
                  </p>
                </div>
              )}
              {NOTIF_ITEMS.map((n, i) => {
                const Icon = n.icon;
                const checked = prefs[n.key];
                const saving = savingKey === n.key;
                return (
                  <motion.label
                    key={n.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 border border-border cursor-pointer"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${HORUS_COLOR[n.color].bg}`}>
                      <Icon className={`w-5 h-5 ${HORUS_COLOR[n.color].text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-bold leading-tight">{n.label}</p>
                      <p className="font-body text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.desc}</p>
                    </div>
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <Switch
                        checked={checked}
                        onCheckedChange={(v) => savePref(n.key, v)}
                        disabled={!isVerified}
                      />
                    )}
                  </motion.label>
                );
              })}
              <p className="font-body text-xs text-muted-foreground mt-3 px-1 leading-snug">
                As notificações são enviadas pelo WhatsApp do Horus. Você pode desativar a qualquer momento.
              </p>
            </motion.div>
          )}

          {tab === 'ajustes' && (
            <motion.div
              key="ajustes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="flex flex-col gap-4"
            >
              <TopTabs active={tab} onChange={setTab} />
              <div className="px-4 pt-2" />
              <HorusSectionHero
                icon={Settings}
                eyebrow="Personalização"
                title="Ajustes do Horus"
                description="Defina como o Horus deve te chamar, gerencie seu número verificado e controle o que aparece por aqui."
              />
              <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Pencil className="w-4 h-4 text-emerald-400" />
                  <p className="font-body text-sm font-bold">Seu nome</p>
                </div>
                <p className="font-body text-xs text-muted-foreground mb-3">
                  É o seu nome de cadastro. Alterar aqui também atualiza seu perfil.
                </p>
                <input
                  type="text"
                  value={nomeEdit}
                  onChange={(e) => setNomeEdit(e.target.value)}
                  placeholder="Seu nome"
                  maxLength={60}
                  className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-emerald-500 outline-none font-body text-base"
                />
                <button
                  onClick={saveNome}
                  disabled={savingNome || !nomeEdit.trim() || nomeEdit.trim() === profileName.trim()}
                  className="mt-3 w-full h-11 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 text-white"
                  style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                >
                  {savingNome ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Salvar nome
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Pencil className="w-4 h-4 text-primary" />
                    <p className="font-body text-sm font-bold">Apelido no Horus</p>
                  </div>
                  <Switch
                    checked={apelidoAtivo}
                    onCheckedChange={(v) => setApelidoAtivo(Boolean(v))}
                    disabled={!isVerified}
                  />
                </div>
                <p className="font-body text-xs text-muted-foreground mb-3">
                  Se ativar, o Horus vai te chamar pelo apelido. Seu nome de cadastro continua igual.
                </p>
                <input
                  type="text"
                  value={apelidoEdit}
                  onChange={(e) => setApelidoEdit(e.target.value)}
                  placeholder="Ex.: Wes, Dr. Wesley…"
                  maxLength={40}
                  disabled={!isVerified || !apelidoAtivo}
                  className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none font-body text-base disabled:opacity-60"
                />
                <button
                  onClick={saveApelido}
                  disabled={
                    savingApelido || !isVerified ||
                    (apelidoAtivo === Boolean(linked?.apelido_ativo) &&
                     apelidoEdit.trim() === (linked?.apelido || '').trim())
                  }
                  className="mt-3 w-full h-11 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 bg-primary text-primary-foreground"
                >
                  {savingApelido ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Salvar apelido
                </button>
                {!isVerified && (
                  <p className="mt-2 font-body text-xs text-muted-foreground">
                    Verifique seu WhatsApp para usar apelido.
                  </p>
                )}
              </div>


              <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <p className="font-body text-sm font-bold">Número no WhatsApp</p>
                </div>
                {isVerified ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-body text-base font-semibold truncate">{linked?.phone_e164}</p>
                      <p className="font-body text-xs text-orange-400">Verificado</p>
                    </div>
                    <button
                      onClick={() => { haptic.selection(); setVerifyOpen(true); }}
                      className="h-10 px-3 rounded-lg bg-background border border-border font-body text-sm font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <RefreshCw className="w-4 h-4" /> Trocar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { haptic.selection(); setVerifyOpen(true); }}
                    className="w-full h-11 rounded-xl font-display font-bold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                  >
                    Verificar agora
                  </button>
                )}
              </div>

              <button
                onClick={() => { haptic.selection(); setTab('notificacoes'); }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 border border-border text-left"
              >
                <Bell className="w-5 h-5 text-amber-400" />
                <div className="flex-1">
                  <p className="font-body text-sm font-bold">Gerenciar notificações</p>
                  <p className="font-body text-xs text-muted-foreground">Escolha o que receber no WhatsApp</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <HorusEuSheet open={euOpen} onClose={() => { setEuOpen(false); loadStatus(); }} />

      <Sheet open={ajustesOpen} onOpenChange={setAjustesOpen}>
        <SheetContent side="bottom" className="p-0 h-[90dvh] rounded-t-3xl border-t border-border bg-background overflow-hidden flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SheetTitle className="font-display text-xl font-bold text-left flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Ajustes do Horus
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {/* Nome */}
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Pencil className="w-4 h-4 text-emerald-400" />
                <p className="font-body text-sm font-bold">Seu nome</p>
              </div>
              <p className="font-body text-xs text-muted-foreground mb-3">
                É o seu nome de cadastro. Alterar aqui também atualiza seu perfil.
              </p>
              <input
                type="text"
                value={nomeEdit}
                onChange={(e) => setNomeEdit(e.target.value)}
                placeholder="Seu nome"
                maxLength={60}
                className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-emerald-500 outline-none font-body text-base"
              />
              <button
                onClick={saveNome}
                disabled={savingNome || !nomeEdit.trim() || nomeEdit.trim() === profileName.trim()}
                className="mt-3 w-full h-11 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 text-white"
                style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
              >
                {savingNome ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar nome
              </button>
            </div>

            {/* Apelido */}
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Pencil className="w-4 h-4 text-primary" />
                  <p className="font-body text-sm font-bold">Apelido no Horus</p>
                </div>
                <Switch
                  checked={apelidoAtivo}
                  onCheckedChange={(v) => setApelidoAtivo(Boolean(v))}
                  disabled={!isVerified}
                />
              </div>
              <p className="font-body text-xs text-muted-foreground mb-3">
                Se ativar, o Horus vai te chamar pelo apelido. Seu nome de cadastro continua igual.
              </p>
              <input
                type="text"
                value={apelidoEdit}
                onChange={(e) => setApelidoEdit(e.target.value)}
                placeholder="Ex.: Wes, Dr. Wesley…"
                maxLength={40}
                disabled={!isVerified || !apelidoAtivo}
                className="w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none font-body text-base disabled:opacity-60"
              />
              <button
                onClick={saveApelido}
                disabled={
                  savingApelido || !isVerified ||
                  (apelidoAtivo === Boolean(linked?.apelido_ativo) &&
                   apelidoEdit.trim() === (linked?.apelido || '').trim())
                }
                className="mt-3 w-full h-11 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 bg-primary text-primary-foreground"
              >
                {savingApelido ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar apelido
              </button>
              {!isVerified && (
                <p className="mt-2 font-body text-xs text-muted-foreground">
                  Verifique seu WhatsApp para usar apelido.
                </p>
              )}
            </div>


            {/* Número */}
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                <p className="font-body text-sm font-bold">Número no WhatsApp</p>
              </div>
              {isVerified ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-body text-base font-semibold truncate">{linked?.phone_e164}</p>
                    <p className="font-body text-xs text-orange-400">Verificado</p>
                  </div>
                  <button
                    onClick={() => { haptic.selection(); setVerifyOpen(true); }}
                    className="h-10 px-3 rounded-lg bg-background border border-border font-body text-sm font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" /> Trocar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { haptic.selection(); setVerifyOpen(true); }}
                  className="w-full h-11 rounded-xl font-display font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                >
                  Verificar agora
                </button>
              )}
            </div>

            {/* Sobre você — perfil pessoal */}
            <button
              onClick={() => { haptic.selection(); setAjustesOpen(false); setTimeout(() => setEuOpen(true), 220); }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/50 border border-border text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-bold leading-tight">Sobre você</p>
                <p className="font-body text-xs text-muted-foreground leading-snug mt-0.5">
                  Conte o que o Horus deve lembrar em cada conversa
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {/* Notificações */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Bell className="w-4 h-4 text-amber-400" />
                <p className="font-body text-sm font-bold">Notificações no WhatsApp</p>
              </div>
              {!isVerified && !statusLoading && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 mb-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="font-body text-xs text-amber-300 flex-1 leading-snug">
                    Verifique seu WhatsApp para começar a receber estas notificações.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {NOTIF_ITEMS.map((n) => {
                  const Icon = n.icon;
                  const checked = prefs[n.key];
                  const saving = savingKey === n.key;
                  return (
                    <label
                      key={n.key}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50 border border-border cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${HORUS_COLOR[n.color].bg}`}>
                        <Icon className={`w-4 h-4 ${HORUS_COLOR[n.color].text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-bold leading-tight">{n.label}</p>
                        <p className="font-body text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{n.desc}</p>
                      </div>
                      {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />
                      ) : (
                        <Switch
                          checked={checked}
                          onCheckedChange={(v) => savePref(n.key, v)}
                          disabled={!isVerified}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
              <p className="font-body text-xs text-muted-foreground mt-3 px-1 leading-snug">
                As notificações são enviadas pelo WhatsApp do Horus. Você pode desativar a qualquer momento.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default AssistenteHorus;
