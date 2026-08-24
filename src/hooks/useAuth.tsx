import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';

let nativeGoogleAuthInit: Promise<void> | null = null;

// Client ID Web — mesmo valor de capacitor.config.ts. Serve como audience
// do idToken para o Supabase (signInWithIdToken).
const GOOGLE_WEB_CLIENT_ID =
  '833040915353-t4op5194chqh14kbig98h0pe8c0j8irq.apps.googleusercontent.com';


const getNativeGoogleError = (error: unknown) => {
  const err = error as { message?: string; code?: string; status?: string | number; statusCode?: string | number };
  const code = String(err?.code ?? err?.status ?? err?.statusCode ?? '');
  const message = err?.message || String(error);
  const raw = `${code} ${message}`.trim();

  if (code === '12501' || raw.includes('12501') || message.toLowerCase().includes('canceled the sign-in flow')) {
    return new Error(
      'O Google recusou o login nativo no Android (código 12501). Isso quase sempre indica OAuth/SHA-1 incompatível: confira se o Client ID Android do pacote br.com.vacatio.app usa o SHA-1 da chave que assinou este APK/AAB e se, no Supabase, o Google tem o Client ID Web primeiro e o Android depois.',
    );
  }

  if (code === '10' || raw.includes('DEVELOPER_ERROR') || raw.includes('code: 10') || raw.includes('10')) {
    return new Error(
      'Erro de configuração do Google Sign-In (DEVELOPER_ERROR 10). Verifique package br.com.vacatio.app, SHA-1 da chave de assinatura e Client IDs Web/Android no Google Cloud e no Supabase.',
    );
  }

  return new Error(message || 'Não consegui entrar com o Google.');
};


interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
});

