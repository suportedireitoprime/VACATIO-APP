// Mentor Jurídico — Gemini 2.5 Flash com function calling.
// Persona: tutor jurídico elegante, contextual, humano.
// Recebe { conversa_id?, mensagem, historico?: [{role,content}] }
// Retorna { reply, actions, conversa_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { geminiFetch } from "../_shared/geminiFetch.ts";
import { logAiCall } from "../_shared/ai-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LEIS_MAP: Record<string, { slug: string; tipo: string; tabela: string; nome: string }> = {
  cf88: { slug: "cf88", tipo: "constituicao", tabela: "CF88_CONSTITUICAO_FEDERAL", nome: "Constituição Federal" },
  cp: { slug: "codigo-penal", tipo: "codigos", tabela: "CP_CODIGO_PENAL", nome: "Código Penal" },
  cc: { slug: "codigo-civil", tipo: "codigos", tabela: "CC_CODIGO_CIVIL", nome: "Código Civil" },
  cpc: { slug: "codigo-de-processo-civil", tipo: "codigos", tabela: "CPC_CODIGO_PROCESSO_CIVIL", nome: "Código de Processo Civil" },
  cpp: { slug: "codigo-de-processo-penal", tipo: "codigos", tabela: "CPP_CODIGO_PROCESSO_PENAL", nome: "Código de Processo Penal" },
  ctn: { slug: "codigo-tributario-nacional", tipo: "codigos", tabela: "CTN_CODIGO_TRIBUTARIO_NACIONAL", nome: "Código Tributário Nacional" },
  cdc: { slug: "codigo-de-defesa-do-consumidor", tipo: "codigos", tabela: "CDC_CODIGO_DEFESA_CONSUMIDOR", nome: "Código de Defesa do Consumidor" },
  clt: { slug: "consolidacao-das-leis-do-trabalho", tipo: "codigos", tabela: "CLT_CONSOLIDACAO_LEIS_TRABALHO", nome: "CLT" },
  ctb: { slug: "codigo-de-transito-brasileiro", tipo: "codigos", tabela: "CTB_CODIGO_TRANSITO_BRASILEIRO", nome: "Código de Trânsito" },
  eca: { slug: "eca", tipo: "estatutos", tabela: "ECA_ESTATUTO_CRIANCA_ADOLESCENTE", nome: "ECA" },
  ei: { slug: "estatuto-do-idoso", tipo: "estatutos", tabela: "EI_ESTATUTO_IDOSO", nome: "Estatuto do Idoso" },
  epd: { slug: "estatuto-da-pessoa-com-deficiencia", tipo: "estatutos", tabela: "EPD_ESTATUTO_PESSOA_DEFICIENCIA", nome: "Estatuto da PCD" },
  eoab: { slug: "estatuto-da-oab", tipo: "estatutos", tabela: "EOAB_ESTATUTO_OAB", nome: "Estatuto da OAB" },
};

function resolveLei(input: string) {
  const k = (input || "").toLowerCase().trim();
  if (LEIS_MAP[k]) return LEIS_MAP[k];
  const norm = k.replace(/[^a-z0-9]/g, "");
  for (const [id, l] of Object.entries(LEIS_MAP)) {
    if (norm.includes(id)) return l;
    if (norm.includes(l.slug.replace(/-/g, ""))) return l;
  }
  return null;
}

