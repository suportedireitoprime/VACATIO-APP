import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

/**
 * Badge fixo que aparece quando o dispositivo está offline.
 * No app nativo usa @capacitor/network (100% preciso); na web usa
 * os eventos `online`/`offline` do window.
 */
export default function OfflineStatusBadge() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    let removeNative: (() => void) | undefined;

    if (Capacitor.isNativePlatform()) {
      let cancelled = false;
      (async () => {
        try {
          const { Network } = await import('@capacitor/network');
          const status = await Network.getStatus();
          if (!cancelled) setOffline(!status.connected);
          const handle = await Network.addListener('networkStatusChange', (s) => {
            setOffline(!s.connected);
          });
          removeNative = () => handle.remove();
        } catch (e) {
          console.warn('Network plugin unavailable, falling back to navigator.onLine', e);
        }
      })();

      const onOnline = () => setOffline(false);
      const onOffline = () => setOffline(true);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        cancelled = true;
        removeNative?.();
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[70] pointer-events-none"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/95 text-white text-xs font-semibold shadow-lg backdrop-blur">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Modo offline</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
