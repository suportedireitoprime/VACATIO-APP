import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Loader2, Gavel, Scale, ChevronRight, Ban, BadgeCheck, Heart, Clock, List, RefreshCw, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fetchSumulas, getSumulasCached, subscribeSumulas, fetchSumulasFavoritas, syncSumulasFavoritas, toggleSumulaFavorita, SUMULA_TRIBUNAIS, type Sumula } from '@/services/sumulasService';
import SumulaVinculanteSheet from '@/components/vademecum/SumulaVinculanteSheet';
import ArtigoBottomSheet from '@/components/vademecum/ArtigoBottomSheet';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  tribunal: 'STF_VINCULANTE' | 'STF' | 'STJ';
}

const GRADIENT: Record<Props['tribunal'], string> = {
  STF_VINCULANTE: 'from-red-600 via-red-700 to-red-800',
  STF: 'from-blue-700 to-blue-900',
  STJ: 'from-emerald-600 to-emerald-800',
};

const SITUACAO_STYLE: Record<string, { label: string; icon: typeof Ban; className: string; barColor?: string }> = {
  vigente:   { label: 'Vigente',   icon: BadgeCheck, className: 'bg-emerald-400/15 text-emerald-300' },
  cancelada: { label: 'Cancelada', icon: Ban,        className: 'bg-red-500/15 text-red-400', barColor: '#ef4444' },
  revogada:  { label: 'Revogada',  icon: XCircle,    className: 'bg-orange-500/15 text-orange-400', barColor: '#f97316' },
  alterada:  { label: 'Alterada',  icon: RefreshCw,  className: 'bg-amber-400/15 text-amber-300', barColor: '#f59e0b' },
};

