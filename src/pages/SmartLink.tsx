import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { parseSmartPath } from '@/lib/nativeDeepLinks';

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=br.com.vacatio.app';
const APP_STORE = 'https://apps.apple.com/br/app/vacatio/id6793608690';

type Platform = 'android' | 'ios' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'desktop';
}

/**
 * Página "smart link" — recebe URLs no formato `/ir/<tipo>/<...>`.
 *
 * Fluxo:
 *   1. Se estiver dentro do próprio app (Capacitor), navega direto pra rota interna.
 *   2. Web: tenta abrir `vacatio://<path>` (se app instalado, o SO intercepta).
 *   3. Após 1.2s sem intercepção → registra "claim" (deferred) e manda pra loja.
 *   4. Desktop → renderiza CTA de download com QR + botão "abrir no navegador".
 */
export default function SmartLink() {
  const location = useLocation();
  const navigate = useNavigate();
  const [platform] = useState<Platform>(detectPlatform);
  const [redirecting, setRedirecting] = useState(false);

  // Extrai o "path interno" removendo o prefixo /ir/
  const smartPath = useMemo(() => {
    const raw = location.pathname.replace(/^\/ir\/?/, '/');
    return raw + (location.search || '');
  }, [location.pathname, location.search]);

  // Rota interna final (ex: /legislacao/cf88?artigo=5)
  const internalTarget = useMemo(() => parseSmartPath(smartPath) || '/', [smartPath]);

  useEffect(() => {
    // Dentro do app: rota interna direto
    if (Capacitor.isNativePlatform()) {
      navigate(internalTarget, { replace: true });
      return;
    }
    if (platform === 'desktop') return; // desktop mostra CTA

    let cancelled = false;
    setRedirecting(true);

    // Tenta abrir esquema custom (se app instalado, o browser some/troca de app)
    const scheme = `vacatio:/${smartPath}`.replace(':////', '://').replace(':///', '://');
    // usar window.location pra iOS (iframe não funciona em iOS moderno)
    const attemptOpen = () => {
      try {
        window.location.href = scheme;
      } catch { /* noop */ }
    };
    attemptOpen();

    // Se não abriu em ~1.2s, cai pra store (com claim no iOS)
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        if (platform === 'ios') {
          // Registra o destino pra recuperar após instalação
          await supabase.functions.invoke('smart-link-claim', {
            body: { action: 'claim', target_path: internalTarget, platform: 'ios' },
          }).catch(() => {});
          window.location.href = APP_STORE;
        } else if (platform === 'android') {
          // Play Install Referrer entrega esse param pro app após instalação
          const referrer = encodeURIComponent(`vacatio_link=${internalTarget}`);
          window.location.href = `${PLAY_STORE}&referrer=${referrer}`;
        }
      } catch (e) {
        console.warn('SmartLink redirect fail', e);
      }
    }, 1200);

    // Se o usuário voltar (app abriu), cancela
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        cancelled = true;
        clearTimeout(timer);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [platform, smartPath, internalTarget, navigate]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-6 text-center bg-background">
      <img src="/icon-512.png" alt="Vacatio" className="w-24 h-24 rounded-3xl shadow-xl" onError={(e) => (e.currentTarget.style.display = 'none')} />
      <div>
        <h1 className="font-display text-2xl font-black text-foreground">Abrindo no Vacatio…</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Se o app não abrir sozinho, {platform === 'desktop' ? 'baixe pelo celular' : 'instale abaixo e o conteúdo abre automático depois'}.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <a href={PLAY_STORE} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm">
          Baixar no Google Play
        </a>
        <a href={APP_STORE} className="w-full py-3 rounded-2xl border border-border text-foreground font-semibold text-sm">
          Baixar na App Store
        </a>
        <button
          onClick={() => navigate(internalTarget, { replace: true })}
          className="w-full py-3 rounded-2xl text-xs text-muted-foreground hover:text-foreground"
        >
          continuar no navegador →
        </button>
      </div>
      {redirecting && (
        <p className="text-[11px] text-muted-foreground/70">Você será redirecionado em instantes…</p>
      )}
    </div>
  );
}
