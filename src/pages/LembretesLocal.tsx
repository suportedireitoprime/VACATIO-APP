import { useEffect, useState, useCallback } from 'react';
import { MapPin, Plus, Trash2, Loader2, Search, Navigation2, Map as MapIcon } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { geocodeAddress, type GeocodeResult } from '@/lib/nativeGeocoder';
import { openMap } from '@/lib/nativeMapsLauncher';
import { refreshGeofenceReminders, startGeofenceWatcher } from '@/lib/nativeGeofence';
import { MapaLembrete } from '@/components/mapa/MapaLembrete';

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
  last_triggered_at: string | null;
}

const RADII = [100, 300, 500, 1000, 2000];

export default function LembretesLocal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LocReminder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mapaAberto, setMapaAberto] = useState<LocReminder | null>(null);

  // form state
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');
  const [addressQ, setAddressQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [radius, setRadius] = useState(300);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('location_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const doSearch = async () => {
    if (addressQ.trim().length < 3) return;
    setSearching(true);
    const r = await geocodeAddress(addressQ, 5);
    setHits(r);
    setSearching(false);
    if (!r.length) toast.error('Nenhum endereço encontrado.');
  };

  const resetForm = () => {
    setLabel(''); setMessage(''); setAddressQ(''); setHits([]); setSelected(null); setRadius(300);
  };

  const save = async () => {
    if (!user) return;
    if (!label.trim()) return toast.error('Dê um nome ao lembrete.');
    if (!selected) return toast.error('Escolha um endereço.');
    if (!message.trim()) return toast.error('Escreva a mensagem do lembrete.');
    setSaving(true);
    const { error } = await supabase.from('location_reminders').insert({
      user_id: user.id,
      label: label.trim(),
      address: selected.displayName,
      lat: selected.lat,
      lng: selected.lng,
      radius_m: radius,
      message: message.trim(),
      active: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Lembrete criado!');
    setDialogOpen(false);
    resetForm();
    load();
    refreshGeofenceReminders(user.id);
    startGeofenceWatcher(user.id);
  };

  const toggleActive = async (r: LocReminder) => {
    await supabase.from('location_reminders').update({ active: !r.active }).eq('id', r.id);
    load();
    if (user) refreshGeofenceReminders(user.id);
  };

  const remove = async (r: LocReminder) => {
    if (!confirm(`Excluir "${r.label}"?`)) return;
    await supabase.from('location_reminders').delete().eq('id', r.id);
    load();
    if (user) refreshGeofenceReminders(user.id);
  };

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader title="Lembretes por Local" />
      <div className="mx-auto max-w-2xl p-4 pb-24">
        <p className="mb-4 text-sm text-muted-foreground">
          Receba uma notificação quando chegar perto de um lugar — faculdade, fórum, cartório, sala da OAB.
          O app precisa estar em uso para monitorar sua localização (economiza bateria).
        </p>

        <Button className="w-full mb-6" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo lembrete por local
        </Button>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="mx-auto mb-3 h-10 w-10 opacity-40" />
            Nenhum lembrete por local ainda.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold truncate">{r.label}</h3>
                    </div>
                    {r.address && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.address}</p>}
                    <p className="mt-2 text-sm">{r.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Raio {r.radius_m} m · disparado {r.triggered_count}x
                    </p>
                  </div>
                  <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => setMapaAberto(r)}>
                    <MapIcon className="mr-1 h-3.5 w-3.5" /> Mapa vivo
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openMap({ lat: r.lat, lng: r.lng, label: r.label })}>
                    <Navigation2 className="mr-1 h-3.5 w-3.5" /> Rota
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo lembrete por local</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Faculdade, Fórum, OAB..." />
            </div>
            <div>
              <Label>Endereço</Label>
              <div className="flex gap-2">
                <Input
                  value={addressQ}
                  onChange={(e) => setAddressQ(e.target.value)}
                  placeholder="Ex: Fórum Rui Barbosa, Recife"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
                />
                <Button type="button" size="icon" onClick={doSearch} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {hits.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {hits.map((h, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => { setSelected(h); setHits([]); setAddressQ(h.displayName); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      >
                        {h.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selected && (
                <>
                  <p className="mt-2 text-xs text-muted-foreground">
                    📍 {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                  </p>
                  <MapaLembrete
                    className="mt-3"
                    destino={{ lat: selected.lat, lng: selected.lng }}
                    label={label || selected.displayName}
                    raioM={radius}
                  />
                </>
              )}
            </div>
            <div>
              <Label>Raio (metros)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {RADII.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={radius === r ? 'default' : 'outline'}
                    onClick={() => setRadius(r)}
                  >
                    {r >= 1000 ? `${r / 1000} km` : `${r} m`}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Mensagem do lembrete</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Revisar apostila de constitucional antes da aula"
                rows={3}
              />
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Criar lembrete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mapaAberto} onOpenChange={(o) => { if (!o) setMapaAberto(null); }}>
        <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{mapaAberto?.label}</DialogTitle></DialogHeader>
          {mapaAberto && (
            <div className="space-y-3">
              {mapaAberto.address && (
                <p className="text-xs text-muted-foreground">{mapaAberto.address}</p>
              )}
              <MapaLembrete
                destino={{ lat: mapaAberto.lat, lng: mapaAberto.lng }}
                label={mapaAberto.label}
                raioM={mapaAberto.radius_m}
              />
              <p className="rounded-xl bg-muted/50 p-3 text-sm">{mapaAberto.message}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
