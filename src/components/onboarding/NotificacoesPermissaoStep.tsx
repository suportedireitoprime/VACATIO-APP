import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { Bell, Gavel, CalendarClock, Newspaper, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebPush } from '@/hooks/useWebPush';
import { marcarPedido, marcarResultado } from '@/lib/pushPermission';
import { supabase } from '@/integrations/supabase/client';

function setBottomNavHidden(hidden: boolean) {
  try {
    window.dispatchEvent(new CustomEvent('vacatio:bottom-nav-visibility', { detail: { hidden } }));
  } catch {}
}

const BENEFICIOS = [
  { icon: Gavel, titulo: 'Mudou a lei, você sabe na hora', desc: 'Alterações em leis, súmulas e teses da sua área.' },
  { icon: Newspaper, titulo: 'As notícias que importam', desc: 'Um resumo curto por dia — nada de spam.' },
  { icon: CalendarClock, titulo: 'Seus estudos em dia', desc: 'Lembretes de revisão, prazos e metas.' },
];

/**
 * Passo contextualizado de permissão de notificações, exibido no fim da triagem
 * de cadastro. Explica o porquê antes de disparar o prompt do sistema.
 */
export default function NotificacoesPermissaoStep({
  onDone,
}: {
  onDone: (granted: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { supported: webSupported, subscribe } = useWebPush();

  useEffect(() => {
    marcarPedido();
    setBottomNavHidden(true);
    return () => { setBottomNavHidden(false); };
  }, []);

  /** Push de boas-vindas: confirma na hora que está funcionando de verdade. */
  const enviarBoasVindas = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      await supabase.functions.invoke('send-push', {
        body: {
          title: 'Tudo certo! 🔔',
          body: 'A partir de agora você recebe as novidades jurídicas da sua área por aqui.',
          url: '/',
          audience: { user_ids: [userId] },
          mirror_canal: false,
          personalize: true,
          data: { automation_key: 'boas_vindas_push' },
        },
      });
    } catch (e) { console.warn('push de boas-vindas falhou', e); }
  };

  const ativar = async () => {
    setLoading(true);
    let granted = false;
    try {
      if (Capacitor.isNativePlatform()) {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        try { await LocalNotifications.requestPermissions(); } catch {}
        const p = await PushNotifications.requestPermissions();
        granted = p.receive === 'granted';
        if (granted) {
          await PushNotifications.register();
          try {
            const { registerNativePushToken } = await import('@/lib/nativePush');
            await registerNativePushToken();
          } catch {}
        }
      } else if (webSupported) {
        granted = await subscribe();
      }
    } catch (e) {
      console.warn('[NotificacoesPermissaoStep]', e);
    } finally {
      setLoading(false);
      marcarResultado(granted);
      if (granted) {
        // Aguarda o token chegar ao banco antes de disparar o teste.
        window.setTimeout(() => { enviarBoasVindas(); }, 2500);
      }
      onDone(granted);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-background/95 backdrop-blur-sm p-4">
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/20"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Não perca nada do Direito
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ative os avisos e receba só o essencial: o que mudou na lei, a notícia
            do dia e os seus lembretes de estudo.
          </p>
        </div>

        <ul className="space-y-3">
          {BENEFICIOS.map(({ icon: Icon, titulo, desc }) => (
            <li key={titulo} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{titulo}</span>
                <span className="block text-xs text-muted-foreground">{desc}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Você pode desativar quando quiser nas configurações.
        </p>

        <div className="space-y-2">
          <Button className="w-full h-14 text-base font-semibold" size="lg" onClick={ativar} disabled={loading}>
            {loading ? 'Ativando…' : 'Quero ser avisado'}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => { marcarResultado(false); onDone(false); }}
            disabled={loading}
          >
            Agora não
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
