import { memo, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { ChevronRight, CheckCircle2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { findColecao, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';
import { withBundleFallback, bundle } from '@/services/offlineBundle';
import { styleForArea } from '@/lib/bibliotecaIcons';
import { useBibliotecaCapa } from '@/hooks/useBibliotecaAsset';
import { useIsPdfCached } from '@/hooks/useIsPdfCached';
import { PrimeImage } from '@/components/ui/PrimeImage';

const VirtualLivroItem = memo(function VirtualLivroItem({
  virtualRow,
  livro: l,
  onClick,
}: {
  virtualRow: VirtualItem;
  livro: LivroNormalizado;
  onClick: () => void;
}) {
  const isDownloaded = useIsPdfCached(l.download);
  const capaUrl = useBibliotecaCapa(l.capa, 200);
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        paddingBottom: '8px',
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/60 text-left active:scale-[0.99] transition-transform w-full h-full relative"
      >
        <div className="w-[56px] h-[76px] shrink-0 rounded-lg overflow-hidden bg-muted border border-border relative">
          {isDownloaded && (
            <div className="absolute top-1 right-1 z-20 bg-black/60 backdrop-blur-sm p-0.5 rounded-full border border-white/10 shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            </div>
          )}
          <PrimeImage
            src={capaUrl}
            alt={l.titulo}
            targetWidth={160}
            aspectRatio="auto"
            containerClassName="w-full h-full"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{l.titulo}</p>
          {l.autor && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{l.autor}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    </div>
  );
});

interface BibliotecaMateriaSheetProps {
  materiaAberta: string | null;
  onClose: () => void;
  onAbrirLivro: (l: LivroNormalizado) => void;
}

export default function BibliotecaMateriaSheet({
  materiaAberta,
  onClose,
  onAbrirLivro,
}: BibliotecaMateriaSheetProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const { data: livrosDaMateria = [], isFetching } = useQuery({
    queryKey: ['biblioteca-materia', materiaAberta],
    enabled: !!materiaAberta,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const colecao = findColecao('areas');
      if (!colecao) return [];
      try {
        const q = supabase.from(colecao.table).select(colecao.select);
        if (materiaAberta === 'Outros') {
          q.is('area', null);
        } else {
          q.eq('area', materiaAberta);
        }
        if (colecao.orderBy) q.order(colecao.orderBy, { ascending: true, nullsFirst: false });
        
        const data = await withBundleFallback(
          q.then((res: any) => res.error ? Promise.reject(res.error) : res.data),
          async () => {
            const rows = await bundle.bibliotecaEstudos();
            return rows ? rows.filter(r => (r.area || 'Outros') === materiaAberta) : [];
          }
        );
        return data.map((r: any) => normalizeLivro(r, colecao));
      } catch (e) {
        return [];
      }
    }
  });

  const rowVirtualizer = useVirtualizer({
    count: livrosDaMateria.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92, // Fase 29: Altura calibrada estritamente (76px imagem + 8px padding + 8px gap) eliminando trepidação
    overscan: 5,
  });

  return (
    <AnimatePresence>
      {materiaAberta && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/80"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-[71] flex h-[90dvh] flex-col rounded-t-3xl border-t border-border bg-background pb-[calc(1rem+var(--sai-bottom))]"
          >
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-secondary/70 flex items-center justify-center shrink-0">
                  {(() => {
                    const s = styleForArea(materiaAberta);
                    const Icon = s.icon;
                    return <Icon className="w-6 h-6" style={{ color: s.color }} strokeWidth={1.4} />;
                  })()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-xl text-foreground font-bold leading-none truncate uppercase">
                    {materiaAberta}
                  </h3>
                  <p className="text-muted-foreground text-[12px] mt-1">
                    {livrosDaMateria.length} {livrosDaMateria.length === 1 ? 'livro' : 'livros'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-9 h-9 rounded-full bg-secondary/70 flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div ref={parentRef} className="flex-1 overflow-y-auto px-4 pb-6 relative">
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const l = livrosDaMateria[virtualRow.index];
                  return (
                    <VirtualLivroItem
                      key={virtualRow.key}
                      virtualRow={virtualRow}
                      livro={l}
                      onClick={() => onAbrirLivro(l)}
                    />
                  );
                })}
              </div>
              {livrosDaMateria.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">Nenhum livro nesta matéria.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
