// Gera uma AULA RICA a partir de uma sugestão de sumário (aprender_sumario_sugerido).
// - Usa APENAS o conteúdo do livro (biblioteca_leitura_nativa) como base.
// - Produz blocos ricos: leitura (markdown), citacao, artigo_lei, tabela,
//   mapa_mental, linha_tempo, destaque, pergunta, flashcard, conexao.


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAILS = new Set(["wn7corporation@gmail.com", "suporte.vacatio@gmail.com", "wn7juridico@gmail.com"]);
const MODEL = "google/gemini-2.5-flash";
// Ordem de tentativa: se o primeiro truncar/vier vazio, tenta o próximo.
const MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "openai/gpt-5-mini"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Aceita JSON puro, JSON dentro de ```fences``` e JSON TRUNCADO (resposta cortada
 * por limite de tokens): nesse caso corta no último bloco completo do array
 * "blocos" e fecha as chaves, preservando o que já foi gerado.
 */
function salvageJson(raw: unknown): any {
  let text = String(raw ?? "").trim();
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  if (start > 0) text = text.slice(start);
  try { return JSON.parse(text); } catch { /* segue para o resgate */ }

  // Resgate de truncamento: mantém apenas objetos completos dentro de "blocos".
  const key = text.indexOf('"blocos"');
  if (key === -1) return null;
  const arrStart = text.indexOf("[", key);
  if (arrStart === -1) return null;
  let depth = 0, inStr = false, esc = false, lastComplete = -1;
  for (let i = arrStart + 1; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) lastComplete = i; }
  }
  if (lastComplete === -1) return null;
  const head = text.slice(0, arrStart + 1);
  const items = text.slice(arrStart + 1, lastComplete + 1);
  try { return JSON.parse(`${head}${items}]}`); } catch { return null; }
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} ausente`);
  return value;
}

const SYSTEM_PROMPT = `Você é um professor de Direito criando uma AULA EXTREMAMENTE RICA, ENVOLVENTE E DIDÁTICA para um app de estudo.

Você recebe:
- Título e resumo da aula
- Trechos REAIS do LIVRO base (fonte única de verdade — use 100% do que estiver disponível)

FILOSOFIA:
- Foco desta etapa: TEORIA + DINÂMICAS VISUAIS. Não gere flashcards nem perguntas de múltipla escolha (isso é feito em outra etapa).
- Envolva o aluno: analogias, exemplos com personagens ("Joãozinho, servidor público…"), "e daí?", conexões cruzadas.
- Explique o PORQUÊ, não só o quê. Prefira aula LONGA e completa a curta e superficial.
- Nunca invente citações, artigos ou dados — se não está no livro, não use.

Devolva UM JSON com esta estrutura EXATA:
{
  "titulo": "string até 100 chars",
  "objetivo": "1 frase",
  "duracao_est_min": inteiro entre 15 e 50,
  "blocos": [ ...entre 18 e 26 blocos ordenados... ]
}

TIPOS DE BLOCO PERMITIDOS (varie, intercale teoria com dinâmica):

1) "leitura" — texto explicativo denso em MARKDOWN (## subtítulos, **negrito**, *itálico*, listas, > citações). 3-6 parágrafos, cada um com 3-6 frases.
   { "tipo":"leitura", "payload": { "titulo":"opcional", "conteudo":"markdown" } }

2) "citacao" — citação REAL do LIVRO.
   { "tipo":"citacao", "payload": { "texto":"...", "autor":"Nome (Obra, ano)" } }

3) "artigo_lei" — transcrição de artigo mencionado no livro.
   { "tipo":"artigo_lei", "payload": { "lei":"CF/88", "numero":"5º, LIV", "texto":"..." } }

4) "tabela" — comparativa (max 5 colunas x 6 linhas).
   { "tipo":"tabela", "payload": { "titulo":"opcional", "colunas":["A","B"], "linhas":[["...","..."]] } }