const SumulasTribunal = ({ tribunal }: Props) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [params] = useSearchParams();
  const [sumulas, setSumulas] = useState<Sumula[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [open, setOpen] = useState<Sumula | null>(null);
  const [tab, setTab] = useState<'todas' | 'favoritas' | 'recentes'>('todas');

  const favKey = `sumulas:${tribunal}:favoritas`;
  const recKey = `sumulas:${tribunal}:recentes`;
  const [favoritas, setFavoritas] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(favKey) || '[]'); } catch { return []; }
  });
  const [recentes, setRecentes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(recKey) || '[]'); } catch { return []; }
  });

  const saveFavoritasLocal = (ids: string[]) => {
    setFavoritas(ids);
    localStorage.setItem(favKey, JSON.stringify(ids));
  };

  const toggleFav = async (sumula: Sumula) => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error('Faça login para favoritar súmulas.');
      return;
    }

    const wasFavorite = favoritas.includes(sumula.id);
    const optimistic = wasFavorite
      ? favoritas.filter((id) => id !== sumula.id)
      : [sumula.id, ...favoritas];
    saveFavoritasLocal(optimistic);

    try {
      const result = await toggleSumulaFavorita(tribunal, accessToken, sumula.numero);
      const confirmed = result.favoritada
        ? Array.from(new Set([sumula.id, ...optimistic]))
        : optimistic.filter((id) => id !== sumula.id);
      saveFavoritasLocal(confirmed);
      toast.success(result.favoritada ? 'Súmula adicionada aos favoritos' : 'Súmula removida dos favoritos');
    } catch (error) {
      saveFavoritasLocal(favoritas);
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o favorito.');
    }
  };

  const pushRecente = (id: string) => {
    setRecentes((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 50);
      localStorage.setItem(recKey, JSON.stringify(next));
      return next;
    });
  };

  const info = SUMULA_TRIBUNAIS.find((t) => t.id === tribunal);

  useEffect(() => {
    let alive = true;
    const cached = getSumulasCached(tribunal);
    if (cached && cached.length > 0) {
      setSumulas(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetchSumulas(tribunal).then((data) => {
      if (!alive) return;
      setSumulas(data);
      setLoading(false);
    });
    const unsub = subscribeSumulas(tribunal, (rows) => {
      if (!alive) return;
      setSumulas(rows);
      setLoading(false);
    });
    return () => { alive = false; unsub(); };
  }, [tribunal]);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken || sumulas.length === 0) return;
    let alive = true;

    const hydrateFavoritas = async () => {
      try {
        const localNumeros = favoritas
          .map((id) => sumulas.find((sumula) => sumula.id === id)?.numero)
          .filter((numero): numero is number => typeof numero === 'number');
        if (localNumeros.length > 0) {
          await syncSumulasFavoritas(tribunal, accessToken, localNumeros);
        }
        const numeros = await fetchSumulasFavoritas(tribunal, accessToken);
        if (!alive) return;
        const numeroSet = new Set(numeros);
        saveFavoritasLocal(sumulas.filter((sumula) => numeroSet.has(sumula.numero)).map((sumula) => sumula.id));
      } catch (error) {
        console.error('Erro ao carregar favoritos de súmulas:', error);
      }
    };

    hydrateFavoritas();
    return () => { alive = false; };
  }, [session?.access_token, tribunal, sumulas]);

  const filtered = useMemo(() => {
    let base = sumulas;
    if (tab === 'favoritas') {
      const set = new Set(favoritas);
      base = sumulas.filter((s) => set.has(s.id));
    } else if (tab === 'recentes') {
      const order = new Map(recentes.map((id, i) => [id, i]));
      base = sumulas
        .filter((s) => order.has(s.id))
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(
      (s) => s.enunciado.toLowerCase().includes(q) || String(s.numero).includes(q)
    );
  }, [sumulas, search, tab, favoritas, recentes]);

  const TABS: { id: typeof tab; label: string; icon: typeof List; count: number }[] = [
    { id: 'todas', label: 'Todas', icon: List, count: sumulas.length },
    { id: 'favoritas', label: 'Favoritas', icon: Heart, count: favoritas.length },
    { id: 'recentes', label: 'Recentes', icon: Clock, count: recentes.length },
  ];

  return (
    <div className="min-h-dvh bg-background pb-20 lg:pb-0">
      <div className={`bg-gradient-to-br ${GRADIENT[tribunal]} px-4 pt-10 pb-6 sm:px-6 md:px-8`}>
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/jurisprudencia')}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white font-medium transition-all text-sm px-3 py-1.5 rounded-lg mb-4 touch-manipulation select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Gavel className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-white font-bold">{info?.nome || tribunal}</h1>
              <p className="text-white/70 text-sm">{sumulas.length} súmulas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 space-y-4">
        <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-card text-primary-light shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-primary/15 text-primary-light' : 'bg-background/60'}`}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou enunciado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary border-border"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Carregando jurisprudência...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((sumula, i) => {
              const isFav = favoritas.includes(sumula.id);
              return (
              <motion.div
                key={sumula.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.01, 0.5) }}
                onClick={() => { pushRecente(sumula.id); setOpen(sumula); }}
                className="w-full text-left rounded-2xl bg-card hover:bg-secondary/60 transition-all group flex overflow-hidden min-h-[82px] cursor-pointer"
              >
                <div
                  className="w-1.5 rounded-l-2xl shrink-0"
                  style={{ backgroundColor: SITUACAO_STYLE[sumula.situacao]?.barColor || info?.iconColor || 'hsl(var(--primary))' }}
                />
                <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4 text-primary-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-display text-[15px] font-bold text-primary-light">
                        Súmula {tribunal === 'STF_VINCULANTE' ? 'Vinculante ' : ''}{sumula.numero}
                      </h4>
                      {(() => {
                        const st = SITUACAO_STYLE[sumula.situacao];
                        if (!st) return null;
                        const Icon = st.icon;
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${st.className}`}>
                            <Icon className="w-3 h-3" /> {st.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[13px] leading-relaxed line-clamp-2 text-foreground/80">
                      {sumula.enunciado}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void toggleFav(sumula); }}
                    className="p-2 rounded-lg hover:bg-background/60 shrink-0 transition-colors"
                    aria-label={isFav ? 'Remover favorito' : 'Adicionar aos favoritos'}
                  >
                    <Heart className={`w-4 h-4 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                </div>
              </motion.div>
              );
            })}
            {filtered.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                {tab === 'favoritas'
                  ? 'Nenhuma súmula favoritada ainda.'
                  : tab === 'recentes'
                  ? 'Nenhuma súmula acessada recentemente.'
                  : 'Nenhuma jurisprudência encontrada.'}
              </p>
            )}
          </div>
        )}
      </div>

      {open && tribunal === 'STF_VINCULANTE' && (
        <SumulaVinculanteSheet
          sumula={open}
          isFavorita={favoritas.includes(open.id)}
          onToggleFavorita={() => void toggleFav(open)}
          onClose={() => setOpen(null)}
        />
      )}
      {open && tribunal !== 'STF_VINCULANTE' && (
        <ArtigoBottomSheet
          artigo={{
            id: open.id,
            numero: `Súmula ${open.numero}`,
            caput: open.enunciado,
          }}
          isFavorito={favoritas.includes(open.id)}
          onToggleFavorito={() => void toggleFav(open)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
};

export const SumulasVinculantes = () => <SumulasTribunal tribunal="STF_VINCULANTE" />;
export const SumulasSTF = () => <SumulasTribunal tribunal="STF" />;
export const SumulasSTJ = () => <SumulasTribunal tribunal="STJ" />;

export default SumulasTribunal;