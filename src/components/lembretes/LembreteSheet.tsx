import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Bell, Smartphone, MessageCircle, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWebPush } from '@/hooks/useWebPush';
import { scheduleLocalReminder, cancelLocalReminder } from '@/lib/localReminder';
import { pickMensagem, ESTILOS, type EstiloMsg } from '@/lib/lembreteMessages';
import { Capacitor } from '@capacitor/core';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface LembreteSheetProps {
  open: boolean;
  onClose: () => void;
  reminderId?: string | null;
  livroId?: string;
  livroArea?: string;
  livroTitulo?: string;
  livroCapa?: string;
}

const DIAS = [
  { id: 0, label: 'D' },
  { id: 1, label: 'S' },
  { id: 2, label: 'T' },
  { id: 3, label: 'Q' },
  { id: 4, label: 'Q' },
  { id: 5, label: 'S' },
  { id: 6, label: 'S' },
];

type Preset = 'daily' | 'weekdays' | 'weekends' | 'custom';
const PRESET_DAYS: Record<Exclude<Preset, 'custom'>, number[]> = {
  daily: [0, 1, 2, 3, 4, 5, 6],
  weekdays: [1, 2, 3, 4, 5],
  weekends: [0, 6],
};

const LembreteSheet = ({ open, onClose, reminderId, livroId, livroArea, livroTitulo, livroCapa }: LembreteSheetProps) => {
  useEscapeKey(open, onClose);
  const { user } = useAuth();
  const webpush = useWebPush();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(reminderId || null);
  const [hora, setHora] = useState('20:00');
  const [preset, setPreset] = useState<Preset>('daily');
  const [dias, setDias] = useState<number[]>(PRESET_DAYS.daily);
  const [canais, setCanais] = useState<string[]>(['push']);
  const [estilo, setEstilo] = useState<EstiloMsg>('padrao');
  const [horusReady, setHorusReady] = useState<boolean | null>(null);

  useEffect(() => { setId(reminderId || null); }, [reminderId]);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: h } = await supabase
        .from('horus_whatsapp_users')
        .select('verified_at')
        .eq('user_id', user.id)
        .maybeSingle();
      setHorusReady(!!h?.verified_at);

      if (id) {
        setLoading(true);
        const { data } = await supabase.from('reading_reminders').select('*').eq('id', id).maybeSingle();
        if (data) {
          setHora((data.time_of_day as string).slice(0, 5));
          setPreset(data.preset as Preset);
          setDias(data.days_of_week as number[]);
          setCanais(data.channels as string[]);
          setEstilo((data.message_style as EstiloMsg) || 'padrao');
        }
        setLoading(false);
      }
    })();
  }, [open, user, id]);

  const previewMsg = useMemo(
    () => pickMensagem(estilo, {
      nome: (user?.user_metadata as any)?.display_name || (user?.email?.split('@')[0] ?? 'você'),
      livro: livroTitulo || 'seu livro',
      pag: '—',
    }),
    [estilo, user, livroTitulo]
  );

  const setPresetSafe = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setDias(PRESET_DAYS[p]);
  };

  const toggleCanal = async (c: string) => {
    if (canais.includes(c)) {
      setCanais(canais.filter(x => x !== c));
      return;
    }
    if (c === 'push') {
      const ok = await webpush.subscribe();
      if (!ok) {
        toast.error('Não consegui ativar notificações do navegador');
        return;
      }
    }
    if (c === 'horus_whatsapp' && !horusReady) {
      toast.info('Vincule seu WhatsApp ao Horus primeiro em Assistente Horus');
      return;
    }
    setCanais([...canais, c]);
  };

  const salvar = async () => {
    if (!user) return;
    if (dias.length === 0) { toast.error('Escolha ao menos 1 dia'); return; }
    if (canais.length === 0) { toast.error('Escolha ao menos 1 canal'); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        livro_id: livroId || null,
        livro_area: livroArea || null,
        livro_titulo: livroTitulo || null,
        livro_capa: livroCapa || null,
        title: livroTitulo ? `Ler ${livroTitulo}` : 'Rotina de leitura',
        time_of_day: `${hora}:00`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
        preset,
        days_of_week: dias,
        channels: canais,
        message_style: estilo,
        enabled: true,
        next_fire_at: null,
      };

      let savedId = id;
      if (id) {
        const { error } = await supabase.from('reading_reminders').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('reading_reminders').insert(payload).select('id').single();
        if (error) throw error;
        savedId = data.id;
        setId(data.id);
      }

      // Local (Capacitor)
      if (savedId && canais.includes('local')) {
        await scheduleLocalReminder({
          reminderId: savedId,
          title: previewMsg.title,
          body: previewMsg.body,
          timeHHMM: hora,
          daysOfWeek: dias,
        });
      } else if (savedId) {
        await cancelLocalReminder(savedId);
      }

      toast.success('Lembrete salvo!');
      onClose();
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const excluir = async () => {
    if (!id) return;
    if (!confirm('Apagar este lembrete?')) return;
    await cancelLocalReminder(id);
    await supabase.from('reading_reminders').delete().eq('id', id);
    toast.success('Lembrete removido');
    onClose();
  };

  const sheet = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1400] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[1401] h-[90dvh] bg-card border-t border-border rounded-t-3xl flex flex-col overflow-hidden"
          >
            <div className="pt-2 pb-1 flex justify-center">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
            <button onClick={onClose} className="absolute top-3 right-4 w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2 space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  {livroTitulo ? `Lembrete • ${livroTitulo}` : 'Rotina de leitura'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Defina um horário e mantenha o foco nas suas metas.
                </p>
              </div>

              {loading ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  {/* Horário */}
                  <div className="rounded-2xl bg-secondary/40 border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="font-body font-bold text-sm">Horário</p>
                    </div>
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border font-mono text-2xl text-center"
                    />
                  </div>

                  {/* Presets */}
                  <div className="rounded-2xl bg-secondary/40 border border-border p-4">
                    <p className="font-body font-bold text-sm mb-3">Repetir</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { id: 'daily', label: 'Todos os dias' },
                        { id: 'weekdays', label: 'Dias da semana' },
                        { id: 'weekends', label: 'Fins de semana' },
                        { id: 'custom', label: 'Personalizado' },
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setPresetSafe(p.id as Preset)}
                          className={`px-3 py-2 rounded-xl text-sm font-body transition ${
                            preset === p.id ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-foreground'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5 justify-between">
                      {DIAS.map(d => {
                        const active = dias.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            onClick={() => {
                              setPreset('custom');
                              setDias(active ? dias.filter(x => x !== d.id) : [...dias, d.id]);
                            }}
                            className={`flex-1 aspect-square rounded-lg font-body font-bold text-xs transition ${
                              active ? 'bg-primary/80 text-primary-foreground' : 'bg-background border border-border text-muted-foreground'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Canais */}
                  <div className="rounded-2xl bg-secondary/40 border border-border p-4 space-y-2">
                    <p className="font-body font-bold text-sm mb-1">Como te avisamos</p>
                    <CanalRow
                      icon={Bell} label="Notificação do navegador"
                      hint={webpush.supported ? (webpush.permission === 'denied' ? 'Bloqueado nas permissões' : 'Web Push seguro') : 'Não suportado neste dispositivo'}
                      active={canais.includes('push')} disabled={!webpush.supported || webpush.permission === 'denied'}
                      onToggle={() => toggleCanal('push')}
                    />
                    <CanalRow
                      icon={Smartphone} label="Alarme no celular (app)"
                      hint={Capacitor.isNativePlatform() ? 'Notificação local do sistema' : 'Só no app instalado (Android/iOS)'}
                      active={canais.includes('local')} disabled={!Capacitor.isNativePlatform()}
                      onToggle={() => toggleCanal('local')}
                    />
                    <CanalRow
                      icon={MessageCircle} label="WhatsApp via Horus"
                      hint={horusReady ? 'Mensagem no seu número verificado' : 'Vincule seu WhatsApp em Horus primeiro'}
                      active={canais.includes('horus_whatsapp')} disabled={!horusReady}
                      onToggle={() => toggleCanal('horus_whatsapp')}
                    />
                  </div>

                  {/* Estilo */}
                  <div className="rounded-2xl bg-secondary/40 border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="font-body font-bold text-sm">Estilo da mensagem</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {ESTILOS.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setEstilo(s.id)}
                          className={`px-3 py-2.5 rounded-xl text-left transition ${
                            estilo === s.id ? 'bg-primary/15 border border-primary' : 'bg-background border border-border'
                          }`}
                        >
                          <p className="text-sm font-body font-semibold">{s.label}</p>
                          <p className="text-[11px] text-muted-foreground">{s.hint}</p>
                        </button>
                      ))}
                    </div>
                    <div className="rounded-xl bg-background border border-dashed border-border p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Prévia</p>
                      <p className="text-sm font-semibold text-foreground">{previewMsg.title}</p>
                      <p className="text-sm text-foreground/80">{previewMsg.body}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-border bg-card flex gap-2">
              {id && (
                <button onClick={excluir} className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={salvar}
                disabled={saving}
                className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-body font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar lembrete'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(sheet, document.body);
};

function CanalRow({
  icon: Icon, label, hint, active, disabled, onToggle,
}: { icon: any; label: string; hint: string; active: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
        active ? 'bg-primary/10 border border-primary/40' : 'bg-background border border-border'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-body font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div className={`w-10 h-6 rounded-full relative ${active ? 'bg-primary' : 'bg-muted'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

export default LembreteSheet;
