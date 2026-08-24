import { motion } from "framer-motion";
import { Flame, Star, Film } from "lucide-react";
import type { Obra } from "@/components/tematica/ObraDetailSheet";
import { cn } from "@/lib/utils";

interface Props {
  obras: Obra[];
  onAbrir: (obra: Obra) => void;
}

/**
 * Faixa horizontal "🔥 EM ALTA" com posters compactos e badge de posição.
 * Renderizada no topo da página para dar destaque ao ranking dos últimos 7 dias.
 */
export default function EmAltaFaixa({ obras, onAbrir }: Props) {
  if (!obras.length) return null;
  const lista = obras.slice(0, 12);

  return (
    <section className="mt-4 mb-2">
      <div className="px-4 flex items-center gap-2 mb-3">
        <div className="relative flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
          <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/60">
            <Flame className="w-3.5 h-3.5 text-white fill-white/90" strokeWidth={2} />
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-red-400 font-bold leading-none">Em alta agora</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">O que está bombando nos últimos 7 dias</p>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-3 px-4 pb-2">
          {lista.map((obra, i) => (
            <motion.button
              key={obra.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              onClick={() => onAbrir(obra)}
              className="group relative shrink-0 w-[110px] text-left"
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted border border-red-500/10 shadow-lg shadow-black/40 group-hover:border-red-500/40 transition-colors">
                {obra.poster_url ? (
                  <img
                    src={obra.poster_url}
                    alt={obra.titulo}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, hsl(0 55% 22%), hsl(355 65% 14%))" }}
                  >
                    <Film className="w-6 h-6 text-red-200/50" strokeWidth={1.5} />
                  </div>
                )}
                {/* Overlay + posição */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                <div
                  className={cn(
                    "absolute top-1.5 left-1.5 min-w-[22px] h-6 px-1.5 rounded-md flex items-center justify-center",
                    "bg-black/80 backdrop-blur border border-red-500/50",
                    "text-red-400 font-black text-xs tabular-nums",
                  )}
                >
                  {i + 1}
                </div>
                {obra.nota ? (
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-amber-300 text-[10px] font-bold">
                    <Star className="w-2.5 h-2.5 fill-amber-400" strokeWidth={0} />
                    {obra.nota.toFixed(1)}
                  </div>
                ) : null}
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-foreground leading-tight line-clamp-2">
                {obra.titulo}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
