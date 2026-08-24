import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Monitor, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SUPABASE_URL = 'https://iftdrbxvekrhzstayjwp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40';

type Phase = 'idle' | 'checking' | 'ready' | 'confirming' | 'done' | 'error' | 'expired' | 'auth_required';

const DesktopLinkConfirm = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [phase, setPhase] = useState<Phase>('checking');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPhase('auth_required');
      return;
    }
    // Verifica se o token ainda está pendente antes de mostrar o botão.
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/desktop-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'poll', token }),
        });
        const j = await res.json();
        if (j?.status === 'pending') setPhase('ready');
        else if (j?.status === 'expired' || j?.status === 'not_found') setPhase('expired');
        else setPhase('error');
      } catch {
        setPhase('error');
      }
    })();
  }, [token, user, authLoading]);

  const confirm = async () => {
    setPhase('confirming');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token;
      if (!accessToken) {
        setPhase('auth_required');
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/desktop-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'claim', token }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErrorMsg(j?.error || 'falha');
        setPhase(j?.error === 'token_expired' ? 'expired' : 'error');
        return;
      }
      setPhase('done');
    } catch (e) {
      setErrorMsg(String(e));
      setPhase('error');
    }
  };

  return (
    <main className="min-h-dvh bg-[#0e0e0c] text-white flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-2">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-lg font-bold">Login no computador</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center mb-6"
        >
          <Monitor className="w-10 h-10 text-primary" />
        </motion.div>

        {phase === 'checking' && (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="mt-3 font-body text-sm text-white/70">Verificando código…</p>
          </>
        )}

        {phase === 'auth_required' && (
          <>
            <h2 className="font-display text-2xl font-black">Entre na sua conta</h2>
            <p className="mt-3 font-body text-sm text-white/70 max-w-sm">
              Você precisa estar logado no app do celular pra liberar o login no computador.
            </p>
            <button
              onClick={() => navigate(`/auth?next=${encodeURIComponent(`/desktop-link/${token}`)}`)}
              className="mt-6 px-6 py-3.5 rounded-xl bg-primary text-black font-display font-bold text-sm"
            >
              Fazer login
            </button>
          </>
        )}

        {phase === 'ready' && (
          <>
            <h2 className="font-display text-2xl font-black">Liberar login no computador?</h2>
            <p className="mt-3 font-body text-sm text-white/70 max-w-sm">
              Só confirme se você mesmo está tentando entrar agora no
              <span className="text-primary font-semibold"> app Vacatio pra desktop</span>.
              Este código só pode ser usado uma vez.
            </p>
            <button
              onClick={confirm}
              className="mt-8 w-full max-w-xs px-6 py-4 rounded-xl bg-primary text-black font-display font-bold text-base shadow-lg shadow-primary/30"
            >
              Confirmar login
            </button>
            <button
              onClick={() => navigate('/')}
              className="mt-3 text-xs font-body text-white/50 underline"
            >
              Não fui eu, cancelar
            </button>
          </>
        )}

        {phase === 'confirming' && (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="mt-3 font-body text-sm text-white/70">Liberando…</p>
          </>
        )}

        {phase === 'done' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-primary" />
            <h2 className="mt-4 font-display text-2xl font-black">Pronto!</h2>
            <p className="mt-3 font-body text-sm text-white/70 max-w-sm">
              Volte para o computador — o app deve entrar automaticamente em alguns segundos.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-8 px-6 py-3 rounded-xl bg-white/10 border border-white/15 font-body text-sm"
            >
              Fechar
            </button>
          </>
        )}

        {phase === 'expired' && (
          <>
            <AlertTriangle className="w-14 h-14 text-amber-400" />
            <h2 className="mt-4 font-display text-xl font-bold">Código expirado</h2>
            <p className="mt-2 font-body text-sm text-white/60 max-w-sm">
              Gere um novo QR-code no computador e escaneie de novo.
            </p>
          </>
        )}

        {phase === 'error' && (
          <>
            <AlertTriangle className="w-14 h-14 text-red-400" />
            <h2 className="mt-4 font-display text-xl font-bold">Não deu certo</h2>
            <p className="mt-2 font-body text-sm text-white/60 max-w-sm">{errorMsg || 'Tente novamente.'}</p>
          </>
        )}
      </div>
    </main>
  );
};

export default DesktopLinkConfirm;
