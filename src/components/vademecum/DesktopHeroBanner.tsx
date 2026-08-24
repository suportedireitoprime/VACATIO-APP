import { Search } from 'lucide-react';
import heroBannerAsset from '@/assets/desktop-hero-banner.webp';

const heroBanner = heroBannerAsset;

export interface DesktopHeroFunction {
  id: string;
  label: string;
  svg: React.ReactNode;
  onClick: () => void;
}

interface Props {
  typingHint?: string;
  onSearchClick?: () => void;
  /** @deprecated Functions now render below the hero via DesktopFunctionRow */
  functions?: DesktopHeroFunction[];
}

const DesktopHeroBanner = ({ typingHint = 'Buscar lei...', onSearchClick }: Props) => {
  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: '360px' }}>
      <img
        src={heroBanner}
        alt="Vacatio banner"
        className="absolute inset-0 w-full h-full object-cover object-center"
        width={1920}
        height={512}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

      <div className="relative z-10 flex items-center h-full min-h-[360px] px-12 xl:px-20 2xl:px-28 py-10">
        <div className="max-w-3xl space-y-6">
          <div className="space-y-3">
            <h2 className="font-display text-3xl xl:text-4xl font-bold text-foreground leading-snug">
              Toda a{' '}
              <span className="underline decoration-primary decoration-2 underline-offset-4">
                legislação brasileira
              </span>{' '}
              comentada e explicada.
            </h2>
            <p className="text-muted-foreground text-base xl:text-lg font-body leading-relaxed max-w-2xl">
              Lei seca, comentários, explicações artigo por artigo, narração, resumos e muito mais
              para você <span className="text-primary font-semibold">dominar a legislação</span>.
            </p>
          </div>

          {/* Search bar */}
          <button
            onClick={onSearchClick}
            className="group relative w-full max-w-2xl flex items-center h-16 pl-6 pr-20 rounded-2xl bg-card/90 backdrop-blur border-2 border-primary/40 shadow-2xl shadow-primary/20 hover:border-primary/70 transition-colors text-left"
          >
            <Search className="w-5 h-5 text-primary shrink-0 mr-3" />
            <span className="text-foreground/80 text-base xl:text-lg font-body truncate">
              {typingHint}
              <span className="animate-pulse text-primary">|</span>
            </span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/40 group-hover:bg-primary/90 transition-colors">
              Pesquisar
            </span>
          </button>

          <p className="text-muted-foreground text-sm font-body flex items-center gap-2">
            <span className="text-primary">★</span> +10.000 alunos já estudam com a gente
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesktopHeroBanner;

