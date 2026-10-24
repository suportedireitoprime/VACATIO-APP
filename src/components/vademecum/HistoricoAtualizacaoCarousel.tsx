import { useMemo, useRef, useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ArtigoLei } from '@/data/mockData';
import { EDITORIAL_NOTE_REGEX } from './ArtigoBottomSheet';
import {
  type ModItem,
  getCachedNovidades,
  saveCachedNovidades,
  parseNovidadesFromArtigos,
} from '@/lib/novidadesCache';

export type { ModItem };

interface HistoricoAtualizacaoCarouselProps {
  artigos: ArtigoLei[];
  dbAlteracoes: Record<string, unknown>[];
  leiAccent: string;
  leiKey?: string;
  onOpenNovidade: (item: ModItem) => void;
  onViewAll?: () => void;
}


export default function HistoricoAtualizacaoCarousel({
  artigos,
  dbAlteracoes,
  leiAccent,
  leiKey,
  onOpenNovidade,
  onViewAll,
}: HistoricoAtualizacaoCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // 1. Tenta recuperar imediatamente do cache síncrono para renderizar no Frame 0
  const [cachedItems, setCachedItems] = useState<ModItem[]>(() => {
    return leiKey ? (getCachedNovidades(leiKey) || []) : [];
  });

  useEffect(() => {
    if (leiKey) {
      const hit = getCachedNovidades(leiKey);
      if (hit && hit.length > 0) {
        setCachedItems(hit);
      }
    }
  }, [leiKey]);

  // 2. Quando os artigos estão presentes, calcula e alimenta o cache
  const computedItems = useMemo(() => {
    if (!artigos || artigos.length === 0) return null;
    const items = parseNovidadesFromArtigos(artigos, dbAlteracoes);
    if (leiKey && items.length > 0) {
      saveCachedNovidades(leiKey, items);
    }
    return items;
  }, [artigos, dbAlteracoes, leiKey]);

  const itemsToRender = computedItems || cachedItems;

  // Se ainda não temos dados mas os artigos estão em carregamento,
  // renderiza um Skeleton idêntico imediatamente para evitar qualquer salto de layout ("sobe depois")
  if (itemsToRender.length === 0) {
    if (!artigos || artigos.length === 0) {
      return (
        <div className="space-y-3 pt-6 pb-2 -mx-2 sm:-mx-4 md:-mx-6">
          <div className="px-4 sm:px-6 md:px-8 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-foreground text-[16px] sm:text-[18px] font-bold mb-0.5 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: leiAccent }} />
                <span>Novidades</span>
              </h3>
              <p className="font-body text-muted-foreground text-[12px] leading-snug ml-[14px]">
                Últimos artigos atualizados nesta legislação
              </p>
            </div>
          </div>
          <div className="flex gap-3 md:gap-4 overflow-x-hidden pb-3 pt-1 px-[5%] md:px-[4%] lg:px-[3%]">
            <div className="shrink-0 w-[70%] sm:w-[60%] md:w-[45%] lg:w-[30%]">
              <div className="w-full h-[140px] rounded-2xl bg-card/60 border border-white/5 p-4 flex flex-col justify-between animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="w-24 h-4 rounded-full bg-white/10" />
                  <div className="w-6 h-6 rounded-full bg-white/5" />
                </div>
                <div className="w-24 h-5 rounded bg-white/10" />
                <div className="w-full h-10 rounded-lg bg-black/20" />
              </div>
            </div>
            <div className="shrink-0 w-[70%] sm:w-[60%] md:w-[45%] lg:w-[30%] opacity-60">
              <div className="w-full h-[140px] rounded-2xl bg-card/60 border border-white/5 p-4 flex flex-col justify-between animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="w-24 h-4 rounded-full bg-white/10" />
                  <div className="w-6 h-6 rounded-full bg-white/5" />
                </div>
                <div className="w-24 h-5 rounded bg-white/10" />
                <div className="w-full h-10 rounded-lg bg-black/20" />
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-3 pt-6 pb-2 -mx-2 sm:-mx-4 md:-mx-6">
      <div className="px-4 sm:px-6 md:px-8 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-foreground text-[16px] sm:text-[18px] font-bold mb-0.5 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: leiAccent }} />
            <span className="truncate">Novidades</span>
          </h3>
          <p className="font-body text-muted-foreground text-[12px] leading-snug ml-[14px] truncate">
            Últimos artigos atualizados nesta legislação
          </p>
        </div>
        
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/10 bg-card hover:bg-muted/80 px-3 py-1.5 text-[12px] font-semibold text-foreground active:scale-[0.96] transition-all shadow-sm"
          >
            <span>Ver tudo</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 pt-1 px-[5%] md:px-[4%] lg:px-[3%] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {itemsToRender.map((item, i) => {
          const t = item.tipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          let typeColor = 'text-muted-foreground border-white/10 bg-white/5';
          if (t.startsWith('revogad') || t.startsWith('vetad') || t.startsWith('suprimid')) typeColor = 'text-red-500 border-red-500/20 bg-red-500/10';
          else if (t.startsWith('incluid') || t.startsWith('acrescid')) typeColor = 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
          else if (t.startsWith('redacao') || t.startsWith('alterad')) typeColor = 'text-[#60a5fa] border-[#3b82f6]/20 bg-[#3b82f6]/10';

          const previewText = item.artigo.caput
            .replace(EDITORIAL_NOTE_REGEX, '')
            .split('\n').filter(l => l.trim())[0] || '';

          const totalAlt = (item.artigo.caput.match(new RegExp(EDITORIAL_NOTE_REGEX.source, 'gi')) || []).length;

          return (
            <div
              key={`${item.artigo.id}-${i}`}
              onClick={() => onOpenNovidade(item)}
              className="snap-center shrink-0 w-[70%] sm:w-[60%] md:w-[45%] lg:w-[30%] text-left cursor-pointer"
            >
              <div className="w-full h-[140px] flex flex-col p-4 rounded-2xl transition-all duration-300 bg-card hover:bg-secondary/60 shadow-sm border border-white/5 group-active:scale-[0.98]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeColor.replace('/10', '/20')}`}>
                    {item.tipo} {item.ano ? `EM ${item.ano}` : ''}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="font-display text-[15.5px] font-bold text-primary-light">Art. {item.artigo.numero.replace(/^Art\.\s*/i, '')}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
                    {item.parteModificada}
                  </span>
                  {totalAlt > 0 && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground/80 shrink-0">
                      {totalAlt} {totalAlt === 1 ? 'alt. total' : 'alts. totais'}
                    </span>
                  )}
                </div>

                {previewText && (
                  <div className="bg-black/20 rounded-lg px-2.5 py-1.5 flex-1 overflow-hidden flex flex-col justify-center border border-white/[0.02]">
                    <p className="text-[11.5px] text-muted-foreground/80 leading-[1.4] line-clamp-2 italic font-medium">
                      "{previewText}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
