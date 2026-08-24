// Loader único da Maps JavaScript API.
// - Carrega sob demanda (só quando uma tela de mapa monta).
// - Usa `loading=async` + callback global, como a Google recomenda.
// - Nunca carrega duas vezes: promessa memoizada no módulo.

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

const CALLBACK_NAME = '__vacatioInitGoogleMaps';

let promise: Promise<any> | null = null;

export function isGoogleMapsConfigured(): boolean {
  return Boolean(BROWSER_KEY);
}

export function loadGoogleMaps(): Promise<any> {
  if (promise) return promise;

  promise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Mapa indisponível neste ambiente.'));
      return;
    }

    const existing = (window as any).google?.maps;
    if (existing?.Map) {
      resolve(existing);
      return;
    }

    if (!BROWSER_KEY) {
      reject(new Error('Mapa não configurado (chave ausente).'));
      return;
    }

    if (navigator.onLine === false) {
      reject(new Error('Sem internet para carregar o mapa.'));
      return;
    }

    (window as any)[CALLBACK_NAME] = () => {
      const maps = (window as any).google?.maps;
      if (maps?.Map) resolve(maps);
      else reject(new Error('Falha ao inicializar o mapa.'));
    };

    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: 'async',
      callback: CALLBACK_NAME,
      language: 'pt-BR',
      region: 'BR',
    });
    if (TRACKING_ID) params.set('channel', TRACKING_ID);

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      promise = null;
      reject(new Error('Não foi possível carregar o mapa.'));
    };
    document.head.appendChild(script);
  });

  promise.catch(() => { promise = null; });
  return promise;
}