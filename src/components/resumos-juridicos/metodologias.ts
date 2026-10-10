export interface CornellPergunta {
  pergunta: string;
  resposta?: string;
}

export interface CornellContent {
  palavras_chave: string[];
  perguntas: (string | CornellPergunta)[];
  anotacoes: { topico: string; conteudo: string }[];
  resumo_geral?: string;
}

export interface FeynmanContent {
  conceito: string;
  explicacao_simples: string;
  lacunas: { ponto: string; explicacao: string }[];
  analogias: { analogia: string; relacao: string }[];
  revisao_final?: string;
}

export type Metodo = "conceitos" | "cornell" | "feynman";

export function normalizePergunta(p: string | CornellPergunta): CornellPergunta {
  return typeof p === "string" ? { pergunta: p, resposta: "" } : p;
}

/** Converte o conteúdo Cornell em markdown (usado para copiar, enviar e PDF) */
export function cornellParaMarkdown(c: CornellContent): string {
  const linhas: string[] = ["## Palavras-chave", ""];
  (c.palavras_chave || []).forEach((k) => linhas.push(`- ${k}`));
  linhas.push("", "## Perguntas de revisão", "");
  (c.perguntas || []).forEach((p) => {
    const q = normalizePergunta(p);
    linhas.push(`- **${q.pergunta}**`);
    if (q.resposta) linhas.push(`  ${q.resposta}`);
  });
  linhas.push("", "## Anotações", "");
  (c.anotacoes || []).forEach((a) => {
    linhas.push(`### ${a.topico}`, "", a.conteudo, "");
  });
  if (c.resumo_geral) linhas.push("## Resumo-síntese", "", c.resumo_geral);
  return linhas.join("\n");
}

/** Converte o conteúdo Feynman em markdown */
export function feynmanParaMarkdown(f: FeynmanContent): string {
  const linhas: string[] = [];
  linhas.push("## 1. Conceito", "", f.conceito || "", "");
  linhas.push("## 2. Explicação simples", "", f.explicacao_simples || "", "");
  linhas.push("## 3. Lacunas", "");
  (f.lacunas || []).forEach((l) => linhas.push(`- **${l.ponto}** — ${l.explicacao}`));
  linhas.push("", "## 4. Analogias", "");
  (f.analogias || []).forEach((a) => linhas.push(`- **${a.analogia}** — ${a.relacao}`));
  if (f.revisao_final) linhas.push("", "## Revisão final", "", f.revisao_final);
  return linhas.join("\n");
}
