import { useEffect, useState, useCallback } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Prefs {
  timezone: string;
  default_time: string;
  push_enabled: boolean;
  horus_enabled: boolean;
  failure_alerts: boolean;
}

interface DispatchRow {
  id: string;
  reminder_type: string;
  canal: string;
  status: string;
  error: string | null;
  retry_attempt: number;
  livro_titulo: string | null;
  article_titulo: string | null;
  created_at: string;
}

const DEFAULT_PREFS: Prefs = {
  timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'America/Sao_Paulo',
  default_time: '09:00',
  push_enabled: true,
  horus_enabled: false,
  failure_alerts: true,
};

export default function PreferenciasLembretes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [history, setHistory] = useState<DispatchRow[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [pRes, hRes] = await Promise.all([
      supabase.from('user_reminder_preferences' as any).select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('reminder_dispatch_log' as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);
    const p: any = (pRes as any)?.data;
    if (p) setPrefs({
      timezone: p.timezone,
      default_time: p.default_time,
      push_enabled: p.push_enabled,
      horus_enabled: p.horus_enabled,
      failure_alerts: p.failure_alerts,
    });
    setHistory(((hRes as any)?.data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('user_reminder_preferences' as any).upsert({
      user_id: user.id,
      ...prefs,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Preferências salvas.');
  };

  const statusIcon = (s: string) => {
    if (s === 'sent') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (s === 'error') return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  const typeLabel = (t: string) => t === 'reading' ? 'Leitura'
    : t === 'article_time' ? 'Artigo · horário'
    : t === 'location' ? 'Artigo · local' : t;

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Preferências de lembretes" />
      <div className="mx-auto max-w-2xl p-4 pb-24 space-y-8">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
              <h2 className="font-heading text-lg font-semibold">Sua conta</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fuso horário</Label>
                  <Input
                    value={prefs.timezone}
                    onChange={(e) => setPrefs(p => ({ ...p, timezone: e.target.value }))}
                    placeholder="America/Sao_Paulo"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Detectado: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </p>
                </div>
                <div>
                  <Label>Horário padrão</Label>
                  <Input
                    type="time"
                    value={prefs.default_time}
                    onChange={(e) => setPrefs(p => ({ ...p, default_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push (celular)</p>
                    <p className="text-xs text-muted-foreground">Notificações no aparelho.</p>
                  </div>
                  <Switch checked={prefs.push_enabled} onCheckedChange={(v) => setPrefs(p => ({ ...p, push_enabled: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">WhatsApp (Horus)</p>
                    <p className="text-xs text-muted-foreground">Requer número verificado no Horus.</p>
                  </div>
                  <Switch checked={prefs.horus_enabled} onCheckedChange={(v) => setPrefs(p => ({ ...p, horus_enabled: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Avisar quando um envio falhar</p>
                    <p className="text-xs text-muted-foreground">Cria um aviso no app se push/WhatsApp não sair mesmo após novas tentativas.</p>
                  </div>
                  <Switch checked={prefs.failure_alerts} onCheckedChange={(v) => setPrefs(p => ({ ...p, failure_alerts: v }))} />
                </div>
              </div>

              <Button className="w-full" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar preferências
              </Button>
            </section>

            <section className="space-y-3">
              <h2 className="font-heading text-lg font-semibold">Histórico de disparos</h2>
              <p className="text-xs text-muted-foreground">Últimos 50 envios de qualquer lembrete seu.</p>
              {history.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
                  <Clock className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Nenhum disparo registrado ainda.
                </div>
              ) : (
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-xl border border-border bg-card p-3 text-sm">
                      <div className="flex items-start gap-2">
                        {statusIcon(h.status)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {h.article_titulo || h.livro_titulo || 'Lembrete'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {typeLabel(h.reminder_type)} · {h.canal} · {new Date(h.created_at).toLocaleString('pt-BR')}
                            {h.retry_attempt > 0 && ` · retry ${h.retry_attempt}`}
                          </p>
                          {h.status !== 'sent' && h.error && (
                            <p className="mt-1 text-xs text-destructive/90">{h.error}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
