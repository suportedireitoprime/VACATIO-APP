import { useCallback, useEffect, useRef, useState } from 'react';
import { startTorchStream, type TorchController } from '@/lib/torch';

/**
 * Hook para lanterna do celular. Anexa a stream de vídeo em `videoRef`
 * (opcional) para dar preview ao usuário. Se `videoRef` for omitido,
 * a stream fica ativa em background só para controlar o torch.
 */
export function useTorch(videoRef?: React.RefObject<HTMLVideoElement>) {
  const ctrlRef = useRef<TorchController | null>(null);
  const [on, setOn] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (ctrlRef.current) return;
    try {
      const c = await startTorchStream();
      ctrlRef.current = c;
      setSupported(c.supported);
      if (videoRef?.current) {
        videoRef.current.srcObject = c.stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message ?? 'Câmera indisponível');
      setSupported(false);
    }
  }, [videoRef]);

  const stop = useCallback(() => {
    ctrlRef.current?.stop();
    ctrlRef.current = null;
    setOn(false);
  }, []);

  const toggle = useCallback(async (next?: boolean) => {
    if (!ctrlRef.current) await start();
    const c = ctrlRef.current;
    if (!c) return false;
    const result = await c.toggle(next);
    setOn(result);
    return result;
  }, [start]);

  useEffect(() => () => { stop(); }, [stop]);

  return { on, supported, error, start, stop, toggle };
}
