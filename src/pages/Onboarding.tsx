import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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

  // Se já concluiu a triagem anteriormente, libera imediatamente
  useEffect(() => {
    if (user) {
      try {
        const isDone = localStorage.getItem(`onboarding_completed:${user.id}`) === '1';
        const justSignedUp = window.sessionStorage.getItem('just_signed_up') === '1';
        if (isDone && !justSignedUp) {
          navigate('/', { replace: true });
        }
      } catch {}
    }
  }, [user, navigate]);

  const finalizar = async (r: CadastroResult) => {
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    setSaving(true);

    // Marca imediatamente no cache local e emite evento para destravar o app
    try {
      localStorage.setItem(`onboarding_completed:${user.id}`, '1');
      localStorage.setItem(`triagem_concluida:${user.id}`, '1');
      localStorage.removeItem('pending_triagem_respostas');
    } catch {}
    try { window.sessionStorage.removeItem('just_signed_up'); } catch {}
    window.dispatchEvent(new CustomEvent('onboarding_completed'));

    try {
      const payload: Record<string, any> = {
        status_perfil: r.persona || 'concurseiro',
        categoria_perfil: r.categoria || r.persona || null,
        genero_perfil: r.genero || 'unissex',
        faixa_etaria: r.faixa || null,
        display_name: r.nome || null,
        areas_interesse: r.areas || [],
        interesses: r.dorId ? [r.dorId] : (r.interesses || []),
        whatsapp_number: r.whatsapp || null,
        desktop_onboarding_done_at: new Date().toISOString(),
        onboarding_completed_at: new Date().toISOString(),
      };

      // Salva no Supabase com timeout de segurança de 3.5s para nunca travar a tela
      const savePromise = (async () => {
        try {
          // 1. Atualiza profiles
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

          // 2. Salva na tabela triagem_respostas para histórico e relatórios
          await supabase.from('triagem_respostas' as any).insert({
            user_id: user.id,
            nome: r.nome || null,
            categoria: r.categoria || r.persona || 'faculdade',
            genero: r.genero || 'unissex',
            persona_label: r.personaLabel || null,
            faixa_etaria: r.faixa || null,
            dor_id: r.dorId || null,
            dor_label: r.dorLabel || null,
            dor_solucao: r.dorSolucao || null,
            interesses: r.interesses || (r.dorId ? [r.dorId] : []),
            areas_interesse: r.areas || [],
          });
        } catch (e) {
          console.warn('Erro ao salvar perfil/triagem no Supabase:', e);
        }
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
      await Promise.race([savePromise, timeoutPromise]);

      setPedirNotificacoes(true);
    } catch (err: any) {
      console.warn('Aviso no salvamento da triagem:', err);
      setPedirNotificacoes(true);
    } finally {
      setSaving(false);
    }
  };

  const concluirNotificacoes = (_granted: boolean) => {
    setPedirNotificacoes(false);
    
    if (user) {
      try { localStorage.setItem(`onboarding_completed:${user.id}`, '1'); } catch {}
      try { window.sessionStorage.removeItem('just_signed_up'); } catch {}
    }
    window.dispatchEvent(new CustomEvent('onboarding_completed'));

    // Mostra o prompt nativo de avaliação após finalizar a triagem
    import('@/lib/inAppReview').then(({ requestReviewNow }) => {
      setTimeout(() => requestReviewNow(), 1500);
    });

    navigate('/', { replace: true });
  };

  return (
    <main className="min-h-dvh bg-[#101014]">
      {!pedirNotificacoes && !saving && <CadastroOnboardingOverlay open onFinished={finalizar} />}
      {saving && (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-[#101014] gap-3 text-white px-4">
          <Loader2 className="w-9 h-9 animate-spin text-primary" />
          <p className="text-sm font-medium text-zinc-300">Personalizando seu Vacatio…</p>
        </div>
      )}
      {pedirNotificacoes && <NotificacoesPermissaoStep onDone={concluirNotificacoes} />}
    </main>
  );
};

export default Onboarding;
