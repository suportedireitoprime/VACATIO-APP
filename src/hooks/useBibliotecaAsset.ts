import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getLocalCoverUrl } from '@/services/bibliotecaCapasPrefetch';
import { directImg } from '@/lib/cdnImg';

/**
 * Retorna URL local (filesystem) da capa se já baixada em nativo,
 * ou a URL CDN otimizada em web/desktop.
 */
export function useBibliotecaCapa(remoteUrl: string | null | undefined, width = 300): string {
  const cdn = remoteUrl ? directImg(remoteUrl, width) : '';
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!remoteUrl || !Capacitor.isNativePlatform()) { setLocal(null); return; }
    (async () => {
      const url = await getLocalCoverUrl(remoteUrl);
      if (!cancelled) setLocal(url);
    })();
    return () => { cancelled = true; };
  }, [remoteUrl]);

  return local || cdn;
}
