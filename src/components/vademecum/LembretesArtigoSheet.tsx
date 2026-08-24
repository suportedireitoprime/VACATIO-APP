import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Plus, Trash2, Loader2, Search, Bell, BellOff, ArrowLeft, ArrowRight, Check, Home, GraduationCap, Landmark, FileText, Scale, Briefcase, LocateFixed, Smartphone, MessageCircle, Zap, Pencil, Clock, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { geocodeAddress, reverseGeocode, haversineMeters, extractCep, geocodeByCep, type GeocodeResult } from '@/lib/nativeGeocoder';
import { refreshGeofenceReminders, startGeofenceWatcher, triggerReminderNow } from '@/lib/nativeGeofence';
import { scheduleLocalReminder, cancelLocalReminder } from '@/lib/localReminder';
import { motion, AnimatePresence } from 'framer-motion';

type Channel = 'push' | 'horus' | 'both';
type Mode = 'local' | 'time';

interface LocReminder {
  id: string;
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  message: string;
  active: boolean;
  triggered_count: number;
  channel: Channel;
}

interface TimeReminder {
  id: string;
  label: string;
  message: string;
  time_of_day: string;
  days_of_week: number[];
  channel: Channel;
  active: boolean;
  triggered_count: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  artigoRef: string;
  artigoTitulo: string;
}

const RADII = [100, 300, 500, 1000, 2000];
const SUGGESTIONS: { label: string; icon: any }[] = [
  { label: 'Em casa', icon: Home },
  { label: 'Na faculdade', icon: GraduationCap },
  { label: 'No fórum', icon: Landmark },
  { label: 'No cartório', icon: FileText },
  { label: 'Na OAB', icon: Scale },
  { label: 'No trabalho', icon: Briefcase },
];

const CHANNELS: { value: Channel; title: string; desc: string; icon: any }[] = [
  { value: 'push', title: 'Notificação push', desc: 'Aviso no celular, mesmo com o app fechado.', icon: Smartphone },
  { value: 'horus', title: 'Horus (WhatsApp)', desc: 'O Horus te manda uma mensagem no WhatsApp.', icon: MessageCircle },
  { value: 'both', title: 'Push + Horus', desc: 'Recebe pelos dois canais ao mesmo tempo.', icon: Zap },
];

const WEEKDAYS: { dow: number; short: string; long: string }[] = [
  { dow: 0, short: 'D', long: 'Domingo' },
  { dow: 1, short: 'S', long: 'Segunda' },
  { dow: 2, short: 'T', long: 'Terça' },
  { dow: 3, short: 'Q', long: 'Quarta' },
  { dow: 4, short: 'Q', long: 'Quinta' },
  { dow: 5, short: 'S', long: 'Sexta' },
  { dow: 6, short: 'S', long: 'Sábado' },
];

const LOCAL_STEPS = ['Nome', 'Endereço', 'Raio', 'Aviso', 'Mensagem'] as const;
const TIME_STEPS = ['Nome', 'Horário', 'Aviso', 'Mensagem'] as const;

function fmtDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

function fmtDays(dow: number[]): string {
  if (dow.length === 7) return 'Todos os dias';
  const set = new Set(dow);
  const weekend = set.has(0) && set.has(6) && set.size === 2;
  if (weekend) return 'Fins de semana';
  const weekdaysOnly = [1, 2, 3, 4, 5].every(d => set.has(d)) && set.size === 5;
  if (weekdaysOnly) return 'Dias úteis';
  return WEEKDAYS.filter(w => set.has(w.dow)).map(w => w.long.slice(0, 3)).join(', ');
}

