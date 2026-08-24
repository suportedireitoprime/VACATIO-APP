import { useMemo, useState } from "react";
import { Check, Scale, X } from "lucide-react";
import { Artigo, gerarItemVF } from "./utils";

type Props = {
  artigo: Artigo;
  trecho?: string;
  rotulo?: string;
  onResult: (ok: boolean) => void;
};

export default function VerdadeiroFalso({ artigo, trecho, rotulo, onResult }: Props) {
  const base = trecho ?? artigo.texto ?? "";
  const item = useMemo(() => gerarItemVF(base), [base]);
  const [resposta, setResposta] = useState<boolean | null>(null);

  if (!item) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
        Sem trecho válido.
        <button onClick={() => onResult(true)} className="ml-2 text-destructive font-semibold underline underline-offset-2">
          Pular
        </button>
      </div>
    );
  }

  const respondido = resposta !== null;
  const ok = resposta === item.verdadeiro;

  const responder = (v: boolean) => {
    if (respondido) return;
    setResposta(v);
    onResult(v === item.verdadeiro);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do desafio */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25">
            <Scale className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl leading-none text-foreground">Verdadeiro ou falso</p>
            <p className="mt-1 text-[15px] leading-6 text-foreground/85">
              Leia o trecho abaixo. Ele corresponde <strong>exatamente</strong> ao texto oficial?
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
          <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">Art. {artigo.numero}</span>
          {rotulo && <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">{rotulo}</span>}
        </div>
      </div>

      {/* Trecho */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 text-[17px] leading-[1.85] sm:text-[18px] whitespace-pre-wrap shadow-sm">
        {item.texto}
      </div>

      {/* Botões V/F */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => responder(true)}
          disabled={respondido}
          className={
            "min-h-[56px] rounded-2xl border-2 font-bold text-base transition flex items-center justify-center gap-2 " +
            (respondido && item.verdadeiro
              ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300"
              : respondido && resposta === true
              ? "bg-destructive/15 border-destructive text-destructive"
              : "bg-card border-border hover:border-destructive/50 active:scale-[0.98] text-foreground")
          }
        >
          <Check className="w-5 h-5" /> Verdadeiro
        </button>
        <button
          onClick={() => responder(false)}
          disabled={respondido}
          className={
            "min-h-[56px] rounded-2xl border-2 font-bold text-base transition flex items-center justify-center gap-2 " +
            (respondido && !item.verdadeiro
              ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300"
              : respondido && resposta === false
              ? "bg-destructive/15 border-destructive text-destructive"
              : "bg-card border-border hover:border-destructive/50 active:scale-[0.98] text-foreground")
          }
        >
          <X className="w-5 h-5" /> Falso
        </button>
      </div>

      {/* Feedback */}
      {respondido && (
        <div
          className={
            "rounded-xl border p-4 text-sm leading-6 " +
            (ok
              ? "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300"
              : "bg-destructive/15 border-destructive/40 text-destructive")
          }
        >
          {item.verdadeiro ? (
            <span>O trecho está <strong>fiel</strong> ao texto oficial.</span>
          ) : (
            <span>
              O trecho é <strong>falso</strong>. A palavra <strong>"{item.substituta}"</strong> foi trocada — o texto oficial usa <strong>"{item.correta}"</strong>.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
