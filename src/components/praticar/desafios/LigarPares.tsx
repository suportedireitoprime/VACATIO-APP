import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link2, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Artigo, gerarParesLigar, shuffle, ParLigar } from "./utils";

type Props = {
  artigo: Artigo;
  onResult: (ok: boolean) => void;
};

export default function LigarPares({ artigo, onResult }: Props) {
  const pares: ParLigar[] = useMemo(() => gerarParesLigar(artigo.texto ?? ""), [artigo]);
  const direitaEmbaralhada = useMemo(() => shuffle(pares.map((p, i) => ({ dir: p.direita, idx: i }))), [pares]);

  const [selecionadaEsq, setSelecionadaEsq] = useState<number | null>(null);
  const [ligacoes, setLigacoes] = useState<Record<number, number>>({}); // esqIdx -> dirIdx
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  const selecionarEsq = (i: number) => {
    if (status !== "idle") return;
    if (ligacoes[i] !== undefined) {
      const nova = { ...ligacoes };
      delete nova[i];
      setLigacoes(nova);
      return;
    }
    setSelecionadaEsq(i);
  };

  const selecionarDir = (dirIdx: number) => {
    if (status !== "idle" || selecionadaEsq === null) return;
    // remove ligação anterior que apontava para este dir
    const nova: Record<number, number> = {};
    for (const [k, v] of Object.entries(ligacoes)) {
      if (v !== dirIdx) nova[Number(k)] = v;
    }
    nova[selecionadaEsq] = dirIdx;
    setLigacoes(nova);
    setSelecionadaEsq(null);
  };

  const completo = Object.keys(ligacoes).length === pares.length;

  const verificar = () => {
    const ok = pares.every((_, i) => ligacoes[i] === i);
    setStatus(ok ? "ok" : "err");
    onResult(ok);
  };

  const resetar = () => {
    setLigacoes({});
    setSelecionadaEsq(null);
    setStatus("idle");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25">
            <Link2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl leading-none text-foreground">Ligar pares</p>
            <p className="mt-1 text-[15px] leading-6 text-foreground/85">
              Toque em um <strong>início</strong> à esquerda e depois no <strong>fim</strong> correspondente à direita.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
          <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">Art. {artigo.numero}</span>
          <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">{pares.length} pares</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Início</p>
          {pares.map((p, i) => {
            const ligado = ligacoes[i] !== undefined;
            const selecionada = selecionadaEsq === i;
            return (
              <motion.button
                key={`esq-${i}`}
                layout
                onClick={() => selecionarEsq(i)}
                disabled={status !== "idle"}
                className={
                  "w-full text-left p-3 rounded-xl border text-[13px] leading-5 transition " +
                  (selecionada
                    ? "bg-destructive text-destructive-foreground border-destructive shadow-lg"
                    : ligado
                      ? "bg-card border-destructive/60 opacity-70"
                      : "bg-card border-border")
                }
              >
                {ligado && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold mr-1.5">
                    {Object.keys(ligacoes).filter((k) => Number(k) < i).length + 1}
                  </span>
                )}
                {p.esquerda}
              </motion.button>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Fim</p>
          {direitaEmbaralhada.map(({ dir, idx }) => {
            const jaLigada = Object.values(ligacoes).includes(idx);
            return (
              <motion.button
                key={`dir-${idx}`}
                layout
                onClick={() => selecionarDir(idx)}
                disabled={status !== "idle" || (jaLigada && selecionadaEsq === null)}
                className={
                  "w-full text-left p-3 rounded-xl border text-[13px] leading-5 transition " +
                  (jaLigada ? "bg-card border-destructive/60 opacity-70" : "bg-card border-border hover:border-destructive/50")
                }
              >
                {dir}
              </motion.button>
            );
          })}
        </div>
      </div>

      {status === "idle" ? (
        <Button
          onClick={verificar}
          disabled={!completo}
          variant="destructive"
          className="w-full min-h-[52px] rounded-2xl font-bold text-base disabled:opacity-40"
        >
          <Check className="w-5 h-5" /> Conferir
        </Button>
      ) : status === "ok" ? (
        <div className="p-4 rounded-xl bg-green-500/15 border border-green-500/40 text-green-700 dark:text-green-300 flex items-center gap-2 font-semibold">
          <Check className="w-5 h-5" /> Todos os pares corretos!
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive flex items-center gap-2 font-semibold">
            <X className="w-5 h-5" /> Alguns pares estão errados.
          </div>
          <div className="p-4 rounded-xl bg-card border border-border text-[14px] leading-6 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Pares corretos</p>
            {pares.map((p, i) => (
              <p key={i}>
                <span className="text-destructive font-semibold">{p.esquerda}</span> — {p.direita}
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
