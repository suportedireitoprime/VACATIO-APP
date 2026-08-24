// Edge Function: gera uma aula dinâmica da função Aprender a partir de um resumo jurídico.
// Modelo obrigatório: google/gemini-2.5-flash-lite (política do app).
//
// Fluxo:
// 1. Valida admin (email allowlist).
// 2. Carrega o resumo_juridico pelo id.
// 3. Garante que existam aprender_areas (por area) e aprender_modulos (por tema).
// 4. Chama a IA pedindo JSON estruturado com título, objetivo, duração e blocos.
// 5. Faz upsert da aula (por resumo_origem_id) e substitui os blocos.
// 6. Marca status='draft'. Publicação fica em ação separada (Fase 3).

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = new Set([
  "wn7corporation@gmail.com",
  "suporte.vacatio@gmail.com",
]);

const MODEL = "google/gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `Você é um professor de Direito criando uma AULA DINÂMICA para um app de estudo.
Recebe um resumo jurídico (área, tema, subtema, markdown, exemplos e termos) e devolve UM JSON com esta estrutura EXATA:

{
  "titulo": "string curta e didática (max 80 chars)",
  "objetivo": "1 frase dizendo o que o aluno vai aprender",
  "duracao_est_min": número inteiro entre 5 e 20,
  "blocos": [ ...entre 8 e 14 blocos, na ordem em que devem ser apresentados... ]
}

Cada bloco é um dos tipos abaixo (varie os tipos, intercale texto com interações):

1) Texto explicativo:
{ "tipo": "leitura", "payload": { "titulo": "string opcional", "conteudo": "markdown curto (1-3 parágrafos)" } }

2) Pergunta de múltipla escolha (uma correta):
{ "tipo": "pergunta",
  "payload": { "enunciado": "string", "opcoes": [ {"id":"a","texto":"..."}, {"id":"b","texto":"..."}, {"id":"c","texto":"..."}, {"id":"d","texto":"..."} ] },
  "resposta_correta": { "id_correto": "a|b|c|d", "explicacao": "por que essa é a certa" } }

3) Flashcard de revisão:
{ "tipo": "flashcard", "payload": { "frente": "termo ou pergunta", "verso": "definição ou resposta" } }

4) Conexão de termos (arraste e ligue):
{ "tipo": "conexao", "payload": { "pares": [ {"termo":"...","definicao":"..."}, {"termo":"...","definicao":"..."}, {"termo":"...","definicao":"..."} ] } }