5) "mapa_mental" — hierárquico. 4-6 ramos, cada ramo com 3-5 itens no formato {termo, definicao}.
   { "tipo":"mapa_mental", "payload": {
       "raiz":"Tema central (2-4 palavras)",
       "definicao_raiz":"1 frase",
       "ramos":[ { "titulo":"...", "definicao":"...", "itens":[ { "termo":"...", "definicao":"..." } ] } ]
   } }

6) "mapa_conceitual" — nós ligados por RELAÇÕES rotuladas (é espécie de, pressupõe, gera, conflita com…).
   Use quando houver TEIA de conceitos que se conectam.
   { "tipo":"mapa_conceitual", "payload": {
       "titulo":"opcional",
       "nos":[ { "id":"a", "rotulo":"Ato administrativo", "definicao":"opcional 1 linha" } ],
       "arestas":[ { "de":"a", "para":"b", "relacao":"pressupõe" } ]
   } }

7) "fluxograma" — etapas sequenciais. Use tipos "inicio"|"processo"|"decisao"|"fim".
   { "tipo":"fluxograma", "payload": { "titulo":"opcional",
       "etapas":[ { "n":1, "titulo":"...", "descricao":"...", "tipo":"inicio|processo|decisao|fim" } ] } }

8) "linha_tempo" — eventos ordenados (evolução histórica/legislativa).
   { "tipo":"linha_tempo", "payload": { "titulo":"opcional",
       "eventos":[ { "marco":"1988", "titulo":"CF/88", "descricao":"..." } ] } }

9) "destaque" — box de atenção. Use MUITO.
   { "tipo":"destaque", "payload": { "tom":"info|alerta|dica", "titulo":"opcional", "texto":"..." } }

10) "ordenacao" — dinâmica em que o aluno coloca itens NA ORDEM CORRETA (fases, hierarquia, passos).
    { "tipo":"ordenacao", "payload": {
        "titulo":"Ex.: Ordem das fases do processo administrativo",
        "instrucao":"Coloque na ordem correta",
        "itens":[ { "id":"1","texto":"Instauração" }, { "id":"2","texto":"Instrução" }, ... ],
        "ordem_correta":["1","2","3","4"],
        "explicacao":"Por que essa é a ordem"
    } }

11) "cena_animada" — MINI VÍDEO educativo animado dentro do app. Uma NARRATIVA CURTA com um personagem tipo
    "Joãozinho, servidor público" passando por uma situação prática que ilustra o conceito.
    Cada CENA tem: título curto, narração de 1-2 frases, um visual esquemático (diálogo, setas, caixas comparativas
    ou linha temporal) e uma duração em ms (3000-6000). No mínimo 4 cenas, no máximo 8.
    Feche com uma "moral" de 1 frase — a regra prática que fica.
    { "tipo":"cena_animada", "payload": {
        "titulo":"O caso do Joãozinho",
        "personagens":[ { "id":"joao", "nome":"Joãozinho", "papel":"servidor público" }, { "id":"chefe","nome":"Chefe","papel":"autoridade" } ],
        "cenas":[
          { "n":1, "titulo":"O ato irregular", "narracao":"Joãozinho recebe uma ordem…",
            "visual":{ "tipo":"dialogo",
                       "elementos":[ { "ator":"chefe", "fala":"Faça isso agora." }, { "ator":"joao", "fala":"Mas é legal?" } ] },
            "duracao_ms":4500 },
          { "n":2, "titulo":"...", "narracao":"...",
            "visual":{ "tipo":"setas|box|linha_tempo|comparacao",
                       "elementos":[ { "texto":"..." }, { "texto":"..." } ] },
            "duracao_ms":4000 }
        ],
        "moral":"Regra prática de ouro em 1 frase"
    } }

12) "conexao" — associar termos a definições. USE COM PARCIMÔNIA (no máximo 1 na aula).
    Máx. 4 pares; termo até 3 palavras; definição até 8 palavras.
    { "tipo":"conexao", "payload": { "pares":[ {"termo":"...","definicao":"..."} ] } }

