import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import { BotaoDownloadAudio } from './BotaoDownloadAudio';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { type AulaAudio, audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import { CapaOtimizada } from './CapaOtimizada';
import { motion } from 'framer-motion';

interface LinhaAulaProps {
  a: AulaAudio;
  indice?: number;
  atualId: string | number | null;
  tocando: boolean;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  handleTocarAula: (a: AulaAudio) => void;
}

export const LinhaAula = React.memo(function LinhaAula({
  a,
  indice,
  atualId,
  tocando,
  favoritos,
  alternarFavorito,
  handleTocarAula
}: LinhaAulaProps) {
  const ativo = a.id === atualId;
  const fav = favoritos.has(audioIdOf(a));

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
      }}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition ${
        ativo ? 'bg-primary/15 border border-primary/20 shadow-sm' : 'hover:bg-white/5'
      }`}
    >
      <motion.button
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => void handleTocarAula(a)}
        disabled={!a.url_audio}
        className="flex items-center gap-3 min-w-0 flex-1 text-left disabled:opacity-50 group focus-visible:outline-none"
      >
        <span className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-zinc-800 shadow-md">
          <CapaOtimizada
            src={capaDaArea(a.area || '')}
            alt=""
            className="transition-transform group-hover:scale-105"
          />
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-white transition-opacity">
            {ativo && tocando ? (
              <Pause className="h-5 w-5 text-primary fill-primary" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </span>
        </span>
        <div className="min-w-0 flex-1 py-1">
          <p className={`text-sm font-semibold break-words text-left ${ativo ? 'text-primary' : 'text-foreground'}`}>
            {typeof indice === 'number' ? `${indice}. ` : ''}
            {a.titulo}
          </p>
          <p className="text-xs text-muted-foreground break-words mt-0.5 text-left">
            {a.url_audio ? a.tema || a.area : 'Áudio em breve'}
          </p>
        </div>
      </motion.button>

      <BotaoDownloadAudio aula={a} />

      <button
        onClick={() => alternarFavorito(a)}
        aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'}
        className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10 shrink-0 transition active:opacity-70"
      >
        <Heart className={`h-4 w-4 ${fav ? 'fill-rose-400 text-rose-400' : 'text-muted-foreground'}`} />
      </button>
    </motion.div>
  );
});

interface AudioaulasListaAulasProps {
  areaAtual: string | null;
  aba: string;
  temasDaArea: [string, AulaAudio[]][];
  listaAba: AulaAudio[];
  busca: string;
  atualId: string | number | null;
  tocando: boolean;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  handleTocarAula: (a: AulaAudio) => void;
}

export const AudioaulasListaAulas = React.memo(function AudioaulasListaAulas({
  areaAtual,
  aba,
  temasDaArea,
  listaAba,
  busca,
  atualId,
  tocando,
  favoritos,
  alternarFavorito,
  handleTocarAula
}: AudioaulasListaAulasProps) {

  // Se estiver visualizando a área específica
  if (areaAtual) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 space-y-6 mt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0 lg:px-10 2xl:max-w-[1600px] 2xl:grid-cols-3">
        {temasDaArea.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground col-span-full">
            Aulas em breve nesta área.
          </p>
        )}
        {temasDaArea.map(([tema, lista]) => (
          <section key={tema} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-3 sm:p-4">
            <h2 className="text-base sm:text-lg font-bold text-white mb-3 px-1 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-primary shrink-0" />
              {tema}
            </h2>
            <motion.div 
              className="divide-y divide-white/[0.06]"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
              }}
              initial="hidden"
              animate="show"
            >
              {lista.map((a, i) => (
                <LinhaAula
                  key={a.id}
                  a={a}
                  indice={a.sequencia ?? i + 1}
                  atualId={atualId}
                  tocando={tocando}
                  favoritos={favoritos}
                  alternarFavorito={alternarFavorito}
                  handleTocarAula={handleTocarAula}
                />
              ))}
            </motion.div>
          </section>
        ))}
      </div>
    );
  }

  // Se for abas extras (favoritas, baixadas, buscar)
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 space-y-4 mt-4 lg:px-10 2xl:max-w-[1600px]">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <span className="w-1.5 h-4 rounded-full bg-primary shrink-0" />
        {aba === 'favoritas' ? 'Favoritas' : aba === 'baixadas' ? 'Baixadas' : 'Resultados da Busca'}
      </h2>

      {listaAba.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          {aba === 'favoritas'
            ? 'Nenhuma favorita ainda. Toque no coração de uma aula para adicionar.'
            : aba === 'baixadas'
              ? 'Nenhuma aula baixada. Toque no ícone de download para ouvir offline.'
              : busca.trim()
                ? 'Nada encontrado para sua busca.'
                : 'Digite o nome de uma aula, tema ou área.'}
        </p>
      ) : aba === 'favoritas' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {listaAba.map((aula) => {
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
                    ? 'border-rose-500 shadow-rose-900/40 ring-2 ring-rose-500/40'
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
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl">
                    {isThisPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Botão Desfavoritar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    alternarFavorito(aula);
                  }}
                  className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-rose-400 hover:text-white transition-transform active:scale-90"
                  title="Remover dos favoritos"
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white/80'}`} />
                </button>

                {/* Informações da Aula dentro da Capa no rodapé com sombra */}
                <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex flex-col justify-end min-w-0">
                  <p
                    className={`text-[12px] sm:text-[13px] font-bold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-colors truncate ${
                      isSelected ? 'text-rose-300' : 'text-white group-hover:text-rose-200'
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
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
          }}
          initial="hidden"
          animate="show"
        >
          {listaAba.map((a) => (
            <LinhaAula
              key={a.id}
              a={a}
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
});
