import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shuffle, RotateCw, Sparkles, CheckCircle2, Lightbulb, Layers } from 'lucide-react';
import flipSoundAsset from '@/assets/flipcard.mp3.asset.json';

type Flashcard = {
  id: string;
  frente: string;
  verso: string;
  explicacao?: string;
  exemplo?: string;
  dica?: string;
};

type Props = {
  flashcards: Flashcard[];
  loading: boolean;
};

const shuffleArr = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Renderiza *ênfase* / **negrito** como texto forte em vez de mostrar os
 * asteriscos crus (que poluíam a leitura do verso).
 */
const renderEnfase = (texto: string) =>
  texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((parte, i) => {
    const m = parte.match(/^\*\*?([^*]+)\*\*?$/);
    if (m) return <strong key={i} className="font-bold">{m[1]}</strong>;
    return <span key={i}>{parte}</span>;
  });

const FlashcardsTab = ({ flashcards, loading }: Props) => {
  const [order, setOrder] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!flipAudioRef.current) {
      flipAudioRef.current = new Audio(flipSoundAsset.url);
      flipAudioRef.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    setOrder(shuffleArr(flashcards));
    setIdx(0);
    setFlipped(false);
  }, [flashcards]);

  const total = order.length;
  const atual = order[idx];

  const flip = () => {
    setFlipped((v) => !v);
    try {
      const a = flipAudioRef.current;
      if (a) { a.currentTime = 0; void a.play(); }
    } catch {}
  };

  const go = (delta: number) => {
    setFlipped(false);
    setIdx((i) => Math.max(0, Math.min(total - 1, i + delta)));
  };

  const embaralhar = () => {
    setOrder(shuffleArr(order));
    setIdx(0);
    setFlipped(false);
  };

  if (loading) {
    return <div className="h-[420px] animate-pulse rounded-2xl bg-muted" />;
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/40 p-8 text-center">
        <Layers className="h-8 w-8 text-muted-foreground" />
        <p className="text-[15px] font-semibold text-foreground">Nenhum flashcard disponível</p>
        <p className="max-w-sm text-[13px] text-muted-foreground">
          As aulas deste tema ainda não têm flashcards. Assim que forem geradas, eles aparecem aqui automaticamente para você praticar.
        </p>
      </div>
    );
  }

  const versoTexto = atual.explicacao || atual.verso || '';
  const exemploTexto = atual.exemplo || '';
  const dicaTexto = atual.dica || '';

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <span
          className="text-[12px] font-semibold text-muted-foreground tabular-nums"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          {idx + 1} / {total}
        </span>
        <button
          onClick={embaralhar}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent/50"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          <Shuffle className="h-3.5 w-3.5" /> Embaralhar
        </button>
      </div>

      <div className="w-full flex-1" style={{ perspective: '1200px' }}>
        <motion.div
          className="relative h-full min-h-[420px] w-full cursor-pointer"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
          onClick={flip}
        >
          {/* Frente */}
          <div
            className="absolute inset-0 flex flex-col rounded-3xl border-2 border-accent/40 bg-gradient-to-br from-card via-card to-secondary p-6 shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Frente</span>
              <Sparkles className="h-4 w-4 text-accent/60" />
            </div>
            <div className="flex flex-1 items-center justify-center text-center">
              <p
                className="text-xl font-semibold leading-snug text-foreground"
                style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
              >
                {renderEnfase(atual.frente)}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
              <RotateCw className="h-3.5 w-3.5" /> Toque para virar
            </div>
          </div>

          {/* Verso */}
          <div
            className="absolute inset-0 flex flex-col rounded-3xl bg-gradient-to-br from-accent/95 to-primary/90 p-5 shadow-2xl"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent-foreground/80">
                Verso · Resposta
              </span>
              <CheckCircle2 className="h-4 w-4 text-accent-foreground/80" />
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-left">
              <div>
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-accent-foreground/80">Explicação</p>
                <p className="text-[17px] font-medium leading-[1.55] text-accent-foreground sm:text-[18px]" style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
                  {renderEnfase(versoTexto)}
                </p>
              </div>
              {exemploTexto && (
                <div className="rounded-xl border border-accent-foreground/20 bg-accent-foreground/10 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-accent-foreground/90">
                    <Lightbulb className="h-3.5 w-3.5" /> Exemplo prático
                  </p>
                  <p className="text-[16px] font-medium leading-[1.55] text-accent-foreground sm:text-[17px]" style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
                    {renderEnfase(exemploTexto)}
                  </p>
                </div>
              )}
              {dicaTexto && (
                <div className="rounded-xl border border-accent-foreground/15 bg-accent-foreground/5 p-3">
                  <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-widest text-accent-foreground/80">Dica</p>
                  <p className="text-[16px] font-medium leading-[1.55] text-accent-foreground sm:text-[17px]" style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}>
                    {renderEnfase(dicaTexto)}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 border-t border-accent-foreground/20 pt-3 text-xs text-accent-foreground/70">
              <RotateCw className="h-3.5 w-3.5" /> Toque para voltar
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => go(-1)}
          disabled={idx === 0}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[14px] font-semibold text-foreground transition-colors hover:bg-accent/50 disabled:opacity-40"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <button
          onClick={() => go(1)}
          disabled={idx >= total - 1}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#EFE039] text-[14px] font-bold text-black transition-transform hover:scale-[1.01] disabled:opacity-40"
          style={{ fontFamily: "'Barlow', system-ui, sans-serif" }}
        >
          Próximo <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default FlashcardsTab;
