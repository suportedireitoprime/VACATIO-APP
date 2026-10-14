import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CapaOtimizadaProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  animacaoEntrada?: boolean;
}

export const CapaOtimizada = React.memo(function CapaOtimizada({
  className,
  animacaoEntrada = false,
  src,
  alt,
  ...props
}: CapaOtimizadaProps) {
  const [loaded, setLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setMounted(true);
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden w-full h-full bg-zinc-900 block", className)}>
      {!loaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "w-full h-full object-cover transition-all duration-[800ms] ease-out block",
          !loaded ? "opacity-0" : "opacity-100",
          animacaoEntrada && mounted && loaded ? "scale-100" : (animacaoEntrada ? "scale-110" : "")
        )}
        {...props}
      />
    </div>
  );
});

