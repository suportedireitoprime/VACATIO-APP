// Geofence híbrido usando @capgo/background-geolocation para o app nativo
// (iOS e Android) via Geofencing API (sem Foreground Service fixo/persistente)
// e @capacitor/geolocation como fallback em foreground (para web).
//
// Regras:
// - O lembrete só dispara na TRANSIÇÃO fora→dentro do raio (evita spam enquanto
//   a pessoa fica no local). Enquanto está dentro, apenas mantemos o "presence
//   banner" no topo do app e falamos "Você está no local" uma vez.
// - Debounce adicional de 10 min por lembrete pra caso de GPS oscilar na borda.
// - No background, a transição ativa o webhook no backend via Supabase Edge Function.

import { Capacitor } from '@capacitor/core';
import { BackgroundGeolocation } from '@capgo/background-geolocation';
import { supabase } from '@/integrations/supabase/client';
import { haversineMeters } from './nativeGeocoder';

type Channel = 'push' | 'horus' | 'both';

export interface GeofenceReminder {
  id: string;
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  message: string;
  channel: Channel;
  last_triggered_at: string | null;
}

let watchId: string | null = null;
let bgListenerInstalled = false;
let reminders: GeofenceReminder[] = [];
const cooldownMs = 10 * 60 * 1000;
const localCooldown = new Map<string, number>();
const insideIds = new Set<string>();
const spokenOnce = new Set<string>();

type PresenceListener = (inside: GeofenceReminder[]) => void;
const presenceListeners = new Set<PresenceListener>();

function emitPresence() {
  const inside = reminders.filter(r => insideIds.has(r.id));
  presenceListeners.forEach(l => { try { l(inside); } catch {} });
}

export function subscribeGeofencePresence(cb: PresenceListener): () => void {
  presenceListeners.add(cb);
  cb(reminders.filter(r => insideIds.has(r.id)));
  return () => { presenceListeners.delete(cb); };
}

export function getGeofenceInside(): GeofenceReminder[] {
  return reminders.filter(r => insideIds.has(r.id));
}

async function loadReminders(userId: string) {
  const { data } = await supabase
    .from('location_reminders')
    .select('id,label,address,lat,lng,radius_m,message,channel,last_triggered_at')
    .eq('user_id', userId)
    .eq('active', true);
  reminders = (data ?? []) as GeofenceReminder[];
  // limpa insideIds pra remover lembretes que foram desativados/removidos
  for (const id of Array.from(insideIds)) {
    if (!reminders.find(r => r.id === id)) insideIds.delete(id);
  }
  emitPresence();
}

async function firePush(r: GeofenceReminder) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [{
        id: 92000 + Math.abs(hashCode(r.id) % 1000),
        title: `📍 ${r.label}`,
        body: r.message,
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#c9a84c',
      }],
    });
  } catch (e) {
    console.warn('[geofence] push falhou', e);
  }
}

async function fireHorus(r: GeofenceReminder) {
  try {
    await supabase.functions.invoke('location-reminder-horus', {
      body: { label: r.label, message: r.message, address: r.address },
    });
  } catch (e) {
    console.warn('[geofence] horus falhou', e);
  }
}

function speakArrived(label: string) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(`Você está no local: ${label}`);
    u.lang = 'pt-BR';
    u.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

async function fireReminder(r: GeofenceReminder, opts?: { force?: boolean }) {
  if (!opts?.force) {
    const lastLocal = localCooldown.get(r.id) ?? 0;
    if (Date.now() - lastLocal < cooldownMs) return;
  }
  localCooldown.set(r.id, Date.now());

  const ch = (r.channel ?? 'push') as Channel;
  const tasks: Promise<void>[] = [];
  if (ch === 'push' || ch === 'both') tasks.push(firePush(r));
  if (ch === 'horus' || ch === 'both') tasks.push(fireHorus(r));
  await Promise.allSettled(tasks);

  try {
    await supabase
      .from('location_reminders')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', r.id);
  } catch (e) {
    console.warn('[geofence] update last_triggered_at falhou', e);
  }
}

