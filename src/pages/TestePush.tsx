import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BellRing, Loader2, Send, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isNativePushAvailable, registerNativePushToken } from '@/lib/nativePush';

const TestePush = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('Vacatio');
  const [body, setBody] = useState('Notificação de teste enviada com sucesso! 🚀');
  const [tokens, setTokens] = useState<{ token: string; platform: string; updated_at: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [registering, setRegistering] = useState(false);
  const nativeApp = isNativePushAvailable();

  const refreshTokens = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return []; }
    const { data, error } = await supabase
      .from('device_tokens')
      .select('token, platform, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) {
      toast.error(`Erro ao buscar tokens: ${error.message}`);
      setLoading(false);
      return [];
    }
    const list = data ?? [];
    setTokens(list);
    setLoading(false);
    return list;
  }, []);

  useEffect(() => { refreshTokens(); }, [refreshTokens]);

  const registerDevice = async () => {
    setRegistering(true);
    try {
      const result = await registerNativePushToken();
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      const list = await refreshTokens();

      if (list.length > 0 || result.ok) {
        toast.success('Device registrado para push.');
      } else if (result.reason === 'not_native_app') {
        toast.info('Abra esta tela dentro do app instalado no celular.');
      } else if (result.reason === 'permission_not_granted') {
        toast.error('Permissão de notificação não foi liberada no celular.');
      } else {
        toast.error(`Token ainda não registrado: ${result.reason ?? 'verifique o Firebase no build'}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao registrar device');
    } finally {
      setRegistering(false);
    }
  };

  const send = async () => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Você precisa estar logado'); return; }
      const currentTokens = await refreshTokens();
      if (currentTokens.length === 0) {
        toast.error('Nenhum device token encontrado. Abra o app no celular primeiro.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { user_ids: [user.id], title, body },
      });
      if (error) throw error;
      toast.success(`Enviado! ${JSON.stringify(data)}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-10">

        <PageHeader
          title="Notificação Push"
          onBack={() => navigate(-1)}
          leading={
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-primary" />
            </div>
          }
        />
      </div>


      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center text-orange-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-body text-sm font-semibold text-foreground">Enviar para meu device</h2>
              <p className="text-[11px] text-muted-foreground">Testa a edge function send-push com seu user_id</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Mensagem</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
        </div>

        <button onClick={send} disabled={sending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm disabled:opacity-50">
          <Send className="w-4 h-4" />
          {sending ? 'Enviando…' : 'Enviar notificação de teste'}
        </button>

        <button onClick={registerDevice} disabled={registering || !nativeApp}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground font-semibold text-sm disabled:opacity-50">
          {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
          {nativeApp ? (registering ? 'Registrando este celular…' : 'Registrar este celular para push') : 'Abra no app instalado para registrar'}
        </button>

        <div className="pt-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">Seus devices registrados</h3>
          {loading ? (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          ) : tokens.length === 0 ? (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground">
              Nenhum token. Abra o app compilado no celular (Android/iOS) para que ele registre automaticamente.
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((t) => (
                <div key={t.token} className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground uppercase">{t.platform}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(t.updated_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono break-all">{t.token.slice(0, 40)}…</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestePush;