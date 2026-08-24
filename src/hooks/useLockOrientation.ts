/**
 * Lock screen orientation while a component is mounted.
 * On unmount, reverts to the app-wide default (portrait).
 * No-op on web.
 */
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

type Mode = 'portrait' | 'landscape' | 'any';

export function useLockOrientation(mode: Mode) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;

    (async () => {
      try {
        const { ScreenOrientation } = await import('@capacitor/screen-orientation');
        if (cancelled) return;
        if (mode === 'any') {
          await ScreenOrientation.unlock();
        } else {
          await ScreenOrientation.lock({ orientation: mode });
        }
      } catch (e) {
        console.warn('[useLockOrientation] failed', e);
      }
    })();

    return () => {
      cancelled = true;
      if (!Capacitor.isNativePlatform()) return;
      // revert to app default (portrait)
      import('@capacitor/screen-orientation')
        .then(({ ScreenOrientation }) =>
          ScreenOrientation.lock({ orientation: 'portrait' }),
        )
        .catch(() => {});
    };
  }, [mode]);
}
