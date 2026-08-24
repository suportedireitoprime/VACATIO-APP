/**
 * Mantém a tela acesa durante estudo/áudio.
 * Nativo: @capacitor-community/keep-awake. Web: Screen Wake Lock API quando existir.
 * Contagem de referências: várias telas podem pedir ao mesmo tempo.
 */
import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();
const donos = new Set<string>();
let webLock: { release: () => Promise<void> } | null = null;

async function aplicar() {
  const querAcordado = donos.size > 0;
  if (isNative()) {
    try {
      const { KeepAwake } = await import('@capacitor-community/keep-awake');
      if (querAcordado) await KeepAwake.keepAwake();
      else await KeepAwake.allowSleep();
    } catch {
      /* enhancement — nunca quebra a UX */
    }
    return;
  }
  // Web / PWA
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (querAcordado) {
      if (!webLock && nav.wakeLock) webLock = await nav.wakeLock.request('screen');
    } else if (webLock) {
      await webLock.release();
      webLock = null;
    }
  } catch {
    /* noop */
  }
}

/** Pede para a tela ficar acesa. `motivo` identifica quem pediu. */
export async function manterTelaAcesa(motivo: string): Promise<void> {
  donos.add(motivo);
  await aplicar();
}

/** Libera o pedido daquele `motivo`. A tela só volta a apagar quando ninguém mais pedir. */
export async function liberarTela(motivo: string): Promise<void> {
  donos.delete(motivo);
  await aplicar();
}

/** Liga/desliga conforme `ativo` (ideal em useEffect). */
export async function telaAcesa(motivo: string, ativo: boolean): Promise<void> {
  if (ativo) await manterTelaAcesa(motivo);
  else await liberarTela(motivo);
}
