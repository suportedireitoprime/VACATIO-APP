import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Download, Upload, ScanText, ListTree, Sparkles, Wand2 } from 'lucide-react';

interface Props {
  etapa: string | null;
  progresso: number;
  total: number;
  totalPaginas: number | null;
  titulo: string;
}

const STEPS = [
  { key: 1, label: 'Baixando o PDF', icon: Download },
  { key: 2, label: 'Enviando ao Mistral OCR', icon: Upload },
  { key: 3, label: 'Extraindo texto e imagens', icon: ScanText },
  { key: 4, label: 'Organizando páginas e sumário', icon: ListTree },
  { key: 5, label: 'Refinando com IA (limpeza + destaques)', icon: Wand2 },
  { key: 6, label: 'Finalizando', icon: Sparkles },
];

// Sub-passos do "Finalizando" — detectados pelo texto de etapa.
const FINAL_SUBSTEPS: Array<{ label: string; matches: RegExp }> = [
  { label: 'Costurando trechos', matches: /costurando|marcadores/i },
  { label: 'Montando capítulos', matches: /montando cap[ií]tulo/i },
  { label: 'Salvando no banco', matches: /salvando/i },
  { label: 'Publicando leitura', matches: /publicando|conclu[ií]do/i },
];

const OcrProgressOverlay = ({ etapa, progresso, total, totalPaginas, titulo }: Props) => {
  // Progresso fracionário: usa (etapa atual - 1) + subprogresso extraído de "X de N".
  const match = etapa?.match(/(\d+)\s+de\s+(\d+)/i);
  const sub = match ? Math.min(1, Number(match[1]) / Math.max(1, Number(match[2]))) : 0;
  const stepBase = Math.max(0, Math.min(total, progresso) - 1);
  const fractional = Math.min(total, stepBase + sub);
  const pct = total > 0 ? Math.min(100, Math.round((fractional / total) * 100)) : 0;

  // ETA quando a etapa carrega "~Xs restantes"
  const etaMatch = etapa?.match(/~([\dminsrestante ]+restantes)/i);
  const etaTxt = etaMatch ? etaMatch[1] : null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 overflow-hidden bg-[#0f0b08] text-[#f2ead7] z-20">
      {/* Fundo decorativo animado */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 35%, rgba(217,164,72,0.28) 0%, rgba(217,164,72,0.08) 45%, transparent 75%)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(45% 30% at 30% 70%, rgba(180,60,80,0.22) 0%, transparent 70%)',
        }}
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 max-w-md w-full">
        <div className="text-center mb-6">
          <motion.div
            className="w-20 h-20 rounded-full bg-[#d9a448]/15 border border-[#d9a448]/40 mx-auto flex items-center justify-center mb-4 shadow-[0_0_40px_-8px_rgba(217,164,72,0.6)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-8 h-8 text-[#f0c674]" />
          </motion.div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#d9a448] mb-1">
            Leitura nativa · Mistral OCR
          </p>
          <p className="text-lg font-semibold line-clamp-2">{titulo}</p>
          <div className="flex items-center justify-center gap-2 mt-1.5 text-xs opacity-70">
            {totalPaginas ? <span>{totalPaginas} páginas</span> : null}
            {etaTxt ? (
              <>
                {totalPaginas ? <span>·</span> : null}
                <span className="text-[#f0c674]">{etaTxt}</span>
              </>
            ) : null}
            <span>·</span>
            <span>{pct}%</span>
          </div>
        </div>

        {/* Barra de progresso principal (fracionária) */}
        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-6 border border-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-[#d9a448] to-[#f0c674]"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 22 }}
          />
        </div>

        {/* Lista de etapas */}
        <ul className="space-y-2.5">
          {STEPS.map((step) => {
            const done = progresso > step.key;
            const active = progresso === step.key;
            const Icon = step.icon;
            const isFinal = step.key === 6 && active;
            return (
              <motion.li
                key={step.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.key * 0.05 }}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                  active
                    ? 'bg-[#d9a448]/15 border-[#d9a448]/50'
                    : done
                    ? 'bg-white/5 border-white/10 opacity-70'
                    : 'bg-transparent border-white/10 opacity-45'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    active
                      ? 'bg-[#d9a448] text-[#1a1207]'
                      : done
                      ? 'bg-emerald-500/80 text-white'
                      : 'bg-white/10'
                  }`}
                >
                  {done ? (
                    <Check className="w-4 h-4" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.label}</p>
                  <AnimatePresence mode="wait">
                    {active && etapa && (
                      <motion.div
                        key={etapa}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        <p className="text-[11px] opacity-70 truncate">{etapa}</p>
                        {match ? (
                          <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#d9a448] to-[#f0c674]"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.round(sub * 100)}%` }}
                              transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                            />
                          </div>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Checklist interno de "Finalizando" */}
                  {isFinal && (
                    <ul className="mt-2 space-y-1">
                      {FINAL_SUBSTEPS.map((s) => {
                        const isMatch = etapa ? s.matches.test(etapa) : false;
                        const isPast =
                          etapa && FINAL_SUBSTEPS.findIndex((x) => x.matches.test(etapa)) >
                            FINAL_SUBSTEPS.indexOf(s);
                        return (
                          <li key={s.label} className="flex items-center gap-2 text-[11px]">
                            <span
                              className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] ${
                                isPast
                                  ? 'bg-emerald-500/80 text-white'
                                  : isMatch
                                  ? 'bg-[#d9a448] text-[#1a1207]'
                                  : 'bg-white/10'
                              }`}
                            >
                              {isPast ? '✓' : isMatch ? '●' : ''}
                            </span>
                            <span className={isMatch ? 'text-[#f0c674]' : 'opacity-60'}>{s.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ul>

        <p className="text-[11px] opacity-50 text-center mt-6">
          Só na primeira vez. Depois, o livro carrega instantâneo.
        </p>
      </div>
    </div>
  );
};

export default OcrProgressOverlay;
