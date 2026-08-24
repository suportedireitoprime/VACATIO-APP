// Detecção de "virar o celular" para uso em flashcards.
// Usa DeviceOrientationEvent (web) ou @capacitor/motion (não instalado —
// via addListener('orientation') do @capacitor/device fallback).
// Solução simplificada: escuta window.deviceorientation, com wrapper
// que pede permissão em iOS 13+.

export type FlipCallback = (side: 'front' | 'back') => void;

interface OrientationSample { beta: number; gamma: number; }

async function requestIOSPermission(): Promise<boolean> {
  const anyDOE: any = (window as any).DeviceOrientationEvent;
  if (anyDOE && typeof anyDOE.requestPermission === 'function') {
    try {
      const res = await anyDOE.requestPermission();
      return res === 'granted';
    } catch { return false; }
  }
  return true;
}

/**
 * Escuta inclinação. Chama `onFlip('back')` quando o usuário vira o
 * celular > 60° de frente pra trás, e `onFlip('front')` quando volta.
 * Retorna função de cleanup.
 */
export async function watchFlip(onFlip: FlipCallback): Promise<() => void> {
  const ok = await requestIOSPermission();
  if (!ok) return () => {};

  let currentSide: 'front' | 'back' = 'front';
  const handler = (e: DeviceOrientationEvent) => {
    const beta = e.beta ?? 0; // -180..180 (frente/trás)
    const gamma = e.gamma ?? 0; // -90..90 (lateral)
    const abs = Math.abs(beta);
    // Se está deitado (|beta| > 120) ou de cabeça pra baixo, considera "back"
    const side: 'front' | 'back' = abs > 120 || Math.abs(gamma) > 70 ? 'back' : 'front';
    if (side !== currentSide) {
      currentSide = side;
      onFlip(side);
    }
  };
  window.addEventListener('deviceorientation', handler);
  return () => window.removeEventListener('deviceorientation', handler);
}