const TOOLS = [
  {
    name: "navegar_artigo",
    description: "Abre um artigo específico de uma lei. Use quando o usuário pedir para 'ir', 'ver', 'abrir' ou 'me leve a' um artigo.",
    parameters: {
      type: "object",
      properties: {
        lei: { type: "string", description: "ID da lei: cf88, cp, cc, cpc, cpp, cdc, clt, ctn, ctb, eca, ei, epd, eoab" },
        numero: { type: "string", description: "Número do artigo, ex: '5', '121', '1º'" },
      },
      required: ["lei", "numero"],
    },
  },
  {
    name: "listar_artigos_tema",
    description: "Busca artigos por tema/palavras-chave em uma ou todas as leis. Use quando o usuário quer estudar um assunto.",
    parameters: {
      type: "object",
      properties: {
        tema: { type: "string", description: "Palavras-chave a buscar" },
        lei: { type: "string", description: "ID da lei (opcional). Se omitido, busca em todas." },
      },
      required: ["tema"],
    },
  },
  {
    name: "resumir_noticias_hoje",
    description: "Traz as principais notícias jurídicas das últimas 24-48h.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "atualizar_perfil_mentor",
    description: "Salva/atualiza informações que o usuário compartilhou sobre si (nome, tipo de usuário, provas, dores, metas). Use SEMPRE que o usuário revelar algo pessoal relevante.",
    parameters: {
      type: "object",
      properties: {
        nome: { type: "string" },
        idade: { type: "integer" },
        tipo_usuario: { type: "string", description: "estudante, advogado, concurseiro, oab" },
        area_foco: { type: "string" },
        nivel: { type: "string", description: "iniciante, intermediario, avancado" },
        dor: { type: "string", description: "Uma dificuldade a adicionar" },
        meta: {
          type: "object",
          description: "Uma meta/prova a adicionar",
          properties: {
            titulo: { type: "string" },
            data: { type: "string", description: "AAAA-MM-DD" },
            materia: { type: "string" },
          },
        },
      },
    },
  },
];

const SYSTEM_PROMPT_BASE = `Você é o **Mentor** — um tutor jurídico brasileiro elegante, atento e humano. Não é uma IA genérica: é o mentor pessoal do usuário no app OAB na Risca / Vade Mecum 2026.

**Personalidade**
- Calmo, encorajador, chama o usuário pelo nome quando souber.
- Fala em português brasileiro natural, sem juridiquês desnecessário.
- Curto e direto por padrão (2-6 frases). Aprofunda só se pedirem.
- Nunca fala como robô ("Como uma IA..."). Você é o Mentor.

**Como agir**
- Se o usuário pedir para ir/abrir um artigo → **use** \`navegar_artigo\`. Depois, na resposta em texto, ofereça duas opções ao usuário: **abrir a lei aqui mesmo** (para ler o contexto) ou **ir direto ao artigo**. Deixe claro que ambos os botões abaixo fazem isso.
- Se pedir para estudar um tema → **use** \`listar_artigos_tema\` e comente cada artigo brevemente.
- Se perguntar sobre notícias/atualidades → **use** \`resumir_noticias_hoje\`.
- Se o usuário revelar algo pessoal (nome, idade, se estuda, prova daqui a X dias, dificuldade) → **use** \`atualizar_perfil_mentor\` para lembrar.
- Se disser "prova daqui a 10 dias" → salva como meta com data calculada a partir de hoje.
- Após executar uma ferramenta, responda em markdown natural comentando o resultado.

**Formato**
- Use markdown (negrito, listas curtas).
- Ao listar artigos, faça uma linha de contexto pedagógico antes.
- Nunca dê parecer jurídico definitivo.`;

