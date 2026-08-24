// Mapeia `function_name` (Edge Function) para um rótulo amigável de "origem"
// quando a chamada de IA é automática (rotina do próprio aplicativo).
// Usado no dashboard Admin → Monitoramento → APIs.

export function getAppOrigin(functionName: string): string {
  const fn = functionName.toLowerCase();
  if (fn.startsWith("blog-edicao") || fn === "blog-narrar-artigo") return "Blog";
  if (fn.startsWith("boletim") || fn.includes("boletim")) return "Boletins";
  if (fn.startsWith("popular-radar") || fn.startsWith("radar-")) return "Radar de Leis";
  if (fn.startsWith("horus-") || fn === "horus-webhook") return "Horus (WhatsApp)";
  if (fn === "gerar-imagem-slide" || fn === "narrar-frase" || fn === "tematica-porque-assistir") return "Conteúdo automático";
  if (fn.startsWith("gerar-videoaula")) return "Videoaulas";
  if (fn === "gerar-global") return "Geração global";
  return "Rotina do app";
}
