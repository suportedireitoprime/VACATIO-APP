import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Bell, Smartphone, MessageCircle, Sparkles, Loader2, Trash2, ChevronLeft, Calendar, Edit3, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { scheduleLocalReminder, cancelLocalReminder } from '@/lib/localReminder';
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(reminderId || null);
  const [hora, setHora] = useState('20:00');
  const [preset, setPreset] = useState<Preset>('daily');
  const [dias, setDias] = useState<number[]>(PRESET_DAYS.daily);
  const [customMessage, setCustomMessage] = useState(livroTitulo ? `Ler ${livroTitulo}` : 'Rotina de leitura');
  const [view, setView] = useState<'main' | 'horario' | 'repetir' | 'mensagem'>('main');

  useEffect(() => { 
    setId(reminderId || null); 
    if (open) setView('main');
  }, [reminderId, open]);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      if (id) {
        setLoading(true);
        const { data } = await supabase.from('reading_reminders').select('*').eq('id', id).maybeSingle();
        if (data) {
          setHora((data.time_of_day as string).slice(0, 5));
          setPreset(data.preset as Preset);
          setDias(data.days_of_week as number[]);
          setCustomMessage(data.title || '');
        }
        setLoading(false);
      }
    })();
  }, [open, user, id]);

  const setPresetSafe = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setDias(PRESET_DAYS[p]);
  };



  const salvar = async () => {
    if (!user) return;
    if (dias.length === 0) { toast.error('Escolha ao menos 1 dia'); return; }
    if (!customMessage.trim()) { toast.error('A mensagem não pode estar vazia'); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        livro_id: livroId || null,
        livro_area: livroArea || null,
        livro_titulo: livroTitulo || null,
        livro_capa: livroCapa || null,
        title: customMessage,
        time_of_day: `${hora}:00`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
        preset,
        days_of_week: dias,
        channels: Capacitor.isNativePlatform() ? ['local'] : ['push'],
        message_style: 'padrao',
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

      if (savedId && Capacitor.isNativePlatform()) {
        await scheduleLocalReminder({
          reminderId: savedId,
          title: 'Lembrete do Vacatio',
          body: customMessage,
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

            <AnimatePresence mode="wait">
              {view === 'main' && (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2 space-y-5">
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        {id ? 'Editar Lembrete' : 'Novo Lembrete'}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Configure as opções do seu lembrete.
                      </p>
                    </div>

                    {loading ? (
                      <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                    ) : (
                      <>
                        <div className="rounded-2xl bg-secondary/40 border border-border overflow-hidden">
                          <ListButton icon={Clock} label="Horário" value={hora} onClick={() => setView('horario')} />
                          <div className="h-[1px] bg-border mx-4" />
                          <ListButton 
                            icon={Calendar} 
                            label="Repetir" 
                            value={
                              preset === 'daily' ? 'Todos os dias' : 
                              preset === 'weekdays' ? 'Dias da semana' : 
                              preset === 'weekends' ? 'Fins de semana' : 
                              'Personalizado'
                            } 
                            onClick={() => setView('repetir')} 
                          />
                          <div className="h-[1px] bg-border mx-4" />
                          <ListButton icon={Edit3} label="Mensagem" value={customMessage} onClick={() => setView('mensagem')} />
                        </div>

                        <div className="rounded-2xl bg-secondary/40 border border-border p-4 flex items-center justify-between opacity-70">
                          <div className="flex items-center gap-3">
                            <Smartphone className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">Alarme no celular</p>
                              <p className="text-[11px] text-muted-foreground">Notificação padrão ativada</p>
                            </div>
                          </div>
                          <div className="w-10 h-6 rounded-full bg-primary relative pointer-events-none">
                            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white translate-x-4" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-4 border-t border-border bg-card flex gap-2 shrink-0">
                    {id && (
                      <button onClick={excluir} className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={salvar}
                      disabled={saving || loading}
                      className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-body font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar lembrete'}
                    </button>
                  </div>
                </motion.div>
              )}

              {view === 'horario' && (
                <motion.div
                  key="horario"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col min-h-0 px-5"
                >
                  <div className="flex items-center gap-3 mb-6 pt-2 shrink-0">
                    <button onClick={() => setView('main')} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-display text-lg font-bold">Horário</h3>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center pb-12">
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className="w-full px-4 py-8 rounded-2xl bg-secondary/40 border border-border font-mono text-5xl text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  
                  <div className="mt-auto pb-4 pt-4 shrink-0">
                    <button onClick={() => setView('main')} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-[15px]">Confirmar</button>
                  </div>
                </motion.div>
              )}

              {view === 'repetir' && (
                <motion.div
                  key="repetir"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col min-h-0 px-5"
                >
                  <div className="flex items-center gap-3 mb-6 pt-2 shrink-0">
                    <button onClick={() => setView('main')} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-display text-lg font-bold">Repetir</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pb-4 space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'daily', label: 'Todos os dias' },
                        { id: 'weekdays', label: 'Dias da semana' },
                        { id: 'weekends', label: 'Fins de semana' },
                        { id: 'custom', label: 'Personalizado' },
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setPresetSafe(p.id as Preset)}
                          className={`w-full px-4 py-4 rounded-xl text-base font-body text-left transition font-semibold border ${
                            preset === p.id ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/40 border-border text-foreground hover:bg-secondary'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {preset === 'custom' && (
                      <div className="flex gap-1.5 justify-between mt-4">
                        {DIAS.map(d => {
                          const active = dias.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              onClick={() => {
                                setPreset('custom');
                                setDias(active ? dias.filter(x => x !== d.id) : [...dias, d.id]);
                              }}
                              className={`flex-1 aspect-square rounded-lg font-body font-bold text-sm transition ${
                                active ? 'bg-primary text-primary-foreground' : 'bg-secondary border border-border text-muted-foreground'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto pb-4 pt-4 shrink-0 border-t border-border/50">
                    <button onClick={() => setView('main')} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-[15px]">Confirmar</button>
                  </div>
                </motion.div>
              )}

              {view === 'mensagem' && (
                <motion.div
                  key="mensagem"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col min-h-0 px-5"
                >
                  <div className="flex items-center gap-3 mb-6 pt-2 shrink-0">
                    <button onClick={() => setView('main')} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-display text-lg font-bold">Mensagem</h3>
                  </div>
                  
                  <div className="flex-1">
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full p-4 rounded-xl bg-secondary/40 border border-border resize-none h-40 focus:outline-none focus:border-primary/50 text-base"
                      placeholder="Ex: Preciso estudar Direito Penal..."
                    />
                  </div>
                  
                  <div className="mt-auto pb-4 pt-4 shrink-0">
                    <button onClick={() => setView('main')} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-[15px]">Confirmar</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(sheet, document.body);
};

function ListButton({ icon: Icon, label, value, onClick }: { icon: any; label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 bg-transparent hover:bg-secondary/30 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2 max-w-[50%]">
        <span className="text-sm text-muted-foreground truncate">{value}</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
      </div>
    </button>
  );
}

export default LembreteSheet;