COMPOSIÇÃO OBRIGATÓRIA DA AULA (18-26 blocos):
- Comece com "leitura" longa de introdução (contexto histórico + relevância prática).
- MÍNIMO 6 blocos "leitura" densos ao longo da aula.
- OBRIGATÓRIO: 1 "mapa_mental" bem organizado.
- OBRIGATÓRIO: 1 "mapa_conceitual" (relações rotuladas).
- OBRIGATÓRIO: 1 "fluxograma" (quando houver etapas/decisões).
- OBRIGATÓRIO: 1 "ordenacao" (dinâmica de colocar em ordem).
- OBRIGATÓRIO: 1 "cena_animada" (a narrativa do "Joãozinho" ou similar).
- OBRIGATÓRIO: pelo menos 3 blocos "destaque" (alerta/dica/aviso).
- OPCIONAL: "linha_tempo" quando houver evolução histórica; "tabela" quando couber comparação; "citacao" e "artigo_lei" quando o livro trouxer; no máximo 1 "conexao".
- NÃO gere blocos "flashcard" nem "pergunta" — serão criados em etapa separada.
- Termine com "leitura" (síntese) + "destaque" com regra de ouro/moral final.

PT-BR jurídico, didático, elegante e ENVOLVENTE. Responda APENAS com o JSON, sem texto fora.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = requireEnv("SUPABASE_URL");
    const SERVICE_ROLE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = requireEnv("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = requireEnv("LOVABLE_API_KEY");


    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "não autenticado" }, 401);
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr) return json({ error: "token inválido" }, 401);
    const email = userRes?.user?.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.has(email)) return json({ error: "apenas administradores" }, 403);

    const body = await req.json().catch(() => null);
    const sumario_id = typeof body?.sumario_id === "string" ? body.sumario_id : "";
    const requestedAreaId = typeof body?.area_id === "string" ? body.area_id : "";
    if (!UUID_RE.test(sumario_id)) return json({ error: "sumario_id obrigatório" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: sug, error: sErr } = await admin
      .from("aprender_sumario_sugerido")
      .select("id, livro_id, area_id, ordem, titulo_melhorado, resumo_capitulo, capitulo_ref")
      .eq("id", sumario_id)
      .maybeSingle();
    if (sErr || !sug) return json({ error: "sugestão não encontrada" }, 404);

    const { data: livro } = await admin
      .from("biblioteca_leitura_nativa")
      .select("livro_id, livro_tabela, conteudo_md_refinado, conteudo_md")
      .eq("id", sug.livro_id)
      .maybeSingle();
    const conteudoLivro = String(livro?.conteudo_md_refinado || livro?.conteudo_md || "").slice(0, 60000);

    const userContent = [
      `TÍTULO DA AULA: ${sug.titulo_melhorado}`,
      sug.resumo_capitulo ? `RESUMO: ${sug.resumo_capitulo}` : "",
      "",
      "TRECHO DO LIVRO BASE (única fonte permitida):",
      conteudoLivro,
    ].filter(Boolean).join("\n");


    let parsed: any = {};
    let lastDetail = "";
    let lastFinish = "";
    let hardStatus = 0;
    for (let attempt = 0; attempt < MODELS.length * 2; attempt++) {
      const model = MODELS[attempt % MODELS.length];
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Lovable-API-Key": LOVABLE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
          max_tokens: 32000,
        }),
      });
      if (aiRes.status === 402 || aiRes.status === 401) {
        const detail = await aiRes.text().catch(() => "");
        return json({ error: "IA falhou", status: aiRes.status, detail }, aiRes.status);
      }
      if (!aiRes.ok) {
        lastDetail = await aiRes.text().catch(() => "");
        hardStatus = aiRes.status;
        console.error(`[gerar-aula-do-livro] gateway ${aiRes.status}; model=${model}; attempt=${attempt + 1}`);
        if (aiRes.status === 429) await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
      const aiJson = await aiRes.json().catch(() => null);
      const choice = aiJson?.choices?.[0];
      lastFinish = String(choice?.finish_reason ?? "");
      const candidate = salvageJson(choice?.message?.content);
      if (Array.isArray(candidate?.blocos) && candidate.blocos.length >= 4) {
        parsed = candidate;
        break;
      }
      lastDetail = `finish_reason=${lastFinish}; content_len=${String(choice?.message?.content ?? "").length}`;
      console.warn(`[gerar-aula-do-livro] resposta inválida; model=${model}; attempt=${attempt + 1}; ${lastDetail}`);
    }

    const blocosBrutos: any[] = Array.isArray(parsed.blocos) ? parsed.blocos : [];
    if (blocosBrutos.length < 4) {
      return json({
        error: "IA retornou poucos blocos",
        detail: lastDetail,
        finish_reason: lastFinish,
        status: hardStatus || undefined,
      }, 502);
    }

    const titulo = String(parsed.titulo || sug.titulo_melhorado).slice(0, 200);
    const objetivo = parsed.objetivo ? String(parsed.objetivo).slice(0, 500) : null;
    const duracao = Math.max(5, Math.min(45, Number(parsed.duracao_est_min) || 15));
    const blocos: any[] = blocosBrutos;

    const { areaId, livroTema } = await resolveArea(admin, requestedAreaId, sug, livro);
    if (!UUID_RE.test(areaId)) return json({ error: "area_id inválido" }, 500);

    const moduloSlug = `livro-${sug.livro_id.slice(0, 8)}`;
    async function ensureModulo(): Promise<string> {
      const { data: existing, error: existingErr } = await admin
        .from("aprender_modulos")
        .select("id")
        .eq("area_id", areaId)
        .eq("slug", moduloSlug)
        .maybeSingle();
      if (existingErr) throw new Error(`falha ao buscar módulo: ${existingErr.message}`);
      if (existing?.id) return existing.id;
      const { data: created, error } = await admin
        .from("aprender_modulos")
        .insert({ area_id: areaId, slug: moduloSlug, titulo: livroTema || sug.titulo_melhorado, ordem: 0 })
        .select("id").maybeSingle();
      if (error) {
        // corrida — se outro request criou nesse meio-tempo, releia
        const { data: retry, error: retryErr } = await admin
          .from("aprender_modulos")
          .select("id")
          .eq("area_id", areaId)
          .eq("slug", moduloSlug)
          .maybeSingle();
        if (retryErr) throw new Error(`falha ao reler módulo: ${retryErr.message}`);
        if (retry?.id) return retry.id;
        throw new Error(`falha ao criar módulo: ${error.message}`);
      }
      if (!created?.id) throw new Error("módulo criado sem id retornado");
      return created.id;
    }
    const moduloId = await ensureModulo();
    if (!UUID_RE.test(moduloId)) return json({ error: "modulo_id inválido" }, 500);

    const aulaSlug = `livro-${sug.livro_id.slice(0, 8)}-${sug.ordem}-${sumario_id.slice(0, 6)}`;

    // Aulas geradas por livro não vêm de `resumos_juridicos`, então NÃO use
    // resumo_origem_id como âncora: ele tem FK para outra tabela. A identidade
    // estável aqui é módulo + slug, e o vínculo volta para o sumário por
    // aprender_sumario_sugerido.aula_id.
    const { data: existingAula } = await admin
      .from("aprender_aulas")
      .select("id")
      .eq("modulo_id", moduloId)
      .eq("slug", aulaSlug)
      .maybeSingle();

    let aulaId: string;
    const aulaData = {
      modulo_id: moduloId,
      slug: aulaSlug,
      titulo,
      objetivo,
      duracao_est_min: duracao,
      ordem: sug.ordem,
      status: "published" as const,
      resumo_origem_id: null,
      livro_origem_id: sug.livro_id,
      capitulo_ref: sug.capitulo_ref,
      fontes_web: [],
      modelo_ia: MODEL,
      gerada_em: new Date().toISOString(),
    };
    if (!aulaData.modulo_id || !UUID_RE.test(aulaData.modulo_id)) {
      return json({ error: "modulo_id não resolvido antes de salvar aula" }, 500);
    }
    if (existingAula?.id) {
      aulaId = existingAula.id;
      const { error: updateErr } = await admin.from("aprender_aulas").update(aulaData).eq("id", aulaId);
      if (updateErr) throw updateErr;
      const { error: deleteErr } = await admin.from("aprender_blocos").delete().eq("aula_id", aulaId);
      if (deleteErr) throw deleteErr;
    } else {
      const { data: created, error } = await admin
        .from("aprender_aulas")
        .insert(aulaData)
        .select("id").single();
      if (error) throw error;
      aulaId = created.id;
    }

    const VALID = new Set([
      "leitura", "pergunta", "flashcard", "conexao",
      "citacao", "artigo_lei", "tabela", "mapa_mental", "mapa_conceitual",
      "infografico", "linha_tempo", "destaque", "fluxograma",
      "ordenacao", "cena_animada",
    ]);
    const rows = blocos
      .filter((b: any) => b && typeof b === "object")
      .map((b: any, i: number) => {
        const raw = String(b.tipo ?? "leitura").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        const tipo = VALID.has(raw) ? raw : "leitura";
        return {
          aula_id: aulaId,
          ordem: i,
          tipo,
          payload: b.payload ?? {},
          resposta_correta: b.resposta_correta ?? null,
          markdown: b.payload?.conteudo && tipo === "leitura" ? String(b.payload.conteudo) : null,
        };
      });
    if (rows.length > 0) {
      const { error: bErr } = await admin.from("aprender_blocos").insert(rows);
      if (bErr) throw bErr;
    }

    await admin.from("aprender_sumario_sugerido")
      .update({ aprovado: true, aula_id: aulaId, area_id: areaId })
      .eq("id", sumario_id);

    return json({ ok: true, aula_id: aulaId, titulo, blocos: rows.length });
  } catch (e: any) {
    console.error("[gerar-aula-do-livro]", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveArea(admin: any, requestedAreaId: string, sug: any, livro: any): Promise<{ areaId: string; livroTema: string | null }> {
  if (UUID_RE.test(requestedAreaId)) return { areaId: requestedAreaId, livroTema: await getLivroTema(admin, livro) };
  if (UUID_RE.test(String(sug.area_id || ""))) return { areaId: sug.area_id, livroTema: await getLivroTema(admin, livro) };

  const livroTema = await getLivroTema(admin, livro);
  const areaNome = await getLivroArea(admin, livro);
  if (!areaNome) throw new Error("não foi possível identificar a matéria do livro; gere pelo painel da matéria correta");

  const { data: area, error } = await admin
    .from("aprender_areas")
    .select("id")
    .ilike("nome", areaNome)
    .maybeSingle();
  if (error) throw new Error(`falha ao buscar matéria: ${error.message}`);
  if (!area?.id) throw new Error(`matéria '${areaNome}' não cadastrada no Aprender`);
  return { areaId: area.id, livroTema };
}

async function getLivroTema(admin: any, livro: any): Promise<string | null> {
  const row = await getBibliotecaRow(admin, livro);
  return typeof row?.tema === "string" && row.tema.trim() ? row.tema.trim() : null;
}

async function getLivroArea(admin: any, livro: any): Promise<string | null> {
  const row = await getBibliotecaRow(admin, livro);
  return typeof row?.area === "string" && row.area.trim() ? row.area.trim() : null;
}

async function getBibliotecaRow(admin: any, livro: any): Promise<{ tema?: string; area?: string } | null> {
  if (!["biblioteca_estudos", "areas"].includes(livro?.livro_tabela) || !livro?.livro_id) return null;
  const bibliotecaId = Number(livro.livro_id);
  if (!Number.isFinite(bibliotecaId)) return null;
  const { data } = await admin
    .from("biblioteca_estudos")
    .select("tema, area")
    .eq("id", bibliotecaId)
    .maybeSingle();
  return data ?? null;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
