import { FeynmanContent } from "./metodologias";

const ROSE = "hsl(351 74% 27%)";

function Passo({ num, titulo, children }: { num: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border"
          style={{ color: ROSE, borderColor: ROSE }}
        >
          {num}
        </div>
        <h3 className="font-semibold text-sm" style={{ color: ROSE }}>
          {titulo}
        </h3>
      </div>
      {children}
    </div>
  );
}

export default function FeynmanView({ conteudo }: { conteudo: FeynmanContent }) {
  if (!conteudo) return null;
  return (
    <div className="space-y-3">
      <Passo num={1} titulo="Conceito">
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{conteudo.conceito}</p>
      </Passo>

      <Passo num={2} titulo="Explicação simples">
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
          {conteudo.explicacao_simples}
        </p>
      </Passo>

      <Passo num={3} titulo="Lacunas">
        <div className="space-y-3">
          {(conteudo.lacunas || []).map((l, i) => (
            <div key={i} className="rounded-xl p-3 border border-border/60">
              <p className="text-sm font-semibold" style={{ color: ROSE }}>
                {l.ponto}
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{l.explicacao}</p>
            </div>
          ))}
        </div>
      </Passo>

      <Passo num={4} titulo="Analogias">
        <div className="space-y-3">
          {(conteudo.analogias || []).map((a, i) => (
            <div key={i} className="rounded-xl p-3 border border-border/60">
              <p className="text-sm font-semibold" style={{ color: ROSE }}>
                {a.analogia}
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.relacao}</p>
            </div>
          ))}
        </div>
      </Passo>

      {conteudo.revisao_final && (
        <div className="rounded-2xl p-4 border border-border">
          <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: ROSE }}>
            Revisão final
          </h3>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {conteudo.revisao_final}
          </p>
        </div>
      )}
    </div>
  );
}
