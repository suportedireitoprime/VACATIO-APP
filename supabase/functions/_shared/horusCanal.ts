// Publicação do Horus em canais do WhatsApp (Newsletter da Evolution Go).
// Usado pelo horus-admin (actions `canal_*`).
import { evolution, normalizeJid } from "./evolution.ts";

const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://snug-frames.lovable.app";

export type CanalRow = {
  id: string;
  jid: string;
  nome: string;
  ativo: boolean;
  post_noticias: boolean;
  post_blog: boolean;
  post_leis: boolean;
};

/** Trata as ações `canal_*`. Retorna `null` se a ação não for de canal. */
export async function handleCanalAction(
  action: string,
  body: any,
  db: any,
): Promise<Record<string, unknown> | null> {
  if (!action.startsWith("canal_")) return null;
  const op = action.slice("canal_".length);

  if (op === "list") {
    let canaisWa: any[] = [];
    let erroWa: string | null = null;
    try {
      canaisWa = await evolution.listNewsletters();
    } catch (e) {
      erroWa = String((e as Error)?.message || e).slice(0, 300);
    }
    const { data: salvos } = await db.from("horus_canais").select("*").order("created_at");
    return { ok: true, canais_whatsapp: canaisWa, salvos: salvos || [], erro_whatsapp: erroWa };
  }

  if (op === "sync") {
    const alvoNome = String(body?.nome || "").trim().toLowerCase();
    const alvoJid = body?.jid ? normalizeJid(String(body.jid)) : "";
    const canais = await evolution.listNewsletters();
    const achado = canais.find((c) =>
      (alvoJid && c.jid === alvoJid) ||
      (alvoNome && c.name.trim().toLowerCase() === alvoNome) ||
      (alvoNome && c.name.trim().toLowerCase().includes(alvoNome))
    );
    if (!achado) {
      return { error: "canal_nao_encontrado", canais_disponiveis: canais.map((c) => c.name), status: 404 };
    }
    const invite = achado.inviteKey ? await evolution.newsletterInvite(achado.inviteKey) : null;
    const { data: row, error } = await db.from("horus_canais").upsert({
      jid: achado.jid,
      nome: achado.name,
      descricao: achado.description,
      invite_link: invite,
    }, { onConflict: "jid" }).select().single();
    if (error) return { error: error.message, status: 500 };
    return { ok: true, canal: row, role: achado.role, inscritos: achado.subscribers };
  }

  if (op === "update") {
    const id = String(body?.id || "");
    if (!id) return { error: "id required", status: 400 };
    const patch: Record<string, unknown> = {};
    for (const k of ["ativo", "post_noticias", "post_blog", "post_leis"]) {
      if (typeof body?.[k] === "boolean") patch[k] = body[k];
    }
    const { data, error } = await db.from("horus_canais").update(patch).eq("id", id).select().single();
    if (error) return { error: error.message, status: 500 };
    return { ok: true, canal: data };
  }

  if (op === "post") {
    const texto = String(body?.text || "").trim();
    if (!texto) return { error: "text required", status: 400 };
    const canais = await canaisAtivos(db, body?.jid);
    if (!canais.length) return { error: "nenhum_canal_ativo", status: 400 };
    const results = [];
    for (const c of canais) results.push(await publicar(db, c, texto, "canal_manual"));
    return { ok: true, results };
  }

  if (op === "auto_post") {
    const tipos: string[] = Array.isArray(body?.tipos) && body.tipos.length
      ? body.tipos
      : ["noticias", "blog", "leis"];
    const canais = await canaisAtivos(db, body?.jid);
    if (!canais.length) return { ok: true, skipped: "nenhum_canal_ativo" };

    const results: any[] = [];
    for (const tipo of tipos) {
      const conteudo = await montarConteudo(db, tipo);
      if (!conteudo) { results.push({ tipo, skipped: "sem_conteudo" }); continue; }
      for (const c of canais) {
        const flag = tipo === "noticias" ? c.post_noticias : tipo === "blog" ? c.post_blog : c.post_leis;
        if (!flag) { results.push({ tipo, canal: c.nome, skipped: "desativado" }); continue; }
        if (!body?.force && await jaPostouHoje(db, c.jid, tipo)) {
          results.push({ tipo, canal: c.nome, skipped: "ja_postado_hoje" });
          continue;
        }
        results.push({ tipo, ...(await publicar(db, c, conteudo, `canal_${tipo}`)) });
      }
    }
    return { ok: true, results };
  }

  return { error: "unknown canal action", status: 400 };
}

async function canaisAtivos(db: any, jid?: string): Promise<CanalRow[]> {
  let q = db.from("horus_canais").select("*").eq("ativo", true);
  if (jid) q = q.eq("jid", normalizeJid(String(jid)));
  const { data } = await q;
  return (data || []) as CanalRow[];
}

