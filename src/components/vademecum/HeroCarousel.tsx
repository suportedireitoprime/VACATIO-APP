import { useState, useEffect, useCallback, useRef } from 'react';
import { pickAsset, assetUrl } from '@/lib/assetUrl';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Bell } from 'lucide-react';
import vacatioLogoAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import vacatioLogoBundled from '@/assets/bundled/logo-vacatio-v2.webp';
const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);
import { getNoticiasCache, prefetchNoticias, type Noticia } from '@/services/noticiasService';
import { getLatestDayCount, getResenhaCache, prefetchResenha } from '@/services/atualizacaoService';
import { newsImg } from '@/lib/cdnImg';
import { heroFigures } from '@/assets/hero-figures';
import HeroOrnaments from './HeroOrnaments';

const HeroCarousel = () => {
  const navigate = useNavigate();
  const autoplayPlugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, skipSnaps: false },
    [autoplayPlugin.current]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [figureIndex, setFigureIndex] = useState(0);
  const [noticias, setNoticias] = useState<Noticia[]>(() => {
    const cached = getNoticiasCache();
    return cached ? cached.filter(n => n.imagem_url?.trim()).slice(0, 10) : [];
  });
  const [badgeCount, setBadgeCount] = useState(0);

  // Novidades badge
  useEffect(() => {
    const cached = getResenhaCache();
    if (cached) {
      setBadgeCount(getLatestDayCount());
    } else {
      prefetchResenha().then(() => setBadgeCount(getLatestDayCount()));
    }
  }, []);

  // Load news
  useEffect(() => {
    if (noticias.length > 0) return;

    prefetchNoticias();

    const interval = setInterval(() => {
      const cached = getNoticiasCache();
      if (cached && cached.length > 0) {
        setNoticias(cached.filter(n => n.imagem_url?.trim()).slice(0, 10));
        clearInterval(interval);
      }
    }, 300);

    const timeout = setTimeout(() => clearInterval(interval), 8000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // Roda a figura vazada do primeiro slide a cada 5s, apenas enquanto o
  // primeiro slide está visível (para não desperdiçar work quando o usuário
  // está lendo notícias no slide 1+).
  useEffect(() => {
    if (selectedIndex !== 0) return;
    const id = setInterval(() => {
      setFigureIndex(i => (i + 1) % heroFigures.length);
    }, 5000);
    return () => clearInterval(id);
  }, [selectedIndex]);

  const totalSlides = 1 + noticias.length;

  /* ── Logo + Novidades overlays (shared) ──────────────── */
  const logoOverlay = (
    <div className="absolute top-3 left-4 md:top-5 md:left-6 lg:top-6 lg:left-10 z-20 flex items-center gap-2 md:gap-2.5 lg:gap-3">
      <img src={vacatioLogo} alt="Vacatio" loading="eager" decoding="sync" fetchPriority="high" className="w-9 h-9 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full md:rounded-xl lg:rounded-2xl object-cover border border-primary/30 lg:border-2 lg:shadow-lg" />
      <div>
        <h1 className="font-display text-base md:text-xl lg:text-2xl text-gradient-gold leading-none">Vacatio</h1>
        <p className="font-display text-[10px] md:text-xs lg:text-sm text-white/60">Vade Mecum Profissional</p>
      </div>
    </div>
  );

  const novidadesButton = (
    <button
      onClick={() => { setBadgeCount(0); navigate('/novidades'); }}
      className="absolute top-3 right-4 md:top-5 md:right-6 lg:top-6 lg:right-10 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:bg-black/50 transition-colors"
    >
      <Bell className="w-[18px] h-[18px] md:w-5 md:h-5 text-white" />
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );


  /* ── Slide content overlay ────────────────────────────── */
  const slideContent = (title: string, subtitle: string) => (
    <div className="relative z-10 h-full flex flex-col justify-end lg:justify-center px-4 pb-8 sm:px-6 md:px-8 md:pb-10 lg:px-10 lg:pb-0">
      <div className="md:max-w-lg lg:max-w-xl">
        <h2 className="font-display text-lg sm:text-xl md:text-2xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight drop-shadow-lg">
          {title}
        </h2>
        <p className="text-white/70 text-sm md:text-base lg:text-lg mt-1 md:mt-2 lg:mt-3">{subtitle}</p>
      </div>
    </div>
  );


  /* ── Slide "Vade Mecum" (primeiro) — fundo wine + ornamentos SVG + figura vazada rotativa ─── */
  const currentFigure = heroFigures[figureIndex];
  const figurePosition =
    currentFigure.side === 'left'
      ? 'left-0 justify-start'
      : currentFigure.side === 'right'
      ? 'right-0 justify-end'
      : 'inset-x-0 justify-center';
  const figureAnimClass =
    currentFigure.side === 'left' ? 'animate-figure-in-left' : 'animate-figure-in';

  const vadeMecumSlide = (
    <>
      {/* Fundo gradiente wine */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, hsl(340 55% 8%) 0%, hsl(340 60% 14%) 55%, hsl(340 55% 10%) 100%)',
        }}
      />
      {/* Ornamentos SVG animados (colunas, arco, laurel, filigrana + shimmer) */}
      <HeroOrnaments />

      {/* Figura vazada rotativa */}
      <div
        key={figureIndex}
        className={`absolute top-2 bottom-2 lg:top-4 lg:bottom-4 ${figurePosition} flex items-center pointer-events-none`}
      >
        <img
          src={assetUrl(currentFigure.url)}
          alt={currentFigure.alt}
          className={`h-full w-auto max-w-[65%] sm:max-w-[55%] lg:max-w-[45%] object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.55)] ${figureAnimClass}`}
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Gradiente escurecedor para legibilidade do texto */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background/80 lg:bg-gradient-to-r lg:from-background/85 lg:via-background/40 lg:to-transparent pointer-events-none" />

      {/* Texto */}
      <div className="relative z-10 h-full flex flex-col justify-end lg:justify-center px-4 pb-8 sm:px-6 md:px-8 md:pb-10 lg:px-10 lg:pb-0">
        <div className="md:max-w-lg lg:max-w-xl">
          <h2 className="font-display text-lg sm:text-xl md:text-2xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight drop-shadow-lg">
            Vade Mecum Jurídico Profissional
          </h2>
          <p
            key={`cap-${figureIndex}`}
            className="text-white/75 text-sm md:text-base lg:text-lg mt-1 md:mt-2 lg:mt-3 animate-caption-in"
          >
            {currentFigure.caption}
          </p>
        </div>
      </div>
    </>
  );


  if (noticias.length === 0) {
    return (
      <div className="relative h-52 sm:h-56 md:h-72 lg:h-[340px] xl:h-[400px] overflow-hidden">
        {vadeMecumSlide}
        {logoOverlay}
        {novidadesButton}
      </div>
    );
  }

  return (
    <div className="relative h-52 sm:h-56 md:h-72 lg:h-[340px] xl:h-[400px] overflow-hidden">

      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {/* First slide: Vade Mecum com ornamentos + figura vazada rotativa */}
          <div className="relative flex-[0_0_100%] min-w-0 h-full cursor-pointer" onClick={() => navigate('/noticias')}>
            {vadeMecumSlide}
          </div>


          {/* News slides */}
          {noticias.map((noticia, index) => (
            <div
              key={noticia.id}
              className="relative flex-[0_0_100%] min-w-0 h-full cursor-pointer"
              onClick={() => navigate('/noticias', { state: { noticiaId: noticia.id } })}
            >
              <img
                src={newsImg(noticia.imagem_url!, 800)}
                alt={noticia.titulo}
                className="absolute inset-0 w-full h-full object-cover"
                loading={index < 2 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background/90 lg:bg-gradient-to-r lg:from-background lg:via-background/70 lg:to-transparent" />
              <div className="relative z-10 h-full flex flex-col justify-end lg:justify-center px-4 pb-8 sm:px-6 md:px-8 md:pb-10 lg:px-10 lg:pb-0">
                <div className="md:max-w-lg lg:max-w-xl">
                  <span className="self-start text-[9px] md:text-[10px] lg:text-xs font-bold uppercase tracking-wider text-primary-foreground bg-primary/80 px-2 py-0.5 md:px-2.5 lg:px-3 lg:py-1 rounded-full mb-2 inline-block">
                    {noticia.categoria || 'Notícia'}
                  </span>
                  <h2 className="font-display text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-tight line-clamp-2 drop-shadow-lg mt-2">
                    {noticia.titulo}
                  </h2>
                </div>
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* Logo overlay */}
      {logoOverlay}

      {/* Novidades button */}
      {novidadesButton}

      {/* Dots */}
      <div className="absolute bottom-2 lg:bottom-6 left-1/2 lg:left-10 lg:translate-x-0 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? 'w-5 h-1.5 lg:w-7 lg:h-2 bg-primary'
                : 'w-1.5 h-1.5 lg:w-2 lg:h-2 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
