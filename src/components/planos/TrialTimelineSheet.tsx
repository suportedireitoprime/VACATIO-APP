import { motion } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check, Bell, MessageCircle, CreditCard, ShieldCheck, X } from 'lucide-react';
import { trialDaysFor, type TrialPlan } from '@/lib/trialReminders';
import { Capacitor } from '@capacitor/core';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: TrialPlan;
  onConfirm: () => void;
  loading?: boolean;
}

/**
 * Linha do tempo dos dias de teste grátis. Aparece antes de abrir o checkout
 * do Google Play para que a pessoa saiba quando será cobrada e como cancelar.
 */
export function TrialTimelineSheet({ open, onOpenChange, plan, onConfirm, loading }: Props) {
  const trialDays = trialDaysFor(plan);
  const leadHours = trialDays >= 7 ? 48 : 24;
  const reminderDay = trialDays - Math.round(leadHours / 24);
  const isIOS = Capacitor.getPlatform() === 'ios';
  const storeLabel = isIOS ? 'App Store' : 'Google Play';
  const planoLabel = plan === 'anual_parcelado'
    ? (isIOS ? 'Anual' : 'Anual (12x sem juros)')
    : 'Mensal';
  const priceLabel = plan === 'anual_parcelado'
    ? (isIOS ? 'R$ 249,90/ano' : 'R$ 15,83/mês (12x)')
    : (isIOS ? 'R$ 29,90/mês' : 'R$ 25,99/mês');

  const steps = [
    {
      icon: Check,
      day: 'Hoje',
      title: 'Acesso Premium liberado',
      body: 'Todas as funções desbloqueadas na hora — sem cobrança agora.',
      accent: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    },
    {
      icon: Bell,
      day: `Dia ${reminderDay}`,
      title: 'Aviso do Horus',
      body: `Push no celular + mensagem no WhatsApp lembrando que faltam ${trialDays - reminderDay} dia(s) para a cobrança.`,
      accent: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    },
    {
      icon: CreditCard,
      day: `Dia ${trialDays}`,
      title: `Início da cobrança · ${priceLabel}`,
      body: `Renovação automática pela ${storeLabel}. Cancele a qualquer momento nas configurações da sua conta.`,
      accent: 'bg-primary/15 text-primary border-primary/30',
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] rounded-t-3xl p-0 border-t-0 bg-gradient-to-b from-background via-background to-muted/30 overflow-y-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-background/80 backdrop-blur-md border-b border-border/40">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Seus {trialDays} dias grátis
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 -mr-2 rounded-full hover:bg-muted/60"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-5 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" /> {planoLabel}
            </div>
            <h2 className="text-2xl font-extrabold leading-tight">
              Como funcionam seus <span className="text-primary">{trialDays} dias grátis</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Você tem controle total. Nada é cobrado durante o teste.
            </p>
          </motion.div>

          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-[22px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-emerald-500/50 via-amber-500/50 to-primary/50" />

            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="relative pl-14 pb-6 last:pb-2"
              >
                <div className={`absolute left-0 top-0 w-11 h-11 rounded-full border-2 flex items-center justify-center ${s.accent}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">{s.day}</div>
                <div className="text-base font-bold leading-snug">{s.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed mt-1">{s.body}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-muted/40 border border-border/50 flex gap-3">
            <MessageCircle className="w-5 h-5 shrink-0 text-primary mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              O Horus vai te lembrar pelo <b className="text-foreground">WhatsApp</b> antes do fim do teste — e você
              pode cancelar em segundos direto na {storeLabel}, sem cobrança.
            </div>
          </div>

          <Button
            onClick={onConfirm}
            disabled={loading}
            className="w-full h-14 mt-6 rounded-2xl text-base font-extrabold bg-primary text-primary-foreground shadow-lg btn-attention-shine"
          >
            {loading ? `Abrindo ${storeLabel}…` : `Começar meus ${trialDays} dias grátis`}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground mt-3">
            Pagamento processado pela {storeLabel} · Cancele quando quiser
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
