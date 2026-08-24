import { ChevronRight } from 'lucide-react';
import { pickAsset } from '@/lib/assetUrl';
import camaraPlenarioAsset from '@/assets/radar/camara-plenario.webp.asset.json';
import camaraPlenarioBundled from '@/assets/bundled/radar/camara-plenario.webp';
const camaraPlenario = pickAsset(camaraPlenarioBundled, camaraPlenarioAsset.url);

interface PLNewsCardProps {
  pl: {
    id: string | number;
    numero?: number;
    ano?: number;
    ementa: string;
    autorNome?: string;
    autorFoto?: string | null;
    dataApresentacao?: string;
    headline?: string | null;
  };
  onVerAnalise: () => void;
}

const PLNewsCard = ({ pl, onVerAnalise }: PLNewsCardProps) => {
  return (
    <div
      onClick={onVerAnalise}
      className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50 cursor-pointer active:bg-muted/50 transition-colors"
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden bg-muted mt-0.5">
        {pl.autorFoto ? (
          <img src={pl.autorFoto} alt="" className="w-full h-full object-cover" />
        ) : (
          <img src={camaraPlenario} alt="Câmara dos Deputados" className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground leading-5 line-clamp-3 h-[60px]">
          {pl.headline || pl.ementa}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[9px] bg-primary/15 text-primary font-semibold px-1.5 py-0.5 rounded">
            PL {pl.numero}/{pl.ano}
          </span>
          <span className="text-[10px] text-muted-foreground truncate">
            {pl.autorNome || 'Câmara dos Deputados'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
        </div>
      </div>
    </div>
  );
};

export default PLNewsCard;
