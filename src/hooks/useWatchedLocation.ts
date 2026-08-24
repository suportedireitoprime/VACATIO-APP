// Acompanha a posição do usuário continuamente enquanto uma tela de mapa está
// aberta. Um watcher único por tela; usa @capacitor/geolocation no nativo e a
// Geolocation API no web.

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export interface WatchedPosition {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  /** Velocidade em m/s, quando o dispositivo informa. */
  speed?: number | null;
}

const LAST_KEY = 'vacatio-last-position';

function readLast(): WatchedPosition | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as WatchedPosition) : null;
  } catch {
    return null;
  }
}

function saveLast(p: WatchedPosition) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify(p)); } catch {}
}

export function useWatchedLocation(enabled = true) {
  const [position, setPosition] = useState<WatchedPosition | null>(() => readLast());
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const handle = (p: WatchedPosition) => {
      if (cancelled) return;
      setError(null);
      setPosition(p);
      saveLast(p);
    };

    (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { Geolocation } = await import('@capacitor/geolocation');
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted') {
            const req = await Geolocation.requestPermissions();
            if (req.location !== 'granted') {
              if (!cancelled) { setPermissionDenied(true); setError('Permissão de localização negada.'); }
              return;
            }
          }
          const id = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
            (pos) => {
              if (!pos) return;
              handle({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                heading: (pos.coords as any).heading ?? null,
                speed: (pos.coords as any).speed ?? null,
              });
            },
          );
          if (cancelled) { Geolocation.clearWatch({ id }); return; }
          stopRef.current = () => { Geolocation.clearWatch({ id }).catch(() => {}); };
        } else {
          if (!('geolocation' in navigator)) {
            setError('Geolocalização não suportada neste dispositivo.');
            return;
          }
          const id = navigator.geolocation.watchPosition(
            (pos) => handle({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              heading: pos.coords.heading ?? null,
              speed: pos.coords.speed ?? null,
            }),
            (err) => {
              if (cancelled) return;
              if (err.code === err.PERMISSION_DENIED) {
                setPermissionDenied(true);
                setError('Permissão de localização negada.');
              } else {
                setError('Não foi possível obter sua localização.');
              }
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
          );
          stopRef.current = () => navigator.geolocation.clearWatch(id);
        }
      } catch {
        if (!cancelled) setError('Não foi possível obter sua localização.');
      }
    })();

    return () => {
      cancelled = true;
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [enabled]);

  return { position, error, permissionDenied };
}