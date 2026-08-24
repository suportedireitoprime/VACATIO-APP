import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bus,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  Heart,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Share2,
  Sparkles,
  Star,
} from 'lucide-react';
import wazeLogo from '@/assets/logos/waze.svg';
import uberLogo from '@/assets/logos/uber.svg';
import nnLogo from '@/assets/logos/99.svg';
import gmapsLogo from '@/assets/logos/gmaps.svg';
import { PageHeader } from '@/components/vademecum/PageHeader';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { supabase } from '@/integrations/supabase/client';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useLocaisPhotos } from '@/hooks/useLocaisPhotos';
import {
  CATEGORIAS_LOCAIS,
  iconCategoria,
  labelCategoria,
  type CategoriaLocal,
} from '@/lib/locaisCategorias';
import {
  googleMapsUrl,
  wazeUrl,
  uberUrl,
  noveNoveUrl,
  streetViewEmbedUrl,
  openInNewTab,
} from '@/lib/deepLinksMapa';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LocaisFiltroBar, type SortOption } from '@/components/locais/LocaisFiltroBar';
import { LocaisCardSkeleton } from '@/components/locais/LocaisCardSkeleton';
import { LocalSocialSection } from '@/components/locais/LocalSocialSection';
import { LocalTransporteDialog } from '@/components/locais/LocalTransporteDialog';

interface Local {
  id: string;
  osm_id: string | null;
  categoria: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  lat: number;
  lng: number;
  telefone: string | null;
  site: string | null;
  horario: any;
  fonte: string | null;
  dist_km?: number | null;
}

type Contagens = Partial<Record<CategoriaLocal, number>>;

const categoriaColorClass: Record<CategoriaLocal, string> = {
  tribunais: 'bg-primary/10 text-primary border-primary/25',
  cartorios: 'bg-secondary/80 text-secondary-foreground border-border',
  delegacias: 'bg-muted text-foreground border-border',
  presidios: 'bg-muted text-muted-foreground border-border',
  museus: 'bg-accent text-accent-foreground border-border',
  universidades: 'bg-primary/10 text-primary border-primary/20',
  oab: 'bg-destructive/10 text-destructive border-destructive/20',
  defensoria: 'bg-secondary text-secondary-foreground border-border',
  ministerio_publico: 'bg-primary/10 text-primary border-primary/20',
};

