import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Capacitor } from '@capacitor/core';
import { Crown, Zap, Check, Shield, BookOpen, Brain, CreditCard, Copy, CheckCircle2, Loader2, Smartphone, RotateCw, Monitor, TrendingUp, Sparkles, Star, MessageCircle, Headphones, FileText, Library, Scale, Briefcase } from "lucide-react";
import { AppHeader } from '@/components/layout/AppHeader';
import { PageHeader } from '@/components/vademecum/PageHeader';
import logoVacatio from '@/assets/logo-vacatio-v2.png';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isBillingAvailable, initBilling, getProducts, purchase as playPurchase, restorePurchases, PRODUCT_IDS, PlayProduct } from "@/lib/billing";
import { useSubscription } from "@/hooks/useSubscription";
import WelcomePremiumOverlay from "@/components/planos/WelcomePremiumOverlay";
import { TrialTimelineSheet } from "@/components/planos/TrialTimelineSheet";
import { scheduleTrialReminder, type TrialPlan } from "@/lib/trialReminders";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { isAdminEmail } from "@/lib/adminEmails";
import { maybeRequestAfterPurchase } from "@/lib/inAppReview";
import { track } from "@/lib/analyticsEvents";

const benefits = [
  { icon: BookOpen, text: "Acesso a todas as legislações" },
  { icon: Brain, text: "Questões ilimitadas com IA" },
  { icon: Monitor, text: "Acesso pelo desktop e +20 recursos" },
  { icon: Shield, text: "Radar Legislativo em tempo real" },
];

// ── Masks ──
const maskCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const maskCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};
const maskCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5)}`;
};
const maskExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0,2)}/${d.slice(2)}`;
};
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};

type Plano = "mensal" | "anual";

