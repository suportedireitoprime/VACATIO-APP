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
      const { error } = await supabase
        .from('profiles')
        .update({
          status_perfil: r.persona,
          faixa_etaria: r.faixa,
          perfil_tipos: r.persona ? [r.persona] : null,
          perfil_contexto: r.personaLabel || '',
          display_name: r.nome || null,
          areas_interesse: r.areas || [],
          interesses: r.interesses || [],
          whatsapp_number: r.whatsapp || null,
          onboarding_completed_at: new Date().toISOString(),
        } as any)
        .eq('id', user.id);
      if (error) throw error;

      // Libera o app imediatamente: marca a triagem como concluída no cache
      // lido pelo ProtectedRoute, evitando o redirect de volta pra /onboarding.
      try { localStorage.setItem(`onboarding_completed:${user.id}`, '1'); } catch {}
      try { window.sessionStorage.removeItem('just_signed_up'); } catch {}

      // Passo contextualizado de permissão de notificações (nativo e PWA)
      setPedirNotificacoes(true);
    } catch (err: any) {
      toast.error(err.message || 'Não consegui salvar seu perfil. Tenta de novo.');
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const concluirNotificacoes = (granted: boolean) => {
    setPedirNotificacoes(false);
    toast.success(granted ? 'Notificações ativadas. Bora estudar!' : 'Bora estudar!');
    navigate('/', { replace: true });
  };

  return (
    <main className="min-h-dvh bg-black">
      <CadastroOnboardingOverlay open onFinished={finalizar} />
      {pedirNotificacoes && <NotificacoesPermissaoStep onDone={concluirNotificacoes} />}
    </main>
  );
};

export default Onboarding;

