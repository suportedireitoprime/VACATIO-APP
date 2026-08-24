/**
 * Modelos Gemini permitidos no app — FONTE ÚNICA DE VERDADE.
 *
 * Política oficial: TODA chamada de texto/multimodal usa
 * `gemini-flash-latest` (modelo estável, mais econômico e multimodal).
 *
 * Documentação canônica (também salva em `docs/gemini-flash-latest.md`):
 * https://ai.google.dev/gemini-api/docs/models/gemini-flash-latest?hl=pt-br
 *
 * PROIBIDO no app (denylist explícita):
 *  - `gemini-2.5-flash` (mais caro)
 *  - `gemini-2.5-pro`, `gemini-3-*`, `gemini-3.1-*` (mais caros)
 *  - `gemini-flash-latest`, `gemini-flash-lite-latest` e qualquer alias `-latest`
 *    (aliases resolvem para a versão mais nova, hoje 3.1 Flash Lite, mais cara)
 *
 * Exceções (não são texto, mantêm modelos próprios):
 *  - Imagem: `gemini-2.5-flash-image`
 *  - TTS:    `gemini-2.5-flash-preview-tts`
 */

export const MODELS = {
  text: "gemini-flash-latest",
  // Lovable AI Gateway só aceita ids da allowlist — "google/gemini-flash-latest" é rejeitado (400).
  textGateway: "google/gemini-3.6-flash",
  image: "gemini-2.5-flash-image",
  imageGateway: "google/gemini-2.5-flash-image",
  tts: "gemini-2.5-flash-preview-tts",
} as const;

// Único modelo de texto permitido — sem fallback silencioso para outros.
export const TEXT_MODEL_FALLBACKS = [
  "gemini-flash-latest",
] as const;

export const ALLOWED_TEXT_MODELS = new Set<string>([
  "gemini-flash-latest",
  "google/gemini-3.6-flash",
]);

// Aliases/modelos proibidos — se algum bater aqui, forçamos o modelo permitido.
const DENY_PATTERNS: RegExp[] = [
  /-latest$/i,               // qualquer alias -latest (resolve p/ 3.1)
  /gemini-3(\.|-)/i,          // gemini-3.x ou gemini-3-*
  /gemini-2\.5-pro/i,        // 2.5 Pro
  /gemini-2\.5-flash(?!-lite)(?!-image)(?!-preview-tts)/i, // 2.5 Flash "puro"
];

/**
 * Força qualquer id de modelo de texto para `gemini-flash-latest`.
 * Se o id vier na forma `google/...` (Lovable Gateway), preserva o prefixo.
 * Loga warning para qualquer tentativa fora da política.
 */
export function assertTextModel(id: string): string {
  const raw = String(id || "").trim();
  const isGateway = raw.startsWith("google/");
  const bare = isGateway ? raw.replace(/^google\//i, "") : raw;

  if (ALLOWED_TEXT_MODELS.has(raw)) return raw;

  const denied = DENY_PATTERNS.some((re) => re.test(bare));
  if (denied || !bare) {
    console.warn(
      `[ai-models] Modelo de texto "${raw}" bloqueado pela política. ` +
      `Forçando "${MODELS.text}". Ver docs/gemini-flash-latest.md`,
    );
  } else {
    console.warn(
      `[ai-models] Modelo de texto "${raw}" fora da allowlist. ` +
      `Forçando "${MODELS.text}".`,
    );
  }
  return isGateway ? MODELS.textGateway : MODELS.text;
}

/**
 * Helper: URL pronta para chamada REST direta ao Gemini
 * (`generativelanguage.googleapis.com`). Sempre injeta o modelo permitido.
 */
export function buildGeminiTextUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.text}:generateContent?key=${apiKey}`;
}

export type ModelKind = keyof typeof MODELS;