REGRAS:
- Comece SEMPRE com um bloco "leitura" de abertura contextualizando o tema.
- Inclua no mínimo 2 blocos "pergunta", 2 "flashcard" e 1 "conexao" ao longo da aula.
- Termine SEMPRE com um bloco "leitura" de fechamento resumindo o que foi aprendido.
- Escreva em PT-BR jurídico, didático e claro. NÃO invente jurisprudência.
- Nunca use blocos fora dos 4 tipos acima.
- O campo "tipo" NUNCA pode ser "texto"; use "leitura" para conteúdo textual.
- Responda APENAS com o JSON, sem texto extra.`;

function slugify(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "sem-titulo";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autenticação — precisa ser admin.
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userRes } = await authClient.auth.getUser();
    const email = userRes?.user?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.has(email)) {
      return new Response(JSON.stringify({ error: "apenas administradores" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { resumo_id } = await req.json();
    if (!resumo_id || typeof resumo_id !== "string") {
      return new Response(JSON.stringify({ error: "resumo_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: resumo, error: resErr } = await admin
      .from("resumos_juridicos")
      .select("id, area, tema, subtema, markdown, exemplos, termos, ordem_tema, ordem_subtema")
      .eq("id", resumo_id)
      .maybeSingle();
    if (resErr || !resumo) {
      return new Response(JSON.stringify({ error: "resumo não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) upsert area
    const areaSlug = slugify(resumo.area);
    let areaId: string;
    {
      const { data: existing } = await admin
        .from("aprender_areas").select("id").eq("slug", areaSlug).maybeSingle();
      if (existing?.id) {
        areaId = existing.id;
      } else {
        const { data: created, error } = await admin
          .from("aprender_areas")
          .insert({ slug: areaSlug, nome: resumo.area, ordem: 0 })
          .select("id").single();
        if (error) throw error;
        areaId = created.id;
      }
    }

    // 2) upsert modulo (por tema dentro da area)
    const moduloSlug = slugify(`${resumo.area}-${resumo.tema}`);
    let moduloId: string;
    {
      const { data: existing } = await admin
        .from("aprender_modulos").select("id").eq("slug", moduloSlug).maybeSingle();
      if (existing?.id) {
        moduloId = existing.id;
      } else {
        const { data: created, error } = await admin
          .from("aprender_modulos")
          .insert({
            area_id: areaId,
            slug: moduloSlug,
            titulo: resumo.tema,
            ordem: resumo.ordem_tema ?? 0,
          })
          .select("id").single();
        if (error) throw error;
        moduloId = created.id;
      }
    }

    // 3) chama IA
    const userContent = [
      `Área: ${resumo.area}`,
      `Tema: ${resumo.tema}`,
      resumo.subtema ? `Subtema: ${resumo.subtema}` : "",
      "",
      "Resumo (markdown):",
      String(resumo.markdown || "").slice(0, 20000),
      "",
      resumo.exemplos ? `Exemplos:\n${String(resumo.exemplos).slice(0, 4000)}` : "",
      resumo.termos ? `Termos:\n${String(resumo.termos).slice(0, 4000)}` : "",
    ].filter(Boolean).join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text().catch(() => "");
      return new Response(JSON.stringify({ error: "IA falhou", status: aiRes.status, detail }), {
        status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      return new Response(JSON.stringify({ error: "resposta da IA não é JSON válido", raw }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const titulo = String(parsed.titulo || resumo.subtema || resumo.tema).slice(0, 200);
    const objetivo = parsed.objetivo ? String(parsed.objetivo).slice(0, 500) : null;
    const duracao = Math.max(3, Math.min(30, Number(parsed.duracao_est_min) || 8));
    const blocos = Array.isArray(parsed.blocos) ? parsed.blocos : [];
    if (blocos.length < 3) {
      return new Response(JSON.stringify({ error: "IA retornou poucos blocos", parsed }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aulaSlug = slugify(`${resumo.tema}-${resumo.subtema || ""}-${resumo_id.slice(0, 6)}`);

    // 4) upsert aula por resumo_origem_id
    const { data: existingAula } = await admin
      .from("aprender_aulas").select("id").eq("resumo_origem_id", resumo_id).maybeSingle();

    let aulaId: string;
    if (existingAula?.id) {
      aulaId = existingAula.id;
      await admin.from("aprender_aulas").update({
        modulo_id: moduloId,
        slug: aulaSlug,
        titulo,
        objetivo,
        duracao_est_min: duracao,
        ordem: resumo.ordem_subtema ?? 0,
        status: "draft",
        modelo_ia: MODEL,
        gerada_em: new Date().toISOString(),
      }).eq("id", aulaId);
      await admin.from("aprender_blocos").delete().eq("aula_id", aulaId);
    } else {
      const { data: created, error } = await admin
        .from("aprender_aulas")
        .insert({
          modulo_id: moduloId,
          slug: aulaSlug,
          titulo,
          objetivo,
          duracao_est_min: duracao,
          ordem: resumo.ordem_subtema ?? 0,
          status: "draft",
          resumo_origem_id: resumo_id,
          modelo_ia: MODEL,
          gerada_em: new Date().toISOString(),
        })
        .select("id").single();
      if (error) throw error;
      aulaId = created.id;
    }

    // 5) blocos: sanitiza e insere
    // Mapeia qualquer variação retornada pela IA para os tipos aceitos pelo CHECK constraint da tabela.
    // O banco aceita apenas: intro, leitura, conceito, pergunta, exemplo, conexao, flashcard, conclusao.
    const tipoMap: Record<string, string> = {
      texto: "leitura",
      text: "leitura",
      explicacao: "leitura",
      explicação: "leitura",
      conteudo: "leitura",
      conteúdo: "leitura",
      leitura: "leitura",
      intro: "intro",
      introducao: "intro",
      introdução: "intro",
      conceito: "conceito",
      exemplo: "exemplo",
      conclusao: "conclusao",
      conclusão: "conclusao",
      pergunta: "pergunta",
      quiz: "pergunta",
      flashcard: "flashcard",
      conexao: "conexao",
      conexão: "conexao",
    };
    const VALID = new Set(["intro","leitura","conceito","pergunta","exemplo","conexao","flashcard","conclusao"]);
    const rows = blocos
      .filter((b: any) => b && typeof b === "object")
      .map((b: any, i: number) => {
        const raw = String(b.tipo ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
          .toLowerCase();
        const mapped = tipoMap[raw] ?? (VALID.has(raw) ? raw : "leitura");
        return {
          aula_id: aulaId,
          ordem: i,
          tipo: mapped,
          payload: b.payload ?? {},
          resposta_correta: b.resposta_correta ?? null,
        };
      });


    if (rows.length > 0) {
      const { error: bErr } = await admin.from("aprender_blocos").insert(rows);
      if (bErr) throw bErr;
    }

    return new Response(JSON.stringify({
      ok: true,
      aula_id: aulaId,
      titulo,
      blocos: rows.length,
      status: "draft",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[gerar-aula-aprender]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
