import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useHorusTakeoverNotice } from '@/hooks/useHorusTakeoverNotice';

export default function HorusTakeoverNoticeDialog() {
  const { notice, acknowledge, maskedEmail, maskedPhone } = useHorusTakeoverNotice();

  return (
    <AnimatePresence>
      {notice && (
        <>
          <motion.div
            key="ov"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            key="dl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-[92%] max-w-md rounded-3xl bg-background border border-border p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 ring-4 ring-amber-500/25 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="font-display text-xl font-bold">
                Seu WhatsApp foi desvinculado
              </h2>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                O número <b className="text-foreground">{maskedPhone}</b> foi verificado por outra conta
                {' '}(<b className="text-foreground">{maskedEmail}</b>).
                <br />
                Por segurança, o vínculo com o seu Horus foi encerrado e o histórico deste número foi apagado.
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Se não foi você quem transferiu, entre em contato com o suporte imediatamente.
              </p>
            </div>
            <button
              onClick={acknowledge}
              className="mt-6 w-full h-12 rounded-2xl font-display font-bold text-base bg-amber-500 text-black active:scale-[0.98] transition-transform"
            >
              Entendi
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
