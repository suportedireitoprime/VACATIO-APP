import { memo } from 'react';
import { pickAsset } from '@/lib/assetUrl';
import logoVacatioAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import logoVacatioBundled from '@/assets/bundled/logo-vacatio-v2.webp';

const logoVacatio = pickAsset(logoVacatioBundled, logoVacatioAsset.url);

interface HomeBrandBannerProps {
  perfilLabel?: string;
}

const HomeBrandBanner = ({ perfilLabel }: HomeBrandBannerProps) => {
  return (
    <div className="flex flex-col items-center text-center gap-1 z-[10] relative w-[42%] max-w-[160px] ml-2 sm:ml-4">
      {/* Selo / Brasão Dourado Circular */}
      <div className="relative h-[75px] mb-1 flex items-center justify-center">
        <div className="relative w-[70px] h-[70px] rounded-full border-2 border-white/90 bg-primary flex items-center justify-center overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.5)] logo-shine">
          <img
            src={logoVacatio}
            alt="Vade Mecum"
            loading="eager"
            decoding="async"
            width={70}
            height={70}
            fetchPriority="high"
            className="w-full h-full rounded-full object-cover scale-[1.08]"
          />
        </div>
      </div>

      <h1 className="font-serif italic text-white text-[19px] sm:text-[21px] leading-[1.05] font-semibold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] whitespace-nowrap">
        Vade Mecum
      </h1>

      <p className="font-body text-white/95 text-[9px] sm:text-[10px] font-bold tracking-[0.25em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1">
        {perfilLabel ? perfilLabel.toUpperCase() : 'USO PROFISSIONAL'}
      </p>

      {/* Frase / Lema Institucional com divisor vertical */}
      <div className="mt-2.5 flex items-center text-left gap-2 w-full justify-center">
        <div className="w-[2px] h-7 bg-white/40 rounded-full shrink-0" />
        <p className="font-serif italic text-white/80 text-[11px] sm:text-[12px] leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          Consulte as leis,<br />domine o Direito.
        </p>
      </div>
    </div>
  );
};

export default memo(HomeBrandBanner);