export default function Assinatura() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const welcomeFlag = searchParams.get('welcome') === '1';
  const { refresh: refreshSubscription, isPremium, loading: subLoading, plano: planoAtual } = useSubscription({ pollOnMount: welcomeFlag });
  const [showWelcome, setShowWelcome] = useState(welcomeFlag);

  useEffect(() => {
    if (welcomeFlag) {
      setShowWelcome(true);
      // Pós-compra: pede avaliação nativa (Play/App Store) só se ainda não pedimos.
      maybeRequestAfterPurchase(2500);
    }
  }, [welcomeFlag]);

  const closeWelcome = () => {
    setShowWelcome(false);
    if (searchParams.has('welcome')) {
      searchParams.delete('welcome');
      setSearchParams(searchParams, { replace: true });
    }
  };

  // ── View state ──
  const [view, setView] = useState<"plans" | "checkout">("plans");
  const [selectedPlano, setSelectedPlano] = useState<Plano>("anual");

  // Funil de receita: visualização da lista de planos.
  useEffect(() => {
    import('@/lib/appEvents').then(({ appEvents }) => appEvents.verPlanos()).catch(() => {});
  }, []);

  // ── Google Play native billing ──
  const nativeBilling = isBillingAvailable();
  const [playProducts, setPlayProducts] = useState<PlayProduct[]>([]);
  const [playLoading, setPlayLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!nativeBilling) return;
    (async () => {
      await initBilling(() => {
        refreshSubscription();
        toast.success('Assinatura ativada! 🎉');
        navigate('/assinatura?welcome=1', { replace: true });
      });
      const list = await getProducts();
      setPlayProducts(list);
    })();
  }, [nativeBilling, navigate, refreshSubscription]);

  const handlePlayPurchase = async (planKey: 'mensal' | 'anual' | 'anual_parcelado') => {
    if (!session) { toast.error('Faça login para assinar'); return; }
    setPlayLoading(true);
    try {
      const r = await playPurchase(planKey);
      if (!r.ok) {
        track('subscription_payment_failed', { plano: planKey, erro: r.error ?? 'unknown', metodo: 'play' });
        toast.error(r.error ?? 'Falha na compra');
        return;
      }
      track('subscription_completed', { plano: planKey, metodo: 'play', valor: playProducts.find(p => p.productId === PRODUCT_IDS[planKey])?.price ?? '' });
      // Handshake pós-compra: força refresh + navega para overlay de boas-vindas
      // (não dependemos só do listener transactionUpdated).
      refreshSubscription();
      toast.success('Assinatura ativada! 🎉');
      navigate('/assinatura?welcome=1', { replace: true });
    } finally {
      setPlayLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const r = await restorePurchases();
    setRestoring(false);
    if (r.ok && r.restored > 0) { toast.success(`${r.restored} assinatura(s) restaurada(s)`); refreshSubscription(); navigate('/assinatura?welcome=1', { replace: true }); }
    else if (r.ok) toast.info('Nenhuma compra anterior encontrada.');
    else toast.error(r.error ?? 'Falha ao restaurar');
  };

  // ── Card form ──
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [phone, setPhone] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressData, setAddressData] = useState<{ logradouro?: string; bairro?: string; localidade?: string; uf?: string } | null>(null);
  const [installments, setInstallments] = useState("1");

  // ── PIX state ──
  const [pixQrImage, setPixQrImage] = useState<string | null>(null);
  const [pixPayload, setPixPayload] = useState<string | null>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);

  // ── Loading ──
  const [processing, setProcessing] = useState(false);

  // ── CEP lookup ──
  useEffect(() => {
    const raw = cep.replace(/\D/g, '');
    if (raw.length === 8) {
      fetch(`https://viacep.com.br/ws/${raw}/json/`)
        .then(r => r.json())
        .then(d => { if (!d.erro) setAddressData(d); })
        .catch(() => {});
    } else {
      setAddressData(null);
    }
  }, [cep]);

  // ── PIX polling ──
  useEffect(() => {
    if (!pixPaymentId || pixConfirmed) return;
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("processar-pagamento", {
          body: { action: "check-pix-status", paymentId: pixPaymentId },
        });
        if (!error && (data?.status === 'RECEIVED' || data?.status === 'CONFIRMED')) {
          setPixConfirmed(true);
          toast.success("Pagamento PIX confirmado! 🎉");
          clearInterval(interval);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [pixPaymentId, pixConfirmed]);

  // ── Get remote IP ──
  const getRemoteIp = useCallback(async () => {
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      const d = await r.json();
      return d.ip;
    } catch { return '0.0.0.0'; }
  }, []);

  // ── Handle select plan ──
  const handleSelectPlan = (plano: Plano) => {
    if (!session) { toast.error("Faça login para assinar"); return; }
    setSelectedPlano(plano);
    setView("checkout");
  };

  // ── Handle card payment ──
  const handleCardPayment = async () => {
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv || !cpf || !cep) {
      toast.error("Preencha todos os campos");
      return;
    }
    track('subscription_payment_started', { plano: selectedPlano, metodo: 'cartao', parcelas: selectedPlano === 'anual' ? parseInt(installments) : 1 });
    setProcessing(true);
    try {
      const [month, year] = cardExpiry.split('/');
      const remoteIp = await getRemoteIp();

      const { data, error } = await supabase.functions.invoke("processar-pagamento", {
        body: {
          plano: selectedPlano,
          metodo: 'cartao',
          cpf,
          cep,
          numero_endereco: addressNumber || 'S/N',
          telefone: phone,
          remoteIp,
          installments: selectedPlano === 'anual' ? parseInt(installments) : 1,
          creditCard: {
            holderName: cardName,
            number: cardNumber,
            expiryMonth: month,
            expiryYear: `20${year}`,
            ccv: cardCvv,
          },
        },
      });
      if (error) throw error;
      if (data?.success) {
        track('subscription_completed', { plano: selectedPlano, metodo: 'cartao', valor });
        toast.success("Pagamento processado com sucesso! 🎉");
        refreshSubscription();
        navigate("/assinatura?welcome=1", { replace: true });
      } else {
        track('subscription_payment_failed', { plano: selectedPlano, metodo: 'cartao', erro: data?.error ?? 'unknown' });
        toast.error(data?.error || "Erro no pagamento");
      }
    } catch (err: any) {
      console.error(err);
      track('subscription_payment_failed', { plano: selectedPlano, metodo: 'cartao', erro: err?.message ?? 'exception' });
      const details = err?.message || '';
      toast.error(`Erro ao processar pagamento. ${details}`);
    } finally {
      setProcessing(false);
    }
  };

  // ── Handle PIX ──
  const handlePixPayment = async () => {
    if (!cpf || !cep) { toast.error("Preencha CPF e CEP"); return; }
    track('subscription_payment_started', { plano: 'anual', metodo: 'pix' });
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("processar-pagamento", {
        body: { plano: 'anual', metodo: 'pix', cpf, cep, numero_endereco: addressNumber || 'S/N', telefone: phone },
      });
      if (error) throw error;
      if (data?.success) {
        track('subscription_payment_initiated', { plano: 'anual', metodo: 'pix', payment_id: data.paymentId });
        setPixQrImage(data.qrCodeImage);
        setPixPayload(data.qrCodePayload);
        setPixPaymentId(data.paymentId);
      } else {
        track('subscription_payment_failed', { plano: 'anual', metodo: 'pix', erro: data?.error ?? 'unknown' });
        toast.error(data?.error || "Erro ao gerar PIX");
      }
    } catch (err: any) {
      console.error(err);
      track('subscription_payment_failed', { plano: 'anual', metodo: 'pix', erro: err?.message ?? 'exception' });
      toast.error("Erro ao gerar PIX");
    } finally {
      setProcessing(false);
    }
  };

  const copyPix = () => {
    if (pixPayload) {
      navigator.clipboard.writeText(pixPayload);
      setPixCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const valor = selectedPlano === 'mensal' ? 25.99 : 189.90;
  const valorParcela = selectedPlano === 'anual' ? (189.90 / parseInt(installments)).toFixed(2) : null;

  // ── PLANS VIEW (tabbed: Mensal / Anual) ──
  type PlanoTab = 'mensal' | 'anual' | 'anual_parcelado';
  const nativePlatform = useMemo(() => Capacitor.getPlatform(), []);
  const showDevToggle = isAdminEmail(session?.user?.email);
  const [platformOverride, setPlatformOverride] = useState<'ios' | 'android' | null>(() => {
    if (typeof window === 'undefined') return null;
    const v = window.localStorage.getItem('assinatura_platform_override');
    return v === 'ios' || v === 'android' ? v : null;
  });
  const [devSheetOpen, setDevSheetOpen] = useState(false);
  const isIOS = (platformOverride ?? nativePlatform) === 'ios';
  const applyPlatformOverride = (p: 'ios' | 'android' | null) => {
    setPlatformOverride(p);
    if (p) window.localStorage.setItem('assinatura_platform_override', p);
    else window.localStorage.removeItem('assinatura_platform_override');
    setDevSheetOpen(false);
  };
  const [tab, setTab] = useState<PlanoTab>(isIOS ? 'anual' : 'anual_parcelado');
  useEffect(() => { setTab(isIOS ? 'anual' : 'anual_parcelado'); }, [isIOS]);

  const PRO_FEATURES = [
    { icon: Scale, text: 'Vade Mecum completo — todas as leis em vigor, sempre atualizadas' },
    { icon: MessageCircle, text: 'Horus 24h no WhatsApp — assistente jurídico com todas as funções' },
    { icon: Brain, text: 'IA jurídica ilimitada — tire dúvidas, gere peças e estude sem parar' },
    { icon: Library, text: 'Biblioteca profissional com +200 livros e ebooks jurídicos' },
    { icon: Headphones, text: 'Narração nativa — ouça leis inteiras com voz humana' },
    { icon: FileText, text: 'Resumos automáticos por IA de leis, artigos e livros' },
    { icon: Sparkles, text: 'Funções do artigo — explicar, mapa mental, flashcards e mais' },
    { icon: Monitor, text: 'Acesso completo no Desktop, Web e App sincronizados' },
    { icon: Shield, text: 'Radar Legislativo em tempo real — nenhuma novidade escapa' },
    { icon: Briefcase, text: 'Uso profissional liberado — advogados, servidores e concurseiros' },
    { icon: Zap, text: 'Sem anúncios · Suporte prioritário · Atualizações antecipadas' },
  ];


  const [trialSheetPlan, setTrialSheetPlan] = useState<TrialPlan | null>(null);

  const startPurchase = (plano: PlanoTab) => {
    track('subscription_started', { plano, metodo: nativeBilling ? 'play' : 'web', source: 'planos_page' });
    import('@/lib/appEvents')
      .then(({ appEvents }) => {
        appEvents.verPlano({ plano });
        appEvents.assinaturaIniciada({ plano, metodo: nativeBilling ? 'play' : 'web' });
      })
      .catch(() => {});
    // Antes de abrir o checkout, mostra a linha do tempo do teste grátis.
    const trialPlan: TrialPlan = plano === 'mensal' ? 'mensal' : 'anual_parcelado';
    setTrialSheetPlan(trialPlan);
  };

  const confirmTrialAndBuy = async () => {
    if (!trialSheetPlan) return;
    import('@/lib/appEvents')
      .then(({ appEvents }) =>
        appEvents.trialIniciado({ plano: trialSheetPlan, dias: trialSheetPlan === 'mensal' ? 3 : 7 })
      )
      .catch(() => {});
    // Agenda lembrete (WhatsApp via cron + push local) e abre checkout real.
    await scheduleTrialReminder(trialSheetPlan);
    const plano = trialSheetPlan;
    setTrialSheetPlan(null);
    if (nativeBilling) {
      handlePlayPurchase(plano);
    } else {
      handleSelectPlan(plano === 'mensal' ? 'mensal' : 'anual');
    }
  };

  // Já assinante? Redireciona pro painel de plano ativo (mantém welcome overlay quando volta do checkout).
  if (view === "plans" && !subLoading && isPremium && !showWelcome) {
    return <Navigate to="/planos/ativos" replace />;
  }

  if (view === "plans") {


    return (
      <div className="min-h-dvh bg-background pb-12">
        <WelcomePremiumOverlay
          open={showWelcome}
          planoLabel={planoAtual ?? 'Premium'}
          syncing={welcomeFlag && !isPremium}
          onClose={closeWelcome}
        />
        <TrialTimelineSheet
          open={!!trialSheetPlan}
          onOpenChange={(v) => { if (!v) setTrialSheetPlan(null); }}
          plan={trialSheetPlan ?? 'anual_parcelado'}
          onConfirm={confirmTrialAndBuy}
          loading={playLoading}
        />
        <PageHeader
          title="Assinatura Premium"
          onBack={() => navigate(-1)}
        />

        <div className="max-w-2xl mx-auto pt-6 space-y-7">
          {/* Clean hero */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-4 px-4 pt-1"
          >

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border">
              <Briefcase className="w-3 h-3 text-primary" />
              <span className="font-body text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Uso profissional
              </span>
            </div>


            <div className="flex justify-center">
              <div className="btn-attention-shine relative inline-flex items-center justify-center px-5 py-2.5 rounded-2xl bg-primary shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-primary-foreground leading-none tracking-tight">
                  ESTUDE SEM LIMITES
                </h1>
              </div>
            </div>
            <p className="font-body text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Escolha o plano ideal e aprove sem barreiras.
            </p>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="flex -space-x-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <span className="font-body text-xs text-muted-foreground">
                <span className="font-bold text-foreground">4.9</span> · Nota máxima na Play Store
              </span>
            </div>

          </motion.section>

          {/* Plan carousel — equal-size cards, snap scroll, anual peeks on the side */}
          <div
            className="flex sm:grid sm:grid-cols-2 gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
            style={{ scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem' }}
          >
            {([
              isIOS
              ? {
                  id: 'mensal' as const,
                  label: 'Mensal',
                  price: 'R$ 29,90',
                  priceSuffix: '/mês',
                  subtitle: 'Cobrado mensalmente',
                  trial: '3 dias grátis',
                  highlights: ['Acesso total ao Vade Mecum', 'Acesso ao desktop', 'Uso offline', 'Horus 24h no WhatsApp'],
                  badge: null,
                }
              : {
                  id: 'mensal' as const,
                  label: 'Mensal',
                  price: 'R$ 25,99',
                  priceSuffix: '/mês',
                  subtitle: 'Cobrado mensalmente',
                  trial: '3 dias grátis',
                  highlights: ['Acesso total ao Vade Mecum', 'Acesso ao desktop', 'Uso offline', 'Horus 24h no WhatsApp'],
                  badge: null,
                },
              ...(isIOS ? [
                {
                  id: 'anual' as const,
                  label: 'Anual',
                  price: 'R$ 249,90',
                  priceSuffix: '/ano',
                  subtitle: 'Pagamento anual à vista · 7 dias grátis',
                  trial: '7 dias grátis',
                  highlights: ['Acesso total ao Vade Mecum', 'Acesso ao desktop', 'Uso offline', 'Horus 24h no WhatsApp'],
                  badge: 'MAIS POPULAR',
                },
                {
                  id: 'anual_parcelado' as const,
                  label: 'Anual 12x',
                  price: 'R$ 24,90',
                  priceSuffix: '/mês',
                  subtitle: '12 meses de compromisso · 7 dias grátis',
                  trial: '7 dias grátis',
                  highlights: ['Acesso total ao Vade Mecum', 'Acesso ao desktop', 'Uso offline', 'Horus 24h no WhatsApp'],
                  badge: null,
                },
              ] : [
                {
                  id: 'anual_parcelado' as const,
                  label: 'Anual',
                  price: 'R$ 15,83',
                  priceSuffix: '/mês',
                  subtitle: '12x sem juros · R$ 189,90/ano · economize 39%',
                  trial: '7 dias grátis',
                  highlights: ['Acesso total ao Vade Mecum', 'Acesso ao desktop', 'Uso offline', 'Horus 24h no WhatsApp'],
                  badge: '-39%',
                },
              ]),
            ]).map((plan) => {
              const isActive = tab === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setTab(plan.id)}
                  role="button"
                  tabIndex={0}
                  data-track="plan_card_viewed"
                  data-plano={plan.id}
                  className={`snap-start shrink-0 w-[85%] sm:w-auto sm:shrink relative rounded-2xl p-5 flex flex-col text-left transition-all cursor-pointer overflow-hidden ${
                    isActive
                      ? 'bg-card border-2 border-primary'
                      : 'bg-card/70 border border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-wider text-primary">
                        {plan.label}
                      </span>
                    </div>
                    {plan.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-body text-[10px] font-extrabold">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="font-body text-sm text-muted-foreground">{plan.priceSuffix}</span>
                  </div>
                  <span className="font-body text-[11px] text-muted-foreground mb-3">
                    {plan.subtitle}
                  </span>

                  <ul className="space-y-1.5 mb-4">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={3} />
                        <span className="font-body text-[12px] text-foreground/90 leading-tight">{h}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={(e) => { e.stopPropagation(); setTab(plan.id); startPurchase(plan.id); }}
                    disabled={playLoading}
                    data-track="plan_cta_click"
                    data-plano={plan.id}
                    className="btn-attention-shine mt-auto w-full h-14 rounded-xl bg-primary text-primary-foreground font-display font-extrabold text-base sm:text-lg tracking-wide hover:brightness-95 transition-all"
                  >
                    {playLoading && isActive ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processando…</span>
                    ) : (
                      <span>Começar {plan.trial}</span>
                    )}
                  </Button>
                  <p className="text-center font-body text-[10px] text-muted-foreground mt-2">
                    Cancele quando quiser
                  </p>
                </div>

              );
            })}

          </div>

          {/* Feature checklist */}
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-4 rounded-2xl p-5 bg-card/60 border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
                Tudo que você desbloqueia
              </h3>
            </div>
            <ul className="space-y-3">
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                  </div>
                  <span className="font-body text-sm text-foreground leading-snug">{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* FAQ */}
          <div className="mx-4 rounded-2xl p-5 bg-card/60 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
                Perguntas frequentes
              </h3>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="para-quem" className="border-border">
                <AccordionTrigger className="font-body text-sm font-semibold text-foreground text-left hover:no-underline">
                  Para quem é o Vacatio?
                </AccordionTrigger>
                <AccordionContent className="font-body text-sm text-muted-foreground leading-relaxed">
                  O Vacatio é feito para <span className="text-foreground font-medium">estudantes de Direito, concurseiros e advogados</span> que precisam de agilidade no dia a dia jurídico. Consulte qualquer lei atualizada em segundos, tire dúvidas com IA jurídica 24h, gere resumos automáticos, ouça leis inteiras narradas, estude com flashcards e mapas mentais, acompanhe novidades legislativas em tempo real e leve toda a biblioteca no bolso — na faculdade, no trabalho, no fórum ou revisando para a próxima prova.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="cancelar" className="border-border">
                <AccordionTrigger className="font-body text-sm font-semibold text-foreground text-left hover:no-underline">
                  Posso cancelar quando quiser?
                </AccordionTrigger>
                <AccordionContent className="font-body text-sm text-muted-foreground leading-relaxed">
                  Sim. O cancelamento é feito direto pela sua conta da Google Play, com um toque, sem burocracia. Você mantém o acesso Premium até o fim do período pago.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="teste" className="border-border">
                <AccordionTrigger className="font-body text-sm font-semibold text-foreground text-left hover:no-underline">
                  Como funciona o período grátis?
                </AccordionTrigger>
                <AccordionContent className="font-body text-sm text-muted-foreground leading-relaxed">
                  No plano Mensal você testa 3 dias grátis; no Anual, 7 dias. Durante o teste, todas as funções Premium ficam liberadas. Cancele antes do fim para não ser cobrado.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="pagamento" className="border-border">
                <AccordionTrigger className="font-body text-sm font-semibold text-foreground text-left hover:no-underline">
                  O pagamento é seguro?
                </AccordionTrigger>
                <AccordionContent className="font-body text-sm text-muted-foreground leading-relaxed">
                  O pagamento é processado pela Google Play, com a mesma segurança usada em milhões de aplicativos. O Vacatio nunca tem acesso aos dados do seu cartão.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="dispositivos" className="border-border-0 border-b-0">
                <AccordionTrigger className="font-body text-sm font-semibold text-foreground text-left hover:no-underline">
                  Funciona em vários dispositivos?
                </AccordionTrigger>
                <AccordionContent className="font-body text-sm text-muted-foreground leading-relaxed">
                  Sim. Sua assinatura sincroniza no App, no Desktop e na Web — estude onde e quando quiser, do mesmo jeito.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>


          {nativeBilling && (
            <div className="px-4">
              <Button variant="ghost" onClick={handleRestore} disabled={restoring} className="w-full">
                {restoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCw className="w-4 h-4 mr-2" />}
                Restaurar compras
              </Button>
            </div>
          )}
        </div>

        {showDevToggle && (
          <>
            <button
              type="button"
              onClick={() => setDevSheetOpen(true)}
              className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-[11px] font-bold shadow-lg border border-primary/50 flex items-center gap-1.5 hover:brightness-95"
              aria-label="Alternar plataforma (só pra mim)"
            >
              <RotateCw className="w-3 h-3" />
              só pra mim
              {platformOverride && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-[9px] uppercase">
                  {platformOverride}
                </span>
              )}
            </button>
            <Sheet open={devSheetOpen} onOpenChange={setDevSheetOpen}>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Prévia da assinatura</SheetTitle>
                  <SheetDescription>
                    Escolha como quer visualizar a tela de planos. Só você vê este controle.
                  </SheetDescription>
                </SheetHeader>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <Button
                    variant={(platformOverride ?? nativePlatform) === 'android' ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-1"
                    onClick={() => applyPlatformOverride('android')}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="font-bold">Android</span>
                    <span className="text-[10px] opacity-70">Google Play</span>
                  </Button>
                  <Button
                    variant={(platformOverride ?? nativePlatform) === 'ios' ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-1"
                    onClick={() => applyPlatformOverride('ios')}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="font-bold">Apple</span>
                    <span className="text-[10px] opacity-70">App Store</span>
                  </Button>
                </div>
                {platformOverride && (
                  <Button
                    variant="ghost"
                    className="w-full mt-3 text-xs"
                    onClick={() => applyPlatformOverride(null)}
                  >
                    Usar plataforma real ({nativePlatform})
                  </Button>
                )}
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>

    );
  }




  // ── CHECKOUT VIEW ──
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        onBack={() => { setView("plans"); setPixQrImage(null); setPixPaymentId(null); }}
        title={
          <span className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-primary" />
            Checkout
          </span>
        }
        right={<Badge variant="secondary" className="text-xs mr-2">{selectedPlano === 'mensal' ? 'Mensal' : 'Anual'}</Badge>}
      />


      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
        {/* PIX confirmed */}
        {pixConfirmed && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Pagamento confirmado!</h2>
            <p className="text-sm text-muted-foreground">Seu plano Premium já está ativo.</p>
            <Button onClick={() => navigate("/")} className="rounded-xl">Voltar ao app</Button>
          </div>
        )}

        {!pixConfirmed && (
          <Tabs defaultValue="cartao" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="cartao" className="flex-1 gap-1.5"><CreditCard className="w-4 h-4" /> Cartão</TabsTrigger>
              {selectedPlano === 'anual' && (
                <TabsTrigger value="pix" className="flex-1 gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.66 6.34l-3.54 3.54a2 2 0 01-2.83 0L7.76 6.34a2 2 0 00-2.83 0L2.1 9.17a2 2 0 000 2.83l2.83 2.83a2 2 0 000 2.83l2.83 2.83a2 2 0 002.83 0l3.54-3.54a2 2 0 012.83 0l3.54 3.54a2 2 0 002.83 0l2.83-2.83a2 2 0 000-2.83l-2.83-2.83a2 2 0 010-2.83l2.83-2.83a2 2 0 000-2.83L20.49 6.34a2 2 0 00-2.83 0z"/></svg>
                  PIX
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── CARTÃO TAB ── */}
            <TabsContent value="cartao" className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Número do cartão</Label>
                <Input placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e => setCardNumber(maskCard(e.target.value))} className="rounded-xl h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome no cartão</Label>
                <Input placeholder="Nome como está no cartão" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} className="rounded-xl h-11" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Validade</Label>
                  <Input placeholder="MM/AA" value={cardExpiry} onChange={e => setCardExpiry(maskExpiry(e.target.value))} className="rounded-xl h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">CVV</Label>
                  <Input placeholder="000" maxLength={4} value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} className="rounded-xl h-11" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">CPF do titular</Label>
                <Input placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} className="rounded-xl h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} className="rounded-xl h-11" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">CEP</Label>
                  <Input placeholder="00000-000" value={cep} onChange={e => setCep(maskCep(e.target.value))} className="rounded-xl h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nº</Label>
                  <Input placeholder="Nº" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} className="rounded-xl h-11" />
                </div>
              </div>
              {addressData && (
                <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground space-y-0.5">
                  <p>{addressData.logradouro}</p>
                  <p>{addressData.bairro} - {addressData.localidade}/{addressData.uf}</p>
                </div>
              )}

              {selectedPlano === 'anual' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Parcelas</Label>
                  <Select value={installments} onValueChange={setInstallments}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x de R$ {(119.90 / n).toFixed(2)} {n === 1 ? '(à vista)' : 'sem juros'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={handleCardPayment} disabled={processing} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-base mt-2">
                {processing ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processando...</span>
                ) : (
                  `Pagar R$ ${selectedPlano === 'anual' && parseInt(installments) > 1 ? `${parseInt(installments)}x de R$ ${valorParcela}` : valor.toFixed(2).replace('.', ',')}`
                )}
              </Button>
            </TabsContent>

            {/* ── PIX TAB ── */}
            {selectedPlano === 'anual' && (
              <TabsContent value="pix" className="space-y-4 mt-4">
                {!pixQrImage ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">CPF</Label>
                      <Input placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} className="rounded-xl h-11" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">CEP</Label>
                        <Input placeholder="00000-000" value={cep} onChange={e => setCep(maskCep(e.target.value))} className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Nº</Label>
                        <Input placeholder="Nº" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} className="rounded-xl h-11" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} className="rounded-xl h-11" />
                    </div>
                    <Button onClick={handlePixPayment} disabled={processing} className="w-full h-12 rounded-xl font-semibold text-base">
                      {processing ? (
                        <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Gerando PIX...</span>
                      ) : (
                        `Gerar PIX — R$ 119,90`
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-sm font-medium text-foreground">Escaneie o QR Code ou copie o código</p>
                    <div className="inline-block p-4 bg-white rounded-2xl shadow-md">
                      <img src={`data:image/png;base64,${pixQrImage}`} alt="QR Code PIX" className="w-52 h-52" />
                    </div>
                    <div className="relative">
                      <Input readOnly value={pixPayload || ''} className="rounded-xl h-11 pr-12 text-xs font-mono" />
                      <button onClick={copyPix} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted/60 transition">
                        {pixCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Aguardando confirmação do pagamento...
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">🔒 Criptografia SSL · Processado por Asaas</p>
      </div>
    </div>
  );
}
