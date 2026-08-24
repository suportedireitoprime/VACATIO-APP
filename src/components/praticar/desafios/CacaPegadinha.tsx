import { useMemo, useState } from "react";
import { Check, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Artigo, gerarPegadinha } from "./utils";

type Props = {
  artigo: Artigo;
  trecho?: string;
  rotulo?: string;
  onResult: (ok: boolean) => void;
};

export default function CacaPegadinha({ artigo, trecho, rotulo, onResult }: Props) {
  const textoBase = trecho ?? artigo.texto ?? "";
  const pegadinha = useMemo(() => gerarPegadinha(textoBase), [textoBase]);
  const [escolha, setEscolha] = useState<number | null>(null);

  if (!pegadinha) {
    // Sem candidatos: pula pro próximo com "acerto neutro"
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        Não encontrei uma troca boa neste trecho.
        <Button onClick={() => onResult(true)} variant="link" className="ml-1 h-auto p-0 text-destructive">
          Pular
        </Button>
      </div>
    );
  }

  const respondido = escolha !== null;
  const ok = escolha === pegadinha.indice;

  const tocar = (i: number) => {
    if (respondido) return;
    // Só palavras "reais" (não espaços) devem ser clicáveis
    const tk = pegadinha.palavras[i].token;
    if (/^\s+$/.test(tk)) return;
    setEscolha(i);
    onResult(i === pegadinha.indice);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20">
            <Target className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl leading-none text-foreground">Caça-pegadinhas</p>
            <p className="mt-1 text-[15px] leading-6 text-foreground/85">
              Uma palavra foi trocada pelo <strong>oposto</strong>. Toque na palavra que está errada.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
          <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">Art. {artigo.numero}</span>
          {rotulo && <span className="rounded-full bg-card px-3 py-1.5 ring-1 ring-destructive/20">{rotulo}</span>}
        </div>
      </div>

      <div className="min-h-[260px] max-h-[60dvh] overflow-y-auto rounded-2xl border border-border bg-card p-5 text-[18px] leading-[1.85] shadow-sm md:text-[19px] whitespace-pre-wrap">
        {pegadinha.palavras.map((p, i) => {
          if (/^\s+$/.test(p.token)) return <span key={i}>{p.token}</span>;
          const isChosen = escolha === i;
          const revealCorrect = respondido && i === pegadinha.indice;
          const wrongPick = respondido && isChosen && !ok;
          return (
            <button
              key={i}
              onClick={() => tocar(i)}
              disabled={respondido}
              className={
                "rounded px-1 py-0.5 text-left transition-colors " +
                (revealCorrect
                  ? "bg-green-500/25 text-green-700 dark:text-green-300 font-semibold"
                  : wrongPick
                  ? "bg-destructive/20 text-destructive"
                  : "hover:bg-destructive/10")
              }
            >
              {p.token}
            </button>
          );
        })}
      </div>

      {respondido && (
        <div
          className={
            "p-3 rounded-xl border text-sm flex items-start gap-2 " +
            (ok
              ? "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300"
              : "bg-destructive/15 border-destructive/40 text-destructive")
          }
        >
          {ok ? <Check className="w-5 h-5 shrink-0" /> : <X className="w-5 h-5 shrink-0" />}
          <span>
            A palavra correta é <strong>"{pegadinha.correta.trim()}"</strong> — foi trocada por{" "}
            <strong>"{pegadinha.substituta.trim()}"</strong>, que é o oposto.
          </span>
        </div>
      )}
    </div>
  );
}
