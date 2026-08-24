import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from '@/lib/vapid';
import { Capacitor } from '@capacitor/core';

const SW_PATH = '/push-sw.js';

type PermState = 'default' | 'granted' | 'denied' | 'unsupported';

export function useWebPush() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PermState>('default');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      !Capacitor.isNativePlatform();
    setSupported(ok);
    if (ok) setPermission(Notification.permission as PermState);
  }, []);

  useEffect(() => {
    if (!supported || !user) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
        const sub = await reg?.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch { /* ignore */ }
    })();
  }, [supported, user]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !user) return false;
    try {
      let perm = Notification.permission;
      if (perm !== 'granted') {
        perm = await Notification.requestPermission();
        setPermission(perm as PermState);
        if (perm !== 'granted') return false;
      }
      const reg =
        (await navigator.serviceWorker.getRegistration(SW_PATH)) ||
        (await navigator.serviceWorker.register(SW_PATH));
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });
      }
      const json: any = sub.toJSON();
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          user_agent: navigator.userAgent,
          platform: 'web',
          enabled: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );
      setSubscribed(true);
      return true;
    } catch (e) {
      console.warn('[useWebPush] subscribe error', e);
      return false;
    }
  }, [supported, user]);

  return { supported, permission, subscribed, subscribe };
}