export default function LembretesArtigoSheet({ open, onClose, artigoRef, artigoTitulo }: Props) {
  const { user } = useAuth();
  const [locRows, setLocRows] = useState<LocReminder[]>([]);
  const [timeRows, setTimeRows] = useState<TimeReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode | null>(null); // null = lista, else creating
  const [showChooser, setShowChooser] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  // Shared form state
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<Channel>('push');
  const [saving, setSaving] = useState(false);

  // Local reminder form
  const [addressQ, setAddressQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hits, setHits] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [radius, setRadius] = useState(300);

  // Time reminder form
  const [timeHHMM, setTimeHHMM] = useState('08:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);

  // Live distance tracking
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<string | null>(null);

  const STEPS = mode === 'time' ? TIME_STEPS : LOCAL_STEPS;
  const creating = mode !== null;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [locRes, timeRes] = await Promise.all([
      supabase
        .from('location_reminders')
        .select('id,label,address,lat,lng,radius_m,message,active,triggered_count,channel')
        .eq('user_id', user.id)
        .eq('artigo_ref', artigoRef)
        .order('created_at', { ascending: false }),
      supabase
        .from('article_time_reminders' as any)
        .select('id,label,message,time_of_day,days_of_week,channel,active,triggered_count')
        .eq('user_id', user.id)
        .eq('artigo_ref', artigoRef)
        .order('created_at', { ascending: false }),
    ]);
    setLocRows((locRes.data as LocReminder[]) || []);
    setTimeRows(((timeRes.data as unknown) as TimeReminder[]) || []);
    setLoading(false);
  }, [user, artigoRef]);

  useEffect(() => { if (open) load(); }, [open, load]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 15000 },
          (pos, err) => {
            if (err || !pos || cancelled) return;
            setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        );
        watchIdRef.current = id;
      } catch {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          const wid = navigator.geolocation.watchPosition(
            (pos) => !cancelled && setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, maximumAge: 10000 }
          );
          watchIdRef.current = String(wid);
        }
      }
    })();
    return () => {
      cancelled = true;
      const id = watchIdRef.current;
      watchIdRef.current = null;
      if (!id) return;
      (async () => {
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          await Geolocation.clearWatch({ id });
        } catch {
          if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.clearWatch(Number(id));
          }
        }
      })();
    };
  }, [open]);

  const resetForm = () => {
    setLabel(''); setMessage(''); setAddressQ(''); setHits([]); setSelected(null); setRadius(300);
    setChannel('push'); setEditingId(null); setStep(0); setMode(null); setShowChooser(false);
    setTimeHHMM('08:00'); setDaysOfWeek([1, 2, 3, 4, 5]);
  };

  const startEditLocal = (r: LocReminder) => {
    setEditingId(r.id);
    setLabel(r.label);
    setMessage(r.message);
    setAddressQ(r.address ?? '');
    setSelected({ lat: r.lat, lng: r.lng, displayName: r.address ?? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` });
    setHits([]);
    setRadius(r.radius_m);
    setChannel((r.channel ?? 'push') as Channel);
    setMode('local');
    setStep(0);
  };

  const startEditTime = (r: TimeReminder) => {
    setEditingId(r.id);
    setLabel(r.label);
    setMessage(r.message);
    setTimeHHMM(r.time_of_day.slice(0, 5));
    setDaysOfWeek(r.days_of_week || []);
    setChannel((r.channel ?? 'push') as Channel);
    setMode('time');
    setStep(0);
  };

  useEffect(() => { if (!open) resetForm(); }, [open]);

  const doSearch = async () => {
    const q = addressQ.trim();
    if (q.length < 3) { toast.error('Digite pelo menos 3 letras ou um CEP.'); return; }
    setSearching(true);
    try {
      const cep = extractCep(q);
      const r = cep ? await geocodeByCep(cep) : await geocodeAddress(q, 5);
      setHits(r);
      if (!r.length) toast.error(cep ? 'CEP não encontrado.' : 'Nenhum endereço encontrado.');
    } catch (e: any) {
      console.error('[lembretes] geocode', e);
      toast.error('Erro ao buscar endereço.');
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      let coords: { lat: number; lng: number } | null = null;
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            toast.error('Precisamos da permissão de localização.');
            return;
          }
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          coords = await new Promise((res, rej) => {
            navigator.geolocation.getCurrentPosition(
              (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
              rej,
              { enableHighAccuracy: true, timeout: 15000 }
            );
          });
        }
      }
      if (!coords) { toast.error('Não foi possível obter sua localização.'); return; }
      setUserPos(coords);
      const rev = await reverseGeocode(coords.lat, coords.lng);
      const hit: GeocodeResult = rev ?? {
        lat: coords.lat, lng: coords.lng,
        displayName: `Minha localização (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      };
      setSelected(hit);
      setAddressQ(hit.displayName);
      setHits([]);
      toast.success('Localização atual capturada.');
    } catch (e: any) {
      console.error('[lembretes] geoloc', e);
      toast.error('Falha ao obter localização.');
    } finally {
      setLocating(false);
    }
  };

  const saveLocal = async () => {
    if (!user) { toast.error('Faça login para criar lembretes.'); return; }
    if (!label.trim()) { setStep(0); return toast.error('Dê um nome ao lembrete.'); }
    if (!selected) { setStep(1); return toast.error('Escolha um endereço.'); }
    const msg = message.trim() || `Estude ${artigoTitulo}`;
    setSaving(true);
    let error: any = null;
    if (editingId) {
      const res = await supabase.from('location_reminders').update({
        label: label.trim(), address: selected.displayName, lat: selected.lat, lng: selected.lng,
        radius_m: radius, message: msg, channel,
      } as any).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('location_reminders').insert({
        user_id: user.id, label: label.trim(), address: selected.displayName,
        lat: selected.lat, lng: selected.lng, radius_m: radius, message: msg,
        active: true, channel, artigo_ref: artigoRef,
      } as any);
      error = res.error;
    }
    setSaving(false);
    if (error) { console.error('[lembretes] save', error); toast.error(error.message); return; }
    toast.success(editingId ? 'Lembrete atualizado!' : 'Lembrete criado!');
    resetForm();
    load();
    try { await refreshGeofenceReminders(user.id); await startGeofenceWatcher(user.id); } catch (e) { console.warn(e); }
  };

  const saveTime = async () => {
    if (!user) { toast.error('Faça login para criar lembretes.'); return; }
    if (!label.trim()) { setStep(0); return toast.error('Dê um nome ao lembrete.'); }
    if (!/^\d{2}:\d{2}$/.test(timeHHMM)) { setStep(1); return toast.error('Escolha um horário válido.'); }
    if (!daysOfWeek.length) { setStep(1); return toast.error('Escolha ao menos um dia da semana.'); }
    const msg = message.trim() || `Hora de revisar ${artigoTitulo}`;
    setSaving(true);
    let savedId = editingId;
    let error: any = null;
    if (editingId) {
      const res = await supabase.from('article_time_reminders' as any).update({
        label: label.trim(), message: msg, time_of_day: timeHHMM,
        days_of_week: daysOfWeek, channel, next_fire_at: null,
      }).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('article_time_reminders' as any).insert({
        user_id: user.id, artigo_ref: artigoRef, artigo_titulo: artigoTitulo,
        label: label.trim(), message: msg, time_of_day: timeHHMM,
        days_of_week: daysOfWeek, channel, active: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      }).select('id').single();
      error = res.error;
      savedId = (res.data as any)?.id ?? null;
    }
    setSaving(false);
    if (error) { console.error('[lembretes-time] save', error); toast.error(error.message); return; }
    // Agenda notificação local nativa (push) quando possível
    if (savedId && (channel === 'push' || channel === 'both')) {
      try {
        await scheduleLocalReminder({
          reminderId: savedId,
          title: `⏰ ${label.trim()}`,
          body: msg,
          timeHHMM,
          daysOfWeek,
        });
      } catch (e) { console.warn('[lembretes-time] local schedule', e); }
    } else if (savedId && channel === 'horus') {
      try { await cancelLocalReminder(savedId); } catch { /* noop */ }
    }
    toast.success(editingId ? 'Lembrete atualizado!' : 'Lembrete criado!');
    resetForm();
    load();
  };

  const toggleLocalActive = async (r: LocReminder) => {
    await supabase.from('location_reminders').update({ active: !r.active }).eq('id', r.id);
    load();
    if (user) refreshGeofenceReminders(user.id);
  };

  const toggleTimeActive = async (r: TimeReminder) => {
    await supabase.from('article_time_reminders' as any).update({ active: !r.active }).eq('id', r.id);
    if (r.active) { try { await cancelLocalReminder(r.id); } catch { /* noop */ } }
    load();
  };

  const removeLocal = async (r: LocReminder) => {
    if (!confirm(`Excluir "${r.label}"?`)) return;
    await supabase.from('location_reminders').delete().eq('id', r.id);
    load();
    if (user) refreshGeofenceReminders(user.id);
  };

  const removeTime = async (r: TimeReminder) => {
    if (!confirm(`Excluir "${r.label}"?`)) return;
    await supabase.from('article_time_reminders' as any).delete().eq('id', r.id);
    try { await cancelLocalReminder(r.id); } catch { /* noop */ }
    load();
  };

  const canAdvance = () => {
    if (mode === 'local') {
      if (step === 0) return label.trim().length > 0;
      if (step === 1) return !!selected;
      if (step === 2) return radius > 0;
      if (step === 3) return !!channel;
      return true;
    }
    if (mode === 'time') {
      if (step === 0) return label.trim().length > 0;
      if (step === 1) return /^\d{2}:\d{2}$/.test(timeHHMM) && daysOfWeek.length > 0;
      if (step === 2) return !!channel;
      return true;
    }
    return false;
  };

  const goNext = () => {
    if (!canAdvance()) {
      if (step === 0) toast.error('Dê um nome ao lembrete.');
      else if (mode === 'local' && step === 1) toast.error('Escolha um endereço da lista.');
      else if (mode === 'time' && step === 1) toast.error('Escolha horário e dias.');
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else (mode === 'time' ? saveTime() : saveLocal());
  };

  const channelLabel = (c: Channel) =>
    c === 'push' ? 'Push' : c === 'horus' ? 'Horus' : 'Push + Horus';

  const toggleDay = (d: number) => {
    setDaysOfWeek(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const modeHeaderTitle = creating
    ? `${editingId ? 'Editar' : 'Novo'} lembrete · ${STEPS[step]}`
    : 'Lembretes deste artigo';

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="z-[10001] h-[90vh] max-w-lg mx-auto rounded-t-3xl p-0 flex flex-col bg-card"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {mode === 'time' ? <Clock className="w-5 h-5 text-primary shrink-0" /> : <MapPin className="w-5 h-5 text-primary shrink-0" />}
            <div className="min-w-0">
              <h3 className="font-heading text-base font-semibold text-foreground truncate">{modeHeaderTitle}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{artigoTitulo}</p>
            </div>
          </div>
        </div>

        {creating && (
          <div className="px-5 pt-3 pb-1 shrink-0">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-secondary'}`} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Passo {step + 1} de {STEPS.length}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {!creating && !showChooser && (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Crie lembretes para revisar este artigo — por lugar (quando chegar em algum local) ou por horário (todo dia ou nos dias que quiser).
              </p>

              <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={() => setShowChooser(true)}>
                <Plus className="mr-2 h-5 w-5" /> Novo lembrete
              </Button>

              {/* Lista lembretes por local */}
              <div>
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> Por local
                </h4>
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
                ) : locRows.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-xs">Nenhum lembrete por local ainda.</p>
                ) : (
                  <ul className="space-y-3">
                    {locRows.map((r) => {
                      const dist = userPos ? haversineMeters(userPos, { lat: r.lat, lng: r.lng }) : null;
                      const inRange = dist !== null && dist <= r.radius_m;
                      return (
                        <li key={r.id} className="rounded-2xl border border-border bg-background/40 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {r.active ? <Bell className="h-4 w-4 text-primary shrink-0" /> : <BellOff className="h-4 w-4 text-muted-foreground shrink-0" />}
                                <h3 className="font-semibold truncate">{r.label}</h3>
                              </div>
                              {r.address && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.address}</p>}
                              <p className="mt-2 text-sm">{r.message}</p>
                              {dist !== null && (
                                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  inRange ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-primary/10 text-primary border border-primary/20'
                                }`}>
                                  <LocateFixed className="h-3 w-3" />
                                  {inRange ? `Dentro do raio · ${fmtDist(dist)}` : `${fmtDist(dist)} de você`}
                                </div>
                              )}
                              <p className="mt-2 text-xs text-muted-foreground">
                                Raio {r.radius_m} m · {r.triggered_count}x · {channelLabel((r.channel ?? 'push') as Channel)}
                              </p>
                            </div>
                            <Switch checked={r.active} onCheckedChange={() => toggleLocalActive(r)} />
                          </div>
                          <div className="mt-3 flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                toast.loading('Disparando teste…', { id: `test-${r.id}` });
                                const ok = await triggerReminderNow(r.id);
                                toast.dismiss(`test-${r.id}`);
                                if (ok) toast.success('Teste disparado — confira push/WhatsApp.');
                                else toast.error('Não foi possível disparar o teste.');
                              }}
                            >
                              <Zap className="mr-1 h-3.5 w-3.5" /> Testar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEditLocal(r)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeLocal(r)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Lista lembretes por horário */}
              <div>
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Por horário
                </h4>
                {loading ? null : timeRows.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-xs">Nenhum lembrete por horário ainda.</p>
                ) : (
                  <ul className="space-y-3">
                    {timeRows.map((r) => (
                      <li key={r.id} className="rounded-2xl border border-border bg-background/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {r.active ? <Bell className="h-4 w-4 text-primary shrink-0" /> : <BellOff className="h-4 w-4 text-muted-foreground shrink-0" />}
                              <h3 className="font-semibold truncate">{r.label}</h3>
                            </div>
                            <p className="mt-1 text-lg font-heading font-bold text-primary">{r.time_of_day.slice(0, 5)}</p>
                            <p className="text-xs text-muted-foreground">{fmtDays(r.days_of_week || [])}</p>
                            <p className="mt-2 text-sm">{r.message}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {r.triggered_count}x · {channelLabel((r.channel ?? 'push') as Channel)}
                            </p>
                          </div>
                          <Switch checked={r.active} onCheckedChange={() => toggleTimeActive(r)} />
                        </div>
                        <div className="mt-3 flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEditTime(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeTime(r)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {!creating && showChooser && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-heading font-semibold text-foreground">Que tipo de lembrete?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha como você quer ser lembrado deste artigo.
                </p>
              </div>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => { setMode('local'); setShowChooser(false); setStep(0); }}
                  className="rounded-2xl border border-border bg-background/40 p-5 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/15 p-3">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-foreground">Por local</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Ao chegar em algum lugar — casa, faculdade, fórum, cartório.
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('time'); setShowChooser(false); setStep(0); }}
                  className="rounded-2xl border border-border bg-background/40 p-5 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/15 p-3">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-foreground">Por horário</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Todo dia ou em dias específicos, na hora que você escolher.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setShowChooser(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            </div>
          )}

          {creating && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                {/* Passo 0 — Nome (compartilhado) */}
                {step === 0 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-heading font-semibold text-foreground">Dê um nome</h2>
                      <p className="text-sm text-muted-foreground mt-1">Escolha uma sugestão ou escreva o seu.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {SUGGESTIONS.map((s) => {
                        const Icon = s.icon;
                        const active = label === s.label;
                        return (
                          <button
                            key={s.label} type="button" onClick={() => setLabel(s.label)}
                            className={`flex items-center gap-2 rounded-2xl border p-3.5 text-left text-sm font-medium transition-colors ${
                              active ? 'border-primary bg-primary/15 text-foreground' : 'border-border bg-background/40 text-foreground/80 hover:bg-secondary/60'
                            }`}
                          >
                            <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                    <Input
                      value={label} onChange={(e) => setLabel(e.target.value)}
                      placeholder="Ou digite um nome…"
                      className="h-14 text-base rounded-2xl" autoFocus
                    />
                  </div>
                )}

                {/* LOCAL — Passo 1: Endereço */}
                {mode === 'local' && step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-heading font-semibold text-foreground">Qual o endereço?</h2>
                      <p className="text-sm text-muted-foreground mt-1">Use sua localização atual ou busque pelo nome do lugar.</p>
                    </div>
                    <Button
                      type="button" variant="outline" onClick={useMyLocation} disabled={locating}
                      className="w-full h-14 rounded-2xl text-base font-semibold border-primary/40 text-primary hover:bg-primary/10"
                    >
                      {locating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Localizando…</>
                                : <><LocateFixed className="mr-2 h-5 w-5" /> Usar minha localização</>}
                    </Button>
                    <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <div className="flex-1 h-px bg-border" /> ou digite <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={addressQ} onChange={(e) => setAddressQ(e.target.value)}
                        placeholder="Nome do lugar ou CEP (ex: 50050-000)"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
                        className="h-14 text-base rounded-2xl"
                      />
                      <Button type="button" onClick={doSearch} disabled={searching} className="h-14 w-14 rounded-2xl">
                        {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                      </Button>
                    </div>
                    {hits.length > 0 && (
                      <ul className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                        {hits.map((h, i) => (
                          <li key={i}>
                            <button
                              type="button" onClick={() => { setSelected(h); setHits([]); setAddressQ(h.displayName); }}
                              className="w-full text-left px-4 py-3.5 text-sm hover:bg-muted flex items-start gap-2"
                            >
                              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                              <span className="flex-1">{h.displayName}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selected && (
                      <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 flex items-start gap-2.5">
                        <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2">{selected.displayName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* LOCAL — Passo 2: Raio */}
                {mode === 'local' && step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-heading font-semibold text-foreground">Qual a distância?</h2>
                      <p className="text-sm text-muted-foreground mt-1">Você será avisado ao entrar nesse raio ao redor do local.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {RADII.map((r) => {
                        const active = radius === r;
                        return (
                          <button
                            key={r} type="button" onClick={() => setRadius(r)}
                            className={`rounded-2xl border p-4 text-center transition-colors ${
                              active ? 'border-primary bg-primary/15' : 'border-border bg-background/40 hover:bg-secondary/60'
                            }`}
                          >
                            <div className={`text-xl font-heading font-bold ${active ? 'text-primary' : 'text-foreground'}`}>
                              {r >= 1000 ? `${r / 1000} km` : `${r} m`}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {r <= 100 ? 'chegou exato' : r <= 500 ? 'já na região' : 'aproximação'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TIME — Passo 1: Horário + dias */}
                {mode === 'time' && step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-heading font-semibold text-foreground">Que horas?</h2>
                      <p className="text-sm text-muted-foreground mt-1">Escolha o horário e em quais dias da semana.</p>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
                        <Clock className="h-3.5 w-3.5" /> Horário
                      </label>
                      <Input
                        type="time" value={timeHHMM} onChange={(e) => setTimeHHMM(e.target.value)}
                        className="h-16 text-2xl font-heading font-bold text-center rounded-2xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
                        <CalendarDays className="h-3.5 w-3.5" /> Dias da semana
                      </label>
                      <div className="flex gap-1.5">
                        {WEEKDAYS.map((w) => {
                          const active = daysOfWeek.includes(w.dow);
                          return (
                            <button
                              key={w.dow} type="button" onClick={() => toggleDay(w.dow)}
                              className={`flex-1 aspect-square rounded-2xl border font-heading font-bold text-lg transition-colors ${
                                active ? 'border-primary bg-primary text-primary-foreground'
                                       : 'border-border bg-background/40 text-foreground/70 hover:bg-secondary/60'
                              }`}
                              aria-label={w.long}
                            >
                              {w.short}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <button type="button" onClick={() => setDaysOfWeek([0, 1, 2, 3, 4, 5, 6])}
                          className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary">Todo dia</button>
                        <button type="button" onClick={() => setDaysOfWeek([1, 2, 3, 4, 5])}
                          className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary">Dias úteis</button>
                        <button type="button" onClick={() => setDaysOfWeek([0, 6])}
                          className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary">Fim de semana</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Passo Aviso (local=3, time=2) */}
                {((mode === 'local' && step === 3) || (mode === 'time' && step === 2)) && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-heading font-semibold text-foreground">Como quer ser avisado?</h2>
                      <p className="text-sm text-muted-foreground mt-1">Escolha o canal do aviso.</p>
                    </div>
                    <div className="space-y-2.5">
                      {CHANNELS.map((c) => {
                        const Icon = c.icon;
                        const active = channel === c.value;
                        return (
                          <button
                            key={c.value} type="button" onClick={() => setChannel(c.value)}
                            className={`w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                              active ? 'border-primary bg-primary/15' : 'border-border bg-background/40 hover:bg-secondary/60'
                            }`}
                          >
                            <Icon className={`h-6 w-6 mt-0.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground">{c.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                            </div>
                            {active && <Check className="h-5 w-5 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Passo final: Mensagem + resumo (local=4, time=3) */}
                {((mode === 'local' && step === 4) || (mode === 'time' && step === 3)) && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-heading font-semibold text-foreground">Mensagem</h2>
                      <p className="text-sm text-muted-foreground mt-1">O que a notificação deve dizer? (opcional)</p>
                    </div>
                    <Textarea
                      value={message} onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Ex: Revisar ${artigoTitulo} antes da aula`}
                      rows={5} className="text-base rounded-2xl resize-none" autoFocus
                    />
                    <div className="rounded-2xl border border-border bg-background/40 p-4 space-y-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Resumo</p>
                      <p className="text-sm"><span className="text-muted-foreground">Nome:</span> {label || '—'}</p>
                      {mode === 'local' ? (
                        <>
                          <p className="text-sm line-clamp-2"><span className="text-muted-foreground">Local:</span> {selected?.displayName || '—'}</p>
                          <p className="text-sm"><span className="text-muted-foreground">Raio:</span> {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm"><span className="text-muted-foreground">Horário:</span> {timeHHMM}</p>
                          <p className="text-sm"><span className="text-muted-foreground">Dias:</span> {fmtDays(daysOfWeek)}</p>
                        </>
                      )}
                      <p className="text-sm"><span className="text-muted-foreground">Aviso:</span> {channelLabel(channel)}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {creating && (
          <div className="shrink-0 border-t border-border p-4 flex gap-2.5 bg-card pb-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
            <Button
              variant="outline" className="h-14 rounded-2xl px-5"
              onClick={() => (step === 0 ? resetForm() : setStep(step - 1))}
              disabled={saving}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button className="flex-1 h-14 rounded-2xl text-base font-semibold" onClick={goNext} disabled={saving}>
              {saving ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {editingId ? 'Salvando…' : 'Criando…'}</>
              ) : step === STEPS.length - 1 ? (
                <><Check className="mr-2 h-5 w-5" /> {editingId ? 'Salvar alterações' : 'Criar lembrete'}</>
              ) : (
                <>Continuar <ArrowRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
