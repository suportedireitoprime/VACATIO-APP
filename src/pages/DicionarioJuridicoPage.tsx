import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpenText, X, Loader2, Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useDicionarioJuridico, type DicionarioTermo } from '@/hooks/useDicionarioJuridico';
import { useDicionarioStats } from '@/hooks/useDicionarioStats';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import DicionarioCategoryChips from '@/components/ferramentas/DicionarioCategoryChips';
import DicionarioTermoSheet from '@/components/ferramentas/DicionarioTermoSheet';
import {
  categoriaMatches,
  categoriasDoTermo,
  labelCategoria,
  type CategoriaId,
} from '@/lib/dicionarioCategorias';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 120;

const DicionarioJuridicoPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<CategoriaId>('todas');
  const [selected, setSelected] = useState<DicionarioTermo | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { data: termos = [], isLoading } = useDicionarioJuridico();
  const { data: stats = [] } = useDicionarioStats();
  const voice = useVoiceInput((text) => setQuery(text));

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

  const mobileHeader = (
    <PageHeader
      title="Dicionário Jurídico"
      subtitle={
        termos.length ? `${termos.length.toLocaleString('pt-BR')} termos` : 'Consulte termos e definições'
      }
      onBack={() => navigate(-1)}
    />
  );

  return (
    <DesktopPageLayout
      activeId="ferramentas"
      title="Dicionário Jurídico"
      subtitle={
        termos.length
          ? `${termos.length.toLocaleString('pt-BR')} termos jurídicos`
          : 'Consulte termos e definições jurídicas'
      }
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 lg:px-0 py-4 lg:py-0 pb-24">
        {/* Barra de busca com voz */}
        <div className="max-w-2xl">
          <div
            className={cn(
              'relative flex items-center gap-1.5 pr-1.5 pl-4 h-14 rounded-2xl border transition-colors',
              voice.listening
                ? 'bg-primary/5 border-primary/40 shadow-[0_0_0_4px_hsl(var(--primary)/0.1)]'
                : 'bg-secondary/60 border-border/60'
            )}
          >
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              value={voice.listening && voice.partial ? voice.partial : query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={voice.listening ? 'Ouvindo...' : 'Buscar termo jurídico...'}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
            />
            {query && !voice.listening && (
              <button
                onClick={() => handleSearch('')}
                className="w-8 h-8 rounded-full hover:bg-background/60 flex items-center justify-center"
                aria-label="Limpar"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={voice.toggle}
              aria-label={voice.listening ? 'Parar' : 'Buscar por voz'}
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all',
                voice.listening
                  ? 'bg-destructive text-destructive-foreground animate-pulse'
                  : 'bg-primary text-primary-foreground hover:brightness-110'
              )}
            >
              {voice.listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Chips de categorias */}
        <div className="mt-4">
          <DicionarioCategoryChips active={categoria} onChange={handleCategoria} />
        </div>

        {/* Contagem */}
        <div className="mt-3 mb-3 text-[11px] text-muted-foreground">
          {isLoading && termos.length === 0
            ? 'Carregando...'
            : `${filtered.length.toLocaleString('pt-BR')} ${
                filtered.length === 1 ? 'termo' : 'termos'
              }${categoria !== 'todas' ? ` em ${labelCategoria(categoria)}` : ''}`}
        </div>

        {/* Grade */}
        {isLoading && termos.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Carregando termos...
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center py-16">
            <BookOpenText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum termo encontrado{query ? ` para "${query}"` : ''}.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {shown.map((t, i) => {
                const cats = categoriasDoTermo(t);
                const primaryCat = cats.find((c) => c !== 'latins') ?? cats[0];
                const clicks = clickMap.get(t.palavra);
                return (
                  <motion.button
                    key={`${t.letra}-${t.palavra}`}
                    onClick={() => setSelected(t)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.01, 0.2) }}
                    className="text-left p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                        <span className="font-display text-sm font-bold text-primary">
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
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="px-5 h-10 rounded-xl bg-secondary/70 hover:bg-secondary text-sm font-medium"
                >
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <DicionarioTermoSheet
        termo={selected}
        todos={termos}
        onClose={() => setSelected(null)}
        onSelectRelated={(t) => setSelected(t)}
        emAltaClicks={selected ? clickMap.get(selected.palavra) : undefined}
      />
    </DesktopPageLayout>
  );
};

export default DicionarioJuridicoPage;
