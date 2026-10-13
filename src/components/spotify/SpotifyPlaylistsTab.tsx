import React, { useState } from 'react';
import { Plus, ListMusic, Play, Trash2, ChevronLeft, Music2, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { useSpotifyAudioStore, type SpotifyPlaylist, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const SpotifyPlaylistsTab: React.FC = () => {
  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
    playPlaylist,
    playTrack,
    currentTrack,
    isPlaying,
  } = useSpotifyAudioStore();

  const [activePlaylist, setActivePlaylist] = useState<SpotifyPlaylist | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const pl = createPlaylist(newTitle.trim(), newDesc.trim());
    setNewTitle('');
    setNewDesc('');
    setModalOpen(false);
    toast.success(`Playlist "${pl.nome}" criada com sucesso!`);
    setActivePlaylist(pl);
  };

  const handleDelete = (id: string, nome: string) => {
    if (confirm(`Excluir a playlist "${nome}"?`)) {
      deletePlaylist(id);
      setActivePlaylist(null);
      toast.info('Playlist excluída.');
    }
  };

  // Se uma playlist estiver aberta para visualização detalhada
  if (activePlaylist) {
    const currentPl = playlists.find((p) => p.id === activePlaylist.id) || activePlaylist;

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setActivePlaylist(null)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para todas as Playlists
        </button>

        {/* Header da Playlist */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-black border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block">
                PLAYLIST PERSONALIZADA
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {currentPl.nome}
              </h2>
              {currentPl.descricao && (
                <p className="text-xs text-zinc-300 max-w-lg">
                  {currentPl.descricao}
                </p>
              )}
              <p className="text-[11px] text-zinc-500 pt-1">
                {currentPl.tracks.length} faixas salvas
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleDelete(currentPl.id, currentPl.nome)}
              className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
              title="Excluir playlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {currentPl.tracks.length > 0 && (
            <button
              type="button"
              onClick={() => playPlaylist(currentPl.id)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-black" />
              REPRODUZIR PLAYLIST
            </button>
          )}
        </div>

        {/* Lista de Faixas da Playlist */}
        <div className="space-y-1.5">
          {currentPl.tracks.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-zinc-900/40 rounded-3xl border border-white/5 p-6">
              <Headphones className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-bold text-zinc-300">Playlist vazia</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Explore as leis ou pesquise artigos e toque no ícone + para adicionar faixas aqui.
              </p>
            </div>
          ) : (
            currentPl.tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => playPlaylist(currentPl.id, track.id)}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors border ${
                    isCurrent
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-zinc-900/40 hover:bg-zinc-800/60 border-white/5 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-zinc-500 w-5 text-center">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">
                        {track.titulo}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {track.subtitulo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrackFromPlaylist(currentPl.id, track.id);
                        toast.info('Faixa removida da playlist.');
                      }}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Remover da playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão de Criar Nova Playlist */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-white">Minhas Playlists</h2>
          <p className="text-xs text-zinc-400">Monte suas seleções personalizadas para estudar</p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nova Playlist
        </button>
      </div>

      {/* Grid de Playlists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => setActivePlaylist(pl)}
            className="p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 hover:border-white/15 flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Music2 className="w-6 h-6" />
              </div>

              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  {pl.nome}
                </h3>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {pl.tracks.length} faixas &bull; Personalizada
                </p>
              </div>
            </div>

            <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-emerald-500 flex items-center justify-center text-zinc-300 shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar Nova Playlist */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-emerald-400" />
              Criar Nova Playlist
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                Nome da Playlist
              </label>
              <Input
                autoFocus
                placeholder="Ex: Revisão Prova Penal, Artigos OAB..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white text-xs h-10 rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                Descrição (opcional)
              </label>
              <Input
                placeholder="Ex: Artigos para escutar antes de dormir"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white text-xs h-10 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs h-10 rounded-xl mt-2"
            >
              Criar Playlist
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
