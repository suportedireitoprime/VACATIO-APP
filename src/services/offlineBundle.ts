/**
 * Carrega arquivos JSON gerados por scripts/export-offline-bundle.mjs.
 * No Electron o bundle vive dentro do .exe/.dmg/.AppImage (dist/offline-bundle),
 * no mobile/web ele é servido como static assets do Vite.
 *
 * Todos os leitores respeitam esta política: primeiro tenta Supabase;
 * se der erro OU vier vazio, usa o bundle. Nunca sobrescreve dados online.
 */

const cache = new Map<string, unknown[]>();
const inflight = new Map<string, Promise<unknown[]>>();

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && (window as any).desktopApp?.isElectron === true;
}

async function fetchBundle<T>(name: string): Promise<T[]> {
  if (cache.has(name)) return cache.get(name) as T[];
  if (inflight.has(name)) return (await inflight.get(name)!) as T[];
  const p = (async () => {
    try {
      const res = await fetch(`/offline-bundle/${name}.json`, { cache: 'force-cache' });
      if (!res.ok) return [];
      const data = (await res.json()) as unknown[];
      cache.set(name, data);
      return data;
    } catch {
      return [];
    } finally {
      inflight.delete(name);
    }
  })();
  inflight.set(name, p);
  return (await p) as T[];
}

export const bundle = {
  resumos: <T = any>() => fetchBundle<T>('resumos'),
  blogPosts: <T = any>() => fetchBundle<T>('blog-posts'),
  noticias: <T = any>() => fetchBundle<T>('noticias'),
  tematicaObras: <T = any>() => fetchBundle<T>('tematica-obras'),
  bibliotecaClassicos: <T = any>() => fetchBundle<T>('biblioteca-classicos'),
  bibliotecaOab: <T = any>() => fetchBundle<T>('biblioteca-oab'),
};

/**
 * Se a query online falhou ou veio vazia, cai no bundle.
 * Ideal pra páginas de leitura: nunca mostra tela vazia.
 */
export async function withBundleFallback<T>(
  online: Promise<T[] | null | undefined>,
  loader: () => Promise<T[]>,
): Promise<T[]> {
  try {
    const data = await online;
    if (data && data.length > 0) return data;
  } catch {}
  return await loader();
}
