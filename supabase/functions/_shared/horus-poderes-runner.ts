// Runner de Poderes do Horus — detecta intenção por keywords e chama edge functions.
// Retorna um bloco de texto que será injetado no systemPrompt.

const FUNCTIONS_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type PoderRow = { slug: string; ativo: boolean };

async function callFn(name: string, body: unknown) {
  const t0 = Date.now();
  const resp = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, data, latency: Date.now() - t0 };
}

function has(text: string, ...kws: string[]) {
  const t = text.toLowerCase();
  return kws.some((k) => t.includes(k));
}

export type PoderesResult = { block: string; tools: string[]; latencyMs: number };

export async function runPoderes(
  admin: any,
  userPhone: string,
  userMessage: string,
): Promise<PoderesResult> {
  const t0 = Date.now();
  // 1) Carrega poderes ativos
  const { data: poderes } = await admin
    .from("horus_poderes")
    .select("slug, ativo")
    .eq("ativo", true);
  const active = new Set<string>((poderes || []).map((p: PoderRow) => p.slug));
  if (active.size === 0) return { block: "", tools: [], latencyMs: Date.now() - t0 };

  const blocks: string[] = [];
  const logs: Array<{ slug: string; ok: boolean; latency: number; error?: string }> = [];

  // 2) MEM0 — recall silencioso sempre que ativo
  if (active.has("mem0")) {
    try {
      const r = await callFn("poder-mem0", {
        action: "recall",
        user_phone: userPhone,
        query: userMessage,
        top_k: 3,
      });
      logs.push({ slug: "mem0", ok: r.ok, latency: r.latency, error: r.ok ? undefined : JSON.stringify(r.data) });
      const mems = (r.data?.memorias || []).filter((m: any) => (m.similarity ?? 0) > 0.6);
      if (mems.length) {
        blocks.push(
          "[MEMÓRIAS RELEVANTES DO USUÁRIO]\n" +
            mems.map((m: any) => `- ${m.texto}`).join("\n"),
        );
      }
    } catch (e) {
      logs.push({ slug: "mem0", ok: false, latency: 0, error: String(e) });
    }
  }

  // 3) BCB — Selic, IPCA, câmbio
  if (active.has("bcb")) {
    const tools: string[] = [];
    if (has(userMessage, "selic", "taxa básica", "juros básico")) tools.push("selic");
    if (has(userMessage, "ipca", "inflação")) tools.push("ipca");
    if (has(userMessage, "dólar", "dolar", "câmbio", "cambio", "cotação", "cotacao")) tools.push("cambio");
    for (const tool of tools) {
      const r = await callFn("poder-bcb", { tool });
      logs.push({ slug: "bcb", ok: r.ok, latency: r.latency });
      if (r.ok) blocks.push(`[BCB - ${tool.toUpperCase()}]\n${JSON.stringify(r.data)}`);
    }
  }

  // 4) BrasilAPI — feriados/CEP/CNPJ
  if (active.has("brasilapi")) {
    if (has(userMessage, "feriado", "prazo processual", "dias úteis", "dias uteis")) {
      const r = await callFn("poder-brasilapi", { tool: "feriados" });
      logs.push({ slug: "brasilapi", ok: r.ok, latency: r.latency });
      if (r.ok) blocks.push(`[FERIADOS NACIONAIS ${new Date().getFullYear()}]\n${JSON.stringify(r.data?.data?.slice(0, 20))}`);
    }
    const cep = userMessage.match(/\b\d{5}-?\d{3}\b/);
    if (cep) {
      const r = await callFn("poder-brasilapi", { tool: "cep", cep: cep[0] });
      logs.push({ slug: "brasilapi", ok: r.ok, latency: r.latency });
      if (r.ok) blocks.push(`[CEP ${cep[0]}]\n${JSON.stringify(r.data?.data)}`);
    }
    const cnpj = userMessage.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
    if (cnpj) {
      const r = await callFn("poder-brasilapi", { tool: "cnpj", cnpj: cnpj[0] });
      logs.push({ slug: "brasilapi", ok: r.ok, latency: r.latency });
      if (r.ok) blocks.push(`[CNPJ ${cnpj[0]}]\n${JSON.stringify(r.data?.data)}`);
    }
  }

  // 5) Wikipedia — quando parece dúvida conceitual "quem é / o que é / o que significa"
  if (active.has("wikipedia") && /^(quem (é|foi)|o que (é|significa|foram)|defina|conceito de|explique .{0,3}o que)/i.test(userMessage.trim())) {
    const q = userMessage.replace(/^(quem (é|foi)|o que (é|significa|foram)|defina|conceito de|explique .{0,3}o que)\s+/i, "").replace(/\?$/, "");
    if (q.length > 2) {
      const r = await callFn("poder-wikipedia", { query: q, sentences: 4 });
      logs.push({ slug: "wikipedia", ok: r.ok, latency: r.latency });
      if (r.ok && r.data?.found) {
        blocks.push(`[WIKIPEDIA — ${r.data.title}]\n${r.data.resumo}\nFonte: ${r.data.url}`);
      }
    }
  }

  // 6) Nager — feriados de outros anos ("feriados de 2027")
  if (active.has("nager")) {
    const m = userMessage.match(/feriados?.{0,20}(20\d{2})/i);
    if (m) {
      const r = await callFn("poder-nager", { year: Number(m[1]), country: "BR" });
      logs.push({ slug: "nager", ok: r.ok, latency: r.latency });
      if (r.ok) blocks.push(`[FERIADOS ${m[1]}]\n${JSON.stringify(r.data?.feriados?.slice(0, 20))}`);
    }
  }

  // Log das chamadas
  if (logs.length) {
    admin
      .from("horus_poderes_calls")
      .insert(
        logs.map((l) => ({
          poder_slug: l.slug,
          user_phone: userPhone,
          latency_ms: l.latency,
          ok: l.ok,
          error: l.error ?? null,
        })),
      )
      .then(() => {}, (e: any) => console.warn("poderes log fail", String(e)));
  }

  const toolsUsed = Array.from(new Set(logs.filter((l) => l.ok).map((l) => l.slug)));
  const latencyMs = Date.now() - t0;
  if (!blocks.length) return { block: "", tools: toolsUsed, latencyMs };
  return {
    block: "\n\n[CONHECIMENTO EM TEMPO REAL — use como fonte primária, cite quando relevante]\n" + blocks.join("\n\n"),
    tools: toolsUsed,
    latencyMs,
  };
}

// Salva memória depois de responder (fire-and-forget)
export async function saveMemoryAsync(userPhone: string, userMessage: string, assistantReply: string) {
  try {
    // heurística leve: só grava se a msg do usuário parece um fato pessoal
    const isFact = /(estudo|estou estudando|trabalho|sou|moro|minha|meu|prefiro|gosto|não gosto|meu nome)/i.test(userMessage);
    if (!isFact) return;
    const texto = userMessage.length > 240 ? userMessage.slice(0, 240) : userMessage;
    await fetch(`${FUNCTIONS_URL}/poder-mem0`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON}`,
        apikey: ANON,
      },
      body: JSON.stringify({ action: "save", user_phone: userPhone, texto, kind: "fact" }),
    });
  } catch (e) {
    console.warn("mem save fail", String(e));
  }
}
