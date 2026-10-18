import React from 'react';
import { Heart, Play, Trash2, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';

export const SpotifyFavoritosTab: React.FC = () => {
  const { favoritos, playTrack, toggleFavorito, currentTrack } = useSpotifyAudioStore();

  const handlePlayAllFavoritos = () => {
    if (favoritos.length === 0) return;
    playTrack(favoritos[0], favoritos);
    toast.success('Reproduzindo seus artigos favoritos em sequência contínua!');
  };

  return (
    <div className="space-y-5">
      {/* Header de Favoritos */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900 to-black border border-purple-500/20 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block">
            SUA COLEÇÃO PESSOAL
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Artigos Favoritos
          </h2>
          <p className="text-xs text-zinc-300">
            {favoritos.length} {favoritos.length === 1 ? 'faixa salva' : 'faixas salvas'} para acesso rápido
          </p>
        </div>

        {favoritos.length > 0 && (
          <button
            type="button"
            onClick={handlePlayAllFavoritos}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-xl shadow-emerald-500/20 transition-transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-black" />
            REPRODUZIR FAVORITOS
          </button>
        )}
      </div>

      {/* Lista de Artigos Favoritados */}
      <div className="space-y-1.5">
        {favoritos.length === 0 ? (
          <div className="py-20 text-center space-y-2 bg-zinc-900/40 rounded-3xl border border-white/5 p-6">
            <Heart className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-zinc-300">Nenhum favorito ainda</p>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Ao ouvir qualquer artigo ou aula, toque no ícone de coração para salvar nesta lista especial.
            </p>
          </div>
        ) : (
          favoritos.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;

            return (
              <div
                key={track.id}
                onClick={() => playTrack(track, favoritos)}
                className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors border ${
                  isCurrent
                    ? 'bg-purple-500/15 border-purple-500/30 text-purple-200'
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
                      toggleFavorito(track);
                      toast.info('Removido dos favoritos.');
                    }}
                    className="p-1.5 text-purple-400 hover:text-zinc-400 transition-colors"
                    title="Desfavoritar"
                  >
                    <Heart className="w-4 h-4 fill-purple-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