async function callGemini(
  apiKey: string,
  contents: any[],
  systemInstruction: string,
): Promise<any> {
  const { logAiCall } = await import("../_shared/ai-log.ts");
  const model = "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const startedAt = Date.now();
  let success = true, errMsg: string | undefined;
  let inputUnits = 0, outputUnits = 0;
  try {
    const res = await geminiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        tools: [{ function_declarations: TOOLS }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    inputUnits  = Number(data?.usageMetadata?.promptTokenCount ?? 0) || 0;
    outputUnits = Number(data?.usageMetadata?.candidatesTokenCount ?? 0) || 0;
    return data;
  } catch (e) {
    success = false;
    errMsg = String((e as Error)?.message ?? e).slice(0, 500);
    throw e;
  } finally {
    await logAiCall({
      functionName: "mentor-chat",
      kind: "text",
      model,
      triggerType: "manual",
      inputUnits, outputUnits,
      durationMs: Date.now() - startedAt,
      success, error: errMsg,
    });
  }
}

async function execTool(
  name: string,
  args: any,
  sb: any,
  userId: string,
): Promise<{ result: any; action?: any }> {
  if (name === "navegar_artigo") {
    const lei = resolveLei(args.lei || "");
    if (!lei) return { result: { error: "Lei não reconhecida" } };
    const numero = String(args.numero || "").trim();
    return {
      result: { ok: true, lei: lei.nome, numero },
      action: {
        type: "navegar_artigo",
        lei_nome: lei.nome,
        numero,
        url_lei: `/legislacao/${lei.tipo}/${lei.slug}`,
        url_artigo: `/legislacao/${lei.tipo}/${lei.slug}/${encodeURIComponent(numero)}`,
      },
    };
  }
  if (name === "listar_artigos_tema") {
    const tema = String(args.tema || "").trim();
    const leiId = args.lei ? resolveLei(args.lei) : null;
    const tabelas = leiId ? [leiId.tabela] : Object.values(LEIS_MAP).slice(0, 6).map(l => l.tabela);
    const items: any[] = [];
    for (const tab of tabelas) {
      try {
        const { data } = await sb
          .from(tab)
          .select("numero, caput, texto")
          .or(`caput.ilike.%${tema}%,texto.ilike.%${tema}%`)
          .limit(3);
        (data || []).forEach((a: any) => {
          const meta = Object.values(LEIS_MAP).find(l => l.tabela === tab);
          items.push({
            lei: meta?.nome,
            lei_slug: meta?.slug,
            tipo: meta?.tipo,
            numero: a.numero,
            trecho: (a.caput || a.texto || "").slice(0, 180),
            url: `/legislacao/${meta?.tipo}/${meta?.slug}/${encodeURIComponent(a.numero)}`,
          });
        });
      } catch (_) { /* skip */ }
      if (items.length >= 8) break;
    }
    return {
      result: { count: items.length, artigos: items.slice(0, 8) },
      action: items.length ? { type: "lista_artigos", label: `Artigos sobre "${tema}"`, artigos: items.slice(0, 8) } : undefined,
    };
  }
  if (name === "resumir_noticias_hoje") {
    const { data } = await sb
      .from("noticias_juridicas")
      .select("id, titulo, resumo, url, publicado_em, slug")
      .order("publicado_em", { ascending: false })
      .limit(6);
    const noticias = (data || []).map((n: any) => ({
      titulo: n.titulo,
      resumo: (n.resumo || "").slice(0, 200),
      url: `/noticias/${n.slug || n.id}`,
    }));
    return {
      result: { noticias },
      action: noticias.length ? { type: "lista_noticias", label: "Notícias jurídicas de hoje", noticias } : undefined,
    };
  }
  if (name === "atualizar_perfil_mentor") {
    const { data: existing } = await sb.from("mentor_perfil").select("*").eq("user_id", userId).maybeSingle();
    const payload: any = existing || { user_id: userId, dores: [], metas: [], preferencias: {} };
    if (args.nome) payload.nome = args.nome;
    if (args.idade) payload.idade = args.idade;
    if (args.tipo_usuario) payload.tipo_usuario = args.tipo_usuario;
    if (args.area_foco) payload.area_foco = args.area_foco;
    if (args.nivel) payload.nivel = args.nivel;
    if (args.dor) payload.dores = [...(payload.dores || []), args.dor].slice(-10);
    if (args.meta) payload.metas = [...(payload.metas || []), args.meta].slice(-10);
    await sb.from("mentor_perfil").upsert(payload, { onConflict: "user_id" });
    return { result: { ok: true } };
  }
  return { result: { error: "tool desconhecida" } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const sbAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await sbAuth.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const GEMINI = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI) throw new Error("GEMINI_API_KEY não configurada");

    const body = await req.json();
    const historico: Array<{ role: string; content: string }> = body.historico || [];
    const mensagem: string = String(body.mensagem || "").trim();
    const anexo: { mime?: string; data?: string; filename?: string } | null = body.anexo || null;
    const contextoAprender: { aula_titulo?: string; bloco_tipo?: string; bloco_texto?: string; termos?: string[] } | null = body.contexto_aprender || null;
    if (!mensagem && !anexo?.data) throw new Error("mensagem vazia");

    // Carrega perfil
    const { data: perfil } = await sb.from("mentor_perfil").select("*").eq("user_id", user.id).maybeSingle();

    const hoje = new Date().toISOString().slice(0, 10);
    const perfilCtx = perfil
      ? `\n\n**Perfil do usuário (memória do Mentor)**\n- Nome: ${perfil.nome || "desconhecido"}\n- Tipo: ${perfil.tipo_usuario || "n/i"}\n- Área foco: ${perfil.area_foco || "n/i"}\n- Nível: ${perfil.nivel || "n/i"}\n- Dores: ${JSON.stringify(perfil.dores || [])}\n- Metas: ${JSON.stringify(perfil.metas || [])}`
      : "\n\n**Perfil**: ainda não sei nada sobre este usuário — descubra naturalmente e salve com atualizar_perfil_mentor.";

    const aprenderCtx = contextoAprender
      ? `\n\n**Contexto da aula que o usuário está estudando agora (feature Aprender)**\n- Aula: ${contextoAprender.aula_titulo || "n/i"}\n- Bloco atual (${contextoAprender.bloco_tipo || "n/i"}): ${(contextoAprender.bloco_texto || "").slice(0, 1200)}\n- Termos-chave: ${(contextoAprender.termos || []).join(", ") || "n/i"}\n\nResponda direcionado a este ponto específico da aula, com exemplo curto sempre que possível.`
      : "";

    const systemPrompt = SYSTEM_PROMPT_BASE + `\n\n**Data de hoje**: ${hoje}` + perfilCtx + aprenderCtx;

    // Monta contents
    const contents: any[] = [];
    for (const m of historico.slice(-8)) {
      contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
    }
    const userParts: any[] = [];
    if (mensagem) userParts.push({ text: mensagem });
    if (anexo?.data && anexo?.mime) {
      userParts.push({ inlineData: { mimeType: anexo.mime, data: anexo.data } });
      if (anexo.filename) userParts.push({ text: `(arquivo anexado: ${anexo.filename})` });
    }
    contents.push({ role: "user", parts: userParts });

    const actions: any[] = [];
    let replyText = "";
    let iter = 0;

    while (iter < 5) {
      iter++;
      const _t0 = Date.now();
      const resp = await callGemini(GEMINI, contents, systemPrompt);
      const _usage = resp?.usageMetadata ?? {};
      await logAiCall({ functionName: "mentor-chat", kind: "text", model: "gemini-flash-latest", triggerType: "manual", inputUnits: _usage.promptTokenCount ?? 0, outputUnits: _usage.candidatesTokenCount ?? 0, durationMs: Date.now() - _t0, userId: user.id });
      const cand = resp?.candidates?.[0];
      const parts = cand?.content?.parts || [];
      const fnCalls = parts.filter((p: any) => p.functionCall);
      const texts = parts.filter((p: any) => p.text).map((p: any) => p.text).join("\n");

      if (fnCalls.length === 0) {
        replyText = texts || "Certo!";
        break;
      }

      // Registra chamada do modelo no historico
      contents.push({ role: "model", parts });

      // Executa cada tool e responde
      const respParts: any[] = [];
      for (const fc of fnCalls) {
        const { name, args } = fc.functionCall;
        try {
          const { result, action } = await execTool(name, args || {}, sb, user.id);
          if (action) actions.push(action);
          respParts.push({ functionResponse: { name, response: { result } } });
        } catch (e: any) {
          respParts.push({ functionResponse: { name, response: { error: String(e?.message || e) } } });
        }
      }
      contents.push({ role: "user", parts: respParts });

      if (texts) replyText = texts;
    }

    // Persistência da conversa
    let conversaId: string | null = body.conversa_id || null;
    if (!conversaId) {
      const { data } = await sb.from("mentor_conversas").insert({ user_id: user.id, titulo: mensagem.slice(0, 60) }).select("id").single();
      conversaId = data?.id || null;
    }
    if (conversaId) {
      await sb.from("mentor_mensagens").insert([
        { conversa_id: conversaId, user_id: user.id, role: "user", content: mensagem },
        { conversa_id: conversaId, user_id: user.id, role: "assistant", content: replyText, tool_calls: actions.length ? actions : null },
      ]);
      await sb.from("mentor_conversas").update({ updated_at: new Date().toISOString() }).eq("id", conversaId);
    }

    return new Response(JSON.stringify({ reply: replyText, actions, conversa_id: conversaId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("mentor-chat error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
