import React from 'react';
import { Flame, Clock, Headphones as HeadphonesIcon, Heart, Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { type AulaAudio, audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import { type AudioaulasFiltroMenu } from '@/components/audioaulas/AudioaulasCategoriasNav';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from './CapaOtimizada';
import { LinhaAula } from './AudioaulasListaAulas';

interface AudioaulasListaFiltradaViewProps {
  filtroHome: AudioaulasFiltroMenu;
  lista: AulaAudio[];
  atualId: string | number | null;
  tocando: boolean;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  handleTocarAula: (a: AulaAudio) => void;
}

export const AudioaulasListaFiltradaView: React.FC<AudioaulasListaFiltradaViewProps> = ({
  filtroHome,
  lista,
  atualId,
  tocando,
  favoritos,
  alternarFavorito,
  handleTocarAula,
}) => {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 space-y-4 mt-2 lg:px-10 2xl:max-w-[1600px]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-card text-lg sm:text-xl font-extrabold text-white flex items-center gap-2.5 tracking-normal">
            <span className="w-1.5 h-6 rounded-full bg-blue-500 shrink-0" />
            {filtroHome === 'em_alta' && <Flame className="w-5 h-5 text-amber-500" />}
            {filtroHome === 'recentes' && <Clock className="w-5 h-5 text-blue-400" />}
            {filtroHome === 'mais_ouvidas' && <HeadphonesIcon className="w-5 h-5 text-purple-400" />}
            {filtroHome === 'favoritas' && <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />}
            <span>
              {filtroHome === 'em_alta'
                ? 'Aulas Em Alta'
                : filtroHome === 'recentes'
                ? 'Aulas Recentes'
                : filtroHome === 'mais_ouvidas'
                ? 'Mais Ouvidas'
                : 'Aulas Favoritas'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            {filtroHome === 'em_alta'
              ? 'Temas mais populares e relevantes para concursos e OAB.'
              : filtroHome === 'recentes'
              ? 'Histórico das últimas aulas acessadas na plataforma.'
              : filtroHome === 'mais_ouvidas'
              ? 'Aulas mais reproduzidas e fundamentais do acervo.'
              : `${lista.length} aulas salvas no seu acervo pessoal.`}
          </p>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          {filtroHome === 'favoritas'
            ? 'Nenhuma aula favoritada ainda. Toque no coração de uma aula para salvá-la aqui.'
            : 'Nenhuma aula disponível neste filtro.'}
        </div>
      ) : filtroHome === 'favoritas' || filtroHome === 'recentes' ? (
        /* Cards em formato estrito 1:1 (aspect-square) para Favoritos e Recentes */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {lista.map((aula) => {
            const isThisPlaying = atualId === aula.id && tocando;
            const isSelected = atualId === aula.id;
            const isFav = favoritos.has(audioIdOf(aula));
            const capa = capaDaArea(aula.area || '');

            return (
              <motion.div
                key={aula.id}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleTocarAula(aula)}
                className={`group relative aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer shadow-lg select-none ${
                  isSelected
                    ? 'border-blue-500 shadow-blue-900/40 ring-2 ring-blue-500/40'
                    : 'border-white/10 hover:border-white/25 hover:shadow-xl'
                }`}
              >
                <CapaOtimizada
                  src={capa}
                  alt={aula.titulo}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/15 pointer-events-none" />

                {/* Botão Play Flutuante */}
                <div
                  className={`absolute top-2.5 right-2.5 z-10 transition-all duration-200 ${
                    isThisPlaying
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                  }`}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl">
                    {isThisPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Badge reproduzindo ou botão favoritar */}
                {isThisPlaying ? (
                  <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-md animate-pulse">
                    Ouvindo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      alternarFavorito(aula);
                    }}
                    className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:text-rose-400 transition-transform active:scale-90 cursor-pointer"
                    title="Favoritar"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isFav ? 'fill-rose-500 text-rose-500' : 'text-white/80'
                      }`}
                    />
                  </button>
                )}

                {/* Informações da Aula no rodapé com sombra */}
                <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex flex-col justify-end min-w-0">
                  <p
                    className={`text-[12px] sm:text-[13px] font-bold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-colors truncate ${
                      isSelected ? 'text-sky-300' : 'text-white group-hover:text-sky-200'
                    }`}
                  >
                    {aula.titulo}
                  </p>
                  <p
                    title={aula.tema || aula.area}
                    className="text-[10px] sm:text-[11px] text-zinc-300 font-medium leading-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] mt-0.5"
                  >
                    {aula.tema || aula.area}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-2 divide-y divide-white/[0.06] lg:grid lg:grid-cols-2 lg:divide-y-0 lg:gap-2 2xl:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.04 } },
          }}
        >
          {lista.map((a, i) => (
            <LinhaAula
              key={a.id}
              a={a}
              indice={i + 1}
              atualId={atualId}
              tocando={tocando}
              favoritos={favoritos}
              alternarFavorito={alternarFavorito}
              handleTocarAula={handleTocarAula}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
};
