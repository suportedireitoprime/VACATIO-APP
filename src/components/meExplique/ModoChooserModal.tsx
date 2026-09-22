import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Scale, Sparkles, X, ChevronRight, BookOpen, Volume2 } from 'lucide-react';
import { haptic } from '@/lib/nativeHaptics';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectLeis: () => void;
}

export default function ModoChooserModal({ open, onClose, onSelectCamera, onSelectLeis }: Props) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Floating Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 sm:p-6 shadow-2xl overflow-hidden"
        >
          {/* Subtle ambient light */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 blur-3xl rounded-full" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h3 className="font-display text-lg font-bold text-white tracking-tight">
                  Como quer aprender?
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Escolha o modo de explicação do professor por IA
              </p>
            </div>

            <button
              onClick={() => {
                void haptic.light();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white active:scale-95 transition-all"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Options Grid */}
          <div className="space-y-3 pt-4">
            {/* Opção 1: Câmera */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                void haptic.medium();
                onSelectCamera();
              }}
              className="w-full flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-400/40 text-left transition-all group relative overflow-hidden shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/25 to-yellow-600/15 border border-amber-500/30 text-amber-400 group-hover:scale-105 transition-transform">
                <Camera className="h-6 w-6" strokeWidth={1.75} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-[15px] font-bold text-white group-hover:text-amber-300 transition-colors">
                    Me Explique por Câmera
                  </h4>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Visual + Voz
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Aponte para o livro, caderno, slide ou apostila. A IA vê o conteúdo em tempo real e explica tudo em voz alta.
                </p>
              </div>

              <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
            </motion.button>

            {/* Opção 2: Leis e Artigos */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                void haptic.medium();
                onSelectLeis();
              }}
              className="w-full flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-primary/40 text-left transition-all group relative overflow-hidden shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-emerald-600/15 border border-primary/30 text-primary group-hover:scale-105 transition-transform">
                <Scale className="h-6 w-6" strokeWidth={1.75} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-[15px] font-bold text-white group-hover:text-primary transition-colors">
                    Me Explique de Leis
                  </h4>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    Sem Câmera
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Selecione uma lei e artigo (CF/88, Código Penal, CLT, etc.). O professor explica o artigo falado, dá exemplos e tira dúvidas.
                </p>
              </div>

              <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
            </motion.button>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-900 text-center">
            <span className="text-[11px] text-zinc-500">
              💡 Você pode alternar entre os modos a qualquer momento durante os estudos.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
