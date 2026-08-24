import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setNativeStatusBar } from "./lib/nativeStatusBar";
import { initCrashlytics, installGlobalErrorHandlers } from "./lib/nativeCrashlytics";
import { Capacitor } from "@capacitor/core";
// Preload síncrono das duas imagens críticas de marca (aparecem no primeiro paint).
// Import estático com ?url faz o Vite empacotar a URL com hash já resolvida no bundle
// inicial — o <link rel="preload"> é injetado ANTES do createRoot, garantindo download
// paralelo ao parse do JS. Sem isso, a webp só começa a baixar depois do primeiro render.
import horusOwlUrl from "./assets/horus/horus-owl.webp?url";
import vacatioLogoUrl from "./assets/bundled/logo-vacatio-v2.webp?url";

function preloadImage(url: string) {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  link.type = "image/webp";
  link.fetchPriority = "high";
  document.head.appendChild(link);
  // Aquece também o cache de decode do browser
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}
preloadImage(vacatioLogoUrl);
preloadImage(horusOwlUrl);

// Inicializa safe-area no Android/iOS. O @capacitor-community/safe-area v8
// injeta automaticamente --safe-area-inset-* no :root ao carregar; aqui só
// pinta os system bars com estilo claro (ícones brancos) sobre o fundo do app.
// Sem o plugin ativo, no Android 15/SDK 35 (edge-to-edge forçado) os insets
// ficam 0 e o conteúdo desliza para trás da status bar.
if (Capacitor.isNativePlatform()) {
  void import("@capacitor-community/safe-area").then(({ SafeArea, SystemBarsStyle }) => {
    void SafeArea.setSystemBarsStyle({ style: SystemBarsStyle.Dark }).catch(() => {});
  });
  // Fecha imediatamente qualquer splash do plugin (o splash do sistema
  // Android 12+ é gerenciado pelo tema; esta chamada garante que nada
  // do plugin fique visível sobre a WebView em OEMs teimosos).
  void import("@capacitor/splash-screen").then(({ SplashScreen }) => {
    void SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => {});
  });
}


createRoot(document.getElementById("root")!).render(<App />);


// Paint the native status bar with the app's Wine theme at boot.
setNativeStatusBar('wine');

// Init Firebase Crashlytics (no-op em web) e handlers globais de erro.
installGlobalErrorHandlers();
void initCrashlytics();

// RUM de Core Web Vitals (LCP/INP/CLS/FCP/TTFB) — env real dos usuários.
import('./lib/webVitalsRum').then((m) => m.initWebVitals()).catch(() => {});

// Sincronização incremental de leis + prime da memória com o bundle nativo.
// Rodam em idle real para não competir com o primeiro paint —
// abertura de lei depois disso é síncrona (getCachedArtigos → hit direto).
const scheduleBoot = () => {
  import('./services/lawsBundle').then(async (m) => {
    await m.loadManifest();
    void m.primeMemoryCacheFromBundle();
    void m.syncLawsDelta();
  });
  // Prefetch de capas do blog (nativo): baixa em background, guarda em Filesystem.
  import('./services/blogAssetsPrefetch').then(m => void m.prefetchBlogCovers());
};
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  (window as any).requestIdleCallback(scheduleBoot, { timeout: 3000 });
} else {
  setTimeout(scheduleBoot, 1200);
}


// Register Service Worker for persistent image caching (production only)
if ('serviceWorker' in navigator) {
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const isPreview = window.location.hostname.includes('id-preview--') ||
    window.location.hostname.includes('lovableproject.com');

  if (!isInIframe && !isPreview) {
    navigator.serviceWorker.register('/sw-cache.js').catch(() => {});
  } else {
    // Cleanup any stale SW in preview/iframe
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.forEach((r) => r.unregister())
    );
  }
}
