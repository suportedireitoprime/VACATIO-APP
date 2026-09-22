/**
 * Ponte de Picture-in-Picture / continuação em background para videoaulas.
 * O plugin nativo `PipNativo` é injetado pelo workflow build-android.yml
 * (Kotlin). Sem ele, tudo cai em no-op silencioso.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

interface PipNativoPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  /** Liga/desliga o auto-PiP ao sair do app (onUserLeaveHint). */
  setAutoEnter(options: { enabled: boolean }): Promise<void>;
  /** Entra em PiP imediatamente. */
  enter(options?: { width?: number; height?: number }): Promise<void>;
}

const PipNativo = registerPlugin<PipNativoPlugin>('PipNativo');

const isNative = () => Capacitor.isNativePlatform();
let suportado: boolean | null = null;

export async function pipSuportado(): Promise<boolean> {
  if (!isNative()) return false;
  if (suportado !== null) return suportado;
  try {
    const { supported } = await PipNativo.isSupported();
    suportado = supported;
  } catch {
    suportado = false;
  }
  return suportado;
}

/** Ativa o PiP automático enquanto um vídeo está tocando. */
export async function autoPip(ativo: boolean): Promise<void> {
  if (!(await pipSuportado())) return;
  try {
    await PipNativo.setAutoEnter({ enabled: ativo });
  } catch {
    /* noop */
  }
}

/** Entra em PiP na hora (botão "minimizar vídeo"). */
export async function entrarEmPip(aspecto?: { width: number; height: number }): Promise<boolean> {
  if (!(await pipSuportado())) return false;
  try {
    await PipNativo.enter(aspecto ?? { width: 16, height: 9 });
    return true;
  } catch {
    return false;
  }
}
