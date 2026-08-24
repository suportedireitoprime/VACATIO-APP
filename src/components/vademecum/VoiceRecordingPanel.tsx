import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

interface Props {
  open: boolean;
  transcript: string;
}

/**
 * Painel flutuante mostrado acima do input enquanto o usuário está ditando.
 * Renderiza o texto em tempo real e uma onda sonora animada. A onda tenta
 * capturar o nível real do microfone via Web Audio; em plataformas onde o
 * getUserMedia não está disponível ou já foi tomado pelo plugin nativo de
 * reconhecimento de voz, cai numa animação decorativa suave.
 */
export default function VoiceRecordingPanel({ open, transcript }: Props) {
  const [levels, setLevels] = useState<number[]>(() => Array(48).fill(0.15));
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let usingReal = false;
    const BARS = 48;

    async function setupMic() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const AC = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new AC();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        usingReal = true;
      } catch {
        // fallback silencioso
      }
    }

    setupMic();

    const buf = new Uint8Array(128);
    const tick = () => {
      if (cancelled) return;
      const analyser = analyserRef.current;
      if (usingReal && analyser) {
        analyser.getByteFrequencyData(buf);
        const next: number[] = [];
        const step = Math.floor(buf.length / BARS);
        for (let i = 0; i < BARS; i++) {
          const v = buf[i * step] / 255;
          next.push(Math.max(0.08, v));
        }
        setLevels(next);
      } else {
        // Animação decorativa: onda senoidal com jitter, evocando fala.
        const t = performance.now() / 220;
        const next: number[] = [];
        for (let i = 0; i < BARS; i++) {
          const wave = 0.35 + Math.sin(t + i * 0.35) * 0.25 + Math.sin(t * 1.7 + i * 0.9) * 0.15;
          const jitter = (Math.random() - 0.5) * 0.15;
          next.push(Math.max(0.08, Math.min(1, wave + jitter)));
        }
        setLevels(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      analyserRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="voice-panel"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="absolute left-3 right-3 bottom-full mb-2 z-10 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl overflow-hidden"
        >
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-border/60">
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-70" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-[11px] font-body font-semibold uppercase tracking-wider text-muted-foreground">
              Ouvindo — toque no microfone para parar
            </span>
            <Mic className="w-3.5 h-3.5 text-red-400 ml-auto" />
          </div>

          <div className="px-4 py-3 min-h-[52px] max-h-[140px] overflow-y-auto">
            {transcript ? (
              <p className="font-body text-[15px] leading-snug text-foreground">
                {transcript}
                <span className="inline-block w-[2px] h-[14px] bg-primary align-middle ml-0.5 animate-pulse" />
              </p>
            ) : (
              <p className="font-body text-sm text-muted-foreground italic">Fale agora…</p>
            )}
          </div>

          <div className="px-3 pb-3">
            <div className="flex items-center justify-between gap-[2px] h-10">
              {levels.map((lvl, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-full bg-primary/80"
                  style={{
                    height: `${Math.max(8, lvl * 100)}%`,
                    transition: 'height 60ms linear',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
