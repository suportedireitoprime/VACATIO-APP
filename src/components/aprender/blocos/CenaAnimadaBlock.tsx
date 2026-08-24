import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, RotateCcw, Sparkles } from 'lucide-react';

type Personagem = { id: string; nome: string; papel?: string };
type Elemento = { texto?: string; ator?: string; fala?: string };
type Visual = { tipo: 'dialogo' | 'setas' | 'box' | 'linha_tempo' | 'comparacao'; elementos: Elemento[] };
type Cena = { n: number; titulo: string; narracao: string; visual: Visual; duracao_ms?: number };

export function CenaAnimadaBlock({ payload }: { payload: any }) {
  const titulo: string = payload?.titulo || 'Cena animada';
  const personagens: Personagem[] = Array.isArray(payload?.personagens) ? payload.personagens : [];
  const cenas: Cena[] = Array.isArray(payload?.cenas) ? payload.cenas : [];
  const moral: string | undefined = payload?.moral;

  const [idx, setIdx] = useState(0);
  const [tocando, setTocando] = useState(false);
  const timerRef = useRef<number | null>(null);

  const cena = cenas[idx];
  const dur = cena?.duracao_ms ?? 4500;

  useEffect(() => {
    if (!tocando || !cena) return;
    timerRef.current = window.setTimeout(() => {
      if (idx + 1 >= cenas.length) setTocando(false);
      else setIdx((i) => i + 1);
    }, dur);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [tocando, idx, dur, cena, cenas.length]);

  if (!cena) return null;

  const nomeDe = (id?: string) => personagens.find((p) => p.id === id)?.nome || id || '';

  return (
    <article>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Cena animada
      </div>
      <h3 className="mb-3 font-display text-lg font-bold text-foreground">{titulo}</h3>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background aspect-video">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                Cena {cena.n}/{cenas.length}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{cena.titulo}</span>
            </div>

            <div className="flex-1 overflow-hidden">
              {cena.visual?.tipo === 'dialogo' && (
                <div className="flex flex-col gap-2">
                  {cena.visual.elementos.map((e, i) => {
                    const dir = i % 2 === 0 ? 'items-start' : 'items-end';
                    return (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.3 }}
                        className={`flex flex-col ${dir}`}>
                        <span className="text-[10px] font-bold uppercase text-primary/70">{nomeDe(e.ator)}</span>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                          i % 2 === 0 ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
                        }`}>{e.fala}</div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              {(cena.visual?.tipo === 'setas' || cena.visual?.tipo === 'box') && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {cena.visual.elementos.map((e, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.25 }}
                      className="rounded-xl border border-primary/40 bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground">
                      {e.texto}
                      {i < cena.visual.elementos.length - 1 && cena.visual.tipo === 'setas' && (
                        <span className="ml-1 text-primary">→</span>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
              {cena.visual?.tipo === 'comparacao' && (
                <div className="grid grid-cols-2 gap-2">
                  {cena.visual.elementos.slice(0, 2).map((e, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.2 }}
                      className={`rounded-xl border p-2 text-xs ${
                        i === 0 ? 'border-red-500/50 bg-red-500/10' : 'border-emerald-500/50 bg-emerald-500/10'
                      }`}>{e.texto}</motion.div>
                  ))}
                </div>
              )}
              {cena.visual?.tipo === 'linha_tempo' && (
                <div className="flex items-center gap-1 overflow-x-auto">
                  {cena.visual.elementos.map((e, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }}
                      className="flex flex-col items-center min-w-[80px]">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div className="h-6 w-px bg-primary/40" />
                      <span className="text-[10px] font-semibold text-foreground text-center">{e.texto}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <p className="mt-2 rounded-xl bg-background/60 px-3 py-2 text-sm text-foreground backdrop-blur">
              {cena.narracao}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Barra de progresso */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all"
            style={{ width: `${Math.round(((idx + 1) / cenas.length) * 100)}%` }} />
        </div>
        <span className="text-[11px] text-muted-foreground">{idx + 1}/{cenas.length}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => setTocando((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {tocando ? <><Pause className="h-4 w-4" /> Pausar</> : <><Play className="h-4 w-4" /> Reproduzir</>}
        </button>
        <button onClick={() => setIdx((i) => Math.min(cenas.length - 1, i + 1))}
          disabled={idx >= cenas.length - 1}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40">
          <SkipForward className="h-4 w-4" /> Próxima
        </button>
        <button onClick={() => { setIdx(0); setTocando(false); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted">
          <RotateCcw className="h-4 w-4" /> Reiniciar
        </button>
      </div>

      {moral && idx >= cenas.length - 1 && (
        <div className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
          <p className="text-[11px] font-bold uppercase text-primary">Regra de ouro</p>
          <p className="mt-0.5 text-sm text-foreground">{moral}</p>
        </div>
      )}
    </article>
  );
}
