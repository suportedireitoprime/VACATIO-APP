// Langfuse tracer minimalista via API pública de ingestão.
// https://langfuse.com/docs/api — endpoint /api/public/ingestion aceita batch de eventos.
// Requer LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY e LANGFUSE_HOST (ex.: https://cloud.langfuse.com).

type GenerationInput = {
  name: string;
  model: string;
  input: unknown;
  output: unknown;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  usage?: { input?: number; output?: number; total?: number };
  startTime: string; // ISO
  endTime: string;   // ISO
  level?: "DEFAULT" | "ERROR" | "WARNING";
  statusMessage?: string;
};

function creds() {
  const pk = Deno.env.get("LANGFUSE_PUBLIC_KEY") || "";
  const sk = Deno.env.get("LANGFUSE_SECRET_KEY") || "";
  const host = (Deno.env.get("LANGFUSE_HOST") || "https://cloud.langfuse.com").replace(/\/$/, "");
  return { pk, sk, host, ok: !!(pk && sk) };
}

export function langfuseEnabled(): boolean {
  return creds().ok;
}

function uuid() {
  return crypto.randomUUID();
}

/** Envia trace+generation em uma request. Fire-and-forget, nunca lança. */
export async function traceGeneration(g: GenerationInput): Promise<void> {
  const c = creds();
  if (!c.ok) return;
  try {
    const traceId = uuid();
    const genId = uuid();
    const nowIso = new Date().toISOString();
    const body = {
      batch: [
        {
          id: uuid(),
          type: "trace-create",
          timestamp: nowIso,
          body: {
            id: traceId,
            name: g.name,
            userId: g.userId,
            sessionId: g.sessionId,
            metadata: g.metadata,
          },
        },
        {
          id: uuid(),
          type: "generation-create",
          timestamp: nowIso,
          body: {
            id: genId,
            traceId,
            name: g.name,
            model: g.model,
            input: g.input,
            output: g.output,
            startTime: g.startTime,
            endTime: g.endTime,
            level: g.level ?? "DEFAULT",
            statusMessage: g.statusMessage,
            usage: g.usage
              ? {
                  input: g.usage.input,
                  output: g.usage.output,
                  total: g.usage.total,
                  unit: "TOKENS",
                }
              : undefined,
            metadata: g.metadata,
          },
        },
      ],
    };
    const auth = "Basic " + btoa(`${c.pk}:${c.sk}`);
    const resp = await fetch(`${c.host}/api/public/ingestion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      console.warn("langfuse ingest fail", resp.status, await resp.text().catch(() => ""));
    }
  } catch (e) {
    console.warn("langfuse ingest error", String(e));
  }
}
