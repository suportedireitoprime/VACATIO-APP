import { useCallback, useEffect, useRef, useState } from 'react';

const MUTE_KEY = 'triagem:muted';

export type Sfx = 'tap' | 'whoosh' | 'ding';

/**
 * Áudio da triagem — sem música ambiente.
 *
 * Os SFX são sintetizados na hora com WebAudio (nada de sample de "game"):
 * um toque sóbrio de madeira/marimba na seleção, um ar curto na transição e
 * um acorde discreto no final. Timbres suaves, curtos e com pouca presença.
 */
export function useTriagemAudio(_active: boolean) {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MUTE_KEY) === '1';
  });
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current) ctxRef.current = new AC();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => void 0);
    return ctxRef.current;
  }, []);

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => void 0);
      ctxRef.current = null;
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  const playSfx = useCallback(
    (kind: Sfx) => {
      if (muted) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      try {
        if (kind === 'whoosh') {
          // Ar curto e abafado — transição entre telas.
          const dur = 0.32;
          const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
          const ch = buf.getChannelData(0);
          for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.Q.value = 0.9;
          filter.frequency.setValueAtTime(320, t);
          filter.frequency.exponentialRampToValueAtTime(1100, t + dur);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.06, t + 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          src.connect(filter).connect(g).connect(ctx.destination);
          src.start(t);
          src.stop(t + dur);
          return;
        }

        // Notas: 'tap' = toque único sóbrio; 'ding' = intervalo discreto.
        const notes = kind === 'ding' ? [523.25, 783.99] : [392.0];
        notes.forEach((freq, idx) => {
          const start = t + idx * 0.09;
          const dur = kind === 'ding' ? 1.1 : 0.26;
          const peak = kind === 'ding' ? 0.12 : 0.09;

          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          // Harmônico fraco dá corpo de madeira sem soar sintético.
          const osc2 = ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq * 2.01, start);
          const g2 = ctx.createGain();
          g2.gain.setValueAtTime(peak * 0.22, start);
          g2.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.5);

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 2600;

          osc.connect(g);
          osc2.connect(g2).connect(g);
          g.connect(lp).connect(ctx.destination);

          osc.start(start);
          osc2.start(start);
          osc.stop(start + dur + 0.02);
          osc2.stop(start + dur + 0.02);
        });
      } catch {}
    },
    [muted, getCtx],
  );

  return { muted, toggleMute, playSfx };
}
