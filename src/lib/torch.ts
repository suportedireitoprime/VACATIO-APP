/**
 * Controle de lanterna (torch) via MediaStream API.
 * Funciona em WebView Android (Capacitor) e em navegadores Chromium/Android
 * modernos. Não suportado em iOS Safari — nesses casos `isTorchSupported`
 * retorna false e as funções viram no-op.
 */

export interface TorchController {
  stream: MediaStream;
  track: MediaStreamTrack;
  supported: boolean;
  isOn: boolean;
  toggle: (on?: boolean) => Promise<boolean>;
  stop: () => void;
}

export async function startTorchStream(): Promise<TorchController> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  });
  const [track] = stream.getVideoTracks();
  const caps: any = (track as any).getCapabilities?.() ?? {};
  const supported = !!caps.torch;
  let isOn = false;

  const controller: TorchController = {
    stream,
    track,
    supported,
    get isOn() { return isOn; },
    async toggle(on) {
      if (!supported) return false;
      const next = typeof on === 'boolean' ? on : !isOn;
      try {
        await (track as any).applyConstraints({ advanced: [{ torch: next }] });
        isOn = next;
        return isOn;
      } catch {
        return isOn;
      }
    },
    stop() {
      try { track.stop(); } catch {}
      stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    },
  };
  return controller;
}

export async function isTorchLikelySupported(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    const track = stream.getVideoTracks()[0];
    const caps: any = (track as any).getCapabilities?.() ?? {};
    const ok = !!caps.torch;
    stream.getTracks().forEach((t) => t.stop());
    return ok;
  } catch {
    return false;
  }
}