async function jaPostouHoje(db: any, jid: string, tipo: string) {
  const inicio = new Date(); inicio.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from("horus_outbound_log")
    .select("id", { head: true, count: "exact" })
    .eq("kind", `canal_${tipo}`)
    .eq("status", "sent")
    .gte("created_at", inicio.toISOString())
    .contains("payload", { jid });
  return (count ?? 0) > 0;
}

async function publicar(db: any, canal: CanalRow, texto: string, kind: string) {
  try {
    const result = await evolution.sendTextToJid(canal.jid, texto);
    await db.from("horus_outbound_log").insert({
      kind, tipo: kind, status: "sent",
      sent_at: new Date().toISOString(),
      payload: { jid: canal.jid, canal: canal.nome, text: texto, result },
    });
    await db.from("horus_canais").update({ last_post_at: new Date().toISOString() }).eq("id", canal.id);
    return { canal: canal.nome, jid: canal.jid, ok: true };
  } catch (e) {
    const erro = String((e as Error)?.message || e);
    await db.from("horus_outbound_log").insert({
      kind, tipo: kind, status: "failed", error: erro.slice(0, 500),
      payload: { jid: canal.jid, canal: canal.nome, text: texto },
    });
    return { canal: canal.nome, jid: canal.jid, ok: false, error: erro.slice(0, 300) };
  }
}

export async function montarConteudo(db: any, tipo: string): Promise<string | null> {
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  if (tipo === "noticias") {
    const { data } = await db.from("noticias_juridicas")
      .select("titulo, resumo, created_at")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(5);
    if (!data?.length) return null;
    const linhas = data.slice(0, 3).map((n: any, i: number) => `${i + 1}. *${n.titulo}*`).join("\n");
    return `📰 *Notícias jurídicas de hoje*\n\n${linhas}\n\n👉 Leia tudo no app: ${SITE_URL}/noticias`;
  }

  if (tipo === "blog") {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data } = await db.from("blog_edicao_posts")
      .select("id, titulo, resumo, data_publicacao")
      .eq("publicado", true)
      .gte("data_publicacao", `${hoje}T00:00:00`)
      .order("data_publicacao", { ascending: false })
      .limit(1);
    const post = data?.[0];
    if (!post) return null;
    const resumo = post.resumo ? `\n\n${String(post.resumo).slice(0, 400)}` : "";
    return `✍️ *${post.titulo}*${resumo}\n\n👉 Ler no app: ${SITE_URL}/blog/${post.id}`;
  }

  if (tipo === "leis") {
    const { data } = await db.from("resenha_diaria")
      .select("tipo_ato, numero_ato, ementa, created_at")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!data?.length) return null;
    const linhas = data.slice(0, 4).map((l: any) => {
      const titulo = `${l.tipo_ato || "Ato"} ${l.numero_ato || ""}`.trim();
      const ementa = l.ementa ? ` — ${String(l.ementa).slice(0, 120)}` : "";
      return `• *${titulo}*${ementa}`;
    }).join("\n");
    const total = data.length;
    return `📜 *Radar 360 — ${total} lei${total > 1 ? "s" : ""} nova${total > 1 ? "s" : ""} nas últimas 24h*\n\n${linhas}\n\n👉 Ver no app: ${SITE_URL}/radar-360`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Espelhamento de pushes no canal do WhatsApp
// ---------------------------------------------------------------------------

export type PushMirrorInput = {
  title: string;
  body: string;
  url?: string;
  image?: string;
  emoji?: string;
  campaign_id?: string;
  automation_key?: string;
  tipo?: string;
};