function formatKm(km?: number | null) {
  if (typeof km !== 'number') return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export default function LocaisJuridicos() {
  const navigate = useNavigate();
  const { location, loading: geoLoading, error: geoError, request } = useUserLocation(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaLocal | null>(null);
  const [contagens, setContagens] = useState<Contagens>({});
  const [carregandoContagens, setCarregandoContagens] = useState(true);
  const [locais, setLocais] = useState<Local[]>([]);
  const [carregandoLocais, setCarregandoLocais] = useState(false);
  const [selecionado, setSelecionado] = useState<Local | null>(null);
  const [wikiInfo, setWikiInfo] = useState<{ extract: string; url?: string } | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [favoritos, setFavoritos] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('locais_favoritos');
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });
  const toggleFavorito = useCallback((id: string) => {
    setFavoritos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.success('Removido dos favoritos'); }
      else { next.add(id); toast.success('Adicionado aos favoritos'); }
      try { localStorage.setItem('locais_favoritos', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);
  const autoLocPedidoRef = useRef(false);
  const [sort, setSort] = useState<SortOption>('proximo');
  const [buscaCoords, setBuscaCoords] = useState<{ lat: number; lng: number; endereco: string } | null>(null);
  const [transporteAberto, setTransporteAberto] = useState(false);
  const coordsAtivas = buscaCoords ?? (location ? { lat: location.lat, lng: location.lng } : null);

  // Busca resumo específico sobre o local via Gemini + Google Search grounding
  useEffect(() => {
    if (!selecionado) { setWikiInfo(null); return; }
    let cancel = false;
    const cacheKey = `local_sobre_${selecionado.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { extract: string; url?: string };
        setWikiInfo(parsed);
        setWikiLoading(false);
        return;
      }
    } catch {}
    setWikiLoading(true);
    setWikiInfo(null);
    (async () => {
      try {
        const { withOnlineGuard } = await import('@/lib/onlineGuard');
        const { data, error } = await withOnlineGuard(
          () => supabase.functions.invoke('local-sobre', {
            body: {
              nome: selecionado.nome,
              categoria: selecionado.categoria,
              endereco: selecionado.endereco,
              cidade: selecionado.cidade,
              uf: selecionado.uf,
            },
          }),
          { fallback: () => ({ data: null, error: null } as any) },
        );
        if (cancel) return;
        if (error || !data?.extract) {
          setWikiInfo(null);
        } else {
          const info = { extract: data.extract as string, url: (data.fontes?.[0] as string | undefined) };
          setWikiInfo(info);
          try { localStorage.setItem(cacheKey, JSON.stringify(info)); } catch {}
        }
      } catch (e) {
        console.error('local-sobre', e);
        if (!cancel) setWikiInfo(null);
      } finally {
        if (!cancel) setWikiLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [selecionado]);

  const categoriaMeta = useMemo(
    () => CATEGORIAS_LOCAIS.find((categoria) => categoria.id === categoriaAtiva) ?? null,
    [categoriaAtiva],
  );

  const totalCategoriasPopuladas = useMemo(
    () => Object.values(contagens).filter((total) => (total ?? 0) > 0).length,
    [contagens],
  );

  // Hidrata fotos apenas dos primeiros 30 (carrossel + primeiros da lista)
  const idsParaFoto = useMemo(() => locais.slice(0, 30).map((l) => l.id), [locais]);
  const photos = useLocaisPhotos(idsParaFoto);

  const carregarContagens = useCallback(async () => {
    setCarregandoContagens(true);
    const { data, error } = await supabase.from('locais_juridicos').select('categoria');
    if (error) {
      console.error(error);
      toast.error('Falha ao carregar categorias de locais.');
      setCarregandoContagens(false);
      return;
    }
    const proximasContagens: Contagens = {};
    for (const row of data ?? []) {
      const categoria = row.categoria as CategoriaLocal;
      proximasContagens[categoria] = (proximasContagens[categoria] ?? 0) + 1;
    }
    setContagens(proximasContagens);
    setCarregandoContagens(false);
  }, []);

  const carregarLocais = useCallback(
    async (categoria: CategoriaLocal) => {
      setCarregandoLocais(true);
      setLocais([]);

      if (coordsAtivas) {
        const { data, error } = await supabase.rpc('locais_proximos', {
          _lat: coordsAtivas.lat,
          _lng: coordsAtivas.lng,
          _categorias: [categoria],
          _limite: 80,
          _raio_km: 300,
        });
        if (error) {
          console.error(error);
          toast.error('Falha ao carregar locais próximos.');
          setCarregandoLocais(false);
          return;
        }
        setLocais((data as Local[]) ?? []);
        setCarregandoLocais(false);
        return;
      }

      const { data, error } = await supabase
        .from('locais_juridicos')
        .select('id, osm_id, categoria, nome, endereco, cidade, uf, lat, lng, telefone, site, horario, fonte')
        .eq('categoria', categoria)
        .order('uf', { ascending: true, nullsFirst: false })
        .order('cidade', { ascending: true, nullsFirst: false })
        .order('nome', { ascending: true })
        .limit(100);
      if (error) {
        console.error(error);
        toast.error('Falha ao carregar locais desta categoria.');
        setCarregandoLocais(false);
        return;
      }
      setLocais(((data as Local[]) ?? []).map((l) => ({ ...l, dist_km: null })));
      setCarregandoLocais(false);
    },
    [coordsAtivas?.lat, coordsAtivas?.lng],
  );

  useEffect(() => {
    carregarContagens();
  }, [carregarContagens]);

  // Ao abrir uma categoria, pede localização automaticamente (uma vez).
  useEffect(() => {
    if (!categoriaAtiva) {
      autoLocPedidoRef.current = false;
      return;
    }
    if (!location && !autoLocPedidoRef.current) {
      autoLocPedidoRef.current = true;
      request();
    }
  }, [categoriaAtiva, location, request]);

  useEffect(() => {
    if (!categoriaAtiva) return;
    carregarLocais(categoriaAtiva);
  }, [categoriaAtiva, carregarLocais]);

  const abrirCategoria = (categoria: CategoriaLocal) => {
    const total = contagens[categoria] ?? 0;
    if (total <= 0) {
      toast.info('Em breve: esta categoria ainda não foi populada.');
      return;
    }
    setCategoriaAtiva(categoria);
  };

  const compartilhar = async (local: Local) => {
    const texto = `${local.nome}\n${local.endereco ?? ''}\nhttps://www.google.com/maps?q=${local.lat},${local.lng}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: local.nome, text: texto });
      } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(texto);
      toast.success('Informações copiadas.');
    }
  };

  const voltar = () => {
    if (categoriaAtiva) {
      setCategoriaAtiva(null);
      setLocais([]);
      setSelecionado(null);
      return;
    }
    navigate('/');
  };

  const mobileHeader = (
    <PageHeader
      title={categoriaMeta?.label ?? 'Locais Jurídicos'}
      subtitle={categoriaMeta ? `${contagens[categoriaMeta.id] ?? 0} disponíveis` : `${totalCategoriasPopuladas} categorias disponíveis`}
      onBack={voltar}
      rightAction={categoriaAtiva ? (
        <button
          onClick={() => request()}
          aria-label="Usar minha localização"
          className="w-11 h-11 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          {geoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
        </button>
      ) : undefined}
    />
  );

  const categoriasContent = (
    <div className="px-4 py-4 lg:px-0 lg:py-0">
      <p className="font-body text-[12px] text-muted-foreground mb-3 px-1">
        Toque em uma categoria para ver os locais mais próximos com fotos reais.
      </p>
      <div className="rounded-2xl border border-border/60 bg-secondary/30 divide-y divide-border/50 overflow-hidden">
        {CATEGORIAS_LOCAIS.map((categoria) => {
          const total = contagens[categoria.id] ?? 0;
          const disponivel = total > 0;
          const Icon = categoria.icon;
          return (
            <button
              key={categoria.id}
              onClick={() => abrirCategoria(categoria.id)}
              className="w-full flex items-center gap-4 px-4 py-5 min-h-[84px] text-left hover:bg-secondary/60 active:bg-secondary transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center text-primary shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-base font-semibold text-foreground truncate">
                    {categoria.label}
                  </span>
                  {!disponivel && (
                    <Badge variant="secondary" className="text-[11px]">Em breve</Badge>
                  )}
                </div>
                <div className="font-body text-[12px] text-muted-foreground truncate mt-0.5">
                  {disponivel
                    ? `${total} ${total === 1 ? 'local disponível' : 'locais disponíveis'}`
                    : 'Aguardando população da tabela'}
                </div>
              </div>
              {carregandoContagens ? (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );


  const locaisOrdenados = useMemo(() => {
    const arr = [...locais];
    if (sort === 'melhor') {
      arr.sort((a, b) => (photos[b.id]?.rating ?? 0) - (photos[a.id]?.rating ?? 0));
    } else if (sort === 'mais_visitado') {
      arr.sort((a, b) => (photos[b.id]?.user_ratings_total ?? 0) - (photos[a.id]?.user_ratings_total ?? 0));
    } else if (sort === 'aberto') {
      const now = new Date();
      const dia = (now.getDay() + 6) % 7; // 0=segunda
      const min = now.getHours() * 60 + now.getMinutes();
      const abertoAgora = (l: Local) => {
        const periods = (l as any)?.horario_places?.periods;
        if (!Array.isArray(periods)) return null;
        return periods.some((p: any) => {
          if (!p?.open) return false;
          if (p.open.day !== dia) return false;
          const openM = p.open.hour * 60 + (p.open.minute ?? 0);
          const closeM = p.close ? p.close.hour * 60 + (p.close.minute ?? 0) : 24 * 60;
          return min >= openM && min <= closeM;
        });
      };
      arr.sort((a, b) => Number(abertoAgora(b) === true) - Number(abertoAgora(a) === true));
    }
    // 'proximo' já vem do RPC
    return arr;
  }, [locais, sort, photos]);

  const destaques = locaisOrdenados.slice(0, 10);
  const resto = locaisOrdenados.slice(destaques.length);

  const renderCapa = (local: Local, tamanho: 'hero' | 'thumb') => {
    const url = photos[local.id]?.photo_url;
    const Icon = iconCategoria(local.categoria);
    const base = tamanho === 'hero'
      ? 'aspect-[4/5] rounded-2xl'
      : 'w-20 h-20 rounded-xl';
    if (url) {
      return (
        <div className={`relative overflow-hidden bg-muted ${base}`}>
          <img
            src={url}
            alt={local.nome}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          {tamanho === 'hero' && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          )}
        </div>
      );
    }
    return (
      <div className={`relative overflow-hidden ${base} bg-gradient-to-br from-primary/25 via-primary/10 to-muted flex items-center justify-center`}>
        <Icon className={tamanho === 'hero' ? 'w-14 h-14 text-primary/70' : 'w-7 h-7 text-primary/70'} />
        {tamanho === 'hero' && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        )}
      </div>
    );
  };

  const locaisContent = categoriaMeta && (
    <div className="pb-10 lg:px-0 lg:py-0">
      <LocaisFiltroBar
        sort={sort}
        onSortChange={setSort}
        onBuscaEndereco={setBuscaCoords}
        onLimparBusca={() => setBuscaCoords(null)}
        buscaAtiva={buscaCoords?.endereco ?? null}
      />

      {/* Barra de status */}
      <div className="px-4 pt-1 pb-2">
        {geoLoading && !coordsAtivas && (
          <div className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando sua localização…
          </div>
        )}
        {coordsAtivas && (
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            {carregandoLocais ? 'Carregando…' : `${locais.length} resultados ${buscaCoords ? 'próximos ao endereço' : 'perto de você'}`}
          </div>
        )}
      </div>

      {carregandoLocais && locais.length === 0 && (
        <>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2">
            <LocaisCardSkeleton variant="hero" />
            <LocaisCardSkeleton variant="hero" />
          </div>
          <div className="mt-2">
            {Array.from({ length: 5 }).map((_, i) => <LocaisCardSkeleton key={i} />)}
          </div>
        </>
      )}


      {!carregandoLocais && locais.length === 0 && (
        <div className="mx-4 rounded-2xl border border-border bg-card p-6 text-center">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-bold text-foreground">Nenhum local encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tente ativar a localização ou volte mais tarde.
          </p>
        </div>
      )}

      {/* Carrossel hero */}
      {destaques.length > 0 && (
        <div className="mt-2">
          <div className="px-4 flex items-baseline justify-between mb-2">
            <h3 className="font-display text-base font-bold text-foreground">
              {location ? 'Perto de você' : 'Em destaque'}
            </h3>
            <span className="text-xs text-muted-foreground">deslize →</span>
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-2 scrollbar-hide">
            {destaques.map((local, idx) => {
              const Icon = iconCategoria(local.categoria);
              const km = formatKm(local.dist_km);
              return (
                <motion.button
                  key={local.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => setSelecionado(local)}
                  className="relative snap-start shrink-0 w-[82vw] max-w-[360px] text-left"
                >
                  {renderCapa(local, 'hero')}
                  {/* Badges no topo */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {km && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[11px] font-semibold">
                        <Navigation className="w-3 h-3" /> {km}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-black text-[10px] font-semibold uppercase tracking-wider">
                      <Icon className="w-3 h-3" /> {labelCategoria(local.categoria)}
                    </span>
                  </div>
                  {/* Texto no rodapé */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="font-display text-lg font-bold text-white leading-tight line-clamp-2 drop-shadow">
                      {local.nome}
                    </p>
                    {(local.cidade || local.endereco) && (
                      <p className="text-xs text-white/85 mt-1 line-clamp-1">
                        {local.endereco ?? `${local.cidade}${local.uf ? '/' + local.uf : ''}`}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista compacta */}
      {resto.length > 0 && (
        <div className="mt-5">
          <div className="px-4 mb-2">
            <h3 className="font-display text-base font-bold text-foreground">Todos os locais</h3>
          </div>
          <div className="divide-y divide-border border-y border-border bg-card">
            {resto.map((local) => {
              const km = formatKm(local.dist_km);
              return (
                <button
                  key={local.id}
                  onClick={() => setSelecionado(local)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-muted/60 transition-colors"
                >
                  {renderCapa(local, 'thumb')}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[15px] font-bold text-foreground leading-tight line-clamp-1">
                      {local.nome}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {local.endereco || [local.cidade, local.uf].filter(Boolean).join(' / ')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {km && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <Navigation className="w-3 h-3" /> {km}
                        </span>
                      )}
                      {local.cidade && (
                        <span className="text-[11px] text-muted-foreground">
                          · {local.cidade}{local.uf ? `/${local.uf}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); openInNewTab(googleMapsUrl(local)); }}
                    className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-sm"
                    aria-label="Traçar rota no Google Maps"
                  >
                    <img src={gmapsLogo} alt="Google Maps" className="w-5 h-5" />
                  </button>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="px-4 pt-4 text-[10px] text-muted-foreground text-center">
        Fotos: Google · Dados: OpenStreetMap
      </p>
    </div>
  );

  return (
    <DesktopPageLayout
      activeId="ferramentas"
      title="Locais Jurídicos"
      subtitle="Tribunais, cartórios, delegacias, museus e mais"
      mobileHeader={mobileHeader}
    >
      {categoriaAtiva ? locaisContent : categoriasContent}

      <Sheet open={!!selecionado} onOpenChange={(open) => !open && setSelecionado(null)}>
        <SheetContent
          side="bottom"
          className="h-[90dvh] sm:h-[90dvh] p-0 flex flex-col bg-background rounded-t-3xl overflow-hidden border-t-0"
        >
          {selecionado && (() => {
            const meta = photos[selecionado.id];
            const rating = meta?.rating ?? null;
            const totalRatings = meta?.user_ratings_total ?? null;
            const reviews = meta?.reviews ?? [];
            const gmapsUri = meta?.google_maps_uri ?? googleMapsUrl(selecionado);
            const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
            const embedSrc = browserKey
              ? `https://www.google.com/maps/embed/v1/place?key=${browserKey}&q=${selecionado.lat},${selecionado.lng}&zoom=17`
              : streetViewEmbedUrl(selecionado.lat, selecionado.lng);
            const descricaoBase = meta?.editorial_summary
              ?? `${labelCategoria(selecionado.categoria)} localizado em ${
                selecionado.cidade ? `${selecionado.cidade}${selecionado.uf ? '/' + selecionado.uf : ''}` : 'sua região'
              }. Confira endereço, contatos e como chegar.`;

            const ActionRow = ({
              icon,
              label,
              onClick,
              variant = 'outline',
            }: {
              icon: React.ReactNode;
              label: string;
              onClick: () => void;
              variant?: 'default' | 'outline';
            }) => (
              <button
                onClick={onClick}
                className={
                  variant === 'default'
                    ? 'w-full min-h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-3 px-4 active:scale-[0.99] transition'
                    : 'w-full min-h-12 rounded-xl border border-border bg-card text-foreground font-semibold flex items-center gap-3 px-4 active:scale-[0.99] hover:border-primary/40 transition'
                }
              >
                <span className="w-6 h-6 flex items-center justify-center shrink-0">{icon}</span>
                <span className="flex-1 text-left text-sm">{label}</span>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
            );

            return (
              <div className="flex-1 overflow-y-auto">
                {/* Foto com cantos arredondados no topo + botão fechar à esquerda */}
                <div className="relative">
                  <div className="relative h-56 sm:h-64 bg-muted overflow-hidden rounded-t-3xl">
                    {meta?.photo_url ? (
                      <img
                        src={meta.photo_url}
                        alt={selecionado.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <iframe
                        title="Prévia do local"
                        src={streetViewEmbedUrl(selecionado.lat, selecionado.lng)}
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-black/20 pointer-events-none" />

                    {/* Botão fechar (seta pra baixo) à esquerda */}
                    <button
                      onClick={() => setSelecionado(null)}
                      aria-label="Fechar"
                      className="absolute top-3 left-3 w-10 h-10 rounded-full bg-background/90 backdrop-blur border border-border flex items-center justify-center active:scale-95 transition shadow-lg"
                    >
                      <ChevronDown className="w-5 h-5 text-foreground" />
                    </button>

                    {/* Badges e ações rápidas dentro da capa */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {typeof rating === 'number' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text-white text-xs font-semibold">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {rating.toFixed(1)}
                            {totalRatings ? ` · ${totalRatings}` : ''}
                          </span>
                        )}
                        {typeof selecionado.dist_km === 'number' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-black text-xs font-semibold">
                            <Navigation className="w-3 h-3" /> {formatKm(selecionado.dist_km)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const isFav = favoritos.has(selecionado.id);
                          return (
                            <button
                              onClick={() => toggleFavorito(selecionado.id)}
                              aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white flex items-center justify-center active:scale-95 transition hover:bg-black/75"
                            >
                              <Heart className={`w-5 h-5 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => compartilhar(selecionado)}
                          aria-label="Compartilhar"
                          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white flex items-center justify-center active:scale-95 transition hover:bg-black/75"
                        >
                          <Share2 className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Cabeçalho */}
                <div className="px-4 pt-4 pb-1 max-w-2xl mx-auto w-full">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    {(() => { const I = iconCategoria(selecionado.categoria); return <I className="w-3.5 h-3.5" />; })()}
                    {labelCategoria(selecionado.categoria)}
                  </div>
                  <SheetTitle className="text-left text-lg sm:text-xl leading-tight font-display">
                    {selecionado.nome}
                  </SheetTitle>
                  {(selecionado.endereco || selecionado.cidade) && (
                    <div className="flex items-start gap-2 mt-1">
                      <p className="text-sm text-muted-foreground text-left flex-1">
                        {selecionado.endereco || [selecionado.cidade, selecionado.uf].filter(Boolean).join(' / ')}
                      </p>
                      <button
                        onClick={() => {
                          const texto = selecionado.endereco
                            ? `${selecionado.nome} — ${selecionado.endereco}`
                            : `${selecionado.nome} — ${[selecionado.cidade, selecionado.uf].filter(Boolean).join(' / ')}`;
                          navigator.clipboard.writeText(texto).then(() => toast.success('Endereço copiado'));
                        }}
                        aria-label="Copiar endereço"
                        className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center active:scale-95 transition hover:border-primary/40 shrink-0"
                      >
                        <Copy className="w-4 h-4 text-foreground" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-4 pb-8 pt-2 space-y-5 max-w-2xl mx-auto w-full">
                  {/* SOBRE */}
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-muted-foreground">Sobre</h3>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {wikiLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Buscando informações...
                      </div>
                    ) : wikiInfo ? (
                      <div className="space-y-2">
                        <p className="text-sm leading-relaxed text-foreground/90">{wikiInfo.extract}</p>
                        {wikiInfo.url && (
                          <button
                            onClick={() => openInNewTab(wikiInfo.url!)}
                            className="text-xs text-primary font-semibold inline-flex items-center gap-1"
                          >
                            Ver fonte <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-foreground/90">{descricaoBase}</p>
                    )}
                  </section>

                  {/* Informações rápidas */}
                  {(selecionado.telefone || selecionado.site || selecionado.horario?.raw) && (
                    <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                      {selecionado.telefone && (
                        <a href={`tel:${selecionado.telefone}`} className="flex items-center gap-3 px-4 py-3">
                          <Phone className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-medium flex-1 truncate">{selecionado.telefone}</span>
                        </a>
                      )}
                      {selecionado.site && (
                        <a
                          href={selecionado.site.startsWith('http') ? selecionado.site : `https://${selecionado.site}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <Globe className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-medium truncate flex-1">{selecionado.site}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                        </a>
                      )}
                      {selecionado.horario?.raw && (
                        <div className="px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Horário</p>
                          <p className="text-sm font-mono leading-snug">{selecionado.horario.raw}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AVALIAÇÕES */}
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-muted-foreground">
                        Avaliações {typeof rating === 'number' ? `· ${rating.toFixed(1)}★` : ''}
                      </h3>
                      <div className="flex-1 h-px bg-border" />
                      {meta?.google_maps_uri && (
                        <button
                          onClick={() => openInNewTab(meta.google_maps_uri!)}
                          className="text-[11px] text-primary font-semibold inline-flex items-center gap-1"
                        >
                          Ver todas <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {reviews && reviews.length > 0 ? (
                      <div className="space-y-2">
                        {reviews.slice(0, 3).map((r, idx) => {
                          const author = r.authorAttribution?.displayName ?? 'Anônimo';
                          const texto = r.text?.text ?? r.originalText?.text ?? '';
                          return (
                            <div key={idx} className="rounded-xl border border-border bg-card p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-foreground truncate flex-1">{author}</p>
                                {typeof r.rating === 'number' && (
                                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    {r.rating}
                                  </span>
                                )}
                              </div>
                              {r.relativePublishTimeDescription && (
                                <p className="text-[11px] text-muted-foreground mb-1">
                                  {r.relativePublishTimeDescription}
                                </p>
                              )}
                              {texto && (
                                <p className="text-sm text-foreground/85 leading-relaxed line-clamp-4">
                                  {texto}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Ainda não há avaliações disponíveis para este local.
                      </p>
                    )}
                  </section>

                  {/* COMUNIDADE (Check-in + Avaliação + Comentários) */}
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-muted-foreground">Comunidade</h3>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <LocalSocialSection localId={selecionado.id} />
                  </section>

                  {/* AÇÕES */}
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-muted-foreground">Como chegar</h3>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-2">
                      <ActionRow
                        variant="default"
                        icon={<img src={gmapsLogo} alt="" className="w-6 h-6" />}
                        label="Traçar rota no Google Maps"
                        onClick={async () => {
                          const { openMap } = await import('@/lib/nativeMapsLauncher');
                          await openMap({
                            lat: selecionado.lat,
                            lng: selecionado.lng,
                            label: selecionado.nome,
                          });
                        }}
                      />

                      <ActionRow
                        icon={<Bus className="w-5 h-5 text-primary" />}
                        label="Transporte público"
                        onClick={() => setTransporteAberto(true)}
                      />
                      <ActionRow
                        icon={<img src={wazeLogo} alt="" className="w-6 h-6" />}
                        label="Abrir no Waze"
                        onClick={() => openInNewTab(wazeUrl(selecionado))}
                      />
                      <ActionRow
                        icon={<img src={uberLogo} alt="" className="w-6 h-6" />}
                        label="Chamar Uber"
                        onClick={() => openInNewTab(uberUrl(selecionado))}
                      />
                      <ActionRow
                        icon={<img src={nnLogo} alt="" className="w-6 h-6" />}
                        label="Chamar 99"
                        onClick={() => openInNewTab(noveNoveUrl(selecionado))}
                      />
                    </div>
                  </section>

                  {/* MAPA (depois de compartilhar) */}
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-muted-foreground">Localização</h3>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-border bg-muted">
                      <iframe
                        title="Mapa do local"
                        src={embedSrc}
                        className="w-full h-[240px] border-0 block"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    </div>
                  </section>

                  {meta?.photo_attribution && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Foto: {meta.photo_attribution}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {selecionado && (
        <LocalTransporteDialog
          open={transporteAberto}
          onClose={() => setTransporteAberto(false)}
          origem={coordsAtivas}
          destino={{ lat: selecionado.lat, lng: selecionado.lng, nome: selecionado.nome }}
        />
      )}
    </DesktopPageLayout>
  );
}
