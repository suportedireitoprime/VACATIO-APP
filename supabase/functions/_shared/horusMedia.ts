// Helpers para o Horus entender áudio, imagem e PDF recebidos via WhatsApp.
//
// Usa a API do Gemini diretamente (GEMINI_API_KEY / GEMINI_API_KEY_RESERVA),
// via geminiFetch — mesma chave usada no chat jurídico. Modelo:
// gemini-flash-latest (multimodal: aceita image, audio e PDF inline).
//
// Endpoint: generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
// Payload multimodal: parts[].inlineData = { mimeType, data (base64 puro) }.
//
// Todos falham "graciosamente": retornam string vazia e registram o motivo
// em ai_usage_log + console.warn — o webhook decide como avisar o usuário.

import { logAiCall } from "./ai-log.ts";
import { geminiFetch } from "./geminiFetch.ts";
import { MODELS } from "./ai-models.ts";

const MODEL = MODELS.text; // "gemini-flash-latest"
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function cleanB64(base64: string): string {
  return base64.replace(/^data:[^;]+;base64,/, "");
}

// Fallback: quando o Gemini direto falha (chave inválida, quota, 5xx),
// refaz a chamada multimodal pelo Lovable AI Gateway.
async function callGateway(
  base64: string,
  mimetype: string,
  instruction: string,
  kind: "stt" | "vision" | "ocr",
): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY") || "";
  if (!key || !base64) return "";
  const data = cleanB64(base64);

  let part: any;
  if (kind === "stt") {
    const fmt = /mp3|mpeg/i.test(mimetype) ? "mp3"
      : /wav/i.test(mimetype) ? "wav"
      : /mp4|m4a/i.test(mimetype) ? "m4a"
      : /ogg|opus/i.test(mimetype) ? "ogg"
      : "webm";
    part = { type: "input_audio", input_audio: { data, format: fmt } };
  } else if (kind === "vision") {
    part = { type: "image_url", image_url: { url: `data:${mimetype || "image/jpeg"};base64,${data}` } };
  } else {
    part = { type: "file", file: { filename: "documento.pdf", file_data: `data:${mimetype || "application/pdf"};base64,${data}` } };
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "user", content: [part, { type: "text", text: instruction }] }],
      }),
    });
    if (!res.ok) {
      console.warn(`horusMedia ${kind} gateway failed`, res.status, (await res.text()).slice(0, 240));
      return "";
    }
    const json = await res.json();
    return String(json?.choices?.[0]?.message?.content || "").trim();
  } catch (e) {
    console.warn(`horusMedia ${kind} gateway error`, (e as Error).message);
    return "";
  }
}

async function callGemini(
  base64: string,
  mimetype: string,
  instruction: string,
  kind: "stt" | "vision" | "ocr",
): Promise<string> {
  if (!base64) return "";
  const primary = Deno.env.get("GEMINI_API_KEY") ?? "";
  const reserva = Deno.env.get("GEMINI_API_KEY_RESERVA") ?? "";
  if (!primary && !reserva) {
    console.warn(`horusMedia ${kind}: GEMINI_API_KEY ausente — usando gateway`);
    return await callGateway(base64, mimetype, instruction, kind);
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mimetype, data: cleanB64(base64) } },
          { text: instruction },
        ],
      },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
  };

  const startedAt = Date.now();
  let success = true;
  let errMsg: string | undefined;
  let inputUnits = 0;
  let outputUnits = 0;
  let text = "";
  try {
    const url = `${ENDPOINT}?key=${encodeURIComponent(primary || reserva)}`;
    const res = await geminiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      success = false;
      errMsg = `${res.status}: ${(await res.text()).slice(0, 240)}`;
      console.warn(`horusMedia ${kind} failed`, errMsg);
      return await callGateway(base64, mimetype, instruction, kind);
    }
    const data = await res.json();
    inputUnits = Number(data?.usageMetadata?.promptTokenCount ?? 0) || 0;
    outputUnits = Number(data?.usageMetadata?.candidatesTokenCount ?? 0) || 0;
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    text = parts.map((p: any) => p?.text || "").join("").trim();
    if (text) return text;
    return await callGateway(base64, mimetype, instruction, kind);
  } catch (e) {
    success = false;
    errMsg = (e as Error).message;
    console.warn(`horusMedia ${kind} error`, errMsg);
    return await callGateway(base64, mimetype, instruction, kind);
  } finally {
    await logAiCall({
      functionName: "horus-webhook",
      kind,
      model: MODEL,
      triggerType: "manual",
      inputUnits, outputUnits,
      durationMs: Date.now() - startedAt,
      success, error: errMsg,
    });
  }
}

/** Transcreve áudio (Gemini nativo aceita ogg/opus, mp3, m4a, wav, webm). */
export function transcribeAudio(base64: string, mimetype: string): Promise<string> {
  return callGemini(
    base64,
    mimetype || "audio/ogg",
    "Transcreva LITERALMENTE em português o áudio anexado. Retorne apenas o texto transcrito, sem comentários ou formatação adicional.",
    "stt",
  );
}

/** Descreve imagem + extrai texto visível (OCR leve), com foco jurídico. */
export function describeImage(base64: string, mimetype: string): Promise<string> {
  return callGemini(
    base64,
    mimetype || "image/jpeg",
    "Você é o Horus, assistente jurídico. Analise a imagem em português e retorne:\n" +
      "1) DESCRIÇÃO: o que aparece na imagem (objetos, pessoas, cenário, contexto).\n" +
      "2) TEXTO: transcreva LITERALMENTE todo texto visível (OCR completo, sem resumir).\n" +
      "3) RELEVÂNCIA JURÍDICA: aponte se há conteúdo jurídico (documento, contrato, petição, decisão, lei, print de processo, notificação, boleto, contracheque, RG/CNH etc.) e quais pontos merecem atenção.\n" +
      "Seja objetivo. Se a imagem NÃO tiver relação jurídica, diga isso claramente ao final para que eu possa perguntar ao usuário o que ele quer que eu analise.",
    "vision",
  );
}

/** Extrai o texto de um PDF (OCR quando necessário). */
export function extractPdfText(base64: string, mimetype: string): Promise<string> {
  return callGemini(
    base64,
    mimetype || "application/pdf",
    "Extraia o texto principal deste PDF em português, mantendo a ordem lógica. Ignore cabeçalhos/rodapés repetidos. Se houver muitas páginas, resuma cada uma em 1–2 frases mantendo os pontos jurídicos importantes.",
    "ocr",
  );
}
