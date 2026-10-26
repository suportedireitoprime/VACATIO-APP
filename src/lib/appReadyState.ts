/**
 * src/lib/appReadyState.ts
 *
 * Gerencia a coordenação de prontidão (readiness) entre o ciclo de vida
 * da aplicação (Autenticação, checagem de onboarding, rotas e montagem
 * das telas) e a SplashScreen customizada.
 *
 * Garante que a SplashScreen NUNCA desapareça antes que o app esteja
 * 100% montado e pronto para exibição, eliminando a tela preta com spinner
 * intermediário e o efeito de 'montagem em partes' na frente do usuário.
 */

type Listener = (ready: boolean) => void;

let _isAppReady = false;
const listeners = new Set<Listener>();

export function isAppReady(): boolean {
  return _isAppReady;
}

export function markAppReady(): void {
  if (_isAppReady) return;
  _isAppReady = true;
  listeners.forEach((listener) => {
    try {
      listener(true);
    } catch (e) {
      console.warn('[appReadyState] Listener error:', e);
    }
  });
}

export function subscribeAppReady(listener: Listener): () => void {
  listeners.add(listener);
  if (_isAppReady) {
    try {
      listener(true);
    } catch (e) {
      console.warn('[appReadyState] Listener error:', e);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

export function resetAppReady(): void {
  _isAppReady = false;
}
