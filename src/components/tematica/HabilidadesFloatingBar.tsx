import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, ChevronUp, X, Sparkles } from "lucide-react";
import { HABILIDADES, HABILIDADES_MAP, type HabilidadeId } from "@/lib/tematicaHabilidades";
import { cn } from "@/lib/utils";

interface Props {
  ativa: HabilidadeId | null;
  onChange: (id: HabilidadeId | null) => void;
  /** Contagem por habilidade */
  contagens?: Partial<Record<HabilidadeId, number>>;
}

export default function HabilidadesFloatingBar({ ativa, onChange, contagens = {} }: Props) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  const habilidadeAtiva = ativa ? HABILIDADES_MAP[ativa] : null;
  const Icon = habilidadeAtiva?.icon ?? SlidersHorizontal;

  const sheet = (
    <AnimatePresence>
      {aberto && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md"
            onClick={() => setAberto(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[301] rounded-t-3xl bg-gradient-to-b from-[#1a0a0f] to-[#0e0608] border-t border-red-500/25 shadow-[0_-20px_60px_-20px_rgba(220,38,38,0.5)]"
          >
            <div className="mx-auto max-w-3xl px-5 pt-3 pb-[calc(var(--sai-bottom,env(safe-area-inset-bottom,0px))+20px)]">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-red-400/80 font-bold">Filtrar por habilidade</p>
                  <h3 className="font-display font-bold text-lg text-white mt-0.5">O que você quer praticar hoje?</h3>
                </div>
                <button
                  onClick={() => setAberto(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  onChange(null);
                  setAberto(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 h-12 rounded-2xl border text-sm font-semibold transition-all mb-3",
                  !ativa
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
                )}
              >
                <Sparkles className="w-4 h-4" strokeWidth={2} />
                Todas as habilidades
                {!ativa && <span className="ml-auto text-[10px] uppercase tracking-widest text-white/60">Ativo</span>}
              </button>

              <div className="grid grid-cols-2 gap-2">
                {HABILIDADES.map((h) => {
                  const isActive = ativa === h.id;
                  const HIcon = h.icon;
                  const count = contagens[h.id] ?? 0;
                  return (
                    <button
                      key={h.id}
                      onClick={() => {
                        onChange(h.id);
                        setAberto(false);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 px-3 h-14 rounded-2xl border text-left transition-all",
                        isActive ? h.chipActive : h.chipBg,
                        "hover:brightness-110 active:scale-[0.98]",
                      )}
                    >
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          isActive ? "bg-black/25" : "bg-white/10",
                        )}
                      >
                        <HIcon className="w-4 h-4" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold leading-tight truncate">{h.label}</p>
                        {count > 0 && (
                          <p className="text-[10px] opacity-70 mt-0.5">{count} {count === 1 ? "obra" : "obras"}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Pílula flutuante */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[150] pointer-events-none"
        style={{
          bottom: "calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 88px)",
        }}
      >
        <motion.button
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 22 }}
          onClick={() => setAberto(true)}
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 h-12 pl-2 pr-4 rounded-full",
            "backdrop-blur-2xl border shadow-[0_12px_40px_-12px_rgba(220,38,38,0.7)]",
            ativa
              ? `${habilidadeAtiva?.chipActive} border-transparent`
              : "bg-red-950/80 border-red-500/40 text-red-50",
          )}
        >
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              ativa ? "bg-black/25" : "bg-red-500/25",
            )}
          >
            <Icon className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <span className="text-xs font-bold whitespace-nowrap max-w-[160px] truncate">
            {ativa ? habilidadeAtiva!.label : "Filtrar habilidades"}
          </span>
          <ChevronUp className="w-3.5 h-3.5 opacity-70" strokeWidth={2.5} />
        </motion.button>
      </div>

      {typeof document !== "undefined" && createPortal(sheet, document.body)}
    </>
  );
}