const readCachedSession = (): Session | null => {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const session = (parsed?.currentSession ?? parsed) as Session | null;
      if (session?.access_token && session?.user) return session;
    }
  } catch {}
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState<Session | null>(() => readCachedSession());
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [loading, setLoading] = useState(!initialSession);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Crashlytics: associa relatórios de crash ao usuário (ou limpa no logout)
      import('@/lib/nativeCrashlytics').then((m) => m.setCrashlyticsUserId(session?.user?.id ?? null));

      // Admin: libera captura de tela (remove FLAG_SECURE no próximo boot)
      // para poder gravar vídeo de demonstração da Play Store.
      Promise.all([
        import('@/lib/adminEmails'),
        import('@/lib/nativeScreenshotGuard'),
      ]).then(([{ isAdminEmail }, { setAdminScreenCaptureAllowed }]) => {
        setAdminScreenCaptureAllowed(isAdminEmail(session?.user?.email));
      }).catch(() => {});

      // GA4: eventos de auth (respeitam Consent Mode v2)
      import('@/lib/appEvents').then(({ appEvents, identifyUser }) => {
        const provider = (session?.user?.app_metadata as any)?.provider || 'email';
        if (_event === 'SIGNED_IN') {
          identifyUser({
            id: session?.user?.id,
            email: session?.user?.email,
            phone: (session?.user?.user_metadata as any)?.telefone ?? null,
          });
          appEvents.login(provider);
        } else if (_event === 'SIGNED_OUT') appEvents.logout();
      }).catch(() => {});
    });

    const sessionTimeout = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 4000),
    );
    Promise.race([supabase.auth.getSession(), sessionTimeout]).then((result: any) => {
      const session = result?.data?.session ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle OAuth deep link on native (br.com.vacatio.app://auth-callback?code=...)
    let appListener: { remove: () => void } | undefined;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url || !url.startsWith('br.com.vacatio.app://')) return;
        try {
          const parsed = new URL(url);
          const code = parsed.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          } else if (parsed.hash?.includes('access_token')) {
            // Implicit flow fallback
            const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
            const access_token = hash.get('access_token');
            const refresh_token = hash.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        } catch (e) {
          console.error('Deep link auth error', e);
        } finally {
          try { await Browser.close(); } catch {}
        }
      }).then((l) => { appListener = l; });
    }

    return () => {
      subscription.unsubscribe();
      appListener?.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
        emailRedirectTo: window.location.origin,
      },
    });
    if (!error) {
      // Sinaliza ao ProtectedRoute que o próximo render deve ir direto pra
      // /onboarding, sem esperar o round-trip do Supabase pra profiles.
      try { window.sessionStorage.setItem('just_signed_up', '1'); } catch {}
      import('@/lib/appEvents').then(({ appEvents }) => appEvents.signUp('email')).catch(() => {});
      // Aquecimento do chunk da triagem — abre imediato quando o app
      // navegar pra /onboarding.
      import('@/components/onboarding/CadastroOnboardingOverlay').catch(() => {});
      import('@/components/onboarding/CadastroFeaturesReel').catch(() => {});
    }
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.signOut().catch(() => {});
      }
    } catch (e) {
      console.error('Erro ao fazer signout nativo', e);
    }
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // Login Google nativo via GoogleAuth (sem Credential Manager).
      // O Credential Manager foi removido porque disparava o prompt de
      // "Ativar login por biometria" e o dialog herdava o windowBackground
      // amarelo do splash.
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

        if (!nativeGoogleAuthInit) {
          nativeGoogleAuthInit = GoogleAuth.initialize({
            scopes: ['profile', 'email'],
            grantOfflineAccess: false,
          }).then(() => undefined).catch((error) => {
            nativeGoogleAuthInit = null;
            throw error;
          });
        }
        await nativeGoogleAuthInit;

        const result = await GoogleAuth.signIn();
        const idToken = (result as any)?.authentication?.idToken;

        if (!idToken) {
          return { error: new Error('Google não retornou idToken. Verifique o SHA-1 no Google Cloud Console.') };
        }

        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });

        if (error) {
          console.error('[GoogleAuth] Supabase rejeitou idToken', error);
          return { error: new Error(error.message) };
        }

        return { error: null };
      } catch (e: any) {
        console.error('[GoogleAuth] Exceção no login nativo', e);
        return { error: getNativeGoogleError(e) };
      }
    }


    // Web fallback (OAuth redirect padrão)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' }
      },
    });
    return { error: error as Error | null };
  }, []);

  const signInWithApple = useCallback(async () => {
    const platform = Capacitor.getPlatform();

    if (platform === 'ios') {
      // iOS: usa o fluxo OAuth do Supabase via Browser (Safari View Controller).
      // O SocialLogin/Credential Manager foi removido pra não pedir biometria.
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: 'br.com.vacatio.app://auth-callback',
            skipBrowserRedirect: true,
          },
        });
        if (error) return { error: error as Error };
        if (!data?.url) return { error: new Error('Supabase não retornou URL do OAuth Apple.') };
        await Browser.open({
          url: data.url,
          presentationStyle: 'popover',
          windowName: '_self',
        });
        return { error: null };
      } catch (e: any) {
        console.error('[Apple/iOS] OAuth failed', e);
        return { error: new Error(e?.message || 'Não consegui entrar com a Apple.') };
      }
    }

    // Android: Apple não tem SDK nativo. Abrimos o fluxo OAuth do Supabase
    // DENTRO do app via Chrome Custom Tabs (@capacitor/browser). O callback
    // volta pelo deep link `br.com.vacatio.app://auth-callback?code=...`
    // que o listener `appUrlOpen` (linha ~123) troca por sessão e fecha
    // o Custom Tab. Isso evita a "saída" pro Chrome externo do Android.
    if (platform === 'android') {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: 'br.com.vacatio.app://auth-callback',
            skipBrowserRedirect: true,
            queryParams: { prompt: 'login' },
          },
        });
        if (error) return { error: error as Error };
        if (!data?.url) return { error: new Error('Supabase não retornou URL do OAuth Apple.') };
        await Browser.open({
          url: data.url,
          presentationStyle: 'popover',
          windowName: '_self',
        });
        return { error: null };
      } catch (e: any) {
        console.error('[Apple/Android] in-app OAuth failed', e);
        return { error: new Error(e?.message || 'Não consegui abrir o login com a Apple.') };
      }
    }

    // Web fallback (OAuth redirect padrão) — requer Apple OAuth configurado no Supabase
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  }, []);


  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signInWithApple, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
