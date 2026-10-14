import React from 'react';
import { ListMusic, Play, Headphones, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from './CapaOtimizada';
import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';

interface AudioaulasPlaylistsViewProps {
  aulas: AulaAudio[];
  areas: [string, number][];
  onSelectArea: (area: string) => void;
  onPlayArea: (area: string) => void;
}

export const AudioaulasPlaylistsView: React.FC<AudioaulasPlaylistsViewProps> = ({
  aulas,
  areas,
  onSelectArea,
  onPlayArea,
}) => {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 space-y-6 mt-4 lg:px-10 2xl:max-w-[1600px]">
      <div className="mb-4">
        <h2 className="text-[22px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-primary" />
          Playlists de Estudo
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-zinc-400 line-clamp-1">
          Coleções temáticas e trilhas sonoras completas organizadas para seus estudos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map(([nomeArea, totalAulas]) => {
          const capa = capaDaArea(nomeArea);
          const aulasDaArea = aulas.filter((a) => (a.area || 'Geral') === nomeArea);
          const temasUnicos = new Set(aulasDaArea.map((a) => a.tema).filter(Boolean)).size;

          return (
            <motion.div
              key={nomeArea}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectArea(nomeArea)}
              className="group relative flex items-center gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer shadow-lg overflow-hidden"
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden shadow-md border border-white/10 bg-zinc-900">
                <CapaOtimizada src={capa} alt={nomeArea} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayArea(nomeArea);
                  }}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  aria-label={`Tocar ${nomeArea}`}
                >
                  <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </span>
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-primary text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Trilha Completa
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5 group-hover:text-primary transition-colors">
                  {nomeArea}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                  {temasUnicos > 0 ? `${temasUnicos} tema(s) • ` : ''}{totalAulas} aula(s)
                </p>
              </div>

              <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AudioaulasPlaylistsView;
