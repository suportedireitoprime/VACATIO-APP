/**
 * Bottom-sheet "Avaliar o app" — sobe de baixo para cima.
 *
 * Fluxo:
 *  1. Pergunta se está gostando.
 *  2. Se sim: dispara o prompt nativo do Play/App Store (In-App Review).
 *     Se falhar ou for web, abre a página da loja em nova aba.
 *  3. Se não: abre o SuporteSheet para a pessoa relatar o problema.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { Star, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { requestReviewNow } from '@/lib/inAppReview';
import { openExternal } from '@/lib/nativeBrowser';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=br.com.vacatio.app';
const APP_STORE_URL = 'https://apps.apple.com/br/app/vacatio/id6793608690';
const PLAY_MARKET_URL = 'market://details?id=br.com.vacatio.app';
const APP_STORE_REVIEW_URL =
  'https://apps.apple.com/br/app/vacatio/id6793608690?action=write-review';

interface Props {
  open: boolean;
  onClose: () => void;
  onFeedback?: () => void; // abre suporte quando "não estou gostando"
}

async function openStoreFallback() {
  const isIos = Capacitor.getPlatform() === 'ios';
  if (Capacitor.isNativePlatform()) {
    const primary = isIos ? APP_STORE_REVIEW_URL : PLAY_MARKET_URL;
    try {
      const { AppLauncher } = await import('@capacitor/app-launcher');
      await AppLauncher.openUrl({ url: primary });
      return;
    } catch {
      /* segue para browser */
    }
  }
  await openExternal(isIos ? APP_STORE_REVIEW_URL : PLAY_STORE_URL);
}

const AvaliarAppSheet = ({ open, onClose, onFeedback }: Props) => {
  const handleGostei = async () => {
    // Fecha o sheet primeiro para o prompt nativo aparecer sem sobreposição.
    onClose();
    const ok = await requestReviewNow();
    if (!ok) {
      await openStoreFallback();
      toast.success('Obrigado! Abrimos a loja para você avaliar.');
    }
  };

  const handleNaoGostei = () => {
    onClose();
    onFeedback?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[2100] bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Avaliar o aplicativo"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[2101] bg-card border-t border-border rounded-t-3xl pb-[calc(var(--sai-bottom,env(safe-area-inset-bottom,0px))+1rem)] max-w-lg mx-auto shadow-2xl"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/70 text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-4 pb-2 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                <Star className="w-8 h-8 text-primary fill-primary" strokeWidth={1.5} />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-display text-xl text-foreground font-bold">
                  Está gostando do Vacatio?
                </h2>
                <p className="font-body text-sm text-muted-foreground">
                  Sua avaliação ajuda muitos outros estudantes a nos encontrarem.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5 py-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className="w-6 h-6 text-primary fill-primary drop-shadow-sm"
                    strokeWidth={1.5}
                  />
                ))}
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 space-y-3">
              <button
                onClick={handleGostei}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-body font-semibold hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/25"
              >
                <ThumbsUp className="w-4 h-4" />
                Sim, quero avaliar na loja
              </button>
              <button
                onClick={handleNaoGostei}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-foreground/80 font-body text-sm hover:bg-secondary/70 active:scale-[0.98] transition-all"
              >
                <ThumbsDown className="w-4 h-4" />
                Prefiro dar uma sugestão
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
              >
                Talvez mais tarde
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AvaliarAppSheet;
