import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowLeft } from "lucide-react";
import danceCatAsset from "@/assets/dance-cat.svg.asset.json";
import { assetUrl } from "@/lib/assetUrl";
import { CITACOES_JURIDICAS } from "@/lib/citacoes-juridicas";
import { supabase } from "@/integrations/supabase/client";

interface GeracaoAnimacaoOverlayProps {
  open: boolean;
  titulo?: string;
  steps?: string[];
  stepIdx?: number;
  stepRanges?: Array<[number, number]>;
  estTotalSec?: number;
  onCancel?: () => void;
  cancelLabel?: string;
}

const DEFAULT_STEPS = [
  "Preparando o conteúdo",
  "Gerando com IA",
  "Salvando",
  "Pronto",
];

const DEFAULT_RANGES: Array<[number, number]> = [
  [0, 20], [20, 80], [80, 99], [100, 100],
];

interface FraseOverlay {
  id: string;
  texto: string;
  legenda: string | null;
  categoria: string;
  voz_preferida?: string | null;
}

// Narração das frases foi removida — o overlay é 100% silencioso.
const DURACAO_FRASE_MS = 9000;

// Carrega frases uma única vez por sessão
let frasesCarregadasPromise: Promise<FraseOverlay[]> | null = null;
function carregarFrases(): Promise<FraseOverlay[]> {
  if (!frasesCarregadasPromise) {
    frasesCarregadasPromise = (async () => {
      const { data, error } = await supabase
        .from("overlay_frases")
        .select("id, texto, legenda, categoria, voz_preferida")
        .eq("ativa", true)
        .order("categoria")
        .order("ordem");
      if (error || !data || data.length === 0) {
        return CITACOES_JURIDICAS.map((c, i) => ({
          id: String(i),
          texto: c.frase,
          legenda: c.autor,
          categoria: "filosofos",
        }));
      }
      // Embaralha
      return [...data].sort(() => Math.random() - 0.5);
    })();
  }
  return frasesCarregadasPromise;
}