function linkAbsoluto(url?: string): string {
  if (!url) return SITE_URL;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function limpar(t: string) {
  return String(t || "").replace(/\{primeiro_nome\}|\{nome\}/gi, "Estudante").trim();
}

/** Detecta o tipo de conteúdo do push para escolher o flag do canal e o formato. */
function detectarTipo(p: PushMirrorInput): "blog" | "noticias" | "leis" | "geral" {
  const hay = `${p.tipo || ""} ${p.automation_key || ""} ${p.url || ""}`.toLowerCase();
  if (/blog/.test(hay)) return "blog";
  if (/noticia|boletim_noticias|noticias_dia/.test(hay)) return "noticias";
  if (/lei|radar|resenha/.test(hay)) return "leis";
  return "geral";
}

/** Extrai o id do post de blog a partir da URL `/blog/<id>`. */
function blogPostId(url?: string): string | null {
  const m = String(url || "").match(/\/blog\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Espelha um push (programado ou manual) no(s) canal(is) ativo(s) do WhatsApp.
 * Posts de blog viram card rico: capa + título + prévia + link clicável.
 * Best-effort: nunca lança.
 */
export async function espelharPushNoCanal(
  db: any,
  input: PushMirrorInput,
): Promise<Record<string, unknown>> {
  try {
    const tipo = detectarTipo(input);
    const canais = (await canaisAtivos(db)).filter((c) =>
      tipo === "blog" ? c.post_blog : tipo === "leis" ? c.post_leis : c.post_noticias
    );
    if (!canais.length) return { skipped: "nenhum_canal_ativo" };

    // idempotência por campanha
    if (input.campaign_id) {
      const { count } = await db
        .from("horus_outbound_log")
        .select("id", { head: true, count: "exact" })
        .eq("kind", "canal_push")
        .eq("status", "sent")
        .contains("payload", { campaign_id: input.campaign_id });
      if ((count ?? 0) > 0) return { skipped: "ja_espelhado" };
    }

    const titulo = limpar(input.title);
    const corpo = limpar(input.body);
    const link = linkAbsoluto(input.url);

    let capa: string | null = input.image || null;
    let previa = corpo;

    if (tipo === "blog") {
      const pid = blogPostId(input.url);
      if (pid) {
        const { data: post } = await db
          .from("blog_edicao_posts")
          .select("titulo, resumo, imagem_url, imagem_thumb_url, tempo_leitura_min")
          .eq("id", pid)
          .maybeSingle();
        if (post) {
          capa = capa || post.imagem_url || post.imagem_thumb_url || null;
          previa = String(post.resumo || corpo).slice(0, 500);
        }
      }
    }

    const caption = tipo === "blog"
      ? `📰 *${titulo.replace(/^📰\s*/, "")}*\n\n${previa}\n\n👉 Leia no app: ${link}`
      : `${input.emoji ? `${input.emoji} ` : ""}*${titulo}*\n\n${corpo}\n\n👉 ${link}`;

    const results: any[] = [];
    for (const c of canais) {
      if (capa) {
        try {
          const result = await evolution.sendMediaToJid(c.jid, {
            media: capa,
            mediatype: "image",
            caption,
            fileName: "capa.jpg",
            mimetype: "image/jpeg",
          });
          await db.from("horus_outbound_log").insert({
            kind: "canal_push", tipo: `canal_push_${tipo}`, status: "sent",
            sent_at: new Date().toISOString(),
            payload: {
              jid: c.jid, canal: c.nome, campaign_id: input.campaign_id ?? null,
              automation_key: input.automation_key ?? null, formato: "card", text: caption, result,
            },
          });
          await db.from("horus_canais").update({ last_post_at: new Date().toISOString() }).eq("id", c.id);
          results.push({ canal: c.nome, ok: true, formato: "card" });
          continue;
        } catch (e) {
          console.warn("[canal] card falhou, caindo p/ texto:", String((e as Error)?.message || e).slice(0, 200));
        }
      }
      // 2ª tentativa: preview rico de link (/send/link) — clicável com capa.
      try {
        const result = await evolution.sendLinkToJid(c.jid, {
          url: link,
          title: titulo,
          description: previa.slice(0, 200),
          text: caption,
          imgUrl: capa || undefined,
        });
        await db.from("horus_outbound_log").insert({
          kind: "canal_push", tipo: `canal_push_${tipo}`, status: "sent",
          sent_at: new Date().toISOString(),
          payload: {
            jid: c.jid, canal: c.nome, campaign_id: input.campaign_id ?? null,
            automation_key: input.automation_key ?? null, formato: "link", text: caption, result,
          },
        });
        await db.from("horus_canais").update({ last_post_at: new Date().toISOString() }).eq("id", c.id);
        results.push({ canal: c.nome, ok: true, formato: "link" });
        continue;
      } catch (e) {
        console.warn("[canal] link preview falhou, caindo p/ texto:", String((e as Error)?.message || e).slice(0, 200));
      }
      const r = await publicar(db, c, caption, "canal_push");
      // grava o campaign_id no log de texto para idempotência
      if (input.campaign_id) {
        await db.from("horus_outbound_log").insert({
          kind: "canal_push", tipo: `canal_push_${tipo}`,
          status: r.ok ? "sent" : "failed",
          sent_at: r.ok ? new Date().toISOString() : null,
          payload: {
            jid: c.jid, canal: c.nome, campaign_id: input.campaign_id,
            automation_key: input.automation_key ?? null, formato: "texto",
          },
        });
      }
      results.push({ ...r, formato: "texto" });
    }
    return { ok: true, tipo, results };
  } catch (e) {
    console.warn("[espelharPushNoCanal] erro:", (e as Error)?.message || e);
    return { error: String((e as Error)?.message || e).slice(0, 300) };
  }
}
