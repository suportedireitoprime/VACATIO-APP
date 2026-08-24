import { useState } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';

const Seguranca = () => {
  const [busy, setBusy] = useState(false);

  const doSignOutAll = async () => {
    if (!confirm('Deseja sair de todos os dispositivos onde está logado?')) return;
    setBusy(true);
    await supabase.auth.signOut({ scope: 'global' });
    setBusy(false);
    toast.success('Deslogado de todos os dispositivos');
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        title={
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Segurança
          </span>
        }
      />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body font-bold text-sm text-foreground">Sessões ativas</p>
              <p className="font-body text-xs text-muted-foreground mt-0.5 mb-3">
                Desconecta sua conta de todos os celulares e navegadores.
              </p>
              <button
                onClick={doSignOutAll}
                disabled={busy}
                className="w-full py-2.5 rounded-lg bg-secondary text-foreground font-body font-semibold text-sm hover:bg-secondary/70 transition-colors disabled:opacity-50"
              >
                Sair de todos os dispositivos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Seguranca;
