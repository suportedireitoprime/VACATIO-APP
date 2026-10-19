import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Heart,
  Download,
  Check,
  Search,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { type CapituloDef } from '@/lib/leiCapitulosHelper';
import { haptic } from '@/lib/nativeHaptics';

interface SpotifyCapituloDetalheViewProps {
  capitulo: CapituloDef;
  leiNome: string;
  coverUrl: string;
  themeGradient: string;
  loading: boolean;
  chapterTracks: SpotifyTrack[];
  onVoltar: () => void;
  onPlayCapitulo: (cap: CapituloDef) => void;
  onTrackClick: (track: SpotifyTrack, queue: SpotifyTrack[]) => void;
}

export const SpotifyCapituloDetalheView: React.FC<SpotifyCapituloDetalheViewProps> = ({
  capitulo,
  leiNome,
  coverUrl,
  themeGradient,
  loading,
  chapterTracks,
  onVoltar,
  onPlayCapitulo,
  onTrackClick,
}) => {
  const { currentTrack, isPlaying, toggleFavorito, isFavorito, downloadTrack, isDownloaded } =
    useSpotifyAudioStore();

  const [search, setSearch] = useState('');

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  haptic.light();
                  onVoltar();
                }}
                aria-label="Voltar aos Capítulos"
                className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
              </button>
              <span className="text-xs font-bold text-white/90 hidden sm:inline-block">
                Voltar aos Capítulos
              </span>
            </div>

            <span className="text-[11px] font-bold text-white/90 bg-black/40 border border-white/15 px-3 py-1.5 rounded-full backdrop-blur-md">
              {loading && chapterTracks.length === 0
                ? 'Carregando áudios...'
                : `${chapterTracks.length} ${chapterTracks.length === 1 ? 'áudio disponível' : 'áudios disponíveis'}`}
            </span>
          </div>

          {/* Informações do Capítulo Selecionado */}
          <div className="mt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {leiNome} &bull; {capitulo.rotuloFaixa}
              </span>
            </p>
            <h1 className="mt-1 font-display text-[22px] sm:text-[26px] font-black leading-tight text-white drop-shadow-md uppercase tracking-tight">
              {capitulo.titulo}
            </h1>
            {capitulo.subtitulo && (
              <p className="mt-1 text-[12px] sm:text-[13px] leading-snug text-white/80 font-body">
                {capitulo.subtitulo}
              </p>
            )}
          </div>

          {/* Botão de Ação: Ouvir Capítulo Completo */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onPlayCapitulo(capitulo)}
              className="flex-1 py-3 px-5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:bg-white/95 active:scale-[0.98] transition-all cursor-pointer"
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
              placeholder={`Buscar neste capítulo (ex: Art. ${capitulo.artigoInicio})...`}
              className="w-full rounded-2xl border border-white/15 bg-black/30 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder:text-white/50 outline-none transition focus:border-white/40 focus:bg-black/50 backdrop-blur-md"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-white/70 hover:bg-white/10 cursor-pointer"
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
            <p className="text-xs text-white/60">Narrações prontas em alta qualidade</p>
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
                  onClick={() => onTrackClick(track, chapterTracks)}
                  disabled={!hasAudio}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left disabled:opacity-50 group focus-visible:outline-none cursor-pointer"
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
                    className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/15 shrink-0 transition active:opacity-70 text-white/70 hover:text-white cursor-pointer"
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
                  className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/15 shrink-0 transition active:opacity-70 cursor-pointer"
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
};
