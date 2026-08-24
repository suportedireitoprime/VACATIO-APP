/**
 * Wrapper around @capacitor/device.
 * Detecta se o dispositivo é tablet (menor lado ≥ 600dp) usando a proporção
 * de tela e memória. Também expõe modelo/OS para segmentar Push/analytics.
 * No-op na web (retorna heurísticas baseadas em innerWidth).
 */
import { Capacitor } from '@capacitor/core';

export type DeviceKind = 'phone' | 'tablet' | 'desktop';

let cached: {
  kind: DeviceKind;
  model?: string;
  osVersion?: string;
  platform: 'android' | 'ios' | 'web';
} | null = null;

export async function getDeviceInfo() {
  if (cached) return cached;

  const platform = (Capacitor.getPlatform?.() ?? 'web') as
    | 'android'
    | 'ios'
    | 'web';

  // Web fallback
  if (!Capacitor.isNativePlatform()) {
    const w = typeof window !== 'undefined' ? window.innerWidth : 0;
    cached = {
      kind: w >= 1024 ? 'desktop' : w >= 600 ? 'tablet' : 'phone',
      platform: 'web',
    };
    return cached;
  }

  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    // Regra Google: menor lado (em dp) ≥ 600 → tablet.
    // Usamos innerWidth/innerHeight já em CSS px (equivalente a dp).
    const w = window.innerWidth;
    const h = window.innerHeight;
    const smallestSide = Math.min(w, h);
    const kind: DeviceKind = smallestSide >= 600 ? 'tablet' : 'phone';
    cached = {
      kind,
      model: info.model,
      osVersion: info.osVersion,
      platform,
    };
  } catch {
    cached = { kind: 'phone', platform };
  }
  return cached;
}

export async function isTablet(): Promise<boolean> {
  const info = await getDeviceInfo();
  return info.kind === 'tablet';
}
