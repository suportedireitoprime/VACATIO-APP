import { lazy, Suspense, useEffect } from "react";
import { initAnalytics, trackPageview, setAnalyticsUserWithProfile } from "@/lib/analytics";
import { useScreenTracking } from "@/lib/screenTracking";
import { initNavTelemetry, markRouteChange } from "@/lib/navTelemetry";
import { prefetchNearby } from "@/lib/nearbyPrefetch";

// Splash animado
import { IntroOverlay } from "@/components/IntroOverlay";
import { SkipToContent } from "@/components/a11y/SkipToContent";


// Boot GA4 o mais cedo possível (Consent Mode v2 default = denied).
if (typeof window !== "undefined") {
  initAnalytics();
  initNavTelemetry();
  import("@/lib/enableMouseDragScroll").then((m) => m.enableMouseDragScroll());
  import("@/lib/appMetrics").then((m) => m.startAppMetrics());
}
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { BrowserRouter, HashRouter, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";

// Electron carrega o app via file:// — BrowserRouter quebra (404 em qualquer rota).
// HashRouter usa /#/rota, funciona em file:// e mantém deep-links.
const Router = typeof window !== "undefined" && (window as any).desktopApp?.isElectron
  ? HashRouter
  : BrowserRouter;

import PageTransition from "@/components/PageTransition";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { routePrefetch } from "@/lib/routePrefetch";
import { Toaster as Sonner } from "@/components/ui/sonner";
import OfflineStatusBadge from "@/components/OfflineStatusBadge";
import OfflineWatcher from "@/components/OfflineWatcher";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { usePresenceTracker } from "@/hooks/usePresenceTracker";
import { useNativePermissions } from "@/hooks/useNativePermissions";
import AtivarNotificacoesGate from "@/components/notificacoes/AtivarNotificacoesGate";
import { usePushJourneyTracker } from "@/hooks/usePushJourneyTracker";
import { ThemeProvider } from "@/hooks/useTheme";
import { useHorusStatsSync } from "@/hooks/useHorusStatsSync";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { useDesktopSessionGuard } from "@/hooks/useDesktopSessionGuard";
import { useProfileSummary } from "@/hooks/useProfileSummary";
import brasaoImgAsset from '@/assets/brasao-republica.webp';
const brasaoImg = brasaoImgAsset;
import { Loader2 } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { RecordingProvider } from "@/contexts/RecordingContext";
import { GravacaoFlutuante } from "@/components/GravacaoFlutuante";
import { GeofencePresenceBanner } from "@/components/GeofencePresenceBanner";
import { ReminderInAppBanner } from "@/components/ReminderInAppBanner";
import HorusTakeoverNoticeDialog from "@/components/horus/HorusTakeoverNoticeDialog";

// Eagerly loaded (critical path)
import Index from "./pages/Index.tsx";
import PersistentHome from "./components/PersistentHome";
import Auth from "./pages/Auth.tsx";
import Landing from "./pages/Landing.tsx";
import SmartLink from "./pages/SmartLink.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import AdminFuncoes from "./pages/AdminFuncoes.tsx";
import AdminPush from "./pages/AdminPush.tsx";
import AdminPushSection from "./pages/AdminPushSection.tsx";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Lazy loaded
const CategoriaLegislacao = lazy(() => import("./pages/CategoriaLegislacao.tsx"));
const Noticias = lazy(routePrefetch.noticias);
const Novidades = lazy(() => import("./pages/Novidades.tsx"));
const Anotacoes = lazy(() => import("./pages/Anotacoes.tsx"));
const PessoalAvisos = lazy(() => import("./pages/pessoal/Avisos.tsx"));
const PessoalGrifos = lazy(() => import("./pages/pessoal/Grifos.tsx"));
const PessoalArtigos = lazy(() => import("./pages/pessoal/Artigos.tsx"));
const PessoalFavoritos = lazy(() => import("./pages/pessoal/Favoritos.tsx"));
const PessoalLeis = lazy(() => import("./pages/pessoal/Leis.tsx"));
const PessoalAnotacoes = lazy(() => import("./pages/pessoal/Anotacoes.tsx"));
const PessoalLivros = lazy(() => import("./pages/pessoal/Livros.tsx"));
const PessoalFilmes = lazy(() => import("./pages/pessoal/Filmes.tsx"));
const PessoalJurisprudencias = lazy(() => import("./pages/pessoal/Jurisprudencias.tsx"));
const PessoalTematicas = lazy(() => import("./pages/pessoal/Tematicas.tsx"));
import MeuEspaco from "./pages/MeuEspaco.tsx";

const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Configuracoes = lazy(() => import("./pages/Configuracoes.tsx"));
const RadarDeputados = lazy(() => import("./pages/RadarDeputados.tsx"));
const RadarVotacoes = lazy(() => import("./pages/RadarVotacoes.tsx"));
const RadarRankings = lazy(() => import("./pages/RadarRankings.tsx"));
const RadarProposicoes = lazy(() => import("./pages/RadarProposicoes.tsx"));
const RadarDeputadoDetalhe = lazy(() => import("./pages/RadarDeputadoDetalhe.tsx"));
const LegislacaoEstadual = lazy(() => import("./pages/LegislacaoEstadual.tsx"));
const EstadoDetalhe = lazy(() => import("./pages/EstadoDetalhe.tsx"));
const LeiEstadualView = lazy(() => import("./pages/LeiEstadualView.tsx"));
const ExplicacaoLei = lazy(() => import("./pages/ExplicacaoLei.tsx"));
const RadarPLDetalhe = lazy(() => import("./pages/RadarPLDetalhe.tsx"));
const NarracaoLei = lazy(() => import("./pages/NarracaoLei.tsx"));
const GrafoArtigos = lazy(() => import("./pages/GrafoArtigos.tsx"));
const Ferramentas = lazy(() => import("./pages/Ferramentas.tsx"));
const LocaisJuridicos = lazy(() => import("./pages/LocaisJuridicos.tsx"));
const DicionarioJuridicoPage = lazy(() => import("./pages/DicionarioJuridicoPage.tsx"));
const PeticaoInicial = lazy(() => import("./pages/PeticaoInicial.tsx"));
const PeticaoInicialEditor = lazy(() => import("./pages/PeticaoInicialEditor.tsx"));
const AdminLocais = lazy(() => import("./pages/AdminLocais.tsx"));
const TematicaJuridica = lazy(() => import("./pages/TematicaJuridica.tsx"));
const Compartilhado = lazy(() => import("./pages/Compartilhado.tsx"));
const Radar360 = lazy(() => import("./pages/Radar360.tsx"));
const OutrasNormasLista = lazy(() => import("./pages/OutrasNormasLista.tsx"));
const Radares = lazy(routePrefetch.radares);
const Praticar = lazy(routePrefetch.praticar);
const PraticarArea = lazy(() => import("./pages/PraticarArea.tsx"));
const PraticarLei = lazy(() => import("./pages/PraticarLei.tsx"));
const PraticarSessao = lazy(() => import("./pages/PraticarSessao.tsx"));
const Estudar = lazy(() => import("./pages/Estudar.tsx"));
const EstudosHub = lazy(() => import("./pages/EstudosHub.tsx"));
const Aprender = lazy(() => import("./pages/Aprender.tsx"));
const ArtigoEducacional = lazy(() => import("./pages/ArtigoEducacional.tsx"));
const CategoriaAprender = lazy(() => import("./pages/CategoriaAprender.tsx"));
const AprenderArea = lazy(() => import("./pages/AprenderArea.tsx"));
const AprenderTeoria = lazy(() => import("./pages/AprenderTeoria.tsx"));
const AprenderTrilhas = lazy(() => import("./pages/AprenderTrilhas.tsx"));
const AprenderQuestoes = lazy(() => import("./pages/AprenderQuestoes.tsx"));
const AprenderFlashcards = lazy(() => import("./pages/AprenderFlashcards.tsx"));
const AprenderDesempenho = lazy(() => import("./pages/AprenderDesempenho.tsx"));
const AprenderAula = lazy(() => import("./pages/AprenderAula.tsx"));
const JurisprudenciaArtigo = lazy(() => import("./pages/JurisprudenciaArtigo.tsx"));
const Jurisprudencia = lazy(() => import("./pages/Jurisprudencia.tsx"));
const PesquisasProntasLista = lazy(() => import("./pages/PesquisasProntasLista.tsx"));
const SumulasVinculantes = lazy(() => import("./pages/SumulasTribunal.tsx").then(m => ({ default: m.SumulasVinculantes })));
const SumulasSTF = lazy(() => import("./pages/SumulasTribunal.tsx").then(m => ({ default: m.SumulasSTF })));
const SumulasSTJ = lazy(() => import("./pages/SumulasTribunal.tsx").then(m => ({ default: m.SumulasSTJ })));
const InformativosSTJ = lazy(() => import("./pages/InformativosTribunal.tsx").then(m => ({ default: m.InformativosSTJ })));
const InformativosSTF = lazy(() => import("./pages/InformativosTribunal.tsx").then(m => ({ default: m.InformativosSTF })));
const TesesSTJ = lazy(() => import("./pages/TesesTribunal.tsx").then(m => ({ default: m.TesesSTJ })));
const TesesSTF = lazy(() => import("./pages/TesesTribunal.tsx").then(m => ({ default: m.TesesSTF })));
const PesquisasProntasTema = lazy(() => import("./pages/PesquisasProntasTema.tsx"));
const AdminPesquisasProntas = lazy(() => import("./pages/AdminPesquisasProntas.tsx"));
const NarracaoMiniPlayer = lazy(() => import("./components/vademecum/NarracaoMiniPlayer.tsx"));

const ResumosJuridicosAreas = lazy(() => import("./pages/resumos-juridicos/ResumosJuridicosAreas.tsx"));
const ResumosJuridicosTemas = lazy(() => import("./pages/resumos-juridicos/ResumosJuridicosTemas.tsx"));
const ResumosJuridicosSubtemas = lazy(() => import("./pages/resumos-juridicos/ResumosJuridicosSubtemas.tsx"));
const AdminMonitor = lazy(() => import("./pages/AdminMonitor.tsx"));
const Perfil = lazy(() => import("./pages/Perfil.tsx"));
const SobreApp = lazy(() => import("./pages/SobreApp.tsx"));
const GeradorPost = lazy(() => import("./pages/GeradorPost.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const Newsletter = lazy(() => import("./pages/Newsletter.tsx"));
const DesktopLinkConfirm = lazy(() => import("./pages/DesktopLinkConfirm.tsx"));
// Biblioteca — eager para abrir sem Suspense fallback
import Bibliotecas from "./pages/Bibliotecas.tsx";
import BibliotecaCategoria from "./pages/BibliotecaCategoria.tsx";
import BibliotecaOffline from "./pages/BibliotecaOffline.tsx";

const CompressaoImagens = lazy(() => import("./pages/CompressaoImagens.tsx"));
const AdminFuncoesAssinantes = lazy(() => import("./pages/AdminFuncoesAssinantes.tsx"));
const AdminLembretes = lazy(() => import("./pages/AdminLembretes.tsx"));
const AdminLembretesBiblioteca = lazy(() => import("./pages/AdminLembretesBiblioteca.tsx"));
const AdminNarracaoConteudo = lazy(() => import("./pages/AdminNarracaoConteudo.tsx"));
const AdminNarracaoBiblioteca = lazy(() => import("./pages/AdminNarracaoBiblioteca.tsx"));
const AdminNarracaoBlog = lazy(() => import("./pages/AdminNarracaoBlog.tsx"));
const AdminNarracaoApresentacao = lazy(() => import("./pages/AdminNarracaoApresentacao.tsx"));
const ApresentacaoPlayer = lazy(() => import("./pages/ApresentacaoPlayer.tsx"));
const AdminAssinantes = lazy(() => import("./pages/AdminAssinantes.tsx"));
const TestePush = lazy(() => import("./pages/TestePush.tsx"));
const MeExplique = lazy(() => import("./pages/MeExplique.tsx"));
const AdminMonitorUsuarios = lazy(() => import("./pages/AdminMonitorUsuarios.tsx"));
const AdminMonitoramento = lazy(() => import("./pages/AdminMonitoramento.tsx"));
const AdminMonitorApis = lazy(() => import("./pages/AdminMonitorApis.tsx"));
const AdminAtualizacao = lazy(() => import("./pages/AdminAtualizacao.tsx"));
const AdminNativeAssets = lazy(() => import("./pages/AdminNativeAssets.tsx"));
const AdminAprender = lazy(() => import("./pages/AdminAprender.tsx"));
const AdminAprenderArea = lazy(() => import("./pages/AdminAprenderArea.tsx"));
const AdminJurisprudencia = lazy(() => import("./pages/AdminJurisprudencia.tsx"));
const AdminHorus = lazy(() => import("./pages/AdminHorus.tsx"));
const AdminTriagem = lazy(() => import("./pages/AdminTriagem.tsx"));
const AdminTriagemEntrada = lazy(() => import("./pages/AdminTriagemEntrada.tsx"));
const AdminTriagemHub = lazy(() => import("./pages/AdminTriagemHub.tsx"));
const HorusWhatsApp = lazy(() => import("./pages/HorusWhatsApp.tsx"));
const AdminBlogEdicao = lazy(() => import("./pages/AdminBlogEdicao.tsx"));
const AdminDesignImagens = lazy(() => import("./pages/AdminDesignImagens.tsx"));
const AdminHeroHome = lazy(() => import("./pages/AdminHeroHome.tsx"));
const AdminHomeCuriosidades = lazy(() => import("./pages/AdminHomeCuriosidades.tsx"));
const AdminOverlayFrases = lazy(() => import("./pages/AdminOverlayFrases.tsx"));
const BibliotecaEditar = lazy(() => import("./pages/BibliotecaEditar.tsx"));
const AdminLeituraNativa = lazy(() => import("./pages/AdminLeituraNativa.tsx"));
const Assinatura = lazy(() => import("./pages/Assinatura.tsx"));
const PlanosAtivos = lazy(() => import("./pages/PlanosAtivos.tsx"));
const DesktopPromo = lazy(routePrefetch.desktop);
const AdminRadaresLeis = lazy(() => import("./pages/AdminRadaresLeis.tsx"));
const AdminBibliotecaLeis = lazy(() => import("./pages/AdminBibliotecaLeis.tsx"));
const AdminBibliotecaLeisEstaduais = lazy(() => import("./pages/AdminBibliotecaLeisEstaduais.tsx"));
const AdminBibliotecaLeisGeral = lazy(() => import("./pages/AdminBibliotecaLeisGeral.tsx"));
const AdminBuscadorLeis = lazy(() => import("./pages/AdminBuscadorLeis.tsx"));
const AdminConcorrentes = lazy(() => import("./pages/AdminConcorrentes.tsx"));
const AdminConcorrenteDetalhe = lazy(() => import("./pages/AdminConcorrenteDetalhe.tsx"));
import NovidadesRadarOverlay from "./components/NovidadesRadarOverlay";
import GlobalDesktopHeader from "./components/layout/GlobalDesktopHeader";
import DesktopFileDropOverlay from "./components/desktop/DesktopFileDropOverlay";
const ModoOffline = lazy(() => import("./pages/ModoOffline.tsx"));
const ModoOfflineLeis = lazy(() => import("./pages/ModoOfflineLeis.tsx"));
const ModoOfflineLivros = lazy(() => import("./pages/ModoOfflineLivros.tsx"));
const AdminSecretsDownload = lazy(() => import("./pages/AdminSecretsDownload.tsx"));
const AdminAppleCsr = lazy(() => import("./pages/AdminAppleCsr.tsx"));
const AdminPassoAPassoLojas = lazy(() => import("./pages/AdminPassoAPassoLojas.tsx"));
const AdminHandoffIA = lazy(() => import("./pages/AdminHandoffIA.tsx"));
const BoletinsJuridicos = lazy(routePrefetch.boletins);
const AdminBoletins = lazy(() => import("./pages/AdminBoletins.tsx"));
const AdminModelos = lazy(() => import("./pages/AdminModelos.tsx"));
const AdminDesktop = lazy(() => import("./pages/AdminDesktop.tsx"));

const Privacidade = lazy(() => import("./pages/Privacidade.tsx"));
const Termos = lazy(() => import("./pages/Termos.tsx"));
const Seguranca = lazy(() => import("./pages/Seguranca.tsx"));
const ExcluirConta = lazy(() => import("./pages/ExcluirConta.tsx"));
const ExcluirContaPublico = lazy(() => import("./pages/ExcluirContaPublico.tsx"));
const Lembretes = lazy(() => import("./pages/Lembretes.tsx"));
const MeusLembretes = lazy(() => import("./pages/MeusLembretes.tsx"));
const Suporte = lazy(() => import("./pages/Suporte.tsx"));
const SuportePublico = lazy(() => import("./pages/SuportePublico.tsx"));
const Opiniao = lazy(() => import("./pages/Opiniao.tsx"));
const LembretesLocal = lazy(() => import("./pages/LembretesLocal.tsx"));
const PreferenciasLembretes = lazy(() => import("./pages/PreferenciasLembretes.tsx"));
const AnotacoesAudio = lazy(() => import("./pages/AnotacoesAudio.tsx"));
const AssistenteApp = lazy(() => import("./pages/AssistenteApp.tsx"));
import AssistenteHorus from "./pages/AssistenteHorus.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000, // 24h para persistência
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

const queryPersister = typeof window !== 'undefined'
  ? createAsyncStoragePersister({
      storage: {
        getItem: (key) => idbGet(key).then((v) => (v == null ? null : v as string)),
        setItem: (key, value) => idbSet(key, value).then(() => undefined),
        removeItem: (key) => idbDel(key).then(() => undefined),
      },
      key: 'rq-cache-v1',
      throttleTime: 1500,
    })
  : undefined;

const preloadImage = new Image();
preloadImage.src = brasaoImg;
preloadImage.decoding = 'async';

function ProtectedRoute({ children, requireOnboarding = true }: { children: React.ReactNode; requireOnboarding?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Leitura síncrona do cache — não bloqueia o paint.
  const cacheKey = user ? `onboarding_completed:${user.id}` : null;
  const cachedDone = cacheKey && typeof window !== 'undefined'
    ? localStorage.getItem(cacheKey) === '1'
    : false;

  // Otimista pós-cadastro: se acabou de criar conta nesta sessão, já assume
  // que precisa passar pela triagem — evita spinner de 3-5s enquanto o
  // Supabase ainda não respondeu com o perfil recém-criado.
  const justSignedUp =
    typeof window !== 'undefined' && window.sessionStorage.getItem('just_signed_up') === '1';

  const [needsOnboarding, setNeedsOnboarding] = useState(justSignedUp);
  // Só libera a tela quando souber se a triagem está pendente. Antes começava
  // como `true` e o app abria antes da resposta do Supabase — por isso a
  // triagem às vezes só aparecia depois, ao navegar/interagir.
  const [initialCheckDone, setInitialCheckDone] = useState(
    () => !user || cachedDone || (typeof navigator !== 'undefined' && navigator.onLine === false),
  );

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setInitialCheckDone(true);
      setNeedsOnboarding(false);
      return;
    }

    if (cachedDone) {
      setInitialCheckDone(true);
      setNeedsOnboarding(false);
      try { window.sessionStorage.removeItem('just_signed_up'); } catch {}
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setInitialCheckDone(true);
      return;
    }

    setInitialCheckDone(false);
    (async () => {
      try {
        // Perfil pode estar sendo criado pelo trigger (e-mail, Google, Apple).
        // Tenta algumas vezes antes de decidir, para não liberar o app por engano.
        let done = false;
        let ok = false;
        for (let i = 0; i < 3; i++) {
          const { data, error } = await supabase
            .from('profiles')
            .select('onboarding_completed_at')
            .eq('id', user.id)
            .maybeSingle();
          if (cancelled) return;
          if (error) break;
          ok = true;
          if (data) {
            done = !!data.onboarding_completed_at;
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        if (cancelled) return;
        if (ok) {
          setNeedsOnboarding(!done);
          if (done && cacheKey) {
            try { localStorage.setItem(cacheKey, '1'); } catch {}
            try { window.sessionStorage.removeItem('just_signed_up'); } catch {}
          }
        }
      } catch {}
      if (!cancelled) setInitialCheckDone(true);
    })();

    return () => { cancelled = true; };
  }, [user, cacheKey, cachedDone]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const target = location.pathname === '/' ? '/landing' : '/auth';
    return <Navigate to={target} replace state={{ from: location.pathname }} />;
  }

  // Checagem de onboarding roda em background para não bloquear a abertura
  // das telas protegidas/admin com spinner.
  if (!initialCheckDone) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireOnboarding && needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Preload critical chunks in idle time
if (typeof window !== 'undefined') {
  const preloadChunks = () => {
    import('./pages/CategoriaLegislacao.tsx');
    import('./pages/Estudar.tsx');
    import('./pages/Ferramentas.tsx');
    import('./pages/Radar360.tsx');
    import('./pages/Blog.tsx');
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadChunks);
  } else {
    setTimeout(preloadChunks, 1500);
  }
}

function EstudosRouter() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const hasStudyParams = ['mode', 'view', 'room', 'tabela', 'artigo'].some(k => params.has(k));
  return hasStudyParams ? <Estudar /> : <EstudosHub />;
}

function LazyFallback() {
  return (
    <div
      className="min-h-dvh bg-background p-4 pt-16 space-y-4 animate-in fade-in duration-300"
      style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-8 w-48 rounded-md bg-muted/70 animate-pulse" />
      <div className="h-4 w-64 rounded bg-muted/60 animate-pulse" />
      <div className="space-y-3 mt-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="h-20 rounded-xl bg-muted/60 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function PresenceWrapper() {
  const { user } = useAuth();
  usePresenceTracker();
  useHorusStatsSync();
  useSessionTracker();
  useDesktopSessionGuard(!!user);
  return <AtivarNotificacoesGate />;
}

function NativeBootstrap() {
  useNativePermissions();
  useEffect(() => {
    // Adia tudo para após o primeiro paint — não compete pela primeira renderização.
    const run = () => {
      import("@/lib/webPush").then((m) => m.trackPushLandingIfAny()).catch(() => {});
      import("@/services/noticiasService").then((m) => m.prefetchNoticias()).catch(() => {});
      import("@/services/syncQueue").then((m) => m.startSyncQueueWorker()).catch(() => {});
      import("@/services/jurisprudenciaWarmup").then((m) => m.warmupJurisprudencia()).catch(() => {});
      import("@capawesome/capacitor-app-update").then(async (m) => {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          try {
            const result = await m.AppUpdate.getAppUpdateInfo();
            if (result.updateAvailability === 2) { // UPDATE_AVAILABLE
              if (Capacitor.getPlatform() === 'android') {
                if (result.immediateUpdateAllowed) {
                  await m.AppUpdate.performImmediateUpdate();
                }
              } else if (Capacitor.getPlatform() === 'ios') {
                const { Dialog } = await import('@capacitor/dialog');
                await Dialog.alert({
                  title: 'Atualização Disponível',
                  message: 'Uma nova versão do aplicativo está disponível. Por favor, atualize na App Store para continuar aproveitando todas as novidades e melhorias.',
                  buttonTitle: 'Entendi'
                });
              }
            }
          } catch (e) {
            console.error('Erro ao checar atualizacao', e);
          }
        }
      }).catch(() => {});
      import("@/lib/backgroundRunner").then(async (m) => {
        try {
          await m.ensureBackgroundPermissions();
          m.runPrefetchNow();
        } catch {}
      });
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(run, { timeout: 3000 });
      return () => { try { (window as any).cancelIdleCallback?.(id); } catch {} };
    }
    const t = setTimeout(run, 1500);
    return () => clearTimeout(t);
  }, []);

  return null;
}

function PushNavListener() {
  const navigate = useNavigate();
  usePushJourneyTracker();
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { path?: string } | undefined;
      if (detail?.path) navigate(detail.path);
    };
    window.addEventListener('vacatio:push-navigate', handler as EventListener);
    return () => window.removeEventListener('vacatio:push-navigate', handler as EventListener);
  }, [navigate]);
  return null;
}

