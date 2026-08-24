import { Capacitor } from '@capacitor/core';

/**
 * Lovable CDN assets are served at `/__l5e/assets-v1/...` — a relative path
 * that resolves against the current origin. On the web this is the Lovable
 * domain and works fine. Inside the native app (Capacitor) the origin is
 * `http://localhost`, and that path doesn't exist inside the APK bundle,
 * so <img src> requests 404 and the images disappear.
 *
 * This helper prefixes those relative paths with the published Lovable host
 * when running natively, keeping everything unchanged on the web.
 */
const CDN_HOST =
  (import.meta.env.VITE_LOVABLE_ASSETS_HOST as string | undefined)?.replace(/\/+$/, '') ||
  'https://snug-frames.lovable.app';

const isNative = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

/**
 * Mapa de todos os assets binários presentes em `src/assets/` — indexados
 * pelo nome do arquivo original. Vite avalia o glob em build time, empacota
 * cada arquivo dentro do APK/dist, e devolve a URL final já processada.
 * Isso permite que qualquer `.asset.json` seja resolvido para o binário
 * embutido quando o app roda nativo — funciona 100% offline.
 */
const bundledMap: Record<string, string> = (() => {
  const modules = import.meta.glob(
    '/src/assets/**/*.{png,jpg,jpeg,webp,svg,gif,avif,mp3,wav,ogg}',
    { eager: true, query: '?url', import: 'default' },
  ) as Record<string, string>;
  const byName: Record<string, string> = {};
  for (const [path, url] of Object.entries(modules)) {
    const name = path.split('/').pop();
    if (name) byName[name] = url;
  }
  return byName;
})();

type AssetJson = { url?: string; original_filename?: string };

/** Devolve a versão nativa (bundled) quando disponível; senão, cai no CDN. */
function resolveBundled(nameOrUrl: string | undefined | null): string | undefined {
  if (!nameOrUrl) return undefined;
  const name = nameOrUrl.split('/').pop();
  return name ? bundledMap[name] : undefined;
}

export function assetUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/__l5e/')) {
    // Sempre priorize o binário embutido — evita depender do CDN e
    // garante que a imagem apareça offline (native) ou instantaneamente (web).
    const bundled = resolveBundled(url);
    if (bundled) return bundled;
    return isNative ? `${CDN_HOST}${url}` : url;
  }
  return url;
}

/**
 * Resolve um `.asset.json` para a URL correta em cada ambiente.
 * - Se o binário estiver empacotado em `src/assets/`, usa a versão local.
 * - Caso contrário, cai para o CDN (com host absoluto no native).
 */
export function srcOf(asset: AssetJson | string | undefined | null): string {
  if (!asset) return '';
  if (typeof asset === 'string') return assetUrl(asset);
  const bundled = resolveBundled(asset.original_filename || asset.url || '');
  if (bundled) return bundled;
  return assetUrl(asset.url);
}

/**
 * Compat: recebe um caminho bundled explícito + URL do CDN e devolve o
 * melhor dos dois — bundled sempre que existir, CDN como fallback.
 */
export function pickAsset(bundled: string, cdnUrl: string): string {
  return bundled || cdnUrl;
}
