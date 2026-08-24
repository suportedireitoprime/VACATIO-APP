import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { Habilidade } from "@/lib/tematicaHabilidades";

interface Props {
  habilidade: Habilidade;
  total: number;
  onLimpar: () => void;
}

export default function HabilidadeHero({ habilidade, total, onLimpar }: Props) {
  const Icon = habilidade.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className="mt-4 mx-4 relative overflow-hidden rounded-3xl border border-white/10"
      style={{ background: habilidade.heroGradient }}
    >
      {/* padrão decorativo */}
      <div className="absolute -right-6 -bottom-6 opacity-10">
        <Icon className="w-40 h-40 text-white" strokeWidth={1.2} />
      </div>
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
              <Icon className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/70 font-bold">Habilidade</p>
              <h2 className="font-display text-xl sm:text-2xl font-black text-white leading-tight">
                {habilidade.label}
              </h2>
            </div>
          </div>
          <button
            onClick={onLimpar}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white shrink-0"
            aria-label="Limpar filtro"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[13px] text-white/85 leading-relaxed mt-3 max-w-xl">
          {habilidade.descricao}
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 text-white text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
          {total} {total === 1 ? "obra selecionada" : "obras selecionadas"}
        </div>
      </div>
    </motion.div>
  );
}
