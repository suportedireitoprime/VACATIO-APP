import { useState, useEffect } from 'react';
import { isPdfCached } from '@/services/bibliotecaPdfCache';
import { Capacitor } from '@capacitor/core';

export function useIsPdfCached(url?: string | null) {
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!url || !Capacitor.isNativePlatform()) {
      setCached(false);
      return;
    }
    let isMounted = true;
    isPdfCached(url).then(result => {
      if (isMounted) setCached(result);
    }).catch(() => {
      if (isMounted) setCached(false);
    });
    return () => {
      isMounted = false;
    };
  }, [url]);

  return cached;
}
