import type { CapacitorConfig } from '@capacitor/cli';

const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || '833040915353-t4op5194chqh14kbig98h0pe8c0j8irq.apps.googleusercontent.com';
// OAuth Android atual no google-services.json:
// 833040915353-gkvhq1b2f4d1aou1mkd1nshhlubgvrdk.apps.googleusercontent.com

const config: CapacitorConfig = {
  appId: 'br.com.vacatio.app',
  appName: 'Vacatio',
  webDir: 'dist',
  // 🔥 Hot-reload durante desenvolvimento. REMOVA o bloco `server` inteiro
  // antes de gerar o AAB de release para que o app rode 100% offline com o
  // `dist/` embutido (o workflow do GitHub Actions faz isso automaticamente).
  server: {
    url: 'https://d5fc903c-185c-419c-9fb9-f6e15d31490b.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    // allowMixedContent removido — hardening. Todas as chamadas usam HTTPS.
    // Debug do WebView desabilitado em release (evita inspeção via chrome://inspect
    // por qualquer USB conectado no aparelho do usuário).
    webContentsDebuggingEnabled: false,
    // 🔗 Deep Links / App Links — permite abrir o app direto de:
    //   - vacatio://lei/cf88/art-5
    //   - br.com.vacatio.app://qualquer-caminho
    //   - https://vacatio.com.br/lei/cf88/art-5 (verificado via assetlinks.json)
    // Para App Links verificados, hospedar https://vacatio.com.br/.well-known/assetlinks.json
    // com o SHA-256 da chave de assinatura de release.
    // Os <intent-filter> concretos vivem no workflow build-android.yml (steps
    // "Add OAuth deep link", "Add vacatio:// deep link scheme", "Add Share
    // Target and verified App Links"). Aqui só documentamos.
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          // Evita colisão de identidade SwiftPM com @capacitor/app (ambos viram "app").
          '@capacitor-firebase/app': { symlink: true },
          '@capacitor-firebase/crashlytics': { symlink: true },
        },
      },
    },
  },
  plugins: {
    SplashScreen: {
      // Zerado: usamos apenas o splash nativo do Android 12+ (estático),
      // sem animação custom do plugin sobre ele.
      launchShowDuration: 1500,
      launchFadeOutDuration: 300,
      launchAutoHide: true,
      backgroundColor: '#FFD500',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    // StatusBar plugin REMOVIDO: chamava Window.setStatusBarColor no <init>,
    // API descontinuada no Android 15. Edge-to-edge é feito na MainActivity
    // com androidx.activity.EdgeToEdge.enable() + injeção de --sai-* via
    // OnApplyWindowInsetsListener; o CSS respeita env(safe-area-inset-*).
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      iconColor: '#c9a84c',
    },
    Keyboard: {
      // NÃO usar resizeOnFullScreen — o @capacitor-community/safe-area já cuida
      // do resize do WebView quando o teclado abre.
      resize: 'native',
    },
    // Edge-to-edge / safe-area (Android 15+ / SDK 35+):
    // O @capacitor-community/safe-area popula env(safe-area-inset-*) e
    // --safe-area-inset-* no :root automaticamente. O CapacitorSystemBars
    // precisa ficar OFF pra não conflitar.
    SafeArea: {
      statusBarStyle: 'DARK', // ícones claros sobre fundo escuro do app
      navigationBarStyle: 'DARK',
      detectViewportFitCoverChanges: true,
      initialViewportFitCover: true,
    },
    SystemBars: {
      insetsHandling: 'disable',
    },
    // Prefetch nativo em background desativado: o prefetch em foreground
    // continua ativo via idle callback.

    GoogleAuth: {
      // Mantido como fallback caso o Credential Manager (SocialLogin) falhe.
      // Supabase valida o idToken pelo Client ID Web — todos os campos usam o Web.
      scopes: ['profile', 'email'],
      clientId: GOOGLE_WEB_CLIENT_ID,
      androidClientId: GOOGLE_WEB_CLIENT_ID,
      serverClientId: GOOGLE_WEB_CLIENT_ID,
      // forceCodeForRefreshToken removido: causava o prompt "fazendo login
      // novamente" a cada login e às vezes suprimia o idToken.
    },

    // SocialLogin (Credential Manager) REMOVIDO: o bottom sheet do Credential
    // Manager oferecia salvar a credencial com biometria e o dialog do sistema
    // herdava o windowBackground amarelo do splash. Login social agora vai só
    // pelo GoogleAuth (Android) e pelo fluxo OAuth via Browser (iOS/Apple).


  },
};

export default config;
