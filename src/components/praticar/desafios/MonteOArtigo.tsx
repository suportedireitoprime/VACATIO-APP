import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Blocks, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Artigo, segmentarParaMontar, shuffle } from "./utils";

type Props = {
  artigo: Artigo;
  onResult: (ok: boolean) => void;
};

export default function MonteOArtigo({ artigo, onResult }: Props) {
  const original = useMemo(() => segmentarParaMontar(artigo.texto ?? "", 3), [artigo]);
  const [pool, setPool] = useState<string[]>(() => shuffle(original));
  const [montado, setMontado] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  const mover = (seg: string, para: "montado" | "pool") => {
    if (status !== "idle") return;
    if (para === "montado") {
      setPool((p) => p.filter((x) => x !== seg));
      setMontado((m) => [...m, seg]);
    } else {
      setMontado((m) => m.filter((x) => x !== seg));
      setPool((p) => [...p, seg]);
    }
  };

  const verificar = () => {
    const ok = montado.length === original.length && montado.every((s, i) => s === original[i]);
    setStatus(ok ? "ok" : "err");
    onResult(ok);
  };

  const resetar = () => {
    setMontado([]);
    setPool(shuffle(original));
    setStatus("idle");
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do desafio */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25">
            <Blocks className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl leading-none text-foreground">Monte o artigo</p>
            <p className="mt-1 text-[15px] leading-6 text-foreground/85">
              Toque nos trechos abaixo na <strong>ordem correta</strong> para reconstruir o artigo.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
          <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">Art. {artigo.numero}</span>
          <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">{original.length} trechos</span>
        </div>
      </div>

      {/* Área de montagem */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
          Sua ordem
        </p>
        <div className="min-h-[140px] p-3 sm:p-4 rounded-2xl border-2 border-dashed border-destructive/40 bg-destructive/5 space-y-2">
          {montado.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Toque nos trechos abaixo para montar aqui.
            </p>
          )}
          {montado.map((seg, i) => (
            <motion.button
              key={`m-${i}-${seg.slice(0, 10)}`}
              layout
              onClick={() => mover(seg, "pool")}
              disabled={status !== "idle"}
              className="w-full min-h-[52px] text-left p-3 rounded-xl bg-card border border-destructive/50 text-[15px] leading-6 shadow-sm active:scale-[0.99] transition"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold mr-2 shrink-0">
                {i + 1}
              </span>
              {seg}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Pool de trechos */}
      {pool.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
            Trechos embaralhados
          </p>
          <div className="space-y-2">
            {pool.map((seg, i) => (
              <motion.button
                key={`p-${i}-${seg.slice(0, 10)}`}
                layout
                onClick={() => mover(seg, "montado")}
                disabled={status !== "idle"}
                className="w-full min-h-[52px] text-left p-3 rounded-xl bg-card border border-border hover:border-destructive/50 text-[15px] leading-6 active:scale-[0.99] transition"
              >
                {seg}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {status === "idle" ? (
        <Button
          onClick={verificar}
          disabled={montado.length !== original.length}
          variant="destructive"
          className="w-full min-h-[52px] rounded-2xl font-bold text-base disabled:opacity-40"
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
            <X className="w-5 h-5" /> A ordem está errada.
          </div>
          <div className="p-4 rounded-xl bg-card border border-border text-[15px] leading-6 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Redação oficial
            </p>
            {original.map((s, i) => (
              <p key={i} className="flex gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-destructive/15 text-destructive text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span>{s}</span>
              </p>
            ))}
          </div>
          <Button onClick={resetar} variant="secondary" className="w-full min-h-[48px] rounded-xl text-sm font-medium">
            <RotateCcw className="w-4 h-4" /> Tentar de novo
          </Button>
        </div>
      )}
    </div>
  );
}
