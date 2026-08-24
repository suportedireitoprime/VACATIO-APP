import { useNavigate } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import MinhaAssinaturaView from '@/components/planos/MinhaAssinaturaView';
import { PageHeader } from '@/components/vademecum/PageHeader';

const PlanosAtivos = () => {
  const navigate = useNavigate();
  const { isPremium, loading, plano, expiresAt, startedAt, source, isAdminOverride } = useSubscription();

  if (!loading && !isPremium) {
    return <Navigate to="/assinatura" replace />;
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="ASSINATURA"
            subtitle="Gerencie seu plano Vacatio Premium"
            onBack={() => navigate(-1)}
          />
        </div>
      </header>


      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-8">
        {loading ? (
          <div className="h-40 rounded-2xl bg-card/50 border border-border/60 animate-pulse" />
        ) : (
          <MinhaAssinaturaView plano={plano} expiresAt={expiresAt} startedAt={startedAt} source={source} status={status} isAdminOverride={isAdminOverride} />
        )}

        <section className="space-y-3">
          <h3 className="font-display text-lg font-bold text-foreground text-center" style={{ letterSpacing: '0.03em' }}>
            Dúvidas frequentes
          </h3>
          {[
            { q: 'Como cancelo minha assinatura?', a: 'No botão "Gerenciar assinatura" você acessa sua assinatura ativa e pode cancelar a qualquer momento. Você mantém acesso Premium até o fim do período pago.' },
            { q: 'Vou perder minhas anotações se cancelar?', a: 'Não. Anotações, grifos e histórico ficam salvos permanentemente na sua conta.' },
            { q: 'Quando a próxima cobrança acontece?', a: 'Na data de renovação exibida acima. Você pode verificar e alterar o método de pagamento diretamente na loja onde assinou.' },
          ].map((f, i) => (
            <details key={i} className="group rounded-2xl bg-card/50 border border-border/60 p-4 open:border-primary/40 transition-colors">
              <summary className="cursor-pointer font-body text-sm font-semibold text-foreground list-none flex items-center justify-between">
                {f.q}
                <span className="text-primary group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="font-body text-sm text-muted-foreground mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </section>

        <section className="text-center py-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span className="font-body text-xs">Sua assinatura é gerenciada com segurança pela {source === 'apple' ? 'App Store' : 'Google Play'}</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PlanosAtivos;