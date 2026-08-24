import { lazy, ComponentType } from 'react';

const retryPromise = async <T>(
  promiseFactory: () => Promise<T>,
  retriesLeft: number = 3,
  interval: number = 1000
): Promise<T> => {
  try {
    return await promiseFactory();
  } catch (error: any) {
    const isChunkLoadFailed = error?.message?.includes('Failed to fetch dynamically imported module');
    
    // Se for erro de chunk (hash antigo), forçar reload imediatamente
    if (isChunkLoadFailed) {
      const reloadCount = parseInt(sessionStorage.getItem('chunk_reload') || '0', 10);
      if (reloadCount < 1) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        // Retorna uma promise que nunca resolve enquanto a página recarrega
        return new Promise<T>(() => {});
      }
    }

    // Se acabaram as tentativas, joga o erro para o ErrorBoundary
    if (retriesLeft === 1) {
      throw error;
    }

    // Espera e tenta novamente
    await new Promise(resolve => setTimeout(resolve, interval));
    return retryPromise(promiseFactory, retriesLeft - 1, interval);
  }
};

export const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries: number = 3,
  interval: number = 1000
): React.LazyExoticComponent<T> => {
  return lazy(() => retryPromise(componentImport, retries, interval).then(component => {
    return component;
  }));
};
