import { useEffect, useState, useRef } from 'react';
import { getLocalCoverUri } from '@/services/blogAssetsPrefetch';
import fallbackCover from '@/assets/covers/fundamentos-da-lei.webp';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  postId: string;
  remoteUrl: string;
}

/**
 * Renderiza a capa do blog priorizando arquivo local (nativo) sobre CDN.
 * Se a URL remota falhar (placeholder inválido, token expirado, sem rede),
 * cai para uma capa bundled localmente.
 */
export default function BlogCoverImage({ postId, remoteUrl, ...rest }: Props) {
  const [src, setSrc] = useState<string>(remoteUrl || fallbackCover);
  const erroredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    erroredRef.current = false;
    (async () => {
      const local = await getLocalCoverUri(postId);
      if (cancelled) return;
      if (local) setSrc(local);
      else setSrc(remoteUrl || fallbackCover);
    })();
    return () => { cancelled = true; };
  }, [postId, remoteUrl]);

  return (
    <img
      src={src}
      {...rest}
      onError={(e) => {
        if (erroredRef.current) return;
        erroredRef.current = true;
        (e.currentTarget as HTMLImageElement).src = fallbackCover;
        rest.onError?.(e);
      }}
    />
  );
}
