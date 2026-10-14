import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("relative overflow-hidden w-full h-full bg-zinc-900", className)}>
      {!loaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={cn(
          "w-full h-full object-cover transition-all duration-[1200ms] ease-out",
          !loaded ? "opacity-0" : "opacity-100",
          animacaoEntrada && mounted && loaded ? "scale-100" : (animacaoEntrada ? "scale-125" : "")
        )}
        {...props}
      />
    </div>
  );
});
