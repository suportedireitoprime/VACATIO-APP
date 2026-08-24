import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function useUserLocation(auto = false) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            throw new Error('Permissão de localização negada.');
          }
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      } else {
        if (!('geolocation' in navigator)) {
          throw new Error('Geolocalização não suportada neste navegador.');
        }
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              });
              resolve();
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
          );
        });
      }
    } catch (err) {
      setError((err as Error).message || 'Não foi possível obter sua localização.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auto) request();
  }, [auto, request]);

  return { location, loading, error, request, setLocation };
}
