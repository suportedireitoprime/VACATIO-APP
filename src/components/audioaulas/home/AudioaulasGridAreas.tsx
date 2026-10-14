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
          <p className="mt-1 text-[14px] text-zinc-400">
            Mergulhe no conhecimento jurídico através de aulas completas em áudio. Estude onde e quando quiser.
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
              className="group relative aspect-square rounded-2xl overflow-hidden text-left transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/20 border border-white/10 focus-visible:outline-none"
            >
              <CapaOtimizada
                src={capaDaArea(nome)}
                alt={nome}
                animacaoEntrada
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
                <span className="self-start h-9 w-9 grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-black/40">
                  <Headphones className="h-5 w-5" />
                </span>
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0 pr-1">
                    <p className="font-bold leading-tight text-white text-sm sm:text-base line-clamp-2">
                      {nomeFormatado}
                    </p>
                    <p className="text-[11px] text-zinc-300 mt-0.5">{total} aula(s)</p>
                  </div>
                  <span className="shrink-0 h-8 w-8 grid place-items-center rounded-full bg-white/20 text-white backdrop-blur group-hover:bg-primary group-hover:text-primary-foreground transition">
                    <ChevronRight className="h-5 w-5" />
                  </span>
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
