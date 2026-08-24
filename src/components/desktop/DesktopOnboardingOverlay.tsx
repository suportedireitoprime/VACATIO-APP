import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, PanelLeft, Bell, Keyboard, ArrowRight, X, Check } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const LS_KEY_BASE = 'desktop_onboarding_done_v1';
const lsKeyFor = (userId: string | null | undefined) =>
  userId ? `${LS_KEY_BASE}:${userId}` : LS_KEY_BASE;

const STEPS = [
  {
    icon: Monitor,
    title: 'Bem-vindo à versão desktop',
    body: 'Um espaço mais espaçoso para estudar leis, ler artigos e acompanhar o Radar Legislativo — pensado do zero para telas grandes.',
  },
  {
    icon: PanelLeft,
    title: 'Menus laterais retráteis',
    body: 'Use os botões nas bordas para recolher/expandir as barras laterais. Deixe o app do jeito que combina com o seu fluxo — leitura focada ou navegação rápida.',
  },
  {
    icon: Bell,
    title: 'Notificações do dia',
    body: 'O sino no topo mostra novidades do Diário Oficial, notícias, boletins e blog do dia. Clique para abrir a tela dedicada.',
  },
  {
    icon: Keyboard,
    title: 'Atalhos e teclado',
    body: 'Esc fecha qualquer painel aberto. Você também pode arrastar áudios/PDFs para a janela para importar direto, e clicar com o botão direito nos cards do blog para copiar links e compartilhar.',
  },
];

export default function DesktopOnboardingOverlay() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user?.id) return; // aguarda auth para evitar mostrar antes/depois indevidamente

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const key = lsKeyFor(user.id);
        // Marca legada (sem user) — migra para a chave do usuário atual
        const legacyDone = localStorage.getItem(LS_KEY_BASE) === '1';
        if (legacyDone) {
          try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
          return;
        }
        if (localStorage.getItem(key) === '1') return;

        // Verifica no perfil (persistência por conta, entre dispositivos)
        try {
          const { data } = await supabase
            .from('profiles')
            .select('desktop_onboarding_done_at')
            .eq('id', user.id)
            .maybeSingle();
          if ((data as any)?.desktop_onboarding_done_at) {
            try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
            return;
          }
        } catch { /* coluna pode não existir — segue com LS */ }

        if (cancelled) return;
        timer = setTimeout(() => setOpen(true), 600);
      } catch { /* ignore */ }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user?.id]);

  const finish = () => {
    try { localStorage.setItem(lsKeyFor(user?.id), '1'); } catch { /* ignore */ }
    if (user?.id) {
      supabase
        .from('profiles')
        .update({ desktop_onboarding_done_at: new Date().toISOString() } as any)
        .eq('id', user.id)
        .then(() => {}, () => {});
    }
    setOpen(false);
  };

  useEscapeKey(open, finish);

  if (!open) return null;

  const S = STEPS[step];
  const Icon = S.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={finish} />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="desktop-onboarding-title"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="relative w-full max-w-lg bg-background border-2 border-primary/40 rounded-2xl shadow-2xl overflow-hidden"
          >
            <button
              onClick={finish}
              aria-label="Fechar apresentação"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-foreground/80 transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header amarelo */}
            <div className="relative h-24 bg-gradient-to-br from-primary/80 via-primary/60 to-primary/30 overflow-hidden">
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3), transparent 40%)',
              }} />
              <div className="relative h-full flex items-center px-6 gap-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-900/80 border border-primary-foreground/30 flex items-center justify-center shadow-lg">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-white drop-shadow">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">
                    Passo {step + 1} de {STEPS.length}
                  </p>
                  <p className="font-display text-sm font-bold">Introdução ao desktop</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <h2
                id="desktop-onboarding-title"
                className="font-display text-2xl font-black text-foreground leading-tight"
              >
                {S.title}
              </h2>
              <p className="text-muted-foreground text-[15px] leading-relaxed">
                {S.body}
              </p>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 pt-2">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? 'w-8 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-secondary/30">
              <button
                onClick={finish}
                className="text-sm text-muted-foreground hover:text-foreground transition font-semibold"
              >
                Pular
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    className="px-4 h-10 rounded-lg text-sm font-semibold text-foreground hover:bg-secondary transition"
                  >
                    Voltar
                  </button>
                )}
                <button
                  onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm shadow-lg shadow-primary/30 hover:brightness-105 transition"
                >
                  {isLast ? (
                    <>
                      <Check className="w-4 h-4" />
                      Começar
                    </>
                  ) : (
                    <>
                      Próximo
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
