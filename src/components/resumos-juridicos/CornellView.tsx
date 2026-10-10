import { CornellContent, normalizePergunta } from "./metodologias";

const ROSE = "hsl(351 74% 27%)";

export default function CornellView({ conteudo }: { conteudo: CornellContent }) {
  if (!conteudo) return null;
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-[36%] p-4 border-b md:border-b-0 md:border-r border-border">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: ROSE }}>
            Palavras-chave
          </h3>
          <ul className="space-y-2 mb-6">
            {(conteudo.palavras_chave || []).map((k, i) => (
              <li key={i} className="text-sm text-foreground/90 leading-snug">
                • {k}
              </li>
            ))}
          </ul>

          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: ROSE }}>
            Perguntas de revisão
          </h3>
          <ul className="space-y-3">
            {(conteudo.perguntas || []).map((p, i) => {
              const q = normalizePergunta(p);
              return (
                <li key={i}>
                  <p className="text-sm font-semibold text-foreground leading-snug">{q.pergunta}</p>
                  {q.resposta && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{q.resposta}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="w-full md:w-[64%] p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: ROSE }}>
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
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: ROSE }}>
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
