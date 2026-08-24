import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { voiceRecorder } from '@/lib/nativeVoiceRecorder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Status = 'idle' | 'recording' | 'paused' | 'saving';

interface Ctx {
  status: Status;
  elapsedMs: number;
  title: string;
  setTitle: (t: string) => void;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<{ id: string } | null>;
  cancel: () => Promise<void>;
}

const RecordingContext = createContext<Ctx | null>(null);

async function scheduleOngoingNotification(title: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [{
        id: 909090,
        title: 'Gravando aula',
        body: title,
        ongoing: true,
        autoCancel: false,
        smallIcon: 'ic_stat_icon_config_sample',
      }],
    });
  } catch { /* ignora se o plugin não estiver configurado */ }
}
async function clearOngoingNotification() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id: 909090 }] });
  } catch {}
}

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [title, setTitle] = useState<string>('');

  const isNative = Capacitor.isNativePlatform();
  const startedAt = useRef(0);
  const accumulated = useRef(0); // ms acumulado antes de pausas
  const tick = useRef<number | null>(null);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const mediaChunks = useRef<Blob[]>([]);
  const mediaStream = useRef<MediaStream | null>(null);

  const startTicker = () => {
    startedAt.current = Date.now();
    tick.current = window.setInterval(() => {
      setElapsedMs(accumulated.current + (Date.now() - startedAt.current));
    }, 500);
  };
  const stopTicker = () => {
    if (tick.current) { clearInterval(tick.current); tick.current = null; }
  };

  const start = useCallback(async () => {
    const t = title.trim() || `Aula ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    setTitle(t);
    accumulated.current = 0;
    setElapsedMs(0);

    if (isNative) {
      const r = await voiceRecorder.start();
      if (!r.ok) { toast.error('Permissão de microfone negada.'); return; }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStream.current = stream;
        const rec = new MediaRecorder(stream);
        mediaChunks.current = [];
        rec.ondataavailable = (e) => { if (e.data.size > 0) mediaChunks.current.push(e.data); };
        rec.start();
        mediaRec.current = rec;
      } catch { toast.error('Sem acesso ao microfone.'); return; }
      // Wake lock: mantém a tela acordada no PWA/desktop
      try { (navigator as any).wakeLock?.request?.('screen').catch(() => {}); } catch {}
    }

    setStatus('recording');
    startTicker();
    scheduleOngoingNotification(t);
  }, [title, isNative]);

  const pause = useCallback(async () => {
    if (status !== 'recording') return;
    stopTicker();
    accumulated.current += Date.now() - startedAt.current;
    if (isNative) {
      await voiceRecorder.pause();
    } else {
      mediaRec.current?.pause();
    }
    setStatus('paused');
  }, [status, isNative]);

  const resume = useCallback(async () => {
    if (status !== 'paused') return;
    if (isNative) {
      await voiceRecorder.resume();
    } else {
      mediaRec.current?.resume();
    }
    startTicker();
    setStatus('recording');
  }, [status, isNative]);

  const stop = useCallback(async (): Promise<{ id: string } | null> => {
    if (status === 'idle') return null;
    stopTicker();
    if (status === 'recording') accumulated.current += Date.now() - startedAt.current;
    setStatus('saving');
    clearOngoingNotification();

    try {
      let bytes: Uint8Array;
      let mime = 'audio/aac';

      if (isNative) {
        const r = await voiceRecorder.stop();
        if (!r.ok || !r.base64) { toast.error('Falha ao salvar gravação.'); setStatus('idle'); return null; }
        mime = r.mimeType || mime;
        const bin = atob(r.base64);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      } else {
        const rec = mediaRec.current;
        if (!rec) { setStatus('idle'); return null; }
        await new Promise<void>((resolve) => { rec.onstop = () => resolve(); rec.stop(); });
        mediaStream.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(mediaChunks.current, { type: rec.mimeType || 'audio/webm' });
        mime = blob.type;
        bytes = new Uint8Array(await blob.arrayBuffer());
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) { toast.error('Faça login para salvar.'); setStatus('idle'); return null; }

      const ext = mime.includes('mp4') || mime.includes('m4a') ? 'm4a'
        : mime.includes('aac') ? 'aac'
        : mime.includes('webm') ? 'webm' : 'wav';
      const recId = crypto.randomUUID();
      const filePath = `${user.id}/${recId}.${ext}`;

      const { error: upErr } = await supabase.storage.from('aulas-audio')
        .upload(filePath, new Blob([bytes as any], { type: mime }), { contentType: mime, upsert: false });
      if (upErr) { toast.error('Falha no upload: ' + upErr.message); setStatus('idle'); return null; }

      const durMs = accumulated.current;
      const { data: row, error: insErr } = await supabase.from('audio_recordings').insert({
        id: recId, user_id: user.id, title, duration_ms: durMs,
        file_path: filePath, status: 'pronto', mode: 'aula',
      }).select('id').single();
      if (insErr) { toast.error(insErr.message); setStatus('idle'); return null; }

      toast.success('Aula salva!');
      setStatus('idle'); setElapsedMs(0); accumulated.current = 0; setTitle('');
      return { id: row!.id as string };
    } catch (e: any) {
      toast.error('Erro ao parar: ' + (e?.message ?? 'desconhecido'));
      setStatus('idle');
      return null;
    }
  }, [status, title, isNative]);

  const cancel = useCallback(async () => {
    stopTicker();
    clearOngoingNotification();
    try {
      if (isNative) await voiceRecorder.stop();
      else {
        mediaRec.current?.stop();
        mediaStream.current?.getTracks().forEach((t) => t.stop());
      }
    } catch {}
    setStatus('idle'); setElapsedMs(0); accumulated.current = 0;
  }, [isNative]);

  // Não desmontamos nada: o provider vive no root, então a gravação continua
  // entre navegações. Ao fechar a aba (web), o navegador encerra o mic sozinho.
  useEffect(() => () => { stopTicker(); }, []);

  return (
    <RecordingContext.Provider value={{ status, elapsedMs, title, setTitle, start, pause, resume, stop, cancel }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error('useRecording deve ser usado dentro de RecordingProvider');
  return ctx;
}

export function formatHms(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}
