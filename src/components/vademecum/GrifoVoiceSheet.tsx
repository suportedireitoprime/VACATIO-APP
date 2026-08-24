import { motion, AnimatePresence } from 'framer-motion';
import { LEIS_SUPABASE_URL, LEIS_SUPABASE_ANON_KEY } from "@/lib/legislacaoBackend";
import { X, Mic, Loader2, Lightbulb, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VoicePassage {
  lineIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: string;
  colorName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  linhas: string[];
  onApplyPassages: (passages: VoicePassage[]) => void;
}

const TIPS_KEY = 'oab_grifo_voz_tips_seen';

// Encode Float32 PCM as 16kHz 16-bit mono WAV
function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const merged = new Float32Array(total);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  // downsample to 16000 Hz
  const targetRate = 16000;
  const ratio = sampleRate / targetRate;
  const outLen = Math.floor(merged.length / ratio);
  const down = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = Math.floor(i * ratio);
    down[i] = merged[idx];
  }
  const buffer = new ArrayBuffer(44 + down.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + down.length * 2, true);
  writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); writeStr(36, 'data');
  view.setUint32(40, down.length * 2, true);
  let o = 44;
  for (let i = 0; i < down.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, down[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

const GrifoVoiceSheet = ({ open, onClose, linhas, onApplyPassages }: Props) => {
  const [showTips, setShowTips] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'processing'>('idle');
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  useEffect(() => {
    if (open) {
      const seen = localStorage.getItem(TIPS_KEY);
      setShowTips(!seen);
      setPhase('idle');
    }
    return () => { cleanup(); };
     
  }, [open]);

  const cleanup = () => {
    try { nodeRef.current?.disconnect(); } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    try { ctxRef.current?.close(); } catch {}
    nodeRef.current = null; sourceRef.current = null;
    streamRef.current = null; ctxRef.current = null;
    chunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;
      chunksRef.current = [];
      node.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(node);
      node.connect(ctx.destination);
      setPhase('recording');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopAndSend = async () => {
    if (phase !== 'recording') return;
    const chunks = chunksRef.current;
    const rate = ctxRef.current?.sampleRate || 44100;
    setPhase('processing');
    cleanup();

    if (chunks.length === 0) {
      toast.error('Gravação vazia. Tente novamente.');
      setPhase('idle');
      return;
    }
    const wav = encodeWav(chunks, rate);
    if (wav.size < 2048) {
      toast.error('Gravação muito curta. Tente novamente.');
      setPhase('idle');
      return;
    }

    try {
      const form = new FormData();
      form.append('audio', wav, 'grifo.wav');
      form.append('linhas', JSON.stringify(linhas));

      const { data: { session } } = await supabase.auth.getSession();
      const url = `${LEIS_SUPABASE_URL}/functions/v1/grifar-por-voz`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          apikey: LEIS_SUPABASE_ANON_KEY,
        },
        body: form,
      });
      if (!resp.ok) {
        const t = await resp.text();
        console.error('grifar-por-voz falhou:', resp.status, t);
        toast.error('Falha ao processar áudio');
        setPhase('idle');
        return;
      }
      const data = await resp.json();
      const passages: VoicePassage[] = data.passages || [];
      if (passages.length === 0) {
        toast.info('Não consegui identificar o trecho. Tente novamente falando mais devagar.');
        setPhase('idle');
        return;
      }
      onApplyPassages(passages);
      toast.success(`${passages.length} ${passages.length === 1 ? 'trecho grifado' : 'trechos grifados'}`);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar áudio');
      setPhase('idle');
    }
  };

  const dismissTips = (e?: React.MouseEvent | React.PointerEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    try { localStorage.setItem(TIPS_KEY, '1'); } catch {}
    setShowTips(false);
  };


  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="grifo-voz-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => { e.stopPropagation(); if (phase === 'idle') onClose(); }}
        onClick={(e) => { e.stopPropagation(); if (phase === 'idle') onClose(); }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10010] pointer-events-auto"
      />
      <motion.div
        key="grifo-voz-card"
        initial={{ opacity: 0, x: '-50%', y: 'calc(-50% + 20px)', scale: 0.95 }}
        animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
        exit={{ opacity: 0, x: '-50%', y: 'calc(-50% + 20px)', scale: 0.95 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        className="fixed left-1/2 top-1/2 z-[10011] w-[calc(100vw-2rem)] max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 pointer-events-auto"
      >

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-400" />
            <h3 className="font-heading text-lg font-semibold text-foreground">Grifar por voz</h3>
          </div>
          <button
            type="button"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onPointerUp={(e) => { e.stopPropagation(); onClose(); }}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            disabled={phase === 'processing'}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showTips ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/85 leading-relaxed">
                Dicas para grifar melhor por voz:
              </p>
            </div>
            <ul className="text-sm text-foreground/80 space-y-2 pl-8 list-disc">
              <li>Diga a <b>cor</b>: amarelo, verde, azul, rosa ou laranja.</li>
              <li>Cite <b>palavras exatas</b>: "grifa de amarelo do início até condenatória".</li>
              <li>Fale <b>devagar</b>, uma passagem por vez ou várias em sequência.</li>
              <li>Ex.: "grifa de verde a parte que fala em efeitos penais".</li>
            </ul>
            <button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onPointerUp={dismissTips}
              onClick={dismissTips}
              className="w-full mt-3 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-transform"
            >
              Entendi, vamos lá
            </button>

          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <motion.button
              type="button"
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              onPointerUp={(e) => { e.stopPropagation(); phase === 'recording' ? stopAndSend() : startRecording(); }}
              onClick={(e) => { e.stopPropagation(); phase === 'recording' ? stopAndSend() : startRecording(); }}
              disabled={phase === 'processing'}
              animate={phase === 'recording' ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={phase === 'recording' ? { duration: 1.2, repeat: Infinity } : {}}
              className={`w-28 h-28 rounded-full flex items-center justify-center shadow-xl transition-colors ${
                phase === 'recording' ? 'bg-red-500 shadow-red-500/40' :
                phase === 'processing' ? 'bg-secondary' :
                'bg-amber-400 shadow-amber-400/30 hover:bg-amber-300'
              }`}
            >
              {phase === 'processing' ? (
                <Loader2 className="w-10 h-10 text-foreground animate-spin" />
              ) : phase === 'recording' ? (
                <Square className="w-10 h-10 text-white fill-white" />
              ) : (
                <Mic className="w-10 h-10 text-black" />
              )}
            </motion.button>
            <p className="text-center text-sm text-foreground/80 min-h-[3rem] px-2">
              {phase === 'idle' && 'Toque no microfone e diga o trecho e a cor. Ex.: "grifa de amarelo do início até condenatória".'}
              {phase === 'recording' && 'Gravando… toque no quadrado para enviar.'}
              {phase === 'processing' && 'Analisando com a IA…'}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default GrifoVoiceSheet;
