// Analisa o sumário/estrutura de um livro (biblioteca_leitura_nativa) e
// devolve uma lista de aulas sugeridas (titulo_melhorado, resumo_capitulo,
// capitulo_ref) para o admin aprovar antes de gerar as aulas.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = new Set(["wn7corporation@gmail.com", "suporte.vacatio@gmail.com", "wn7juridico@gmail.com"]);
const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5-mini",
];

const SYSTEM_PROMPT = `Você é um professor de Direito planejando um CURSO em vídeo-aula a partir de um LIVRO jurídico.
Recebe o SUMÁRIO (índice) e um trecho do conteúdo do livro. Sua tarefa:

1. Identificar os capítulos/tópicos que farão sentido como AULAS individuais (5 a 20 aulas).
2. Melhorar o título de cada aula para ser CLARO, DIDÁTICO e ATRAENTE em PT-BR (máx 80 chars).
3. Escrever um resumo de 2-3 frases do que a aula deve cobrir.
4. Ordenar do introdutório ao avançado.

Responda EXATAMENTE com este JSON, sem texto extra:
{
  "aulas": [
    {
      "ordem": 1,
      "titulo_original": "string exato do sumário",
      "titulo_melhorado": "string didática",
      "resumo_capitulo": "2-3 frases",
      "capitulo_ref": { "pagina_inicio": null, "pagina_fim": null, "path": "1.1" }
    }
  ]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = requireEnv("SUPABASE_URL");
    const SERVICE_ROLE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = requireEnv("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "não autenticado" }, 401);
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userRes } = await authClient.auth.getUser();
    const email = userRes?.user?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.has(email)) return json({ error: "apenas administradores" }, 403);

    const body = await req.json().catch(() => ({}));
    const { livro_nativa_id, area_id } = body;
    if (!livro_nativa_id) return json({ error: "livro_nativa_id obrigatório" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: livro, error: lErr } = await admin
      .from("biblioteca_leitura_nativa")
      .select("id, livro_id, livro_tabela, sumario_json, capitulos_json, conteudo_md, conteudo_md_refinado, status, refino_status")
      .eq("id", livro_nativa_id)
      .maybeSingle();
    if (lErr || !livro) return json({ error: "livro OCR não encontrado" }, 404);
    if (livro.status !== "pronto" && livro.refino_status !== "pronto") {
      return json({ error: "OCR do livro ainda não está pronto" }, 400);
    }

    const sumario = livro.capitulos_json || livro.sumario_json || null;
    const conteudo = String(livro.conteudo_md_refinado || livro.conteudo_md || "").slice(0, 45000);
    const resolvedAreaId = await resolveAreaId(admin, area_id, livro);

    const userContent = [
      sumario ? `SUMÁRIO EXTRAÍDO (JSON):\n${JSON.stringify(sumario).slice(0, 8000)}` : "SUMÁRIO EXTRAÍDO: (não estruturado)",
      "",
      "CONTEÚDO DO LIVRO (trecho):",
      conteudo,
    ].join("\n");

    let aulas: any[] = [];
    let lastRaw: any = null;
    let lastStatus = 0;
    outer: for (const model of MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
            response_format: { type: "json_object" },
          }),
        });
        lastStatus = aiRes.status;
        if (aiRes.status === 402) {
          const detail = await aiRes.text().catch(() => "");
          return json({ error: "Créditos esgotados no Lovable AI", detail }, 402);
        }
        if (aiRes.status === 429) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        if (!aiRes.ok) {
          const detail = await aiRes.text().catch(() => "");
          lastRaw = { status: aiRes.status, detail };
          break; // próximo modelo
        }
        const aiJson = await aiRes.json();
        lastRaw = aiJson;
        const choice = aiJson?.choices?.[0];
        const finish = choice?.finish_reason;
        const innerErr = choice?.error;
        if (innerErr?.code === 429 || finish === "error") {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        let parsed: any = {};
        try { parsed = JSON.parse(choice?.message?.content ?? "{}"); } catch { parsed = {}; }
        const arr: any[] = Array.isArray(parsed.aulas) ? parsed.aulas : [];
        if (arr.length > 0) { aulas = arr; break outer; }
        // resposta vazia — tenta próximo modelo
        break;
      }
    }
    if (aulas.length === 0) {
      return json({ error: "IA não retornou aulas (rate limit ou resposta vazia após retries)", status: lastStatus, raw: lastRaw }, 502);
    }

    // limpa sugestões antigas não aprovadas do mesmo livro
    await admin.from("aprender_sumario_sugerido")
      .delete()
      .eq("livro_id", livro_nativa_id)
      .eq("aprovado", false);

    const rows = aulas.map((a, i) => ({
      livro_id: livro_nativa_id,
      area_id: resolvedAreaId,
      ordem: Number(a.ordem ?? i + 1),
      titulo_original: a.titulo_original ? String(a.titulo_original).slice(0, 300) : null,
      titulo_melhorado: String(a.titulo_melhorado || a.titulo_original || `Aula ${i + 1}`).slice(0, 300),
      resumo_capitulo: a.resumo_capitulo ? String(a.resumo_capitulo).slice(0, 2000) : null,
      capitulo_ref: a.capitulo_ref ?? null,
      aprovado: false,
    }));

    const { data: inseridas, error: insErr } = await admin
      .from("aprender_sumario_sugerido")
      .insert(rows)
      .select("id, ordem, titulo_melhorado");
    if (insErr) throw insErr;

    return json({ ok: true, total: inseridas?.length ?? 0, aulas: inseridas });
  } catch (e: any) {
    console.error("[analisar-sumario-livro]", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} ausente`);
  return value;
}

async function resolveAreaId(admin: any, bodyAreaId: unknown, livro: any): Promise<string | null> {
  if (typeof bodyAreaId === "string" && bodyAreaId.trim()) return bodyAreaId;
  if (!["biblioteca_estudos", "areas"].includes(livro?.livro_tabela) || !livro?.livro_id) return null;
  const bibliotecaId = Number(livro.livro_id);
  if (!Number.isFinite(bibliotecaId)) return null;

  const { data: biblioteca } = await admin
    .from("biblioteca_estudos")
    .select("area")
    .eq("id", bibliotecaId)
    .maybeSingle();
  const areaNome = typeof biblioteca?.area === "string" ? biblioteca.area : "";
  if (!areaNome) return null;

  const { data: area } = await admin
    .from("aprender_areas")
    .select("id")
    .ilike("nome", areaNome)
    .maybeSingle();
  return area?.id ?? null;
}
