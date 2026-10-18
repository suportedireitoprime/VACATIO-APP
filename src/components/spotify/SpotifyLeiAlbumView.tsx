import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Heart,
  Download,
  Check,
  Search,
  Headphones,
  X,
  Loader2,
  LayoutGrid,
  ListMusic,
  ChevronRight,
  Sparkles,
  BookOpen,
  Route,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { fetchArtigosDaLeiComNarracao, type ArtigoNarracaoItem } from '@/services/narracaoArtigosSyncService';
import { getLeiCover } from '@/lib/leiTheme';
import { getCapitulosDaLei, extrairNumeroArtigo, type CapituloDef } from '@/lib/leiCapitulosHelper';
import { SpotifyAudioTrilhaModal } from './SpotifyAudioTrilhaModal';

// Cache em memória global para abertura 100% instantânea (0ms) entre navegações
const ARTIGOS_CACHE = new Map<string, ArtigoNarracaoItem[]>();

interface SpotifyLeiAlbumViewProps {
  leiId: string;
  leiNome: string;
  leiSlug: string;
  categoria?: string;
  totalArtigosInitial?: number;
  totalAudiosInitial?: number;
  onBack: () => void;
}

export const SpotifyLeiAlbumView: React.FC<SpotifyLeiAlbumViewProps> = ({
  leiId,
  leiNome,
  leiSlug,
  categoria,
  totalArtigosInitial,
  totalAudiosInitial,
  onBack,
}) => {
  const {
    currentTrack,
    isPlaying,
    audioMode,
    playTrack,
    togglePlay,
    toggleFavorito,
    isFavorito,
    downloadTrack,
    isDownloaded,
    setExpanded,
  } = useSpotifyAudioStore();

  const cacheKey = (leiSlug || leiId || '').toLowerCase().trim();
  const cachedArtigos = ARTIGOS_CACHE.get(cacheKey) || [];

  const [artigos, setArtigos] = useState<ArtigoNarracaoItem[]>(cachedArtigos);
  const [loading, setLoading] = useState<boolean>(cachedArtigos.length === 0);
  const [search, setSearch] = useState('');

  // Modo de exibição: 'capitulos' (estilo Mapas Mentais/Aulas Overlay) ou 'lista' (todos os artigos em lista corrida)
  const [modoVisualizacao, setModoVisualizacao] = useState<'capitulos' | 'lista'>('capitulos');
  const [capituloSelecionado, setCapituloSelecionado] = useState<CapituloDef | null>(null);
  const [trilhaAberta, setTrilhaAberta] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const coverUrl = getLeiCover(leiSlug || leiId);

  // Paleta de gradiente temático inspirado no MapasOverlay / AulasOverlay (Código Civil = Azul elegante)
  const themeGradient = useMemo(() => {
    const slug = (leiSlug || '').toLowerCase();
    if (slug === 'cpp' || slug.includes('processo-penal')) {
      return 'linear-gradient(180deg, hsl(0 75% 36%) 0%, hsl(0 80% 40%) 40%, hsl(0 70% 28%) 100%)';
    }
    if (slug === 'cp' || slug.includes('penal')) {
      return 'linear-gradient(180deg, hsl(350 72% 34%) 0%, hsl(350 78% 38%) 40%, hsl(350 68% 26%) 100%)';
    }
    if (slug === 'cf' || slug.includes('constitu')) {
      return 'linear-gradient(180deg, hsl(145 75% 30%) 0%, hsl(150 80% 34%) 40%, hsl(140 70% 24%) 100%)';
    }
    if (slug === 'cc' || slug.includes('civil')) {
      return 'linear-gradient(180deg, hsl(215 75% 36%) 0%, hsl(220 80% 40%) 40%, hsl(210 70% 28%) 100%)';
    }
    return 'linear-gradient(180deg, hsl(270 70% 30%) 0%, hsl(275 75% 35%) 40%, hsl(265 72% 28%) 100%)';
  }, [leiSlug]);

  // Carrega artigos da lei e narrações em segundo plano sem bloquear a interface
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!ARTIGOS_CACHE.has(cacheKey)) {
        setLoading(true);
      }
      try {
        const data = await fetchArtigosDaLeiComNarracao(leiId, leiSlug);
        ARTIGOS_CACHE.set(cacheKey, data);
        if (isMounted) setArtigos(data);
      } catch (err) {
        console.warn('[SpotifyLeiAlbumView] Erro ao carregar artigos:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [leiId, leiSlug, cacheKey]);

  // Monta lista de todas as faixas de narração da lei (apenas as que têm áudio oficial)
  const albumTracks: SpotifyTrack[] = useMemo(() => {
    return artigos
      .map((art, index) => {
        const finalAudioUrl = art.narracao_url || '';

        return {
          id: `${leiSlug}::${art.numero}`,
          tipo: 'lei' as const,
          leiId,
          leiSlug,
          leiNome,
          artigoNumero: art.numero,
          numeroFormatado: art.numeroFormatado,
          titulo: `${art.numeroFormatado} • ${leiNome}`,
          subtitulo: `${leiNome} • Narração Oficial`,
          texto: art.texto,
          audioUrl: finalAudioUrl,
          coverUrl,
          ordem: art.ordem || index,
        };
      })
      .filter((t) => Boolean(t.audioUrl && t.audioUrl.trim()));
  }, [artigos, leiId, leiSlug, leiNome, coverUrl]);

  // Capítulos temáticos estruturados para esta legislação
  const capitulos = useMemo(() => {
    return getCapitulosDaLei(leiSlug, artigos.length || totalArtigosInitial || (leiSlug === 'cc' ? 2046 : 0));
  }, [leiSlug, artigos.length, totalArtigosInitial]);

  // Enriquecer capítulos com contagem de artigos e áudios disponíveis
  const capitulosComMetadados = useMemo(() => {
    return capitulos.map((cap) => {
      const artigosDoCap = albumTracks.filter((t) => {
        const num = extrairNumeroArtigo(t.artigoNumero || t.numeroFormatado);
        return num >= cap.artigoInicio && num <= cap.artigoFim;
      });
      return {
        ...cap,
        totalArtigos: artigosDoCap.length,
        totalComAudio: artigosDoCap.filter((t) => Boolean(t.audioUrl)).length,
        tracks: artigosDoCap,
      };
    });
  }, [capitulos, albumTracks]);

  // Filtro de busca na tracklist geral
  const filteredTracks = useMemo(() => {
    const base = albumTracks;

    if (!search.trim()) return base;
    const term = search.toLowerCase();
    return base.filter(
      (t) =>
        t.numeroFormatado.toLowerCase().includes(term) ||
        t.artigoNumero.toLowerCase().includes(term) ||
        t.texto.toLowerCase().includes(term)
    );
  }, [albumTracks, search]);

  const totalComAudio = useMemo(() => {
    return albumTracks.filter((t) => Boolean(t.audioUrl && t.audioUrl.trim())).length;
  }, [albumTracks]);

  // Valores de contadores
  const displayCapitulosCount = capitulos.length;

  const displayAudiosCount = totalComAudio > 0
    ? totalComAudio
    : (totalAudiosInitial || 0);

  const displayArtigosCount = artigos.length > 0
    ? artigos.length
    : (totalArtigosInitial || (leiSlug === 'cc' ? 2046 : 0));

  // Tocar a lei inteira desde o primeiro artigo e abrir o player expandido
  const handlePlayAll = async () => {
    const comAudio = albumTracks.filter((t) => Boolean(t.audioUrl));
    if (comAudio.length === 0) {
      toast.info('Narrações desta lei estão sendo preparadas para upload.');
      return;
    }
    await playTrack(comAudio[0], comAudio);
    setExpanded(true);
    toast.success(`Reproduzindo ${leiNome} continuamente!`);
  };

  // Tocar apenas o capítulo selecionado e abrir o player expandido
  const handlePlayCapitulo = async (cap: CapituloDef) => {
    const tracksDoCap = albumTracks.filter((t) => {
      const num = extrairNumeroArtigo(t.artigoNumero || t.numeroFormatado);
      return num >= cap.artigoInicio && num <= cap.artigoFim;
    });

    if (tracksDoCap.length === 0) {
      toast.info(`Nenhum áudio de narração disponível no momento para ${cap.titulo}.`);
      return;
    }

    await playTrack(tracksDoCap[0], tracksDoCap);
    setExpanded(true);
    toast.success(`Reproduzindo capítulo: ${cap.titulo}`);
  };

  // Tocar track selecionada e abrir interface completa do player
  const handleTrackClick = async (track: SpotifyTrack, customQueue?: SpotifyTrack[]) => {
    if (!track.audioUrl) {
      toast.info(`Narração do ${track.numeroFormatado} em gravação oficial.`);
      return;
    }

    if (currentTrack?.id === track.id) {
      setExpanded(true);
      return;
    }

    const queueToUse = customQueue && customQueue.length > 0
      ? customQueue.filter((t) => Boolean(t.audioUrl))
      : (filteredTracks.length > 0 ? filteredTracks.filter((t) => Boolean(t.audioUrl)) : albumTracks);

    await playTrack(track, queueToUse.length > 0 ? queueToUse : albumTracks);
    setExpanded(true);
  };

  const handleSelecionarCapitulo = (cap: CapituloDef) => {
    setCapituloSelecionado(cap);
    setSearch('');
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     NOVA TELA DEDICADA DE CAPÍTULO (COMEÇA DO TOPO, TOTALMENTE SEPARADA DO ÁLBUM)
  ───────────────────────────────────────────────────────────────────────────── */
  if (capituloSelecionado) {
    const chapterTracks = albumTracks.filter((t) => {
      const num = extrairNumeroArtigo(t.artigoNumero || t.numeroFormatado);
      return num >= capituloSelecionado.artigoInicio && num <= capituloSelecionado.artigoFim;
    });

    const chapterFilteredTracks = search.trim()
      ? chapterTracks.filter((t) => {
          const term = search.toLowerCase();
          return (
            t.numeroFormatado.toLowerCase().includes(term) ||
            t.artigoNumero.toLowerCase().includes(term) ||
            t.texto.toLowerCase().includes(term)
          );
        })
      : chapterTracks;

    return (
      <div
        className="flex flex-col h-full relative w-full overflow-y-auto select-none"
        style={{
          background: themeGradient,
          paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))',
        }}
      >
        {/* Brilho atmosférico no topo */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_60%)] z-0" />

        {/* CABEÇALHO DO CAPÍTULO - DEDICADO, COMEÇANDO DO TOPO */}
        <section className="relative isolate shrink-0 pb-4 overflow-hidden -mx-px rounded-t-[30px] z-10 border-b border-white/10">
          <div className="relative p-5 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+16px)] max-w-4xl mx-auto w-full">
            {/* Linha Superior: Botão Voltar aos Capítulos + Badge de Áudios */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  setCapituloSelecionado(null);
                  setSearch('');
                }}
                aria-label="Voltar aos Capítulos"
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white shadow-md active:scale-95 transition-all hover:bg-black/50 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4 drop-shadow-md" />
                <span>Voltar aos Capítulos</span>
              </button>

              <span className="text-[11px] font-bold text-white/90 bg-black/40 border border-white/15 px-3 py-1.5 rounded-full backdrop-blur-md">
                {loading && chapterTracks.length === 0 ? 'Sincronizando...' : `${chapterTracks.length} áudios disponíveis`}
              </span>
            </div>

            {/* Informações do Capítulo Selecionado */}
            <div className="mt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{leiNome} &bull; {capituloSelecionado.rotuloFaixa}</span>
              </p>
              <h1 className="mt-1 font-display text-[22px] sm:text-[26px] font-black leading-tight text-white drop-shadow-md uppercase tracking-tight">
                {capituloSelecionado.titulo}
              </h1>
              {capituloSelecionado.subtitulo && (
                <p className="mt-1 text-[12px] sm:text-[13px] leading-snug text-white/80 font-body">
                  {capituloSelecionado.subtitulo}
                </p>
              )}
            </div>

            {/* Botão de Ação: Ouvir Capítulo Completo */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handlePlayCapitulo(capituloSelecionado)}
                className="flex-1 py-3 px-5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:bg-white/95 active:scale-[0.98] transition-all"
              >
                <Play className="w-4 h-4 fill-black text-black" />
                <span>Ouvir Capítulo Completo</span>
              </button>
            </div>

            {/* Barra de Busca dentro do Capítulo */}
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Buscar neste capítulo (ex: Art. ${capituloSelecionado.artigoInicio})...`}
                className="w-full rounded-2xl border border-white/15 bg-black/30 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder:text-white/50 outline-none transition focus:border-white/40 focus:bg-black/50 backdrop-blur-md"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Limpar busca"
                  className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-white/70 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* LISTA DE ARTIGOS DO CAPÍTULO */}
        <div className="px-4 py-3 space-y-2 max-w-4xl mx-auto w-full relative z-10">
          {loading && chapterTracks.length === 0 ? (
            <div className="py-16 text-center text-sm text-white/70 bg-black/30 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-white mb-1" />
              <p className="font-semibold text-white">Carregando narrações deste capítulo...</p>
              <p className="text-xs text-white/60">Sincronizando áudios em alta qualidade</p>
            </div>
          ) : chapterFilteredTracks.length === 0 ? (
            <div className="py-16 text-center text-sm text-white/70 bg-black/30 border border-white/10 rounded-2xl p-6">
              Nenhum artigo encontrado para a busca neste capítulo.
            </div>
          ) : (
            chapterFilteredTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const hasAudio = Boolean(track.audioUrl);
              const isFav = isFavorito(track.id);
              const isDown = isDownloaded(track.id);

              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition border ${
                    isCurrent
                      ? 'bg-white/20 border-white/30 shadow-md'
                      : 'bg-black/30 hover:bg-black/45 border-white/10'
                  }`}
                >
                  {/* Botão de Tocar Artigo e Abrir Player */}
                  <button
                    onClick={() => handleTrackClick(track, chapterTracks)}
                    disabled={!hasAudio}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left disabled:opacity-50 group focus-visible:outline-none"
                  >
                    <span className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-zinc-900 shadow-md border border-white/15">
                      <img
                        src={coverUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-black/40 text-white transition-opacity">
                        {isCurrent && isPlaying ? (
                          <span className="flex items-end justify-center gap-[2px] h-4">
                            <span className="w-0.5 h-4 bg-white animate-pulse" />
                            <span className="w-0.5 h-2.5 bg-white animate-pulse delay-75" />
                            <span className="w-0.5 h-3.5 bg-white animate-pulse delay-150" />
                          </span>
                        ) : (
                          <Play className="h-4 w-4 ml-0.5 fill-white text-white" />
                        )}
                      </span>
                    </span>

                    <div className="min-w-0 flex-1 py-0.5">
                      <p
                        className={`text-sm font-bold truncate ${
                          isCurrent ? 'text-white underline' : 'text-white'
                        }`}
                      >
                        <span className="text-white/60 mr-1.5 font-mono text-xs">
                          #{(track.ordem ?? idx) + 1}
                        </span>
                        {track.numeroFormatado}
                      </p>
                      <p className="text-xs text-white/70 truncate mt-0.5 font-normal">
                        {track.texto || 'Narração oficial em estúdio'}
                      </p>
                    </div>
                  </button>

                  {/* Botão Download Offline */}
                  {hasAudio && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await downloadTrack(track);
                        if (ok) toast.success(`Artigo ${track.numeroFormatado} salvo offline!`);
                      }}
                      aria-label="Baixar artigo offline"
                      className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/15 shrink-0 transition active:opacity-70 text-white/70 hover:text-white"
                    >
                      {isDown ? (
                        <Check className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  {/* Botão Favoritar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorito(track);
                    }}
                    aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                    className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/15 shrink-0 transition active:opacity-70"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isFav ? 'fill-rose-400 text-rose-400' : 'text-white/50 hover:text-white'
                      }`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     TELA PRINCIPAL DO ÁLBUM DA LEI (CAPÍTULOS OU LISTA COMPLETA)
  ───────────────────────────────────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full relative w-full overflow-y-auto select-none"
      style={{
        background: themeGradient,
        paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))',
      }}
    >
      {/* Brilho atmosférico no topo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_60%)] z-0" />

      {/* CABEÇALHO DO ÁLBUM — CAPA NO TOPO INTEGRADA SUAVEMENTE AO FUNDO AZUL */}
      <section className="relative isolate shrink-0 pb-5 overflow-hidden -mx-px rounded-t-[30px] z-10 border-b border-white/10">
        {/* Capa sutil no topo à direita sem recortar o fundo azul */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover object-right opacity-30 select-none scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        </div>

        <div className="relative p-5 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+16px)] max-w-4xl mx-auto w-full">
          {/* Barra Superior: Botão Voltar + Botão Trilhas */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              aria-label="Voltar"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white shadow-md active:scale-95 transition-all hover:bg-black/50"
            >
              <ArrowLeft className="w-5 h-5 drop-shadow-md" />
            </button>

            {/* Botão de Ação Rápida no Topo: Trilhas */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTrilhaAberta(true)}
                className="px-4 py-2 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-500/30 active:scale-95 transition-all shadow-lg shadow-emerald-950/40"
              >
                <Route className="w-4 h-4 text-emerald-400" />
                <span>Trilhas</span>
              </button>
            </div>
          </div>

          {/* Título Principal e Metadados — Padrão MapasOverlay */}
          <div className="flex items-start gap-4 mt-2">
            <div className="min-w-0 max-w-[85%] text-white drop-shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Sua Trilha de Narrações Oficiais</span>
              </p>
              <h1 className="mt-0.5 font-display text-[24px] sm:text-[30px] font-black leading-tight text-white drop-shadow-md uppercase tracking-tight">
                {leiNome}
              </h1>
              <p className="mt-0.5 text-[12px] sm:text-[13px] leading-snug text-white/80 font-body">
                Narrações em voz humana profissional organizadas por capítulos e títulos oficiais.
              </p>
            </div>
          </div>

          {/* Card de Indicadores Numéricos — Mostra valores corretos desde o primeiro instante */}
          <div className="relative mt-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 text-white shadow-xl z-10">
            <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
              <div className="flex flex-col items-center justify-center px-2 py-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                  Capítulos
                </span>
                <span className="mt-0.5 font-display text-lg sm:text-xl font-black leading-none text-white">
                  {displayCapitulosCount}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center px-2 py-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                  Áudios Prontos
                </span>
                <span className="mt-0.5 font-display text-lg sm:text-xl font-black leading-none text-emerald-300">
                  {displayAudiosCount}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center px-2 py-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                  Total Artigos
                </span>
                <span className="mt-0.5 font-display text-lg sm:text-xl font-black leading-none text-white/90">
                  {displayArtigosCount}
                </span>
              </div>
            </div>
          </div>

          {/* Botão de Alternância entre Capítulos e Lista Completa */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-1">
            <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setModoVisualizacao('capitulos')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  modoVisualizacao === 'capitulos'
                    ? 'bg-white text-black shadow-lg font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Capítulos</span>
              </button>

              <button
                type="button"
                onClick={() => setModoVisualizacao('lista')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  modoVisualizacao === 'lista'
                    ? 'bg-white text-black shadow-lg font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Ver em Lista Todos</span>
              </button>
            </div>

            {/* Botão Ouvir Tudo na íntegra */}
            <button
              type="button"
              onClick={handlePlayAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white border border-white/15 backdrop-blur-md transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ouvir Tudo</span>
            </button>
          </div>

          {/* Barra de Filtro / Busca Geral */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Filtrar artigo no ${leiNome} (ex: Art. 1º, júri, flagrante)...`}
              className="w-full rounded-2xl border border-white/15 bg-black/30 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder:text-white/50 outline-none transition focus:border-white/40 focus:bg-black/50 backdrop-blur-md"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-white/70 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CORPO PRINCIPAL: LISTA DE CAPÍTULOS OU LISTA DE ARTIGOS */}
      <div className="px-4 py-2 space-y-3 max-w-4xl mx-auto w-full relative z-10">
        {modoVisualizacao === 'capitulos' && !search ? (
          /* ───────── VISUALIZAÇÃO DOS CAPÍTULOS (ESTILO MAPASOVERLAY / AULASOVERLAY - INSTANTÂNEA 0MS) ───────── */
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-white/80" />
                Selecione o Capítulo para Estudar
              </span>
              <span className="text-[11px] text-white/60 font-medium flex items-center gap-1.5">
                {loading && artigos.length === 0 && (
                  <Loader2 className="w-3 h-3 animate-spin text-white/70" />
                )}
                {capitulosComMetadados.length} capítulos disponíveis
              </span>
            </div>

            {capitulosComMetadados.map((cap) => {
              const capPct =
                cap.totalArtigos > 0
                  ? Math.round((cap.totalComAudio / cap.totalArtigos) * 100)
                  : (cap.totalComAudio > 0 ? 100 : 0);

              const capCover = cap.capaUrl || coverUrl;

              return (
                <button
                  key={cap.id}
                  onClick={() => handleSelecionarCapitulo(cap)}
                  className="group flex w-full items-center gap-3.5 rounded-2xl border border-white/15 bg-black/35 backdrop-blur-md p-3.5 text-left transition-all hover:bg-black/50 hover:border-white/30 active:scale-[0.99] shadow-md"
                >
                  {/* Ícone de Destaque com Gradiente e Capa */}
                  <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center border border-white/20 shadow-md">
                    {capCover ? (
                      <img
                        src={capCover}
                        alt=""
                        className="w-full h-full object-cover object-right transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <Headphones className="h-7 w-7 text-white drop-shadow-sm transition-transform group-hover:scale-110" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[11px] font-bold text-white/70 uppercase tracking-wider truncate">
                        {cap.rotuloFaixa}
                      </p>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/15 text-white tabular-nums ml-auto border border-white/10">
                        {loading && artigos.length === 0 ? 'Sincronizando...' : `${cap.totalComAudio} áudios`}
                      </span>
                    </div>

                    <p
                      className="min-w-0 text-[15px] font-bold text-white sm:text-[16px] leading-snug drop-shadow-sm truncate"
                      style={{
                        fontFamily: "'Barlow', system-ui, sans-serif",
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {cap.titulo}
                    </p>

                    <p className="mt-0.5 text-[12px] text-white/75 line-clamp-1">
                      {cap.subtitulo}
                    </p>

                    {/* Barra de Progresso de Áudios Disponíveis */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(8, capPct))}%` }}
                      />
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-white/60 transition-transform group-hover:translate-x-1" />
                </button>
              );
            })}
          </div>
        ) : loading && artigos.length === 0 ? (
          /* Só exibe spinner se o usuário estiver em 'Ver em Lista Todos' ou buscando antes de carregar os artigos */
          <div className="py-20 grid place-items-center text-white/70">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
            <p className="text-xs font-medium">Carregando narrações do álbum...</p>
          </div>
        ) : (
          /* ───────── LISTA GERAL DE ARTIGOS ───────── */
          <div className="space-y-3 pt-1">
            {filteredTracks.length === 0 ? (
              <div className="py-16 text-center text-sm text-white/70 bg-black/30 border border-white/10 rounded-2xl p-6">
                Nenhum artigo encontrado para o filtro.
              </div>
            ) : (
              <motion.div
                className="space-y-2"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.02 } },
                }}
              >
                {filteredTracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const hasAudio = Boolean(track.audioUrl);
                  const isFav = isFavorito(track.id);
                  const isDown = isDownloaded(track.id);

                  return (
                    <motion.div
                      key={track.id}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        show: {
                          opacity: 1,
                          y: 0,
                          transition: { type: 'spring', stiffness: 300, damping: 24 },
                        },
                      }}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition border ${
                        isCurrent
                          ? 'bg-white/20 border-white/30 shadow-md'
                          : 'bg-black/30 hover:bg-black/45 border-white/10'
                      }`}
                    >
                      {/* Botão de Tocar com Miniatura da Capa */}
                      <button
                        onClick={() => handleTrackClick(track)}
                        disabled={!hasAudio}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left disabled:opacity-50 group focus-visible:outline-none"
                      >
                        <span className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-zinc-900 shadow-md border border-white/15">
                          <img
                            src={coverUrl}
                            alt=""
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <span className="absolute inset-0 grid place-items-center bg-black/40 text-white transition-opacity">
                            {isCurrent && isPlaying ? (
                              <span className="flex items-end justify-center gap-[2px] h-4">
                                <span className="w-0.5 h-4 bg-white animate-pulse" />
                                <span className="w-0.5 h-2.5 bg-white animate-pulse delay-75" />
                                <span className="w-0.5 h-3.5 bg-white animate-pulse delay-150" />
                              </span>
                            ) : (
                              <Play className="h-4 w-4 ml-0.5 fill-white text-white" />
                            )}
                          </span>
                        </span>

                        <div className="min-w-0 flex-1 py-0.5">
                          <p
                            className={`text-sm font-bold truncate ${
                              isCurrent ? 'text-white underline' : 'text-white'
                            }`}
                          >
                            <span className="text-white/60 mr-1.5 font-mono text-xs">
                              #{(track.ordem ?? idx) + 1}
                            </span>
                            {track.numeroFormatado}
                          </p>
                          <p className="text-xs text-white/70 truncate mt-0.5 font-normal">
                            {track.texto || 'Narração oficial em estúdio'}
                          </p>
                        </div>
                      </button>

                      {/* Botão Download Offline */}
                      {hasAudio && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await downloadTrack(track);
                            if (ok) toast.success(`Artigo ${track.numeroFormatado} salvo offline!`);
                          }}
                          aria-label="Baixar artigo offline"
                          className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/15 shrink-0 transition active:opacity-70 text-white/70 hover:text-white"
                        >
                          {isDown ? (
                            <Check className="h-4 w-4 text-emerald-300" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                      )}

                      {/* Botão Favoritar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorito(track);
                        }}
                        aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                        className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/15 shrink-0 transition active:opacity-70"
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            isFav ? 'fill-rose-400 text-rose-400' : 'text-white/50 hover:text-white'
                          }`}
                        />
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Trilha Sequencial Guiada */}
      <SpotifyAudioTrilhaModal
        isOpen={trilhaAberta}
        onClose={() => setTrilhaAberta(false)}
        leiId={leiId}
        leiNome={leiNome}
        leiSlug={leiSlug}
        coverUrl={coverUrl}
        tracks={albumTracks}
      />
    </div>
  );
};

export default SpotifyLeiAlbumView;
