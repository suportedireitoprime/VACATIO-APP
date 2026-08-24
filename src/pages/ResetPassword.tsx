import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasRecoveryHash = hash.get('type') === 'recovery' && !!hash.get('access_token');
    const hasRecoveryCode = !!url.searchParams.get('code');

    if (hasRecoveryHash || hasRecoveryCode) setIsRecovery(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
      setCheckingLink(false);
    });

    const timer = window.setTimeout(() => setCheckingLink(false), 1600);

    return () => {
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success('Senha atualizada com sucesso!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar senha.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingLink) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-6">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-muted-foreground font-body text-sm">Link inválido ou expirado.</p>
          <button onClick={() => navigate('/auth')} className="mt-4 text-primary font-body text-sm hover:underline">
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 shadow-lg">
          <Scale className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground">Nova Senha</h1>
      </motion.div>

      {success ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="font-body text-sm text-foreground">Senha atualizada! Redirecionando...</p>
        </motion.div>
      ) : (
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nova senha (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-12 py-3 bg-secondary/50 border border-border rounded-xl text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-body font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar Senha'}
          </button>
        </motion.form>
      )}
    </div>
  );
};

export default ResetPassword;
