import { useCallback, useRef, useState } from 'react';
import { startListening, stopListening, ensureSpeechPermission } from '@/lib/speechRecognition';
import { toast } from 'sonner';

export function useVoiceInput(onFinal: (text: string) => void, lang = 'pt-BR') {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const lastRef = useRef('');
  const finalizedRef = useRef(false);

  const start = useCallback(async () => {
    if (listening) return;
    const ok = await ensureSpeechPermission();
    if (!ok) {
      toast.error('Permissão de microfone negada');
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
        if (isFinal && !finalizedRef.current) {
          finalizedRef.current = true;
          onFinal(text);
          setListening(false);
          setPartial('');
        }
      }, lang);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao iniciar reconhecimento');
      setListening(false);
    }
  }, [listening, lang, onFinal]);

  // Toque no botão enquanto ouvindo = CANCELAR (não envia).
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

  return { listening, partial, start, stop, toggle };
}
