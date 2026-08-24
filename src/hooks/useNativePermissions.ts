import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
// @capacitor/status-bar removido: as APIs Window.setStatusBarColor/setNavigationBarColor
// foram descontinuadas no Android 15. Edge-to-edge + estilo de texto vêm da MainActivity nativa.
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { ensureNativePushListeners, flushPendingNativePushToken, registerNativePushToken } from '@/lib/nativePush';
import { seedFirstOpen, maybeRequestOnSecondOpen } from '@/lib/inAppReview';
import { checkForAppUpdate } from '@/lib/appUpdate';

/**
 * Sets up native-only behaviors on app boot:
 * - Splash screen dismiss
 * - Dark status bar tinted to app theme
 * - Push + local notifications permission prompt
 * - Persist FCM/APNs token in Supabase (`device_tokens`)
 * - Hardware back-button → history navigation (Android)
 *
 * Camera and Microphone permissions are requested on demand by the
 * components that use them (better UX than asking everything up-front).
 */
export function useNativePermissions() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListener: { remove: () => void } | undefined;
    let authListener: { subscription: { unsubscribe: () => void } } | undefined;

    (async () => {
      // 1. Splash — status bar é controlada nativamente por EdgeToEdge.enable()
      // na MainActivity (Android 15/SDK 35). Nenhuma chamada JS necessária.
      try { await SplashScreen.hide(); } catch {}

      // 2. Local notifications — só verifica se já foi concedido; NÃO pede aqui.
      //    A permissão inicial é solicitada no passo final do onboarding
      //    (contextualizada). Se o usuário já concedeu antes, mantém.
      try {
        await LocalNotifications.checkPermissions();
      } catch (e) { console.warn('LocalNotifications check skipped', e); }

      // 2b. Canal Android de alarmes críticos (prova/concurso).
      try {
        const { ensureAlarmChannel } = await import('@/lib/nativeAlarm');
        await ensureAlarmChannel();
      } catch {}

      // 3. Push notifications — registra listeners sempre; só tenta registrar
      //    o token se a permissão já foi concedida (evita popup na 1ª abertura).
      try {
        await ensureNativePushListeners();
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'granted') {
          await registerNativePushToken();
        }
        authListener = supabase.auth.onAuthStateChange(() => {
          window.setTimeout(() => {
            flushPendingNativePushToken();
            // Só re-registra se já autorizado
            PushNotifications.checkPermissions().then((p) => {
              if (p.receive === 'granted') registerNativePushToken();
            });
          }, 250);
        }).data;
      } catch (e) { console.warn('PushNotifications setup skipped', e); }

      // 4. Android back button → history.back / exit at root
      try {
        backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            CapApp.exitApp();
          }
        });
      } catch {}

      // 5. Lock portrait orientation em celulares. Em tablets/foldables,
      //    seguimos a recomendação do Google e deixamos livre (o usuário
      //    decide). Telas individuais ainda podem forçar com
      //    `useLockOrientation('landscape' | 'any')`.
      try {
        const { isTablet } = await import('@/lib/nativeDevice');
        const tablet = await isTablet();
        const { ScreenOrientation } = await import('@capacitor/screen-orientation');
        if (tablet) {
          await ScreenOrientation.unlock();
        } else {
          await ScreenOrientation.lock({ orientation: 'portrait' });
        }
      } catch (e) { console.warn('ScreenOrientation lock skipped', e); }

      // 6. In-app review bookkeeping (seed install date)
      seedFirstOpen();
      // 6b. Segunda abertura do app → prompt nativo de avaliação (uma única vez).
      maybeRequestOnSecondOpen();

      // 7. Google Play in-app update check (flexible by default)
      //    Delayed so it doesn't compete with splash/login network.
      window.setTimeout(() => { checkForAppUpdate(); }, 4000);

      // 8. Guard de captura de tela (Android nativo via FLAG_SECURE / iOS overlay)
      try {
        const { installScreenshotGuard } = await import('@/lib/nativeScreenshotGuard');
        await installScreenshotGuard();
      } catch (e) { console.warn('screenshotGuard skipped', e); }

      // 9. Watcher de geofence pra lembretes por local — inicia se houver sessão
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { startGeofenceWatcher } = await import('@/lib/nativeGeofence');
          startGeofenceWatcher(session.user.id);
        }
      } catch (e) { console.warn('geofence init skipped', e); }
    })();

    return () => {
      backListener?.remove();
      authListener?.subscription.unsubscribe();
    };
  }, []);
}