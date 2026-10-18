import React from 'react';
import { Headphones, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from './CapaOtimizada';
import { motion } from 'framer-motion';

interface AudioaulasGridAreasProps {
  areas: [string, number][];
}

export const AudioaulasGridAreas = React.memo(function AudioaulasGridAreas({ areas }: AudioaulasGridAreasProps) {
  const navigate = useNavigate();

  if (areas.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 space-y-8 mt-4 lg:px-10 2xl:max-w-[1600px]">
        <div className="rounded-2xl bg-white/[0.04] p-10 text-center border border-white/10">
          <Headphones className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma audioaula publicada ainda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 space-y-8 mt-4 lg:px-10 2xl:max-w-[1600px]">
      <section>
        <div className="mb-6">
          <h2 className="text-[22px] font-black text-white uppercase tracking-widest">Áreas do Direito</h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400 line-clamp-1">
            Aulas completas em áudio organizadas por área temática do Direito.
          </p>
        </div>
        <motion.div 
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
        >
          {areas.map(([nome, total], i) => {
            const nomeFormatado = nome.replace(/^Direitos?\s+(do\s+)?/i, '').trim();
            return (
            <motion.button
              key={nome}
              variants={{
                hidden: { opacity: 0, scale: 0.95, y: 0 },
                show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
              }}
              whileHover={{ scale: 1.03, y: -5 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                y: [0, -8, 0],
                transition: {
                  duration: 4 + (i % 3), // Variar a duração para não ficarem sincronizados
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2
                }
              }}
              onClick={() => navigate(`/audioaulas/${encodeURIComponent(nome)}`)}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden text-left transition-all duration-300 hover:shadow-2xl hover:shadow-black/60 border border-white/10 hover:border-white/20 focus-visible:outline-none bg-zinc-900"
            >
              <CapaOtimizada
                src={capaDaArea(nome)}
                alt={nome}
                animacaoEntrada
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-105 object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
              <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between">
                {/* Ícone de fone elegante em vidro fosco neutro (sem badge vermelho) */}
                <span className="self-start h-7 w-7 sm:h-8 sm:w-8 grid place-items-center rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-white/90 shadow-md">
                  <Headphones className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>

                {/* Informações da área organizadas com tipografia proporcional para não extrapolar a capa */}
                <div className="w-full space-y-1">
                  <p className="font-card font-bold leading-tight text-white text-xs sm:text-sm md:text-base line-clamp-2 tracking-normal drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                    {nomeFormatado}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-card text-[11px] sm:text-xs text-white/90 font-semibold drop-shadow-sm">
                      {total > 0 ? `${total} ${total === 1 ? 'aula' : 'aulas'}` : 'Em breve'}
                    </span>
                    <span className="shrink-0 h-6 w-6 sm:h-7 sm:w-7 grid place-items-center rounded-full bg-white/15 text-white/90 backdrop-blur group-hover:bg-white/30 transition shadow-sm">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
            );
          })}
        </motion.div>
      </section>
    </div>
  );
});
