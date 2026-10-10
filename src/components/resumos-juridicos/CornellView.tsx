import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CornellContent, normalizePergunta } from "./metodologias";

export default function CornellView({ conteudo }: { conteudo: CornellContent }) {
  const [openQ, setOpenQ] = useState<number | null>(null);
  if (!conteudo) return null;
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-[36%] p-4 border-b md:border-b-0 md:border-r border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-primary">
            Palavras-chave
          </h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {(conteudo.palavras_chave || []).map((k, i) => (
              <span key={i} className="px-2.5 py-1 text-[13px] font-medium bg-primary/10 text-primary rounded-full">
                {k}
              </span>
            ))}
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-primary">
            Perguntas de revisão
          </h3>
          <ul className="space-y-2">
            {(conteudo.perguntas || []).map((p, i) => {
              const q = normalizePergunta(p);
              const isOpen = openQ === i;
              return (
                <li key={i} className="border border-border/50 rounded-xl overflow-hidden bg-card/50">
                  <button 
                    onClick={() => setOpenQ(isOpen ? null : i)}
                    className="w-full text-left p-3 flex gap-2 items-start justify-between hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground leading-snug pr-2">{q.pergunta}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />}
                  </button>
                  {isOpen && q.resposta && (
                    <div className="px-3 pb-3 pt-1 text-sm text-muted-foreground leading-relaxed">
                      {q.resposta}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="w-full md:w-[64%] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-primary">
            Anotações
          </h3>
          <div className="space-y-4">
            {(conteudo.anotacoes || []).map((a, i) => (
              <div key={i}>
                <p className="text-sm font-bold text-foreground">{a.topico}</p>
                <p className="text-sm text-foreground/85 leading-relaxed mt-1 whitespace-pre-line">
                  {a.conteudo}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {conteudo.resumo_geral && (
        <div className="p-4 border-t border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-primary">
            Resumo-síntese
          </h3>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {conteudo.resumo_geral}
          </p>
        </div>
      )}
    </div>
  );
}
