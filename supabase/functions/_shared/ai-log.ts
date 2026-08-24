// Helper para registrar cada chamada de IA em `ai_usage_log`.
// Uso: dentro da edge function, após a chamada ao modelo:
//   await logAiCall({ functionName: "blog-narrar-artigo", kind: "tts", model: MODELS.tts, ... });
// Nunca lança — se falhar, apenas registra no console.

import { createClient } from "npm:@supabase/supabase-js@2";
import { calcCostUsd, type AiKind } from "./ai-prices.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

let _client: ReturnType<typeof createClient> | null = null;
function client() {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export type TriggerType = "manual" | "auto";

export interface LogAiCallInput {
  functionName: string;
  kind: AiKind;
  model: string;
  triggerType?: TriggerType;
  inputUnits?: number;
  outputUnits?: number;
  costUsd?: number; // se você já calculou; senão, calcula com ai-prices
  durationMs?: number;
  success?: boolean;
  error?: string;
  userId?: string | null;
  refId?: string | null;
}

export async function logAiCall(input: LogAiCallInput): Promise<void> {
  try {
    const inputUnits  = Math.max(0, Math.floor(input.inputUnits  ?? 0));
    const outputUnits = Math.max(0, Math.floor(input.outputUnits ?? 0));
    const costUsd = input.costUsd ?? calcCostUsd(input.model, inputUnits, outputUnits);
    await client().from("ai_usage_log").insert({
      function_name: input.functionName,
      kind: input.kind,
      model: input.model,
      trigger_type: input.triggerType ?? "auto",
      input_units: inputUnits,
      output_units: outputUnits,
      cost_usd: costUsd,
      duration_ms: input.durationMs ?? null,
      success: input.success ?? true,
      error: input.error ?? null,
      user_id: input.userId ?? null,
      ref_id: input.refId ?? null,
    });
  } catch (e) {
    console.warn("[ai-log] failed", (e as Error)?.message ?? e);
  }
}

// Deduz trigger_type a partir do payload/headers de uma edge function.
// Se o body inclui `manual: true` ou `trigger: 'manual'`, é manual.
// Se o header `x-scheduled` ou `x-cron` está presente, é auto.
export function detectTrigger(payload: unknown, req?: Request): TriggerType {
  try {
    if (req?.headers.get("x-scheduled") || req?.headers.get("x-cron")) return "auto";
    if (req?.headers.get("x-trigger") === "manual") return "manual";
    if (req?.headers.get("x-trigger") === "auto") return "auto";
    const p = (payload ?? {}) as Record<string, unknown>;
    if (p.manual === true) return "manual";
    if (p.trigger === "manual") return "manual";
    if (p.trigger === "auto") return "auto";
  } catch { /* noop */ }
  return "auto";
}

// Extrai tokens de uma resposta Gemini (v1beta generateContent).
export function extractGeminiUsage(data: any): { inputUnits: number; outputUnits: number } {
  const u = data?.usageMetadata ?? {};
  return {
    inputUnits:  Number(u?.promptTokenCount ?? 0) || 0,
    outputUnits: Number(u?.candidatesTokenCount ?? u?.totalTokenCount ?? 0) || 0,
  };
}

// Extrai tokens de uma resposta OpenAI-compatível (Lovable Gateway).
export function extractOpenAiUsage(data: any): { inputUnits: number; outputUnits: number } {
  const u = data?.usage ?? {};
  return {
    inputUnits:  Number(u?.prompt_tokens ?? u?.input_tokens ?? 0) || 0,
    outputUnits: Number(u?.completion_tokens ?? u?.output_tokens ?? 0) || 0,
  };
}

// Wrapper de conveniência para envolver uma chamada de IA com timing + log.
// Uso:
//   const result = await withAiLog(
//     { functionName: "meu-endpoint", kind: "text", model: "gemini-2.5-flash-lite", triggerType: "manual" },
//     async () => {
//       const res = await fetch(...);
//       const data = await res.json();
//       return { data, usage: extractGeminiUsage(data) };
//     },
//   );
export async function withAiLog<T extends { usage?: { inputUnits: number; outputUnits: number }, data?: unknown }>(
  ctx: Omit<LogAiCallInput, "durationMs" | "success" | "error" | "inputUnits" | "outputUnits">,
  fn: () => Promise<T>,
): Promise<T extends { data: infer D } ? D : unknown> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    const usage = (result as any)?.usage ?? { inputUnits: 0, outputUnits: 0 };
    await logAiCall({
      ...ctx,
      inputUnits: usage.inputUnits,
      outputUnits: usage.outputUnits,
      durationMs: Date.now() - startedAt,
      success: true,
    });
    return (result as any)?.data ?? (result as unknown);
  } catch (e) {
    await logAiCall({
      ...ctx,
      durationMs: Date.now() - startedAt,
      success: false,
      error: String((e as Error)?.message ?? e).slice(0, 500),
    });
    throw e;
  }
}

