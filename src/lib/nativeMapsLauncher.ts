// Abre um endereço ou coordenada no app de mapas favorito do usuário.
// Usa @capawesome/capacitor-maps-launcher no nativo; fallback web abre
// Google Maps em nova aba.

import { Capacitor } from '@capacitor/core';

export interface OpenMapOptions {
  lat?: number;
  lng?: number;
  address?: string;
  label?: string;
}

export async function openMap(opts: OpenMapOptions): Promise<void> {
  const { lat, lng, address, label } = opts;

  if (Capacitor.isNativePlatform()) {
    try {
      const mod: any = await import('@capawesome/capacitor-maps-launcher');
      const MapsLauncher = mod.MapsLauncher;
      if (typeof lat === 'number' && typeof lng === 'number') {
        await MapsLauncher.showLocation({
          latitude: lat,
          longitude: lng,
          label: label ?? 'Destino',
        });
        return;
      }
      if (address) {
        // Fallback: usa deep-link universal do Google Maps.
        const url = `geo:0,0?q=${encodeURIComponent(address)}`;
        const { AppLauncher } = await import('@capacitor/app-launcher');
        const can = await AppLauncher.canOpenUrl({ url });
        if (can.value) { await AppLauncher.openUrl({ url }); return; }
      }
    } catch (e) {
      console.warn('[mapsLauncher] falhou nativo', e);
    }
  }

  // Web / fallback
  let webUrl: string;
  if (typeof lat === 'number' && typeof lng === 'number') {
    webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  } else if (address) {
    webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  } else {
    return;
  }
  window.open(webUrl, '_blank', 'noopener');
}
