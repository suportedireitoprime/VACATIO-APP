// Utilitários compartilhados de Blog Edição
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/**
 * Chama LLM via Lovable AI Gateway (OpenAI-compatível).
 * `model` deve ser um id do catálogo (ex.: "google/gemini-2.5-flash-lite").
 * Aceita ids antigos sem prefixo (ex.: "gemini-2.5-flash-lite") e normaliza.
 * O parâmetro `apiKey` é mantido por compat, mas usamos LOVABLE_API_KEY.
 * `context` (opcional): registra em ai_usage_log — { functionName, triggerType, refId }.
 */
export async function callGemini(
  _apiKey: string,
  prompt: string,
  model = "google/gemini-2.5-flash-lite",
  maxTokens = 8192,
  context?: { functionName?: string; triggerType?: "manual" | "auto"; refId?: string | null },
): Promise<string> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY ausente no ambiente");

  // Normaliza ids legados salvos no banco
  let normalized = model;
  if (!normalized.includes("/")) {
    if (normalized.startsWith("gemini")) normalized = `google/${normalized}`;
    else if (normalized.startsWith("gpt")) normalized = `openai/${normalized}`;
  }
  // O Gateway só aceita ids da allowlist: aliases "-latest" (salvos no banco em
  // configs antigas) devolvem 400. Cai para o flash-lite (mais barato).
  const GATEWAY_TEXT_ALLOWED = new Set([
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.5-pro",
    "google/gemini-3-flash-preview",
    "google/gemini-3.1-flash-lite",
    "openai/gpt-5-mini",
  ]);
  if (!GATEWAY_TEXT_ALLOWED.has(normalized)) {
    console.warn(`[blog-edicao] modelo "${normalized}" fora da allowlist do Gateway; usando google/gemini-2.5-flash-lite`);
    normalized = "google/gemini-2.5-flash-lite";
  }

  const startedAt = Date.now();
  let success = true;
  let errMsg: string | undefined;
  let inputUnits = 0;
  let outputUnits = 0;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: normalized,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.85,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      success = false;
      errMsg = `AI Gateway ${res.status}: ${errText}`.slice(0, 500);
      throw new Error(errMsg);
    }
    const data = await res.json();
    inputUnits  = Number(data?.usage?.prompt_tokens ?? 0) || 0;
    outputUnits = Number(data?.usage?.completion_tokens ?? 0) || 0;
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    if (context?.functionName) {
      try {
        const { logAiCall } = await import("./ai-log.ts");
        await logAiCall({
          functionName: context.functionName,
          kind: "text",
          model: normalized,
          triggerType: context.triggerType ?? "auto",
          inputUnits,
          outputUnits,
          durationMs: Date.now() - startedAt,
          success,
          error: errMsg,
          refId: context.refId ?? null,
        });
      } catch { /* noop */ }
    }
  }
}
