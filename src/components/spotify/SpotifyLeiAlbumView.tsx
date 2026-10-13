import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  Play,
  Pause,
  Heart,
  Plus,
  Download,
  Check,
  Search,
  Headphones,
  BookOpen,
  Sparkles,
  CheckCircle2,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { fetchArtigosDaLeiComNarracao, type ArtigoNarracaoItem } from '@/services/narracaoArtigosSyncService';
import { getAllAudioAulasConfigs, formatDriveStreamUrl } from '@/services/audioAulasService';
import { getLeiCover, getLeiColor } from '@/lib/leiTheme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

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
    addTrackToPlaylist,
    createPlaylist,
    playlists,
  } = useSpotifyAudioStore();

  const [artigos, setArtigos] = useState<ArtigoNarracaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [aulaLinks, setAulaLinks] = useState<Record<string, string>>({});
  const [driveFolder, setDriveFolder] = useState<string>('');

  const coverUrl = getLeiCover(leiSlug || leiId);
  const accentColor = getLeiColor(leiSlug || leiId);

  // Carrega artigos da lei e links
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

  // Monta lista de faixas do álbum no formato SpotifyTrack
  const albumTracks: SpotifyTrack[] = useMemo(() => {
    return artigos.map((art, index) => {
      let finalAudioUrl = '';
      if (audioMode === 'aulas') {
        const rawLink = aulaLinks[art.numeroFormatado] || aulaLinks[art.numero] || '';
        finalAudioUrl = formatDriveStreamUrl(rawLink) || rawLink;
      } else {
        finalAudioUrl = art.narracao_url || '';
      }

      return {
        id: `${leiSlug}::${art.numero}`,
        tipo: audioMode === 'aulas' ? 'aula' : 'lei',
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
    });
  }, [artigos, aulaLinks, audioMode, leiId, leiSlug, leiNome, coverUrl]);

  // Filtro de busca na tracklist
  const filteredTracks = useMemo(() => {
    if (!search.trim()) return albumTracks;
    const term = search.toLowerCase();
    return albumTracks.filter(
      (t) =>
        t.numeroFormatado.toLowerCase().includes(term) ||
        t.artigoNumero.toLowerCase().includes(term) ||
        t.texto.toLowerCase().includes(term)
    );
  }, [albumTracks, search]);

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
    toast.success(`Reproduzindo ${leiNome} continuamente no modo Spotify!`);
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

    // Toca a faixa e define as faixas com áudio como fila
    const queue = albumTracks.filter((t) => Boolean(t.audioUrl));
    await playTrack(track, queue);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-40">
      {/* Botão Superior Voltar */}
      <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors p-1.5 -ml-1 rounded-xl hover:bg-white/5"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Voltar para Leis</span>
        </button>

        <span className="text-xs font-bold text-zinc-400 truncate max-w-[200px]">
          {leiNome}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Hero do Álbum no estilo Spotify */}
        <div
          className="relative overflow-hidden rounded-3xl p-5 sm:p-7 border border-white/10 shadow-2xl flex flex-col sm:flex-row items-center sm:items-end gap-6"
          style={{
            background: `linear-gradient(135deg, ${accentColor}33 0%, rgba(15,23,42,0.95) 100%)`,
          }}
        >
          {/* Capa em Destaque */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-zinc-900 shrink-0">
            <img src={coverUrl} alt={leiNome} className="w-full h-full object-cover" />
          </div>

          {/* Metadados e Informações da Lei */}
          <div className="space-y-2.5 text-center sm:text-left flex-1 min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 border border-white/10 inline-block">
              {audioMode === 'aulas' ? 'CURSO EM ÁUDIO' : 'ÁLBUM OFICIAL'} &bull; {categoria || 'VADE MECUM'}
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {leiNome}
            </h1>

            <p className="text-xs text-zinc-300 font-medium">
              VACATIO Vade Mecum &bull; {artigos.length} Artigos &bull;{' '}
              <span className="text-emerald-400 font-bold">{totalComAudio} com áudio</span>
            </p>

            {/* Botões de Ação do Álbum */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              {/* Botão Gigante Play Verde Spotify */}
              <button
                type="button"
                onClick={handlePlayAll}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-black" />
                REPRODUZIR TUDO
              </button>

              {driveFolder && (
                <a
                  href={driveFolder}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold border border-white/10 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-sky-400" />
                  Abrir Drive
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa na Tracklist */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder={`Filtrar artigo no ${leiNome} (ex: Art. 121, crime, culpa)...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-900/60 border-white/10 text-white text-xs h-10 rounded-2xl placeholder:text-zinc-500"
          />
        </div>

        {/* Tracklist Estilo Spotify */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-3 pb-2 border-b border-white/5">
            <div className="flex items-center gap-4">
              <span className="w-6 text-center">#</span>
              <span>Título</span>
            </div>
            <span>Ações</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-xs text-zinc-400">
              Carregando faixas do álbum...
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              Nenhum artigo encontrado para o filtro.
            </div>
          ) : (
            filteredTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const hasAudio = Boolean(track.audioUrl);
              const isFav = isFavorito(track.id);
              const isDown = isDownloaded(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => handleTrackClick(track)}
                  className={`group px-3 py-3 rounded-2xl flex items-center justify-between gap-3 text-left cursor-pointer transition-colors border ${
                    isCurrent
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-md'
                      : 'hover:bg-white/5 border-transparent text-zinc-300'
                  }`}
                >
                  {/* Número e Informações */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="w-6 text-center text-xs font-bold text-zinc-500 group-hover:hidden">
                      {isCurrent && isPlaying ? (
                        <span className="flex items-end justify-center gap-[2px] h-3">
                          <span className="w-0.5 h-3 bg-emerald-400 animate-pulse" />
                          <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-75" />
                        </span>
                      ) : (
                        idx + 1
                      )}
                    </span>

                    <button
                      type="button"
                      className="w-6 text-center hidden group-hover:block text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackClick(track);
                      }}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current mx-auto" />
                      ) : (
                        <Play className="w-4 h-4 fill-current mx-auto" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {track.numeroFormatado}
                        </span>
                        {hasAudio ? (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[9px] py-0 font-bold">
                            Áudio Pronto
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-white/10 text-zinc-500 text-[9px] py-0">
                            Gravação em fila
                          </Badge>
                        )}
                        {isDown && (
                          <span title="Salvo offline">
                            <Check className="w-3 h-3 text-sky-400" />
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 font-normal">
                        {track.texto}
                      </p>
                    </div>
                  </div>

                  {/* Botões Rápidos na Linha */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Favoritar */}
                    <button
                      type="button"
                      onClick={() => toggleFavorito(track)}
                      aria-label="Favoritar"
                      className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'text-rose-500 fill-rose-500' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      />
                    </button>

                    {/* Baixar Offline */}
                    {hasAudio && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await downloadTrack(track);
                          if (ok) toast.success(`Artigo ${track.numeroFormatado} salvo offline!`);
                        }}
                        aria-label="Baixar offline"
                        className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                      >
                        {isDown ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Play / Ouvir */}
                    <button
                      type="button"
                      onClick={() => handleTrackClick(track)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isCurrent && isPlaying
                          ? 'bg-emerald-500 text-black'
                          : hasAudio
                          ? 'bg-white/10 hover:bg-white/20 text-white'
                          : 'bg-white/5 text-zinc-500'
                      }`}
                    >
                      {isCurrent && isPlaying ? 'Pausar' : hasAudio ? 'Ouvir' : 'Fila'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
