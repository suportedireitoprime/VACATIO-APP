import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const isNative = () => Capacitor.isNativePlatform();
let speechSessionId = 0;

/** Aguarda `speechSynthesis.getVoices()` popular (alguns navegadores populam de forma assíncrona). */
async function waitForVoices(timeoutMs = 800): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (window.speechSynthesis.getVoices().length > 0) return;
  await new Promise<void>((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      resolve();
    };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, timeoutMs);
  });
}

export async function speakNative(text: string, opts?: { lang?: string; rate?: number }): Promise<boolean> {
  const lang = opts?.lang ?? 'pt-BR';
  const rate = opts?.rate ?? 1.0;
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return false;

  const chunkText = (value: string, maxLength = 900) => {
    const sentences = value.match(/[^.!?]+[.!?]*/g) ?? [value];
    const chunks: string[] = [];
    let current = '';
    const flush = () => {
      if (current.trim()) chunks.push(current.trim());
      current = '';
    };

    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) continue;
      if (s.length > maxLength) {
        flush();
        const words = s.split(/\s+/);
        let part = '';
        for (const word of words) {
          if (part && `${part} ${word}`.length > maxLength) {
            chunks.push(part);
            part = word;
          } else {
            part = part ? `${part} ${word}` : word;
          }
        }
        if (part) chunks.push(part);
      } else if (current && `${current} ${s}`.length > maxLength) {
        flush();
        current = s;
      } else {
        current = current ? `${current} ${s}` : s;
      }
    }
    flush();
    return chunks.length ? chunks : [value];
  };

  if (isNative()) {
    try {
      await TextToSpeech.speak({
        text: cleanText,
        lang,
        rate,
        pitch: 1.0,
        volume: 1.0,
        category: 'playback',
      });
      return true;
    } catch (e) {
      console.warn('[nativeTts] failed', e);
      return false;
    }
  }
  // Web fallback
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      // No navegador, o speak() precisa acontecer imediatamente dentro do gesto do clique.
      // Não aguarde getVoices(), fetch, timeout etc. antes de chamar speechSynthesis.speak().
      window.speechSynthesis.cancel();
      try { window.speechSynthesis.resume(); } catch {}
      const sessionId = ++speechSessionId;

      // Escolhe uma voz PT-BR se ela já estiver carregada; se não estiver, usa a voz padrão.
      const voices = window.speechSynthesis.getVoices();
      const preferida =
        voices.find((v) => v.lang?.toLowerCase().startsWith('pt-br')) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith('pt'));
      const chunks = chunkText(cleanText);
      let chunkIndex = 0;
      let stopped = false;

      const makeUtterance = (chunk: string) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = lang;
        utterance.rate = rate;
        if (preferida) utterance.voice = preferida;
        return utterance;
      };

      const speakNext = () => {
        if (stopped || sessionId !== speechSessionId || chunkIndex >= chunks.length) return;
        const next = makeUtterance(chunks[chunkIndex++]);
        next.onend = speakNext;
        try {
          window.speechSynthesis.speak(next);
          try { window.speechSynthesis.resume(); } catch {}
        } catch {}
      };

      const first = makeUtterance(chunks[chunkIndex++]);

      const started = new Promise<boolean>((resolve) => {
        let settled = false;
        const resumeTimer = window.setInterval(() => {
          try { window.speechSynthesis.resume(); } catch {}
        }, 250);
        const settle = (ok: boolean) => {
          if (settled) return;
          settled = true;
          window.clearInterval(resumeTimer);
          if (!ok) stopped = true;
          resolve(ok);
        };
        first.onstart = () => settle(true);
        first.onend = () => {
          settle(true);
          speakNext();
        };
        first.onerror = () => settle(false);
        // Alguns navegadores não disparam onstart, mas atualizam `speaking`.
        setTimeout(() => settle(window.speechSynthesis.speaking), 1200);
        try {
          window.speechSynthesis.speak(first);
          try { window.speechSynthesis.resume(); } catch {}
        } catch {
          settle(false);
        }
      });
      void waitForVoices(1200);
      return await started;
    } catch {
      return false;
    }
  }
  return false;
}

export async function stopNativeSpeech(): Promise<void> {
  speechSessionId++;
  if (isNative()) {
    try { await TextToSpeech.stop(); } catch {}
    return;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
}