function DeepLinkBootstrap() {
  const navigate = useNavigate();
  useEffect(() => {
    import('@/lib/nativeDeepLinks').then((m) => m.initDeepLinkRouter(navigate));
    import('@/lib/nativeSharedIntent').then((m) => m.initSharedIntentListener(navigate));
    return () => {
      import('@/lib/nativeDeepLinks').then((m) => m.disposeDeepLinkRouter());
    };
  }, [navigate]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  const { user } = useAuth();
  const { data: profile } = useProfileSummary();

  // Screen tracking unificado (page_view + screen_view + scroll + screen_exit).
  useScreenTracking();

  // GA4: pageview em cada route change (mantido para compatibilidade).
  useEffect(() => {
    trackPageview(location.pathname + location.search);
    markRouteChange(location.pathname + location.search);
    prefetchNearby(location.pathname);
  }, [location.pathname, location.search]);

  // Sempre voltar ao topo ao navegar (voltar, avançar, clique).
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.search]);

  // GA4/Meta: vincular user_id e propriedades quando autentica / desloga.
  useEffect(() => {
    setAnalyticsUserWithProfile(user?.id ?? null, {
      email: user?.email,
      is_premium: profile?.isPremium ?? false,
    });
  }, [user?.id, profile?.isPremium]);

  // Sem usuário logado, a Home persistente não monta.
  // Renderiza a landing imediatamente na raiz para nunca deixar tela preta,
  // mesmo enquanto a autenticação ainda está resolvendo.
  const HomeGate = () => {
    if (!user) return <Landing />;
    return null;
  };



  return (
    <div className="overflow-x-hidden">
      <IntroOverlay />
      <NativeBootstrap />
      <PushNavListener />
      <DeepLinkBootstrap />
      {user && <PresenceWrapper />}
      {user && <NovidadesRadarOverlay />}
      <GlobalDesktopHeader />
      <DesktopFileDropOverlay />
      <PersistentHome />
      <Suspense fallback={<LazyFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/auth" element={<Auth />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/ir/*" element={<SmartLink />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/excluir-conta" element={<ExcluirContaPublico />} />
          <Route path="/suporte-publico" element={<SuportePublico />} />

          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/desktop-link/:token" element={<DesktopLinkConfirm />} />
          <Route path="/onboarding" element={<ProtectedRoute requireOnboarding={false}><Onboarding /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><HomeGate /></ProtectedRoute>} />

          <Route path="/legislacao/:tipo" element={<ProtectedRoute><PageTransition><CategoriaLegislacao /></PageTransition></ProtectedRoute>} />
          <Route path="/legislacao/:tipo/:leiSlug" element={<ProtectedRoute><PageTransition><CategoriaLegislacao /></PageTransition></ProtectedRoute>} />
          <Route path="/legislacao/:tipo/:leiSlug/:artigoNumero" element={<ProtectedRoute><PageTransition><CategoriaLegislacao /></PageTransition></ProtectedRoute>} />
          <Route path="/noticias" element={<ProtectedRoute><PageTransition><Noticias /></PageTransition></ProtectedRoute>} />
          <Route path="/novidades" element={<ProtectedRoute><PageTransition><Novidades /></PageTransition></ProtectedRoute>} />
          <Route path="/anotacoes" element={<ProtectedRoute><PageTransition><Anotacoes /></PageTransition></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><PageTransition><Configuracoes /></PageTransition></ProtectedRoute>} />
          <Route path="/ajustes/seguranca" element={<ProtectedRoute><PageTransition><Seguranca /></PageTransition></ProtectedRoute>} />
          <Route path="/ajustes/lembretes" element={<ProtectedRoute><PageTransition><Lembretes /></PageTransition></ProtectedRoute>} />
          <Route path="/meus-lembretes" element={<ProtectedRoute><PageTransition><MeusLembretes /></PageTransition></ProtectedRoute>} />
          <Route path="/lembretes/local" element={<ProtectedRoute><PageTransition><LembretesLocal /></PageTransition></ProtectedRoute>} />
          <Route path="/lembretes/preferencias" element={<ProtectedRoute><PageTransition><PreferenciasLembretes /></PageTransition></ProtectedRoute>} />
          <Route path="/anotacoes/audio" element={<ProtectedRoute><PageTransition><AnotacoesAudio /></PageTransition></ProtectedRoute>} />
          <Route path="/ajustes/excluir-conta" element={<ProtectedRoute><PageTransition><ExcluirConta /></PageTransition></ProtectedRoute>} />
          <Route path="/radar/deputados" element={<ProtectedRoute><PageTransition><RadarDeputados /></PageTransition></ProtectedRoute>} />
          <Route path="/radar/votacoes" element={<ProtectedRoute><PageTransition><RadarVotacoes /></PageTransition></ProtectedRoute>} />
          <Route path="/radar/rankings" element={<ProtectedRoute><PageTransition><RadarRankings /></PageTransition></ProtectedRoute>} />
          <Route path="/radar/proposicoes" element={<ProtectedRoute><PageTransition><RadarProposicoes /></PageTransition></ProtectedRoute>} />
          <Route path="/radar/deputado/:id" element={<ProtectedRoute><PageTransition><RadarDeputadoDetalhe /></PageTransition></ProtectedRoute>} />
          <Route path="/radar/pl/:id" element={<ProtectedRoute><PageTransition><RadarPLDetalhe /></PageTransition></ProtectedRoute>} />
          <Route path="/legislacao-estadual" element={<ProtectedRoute><PageTransition><LegislacaoEstadual /></PageTransition></ProtectedRoute>} />
          <Route path="/legislacao-estadual/:uf" element={<ProtectedRoute><PageTransition><EstadoDetalhe /></PageTransition></ProtectedRoute>} />
          <Route path="/legislacao-estadual/:uf/lei/:slug" element={<ProtectedRoute><PageTransition><LeiEstadualView /></PageTransition></ProtectedRoute>} />
          <Route path="/explicacao-lei" element={<ProtectedRoute><PageTransition><ExplicacaoLei /></PageTransition></ProtectedRoute>} />
          <Route path="/narracao" element={<ProtectedRoute><PageTransition><NarracaoLei /></PageTransition></ProtectedRoute>} />
          <Route path="/grafo-artigos" element={<ProtectedRoute><PageTransition><GrafoArtigos /></PageTransition></ProtectedRoute>} />
          <Route path="/ferramentas" element={<ProtectedRoute><PageTransition><Ferramentas /></PageTransition></ProtectedRoute>} />
          <Route path="/ferramentas/locais" element={<ProtectedRoute><PageTransition><LocaisJuridicos /></PageTransition></ProtectedRoute>} />
          <Route path="/ferramentas/dicionario" element={<ProtectedRoute><PageTransition><DicionarioJuridicoPage /></PageTransition></ProtectedRoute>} />
          <Route path="/me-explique" element={<ProtectedRoute><PageTransition><MeExplique /></PageTransition></ProtectedRoute>} />
          <Route path="/ferramentas/peticao-inicial" element={<ProtectedRoute><PageTransition><PeticaoInicial /></PageTransition></ProtectedRoute>} />
          <Route path="/ferramentas/peticao-inicial/:id" element={<ProtectedRoute><PageTransition><PeticaoInicialEditor /></PageTransition></ProtectedRoute>} />
          <Route path="/admin/locais" element={<ProtectedRoute><PageTransition><AdminLocais /></PageTransition></ProtectedRoute>} />
          <Route path="/tematica-juridica" element={<ProtectedRoute><PageTransition><TematicaJuridica /></PageTransition></ProtectedRoute>} />
          <Route path="/radar-360" element={<ProtectedRoute><PageTransition><Radar360 /></PageTransition></ProtectedRoute>} />
          <Route path="/normas/:slug" element={<ProtectedRoute><PageTransition><OutrasNormasLista /></PageTransition></ProtectedRoute>} />
          <Route path="/radares" element={<ProtectedRoute><PageTransition><Radares /></PageTransition></ProtectedRoute>} />
          <Route path="/praticar" element={<ProtectedRoute><PageTransition><Praticar /></PageTransition></ProtectedRoute>} />
          <Route path="/praticar/area/:areaSlug" element={<ProtectedRoute><PageTransition><PraticarArea /></PageTransition></ProtectedRoute>} />
          <Route path="/praticar/:leiSlug" element={<ProtectedRoute><PageTransition><PraticarLei /></PageTransition></ProtectedRoute>} />
          <Route path="/praticar/:leiSlug/sessao" element={<ProtectedRoute><PageTransition><PraticarSessao /></PageTransition></ProtectedRoute>} />
          <Route path="/compartilhado" element={<ProtectedRoute><PageTransition><Compartilhado /></PageTransition></ProtectedRoute>} />
          <Route path="/estudos" element={<ProtectedRoute><PageTransition><EstudosRouter /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender" element={<ProtectedRoute><PageTransition><Aprender /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender/categoria/:categoriaId" element={<ProtectedRoute><PageTransition><CategoriaAprender /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender/area/:slug" element={<ProtectedRoute><PageTransition><AprenderArea /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender/teoria" element={<ProtectedRoute><PageTransition><AprenderTeoria /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender/trilhas" element={<ProtectedRoute><PageTransition><AprenderTrilhas /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender/questoes" element={<ProtectedRoute><PageTransition><AprenderQuestoes /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender/flashcards" element={<ProtectedRoute><PageTransition><AprenderFlashcards /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender/desempenho" element={<ProtectedRoute><PageTransition><AprenderDesempenho /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender/aula/:aulaId" element={<ProtectedRoute><AprenderAula /></ProtectedRoute>} />
          <Route path="/jurisprudencia/:slugLei/:numeroArtigo" element={<ProtectedRoute><PageTransition><JurisprudenciaArtigo /></PageTransition></ProtectedRoute>} />
          <Route path="/jurisprudencia/prontas/:tribunal" element={<ProtectedRoute><PageTransition><PesquisasProntasLista /></PageTransition></ProtectedRoute>} />
          <Route path="/jurisprudencia/prontas/:tribunal/:slug" element={<ProtectedRoute><PageTransition><PesquisasProntasTema /></PageTransition></ProtectedRoute>} />
          <Route path="/admin/pesquisas-prontas" element={<ProtectedRoute><PageTransition><AdminPesquisasProntas /></PageTransition></ProtectedRoute>} />
          <Route path="/jurisprudencia/sumulas-vinculantes" element={<ProtectedRoute><PageTransition><SumulasVinculantes /></PageTransition></ProtectedRoute>} />
          <Route path="/jurisprudencia/sumulas-stf" element={<ProtectedRoute><PageTransition><SumulasSTF /></PageTransition></ProtectedRoute>} />
          <Route path="/jurisprudencia/sumulas-stj" element={<ProtectedRoute><PageTransition><SumulasSTJ /></PageTransition></ProtectedRoute>} />
         <Route path="/jurisprudencia/informativos-stj" element={<ProtectedRoute><PageTransition><InformativosSTJ /></PageTransition></ProtectedRoute>} />
         <Route path="/jurisprudencia/informativos-stf" element={<ProtectedRoute><PageTransition><InformativosSTF /></PageTransition></ProtectedRoute>} />
        <Route path="/jurisprudencia/teses-stj" element={<ProtectedRoute><PageTransition><TesesSTJ /></PageTransition></ProtectedRoute>} />
        <Route path="/jurisprudencia/teses-stf" element={<ProtectedRoute><PageTransition><TesesSTF /></PageTransition></ProtectedRoute>} />
          <Route path="/jurisprudencia" element={<ProtectedRoute><PageTransition><Jurisprudencia /></PageTransition></ProtectedRoute>} />
          <Route path="/aprender/:slug" element={<ProtectedRoute><PageTransition><ArtigoEducacional /></PageTransition></ProtectedRoute>} />
          <Route path="/resumos" element={<Navigate to="/resumos-juridicos" replace />} />
          <Route path="/resumos-juridicos" element={<ProtectedRoute><PageTransition><ResumosJuridicosAreas /></PageTransition></ProtectedRoute>} />
          <Route path="/resumos-juridicos/:area" element={<ProtectedRoute><PageTransition><ResumosJuridicosTemas /></PageTransition></ProtectedRoute>} />
          <Route path="/resumos-juridicos/:area/:tema" element={<ProtectedRoute><PageTransition><ResumosJuridicosSubtemas /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-monitor" element={<ProtectedRoute><PageTransition><AdminMonitor /></PageTransition></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><PageTransition><Perfil /></PageTransition></ProtectedRoute>} />
          <Route path="/sobre" element={<ProtectedRoute><PageTransition><SobreApp /></PageTransition></ProtectedRoute>} />
          <Route path="/gerador-post" element={<ProtectedRoute><PageTransition><GeradorPost /></PageTransition></ProtectedRoute>} />
          <Route path="/blog" element={<ProtectedRoute><PageTransition><Blog /></PageTransition></ProtectedRoute>} />
          <Route path="/newsletter" element={<ProtectedRoute><PageTransition><Newsletter /></PageTransition></ProtectedRoute>} />
          <Route path="/biblioteca" element={<ProtectedRoute><PageTransition><Bibliotecas /></PageTransition></ProtectedRoute>} />
          <Route path="/bibliotecas" element={<ProtectedRoute><PageTransition><Bibliotecas /></PageTransition></ProtectedRoute>} />
          <Route path="/bibliotecas/:colecaoId" element={<ProtectedRoute><PageTransition><BibliotecaCategoria /></PageTransition></ProtectedRoute>} />
          <Route path="/bibliotecas/:colecaoId/:areaSlug" element={<ProtectedRoute><PageTransition><BibliotecaCategoria /></PageTransition></ProtectedRoute>} />
          <Route path="/biblioteca-offline" element={<ProtectedRoute><PageTransition><BibliotecaOffline /></PageTransition></ProtectedRoute>} />

          
          <Route path="/compressao-imagens" element={<ProtectedRoute><PageTransition><CompressaoImagens /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-funcoes" element={<ProtectedRoute><PageTransition><AdminFuncoes /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-funcoes-assinantes" element={<ProtectedRoute><PageTransition><AdminFuncoesAssinantes /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-lembretes" element={<ProtectedRoute><PageTransition><AdminLembretes /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-lembretes/biblioteca" element={<ProtectedRoute><PageTransition><AdminLembretesBiblioteca /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-narracao" element={<ProtectedRoute><PageTransition><AdminNarracaoConteudo /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-narracao/biblioteca" element={<ProtectedRoute><PageTransition><AdminNarracaoBiblioteca /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-narracao/blog" element={<ProtectedRoute><PageTransition><AdminNarracaoBlog /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-narracao/apresentacao" element={<ProtectedRoute><PageTransition><AdminNarracaoApresentacao /></PageTransition></ProtectedRoute>} />
          <Route path="/apresentacao/:id" element={<ProtectedRoute><PageTransition><ApresentacaoPlayer /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-assinantes" element={<ProtectedRoute><PageTransition><AdminAssinantes /></PageTransition></ProtectedRoute>} />
          <Route path="/teste-push" element={<ProtectedRoute><PageTransition><TestePush /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-monitor-usuarios" element={<ProtectedRoute><PageTransition><AdminMonitorUsuarios /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-monitoramento" element={<ProtectedRoute><PageTransition><AdminMonitoramento /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-monitor-apis" element={<ProtectedRoute><PageTransition><AdminMonitorApis /></PageTransition></ProtectedRoute>} />
          <Route path="/assinatura" element={<ProtectedRoute><PageTransition><Assinatura /></PageTransition></ProtectedRoute>} />
          <Route path="/planos" element={<Navigate to="/assinatura" replace />} />
          <Route path="/planos/*" element={<Navigate to="/assinatura" replace />} />
          <Route path="/suporte" element={<ProtectedRoute><PageTransition><Suporte /></PageTransition></ProtectedRoute>} />
          <Route path="/opiniao" element={<ProtectedRoute><PageTransition><Opiniao /></PageTransition></ProtectedRoute>} />
          <Route path="/planos/ativos" element={<ProtectedRoute><PageTransition><PlanosAtivos /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-atualizacao" element={<ProtectedRoute><PageTransition><AdminAtualizacao /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-native-assets" element={<ProtectedRoute><PageTransition><AdminNativeAssets /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-aprender" element={<ProtectedRoute><PageTransition><AdminAprender /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-aprender/:area" element={<ProtectedRoute><PageTransition><AdminAprenderArea /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-jurisprudencia" element={<ProtectedRoute><PageTransition><AdminJurisprudencia /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-push" element={<ProtectedRoute><PageTransition><AdminPush /></PageTransition></ProtectedRoute>} />

          <Route path="/admin-push/:section" element={<ProtectedRoute><PageTransition><AdminPushSection /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-horus" element={<ProtectedRoute><PageTransition><AdminHorus /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-triagem" element={<ProtectedRoute><PageTransition><AdminTriagem /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-triagem-entrada" element={<ProtectedRoute><PageTransition><AdminTriagemEntrada /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-triagem-hub" element={<ProtectedRoute><PageTransition><AdminTriagemHub /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-boletins" element={<ProtectedRoute><PageTransition><AdminBoletins /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-desktop" element={<ProtectedRoute><PageTransition><AdminDesktop /></PageTransition></ProtectedRoute>} />

          <Route path="/admin-modelos" element={<ProtectedRoute><PageTransition><AdminModelos /></PageTransition></ProtectedRoute>} />
          <Route path="/boletins" element={<ProtectedRoute><PageTransition><BoletinsJuridicos /></PageTransition></ProtectedRoute>} />
          <Route path="/boletins/:id" element={<ProtectedRoute><PageTransition><BoletinsJuridicos /></PageTransition></ProtectedRoute>} />
          <Route path="/boletins-noticias" element={<ProtectedRoute><PageTransition><BoletinsJuridicos tipo="noticias" /></PageTransition></ProtectedRoute>} />
          <Route path="/boletins-noticias/:id" element={<ProtectedRoute><PageTransition><BoletinsJuridicos tipo="noticias" /></PageTransition></ProtectedRoute>} />
          <Route path="/ajustes/horus" element={<ProtectedRoute><PageTransition><HorusWhatsApp /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-blog-edicao" element={<ProtectedRoute><PageTransition><AdminBlogEdicao /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-design-imagens" element={<ProtectedRoute><PageTransition><AdminDesignImagens /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-hero-home" element={<ProtectedRoute><PageTransition><AdminHeroHome /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-home-curiosidades" element={<ProtectedRoute><PageTransition><AdminHomeCuriosidades /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-overlay-frases" element={<ProtectedRoute><PageTransition><AdminOverlayFrases /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-biblioteca-editar" element={<ProtectedRoute><PageTransition><BibliotecaEditar /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-leitura-nativa" element={<ProtectedRoute><PageTransition><AdminLeituraNativa /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-radares-leis" element={<ProtectedRoute><PageTransition><AdminRadaresLeis /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-biblioteca-leis" element={<ProtectedRoute><PageTransition><AdminBibliotecaLeis /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-biblioteca-leis/estadual" element={<ProtectedRoute><PageTransition><AdminBibliotecaLeisEstaduais /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-biblioteca-leis/estadual/:uf" element={<ProtectedRoute><PageTransition><AdminBibliotecaLeisEstaduais /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-biblioteca-leis/geral" element={<ProtectedRoute><PageTransition><AdminBibliotecaLeisGeral /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-buscador-leis" element={<ProtectedRoute><PageTransition><AdminBuscadorLeis /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-concorrentes" element={<ProtectedRoute><PageTransition><AdminConcorrentes /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-concorrentes/:id" element={<ProtectedRoute><PageTransition><AdminConcorrenteDetalhe /></PageTransition></ProtectedRoute>} />


          <Route path="/desktop" element={<PageTransition><DesktopPromo /></PageTransition>} />
          <Route path="/modo-offline" element={<ProtectedRoute><PageTransition><ModoOffline /></PageTransition></ProtectedRoute>} />
          <Route path="/modo-offline/leis" element={<ProtectedRoute><PageTransition><ModoOfflineLeis /></PageTransition></ProtectedRoute>} />
          <Route path="/modo-offline/livros" element={<ProtectedRoute><PageTransition><ModoOfflineLivros /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-secrets" element={<ProtectedRoute><PageTransition><AdminSecretsDownload /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-apple-csr" element={<ProtectedRoute><PageTransition><AdminAppleCsr /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-passo-a-passo-lojas" element={<ProtectedRoute><PageTransition><AdminPassoAPassoLojas /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-lojas" element={<ProtectedRoute><PageTransition><AdminPassoAPassoLojas /></PageTransition></ProtectedRoute>} />
          <Route path="/admin-handoff" element={<ProtectedRoute><PageTransition><AdminHandoffIA /></PageTransition></ProtectedRoute>} />
          <Route path="/assistente" element={<ProtectedRoute><PageTransition><AssistenteApp /></PageTransition></ProtectedRoute>} />
          <Route path="/assistente-horus" element={<ProtectedRoute><PageTransition><AssistenteHorus /></PageTransition></ProtectedRoute>} />

          <Route path="/pessoal/avisos" element={<ProtectedRoute><PageTransition><PessoalAvisos /></PageTransition></ProtectedRoute>} />
          <Route path="/pessoal/grifos" element={<ProtectedRoute><PageTransition><PessoalGrifos /></PageTransition></ProtectedRoute>} />
          <Route path="/pessoal/artigos" element={<ProtectedRoute><PageTransition><PessoalArtigos /></PageTransition></ProtectedRoute>} />
          <Route path="/pessoal/favoritos" element={<ProtectedRoute><PageTransition><PessoalFavoritos /></PageTransition></ProtectedRoute>} />
          <Route path="/pessoal/leis" element={<ProtectedRoute><PageTransition><PessoalLeis /></PageTransition></ProtectedRoute>} />
          <Route path="/pessoal/anotacoes" element={<ProtectedRoute><PageTransition><PessoalAnotacoes /></PageTransition></ProtectedRoute>} />
          <Route path="/pessoal/livros" element={<ProtectedRoute><PageTransition><PessoalLivros /></PageTransition></ProtectedRoute>} />
          <Route path="/pessoal/filmes" element={<ProtectedRoute><PageTransition><PessoalFilmes /></PageTransition></ProtectedRoute>} />
          <Route path="/pessoal/jurisprudencias" element={<ProtectedRoute><PageTransition><PessoalJurisprudencias /></PageTransition></ProtectedRoute>} />
          <Route path="/pessoal/tematicas" element={<ProtectedRoute><PageTransition><PessoalTematicas /></PageTransition></ProtectedRoute>} />
          <Route path="/meu-espaco" element={<ProtectedRoute><PageTransition><MeuEspaco /></PageTransition></ProtectedRoute>} />
          <Route path="/homepage/meu-espaco" element={<ProtectedRoute><PageTransition><MeuEspaco /></PageTransition></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />


        </Routes>
      </Suspense>
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister as any,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => {
            const k = q.queryKey?.[0];
            // Persistir só dados baratos e úteis pra abertura instantânea
            return k === 'biblioteca-colecao' || k === 'blog-posts' || k === 'noticias';
          },
        },
      }}
    >
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ThemeProvider>
            <TooltipProvider>
              <SkipToContent />
              <Sonner />

              <Analytics />
              <SpeedInsights />
              <OfflineStatusBadge />
              <OfflineWatcher />
              
              <GeofencePresenceBanner />
              <ReminderInAppBanner />
              <HorusTakeoverNoticeDialog />
              {/* <IntroOverlay /> — desativado por preferência (splash estático) */}
              <RecordingProvider>
                <AnimatedRoutes />
                <NarracaoMiniPlayer />
                <GravacaoFlutuante />
              </RecordingProvider>



            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </PersistQueryClientProvider>
  </ErrorBoundary>
);

export default App;
