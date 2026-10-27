import { useCallback, useRef, useState } from 'react';
import { startListening, stopListening, ensureSpeechPermission } from '@/lib/speechRecognition';
import { toast } from 'sonner';

export type VoiceInputCallback = (text: string) => void;
export type VoiceInputOptions = {
  onFinal: (text: string) => void;
  onPartial?: (partial: string) => void;
  lang?: string;
};

export function useVoiceInput(
  handlerOrOptions: VoiceInputCallback | VoiceInputOptions,
  legacyLang = 'pt-BR'
) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const lastRef = useRef('');
  const finalizedRef = useRef(false);

  const options: VoiceInputOptions =
    typeof handlerOrOptions === 'function'
      ? { onFinal: handlerOrOptions, lang: legacyLang }
      : { lang: legacyLang, ...handlerOrOptions };

  const { onFinal, onPartial, lang = 'pt-BR' } = options;

  const start = useCallback(async () => {
    if (listening) return;
    const ok = await ensureSpeechPermission();
    if (!ok) {
      toast.error('Permissão de microfone negada ou indisponível');
      return;
    }
    setPartial('');
    lastRef.current = '';
    finalizedRef.current = false;
    setListening(true);
    try {
      await startListening((text, isFinal) => {
        lastRef.current = text;
        setPartial(text);
        if (onPartial) {
          onPartial(text);
        }
        if (isFinal && !finalizedRef.current) {
          finalizedRef.current = true;
          if (text.trim()) {
            onFinal(text.trim());
          }
          setListening(false);
          setPartial('');
        }
      }, lang);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao iniciar reconhecimento';
      console.warn('Erro ao iniciar reconhecimento de voz:', e);
      toast.error(msg);
      setListening(false);
      setPartial('');
    }
  }, [listening, lang, onFinal, onPartial]);

  // Toque no botão enquanto ouvindo = CANCELAR ou parar
  const stop = useCallback(async () => {
    finalizedRef.current = true;
    await stopListening(true);
    setListening(false);
    setPartial('');
    lastRef.current = '';
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  return { listening, partial, text: partial, start, stop, toggle };
}

