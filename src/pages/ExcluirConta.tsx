import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const CONFIRMATION_WORD = 'EXCLUIR';

const ExcluirConta = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const canDelete = confirm.trim().toUpperCase() === CONFIRMATION_WORD;

  const doDelete = async () => {
    if (!canDelete || !user) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('excluir-conta', {
        body: { user_id: user.id },
      });
      if (error) throw error;
      toast.success('Sua conta foi excluída. Sentiremos sua falta.');
      await signOut();
      navigate('/auth', { replace: true });
    } catch (e: any) {
      console.error('Erro ao excluir conta', e);
      toast.error('Não consegui excluir agora. Tente de novo em alguns minutos.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Excluir minha conta" />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="rounded-2xl bg-destructive/10 border border-destructive/40 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-body font-bold text-sm text-destructive">Esta ação é permanente</p>
              <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed">
                Você vai perder <strong>todas</strong> as suas anotações, grifos, favoritos,
                histórico de estudo e assinatura (se tiver). Isso não pode ser desfeito.
              </p>
            </div>
          </div>
        </div>

        {step === 1 ? (
          <>
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="font-body font-bold text-sm text-foreground mb-2">O que será excluído:</p>
              <ul className="text-xs font-body text-muted-foreground space-y-1.5 ml-1">
                <li>• Seu perfil e foto</li>
                <li>• Anotações e comentários em artigos</li>
                <li>• Grifos e favoritos</li>
                <li>• Histórico de estudo e progresso</li>
                <li>• Áudios de anotações e ebooks importados</li>
                <li>• Assinatura (cancelamento na próxima cobrança)</li>
              </ul>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-body font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Sim, quero excluir minha conta
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 rounded-xl bg-secondary text-foreground font-body font-medium text-sm hover:bg-secondary/70 transition-colors"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="font-body text-sm text-foreground mb-3">
                Digite <span className="font-mono font-bold text-destructive">{CONFIRMATION_WORD}</span> abaixo para confirmar:
              </p>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Digite aqui"
                autoCapitalize="characters"
                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground font-mono focus:outline-none focus:border-destructive"
              />
            </div>

            <button
              onClick={doDelete}
              disabled={!canDelete || busy}
              className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-body font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir permanentemente'}
            </button>

            <button
              onClick={() => setStep(1)}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-secondary text-foreground font-body font-medium text-sm hover:bg-secondary/70 transition-colors disabled:opacity-50"
            >
              Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ExcluirConta;
