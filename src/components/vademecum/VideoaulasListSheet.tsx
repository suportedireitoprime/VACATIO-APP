import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Eye, ThumbsUp, Clock, TrendingUp, Sparkles, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import GeracaoAnimacaoOverlay from './GeracaoAnimacaoOverlay';
import {
  loadVideoaulas,
  getCachedData,
  videoaulasKey,
  type VideoaulasPayload,
} from '@/lib/artigoFuncoesPrefetch';

const VIDEOAULAS_STEPS = [
  'Pesquisando no YouTube',
  'Comparando visualizações e likes',
  'Selecionando as melhores aulas',
  'Pronto',
];

export interface VideoaulaItem {
  tipo: 'mais_visto' | 'mais_curtido' | 'mais_recente';
  videoId: string;
  titulo: string;
  canal: string;
  thumb: string;
  views: number;
  likes: number;
  publishedAt: string;
  duration: string;
  url: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tabelaNome: string;
  artigoNumero: string;
  leiNome?: string;
  onSelectVideo: (v: VideoaulaItem) => void;
}

const TIPO_META: Record<VideoaulaItem['tipo'], { label: string; icon: any; gradient: string; badge: string }> = {
  mais_visto: { label: 'Mais assistido', icon: Flame, gradient: 'from-orange-500 to-red-500', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  mais_curtido: { label: 'Mais curtido', icon: Sparkles, gradient: 'from-yellow-400 to-amber-500', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  mais_recente: { label: 'Mais recente', icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
};

function formatCount(n: number): string {
  if (!n || n < 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(iso: string): string {
  if (!iso) return '';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '';
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const s = Number(m[3] || 0);
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${min}:${String(s).padStart(2, '0')}`;
}

function relativeDays(iso: string): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  if (days < 365) return `há ${Math.floor(days / 30)} meses`;
  return `há ${Math.floor(days / 365)} anos`;
}

const VideoaulasListSheet = ({ open, onClose, tabelaNome, artigoNumero, leiNome, onSelectVideo }: Props) => {
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoaulaItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !tabelaNome || !artigoNumero) return;
    let cancelled = false;
    const cached = getCachedData<VideoaulasPayload>(videoaulasKey(tabelaNome, artigoNumero), 30 * 60 * 1000);
    if (cached) {
      // Já pré-carregado quando o artigo abriu: abre instantaneamente.
      setVideos(cached.videos);
      setFetchedAt(cached.fetchedAt);
      setStale(cached.stale);
      setQuotaExceeded(cached.quotaExceeded);
      setError(null);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      setQuotaExceeded(false);
      try {
        const payload = await loadVideoaulas(tabelaNome, artigoNumero, leiNome);
        if (cancelled) return;
        setVideos(payload.videos as VideoaulaItem[]);
        setFetchedAt(payload.fetchedAt);
        setStale(payload.stale);
        setQuotaExceeded(payload.quotaExceeded);
      } catch (e: any) {
        console.error('Erro ao buscar videoaulas:', e);
        if (!cancelled) setError('Não foi possível carregar as videoaulas. Tente novamente.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, tabelaNome, artigoNumero, leiNome]);


  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          />
          <motion.aside
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-[71] bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] max-h-[92vh] mx-auto max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 md:top-auto md:w-[92vw] md:max-w-2xl md:rounded-3xl md:border md:border-border md:shadow-2xl"
          >
            <div className="pt-3 pb-2 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-base font-semibold text-foreground truncate">Videoaulas</h3>
                  <p className="text-[11px] text-foreground/60 truncate">Art. {artigoNumero} — {leiNome || tabelaNome}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70 shrink-0"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loading && (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-foreground/60">Buscando as melhores videoaulas para você…</p>
                </div>
              )}

              {!loading && error && (
                <div className="text-center py-12 px-6">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {!loading && !error && videos.length === 0 && (
                <div className="text-center py-12 px-6">
                  <p className="text-sm text-foreground/60">Nenhuma videoaula encontrada para este artigo{quotaExceeded ? ' agora' : ''}. Tente novamente mais tarde.</p>
                </div>
              )}

              {!loading && videos.length > 0 && (
                <>
                  {stale && (
                    <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <p className="text-[11px] text-yellow-200/90">Mostrando resultados salvos. Vamos atualizar em breve.</p>
                    </div>
                  )}
                  <ul className="flex flex-col gap-3 px-4 pb-2 overflow-y-auto max-h-full">
                    {videos.map((v) => {
                      const meta = TIPO_META[v.tipo];
                      const Icon = meta.icon;
                      const duration = formatDuration(v.duration);
                      return (
                        <li key={v.videoId}>
                          <button
                            onClick={() => onSelectVideo(v)}
                            className="w-full text-left rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border overflow-hidden group transition-colors flex items-stretch gap-3 p-2"
                          >
                            <div className="relative w-32 aspect-video bg-black overflow-hidden rounded-lg shrink-0">
                              <img
                                src={v.thumb}
                                alt={v.titulo}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                              />
                              {duration && (
                                <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-white text-[9px] font-mono leading-none">
                                  {duration}
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                                  <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
                              <div>
                                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${meta.badge} mb-1`}>
                                  <Icon className="w-2.5 h-2.5" />
                                  {meta.label}
                                </div>
                                <p className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug">{v.titulo}</p>
                                <p className="text-[10px] text-foreground/60 mt-0.5 truncate">{v.canal}</p>
                              </div>
                              <div className="flex items-center gap-2.5 mt-1 text-[9px] text-foreground/60">
                                <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{formatCount(v.views)}</span>
                                <span className="flex items-center gap-0.5"><ThumbsUp className="w-2.5 h-2.5" />{formatCount(v.likes)}</span>
                                <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{relativeDays(v.publishedAt)}</span>
                              </div>
                            </div>
                          </button>
                        </li>

                      );
                    })}
                  </ul>
                  {fetchedAt && (
                    <p className="text-[10px] text-foreground/40 text-center mt-4 px-4">
                      Atualizado {relativeDays(fetchedAt)} · atualiza a cada 15 dias
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.aside>

          <GeracaoAnimacaoOverlay
            open={loading}
            titulo="Buscando videoaulas"
            steps={VIDEOAULAS_STEPS}
            estTotalSec={12}
          />
        </>
      )}
    </AnimatePresence>
  );
};


export default VideoaulasListSheet;
