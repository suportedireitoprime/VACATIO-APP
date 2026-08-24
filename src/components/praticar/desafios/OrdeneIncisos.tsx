import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, ListOrdered, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Artigo, extrairIncisos, shuffle } from "./utils";

type Props = {
  artigo: Artigo;
  onResult: (ok: boolean) => void;
};

export default function OrdeneIncisos({ artigo, onResult }: Props) {
  const incisos = useMemo(() => extrairIncisos(artigo.texto ?? ""), [artigo]);
  const [ordem, setOrdem] = useState<string[]>(() => shuffle(incisos));
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  if (incisos.length < 2) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
        Este artigo não tem incisos suficientes.
        <Button onClick={() => onResult(true)} variant="link" className="ml-1 h-auto p-0 text-destructive">
          Pular
        </Button>
      </div>
    );
  }

  const mover = (from: number, dir: -1 | 1) => {
    if (status !== "idle") return;
    const to = from + dir;
    if (to < 0 || to >= ordem.length) return;
    const novo = [...ordem];
    [novo[from], novo[to]] = [novo[to], novo[from]];
    setOrdem(novo);
  };

  const verificar = () => {
    const ok = ordem.every((v, i) => v === incisos[i]);
    setStatus(ok ? "ok" : "err");
    onResult(ok);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do desafio */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25">
            <ListOrdered className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl leading-none text-foreground">Ordene os incisos</p>
            <p className="mt-1 text-[15px] leading-6 text-foreground/85">
              Reorganize os incisos na <strong>ordem oficial</strong> usando as setas.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
          <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">Art. {artigo.numero}</span>
          <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">{incisos.length} incisos</span>
        </div>
      </div>

      {/* Lista ordenável */}
      <div className="space-y-2">
        {ordem.map((inc, i) => (
          <motion.div
            layout
            key={inc}
            className="flex items-stretch gap-2 rounded-xl bg-card border border-border overflow-hidden"
          >
            <div className="flex items-center justify-center w-10 shrink-0 bg-destructive/10 text-destructive font-bold text-sm tabular-nums">
              {i + 1}
            </div>
            <p className="flex-1 py-3 pr-2 text-[15px] leading-6 text-foreground">{inc}</p>
            <div className="flex flex-col border-l border-border">
              <button
                onClick={() => mover(i, -1)}
                disabled={i === 0 || status !== "idle"}
                className="flex-1 w-11 flex items-center justify-center hover:bg-destructive/10 active:bg-destructive/20 disabled:opacity-30 transition"
                aria-label="Subir"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <div className="h-px bg-border" />
              <button
                onClick={() => mover(i, 1)}
                disabled={i === ordem.length - 1 || status !== "idle"}
                className="flex-1 w-11 flex items-center justify-center hover:bg-destructive/10 active:bg-destructive/20 disabled:opacity-30 transition"
                aria-label="Descer"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {status === "idle" ? (
        <Button
          onClick={verificar}
          variant="destructive"
          className="w-full min-h-[52px] rounded-2xl font-bold text-base"
        >
          <Check className="w-5 h-5" /> Conferir
        </Button>
      ) : status === "ok" ? (
        <div className="p-4 rounded-xl bg-green-500/15 border border-green-500/40 text-green-700 dark:text-green-300 flex items-center gap-2 font-semibold">
          <Check className="w-5 h-5" /> Ordem correta!
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive flex items-center gap-2 font-semibold">
            <X className="w-5 h-5" /> Ordem errada.
          </div>
          <div className="p-4 rounded-xl bg-card border border-border text-[15px] leading-6 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Ordem oficial
            </p>
            {incisos.map((s, i) => (
              <p key={i} className="flex gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-destructive/15 text-destructive text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span>{s}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
