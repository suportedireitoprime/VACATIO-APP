import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerRef } from '@remotion/player';
import { Loader2, Play, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { NarracaoScene } from '@/components/horus/onboarding/horusIntroScript';

type Voice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Aoede' | 'Leda' | 'Orus' | 'Zephyr';
const VOICES: Voice[] = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

type Cached = { id: string; audio: HTMLAudioElement };

export type NarracaoControllerProps = {
  fps: number;
  scenes: NarracaoScene[];
  playerRef: React.MutableRefObject<PlayerRef | null>;
  onScenesChange?: (s: NarracaoScene[]) => void;
};

export default function NarracaoController({
  fps,
  scenes: scenesProp,
  playerRef,
  onScenesChange,
}: NarracaoControllerProps) {
  const [scenes, setScenes] = useState(scenesProp);
  const [voice, setVoice] = useState<Voice>('Kore');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneIdRef = useRef<string | null>(null);

  useEffect(() => setScenes(scenesProp), [scenesProp]);

  const setSceneText = (id: string, text: string) => {
    const next = scenes.map((s) => (s.id === id ? { ...s, text } : s));
    setScenes(next);
    onScenesChange?.(next);
    // invalida cache dessa cena
    cacheRef.current.delete(id);
  };

  const gerar = useCallback(async () => {
    setLoading(true);
    setStatus('Gerando narração…');
    try {
      const { data, error } = await supabase.functions.invoke('triagem-narracao', {
        body: { voice, scenes: scenes.map(({ id, text }) => ({ id, text })) },
      });
      if (error) throw error;
      const list = (data?.scenes || []) as { id: string; audioBase64: string; mime: string }[];
      cacheRef.current.clear();
      for (const s of list) {
        const audio = new Audio(`data:${s.mime};base64,${s.audioBase64}`);
        audio.preload = 'auto';
        cacheRef.current.set(s.id, audio);
      }
      setStatus(`${list.length} cenas prontas • voz ${voice}`);
      toast.success('Narração gerada');
    } catch (e: any) {
      setStatus('');
      toast.error(e?.message || 'Falha ao gerar narração');
    } finally {
      setLoading(false);
    }
  }, [voice, scenes]);

  // Sincronização com o Player
  useEffect(() => {
    if (!enabled) return;
    const p = playerRef.current;
    if (!p) return;
    let raf = 0;
    const tick = () => {
      const frame = p.getCurrentFrame();
      // encontra cena atual
      let current: NarracaoScene | null = null;
      for (let i = scenes.length - 1; i >= 0; i--) {
        if (frame >= scenes[i].startFrame) {
          current = scenes[i];
          break;
        }
      }
      const id = current?.id ?? null;
      if (id !== lastSceneIdRef.current) {
        lastSceneIdRef.current = id;
        // parar áudio antigo
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
          currentAudioRef.current = null;
        }
        if (id) {
          const a = cacheRef.current.get(id);
          if (a) {
            currentAudioRef.current = a;
            a.currentTime = 0;
            a.play().catch(() => {});
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      lastSceneIdRef.current = null;
    };
  }, [enabled, scenes, playerRef]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <div>
            <div className="font-semibold text-sm">Narração (Lovable AI TTS)</div>
            <div className="text-xs text-muted-foreground">{status || 'Gere o áudio antes de ativar.'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value as Voice)}
            className="h-9 px-3 rounded-lg bg-background border border-border text-sm"
          >
            {VOICES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <button
            onClick={gerar}
            disabled={loading}
            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Gerar
          </button>
          <button
            onClick={() => setEnabled((v) => !v)}
            className={`h-9 px-3 rounded-lg text-sm font-semibold flex items-center gap-2 border ${
              enabled ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border'
            }`}
          >
            {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {enabled ? 'Ativado' : 'Desligado'}
          </button>
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Roteiro por cena ({scenes.length})</summary>
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
          {scenes.map((s) => (
            <div key={s.id} className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0 pt-2">{s.id}</span>
              <textarea
                value={s.text}
                onChange={(e) => setSceneText(s.id, e.target.value)}
                className="flex-1 min-h-[52px] text-sm p-2 rounded-lg bg-background border border-border resize-y"
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
