import { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import horusOwlAsset from '@/assets/horus/horus-owl.png.asset.json';
import horusOwlBundled from '@/assets/horus/horus-owl.webp';
import { pickAsset } from '@/lib/assetUrl';
import { useHorusOnboarding } from './useHorusOnboarding';
import {
  HorusIntroVideo,
  HORUS_INTRO_DURATION,
  HORUS_INTRO_FPS,
  HORUS_INTRO_HEIGHT,
  HORUS_INTRO_PAUSE_FRAME,
  HORUS_INTRO_WIDTH,
  type HorusIntroProps,
} from './HorusIntroVideo';
import { haptic } from '@/lib/nativeHaptics';

type Props = {
  open: boolean;
  onFinished: () => void;
  initialName?: string;
  /** Preview no admin — não grava nada, botão fecha imediatamente. */
  previewMode?: boolean;
  /** Ref exposto para o controller de narração ler frame atual. */
  playerRefExternal?: React.MutableRefObject<PlayerRef | null>;
};

const owlSrc = pickAsset(horusOwlBundled, horusOwlAsset.url);

export default function HorusOnboardingOverlay({
  open,
  onFinished,
  initialName,
  previewMode = false,
  playerRefExternal,
}: Props) {
  const { complete } = useHorusOnboarding();
  const playerRef = useRef<PlayerRef>(null);
  useEffect(() => {
    if (playerRefExternal) playerRefExternal.current = playerRef.current;
  });
  const [phase, setPhase] = useState<'playing' | 'askName' | 'finishing'>(
    'playing',
  );
  const [nome, setNome] = useState(initialName || '');
  const [saving, setSaving] = useState(false);

  const inputProps: HorusIntroProps = useMemo(
    () => ({ owlSrc, nome: nome || 'você' }),
    [nome],
  );

  // Auto-play + pause at the "Como posso te chamar?" frame
  useEffect(() => {
    if (!open) return;
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(0);
    // small delay so seekTo commits before play
    const t = setTimeout(() => p.play(), 60);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const p = playerRef.current;
    if (!p) return;
    let raf = 0;
    const check = () => {
      const f = p.getCurrentFrame();
      if (phase === 'playing' && f >= HORUS_INTRO_PAUSE_FRAME) {
        p.pause();
        setPhase('askName');
        return;
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [open, phase]);

  async function handleContinue() {
    const finalName = nome.trim();
    if (!finalName) return;
    setSaving(true);
    haptic.medium();
    setPhase('finishing');
    const p = playerRef.current;
    if (p) {
      p.seekTo(HORUS_INTRO_PAUSE_FRAME + 10);
      p.play();
    }
    if (!previewMode) {
      await complete(finalName);
    }
    setTimeout(() => {
      onFinished();
    }, 5000);
    setSaving(false);
  }

  async function handleSkip() {
    haptic.selection();
    if (!previewMode) {
      await complete(nome.trim() || undefined);
    }
    onFinished();
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[100] bg-black"
        style={{ paddingTop: 'var(--sai-top,env(safe-area-inset-top,0px))' }}
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          aria-label="Pular apresentação"
          className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition"
          style={{ marginTop: 'var(--sai-top,env(safe-area-inset-top,0px))' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Player container — vertical, fills screen */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full max-w-[520px] mx-auto">
            <Player
              ref={playerRef}
              component={HorusIntroVideo}
              inputProps={inputProps}
              durationInFrames={HORUS_INTRO_DURATION}
              fps={HORUS_INTRO_FPS}
              compositionWidth={HORUS_INTRO_WIDTH}
              compositionHeight={HORUS_INTRO_HEIGHT}
              style={{ width: '100%', height: '100%' }}
              controls={false}
              clickToPlay={false}
              doubleClickToFullscreen={false}
              autoPlay={false}
              loop={false}
            />
          </div>
        </div>

        {/* Name input — appears when video pauses */}
        <AnimatePresence>
          {phase === 'askName' && (
            <motion.div
              key="ask"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute inset-x-0 z-30 p-6"
              style={{
                bottom: 'calc(var(--sai-bottom,env(safe-area-inset-bottom,0px)) + 12vh)',
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.92) 100%)',
              }}
            >
              <div className="max-w-sm mx-auto">
                <label
                  className="block text-white/80 text-sm font-semibold mb-3 tracking-wide"
                  style={{ fontFamily: '"Inter", sans-serif' }}
                >
                  Como posso te chamar?
                </label>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={nome}
                    onChange={(e) => setNome(e.target.value.slice(0, 40))}
                    placeholder="Seu nome"
                    className="flex-1 h-14 px-5 rounded-2xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/40 outline-none focus:border-[#F5C518] focus:bg-white/15 transition"
                    style={{ fontFamily: '"Inter", sans-serif' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && nome.trim()) handleContinue();
                    }}
                  />
                  <button
                    onClick={handleContinue}
                    disabled={!nome.trim() || saving}
                    className="h-14 w-14 rounded-2xl bg-[#F5C518] text-black flex items-center justify-center active:scale-95 transition disabled:opacity-40"
                    aria-label="Continuar"
                  >
                    {saving ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ArrowRight className="w-6 h-6" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
                <button
                  onClick={handleSkip}
                  className="mt-4 w-full text-white/50 text-sm underline underline-offset-2"
                >
                  Pular apresentação
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