export const GeracaoAnimacaoOverlay = ({
  open,
  titulo = "Gerando",
  steps = DEFAULT_STEPS,
  stepIdx: stepIdxProp,
  stepRanges = DEFAULT_RANGES,
  estTotalSec = 20,
  onCancel,
  cancelLabel = "Voltar",
}: GeracaoAnimacaoOverlayProps) => {
  const [autoStepIdx, setAutoStepIdx] = useState(0);
  const stepIdx = stepIdxProp ?? autoStepIdx;
  const [frases, setFrases] = useState<FraseOverlay[]>([]);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const stepStartRef = useRef<number>(Date.now());
  const [stepElapsed, setStepElapsed] = useState(0);
  const rotationRef = useRef(0);
  const [audioProgress, setAudioProgress] = useState(0); // 0..1 barra da frase atual
  const fallbackTimerRef = useRef<number | null>(null);

  // Carrega as frases quando abre
  useEffect(() => {
    if (!open) return;
    carregarFrases().then((f) => {
      setFrases(f);
      const start = Math.floor(Math.random() * f.length);
      setQuoteIdx(start);
    });
  }, [open]);

  // Rotação + tique de progresso do STEP (não mais das frases — frases avançam via áudio)
  useEffect(() => {
    if (!open) {
      setAutoStepIdx(0);
      setStepElapsed(0);
      setAudioProgress(0);
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      rotationRef.current = 0;
      return;
    }
    stepStartRef.current = Date.now();
    const tick = window.setInterval(() => {
      setStepElapsed((Date.now() - stepStartRef.current) / 1000);
    }, 120);
    let a1: number | undefined;
    let a2: number | undefined;
    if (stepIdxProp === undefined) {
      a1 = window.setTimeout(() => setAutoStepIdx(1), estTotalSec * 220);
      a2 = window.setTimeout(() => setAutoStepIdx(2), estTotalSec * 850);
    }
    return () => {
      clearInterval(tick);
      if (a1) clearTimeout(a1);
      if (a2) clearTimeout(a2);
    };
  }, [open, estTotalSec, stepIdxProp]);

  const avancarFrase = () => {
    setQuoteIdx((i) => (frases.length ? (i + 1) % frases.length : i));
    rotationRef.current += 1;
  };

  // Rotação silenciosa das frases (sem narração)
  useEffect(() => {
    if (!open || frases.length === 0) return;
    const frase = frases[quoteIdx];
    if (!frase) return;

    let cancelado = false;
    setAudioProgress(0);
    const inicio = Date.now();

    const tick = window.setInterval(() => {
      if (cancelado) return;
      setAudioProgress(Math.min(1, (Date.now() - inicio) / DURACAO_FRASE_MS));
    }, 120);

    fallbackTimerRef.current = window.setTimeout(() => {
      if (!cancelado) avancarFrase();
    }, DURACAO_FRASE_MS) as unknown as number;

    return () => {
      cancelado = true;
      clearInterval(tick);
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quoteIdx, frases]);

  useEffect(() => {
    stepStartRef.current = Date.now();
    setStepElapsed(0);
  }, [stepIdx]);

  if (typeof document === "undefined") return null;

  const TAUS = [1.2, 8, 10, 0];
  const [lo, hi] = stepRanges[stepIdx] ?? [0, 0];
  const tau = TAUS[stepIdx] ?? 3;
  const easedFrac = stepIdx >= 3 ? 1 : 1 - Math.exp(-stepElapsed / tau);
  const pctNum =
    stepIdx >= 3 ? 100 : Math.min(hi - 0.5, lo + (hi - lo) * easedFrac);
  const pctInt = Math.round(pctNum);
  const restanteBruto = pctInt >= 100 ? 0 : (estTotalSec * (100 - pctInt)) / 100;
  const restante = Math.max(0, Math.ceil(restanteBruto));
  const mm = String(Math.floor(restante / 60)).padStart(1, "0");
  const ss = String(restante % 60).padStart(2, "0");
  const circumference = 2 * Math.PI * 46;

  const fraseAtual = frases[quoteIdx] ?? {
    texto: CITACOES_JURIDICAS[0].frase,
    legenda: CITACOES_JURIDICAS[0].autor,
    categoria: "filosofos",
    id: "fallback",
  };

  const badgeCategoria =
    fraseAtual.categoria === "curiosidade"
      ? "Curiosidade"
      : fraseAtual.categoria === "termo"
      ? "Termo jurídico"
      : "Filosofia do Direito";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="geracao-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ zIndex: 2147483000 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center px-4 py-6 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="w-full max-w-sm flex flex-col gap-4"
          >
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="self-start inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 text-amber-100 text-xs font-semibold px-3 py-1.5 backdrop-blur transition"
                aria-label={cancelLabel}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {cancelLabel}
              </button>
            )}
            <div className="relative rounded-3xl border border-amber-400/40 bg-[#0e0407]/95 px-6 pt-16 pb-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              <img
                src={assetUrl(danceCatAsset.url)}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-28 w-28 drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] select-none"
              />

              <div className="relative mx-auto mb-5 h-32 w-32">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(251, 191, 36, 0.15)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke="url(#geracao-grad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pctInt / 100)} style={{ transition: "stroke-dashoffset 0.4s ease" }} />
                  <defs>
                    <linearGradient id="geracao-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fcd34d" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }} className="absolute inset-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(252, 211, 77, 0.9)" strokeWidth="6" strokeLinecap="round" strokeDasharray="18 260" />
                  </svg>
                </motion.div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-amber-100 tabular-nums">{pctInt}%</span>
                  <span className="text-[10px] uppercase tracking-widest text-amber-300/80 mt-0.5">
                    {stepIdx >= 3 ? "Concluído" : restante === 0 ? "Finalizando" : `~${mm}:${ss}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                <p className="text-sm font-semibold text-amber-200 text-center">{titulo}</p>
              </div>

              <ol className="space-y-2">
                {steps.map((s, i) => {
                  const done = i < stepIdx;
                  const active = i === stepIdx;
                  return (
                    <li key={s} className="flex items-center gap-2.5 text-[12.5px]">
                      <span className={`h-5 w-5 grid place-items-center rounded-full text-[10px] font-bold shrink-0 ${done ? "bg-emerald-500 text-black" : active ? "bg-amber-400 text-black animate-pulse" : "bg-white/10 text-white/50"}`}>
                        {done ? "✓" : active ? "•" : i + 1}
                      </span>
                      <span className={done ? "text-white/60 line-through" : active ? "text-amber-100 font-semibold" : "text-white/50"}>{s}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <AnimatePresence mode="wait">
              <motion.figure
                key={fraseAtual.id + "-" + quoteIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-amber-400/15 bg-black/40 px-5 py-4 shadow-inner"
              >
                <div className="text-[10px] uppercase tracking-widest text-amber-300/70 mb-2 font-semibold">
                  {badgeCategoria}
                </div>
                <blockquote className="text-[13px] leading-relaxed text-amber-50/90 italic">
                  <span className="text-amber-300/70 mr-1 text-lg leading-none align-[-2px]">"</span>
                  {fraseAtual.texto}
                  <span className="text-amber-300/70 ml-0.5 text-lg leading-none align-[-2px]">"</span>
                </blockquote>
                {fraseAtual.legenda && (
                  <figcaption className="mt-2 text-[11px] uppercase tracking-wider text-amber-300/80">
                    — {fraseAtual.legenda}
                  </figcaption>
                )}
                {/* Barra de progresso da narração da frase */}
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-amber-400/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full"
                    style={{ width: `${Math.round(audioProgress * 100)}%`, transition: 'width 0.15s linear' }}
                  />
                </div>
              </motion.figure>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default GeracaoAnimacaoOverlay;
