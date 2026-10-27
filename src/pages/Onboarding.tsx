import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CadastroOnboardingOverlay, {
  type CadastroResult,
} from '@/components/onboarding/CadastroOnboardingOverlay';
import NotificacoesPermissaoStep from '@/components/onboarding/NotificacoesPermissaoStep';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [pedirNotificacoes, setPedirNotificacoes] = useState(false);

  const finalizar = async (r: CadastroResult) => {
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        status_perfil: r.persona || 'concurseiro',
        faixa_etaria: r.faixa || null,
        display_name: r.nome || null,
        areas_interesse: r.areas || [],
        interesses: r.dorId ? [r.dorId] : (r.interesses || []),
        whatsapp_number: r.whatsapp || null,
        desktop_onboarding_done_at: new Date().toISOString(),
      };

      // Atualiza o perfil no Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload as any)
        .eq('id', user.id);

      if (updateError) {
        console.warn('Tentando upsert após erro no update:', updateError);
        await supabase
          .from('profiles')
          .upsert({ id: user.id, ...payload } as any);
      }

      // Libera o app imediatamente: marca a triagem como concluída no cache
      // lido pelo ProtectedRoute, evitando o redirect de volta pra /onboarding.
      try { localStorage.setItem(`onboarding_completed:${user.id}`, '1'); } catch {}
      try { window.sessionStorage.removeItem('just_signed_up'); } catch {}

      // Passo contextualizado de permissão de notificações (nativo e PWA)
      setPedirNotificacoes(true);
    } catch (err: any) {
      console.warn('Aviso no salvamento remoto da triagem:', err);
      // Garante que o usuário nunca fique travado caso haja instabilidade de conexão
      try { localStorage.setItem(`onboarding_completed:${user.id}`, '1'); } catch {}
      try { window.sessionStorage.removeItem('just_signed_up'); } catch {}
      setPedirNotificacoes(true);
    } finally {
      setSaving(false);
    }
  };

  const concluirNotificacoes = (granted: boolean) => {
    setPedirNotificacoes(false);
    toast.success(granted ? 'Notificações ativadas. Bora estudar!' : 'Bora estudar!');
    
    // Mostra o prompt nativo de avaliação após finalizar a triagem
    import('@/lib/inAppReview').then(({ requestReviewNow }) => {
      setTimeout(() => requestReviewNow(), 1500);
    });

    navigate('/', { replace: true });
  };

  return (
    <main className="min-h-dvh bg-black">
      {!pedirNotificacoes && !saving && <CadastroOnboardingOverlay open onFinished={finalizar} />}
      {pedirNotificacoes && <NotificacoesPermissaoStep onDone={concluirNotificacoes} />}
    </main>
  );
};

export default Onboarding;

