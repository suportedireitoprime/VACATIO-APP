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
let nativeSilenceTimer: any = null;
let nativeLastText = '';
let nativeOnResult: SpeechListener | null = null;
let isStopping = false;

async function nativeCleanup() {
  if (nativeSilenceTimer) {
    clearTimeout(nativeSilenceTimer);
    nativeSilenceTimer = null;
  }
  try {
    await SpeechRecognition.removeAllListeners();
  } catch {
    /* ignore */
  }
  nativeOnResult = null;
  nativeLastText = '';
  isStopping = false;
}

function armNativeSilenceTimer(ms = 2200) {
  if (nativeSilenceTimer) clearTimeout(nativeSilenceTimer);
  nativeSilenceTimer = setTimeout(async () => {
    if (isStopping) return;
    isStopping = true;
    const text = nativeLastText;
    const cb = nativeOnResult;
    try {
      await SpeechRecognition.stop();
    } catch {
      /* ignore */
    }
    await nativeCleanup();
    if (cb) cb(text, true);
  }, ms);
}

export async function startListening(onResult: SpeechListener, lang = 'pt-BR'): Promise<void> {
  if (isNative()) {
    const ok = await ensureSpeechPermission();
    if (!ok) throw new Error('Permissão de microfone negada');

    // Garante estado limpo antes de reiniciar
    await nativeCleanup();
    nativeOnResult = onResult;
    nativeLastText = '';
    isStopping = false;

    // Escuta resultados parciais em tempo real conforme a pessoa fala
    await SpeechRecognition.addListener('partialResults', (data: any) => {
      const text = (data?.matches?.[0] ?? '').toString().trim();
      if (!text) return;
      nativeLastText = text;
      onResult(text, false);
      // Reinicia janela de silêncio (2.2s dá tempo para pausas naturais na fala)
      armNativeSilenceTimer(2200);
    });

    // Escuta mudança de estado do reconhecedor nativo (ex: silêncio detectado pelo Android)
    await SpeechRecognition.addListener('listeningState', async (data: any) => {
      if (data?.status === 'stopped' && !isStopping) {
        isStopping = true;
        // Pequena folga para capturar o último pacote de texto se houver
        setTimeout(async () => {
          const text = nativeLastText;
          const cb = nativeOnResult;
          await nativeCleanup();
          if (cb) cb(text, true);
        }, 120);
      }
    });

    try {
      // IMPORTANTE: popup: false evita o diálogo modal invasivo do Google
      // permitindo que o microfone funcione diretamente no app com transcrição em tempo real
      await SpeechRecognition.start({
        language: lang,
        partialResults: true,
        popup: false,
        maxResults: 1,
      });
      // Timeout inicial de segurança: se nada for dito em 10s, encerra limpo
      armNativeSilenceTimer(10000);
      return;
    } catch (err: any) {
      await nativeCleanup();
      // Se falhar nativo mas o WebView tiver suporte Web Speech, tenta fallback
      const Ctor: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!Ctor) throw err;
      console.warn('SpeechRecognition nativo falhou, tentando fallback web:', err);
    }
  }

  // Web / WebView fallback
  const Ctor: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) throw new Error('Reconhecimento de voz indisponível neste dispositivo');

  if (webRec) {
    try {
      webRec.abort();
    } catch {
      /* ignore */
    }
    webRec = null;
  }

  webRec = new Ctor();
  webRec.lang = lang;
  webRec.continuous = true;
  webRec.interimResults = true;

  let accumulatedFinal = '';
  let lastReported = '';

  webRec.onresult = (e: any) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const trans = e.results[i][0]?.transcript ?? '';
      if (e.results[i].isFinal) {
        accumulatedFinal += (accumulatedFinal ? ' ' : '') + trans.trim();
      } else {
        interim += trans;
      }
    }
    const current = (accumulatedFinal + (interim ? ' ' + interim : '')).trim();
    if (current) {
      lastReported = current;
      onResult(current, false);
    }
  };

  webRec.onerror = (err: any) => {
    console.warn('Web Speech error:', err?.error);
    if (err?.error === 'not-allowed' || err?.error === 'service-not-allowed') {
      onResult(lastReported, true);
      webRec = null;
    }
  };

  webRec.onend = () => {
    onResult(lastReported, true);
    webRec = null;
  };

  try {
    webRec.start();
  } catch (e: any) {
    webRec = null;
    throw e;
  }
}

/** Para o reconhecimento. `cancel=true` descarta o texto (não chama onFinal). */
export async function stopListening(cancel = false): Promise<void> {
  if (isNative()) {
    const text = nativeLastText;
    const cb = nativeOnResult;
    isStopping = true;
    try {
      await SpeechRecognition.stop();
    } catch {
      /* ignore */
    }
    await nativeCleanup();
    if (!cancel && cb && text) {
      cb(text, true);
    }
    return;
  }
  try {
    if (cancel && webRec) webRec.onresult = null;
    webRec?.stop();
  } catch {
    /* ignore */
  }
  webRec = null;
}

