// Tarifas (USD) por 1M unidades (tokens/chars/pages) ou por imagem gerada.
// Fonte: preços oficiais Gemini/OpenAI/Mistral (jul/2026). Ajustar aqui quando mudarem.

export type AiKind = "text" | "image" | "tts" | "stt" | "embedding" | "ocr" | "vision";

type PriceRow = {
  kind: AiKind;
  // Para text/embedding/stt/vision: USD por 1M tokens.
  // Para tts: USD por 1M chars de entrada.
  inputPerMillion?: number;
  outputPerMillion?: number;
  // Para image: USD por imagem gerada.
  perImage?: number;
  // Para ocr: USD por página processada.
  perPage?: number;
  // Para stt (audio): USD por minuto (alternativa a inputPerMillion).
  perMinute?: number;
};

// Chave = model id normalizado (sem prefixo de vendor).
const PRICES: Record<string, PriceRow> = {
  // ===== Gemini Texto =====
  "gemini-2.5-flash-lite":       { kind: "text", inputPerMillion: 0.10, outputPerMillion: 0.40 },
  "gemini-2.5-flash":            { kind: "text", inputPerMillion: 0.30, outputPerMillion: 2.50 },
  "gemini-2.5-pro":              { kind: "text", inputPerMillion: 1.25, outputPerMillion: 10.00 },
  "gemini-3-flash-preview":      { kind: "text", inputPerMillion: 0.30, outputPerMillion: 2.50 },
  "gemini-3.1-flash-lite":       { kind: "text", inputPerMillion: 0.10, outputPerMillion: 0.40 },

  // ===== Gemini Vision (usa mesmo preço de texto do modelo) =====
  // (fica separado como "vision" pra segmentar no dashboard)

  // ===== Gemini Imagem =====
  "gemini-2.5-flash-image":      { kind: "image", perImage: 0.039 },
  "gemini-3-pro-image":          { kind: "image", perImage: 0.12 },

  // ===== Gemini TTS =====
  "gemini-2.5-flash-preview-tts": { kind: "tts", inputPerMillion: 10.00 },
  "gemini-2.5-pro-preview-tts":   { kind: "tts", inputPerMillion: 20.00 },

  // ===== Gemini Embedding =====
  "text-embedding-004":          { kind: "embedding", inputPerMillion: 0.02 },

  // ===== OpenAI (via Lovable Gateway) =====
  "gpt-4o-mini-transcribe":      { kind: "stt", perMinute: 0.003 },
  "whisper-1":                   { kind: "stt", perMinute: 0.006 },
  "gpt-4o-mini":                 { kind: "text", inputPerMillion: 0.15, outputPerMillion: 0.60 },

  // ===== Mistral =====
  "mistral-ocr-latest":          { kind: "ocr", perPage: 0.001 },
  "mistral-ocr-2505":            { kind: "ocr", perPage: 0.001 },

  // ===== Perplexity =====
  "sonar":                       { kind: "text", inputPerMillion: 1.00, outputPerMillion: 1.00 },
  "sonar-pro":                   { kind: "text", inputPerMillion: 3.00, outputPerMillion: 15.00 },
};

function normalize(model: string): string {
  return model.replace(/^[a-z]+\//, "").trim();
}

export function priceFor(model: string): PriceRow | null {
  return PRICES[normalize(model)] ?? null;
}

export function calcCostUsd(model: string, inputUnits: number, outputUnits: number): number {
  const p = priceFor(model);
  if (!p) return 0;
  if (p.kind === "image" && p.perImage) {
    return +(p.perImage * Math.max(1, outputUnits || 1)).toFixed(6);
  }
  if (p.kind === "ocr" && p.perPage) {
    return +(p.perPage * Math.max(1, inputUnits || 1)).toFixed(6);
  }
  if (p.kind === "stt" && p.perMinute) {
    // inputUnits = segundos, outputUnits = 0
    const minutes = Math.max(0.01, (inputUnits || 0) / 60);
    return +(p.perMinute * minutes).toFixed(6);
  }
  const inCost  = ((p.inputPerMillion  ?? 0) * inputUnits)  / 1_000_000;
  const outCost = ((p.outputPerMillion ?? 0) * outputUnits) / 1_000_000;
  return +(inCost + outCost).toFixed(6);
}
