import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Heart,
  Download,
  Check,
  Search,
  Headphones,
  FolderOpen,
  ExternalLink,
  X,
  Loader2,
  LayoutGrid,
  ListMusic,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { fetchArtigosDaLeiComNarracao, type ArtigoNarracaoItem } from '@/services/narracaoArtigosSyncService';
import { getAllAudioAulasConfigs, formatDriveStreamUrl } from '@/services/audioAulasService';
import { getLeiCover } from '@/lib/leiTheme';
import { getCapitulosDaLei, extrairNumeroArtigo, type CapituloDef } from '@/lib/leiCapitulosHelper';

interface SpotifyLeiAlbumViewProps {
  leiId: string;
  leiNome: string;
  leiSlug: string;
  categoria?: string;
  onBack: () => void;
}

export const SpotifyLeiAlbumView: React.FC<SpotifyLeiAlbumViewProps> = ({
  leiId,
  leiNome,
  leiSlug,
  categoria,
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
  } = useSpotifyAudioStore();

  const [artigos, setArtigos] = useState<ArtigoNarracaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [aulaLinks, setAulaLinks] = useState<Record<string, string>>({});
  const [driveFolder, setDriveFolder] = useState<string>('');

  // Modo de exibição: 'capitulos' (estilo Mapas Mentais/Aulas Overlay) ou 'lista' (todos os artigos em lista corrida)
  const [modoVisualizacao, setModoVisualizacao] = useState<'capitulos' | 'lista'>('capitulos');
  const [capituloSelecionado, setCapituloSelecionado] = useState<CapituloDef | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const coverUrl = getLeiCover(leiSlug || leiId);

  // Paleta de gradiente temático inspirado no MapasOverlay / AulasOverlay
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

  // Carrega artigos da lei e links do Google Drive
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchArtigosDaLeiComNarracao(leiId, leiSlug);
        if (isMounted) setArtigos(data);

        // Se estiver em modo áudio-aulas, busca links específicos das aulas
        const configs = await getAllAudioAulasConfigs();
        const conf = configs[leiId] || configs[leiSlug];
        if (conf && isMounted) {
          setAulaLinks(conf.audioLinks || {});
          setDriveFolder(conf.driveFolderUrl || '');
        }
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
  }, [leiId, leiSlug]);

  // Monta lista de todas as faixas da lei no formato SpotifyTrack (apenas as que têm áudio)
  const albumTracks: SpotifyTrack[] = useMemo(() => {
    return artigos
      .map((art, index) => {
        let finalAudioUrl = '';
        if (audioMode === 'aulas') {
          const rawLink = aulaLinks[art.numeroFormatado] || aulaLinks[art.numero] || '';
          finalAudioUrl = formatDriveStreamUrl(rawLink) || rawLink;
        } else {
          finalAudioUrl = art.narracao_url || '';
        }

        return {
          id: `${leiSlug}::${art.numero}`,
          tipo: (audioMode === 'aulas' ? 'aula' : 'lei') as 'aula' | 'lei',
          leiId,
          leiSlug,
          leiNome,
          artigoNumero: art.numero,
          numeroFormatado: art.numeroFormatado,
          titulo: `${art.numeroFormatado} • ${leiNome}`,
          subtitulo: `${leiNome} • ${audioMode === 'aulas' ? 'Áudio-Aula' : 'Narração Oficial'}`,
          texto: art.texto,
          audioUrl: finalAudioUrl,
          coverUrl,
          ordem: art.ordem || index,
        };
      })
      .filter((t) => Boolean(t.audioUrl && t.audioUrl.trim()));
  }, [artigos, aulaLinks, audioMode, leiId, leiSlug, leiNome, coverUrl]);

  // Capítulos temáticos estruturados para esta legislação
  const capitulos = useMemo(() => {
    return getCapitulosDaLei(leiSlug, artigos.length);
  }, [leiSlug, artigos.length]);

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

  // Filtro de busca na tracklist e filtro por capítulo se selecionado
  const filteredTracks = useMemo(() => {
    let base = albumTracks;

    // Se estiver filtrado por um capítulo específico
    if (capituloSelecionado) {
      base = base.filter((t) => {
        const num = extrairNumeroArtigo(t.artigoNumero || t.numeroFormatado);
        return num >= capituloSelecionado.artigoInicio && num <= capituloSelecionado.artigoFim;
      });
    }

    if (!search.trim()) return base;
    const term = search.toLowerCase();
    return base.filter(
      (t) =>
        t.numeroFormatado.toLowerCase().includes(term) ||
        t.artigoNumero.toLowerCase().includes(term) ||
        t.texto.toLowerCase().includes(term)
    );
  }, [albumTracks, search, capituloSelecionado]);

  const totalComAudio = useMemo(() => {
    return albumTracks.filter((t) => Boolean(t.audioUrl && t.audioUrl.trim())).length;
  }, [albumTracks]);

  // Tocar a lei inteira desde o primeiro artigo
  const handlePlayAll = async () => {
    const comAudio = albumTracks.filter((t) => Boolean(t.audioUrl));
    if (comAudio.length === 0) {
      toast.info('Áudios desta lei estão sendo preparados para gravação.');
      return;
    }
    await playTrack(comAudio[0], comAudio);
    toast.success(`Reproduzindo ${leiNome} continuamente!`);
  };

  // Tocar apenas o capítulo selecionado
  const handlePlayCapitulo = async (cap: CapituloDef) => {
    const tracksDoCap = albumTracks.filter((t) => {
      const num = extrairNumeroArtigo(t.artigoNumero || t.numeroFormatado);
      return num >= cap.artigoInicio && num <= cap.artigoFim;
    });

    if (tracksDoCap.length === 0) {
      toast.info(`Nenhum áudio disponível no momento para ${cap.titulo}.`);
      return;
    }

    await playTrack(tracksDoCap[0], tracksDoCap);
    toast.success(`Reproduzindo capítulo: ${cap.titulo}`);
  };

  const handleTrackClick = async (track: SpotifyTrack) => {
    if (!track.audioUrl) {
      if (driveFolder) {
        window.open(driveFolder, '_blank');
        toast.info('Abrindo pasta de áudios no Google Drive...');
      } else {
        toast.info(`Áudio do ${track.numeroFormatado} em gravação.`);
      }
      return;
    }

    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }

    // Fila de reprodução contextual (do capítulo ou do álbum)
    const queue = filteredTracks.filter((t) => Boolean(t.audioUrl));
    await playTrack(track, queue.length > 0 ? queue : albumTracks);
  };

  const handleSelecionarCapitulo = (cap: CapituloDef) => {
    setCapituloSelecionado(cap);
    setSearch('');
    setTimeout(() => {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full relative w-full overflow-y-auto select-none"
      style={{
        background: themeGradient,
        paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))',
      }}
    >
      {/* Reflexos Radiais Sofisticados do MapasOverlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)] z-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.3),transparent_70%)] z-0" />

      {/* CABEÇALHO DO ÁLBUM — ESTILO MAPASOVERLAY / AULASOVERLAY */}
      <section className="relative isolate shrink-0 pb-5 overflow-hidden -mx-px rounded-t-[30px] z-10">
        {/* Capa com mix-blend sutil à direita */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] sm:w-[32%] overflow-hidden">
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-y-0 right-0 h-full w-auto object-contain object-right opacity-35 mix-blend-luminosity transition-opacity duration-700"
          />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="relative p-5 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+16px)] max-w-4xl mx-auto w-full">
          {/* Barra Superior: Botão Voltar + Botão de Ação Rápida */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={capituloSelecionado ? () => setCapituloSelecionado(null) : onBack}
              aria-label="Voltar"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white shadow-md active:scale-95 transition-all hover:bg-black/40"
            >
              <ArrowLeft className="w-5 h-5 drop-shadow-md" />
            </button>

            {/* Botão de Ação Rápida no Topo */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  capituloSelecionado
                    ? () => handlePlayCapitulo(capituloSelecionado)
                    : handlePlayAll
                }
                className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-white/30 active:scale-95 transition-all shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>{capituloSelecionado ? 'Ouvir Capítulo' : 'Reproduzir Tudo'}</span>
              </button>

              {driveFolder && (
                <a
                  href={driveFolder}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Google Drive"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white shadow-md active:scale-95 transition-all hover:bg-black/40"
                >
                  <FolderOpen className="w-4 h-4 text-sky-300" />
                </a>
              )}
            </div>
          </div>

          {/* Título Principal e Metadados — Idêntico ao MapasOverlay */}
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

          {/* Card de Indicadores Numéricos — Idêntico ao MapasOverlay */}
          <div className="relative mt-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 text-white shadow-xl z-10">
            <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
              <div className="flex flex-col items-center justify-center px-2 py-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                  Capítulos
                </span>
                <span className="mt-0.5 font-display text-lg sm:text-xl font-black leading-none text-white">
                  {capitulosComMetadados.length}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center px-2 py-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                  Áudios Prontos
                </span>
                <span className="mt-0.5 font-display text-lg sm:text-xl font-black leading-none text-emerald-300 font-mono">
                  {totalComAudio}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center px-2 py-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                  Total Artigos
                </span>
                <span className="mt-0.5 font-display text-lg sm:text-xl font-black leading-none text-white/90">
                  {artigos.length}
                </span>
              </div>
            </div>
          </div>

          {/* Botão de Alternância entre Capítulos e Lista Completa */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-1">
            <div className="flex items-center p-1 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setModoVisualizacao('capitulos');
                  setCapituloSelecionado(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  modoVisualizacao === 'capitulos' && !capituloSelecionado
                    ? 'bg-white text-black shadow-lg font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Capítulos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoVisualizacao('lista');
                  setCapituloSelecionado(null);
                }}
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

            {/* Contador de áudios em badge discreto */}
            <span className="text-[11px] font-bold text-white/80 bg-black/30 border border-white/10 px-3 py-1.5 rounded-xl hidden sm:inline-block">
              {totalComAudio} áudios disponíveis
            </span>
          </div>

          {/* Barra de Filtro / Busca */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                capituloSelecionado
                  ? `Buscar no capítulo ${capituloSelecionado.titulo}...`
                  : `Filtrar artigo no ${leiNome} (ex: Art. 1º, júri, flagrante)...`
              }
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
        {loading ? (
          <div className="py-20 grid place-items-center text-white/70">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
            <p className="text-xs font-medium">Carregando narrações do álbum...</p>
          </div>
        ) : modoVisualizacao === 'capitulos' && !capituloSelecionado && !search ? (
          /* ───────── VISUALIZAÇÃO DOS CAPÍTULOS — IDÊNTICO AO MAPASOVERLAY / AULASOVERLAY ───────── */
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-white/80" />
                Selecione o Capítulo para Estudar
              </span>
              <span className="text-[11px] text-white/60 font-medium">
                {capitulosComMetadados.length} capítulos disponíveis
              </span>
            </div>

            {capitulosComMetadados.map((cap, i) => {
              const capPct =
                cap.totalArtigos > 0
                  ? Math.round((cap.totalComAudio / cap.totalArtigos) * 100)
                  : 0;

              return (
                <button
                  key={cap.id}
                  onClick={() => handleSelecionarCapitulo(cap)}
                  className="group flex w-full items-center gap-3.5 rounded-2xl border border-white/15 bg-black/35 backdrop-blur-md p-3.5 text-left transition-all hover:bg-black/50 hover:border-white/30 active:scale-[0.99] shadow-md"
                >
                  {/* Ícone de Destaque com Gradiente e Capa */}
                  <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center border border-white/20 shadow-md">
                    {cap.capaUrl ? (
                      <img
                        src={cap.capaUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
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
                        {cap.totalComAudio} áudios
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
                        style={{ width: `${Math.min(100, Math.max(10, capPct))}%` }}
                      />
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-white/60 transition-transform group-hover:translate-x-1" />
                </button>
              );
            })}
          </div>
        ) : (
          /* ───────── LISTA DE ARTIGOS (POR CAPÍTULO OU GERAL) ───────── */
          <div className="space-y-3 pt-1">
            {/* Contexto do Capítulo Selecionado */}
            {capituloSelecionado && (
              <div className="p-3.5 rounded-2xl bg-black/45 border border-white/15 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCapituloSelecionado(null)}
                    className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/10"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Voltar aos Capítulos
                  </button>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white uppercase flex items-center gap-2">
                      {capituloSelecionado.titulo}
                    </h3>
                    <p className="text-xs text-white/70">
                      {capituloSelecionado.rotuloFaixa} &bull; {filteredTracks.length} áudios
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handlePlayCapitulo(capituloSelecionado)}
                  className="px-4 py-2 rounded-xl bg-white text-black text-xs font-black uppercase flex items-center gap-1.5 shadow-md hover:bg-white/90 active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Ouvir Capítulo
                </button>
              </div>
            )}

            {/* Lista dos Artigos */}
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
    </div>
  );
};

export default SpotifyLeiAlbumView;
