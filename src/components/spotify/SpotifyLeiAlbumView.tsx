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
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { fetchArtigosDaLeiComNarracao, type ArtigoNarracaoItem } from '@/services/narracaoArtigosSyncService';
import { getAllAudioAulasConfigs, formatDriveStreamUrl } from '@/services/audioAulasService';
import { getLeiCover } from '@/lib/leiTheme';
import { getCapitulosDaLei, extrairNumeroArtigo, type CapituloDef } from '@/lib/leiCapitulosHelper';
import ShapeGrid from '@/components/ui/ShapeGrid';

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

  // Modo de exibição: 'capitulos' (estilo áudio aulas em capas) ou 'lista' (todos os artigos em lista)
  const [modoVisualizacao, setModoVisualizacao] = useState<'capitulos' | 'lista'>('capitulos');
  const [capituloSelecionado, setCapituloSelecionado] = useState<CapituloDef | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const coverUrl = getLeiCover(leiSlug || leiId);

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
    // Rola suavemente para a lista de artigos
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-zinc-950 text-foreground pb-44 relative overflow-hidden select-none"
    >
      {/* Textura Geométrica Dinâmica idêntica ao Áudio Aulas */}
      <div className="absolute inset-0 z-0 opacity-60 pointer-events-none">
        <ShapeGrid
          speed={0.5}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(255, 255, 255, 0.05)"
          hoverFillColor="rgba(255, 255, 255, 0.1)"
          shape="square"
          hoverTrailAmount={5}
        />
      </div>

      <div className="relative z-10">
        {/* Hero Section — Estética Idêntica ao AudioaulasHero */}
        <div className="relative px-4 pt-[calc(2rem+var(--sai-top))] pb-6 sm:px-6 lg:px-10 lg:pt-[calc(3rem+var(--sai-top))] lg:pb-10">
          <div className="mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px]">
            {/* Linha Superior: Botão Voltar + Seletor de Modo de Exibição */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={capituloSelecionado ? () => setCapituloSelecionado(null) : onBack}
                aria-label="Voltar"
                className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition shrink-0 active:opacity-70 z-10 relative"
              >
                <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.4} />
              </button>

              {/* Botão de Alternância Capítulos ↔ Lista Corrida */}
              <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    setModoVisualizacao('capitulos');
                    setCapituloSelecionado(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    modoVisualizacao === 'capitulos' && !capituloSelecionado
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-zinc-400 hover:text-white'
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    modoVisualizacao === 'lista'
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Lista Completa</span>
                </button>
              </div>
            </div>

            {/* Layout Horizontal Capa + Metadados */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 lg:gap-8 text-center sm:text-left">
              {/* Capa com Bordas Suaves e Sombra Profunda */}
              <div className="relative h-32 w-32 sm:h-36 sm:w-36 lg:h-44 lg:w-44 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-white/10 bg-[#1c1c1c]">
                <img src={coverUrl} alt={leiNome} className="w-full h-full object-cover" />
              </div>

              {/* Títulos e Contadores */}
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-[11px] font-semibold uppercase tracking-widest mb-2 border border-primary/30">
                  <Headphones className="h-3.5 w-3.5" />
                  {audioMode === 'aulas' ? 'Curso em Áudio' : 'Narrações Oficiais'} &bull; {categoria || 'Códigos'}
                </span>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-none text-white drop-shadow-md">
                  {leiNome}
                </h1>

                <p className="text-xs sm:text-sm lg:text-base text-zinc-300 mt-2.5 font-medium">
                  {audioMode === 'aulas'
                    ? 'Aulas e explicações artigo por artigo com conceitos doutrinários.'
                    : 'Narrações oficiais com voz humana em estúdio de alta definição.'}
                </p>

                <p className="text-xs text-zinc-400 mt-1 font-medium flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span>VACATIO Vade Mecum</span>
                  <span>&bull;</span>
                  <span>{artigos.length} artigos catalogados</span>
                  <span>&bull;</span>
                  <span className="text-primary font-bold">{totalComAudio} áudios prontos</span>
                  <span>&bull;</span>
                  <span>{capitulos.length} capítulos</span>
                </p>

                {/* Botões de Ação Dinâmicos */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-4">
                  {modoVisualizacao === 'capitulos' && !capituloSelecionado ? (
                    // Quando estiver em Capítulos: botão vermelho "VER EM LISTA TODOS"
                    <button
                      type="button"
                      onClick={() => setModoVisualizacao('lista')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-xl shadow-primary/25 transition-all hover:scale-105 active:scale-95"
                    >
                      <ListMusic className="w-4 h-4" />
                      VER EM LISTA TODOS
                    </button>
                  ) : capituloSelecionado ? (
                    // Quando estiver dentro de um Capítulo
                    <button
                      type="button"
                      onClick={() => handlePlayCapitulo(capituloSelecionado)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-xl shadow-primary/25 transition-all hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      REPRODUZIR CAPÍTULO
                    </button>
                  ) : (
                    // Quando estiver em Lista Completa: botão "VER EM CAPÍTULOS"
                    <button
                      type="button"
                      onClick={() => setModoVisualizacao('capitulos')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-xl shadow-primary/25 transition-all hover:scale-105 active:scale-95"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      VER EM CAPÍTULOS
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePlayAll}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider border border-white/15 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    REPRODUZIR TUDO
                  </button>

                  {driveFolder && (
                    <a
                      href={driveFolder}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold border border-white/10 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-sky-400" />
                      Pasta no Drive
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa — Estética idêntica ao AudioaulasBuscaInput */}
        <div className="mx-auto w-full max-w-[1400px] px-4 mt-2 mb-6 lg:px-10 2xl:max-w-[1600px]">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                capituloSelecionado
                  ? `Filtrar no capítulo ${capituloSelecionado.titulo}...`
                  : `Filtrar artigo no ${leiNome} (ex: Art. 1º, júri, denúncia)...`
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/50 focus:bg-white/10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL: GRADE DE CAPÍTULOS OU LISTA DE ARTIGOS */}
        <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-10 2xl:max-w-[1600px]">
          {loading ? (
            <div className="py-20 grid place-items-center text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs text-zinc-400 mt-2 font-medium">Carregando narrações do álbum...</p>
            </div>
          ) : modoVisualizacao === 'capitulos' && !capituloSelecionado && !search ? (
            /* ───────── GRADE DE CAPÍTULOS (ESTILO ÁUDIO AULAS EM CAPAS) ───────── */
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Capítulos & Temas ({capitulosComMetadados.length})
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                    Toque em um capítulo temático para ouvir os artigos específicos correspondentes.
                  </p>
                </div>
              </div>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
                }}
              >
                {capitulosComMetadados.map((cap, i) => {
                  const capaItem = cap.capaUrl || coverUrl;
                  return (
                    <motion.div
                      key={cap.id}
                      variants={{
                        hidden: { opacity: 0, scale: 0.95, y: 10 },
                        show: {
                          opacity: 1,
                          scale: 1,
                          y: 0,
                          transition: { type: 'spring', stiffness: 300, damping: 24 },
                        },
                      }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelecionarCapitulo(cap)}
                      className="group relative rounded-3xl overflow-hidden border border-white/10 hover:border-white/25 bg-zinc-900/80 transition-all shadow-xl hover:shadow-2xl hover:shadow-primary/20 cursor-pointer flex flex-col justify-between"
                      style={{ minHeight: '260px' }}
                    >
                      {/* Imagem de Fundo com Gradiente Cinematográfico */}
                      <div className="absolute inset-0 z-0">
                        <img
                          src={capaItem}
                          alt={cap.titulo}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/30" />
                      </div>

                      {/* Topo do Card: Badges e Botão Play Rápido */}
                      <div className="relative z-10 p-4 flex items-start justify-between gap-2">
                        <span className="px-3 py-1 rounded-full bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-wider shadow-md">
                          {cap.rotuloFaixa}
                        </span>

                        <span className="h-9 w-9 grid place-items-center rounded-2xl bg-white/15 text-white backdrop-blur-md group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-md">
                          <ChevronRight className="h-5 w-5" />
                        </span>
                      </div>

                      {/* Base do Card: Título, Descrição e Metadados */}
                      <div className="relative z-10 p-4 pt-0 space-y-2">
                        {cap.badge && (
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block">
                            {cap.badge}
                          </span>
                        )}

                        <h3 className="text-base sm:text-lg font-black leading-tight text-white uppercase group-hover:text-primary transition-colors">
                          {cap.titulo}
                        </h3>

                        <p className="text-xs text-zinc-300 font-normal leading-snug line-clamp-2">
                          {cap.subtitulo}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-zinc-400 font-medium">
                          <span>{cap.totalArtigos} artigos</span>
                          <span className="text-primary font-bold flex items-center gap-1">
                            <Headphones className="w-3 h-3" />
                            {cap.totalComAudio} áudios prontos
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </section>
          ) : (
            /* ───────── LISTA DE ARTIGOS (POR CAPÍTULO OU GERAL) ───────── */
            <div className="space-y-4">
              {/* Barra de Contexto do Capítulo Selecionado */}
              {capituloSelecionado && (
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCapituloSelecionado(null)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Voltar aos Capítulos
                    </button>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white uppercase flex items-center gap-2">
                        {capituloSelecionado.titulo}
                        <span className="text-xs font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/15 border border-primary/20">
                          {capituloSelecionado.rotuloFaixa}
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-400 hidden sm:block">
                        {capituloSelecionado.subtitulo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePlayCapitulo(capituloSelecionado)}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase flex items-center gap-1.5 shadow-md shadow-primary/25 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Ouvir Capítulo
                    </button>
                  </div>
                </div>
              )}

              {/* Lista dos Artigos */}
              {filteredTracks.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  Nenhum artigo encontrado para o filtro.
                </div>
              ) : (
                <motion.div
                  className="space-y-2"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.03 } },
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
                          hidden: { opacity: 0, y: 10 },
                          show: {
                            opacity: 1,
                            y: 0,
                            transition: { type: 'spring', stiffness: 300, damping: 24 },
                          },
                        }}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition border ${
                          isCurrent
                            ? 'bg-primary/15 border-primary/25 shadow-sm'
                            : 'hover:bg-white/5 border-transparent'
                        }`}
                      >
                        {/* Botão de Tocar com Miniatura da Capa */}
                        <button
                          onClick={() => handleTrackClick(track)}
                          disabled={!hasAudio}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left disabled:opacity-50 group focus-visible:outline-none"
                        >
                          <span className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-zinc-800 shadow-md">
                            <img
                              src={coverUrl}
                              alt=""
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <span className="absolute inset-0 grid place-items-center bg-black/40 text-white transition-opacity">
                              {isCurrent && isPlaying ? (
                                <span className="flex items-end justify-center gap-[2px] h-4">
                                  <span className="w-0.5 h-4 bg-primary animate-pulse" />
                                  <span className="w-0.5 h-2.5 bg-primary animate-pulse delay-75" />
                                  <span className="w-0.5 h-3.5 bg-primary animate-pulse delay-150" />
                                </span>
                              ) : (
                                <Play className="h-4 w-4 ml-0.5 fill-white text-white" />
                              )}
                            </span>
                          </span>

                          <div className="min-w-0 flex-1 py-0.5">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isCurrent ? 'text-primary' : 'text-foreground'
                              }`}
                            >
                              <span className="text-zinc-500 mr-1.5 font-mono text-xs">
                                #{(track.ordem ?? idx) + 1}
                              </span>
                              {track.numeroFormatado}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5 font-normal">
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
                            className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10 shrink-0 transition active:opacity-70 text-zinc-400 hover:text-white"
                          >
                            {isDown ? (
                              <Check className="h-4 w-4 text-emerald-400" />
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
                          className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10 shrink-0 transition active:opacity-70"
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              isFav ? 'fill-rose-400 text-rose-400' : 'text-muted-foreground'
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
    </div>
  );
};

export default SpotifyLeiAlbumView;
