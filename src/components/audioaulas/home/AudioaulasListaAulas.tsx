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
  atualId: string | null;
  tocando: boolean;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  handleTocarAula: (a: AulaAudio) => void;
}

const LinhaAula = React.memo(function LinhaAula({
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
  atualId: string | null;
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
              <span className="h-2 w-2 rounded-full bg-primary" />
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
      <h2 className="text-lg font-bold text-white">
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
