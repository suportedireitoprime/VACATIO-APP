import { useEffect, useState } from 'react';
import { Bell, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Capacitor } from '@capacitor/core';

const DIAS = [
  { id: 'seg', label: 'S' },
  { id: 'ter', label: 'T' },
  { id: 'qua', label: 'Q' },
  { id: 'qui', label: 'Q' },
  { id: 'sex', label: 'S' },
  { id: 'sab', label: 'S' },
  { id: 'dom', label: 'D' },
];

const MENSAGENS: Record<string, { titulo: string; corpo: string }[]> = {
  geral: [
    { titulo: '📚 Hora do estudo', corpo: 'Que tal 15 minutos de Vade Mecum agora?' },
    { titulo: '⚖️ Bora estudar', corpo: 'Sua rotina de leitura te espera no Vacatio.' },
    { titulo: '💡 Foco jurídico', corpo: 'Um artigo por dia constrói a aprovação.' },
  ],
  oab: [
    { titulo: '📖 Foco na OAB', corpo: 'Revise um artigo da CF agora e fortaleça sua base.' },
    { titulo: '🎯 Reta final', corpo: 'Que tal 5 questões antes de dormir?' },
  ],
  concurso: [
    { titulo: '📝 Concurso à vista', corpo: 'Revisão diária faz a diferença. Vamos?' },
  ],
};

// Mapa dia → weekday do Capacitor LocalNotifications (1=Dom .. 7=Sáb)
const WEEKDAY_MAP: Record<string, number> = {
  dom: 1, seg: 2, ter: 3, qua: 4, qui: 5, sex: 6, sab: 7,
};

const Lembretes = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [dias, setDias] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [horario, setHorario] = useState('20:00');
  const [mensagemTipo, setMensagemTipo] = useState<'geral' | 'oab' | 'concurso'>('geral');
  const [reminderId, setReminderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('user_reminders')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setReminderId(data.id);
        setAtivo(data.ativo);
        setDias(data.dias || []);
        setHorario((data.horario as string).substring(0, 5));
        setMensagemTipo((data.mensagem_tipo as any) || 'geral');
      }
      setLoading(false);
    })();
  }, [user]);

  const toggleDia = (id: string) => {
    setDias((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const agendarNotificacoes = async (config: {
    dias: string[];
    horario: string;
    tipo: string;
    ativo: boolean;
  }): Promise<number[]> => {
    if (!Capacitor.isNativePlatform()) return [];
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      // Cancelar antigas antes de agendar novas
      const pending = await LocalNotifications.getPending();
      const nossas = pending.notifications.filter((n) =>
        String(n.id).startsWith('9999'),
      );
      if (nossas.length > 0) {
        await LocalNotifications.cancel({ notifications: nossas.map((n) => ({ id: n.id })) });
      }

      if (!config.ativo || config.dias.length === 0) return [];

      const [hh, mm] = config.horario.split(':').map(Number);
      const mensagens = MENSAGENS[config.tipo] || MENSAGENS.geral;
      const ids: number[] = [];

      for (const dia of config.dias) {
        const weekday = WEEKDAY_MAP[dia];
        if (!weekday) continue;
        const notifId = Number(`9999${weekday}`);
        const msg = mensagens[Math.floor(Math.random() * mensagens.length)];
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title: msg.titulo,
              body: msg.corpo,
              schedule: {
                on: { weekday, hour: hh, minute: mm },
                allowWhileIdle: true,
                repeats: true,
              },
              iconColor: '#c9a84c',
            },
          ],
        });
        ids.push(notifId);
      }
      return ids;
    } catch (e) {
      console.warn('Falha ao agendar lembretes', e);
      return [];
    }
  };

  const salvar = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const localIds = await agendarNotificacoes({ dias, horario, tipo: mensagemTipo, ativo });

      const payload = {
        user_id: user.id,
        dias,
        horario: `${horario}:00`,
        ativo,
        mensagem_tipo: mensagemTipo,
        local_notification_ids: localIds,
      };

      if (reminderId) {
        const { error } = await supabase
          .from('user_reminders')
          .update(payload)
          .eq('id', reminderId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('user_reminders')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setReminderId(data.id);
      }
      toast.success(ativo ? 'Lembretes agendados!' : 'Lembretes desativados.');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e.message || 'tente de novo'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        title={
          <span className="flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-primary" />
            Lembretes de estudo
          </span>
        }
      />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Ativo */}
        <div className="rounded-2xl bg-card border border-border p-4 flex items-center justify-between">
          <div>
            <p className="font-body font-bold text-sm text-foreground">Ativar lembretes</p>
            <p className="font-body text-xs text-muted-foreground">Notificação recorrente pra te lembrar de estudar.</p>
          </div>
          <button
            onClick={() => setAtivo((v) => !v)}
            className={`relative w-12 h-7 rounded-full transition-colors ${ativo ? 'bg-primary' : 'bg-secondary'}`}
            aria-label="Toggle lembretes"
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                ativo ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Horário */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="font-body font-bold text-sm text-foreground">Horário</p>
          </div>
          <input
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            disabled={!ativo}
            className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground font-mono text-lg disabled:opacity-50"
          />
        </div>

        {/* Dias */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="font-body font-bold text-sm text-foreground mb-3">Dias da semana</p>
          <div className="flex gap-1.5 justify-between">
            {DIAS.map((d) => {
              const active = dias.includes(d.id);
              return (
                <button
                  key={d.id}
                  disabled={!ativo}
                  onClick={() => toggleDia(d.id)}
                  className={`flex-1 aspect-square rounded-lg font-body font-bold text-sm transition-all disabled:opacity-40 ${
                    active
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tipo de mensagem */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="font-body font-bold text-sm text-foreground mb-3">Estilo da mensagem</p>
          <div className="flex flex-col gap-2">
            {(['geral', 'oab', 'concurso'] as const).map((t) => (
              <button
                key={t}
                disabled={!ativo}
                onClick={() => setMensagemTipo(t)}
                className={`px-4 py-2.5 rounded-lg font-body text-sm text-left transition-all disabled:opacity-40 ${
                  mensagemTipo === t
                    ? 'bg-primary/15 border border-primary text-foreground'
                    : 'bg-secondary border border-transparent text-muted-foreground'
                }`}
              >
                {t === 'geral' && 'Geral — motivacional'}
                {t === 'oab' && 'Foco OAB'}
                {t === 'concurso' && 'Foco Concurso'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={salvar}
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-body font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
        </button>

        {!Capacitor.isNativePlatform() && (
          <p className="text-xs text-muted-foreground text-center italic px-4">
            Lembretes locais só funcionam no app instalado (Android/iOS).
          </p>
        )}
      </div>
    </div>
  );
};

export default Lembretes;
