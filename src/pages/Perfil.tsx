import { useEffect, useState } from 'react';
import { Mail, Phone, Calendar, LogIn, Shield } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { PerfilHero } from '@/components/perfil/PerfilHero';
import { PlanoCard } from '@/components/perfil/PlanoCard';
import { AtuacaoCard } from '@/components/perfil/AtuacaoCard';
import { InfoRow } from '@/components/perfil/InfoRow';
import { ExcluirContaButton } from '@/components/perfil/ExcluirContaButton';

const planoLabel = (plano: string | null, source: 'play' | 'apple' | 'asaas' | null) => {
  if (!plano) return { titulo: 'Gratuito', desc: 'Acesso limitado — 3 usos/mês em recursos premium.', tag: 'FREE' };
  const p = plano.toLowerCase();
  const via = source === 'play' ? 'Google Play' : source === 'apple' ? 'App Store' : 'Asaas';
  if (p.includes('anual') || p.includes('year')) return { titulo: 'Premium Anual', desc: `Renovação anual via ${via}.`, tag: 'ANUAL' };
  if (p.includes('mensal') || p.includes('month')) return { titulo: 'Premium Mensal', desc: `Renovação mensal via ${via}.`, tag: 'MENSAL' };
  return { titulo: 'Premium', desc: `Ativa via ${via}.`, tag: 'PRO' };
};

const providerName: Record<string, string> = {
  google: 'Conta Google', apple: 'Conta Apple', email: 'E-mail e senha',
};

const Perfil = () => {
  const { user } = useAuth();
  const sub = useSubscription();

  const [profile, setProfile] = useState<{ perfil_tipos?: string[]; perfil_contexto?: string | null } | null>(null);
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('perfil_tipos, perfil_contexto')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(data as any);
    })();
  }, [user]);

  if (!user) return null;

  const email = user.email || '';
  const phone = user.phone || (user.user_metadata?.phone as string | undefined) || '';
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined);
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—';
  const lastSignIn = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
  const provider = (user.app_metadata?.provider as string | undefined) || 'email';
  const emailConfirmed = !!user.email_confirmed_at;

  const perfilTiposSel: string[] = profile?.perfil_tipos ?? [];
  const plano = planoLabel(sub.plano, sub.source);
  const expira = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('pt-BR') : null;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <AppHeader title="Meu Perfil" />

      <div className="px-4 pt-2 pb-4 space-y-5 max-w-lg mx-auto">
        <PerfilHero
          userId={user.id}
          displayName={displayName}
          avatarUrl={avatarUrl}
          isPremium={sub.isPremium}
          provider={provider}
          emailConfirmed={emailConfirmed}
          contexto={profile?.perfil_contexto}
          onNameChange={setDisplayName}
        />

        <PlanoCard
          isPremium={sub.isPremium}
          loading={sub.loading}
          titulo={plano.titulo}
          desc={plano.desc}
          tag={plano.tag}
          expira={expira}
        />

        <AtuacaoCard
          userId={user.id}
          selected={perfilTiposSel}
          onChange={(next, contexto) => setProfile((prev) => ({ ...(prev ?? {}), perfil_tipos: next, perfil_contexto: contexto }))}
        />

        <div className="space-y-2.5">
          <InfoRow icon={Mail} label="E-mail" value={email} badge={emailConfirmed ? 'Verificado' : undefined} />
          {phone && <InfoRow icon={Phone} label="Telefone" value={phone} />}
          <InfoRow icon={Calendar} label="Membro desde" value={createdAt} />
          <InfoRow icon={LogIn} label="Último acesso" value={lastSignIn} />
          <InfoRow icon={Shield} label="Autenticação" value={providerName[provider] ?? 'E-mail e senha'} />
        </div>

        {provider === 'google' && !phone && (
          <p className="text-[11px] text-muted-foreground/80 font-body text-center px-4 leading-relaxed">
            O login do Google compartilha apenas nome, e-mail e foto de perfil. Telefone e outras informações precisam ser preenchidas manualmente.
          </p>
        )}

        <div className="pt-4">
          <ExcluirContaButton />
        </div>
      </div>
    </div>
  );
};

export default Perfil;
