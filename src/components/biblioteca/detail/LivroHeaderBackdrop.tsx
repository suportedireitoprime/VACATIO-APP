import { useState, useEffect, type RefObject } from 'react';
import { BookOpen } from 'lucide-react';
import { PrimeImage } from '@/components/ui/PrimeImage';
import { SeloVerificadoBadge } from '@/components/ui/SeloVerificadoBadge';

interface LivroHeaderBackdropProps {
  capaHorizontalUrl?: string | null;
  capaUrl?: string | null;
  titulo: string;
  autor?: string | null;
  area?: string | null;
  contentRef?: RefObject<HTMLDivElement>;
}

export const LivroHeaderBackdrop = ({
  capaHorizontalUrl,
  capaUrl,
  titulo,
  autor,
  area,
  contentRef,
}: LivroHeaderBackdropProps) => {
  // Controle de falha na imagem horizontal para acionar fallback na capa vertical
  const [useFallbackBg, setUseFallbackBg] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  const [frontCoverFailed, setFrontCoverFailed] = useState(false);

  // Reinicia estados se as URLs de props mudarem
  useEffect(() => {
    setUseFallbackBg(false);
    setBgFailed(false);
    setFrontCoverFailed(false);
  }, [capaHorizontalUrl, capaUrl]);

  const handleScrollReset = () => {
    const el = contentRef?.current;
    if (el && el.scrollTop < 4) el.scrollTop = 0;
  };

  // URL efetiva para o fundo: tenta a horizontal; se não existir ou falhar, usa a vertical
  const activeBgUrl = !useFallbackBg && capaHorizontalUrl ? capaHorizontalUrl : (capaUrl || null);

  const handleBgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    if (!useFallbackBg && capaUrl && capaHorizontalUrl) {
      // Falhou a horizontal, tenta usar a capa vertical como backdrop
      setUseFallbackBg(true);
    } else {
      // Ambas falharam ou não há alternativa
      setBgFailed(true);
    }
  };

  return (
    <>
      {/* Backdrop horizontal — cover fills full landscape with palette-tinted gradient */}
      <div className="relative w-full h-[clamp(210px,28dvh,252px)] overflow-hidden bg-neutral-950">
        {/* Glow e gradiente de atmosfera de fundo sempre presente para profundidade premium */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/80 via-neutral-950/90 to-background pointer-events-none" />
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-36 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Camada blur de dispersão de cor */}
        {!bgFailed && activeBgUrl && (
          <img
            key={`blur-${activeBgUrl}`}
            src={activeBgUrl}
            alt=""
            aria-hidden
            loading="eager"
            fetchpriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-50 transition-opacity duration-300"
            onError={handleBgError}
          />
        )}

        {/* Imagem nítida centralizada */}
        {!bgFailed && activeBgUrl && (
          <img
            key={`cover-${activeBgUrl}`}
            src={activeBgUrl}
            alt=""
            aria-hidden
            loading="eager"
            fetchpriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-85 transition-opacity duration-300"
            style={{ objectPosition: 'center' }}
            onLoad={handleScrollReset}
            onError={handleBgError}
          />
        )}

        {/* Palette-tinted gradients to blend suavemente com o conteúdo */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/15 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/25 via-transparent to-primary/15 mix-blend-multiply pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        {/* Capa vertical sobreposta com suporte a zoom tátil em tela cheia */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 w-28 h-40">
          <PrimeImage
            src={capaUrl}
            alt={`Capa da obra: ${titulo}`}
            aspectRatio="auto"
            targetWidth={500}
            priority={true}
            zoomable={true}
            zoomTitle={titulo}
            zoomSubtitle={autor || area || undefined}
            fallbackText={titulo}
            containerClassName="w-28 h-40 rounded-lg shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] ring-1 ring-white/15 overflow-hidden"
            className="w-full h-full object-cover"
            onLoadComplete={handleScrollReset}
          />
        </div>
      </div>

      {/* Título, Autor e Área */}
      <div className="text-center space-y-1.5 pt-4 px-2">
        <h2 className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight break-words px-2">
          {titulo}
        </h2>
        {autor && (
          <p className="text-sm text-muted-foreground">{autor}</p>
        )}
        {area && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase tracking-wider">
              {area}
            </span>
            <SeloVerificadoBadge size={15} title="Obra Auditada e Verificada" />
          </div>
        )}
      </div>
    </>
  );
};

