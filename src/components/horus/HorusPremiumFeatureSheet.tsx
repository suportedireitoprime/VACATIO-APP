import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Check, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '@/lib/nativeHaptics';
import { motion } from 'framer-motion';
import horusOwl from '@/assets/horus/horus-owl.png.asset.json';
import PremiumFeaturesFullSheet from './PremiumFeaturesFullSheet';

export type HorusCapabilityKey = 'texto' | 'audio' | 'pdf' | 'imagem';

const LABELS: Record<HorusCapabilityKey, { title: string; desc: string; verb: string }> = {
  texto:  { title: 'Texto', desc: 'Enviar mensagens de texto', verb: 'mandar texto' },
  audio:  { title: 'Áudio', desc: 'Enviar áudios pra ele escutar e transcrever', verb: 'mandar áudio' },
  pdf:    { title: 'PDF',   desc: 'Enviar PDFs pra ele ler, resumir e explicar', verb: 'mandar PDF' },
  imagem: { title: 'Imagem', desc: 'Enviar fotos pra ele analisar', verb: 'mandar imagem' },
};

interface Props {
  open: boolean;
  onClose: () => void;
  capability: HorusCapabilityKey | null;
}

export default function HorusPremiumFeatureSheet({ open, onClose, capability }: Props) {
  const navigate = useNavigate();
  const info = capability ? LABELS[capability] : LABELS.audio;
  const [fullOpen, setFullOpen] = useState(false);

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="bottom"
        className="p-0 border-none bg-transparent shadow-none max-h-[90dvh]"
      >
        <div className="mx-auto max-w-lg rounded-t-3xl overflow-hidden bg-background/95 backdrop-blur-xl border border-white/10">
          <div
            className="relative px-6 pt-8 pb-6 text-center"
            style={{
              background: 'linear-gradient(135deg, hsl(45 95% 55% / 0.18) 0%, hsl(45 95% 55% / 0.04) 100%)',
            }}
          >
            <div className="mx-auto w-1.5 h-1 rounded-full bg-foreground/20 mb-5" />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="relative mx-auto mb-3 w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, hsl(45 95% 55% / 0.25) 0%, hsl(35 95% 50% / 0.1) 100%)',
                boxShadow: '0 12px 32px -8px hsl(45 95% 55% / 0.55)',
              }}
            >
              <img
                src={horusOwl.url}
                alt="Horus"
                className="w-full h-full object-contain relative z-0"
                draggable={false}
              />
              <motion.div
                aria-hidden
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)',
                  mixBlendMode: 'screen',
                }}
                animate={{ x: ['-120%', '120%'] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
              />
            </motion.div>
            <SheetHeader className="space-y-1">
              <div className="inline-flex mx-auto items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="font-body text-[10px] font-bold text-amber-300 uppercase tracking-wider">Premium</span>
              </div>
              <SheetTitle className="font-display text-2xl font-black text-foreground">
                {info.title} é do Premium
              </SheetTitle>
            </SheetHeader>
            <p className="font-body text-sm text-muted-foreground mt-2 max-w-[300px] mx-auto">
              Pra {info.verb} pro Horus, você precisa ser assinante. Bora começar com <span className="font-semibold text-foreground">7 dias grátis</span>?
            </p>
          </div>

          <div className="px-6 py-5 space-y-3">
            <div className="rounded-2xl bg-secondary/50 border border-border/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  O que muda com o Premium?
                </p>
                <button
                  onClick={() => { haptic.selection(); setFullOpen(true); }}
                  className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Ver mais <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {[
                'Enviar áudio, PDF e imagem no WhatsApp',
                'Horus lê, transcreve e resume tudo pra você',
                'Continua recebendo alertas e notificações',
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-400" strokeWidth={3} />
                  </div>
                  <span className="font-body text-sm text-foreground">{t}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-background/60 border border-border/50 p-3">
              <p className="font-body text-[11px] text-muted-foreground leading-relaxed">
                No plano gratuito você continua podendo <span className="font-semibold text-foreground">mandar texto</span> pro Horus e receber notificações normalmente.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => {
                  haptic.medium();
                  onClose();
                  navigate('/perfil?tab=assinaturas');
                }}
                className="w-full h-12 rounded-2xl font-display text-base font-bold text-black"
                style={{
                  background: 'linear-gradient(135deg, hsl(45 95% 55%) 0%, hsl(35 95% 50%) 100%)',
                  boxShadow: '0 8px 20px -6px hsl(45 95% 55% / 0.5)',
                }}
              >
                <Crown className="w-4 h-4 mr-2" />
                Começar 7 dias grátis
              </Button>
              <button
                onClick={() => { haptic.selection(); onClose(); }}
                className="w-full h-11 rounded-2xl font-body text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <PremiumFeaturesFullSheet open={fullOpen} onClose={() => setFullOpen(false)} />
    </>
  );
}
