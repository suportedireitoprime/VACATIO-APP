import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const isNative = () => Capacitor.isNativePlatform();

export async function ensureSpeechPermission(): Promise<boolean> {
  if (!isNative()) return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  try {
    const avail = await SpeechRecognition.available();
    if (!avail.available) return false;
    const perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition === 'granted') return true;
    const req = await SpeechRecognition.requestPermissions();
    return req.speechRecognition === 'granted';
  } catch {
    return false;
  }
}

export type SpeechListener = (partial: string, isFinal: boolean) => void;

let webRec: any = null;
// Guard nativo: o plugin não emite `isFinal` em partialResults.
// Detectamos fim via `listeningState=stopped` (auto-stop por silêncio no
// Android) e também via silêncio prolongado sem novos partials.
let nativeSilenceTimer: any = null;
let nativeLastText = '';
let nativeOnResult: SpeechListener | null = null;

async function nativeCleanup() {
  try { await SpeechRecognition.removeAllListeners(); } catch { /* ignore */ }
  if (nativeSilenceTimer) { clearTimeout(nativeSilenceTimer); nativeSilenceTimer = null; }
  nativeOnResult = null;
  nativeLastText = '';
}

function armNativeSilenceTimer(ms = 1500) {
  if (nativeSilenceTimer) clearTimeout(nativeSilenceTimer);
  nativeSilenceTimer = setTimeout(() => {
    // Silêncio → considera final. Emite e finaliza plugin.
    const text = nativeLastText;
    const cb = nativeOnResult;
    // Para o plugin (dispara listeningState=stopped, que também limpa).
    SpeechRecognition.stop().catch(() => { /* ignore */ });
    if (cb && text) cb(text, true);
  }, ms);
}

export async function startListening(onResult: SpeechListener, lang = 'pt-BR'): Promise<void> {
  if (isNative()) {
    const ok = await ensureSpeechPermission();
    if (!ok) throw new Error('Permissão de microfone negada');

    // Garante estado limpo antes de reiniciar.
    await nativeCleanup();
    nativeOnResult = onResult;
    nativeLastText = '';

    await SpeechRecognition.addListener('partialResults', (data: any) => {
      const text = (data?.matches?.[0] ?? '').toString();
      if (!text) return;
      nativeLastText = text;
      onResult(text, false);
      // Reinicia janela de silêncio a cada novo trecho reconhecido.
      armNativeSilenceTimer(1500);
    });

    await SpeechRecognition.addListener('listeningState', async (data: any) => {
      if (data?.status === 'stopped') {
        const text = nativeLastText;
        const cb = nativeOnResult;
        await nativeCleanup();
        if (cb && text) cb(text, true);
      }
    });

    await SpeechRecognition.start({
      language: lang,
      partialResults: true,
      popup: false,
      maxResults: 1,
    });
    // Timeout de segurança: se nada for reconhecido em 8s, encerra.
    armNativeSilenceTimer(8000);
    return;
  }

  // Web fallback
  const Ctor: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) throw new Error('Reconhecimento de voz indisponível neste navegador');
  webRec = new Ctor();
  webRec.lang = lang;
  webRec.continuous = false;
  webRec.interimResults = true;
  webRec.onresult = (e: any) => {
    let text = '';
    let isFinal = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) isFinal = true;
    }
    onResult(text, isFinal);
  };
  webRec.onerror = () => {};
  webRec.start();
}

/** Para o reconhecimento. `cancel=true` descarta o texto (não chama onFinal). */
export async function stopListening(cancel = false): Promise<void> {
  if (isNative()) {
    if (cancel) {
      // Cancela sem emitir final: zera callback antes de parar.
      nativeOnResult = null;
      nativeLastText = '';
    }
    try { await SpeechRecognition.stop(); } catch { /* ignore */ }
    await nativeCleanup();
    return;
  }
  try {
    if (cancel && webRec) webRec.onresult = null;
    webRec?.stop();
  } catch { /* ignore */ }
  webRec = null;
}
