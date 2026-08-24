import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, slugify, callGemini } from "../_shared/blog-edicao.ts";
import { geminiFetch } from "../_shared/geminiFetch.ts";
import { buildCoverPrompt } from "../_shared/blog-cover-style-v2.ts";
import { evolution, buildHorusTrackedUrl } from "../_shared/evolution.ts";

async function generateCoverOnce(_apiKey: string, prompt: string): Promise<Uint8Array | null> {
  // 1) Tenta primeiro o Lovable AI Gateway (google/gemini-2.5-flash-image)
  // Isto evita depender dos créditos pré-pagos da conta GEMINI direta, que já
  // ficaram exauridos em produção e causaram capas ausentes nos posts.
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const url: string | undefined =
          data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const b64 = url?.startsWith("data:") ? url.split(",", 2)[1] : undefined;
        if (b64) return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        console.warn("Cover via gateway: sem imagem na resposta", JSON.stringify(data).slice(0, 400));
      } else {
        console.warn("Cover via gateway falhou", res.status, (await res.text()).slice(0, 300));
      }
    } catch (e) {
      console.warn("Cover via gateway erro", (e as Error).message);
    }
  }

  // 2) Fallback: chama a API direta do Gemini com a GEMINI_API_KEY (se ainda houver crédito)
  const apiKey = _apiKey || Deno.env.get("GEMINI_API_KEY") || "";
  if (!apiKey) return null;
  const res = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "16:9" },
        },
      }),
    },
  );
  if (!res.ok) {
    console.warn("Cover gen failed", res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData?.data)?.inlineData?.data;
  if (!img) return null;
  return Uint8Array.from(atob(img), (c) => c.charCodeAt(0));
}


/**
 * Retorna a luminância média (0-255) das 4 bordas da PNG.
 * Se > 90 → provável fundo claro/branco (rejeitar).
 * Faz decode raw via ImageScript (deno-friendly).
 */
async function isBackgroundLight(pngBytes: Uint8Array): Promise<boolean> {
  try {
    const { decode } = await import("https://deno.land/x/pngs@0.1.1/mod.ts");
    const img = decode(pngBytes);
    const { width, height, image } = img; // image = RGBA
    const stride = width * 4;
    const samples: number[] = [];
    // Amostra 4 bordas
    const push = (x: number, y: number) => {
      const i = y * stride + x * 4;
      const r = image[i], g = image[i + 1], b = image[i + 2];
      samples.push((r * 0.299 + g * 0.587 + b * 0.114));
    };
    const step = Math.max(1, Math.floor(width / 20));
    for (let x = 0; x < width; x += step) { push(x, 2); push(x, height - 3); }
    for (let y = 0; y < height; y += step) { push(2, y); push(width - 3, y); }
    const avg = samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
    console.log("cover border luminance:", avg.toFixed(1));
    return avg > 90;
  } catch (e) {
    console.warn("luminance check failed, aborting reject:", e);
    return false;
  }
}

async function generateCover(apiKey: string, prompt: string): Promise<Uint8Array | null> {
  // O prompt já vem pronto de buildCoverPrompt (capa full-bleed, colorida e com
  // ângulo/composição sorteados). Nada é sobrescrito aqui.
  const strict = prompt;
  for (let attempt = 0; attempt < 3; attempt++) {
    const bytes = await generateCoverOnce(apiKey, strict);
    if (bytes) return bytes;
    console.warn(`cover attempt ${attempt + 1}: sem bytes, tentando de novo…`);
  }
  return null;
}

async function warmCdn(url: string) {
  try { await fetch(url, { method: "GET" }); } catch { /* best-effort */ }
}

/**
 * Remove H1/H2 iniciais que apenas repetem o título do post.
 * Alguns retornos do Gemini começam com `## <título>` mesmo instruídos a não fazê-lo,
 * o que gera a sensação de "capa duplicada" logo abaixo da capa real.
 */
