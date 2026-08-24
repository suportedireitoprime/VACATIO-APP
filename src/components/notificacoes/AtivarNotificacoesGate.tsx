import { lazy, Suspense, useEffect, useState } from 'react';
import { devePerguntarNovamente } from '@/lib/pushPermission';
import { useAuth } from '@/hooks/useAuth';

const NotificacoesPermissaoStep = lazy(
  () => import('@/components/onboarding/NotificacoesPermissaoStep'),
);

/**
 * Reoferece a ativação de notificações para quem recusou (ou nunca viu) o
 * pedido no cadastro. Aparece no máximo 3 vezes, com alguns dias de intervalo,
 * e só depois que o app já carregou — nunca atrapalha o primeiro uso.
 */
export default function AtivarNotificacoesGate() {
  const { user } = useAuth();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    const t = window.setTimeout(async () => {
      const deve = await devePerguntarNovamente();
      if (!cancel && deve) setMostrar(true);
    }, 12_000);
    return () => { cancel = true; window.clearTimeout(t); };
  }, [user]);

  if (!mostrar) return null;

  return (
    <Suspense fallback={null}>
      <NotificacoesPermissaoStep onDone={() => setMostrar(false)} />
    </Suspense>
  );
}