function hashCode(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

function checkPosition(lat: number, lng: number) {
  let changed = false;
  for (const r of reminders) {
    const dist = haversineMeters({ lat, lng }, { lat: r.lat, lng: r.lng });
    const wasInside = insideIds.has(r.id);
    const nowInside = dist <= r.radius_m;
    if (nowInside && !wasInside) {
      // transição fora → dentro: dispara + fala
      insideIds.add(r.id);
      changed = true;
      speakArrived(r.label);
      spokenOnce.add(r.id);
      fireReminder(r);
    } else if (!nowInside && wasInside) {
      // saiu do raio: libera cooldown pra próximo retorno já disparar
      insideIds.delete(r.id);
      spokenOnce.delete(r.id);
      localCooldown.delete(r.id);
      changed = true;
    }
  }
  if (changed) emitPresence();
}

async function startForegroundWatcher() {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      const req = await Geolocation.requestPermissions();
      if (req.location !== 'granted') return;
    }
    if (watchId) return;
    watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 },
      (pos) => {
        if (!pos) return;
        checkPosition(pos.coords.latitude, pos.coords.longitude);
      },
    );
  } catch (e) {
    console.warn('[geofence] foreground watch falhou', e);
  }
}

async function setupNativeGeofences() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/location-reminder-horus`;

    await BackgroundGeolocation.setupGeofencing({
      url: webhookUrl,
      notifyOnEntry: true,
      notifyOnExit: true,
      backgroundLocation: true
    });

    for (const r of reminders) {
      try {
        await BackgroundGeolocation.addGeofence({
          identifier: r.id,
          latitude: r.lat,
          longitude: r.lng,
          radius: r.radius_m
        });
      } catch (e) {
        console.warn(`[geofence] failed to add geofence ${r.id}`, e);
      }
    }

    if (!bgListenerInstalled) {
      bgListenerInstalled = true;
      await BackgroundGeolocation.addListener("geofenceTransition", (event: any) => {
        const id = event.identifier || event.geofence?.identifier;
        if (!id) return;
        
        const action = String(event.action || event.transition).toUpperCase();
        const r = reminders.find(x => x.id === id);
        if (!r) return;

        const isEnter = action === "ENTER" || action === "1";
        if (isEnter) {
          if (!insideIds.has(r.id)) {
            insideIds.add(r.id);
            emitPresence();
            speakArrived(r.label);
            spokenOnce.add(r.id);
            fireReminder(r);
          }
        } else {
          if (insideIds.has(r.id)) {
            insideIds.delete(r.id);
            spokenOnce.delete(r.id);
            localCooldown.delete(r.id);
            emitPresence();
          }
        }
      });
    }
  } catch (e) {
    console.warn('[geofence] background geofencing falhou', e);
  }
}

export async function startGeofenceWatcher(userId: string): Promise<void> {
  await loadReminders(userId);
  if (!reminders.length) return;

  await startForegroundWatcher();
  await setupNativeGeofences();
}

export async function stopGeofenceWatcher(): Promise<void> {
  if (watchId) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      await Geolocation.clearWatch({ id: watchId });
    } catch {}
    watchId = null;
  }
  
  if (Capacitor.isNativePlatform()) {
    try {
      for (const r of reminders) {
        await BackgroundGeolocation.removeGeofence({ identifier: r.id });
      }
    } catch (e) {
      console.warn('[geofence] falha ao remover geofences', e);
    }
  }
}

export async function refreshGeofenceReminders(userId: string): Promise<void> {
  // Para atualizar nativamente, paramos os antigos e registramos novamente
  await stopGeofenceWatcher();
  await startGeofenceWatcher(userId);
}

/**
 * Dispara manualmente o lembrete (botão "Testar" na UI). Ignora cooldown e
 * transição de entrada — simula exatamente como a notificação vai chegar.
 */
export async function triggerReminderNow(reminderId: string): Promise<boolean> {
  let r = reminders.find(x => x.id === reminderId);
  if (!r) {
    // pode ser um lembrete recém-criado ainda não carregado; busca direto.
    const { data } = await supabase
      .from('location_reminders')
      .select('id,label,address,lat,lng,radius_m,message,channel,last_triggered_at')
      .eq('id', reminderId)
      .maybeSingle();
    if (!data) return false;
    r = data as GeofenceReminder;
  }
  await fireReminder(r, { force: true });
  return true;
}
