import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MessageCircle, Loader2, CheckCircle2, Trash2 } from 'lucide-react';

type LinkRow = {
  phone_e164: string;
  verified_at: string | null;
  opt_in_leis: boolean;
  opt_in_blog: boolean;
  opt_in_lembretes: boolean;
};

export default function HorusWhatsApp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState<LinkRow | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }
    const { data } = await supabase.from('horus_whatsapp_users')
      .select('phone_e164,verified_at,opt_in_leis,opt_in_blog,opt_in_lembretes')
      .eq('user_id', user.id).maybeSingle();
    setLinked(data as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function sendCode() {
    if (!phone.trim()) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke('horus-verify', {
      body: { action: 'start', phone },
    });
    setSending(false);
    if (error || data?.error) return toast.error(data?.error || 'Erro ao enviar código');
    toast.success('Código enviado no WhatsApp');
    setStep('code');
  }

  async function confirmCode() {
    setSending(true);
    const { data, error } = await supabase.functions.invoke('horus-verify', {
      body: { action: 'confirm', phone, code },
    });
    setSending(false);
    if (error || data?.error) return toast.error(data?.error || 'Código incorreto');
    toast.success('WhatsApp vinculado!');
    setStep('phone'); setPhone(''); setCode('');
    load();
  }

  async function updatePref(key: string, value: boolean) {
    setLinked((l) => l ? { ...l, [key]: value } : l);
    await supabase.functions.invoke('horus-verify', {
      body: { action: 'update_prefs', [key]: value },
    });
  }

  async function unlink() {
    if (!confirm('Desvincular seu WhatsApp do Horus?')) return;
    await supabase.functions.invoke('horus-verify', { body: { action: 'unlink' } });
    setLinked(null);
    toast.success('Desvinculado');
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader
        title={
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-green-500" />
            Horus no WhatsApp
          </span>
        }
        onBack={() => navigate('/configuracoes')}
      />

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            Vincule seu WhatsApp para receber alertas de novas leis, tirar dúvidas com o Horus,
            consultar artigos, criar lembretes e enviar PDFs/imagens — tudo direto no WhatsApp.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : linked?.verified_at ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-green-500/40 bg-green-500/5 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm">Conectado</p>
                <p className="font-body text-xs text-muted-foreground">{linked.phone_e164}</p>
              </div>
              <button onClick={unlink} className="p-2 text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
              <h3 className="font-display text-sm">O que receber</h3>
              {[
                { key: 'opt_in_leis', label: 'Novas leis (Radar 360)', desc: 'Assim que uma lei é publicada' },
                { key: 'opt_in_blog', label: 'Novos artigos do blog', desc: 'Resumos e novidades' },
                { key: 'opt_in_lembretes', label: 'Lembretes de estudo', desc: 'Notificações agendadas' },
              ].map((it) => (
                <div key={it.key} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm">{it.label}</p>
                    <p className="font-body text-xs text-muted-foreground">{it.desc}</p>
                  </div>
                  <Switch
                    checked={(linked as any)[it.key]}
                    onCheckedChange={(v) => updatePref(it.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : step === 'phone' ? (
          <div className="space-y-3">
            <label className="font-body text-sm">Seu número de WhatsApp</label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />
            <Button className="w-full" onClick={sendCode} disabled={sending || !phone.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar código no WhatsApp
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-body text-sm text-muted-foreground">
              Enviei um código de 6 dígitos para <b>{phone}</b>. Digite abaixo:
            </p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
            <Button className="w-full" onClick={confirmCode} disabled={sending || code.length !== 6}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('phone')}>
              Usar outro número
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}