import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, BookOpenText, X, Loader2, Mic, MicOff } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import { useDicionarioJuridico as useDicionarioData, type DicionarioTermo } from '@/hooks/useDicionarioJuridico';
import { useDicionarioStats } from '@/hooks/useDicionarioStats';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import DicionarioCategoryChips from './DicionarioCategoryChips';
import DicionarioTermoSheet from './DicionarioTermoSheet';
import {
  categoriaMatches,
  categoriasDoTermo,
  labelCategoria,
  type CategoriaId,
} from '@/lib/dicionarioCategorias';
import { cn } from '@/lib/utils';

interface DicionarioJuridicoProps {
  open: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 80;

const DicionarioJuridico = ({ open, onClose }: DicionarioJuridicoProps) => {
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<CategoriaId>('todas');
  const [selected, setSelected] = useState<DicionarioTermo | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { data: termos = [], isLoading } = useDicionarioData();
  const { data: stats = [] } = useDicionarioStats();
  const voice = useVoiceInput((text) => setQuery(text));

  useEffect(() => {
    if (open) {
      setQuery('');
      setCategoria('todas');
      setSelected(null);
      setVisible(PAGE_SIZE);
    }
  }, [open]);

  const clickMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stats) m.set(s.palavra, s.clicks);
    return m;
  }, [stats]);

  const catCache = useMemo(() => new Map<string, ReturnType<typeof categoriasDoTermo>>(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: DicionarioTermo[] = termos;
    if (categoria === 'em_alta') {
      const set = new Set(stats.map((s) => s.palavra));
      list = termos
        .filter((t) => set.has(t.palavra))
        .sort((a, b) => (clickMap.get(b.palavra) ?? 0) - (clickMap.get(a.palavra) ?? 0));
    } else if (categoria !== 'todas') {
      list = termos.filter((t) => categoriaMatches(t, categoria, catCache));
    }
    if (q) {
      list = list.filter(
        (t) => t.palavra.toLowerCase().includes(q) || t.significado.toLowerCase().includes(q)
      );
    }
    return list;
  }, [termos, categoria, query, stats, clickMap, catCache]);

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  const handleCategoria = useCallback((id: CategoriaId) => {
    setCategoria(id);
    setVisible(PAGE_SIZE);
  }, []);

  const handleSearch = useCallback((v: string) => {
    setQuery(v);
    setVisible(PAGE_SIZE);
  }, []);

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 flex flex-col">
          <div className="pt-2.5 pb-1 flex flex-col items-center shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-border" />
          </div>

          <div className="px-4 pt-2 pb-2 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <BookOpenText className="w-5 h-5 text-primary" />
              <h2 className="font-display font-bold text-base">Dicionário Jurídico</h2>
              {termos.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {termos.length.toLocaleString('pt-BR')} termos
                </span>
              )}
            </div>

            <div
              className={cn(
                'relative flex items-center gap-1.5 pr-1 pl-3 h-12 rounded-2xl border transition-colors',
                voice.listening
                  ? 'bg-primary/5 border-primary/40'
                  : 'bg-secondary/60 border-border/60'
              )}
            >
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={voice.listening && voice.partial ? voice.partial : query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={voice.listening ? 'Ouvindo...' : 'Buscar termo jurídico...'}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
              />
              {query && !voice.listening && (
                <button
                  onClick={() => handleSearch('')}
                  className="w-7 h-7 rounded-full hover:bg-background/60 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={voice.toggle}
                aria-label={voice.listening ? 'Parar' : 'Buscar por voz'}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                  voice.listening
                    ? 'bg-destructive text-destructive-foreground animate-pulse'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                {voice.listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-3">
              <DicionarioCategoryChips active={categoria} onChange={handleCategoria} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {isLoading && termos.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Carregando termos...
              </div>
            ) : shown.length === 0 ? (
              <div className="text-center py-10">
                <BookOpenText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum termo encontrado{query ? ` para "${query}"` : ''}.
                </p>
              </div>
            ) : (
              <>
                <div className="text-[11px] text-muted-foreground mb-2">
                  {filtered.length.toLocaleString('pt-BR')} termos
                  {categoria !== 'todas' ? ` em ${labelCategoria(categoria)}` : ''}
                </div>
                <div className="space-y-2">
                  {shown.map((t, i) => {
                    const cats = categoriasDoTermo(t);
                    const primaryCat = cats.find((c) => c !== 'latins') ?? cats[0];
                    const clicks = clickMap.get(t.palavra);
                    return (
                      <motion.button
                        key={`${t.letra}-${t.palavra}`}
                        onClick={() => setSelected(t)}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.008, 0.15) }}
                        className="w-full text-left p-3 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="font-display text-xs font-bold text-primary">
                              {t.letra || t.palavra.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display text-sm font-bold text-foreground truncate">
                              {t.palavra}
                            </h3>
                            <p className="text-xs text-foreground/70 leading-snug line-clamp-2 mt-0.5">
                              {t.significado}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {primaryCat && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                                  {labelCategoria(primaryCat)}
                                </span>
                              )}
                              {cats.includes('latins') && primaryCat !== 'latins' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">
                                  Latim
                                </span>
                              )}
                              {typeof clicks === 'number' && clicks > 0 && (
                                <span className="text-[10px] text-orange-500">🔥 {clicks}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {visible < filtered.length && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      className="px-4 h-9 rounded-xl bg-secondary/70 hover:bg-secondary text-xs font-medium"
                    >
                      Carregar mais
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <DicionarioTermoSheet
        termo={selected}
        todos={termos}
        onClose={() => setSelected(null)}
        onSelectRelated={(t) => setSelected(t)}
        emAltaClicks={selected ? clickMap.get(selected.palavra) : undefined}
      />
    </>
  );
};

export default DicionarioJuridico;
