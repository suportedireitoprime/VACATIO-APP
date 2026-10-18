import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Heart,
  Plus,
  Shuffle,
  Repeat,
  Download,
  Check,
  ListMusic,
  Share2,
  FileText,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const SpotifyExpandedPlayer: React.FC = () => {

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isShuffle,
    repeatMode,
    isExpanded,
    queue,
    queueIndex,
    playlists,
    togglePlay,
    seekTo,
    seekRelative,
    nextTrack,
    prevTrack,
    setPlaybackRate,
    toggleShuffle,
    toggleRepeat,
    setExpanded,
    toggleFavorito,
    isFavorito,
    downloadTrack,
    isDownloaded,
    addTrackToPlaylist,
    createPlaylist,
  } = useSpotifyAudioStore();

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isExpanded]);

  if (!isExpanded || !currentTrack) return null;

  const isFav = isFavorito(currentTrack.id);
  const isDown = isDownloaded(currentTrack.id);

  const formatSeconds = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    if (isDown) {
      toast.info('Áudio já disponível offline no seu dispositivo.');
      return;
    }
    setIsDownloading(true);
    toast.loading('Baixando áudio para reprodução offline...', { id: 'down-audio' });
    const ok = await downloadTrack(currentTrack);
    setIsDownloading(false);
    if (ok) {
      toast.success('Áudio baixado com sucesso! Pode escutar sem internet.', { id: 'down-audio' });
    } else {
      toast.error('Não foi possível salvar o áudio offline.', { id: 'down-audio' });
    }
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addTrackToPlaylist(playlistId, currentTrack);
    toast.success('Artigo adicionado à playlist!');
    setPlaylistModalOpen(false);
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const pl = createPlaylist(newPlaylistName.trim());
    addTrackToPlaylist(pl.id, currentTrack);
    setNewPlaylistName('');
    toast.success(`Playlist "${pl.nome}" criada com sucesso!`);
    setPlaylistModalOpen(false);
  };

  // Alterna velocidades: 1x -> 1.25x -> 1.5x -> 2x -> 1x
  const handleNextRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const idx = rates.indexOf(playbackRate);
    const nextRate = rates[(idx + 1) % rates.length];
    setPlaybackRate(nextRate);
  };

  const playerNode = (
    <>
      <div
        className="fixed inset-0 z-[120] bg-gradient-to-b from-zinc-900 via-slate-950 to-black text-white flex flex-col justify-between overflow-y-auto overscroll-contain px-5 sm:px-8 backdrop-blur-2xl animate-in fade-in slide-in-from-bottom duration-300"
        style={{
          paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 0.75rem)',
          paddingBottom: 'calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 2.5rem)',
        }}
      >
        {/* Header Superior */}
        <div className="flex items-center justify-between w-full max-w-lg mx-auto shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Recolher player"
            className="p-2 -ml-2 text-zinc-300 hover:text-white transition-colors"
          >
            <ChevronDown className="w-7 h-7" />
          </button>

          <div className="text-center px-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 block">
              {currentTrack.tipo === 'aula' ? 'TOCANDO ÁUDIO-AULA' : 'TOCANDO DA LEGISLAÇÃO'}
            </span>
            <span className="text-xs font-semibold text-white truncate max-w-[200px] block">
              {currentTrack.leiNome}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            aria-label="Ver fila"
            className={`p-2 -mr-2 transition-colors ${
              showQueue ? 'text-emerald-400' : 'text-zinc-300 hover:text-white'
            }`}
          >
            <ListMusic className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Central */}
        <div className="w-full max-w-md mx-auto my-auto py-4 flex flex-col items-center">
          {showQueue ? (
            /* Gaveta de Fila de Reprodução (Up Next) */
            <div className="w-full h-80 overflow-y-auto bg-zinc-900/80 rounded-3xl p-4 border border-white/10 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Fila de Reprodução ({queue.length})
                </span>
                <span className="text-[11px] text-zinc-500">Autoplay ativado</span>
              </div>
              {queue.map((item, idx) => {
                const isItemCurrent = item.id === currentTrack.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => useSpotifyAudioStore.getState().playTrack(item, queue)}
                    className={`p-2.5 rounded-xl flex items-center justify-between gap-3 text-left cursor-pointer transition-colors ${
                      isItemCurrent
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-bold w-5 text-zinc-500">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{item.titulo}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{item.leiNome}</p>
                      </div>
                    </div>
                    {isItemCurrent && (
                      <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                        Tocando
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Visual Oficial da Capa */
            <div className="w-full flex flex-col items-center">
              <div className="relative w-48 h-48 sm:w-60 sm:h-60 max-h-[28vh] aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-900 mb-3 sm:mb-5 group shrink-0">
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.leiNome}
                  className="w-full h-full object-cover select-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-zinc-200 border border-white/10">
                  {currentTrack.numeroFormatado || currentTrack.artigoNumero}
                </span>
              </div>

              {/* Título e Ações de Favorito/Playlist */}
              <div className="w-full flex items-center justify-between gap-4 px-2">
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-white truncate leading-tight">
                    {currentTrack.titulo}
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 truncate mt-1">
                    {currentTrack.leiNome} &bull; {currentTrack.subtitulo}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Botão Favoritar */}
                  <button
                    type="button"
                    onClick={() => toggleFavorito(currentTrack)}
                    aria-label="Favoritar"
                    className="p-2.5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <Heart
                      className={`w-6 h-6 transition-transform active:scale-125 ${
                        isFav ? 'text-rose-500 fill-rose-500' : 'text-zinc-400'
                      }`}
                    />
                  </button>

                  {/* Botão Adicionar à Playlist */}
                  <button
                    type="button"
                    onClick={() => setPlaylistModalOpen(true)}
                    aria-label="Adicionar à Playlist"
                    className="p-2.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Caput do Artigo / Texto */}
              {currentTrack.texto && (
                <div className="w-full mt-2 sm:mt-3 px-2 max-h-16 sm:max-h-20 overflow-y-auto rounded-xl bg-white/5 p-2 sm:p-2.5 border border-white/5 text-left">
                  <p className="text-[11px] leading-relaxed text-zinc-300 line-clamp-3">
                    {currentTrack.texto}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controles de Reprodução */}
        <div className="w-full max-w-md mx-auto space-y-3 sm:space-y-4 shrink-0 pb-1">
          {/* Barra de Progresso Interativa */}
          <div className="space-y-1.5 px-2">
            <div className="relative group flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-700/80 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:h-2 transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
              <span>{formatSeconds(currentTime)}</span>
              <span>{duration > 0 ? `-${formatSeconds(Math.max(0, duration - currentTime))}` : '00:00'}</span>
            </div>
          </div>

          {/* Botões Principais Estilo Spotify */}
          <div className="flex items-center justify-between px-2">
            {/* Aleatório */}
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Ordem aleatória"
              className={`p-2 transition-colors ${
                isShuffle ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Voltar 15 segundos */}
            <button
              type="button"
              onClick={() => seekRelative(-15)}
              aria-label="Voltar 15 segundos"
              className="p-2 text-zinc-300 hover:text-white transition-colors"
              title="Voltar 15s"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Anterior */}
            <button
              type="button"
              onClick={prevTrack}
              aria-label="Artigo anterior"
              className="p-2 text-zinc-200 hover:text-white transition-colors"
            >
              <SkipBack className="w-6 h-6 fill-current" />
            </button>

            {/* Play / Pause Principal */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transition-transform active:scale-90 hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-black" />
              ) : (
                <Play className="w-7 h-7 fill-black ml-1" />
              )}
            </button>

            {/* Próximo */}
            <button
              type="button"
              onClick={nextTrack}
              aria-label="Próximo artigo"
              className="p-2 text-zinc-200 hover:text-white transition-colors"
            >
              <SkipForward className="w-6 h-6 fill-current" />
            </button>

            {/* Avançar 15 segundos */}
            <button
              type="button"
              onClick={() => seekRelative(15)}
              aria-label="Avançar 15 segundos"
              className="p-2 text-zinc-300 hover:text-white transition-colors"
              title="Avançar 15s"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Repetir / Loop */}
            <button
              type="button"
              onClick={toggleRepeat}
              aria-label="Repetição"
              className={`p-2 transition-colors relative ${
                repeatMode !== 'off' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && (
                <span className="absolute top-1 right-1 text-[8px] font-bold">1</span>
              )}
            </button>
          </div>

          {/* Barra Inferior com Download Offline e Velocidade */}
          <div className="flex items-center justify-between pt-2 px-2 border-t border-white/10">
            {/* Seletor de Velocidade */}
            <button
              type="button"
              onClick={handleNextRate}
              className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-emerald-400 transition-colors"
            >
              {playbackRate}x
            </button>

            {/* Indicador de Fila */}
            <span className="text-[11px] text-zinc-500 font-medium">
              {queueIndex + 1} de {queue.length} faixas
            </span>

            {/* Download Offline */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              aria-label="Baixar offline"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                isDown
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
              }`}
            >
              {isDown ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Salvo
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  {isDownloading ? 'Baixando...' : 'Baixar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Adicionar à Playlist */}
      <Dialog open={playlistModalOpen} onOpenChange={setPlaylistModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-emerald-400" />
              Salvar em uma Playlist
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Criar nova */}
            <form onSubmit={handleCreateAndAdd} className="space-y-2">
              <Input
                placeholder="Nome da nova playlist..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white text-xs h-9 rounded-xl"
              />
              <Button
                type="submit"
                size="sm"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl"
              >
                + Criar e Adicionar
              </Button>
            </form>

            {/* Playlists Existentes */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Suas Playlists
              </span>
              {playlists.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2">Nenhuma playlist criada ainda.</p>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => handleAddToPlaylist(pl.id)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900/60 hover:bg-white/10 border border-white/5 text-left flex items-center justify-between text-xs font-semibold text-zinc-200 transition-colors"
                  >
                    <span className="truncate">{pl.nome}</span>
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {pl.tracks.length} faixas
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(playerNode, document.body);
};