function stripLeadingTitleHeading(md: string, titulo: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/["'“”‘’]/g, '').replace(/\s+/g, ' ').trim();
  const tituloNorm = norm(titulo);
  let out = md.replace(/^\uFEFF/, '').trimStart();
  // até 2 passadas (caso venha H1 e H2 encadeados)
  for (let i = 0; i < 2; i++) {
    const m = out.match(/^\s*(#{1,3})\s+([^\n]+)\n+/);
    if (!m) break;
    const headingNorm = norm(m[2]);
    // remove se for igual, prefixo ou muito similar (>=70% das palavras do título)
    const tituloWords = tituloNorm.split(' ').filter((w) => w.length > 3);
    const overlap = tituloWords.filter((w) => headingNorm.includes(w)).length;
    const similar =
      headingNorm === tituloNorm ||
      headingNorm.startsWith(tituloNorm.slice(0, Math.min(24, tituloNorm.length))) ||
      (tituloWords.length > 0 && overlap / tituloWords.length >= 0.7);
    if (!similar) break;
    out = out.slice(m[0].length).trimStart();
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Lê o body UMA vez (não pode ler duas vezes no catch)
  const body = await req.json().catch(() => ({} as any));
  const specificTemaId: string | undefined = body?.tema_id;
  const regenerateCoverPostId: string | undefined = body?.regenerate_cover_post_id;
  // NOVO: pré-geração e publicação separadas
  const preGerar: boolean = body?.pre_gerar === true;
  // agendado_para (ISO) usado quando pre_gerar=true; define quando o post será liberado
  const publicarEm: string | undefined = body?.publicar_em;
  // Publica um tema já pré-gerado (status='pronto'): marca publicado=true e dispara push/whatsapp
  const publicarTemaId: string | undefined = body?.publicar_tema_id;
  // Publicação manual: ignora "quiet hours" para garantir envio imediato de push+WhatsApp
  const manual: boolean = body?.manual === true || body?.force_notify === true || !!publicarTemaId;
  let currentTemaId: string | null = null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
    // callGemini agora usa Lovable AI Gateway; a chave direta é opcional.

    const { data: cfg } = await supabase.from("blog_edicao_config").select("*").limit(1).single();
    if (!cfg) return json({ error: "config ausente" }, 500);

    // ===== Modo: publicar tema pré-gerado =====
    if (publicarTemaId) {
      const { data: tema, error: tErr } = await supabase
        .from("blog_edicao_temas")
        .select("*")
        .eq("id", publicarTemaId)
        .single();
      if (tErr || !tema) return json({ error: "tema não encontrado" }, 404);
      if (!tema.post_id) return json({ error: "tema sem post pré-gerado" }, 400);

      const { data: post, error: pErr } = await supabase
        .from("blog_edicao_posts")
        .update({ publicado: true, data_publicacao: new Date().toISOString() })
        .eq("id", tema.post_id)
        .select()
        .single();
      if (pErr || !post) return json({ error: "falha ao publicar post" }, 500);

      const pushId = await enviarPushEBroadcast(supabase, cfg, post, undefined, { manual: true });
      if (pushId) {
        await supabase.from("blog_edicao_posts").update({ push_campaign_id: pushId }).eq("id", post.id);
      }

      await supabase.from("blog_edicao_temas").update({
        status: "concluido",
        concluido_em: new Date().toISOString(),
      }).eq("id", tema.id);

      await supabase.from("blog_edicao_logs").insert({
        tema_id: tema.id, evento: "publicado", payload: { post_id: post.id, push: !!pushId },
      });

      return json({ ok: true, publicado: true, post_id: post.id, tema_id: tema.id });
    }
    // ==========================================

    // ===== Modo: regerar apenas a capa de um post existente =====
    if (regenerateCoverPostId) {
      const { data: post, error: pErr } = await supabase
        .from("blog_edicao_posts")
        .select("id, titulo, categoria, imagem_path")
        .eq("id", regenerateCoverPostId)
        .single();
      if (pErr || !post) return json({ error: "post não encontrado" }, 404);

      const { data: recentesR } = await supabase
        .from("blog_edicao_posts")
        .select("titulo")
        .neq("id", post.id)
        .order("data_publicacao", { ascending: false })
        .limit(6);
      const coverPrompt = buildCoverPrompt(
        post.titulo,
        post.categoria,
        (recentesR || []).map((p: any) => p.titulo),
      );
      const coverBytes = await generateCover(geminiKey, coverPrompt);
      if (!coverBytes) return json({ error: "geração de capa falhou" }, 500);

      const slug = slugify(post.titulo) || post.id;
      const path = `${new Date().getFullYear()}/${slug}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("blog-capas")
        .upload(path, coverBytes, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("blog-capas")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const imagemUrl = signed?.signedUrl || "";
      if (imagemUrl) warmCdn(imagemUrl);

      // Remove capa antiga (best-effort)
      if (post.imagem_path && post.imagem_path !== path) {
        await supabase.storage.from("blog-capas").remove([post.imagem_path]).catch(() => {});
      }

      await supabase
        .from("blog_edicao_posts")
        .update({ imagem_url: imagemUrl, imagem_path: path })
        .eq("id", post.id);

      return json({ ok: true, post_id: post.id, imagem_url: imagemUrl });
    }
    // ============================================================

    // Escolhe próximo tema
    let tema: any = null;
    if (specificTemaId) {
      const { data } = await supabase
        .from("blog_edicao_temas")
        .select("*")
        .eq("id", specificTemaId)
        .single();
      tema = data;
    } else {
      const now = new Date().toISOString();

      // Diversidade: pega categorias já publicadas HOJE para tentar variar
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { data: postsHoje } = await supabase
        .from("blog_edicao_posts")
        .select("categoria, data_publicacao")
        .gte("data_publicacao", startOfDay.toISOString());
      const catsUsadasHoje = new Set(
        (postsHoje || []).map((p: any) => p.categoria).filter(Boolean),
      );

      const baseQuery = () =>
        supabase
          .from("blog_edicao_temas")
          .select("*")
          .in("status", ["pendente", "agendado"])
          .or(`agendado_para.is.null,agendado_para.lte.${now}`)
          .order("agendado_para", { ascending: true, nullsFirst: false })
          .order("ordem", { ascending: true });

      // Preferência ABSOLUTA: tema de categoria que ainda não saiu hoje — é isso
      // que garante 1 post por categoria diferente a cada dia (e não 3 de "Leis").
      if (catsUsadasHoje.size > 0) {
        const usadas = Array.from(catsUsadasHoje).map((c) => `"${String(c).replace(/"/g, '')}"`).join(",");
        const { data: outrasCats } = await baseQuery().not("categoria", "in", `(${usadas})`).limit(10);
        tema = (outrasCats || [])[0] || null;
      }

      if (!tema) {
        const { data: candidatos } = await baseQuery().limit(50);
        const lista = candidatos || [];
        tema = lista[0];
        if (tema && catsUsadasHoje.has(tema.categoria)) {
          console.log("blog-runner: sem tema pendente de categoria nova hoje; usando o primeiro da fila");
        }
      }
    }
    if (!tema) return json({ ok: true, message: "Nenhum tema para gerar agora" });
    currentTemaId = tema.id;

    await supabase.from("blog_edicao_temas").update({ status: "gerando" }).eq("id", tema.id);
    await supabase.from("blog_edicao_logs").insert({ tema_id: tema.id, evento: "iniciado", payload: { titulo: tema.titulo_sugerido } });

    // 1) Geração do artigo
    const artPrompt = `Você é redator do blog "OAB na Risca" para estudantes brasileiros de Direito.

Tema sugerido: "${tema.titulo_sugerido}"
Categoria: ${tema.categoria}
Briefing: ${tema.resumo_briefing || "—"}
Tom: ${cfg.tom}
Tamanho-alvo: ~${cfg.tamanho_alvo} palavras.

Escreva um artigo COMPLETO, profundo e envolvente. Retorne APENAS JSON válido (sem markdown, sem \`\`\`):
{
  "titulo": "Título final do post (max 90 chars, no máximo duas linhas em mobile)",
  "resumo": "Chamada de 1-2 frases que aparece no card (max 180 chars)",
  "headline_push": "Headline PERSUASIVA para notificação push (max 80 chars, criando curiosidade)",
  "push_titulo": "Título CURTO e chamativo para a notificação push do celular (MÁX 38 chars, cabe em 1 linha sem cortar; punchy, com verbo forte ou pergunta; SEM emoji; NÃO repita o título do artigo literalmente)",
  "push_subtitulo": "Subtítulo persuasivo da notificação (MÁX 85 chars, 1 linha; desperta curiosidade e complementa o push_titulo; SEM emoji; SEM reticências)",
  "whatsapp_titulo": "Título PERSUASIVO para o WhatsApp/Horus (máx 60 chars, punchy, gancho de curiosidade; pode ter 1 emoji jurídico como ⚖️ 📖 🏛️)",
  "whatsapp_descricao": "Descrição envolvente de 2-3 frases para o WhatsApp (máx 300 chars). Vende o post: cria curiosidade, mostra por que vale ler, termina insinuando a resposta. Sem hashtags.",
  "conteudo_md": "Artigo em Markdown puro, começando com uma introdução envolvente. Use ## para seções, ### para subseções, negrito, listas, citações relevantes. NÃO inclua H1 no início (o app renderiza o título). NÃO inclua imagem no markdown. Cite artigos, autores e casos quando pertinente. Português BR."
}`;

    const raw = await callGemini(geminiKey, artPrompt, cfg.modelo_texto || "gemini-flash-latest", 8192, {
      functionName: "blog-edicao-runner",
      triggerType: "auto",
    });
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let art: any;
    try { art = JSON.parse(cleaned); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      art = m ? JSON.parse(m[0]) : null;
    }
    if (!art?.titulo || !art?.conteudo_md) {
      throw new Error("IA não retornou artigo válido");
    }

    // Sanitiza conteudo_md: remove H1/H2 iniciais que repetem o título (evita
    // aparência de "capa duplicada" logo abaixo da capa do post).
    art.conteudo_md = stripLeadingTitleHeading(String(art.conteudo_md), String(art.titulo));

    // 2) Capa
    const { data: recentesCapa } = await supabase
      .from("blog_edicao_posts")
      .select("titulo")
      .order("data_publicacao", { ascending: false })
      .limit(6);
    const coverPrompt = buildCoverPrompt(
      String(art.titulo),
      String(tema.categoria),
      (recentesCapa || []).map((p: any) => p.titulo),
    );
    const coverBytes = await generateCover(geminiKey, coverPrompt);

    let imagemUrl = "";
    let imagemPath = "";
    if (coverBytes) {
      const slug = slugify(art.titulo) || tema.id;
      const path = `${new Date().getFullYear()}/${slug}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("blog-capas")
        .upload(path, coverBytes, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;
      imagemPath = path;
      // Signed URL válida por 1 ano
      const { data: signed } = await supabase.storage
        .from("blog-capas")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      imagemUrl = signed?.signedUrl || "";
      if (imagemUrl) warmCdn(imagemUrl);
    }

    if (!imagemUrl) {
      // Sem capa: deixa em branco para o cliente aplicar fallback bundled
      imagemUrl = "";
    }

    // 3) Insere post
    const postId = `edicao-${tema.id}-${Date.now()}`;
    // Em pré-geração o post fica invisível para o público até o horário programado.
    const publicado = preGerar ? false : (cfg.modo_publicacao === "auto");
    const dataPub = preGerar && publicarEm ? new Date(publicarEm).toISOString() : new Date().toISOString();
    const tempo = Math.max(3, Math.ceil((art.conteudo_md?.split(/\s+/).length || 800) / 220));
    const { data: post, error: postErr } = await supabase
      .from("blog_edicao_posts")
      .insert({
        id: postId,
        tema_id: tema.id,
        titulo: String(art.titulo).slice(0, 200),
        resumo: String(art.resumo || "").slice(0, 300),
        conteudo_md: art.conteudo_md,
        imagem_url: imagemUrl,
        imagem_path: imagemPath,
        headline_push: String(art.headline_push || art.resumo || art.titulo).slice(0, 120),
        categoria: tema.categoria,
        tempo_leitura_min: tempo,
        publicado,
        data_publicacao: dataPub,
      })
      .select()
      .single();
    if (postErr) throw postErr;

    // Em pré-geração: pula push/broadcast; marca tema como 'pronto' aguardando liberação
    if (preGerar) {
      await supabase.from("blog_edicao_temas").update({
        status: "pronto",
        post_id: post.id,
        agendado_para: dataPub,
        erro: null,
      }).eq("id", tema.id);
      await supabase.from("blog_edicao_logs").insert({
        tema_id: tema.id, evento: "pre_gerado", payload: { post_id: post.id, publicar_em: dataPub },
      });
      return json({ ok: true, pre_gerado: true, post_id: post.id, tema_id: tema.id, publicar_em: dataPub });
    }

    // 4) Push
    let pushCampaignId: string | null = null;
    if (publicado) {
      pushCampaignId = await enviarPushEBroadcast(supabase, cfg, post, {
        whatsapp_titulo: art.whatsapp_titulo,
        whatsapp_descricao: art.whatsapp_descricao,
        push_titulo: art.push_titulo,
        push_subtitulo: art.push_subtitulo,
      }, { manual });
      if (pushCampaignId) {
        await supabase.from("blog_edicao_posts").update({ push_campaign_id: pushCampaignId }).eq("id", post.id);
      }
    }

    // 5) Marca tema concluído
    await supabase.from("blog_edicao_temas").update({
      status: "concluido",
      concluido_em: new Date().toISOString(),
      post_id: post.id,
    }).eq("id", tema.id);

    await supabase.from("blog_edicao_logs").insert({
      tema_id: tema.id,
      evento: "concluido",
      payload: { post_id: post.id, push: !!pushCampaignId },
    });

    return json({ ok: true, post_id: post.id, tema_id: tema.id, push_campaign_id: pushCampaignId });
  } catch (e) {
    console.error("runner error", e);
    const errMsg = String((e as Error).message);
    try {
      const targetId = currentTemaId || specificTemaId;
      if (targetId) {
        await supabase.from("blog_edicao_temas").update({
          status: "falhou",
          erro: errMsg.slice(0, 500),
        }).eq("id", targetId);
        await supabase.from("blog_edicao_logs").insert({
          tema_id: targetId,
          evento: "falhou",
          payload: { erro: errMsg },
        });
      }
    } catch {}
    return json({ error: errMsg }, 500);
  }
});

/**
 * Extrai push + broadcast Horus para reutilizar entre "gerar+publicar" e "publicar_tema_id".
 * Retorna o id da push_campaign (ou null).
 */
async function enviarPushEBroadcast(
  supabase: ReturnType<typeof createClient>,
  cfg: any,
  post: any,
  meta?: { whatsapp_titulo?: string; whatsapp_descricao?: string; push_titulo?: string; push_subtitulo?: string },
  opts?: { manual?: boolean },
): Promise<string | null> {
  const manual = opts?.manual === true;
  let pushCampaignId: string | null = null;
  try {
    const { data: pushAuto } = await supabase
      .from("push_automations")
      .select("*")
      .eq("key", "blog_edicao_publicado")
      .maybeSingle();
    const automationEnabled = pushAuto ? pushAuto.enabled !== false : true;
    if (cfg.push_ativo && automationEnabled) {
      const now = new Date();
      const tzHour = Number(now.toLocaleString("en-US", { timeZone: cfg.timezone || "America/Sao_Paulo", hour: "2-digit", hour12: false }));
      const qs = cfg.push_quiet_start ? Number(String(cfg.push_quiet_start).split(":")[0]) : null;
      const qe = cfg.push_quiet_end ? Number(String(cfg.push_quiet_end).split(":")[0]) : null;
      const inQuiet = !manual && qs != null && qe != null && (qs < qe ? (tzHour >= qs && tzHour < qe) : (tzHour >= qs || tzHour < qe));
      if (!inQuiet) {
        const pushTitulo = String(meta?.push_titulo || "").trim().slice(0, 40);
        const pushSubtitulo = String(meta?.push_subtitulo || "").trim().slice(0, 90);
        const title = pushTitulo
          || String(cfg.push_titulo_template || "📖 {titulo}").replace("{titulo}", post.titulo).replace("{headline}", post.headline_push || "");
        const bodyTxt = pushSubtitulo
          || String(cfg.push_corpo_template || "{headline}").replace("{headline}", post.headline_push || "").replace("{titulo}", post.titulo);
        const audience = (pushAuto?.audience as any) || cfg.push_audiencia || { all: true };
        const emoji = pushAuto?.emoji || "📖";
        const { data: camp } = await supabase
          .from("push_campaigns")
          .insert({
            title, body: bodyTxt,
            url: `/blog?post=${post.id}`,
            audience, status: "sending",
            tipo: "blog",
            automation_key: "blog_edicao_publicado",
            image_url: post.imagem_url || null,
            emoji,
          })
          .select("id").single();
        pushCampaignId = camp?.id ?? null;
        await supabase.functions.invoke("send-push", {
          body: {
            campaign_id: pushCampaignId,
            title, body: bodyTxt,
            url: `/blog?post=${post.id}`,
            icon: post.imagem_url,
            image: post.imagem_url,
            emoji,
            audience,
            personalize: true,
            data: { post_id: post.id, tipo: "blog_edicao" },
          },
        });
        if (pushAuto) {
          await supabase.from("push_automations")
            .update({ last_run_at: new Date().toISOString() })
            .eq("key", "blog_edicao_publicado");
        }
      }
    }
  } catch (e) {
    console.warn("push falhou", e);
  }

  // Broadcast Horus (fire-and-forget)
  broadcastHorus(supabase, {
    postId: post.id,
    titulo: String(meta?.whatsapp_titulo || post.titulo).slice(0, 120),
    descricao: String(meta?.whatsapp_descricao || post.resumo || post.headline_push || "").slice(0, 500),
    imagemUrl: post.imagem_url || "",
    campaignId: pushCampaignId || null,
  }).catch((e) => console.warn("broadcastHorus falhou", (e as Error).message));

  return pushCampaignId;
}

/**
 * Envia o post recém-publicado por WhatsApp (via Horus) para todos os
 * usuários com opt_in_blog=true. Loop com rate-limit brando para não
 * disparar antispam do WhatsApp.
 */
async function broadcastHorus(
  supabase: ReturnType<typeof createClient>,
  opts: { postId: string; titulo: string; descricao: string; imagemUrl: string; campaignId?: string | null },
) {
  const appBaseUrl =
    Deno.env.get("HORUS_APP_URL") ||
    Deno.env.get("HORUS_PLAY_STORE_URL") ||
    "https://vade-lex-genius.lovable.app";
  const targetUrl = `${appBaseUrl.replace(/\/$/, "")}/blog?post=${encodeURIComponent(
    opts.postId,
  )}`;

  const { data: users, error } = await supabase
    .from("horus_whatsapp_users")
    .select("phone_e164, nome, linked_user_id, user_id")
    .eq("blocked", false)
    .eq("opt_in_blog", true);
  if (error) {
    console.warn("broadcastHorus: falha ao listar usuários", error.message);
    return;
  }
  // Dedup: normaliza para dígitos e mantém a primeira ocorrência.
  // Guarda o nome para personalização.
  const seen = new Set<string>();
  const alvos: { phone: string; nome: string }[] = [];
  for (const u of users || []) {
    const raw = (u as any).phone_e164 as string | null;
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits || seen.has(digits)) continue;
    seen.add(digits);
    const nomeRaw = String((u as any).nome || "").trim();
    const primeiro = nomeRaw ? nomeRaw.split(/\s+/)[0] : "";
    const nome = primeiro
      ? primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase()
      : "";
    alvos.push({ phone: `+${digits}`, nome });
  }
  console.log(`broadcastHorus: enviando post ${opts.postId} para ${alvos.length} contatos (dedup)`);

  let enviado = 0;
  let falha = 0;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const { phone, nome } of alvos) {
    try {
      const trackedUrl = buildHorusTrackedUrl(targetUrl, opts.campaignId, phone);
      const tituloPers = nome
        ? (opts.titulo.toLowerCase().startsWith(nome.toLowerCase())
            ? opts.titulo
            : `${nome}, ${opts.titulo.charAt(0).toLowerCase()}${opts.titulo.slice(1)}`)
        : opts.titulo;
      if (opts.imagemUrl) {
        await evolution.sendImageCta(phone, {
          imageUrl: opts.imagemUrl,
          title: tituloPers,
          description: opts.descricao,
          buttonLabel: "📖 Ler agora",
          url: trackedUrl,
          footer: "Blog Vade Mecum • Horus",
        });
      } else {
        await evolution.sendCtaUrl(phone, {
          title: tituloPers,
          description: opts.descricao,
          buttonLabel: "📖 Ler agora",
          url: trackedUrl,
          footer: "Blog Vade Mecum • Horus",
        });
      }
      await supabase.from("horus_outbound_log").insert({
        phone_e164: phone.replace(/\D/g, ""),
        kind: "blog_edicao",
        tipo: "blog_edicao",
        status: "sent",
        sent_at: new Date().toISOString(),
        payload: { post_id: opts.postId, titulo: opts.titulo },
      });
      enviado++;
    } catch (e) {
      const err = String((e as Error)?.message || e);
      console.warn("broadcastHorus falhou para", phone, err.slice(0, 200));
      await supabase.from("horus_outbound_log").insert({
        phone_e164: phone.replace(/\D/g, ""),
        kind: "blog_edicao",
        tipo: "blog_edicao",
        status: "failed",
        error: err.slice(0, 400),
        payload: { post_id: opts.postId },
      });
      falha++;
    }
    await sleep(1200);
  }
  console.log(`broadcastHorus: concluído — enviado=${enviado} falha=${falha}`);
}
