import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LEIS_SUPABASE_URL, LEIS_SUPABASE_ANON_KEY } from "@/lib/legislacaoBackend";
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Loader2, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VoicePhase = 'idle' | 'recording' | 'processing';

export interface AppliedPassage {
  lineIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: string;
  colorName: string;
}

interface Candidate {
  lineIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
}

interface Props {
  active: boolean;
  linhas: string[];
  onApplyPassages: (passages: AppliedPassage[]) => void;
  onPhaseChange?: (phase: VoicePhase) => void;
  onDeactivate: () => void;
}

export interface GrifoVoicePanelHandle {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  getPhase: () => VoicePhase;
}

const COLORS: Array<{ name: string; label: string; css: string; ring: string }> = [
  { name: 'amarelo', label: 'Amarelo', css: 'rgba(250, 204, 21, 0.42)', ring: '#EAB308' },
  { name: 'verde', label: 'Verde', css: 'rgba(74, 222, 128, 0.42)', ring: '#22C55E' },
  { name: 'azul', label: 'Azul', css: 'rgba(96, 165, 250, 0.42)', ring: '#3B82F6' },
  { name: 'rosa', label: 'Rosa', css: 'rgba(244, 114, 182, 0.42)', ring: '#EC4899' },
  { name: 'laranja', label: 'Laranja', css: 'rgba(251, 146, 60, 0.42)', ring: '#F97316' },
];

const GrifoVoicePanel = forwardRef<GrifoVoicePanelHandle, Props>(function GrifoVoicePanel(
  { active, linhas, onApplyPassages, onPhaseChange, onDeactivate },
  ref,
) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [aiMessage, setAiMessage] = useState('');
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef('');

  const updatePhase = (p: VoicePhase) => {
    setPhase(p);
    onPhaseChange?.(p);
  };

  useImperativeHandle(ref, () => ({
    start: startRecording,
    stop: stopAndSend,
    getPhase: () => phase,
  }));

  useEffect(() => {
    if (!active) {
      cleanup();
      setTranscript('');
      setInterim('');
      setCandidates(null);
      setAiMessage('');
      updatePhase('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const cleanup = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  };

  const startRecording = async () => {
    if (phase !== 'idle') return;
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error('Reconhecimento de voz não suportado neste navegador');
      return;
    }
    try {
      // request mic permission upfront so denial fails fast
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch {
      toast.error('Preciso da permissão do microfone');
      return;
    }
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = '';
    setTranscript('');
    setInterim('');
    rec.onresult = (event: any) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + ' ';
        else interimText += r[0].transcript;
      }
      setTranscript(finalRef.current);
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      console.error('SpeechRecognition error', e);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast.error('Permissão de microfone negada');
        updatePhase('idle');
      }
    };
    rec.onend = () => {
      // if the recognition dropped while user still wants to talk, restart
      if (recognitionRef.current === rec) {
        try { rec.start(); } catch {}
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      updatePhase('recording');
    } catch (e) {
      console.error(e);
      toast.error('Não consegui iniciar a gravação');
    }
  };

  const stopAndSend = async () => {
    if (phase !== 'recording') return;
    const finalText = (finalRef.current + ' ' + interim).trim();
    cleanup();
    setInterim('');
    if (!finalText || finalText.length < 3) {
      toast.error('Não entendi. Tente novamente falando mais alto.');
      updatePhase('idle');
      return;
    }
    updatePhase('processing');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${LEIS_SUPABASE_URL}/functions/v1/grifar-por-voz`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          apikey: LEIS_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ transcript: finalText, linhas }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        console.error('grifar-por-voz falhou:', resp.status, t);
        toast.error('Falha ao processar');
        updatePhase('idle');
        return;
      }
      const data = await resp.json();
      if (data.needsColor && Array.isArray(data.candidates) && data.candidates.length) {
        setCandidates(data.candidates);
        setAiMessage(data.message || 'Entendi o trecho, mas qual cor você quer usar?');
        updatePhase('idle');
        return;
      }
      const passages: AppliedPassage[] = data.passages || [];
      if (!passages.length) {
        toast.info('Não consegui identificar o trecho. Tente novamente.');
        updatePhase('idle');
        return;
      }
      applyAndClose(passages);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar');
      updatePhase('idle');
    }
  };

  const applyAndClose = (passages: AppliedPassage[]) => {
    onApplyPassages(passages);
    toast.success(`${passages.length} ${passages.length === 1 ? 'trecho grifado' : 'trechos grifados'}`);
    setTranscript('');
    setCandidates(null);
    setAiMessage('');
    updatePhase('idle');
    onDeactivate();
  };

  const pickColor = (color: { name: string; css: string }) => {
    if (!candidates) return;
    const passages: AppliedPassage[] = candidates.map((c) => ({
      ...c,
      color: color.css,
      colorName: color.name,
    }));
    applyAndClose(passages);
  };

  if (!active && !candidates) return null;

  const showTranscript = active && (phase === 'recording' || phase === 'processing' || transcript || interim);

  return createPortal(
    <>
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            key="voice-strip"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="fixed left-1/2 -translate-x-1/2 z-[9995] w-[calc(100vw-1.5rem)] max-w-lg pointer-events-none"
            style={{ bottom: 'calc(9.5rem + var(--sai-bottom,env(safe-area-inset-bottom,0px)))' }}
          >
            <div className="pointer-events-auto rounded-2xl bg-card/95 backdrop-blur-md border border-amber-400/40 shadow-2xl shadow-amber-400/20 px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                {phase === 'processing' ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
                <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400">
                  {phase === 'processing' ? 'Analisando…' : 'Gravando'}
                </span>
                <button
                  type="button"
                  onClick={() => { cleanup(); updatePhase('idle'); onDeactivate(); }}
                  className="ml-auto w-6 h-6 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/60"
                  aria-label="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-foreground leading-snug min-h-[1.25rem]">
                {transcript}
                <span className="text-foreground/50">{interim}</span>
                {!transcript && !interim && (
                  <span className="text-foreground/50 italic">
                    Diga o trecho e a cor. Ex.: "grifa de amarelo do início até condenatória".
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {candidates && (
          <>
            <motion.div
              key="color-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setCandidates(null); onDeactivate(); }}
              className="fixed inset-0 z-[10020] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              key="color-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="fixed left-0 right-0 bottom-0 z-[10021] bg-card border-t border-border rounded-t-3xl shadow-2xl pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] mx-auto max-w-lg"
            >
              <div className="pt-3 pb-2 flex justify-center">
                <span className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="w-5 h-5 text-amber-400" />
                  <h3 className="font-heading text-base font-semibold text-foreground">Escolha a cor</h3>
                </div>
                {aiMessage && (
                  <p className="text-sm text-foreground/85 mb-3 leading-snug">{aiMessage}</p>
                )}
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {candidates.map((c, i) => (
                    <div key={i} className="text-[13px] text-foreground/80 bg-secondary/50 rounded-lg px-3 py-2 border border-border/50">
                      <span className="line-clamp-2">"{c.text}"</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => pickColor(c)}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors active:scale-95"
                    >
                      <span
                        className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
                        style={{ backgroundColor: c.css, borderColor: c.ring }}
                      >
                        <Check className="w-4 h-4 text-foreground/0 group-hover:text-foreground" />
                      </span>
                      <span className="text-[11px] font-medium text-foreground/80">{c.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setCandidates(null); onDeactivate(); }}
                  className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium bg-secondary/40 hover:bg-secondary text-foreground/70"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
});

export default GrifoVoicePanel;
