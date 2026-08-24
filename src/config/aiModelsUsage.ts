// Catálogo de uso de modelos Gemini nas edge functions do app.
// Mantido em sincronia com supabase/functions/_shared/ai-models.ts.
//
// POLÍTICA: modelo fixado em versão específica (nunca alias `-latest`).
// Aliases como `gemini-flash-lite-latest` resolvem para a versão mais nova
// (hoje Gemini 3.1 Flash Lite), que é MAIS CARA. Usamos sempre
// `gemini-2.5-flash-lite` — a versão mais barata da família Flash Lite.
// Ref: https://ai.google.dev/gemini-api/docs/models

export const MODEL_POLICY_NOTE =
  "Todos os modelos estão fixados na versão mais barata da família. " +
  "Aliases `-latest` são proibidos porque o Google os aponta para a versão mais nova (mais cara). " +
  "Texto: gemini-2.5-flash-lite. Imagem: gemini-2.5-flash-image. TTS: gemini-2.5-flash-preview-tts.";


export type ModelKind = "text" | "image" | "tts";

export interface FunctionUsage {
  fn: string;
  kind: ModelKind;
  purpose: string;
}

export const ACTIVE_MODELS = {
  text: {
    id: "gemini-2.5-flash-lite",
    gateway: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    category: "Texto (chat, análise, extração, JSON)",
    docs: "https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-lite",
  },
  image: {
    id: "gemini-2.5-flash-image",
    gateway: "google/gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image (Nano Banana)",
    category: "Geração/edição de imagem",
    docs: "https://ai.google.dev/gemini-api/docs/image-generation",
  },
  tts: {
    id: "gemini-2.5-flash-preview-tts",
    gateway: "—",
    label: "Gemini 2.5 Flash TTS",
    category: "Áudio (narração / boletins)",
    docs: "https://ai.google.dev/gemini-api/docs/speech-generation",
  },
} as const;

export const FUNCTIONS_USAGE: FunctionUsage[] = [
  { fn: "assistente-juridica", kind: "text", purpose: "Assistente jurídico principal (Q&A)" },
  { fn: "biblioteca-buscar-web", kind: "text", purpose: "Grounding + estruturação de resultados" },
  { fn: "biblioteca-enriquecer", kind: "text", purpose: "Enriquecimento de metadados de livros" },
  { fn: "biblioteca-enriquecer", kind: "image", purpose: "Capa de livro" },
  { fn: "blog-edicao-gerar-temas", kind: "text", purpose: "Sugestão de pautas para o blog" },
  { fn: "blog-edicao-runner", kind: "text", purpose: "Redação de artigos do blog" },
  { fn: "blog-edicao-runner", kind: "image", purpose: "Capa dos artigos" },
  { fn: "boletim-juridico-gerar", kind: "text", purpose: "Roteiro do boletim jurídico diário" },
  { fn: "boletim-juridico-gerar", kind: "tts", purpose: "Narração do boletim" },
  { fn: "boletim-youtube-upload", kind: "image", purpose: "Thumbnail do boletim no YouTube" },
  { fn: "gerar-artigo-educacional", kind: "text", purpose: "Artigo educacional (feed)" },
  { fn: "gerar-estudo", kind: "text", purpose: "Plano de estudos" },
  { fn: "gerar-global", kind: "text", purpose: "Buscas globais estruturadas" },
  { fn: "gerar-imagem-slide", kind: "image", purpose: "Slides / imagens auxiliares" },
  { fn: "gerar-resumo", kind: "text", purpose: "Resumos de leis e artigos" },
  { fn: "gerar-videoaula-conteudo", kind: "text", purpose: "Roteiro de videoaulas" },
  { fn: "grifar-por-voz", kind: "text", purpose: "Grifado de trechos via áudio" },
  { fn: "grifo-foto", kind: "text", purpose: "OCR + grifado a partir de foto" },
  { fn: "hero-home-runner", kind: "image", purpose: "Imagem do hero da home" },
  { fn: "home-curiosidade-runner", kind: "text", purpose: "Curiosidades jurídicas da home" },
  { fn: "home-curiosidade-runner", kind: "image", purpose: "Ilustração das curiosidades" },
  { fn: "horus-webhook", kind: "text", purpose: "Horus (WhatsApp) — respostas do agente" },
  { fn: "identificar-artigos-foto", kind: "text", purpose: "Detectar artigos citados numa foto" },
  { fn: "mentor-chat", kind: "text", purpose: "Mentor jurídico (chat)" },
  { fn: "narrar-artigo", kind: "tts", purpose: "Narração de artigos" },
  { fn: "narrar-frase", kind: "tts", purpose: "Narração de frases curtas" },
  { fn: "popular-explicacoes", kind: "text", purpose: "Explicações dos artigos do vade mecum" },
  { fn: "popular-radar-proposicoes", kind: "text", purpose: "Resumos do radar de proposições" },
  { fn: "popular-texto-resenha", kind: "text", purpose: "Resenhas de textos legais" },
  { fn: "processar-pdf", kind: "text", purpose: "Extração/estruturação de PDFs" },
  
  { fn: "radar-leis-notify", kind: "text", purpose: "Resumo diário de leis publicadas" },
  { fn: "radar-leis-notify", kind: "image", purpose: "Capa do resumo diário" },
];

export const RATE_LIMITS = [
  { model: "Gemini 3.1 Flash Lite", rpm: "10K", tpm: "10M", rpd: "350K" },
  { model: "Gemini 2.5 Flash Lite", rpm: "10K", tpm: "10M", rpd: "Ilimitado" },
  { model: "Gemini 2.5 Flash TTS", rpm: "1K", tpm: "100K", rpd: "10K" },
  { model: "Gemini 3.5 Flash", rpm: "2K", tpm: "3M", rpd: "100K" },
  { model: "Gemini 2.5 Flash", rpm: "2K", tpm: "3M", rpd: "100K" },
  { model: "Nano Banana (Gemini 2.5 Flash Image)", rpm: "2K", tpm: "1.5M", rpd: "50K" },
  { model: "Gemini 2 Flash", rpm: "10K", tpm: "10M", rpd: "Ilimitado" },
];
