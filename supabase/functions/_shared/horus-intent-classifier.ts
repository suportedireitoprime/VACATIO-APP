// Classificador de intenção via Gemini com structured output.
// Roda antes da resposta principal para decidir tom/tratamento.

import { geminiFetch } from "./geminiFetch.ts";

export type Intent =
  | "duvida_juridica"
  | "duvida_app"
  | "bate_papo"
  | "fora_escopo"
  | "ininteligivel"
  | "suporte";

export type ClassificationResult = {
  intent: Intent;
  confidence: number;
  redirect: boolean;
  raw?: unknown;
};

const SYSTEM = `Você é um classificador. Recebe UMA mensagem de usuário (WhatsApp, português).
Responda APENAS com JSON válido no formato:
{"intent":"...","confidence":0.0,"redirect":true|false}

Categorias:
- duvida_juridica: pergunta sobre lei, artigo, doutrina, conceito jurídico, caso hipotético
- duvida_app: pergunta sobre o app Vade Mecum Pro (funcionalidade, assinatura, bug)
- bate_papo: cumprimento, small talk, brincadeira, pergunta pessoal ao bot
- fora_escopo: pergunta séria mas fora do tema (política, medicina, receita, etc)
- ininteligivel: texto sem sentido, teclado batido, muito curto e vago
- suporte: reclamação, problema, pedido de ajuda urgente

confidence: 0.0 a 1.0.
redirect: true se a resposta ideal deve puxar de volta pro tema jurídico.`;

export async function classifyIntent(message: string): Promise<ClassificationResult> {
  const key = Deno.env.get("GEMINI_API_KEY") || "";
  const fallback: ClassificationResult = { intent: "duvida_juridica", confidence: 0.3, redirect: false };
  if (!key || !message) return fallback;

  const { TEXT_MODEL_FALLBACKS } = await import("./ai-models.ts");
  const { logAiCall } = await import("./ai-log.ts");
  const models = [...TEXT_MODEL_FALLBACKS];
  for (const model of models) {
    const startedAt = Date.now();
    let success = true;
    let errMsg: string | undefined;
    let inputUnits = 0;
    let outputUnits = 0;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await geminiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: message.slice(0, 500) }] }],
          systemInstruction: { parts: [{ text: SYSTEM }] },
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 100,
            responseMimeType: "application/json",
          },
        }),
      });
      if (!res.ok) { success = false; errMsg = `${res.status}`; continue; }
      const data = await res.json();
      inputUnits  = Number(data?.usageMetadata?.promptTokenCount ?? 0) || 0;
      outputUnits = Number(data?.usageMetadata?.candidatesTokenCount ?? 0) || 0;
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") || "";
      const parsed = JSON.parse(text);
      const intent = (["duvida_juridica","duvida_app","bate_papo","fora_escopo","ininteligivel","suporte"].includes(parsed?.intent)
        ? parsed.intent
        : "duvida_juridica") as Intent;
      return {
        intent,
        confidence: Number(parsed?.confidence ?? 0.5),
        redirect: Boolean(parsed?.redirect),
        raw: parsed,
      };
    } catch (e) {
      success = false;
      errMsg = String(e);
      console.warn("classifyIntent failed", model, errMsg);
    } finally {
      await logAiCall({
        functionName: "horus-intent-classifier",
        kind: "text",
        model,
        triggerType: "manual",
        inputUnits, outputUnits,
        durationMs: Date.now() - startedAt,
        success, error: errMsg,
      });
    }
  }
  return fallback;
}

// Decide se a intenção é "off-topic" para efeito de tracking de streak.
export function isOffTopic(intent: Intent): boolean {
  return intent === "bate_papo" || intent === "fora_escopo" || intent === "ininteligivel";
}
