import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { INSTANCE, normalizeQrPayload, evolution, HORUS_APP_URL } from "../_shared/evolution.ts";
import { geminiFetch } from "../_shared/geminiFetch.ts";
import { buildSystemPrompt } from "../_shared/horus-prompt-builder.ts";
import { runPoderes, saveMemoryAsync } from "../_shared/horus-poderes-runner.ts";
import { classifyIntent, isOffTopic } from "../_shared/horus-intent-classifier.ts";
import {
  OFERTA_FRASE,
  detectarEscolha,
  detectarPedidoMaterial,
  deveOferecer,
  enviarPdf,
  enviarVideoaula,
  textoTemOferta,
} from "../_shared/horusOferta.ts";
import { loadUserStatsByPhone } from "../_shared/horus-user-stats.ts";
import { transcribeAudio, describeImage, extractPdfText } from "../_shared/horusMedia.ts";
import { traceGeneration, langfuseEnabled } from "../_shared/langfuse.ts";
import { logAiCall } from "../_shared/ai-log.ts";
import { MODELS } from "../_shared/ai-models.ts";

async function isUserPremium(admin: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("is_premium_user", { _user_id: userId });
    if (error) { console.warn("isUserPremium rpc error", error.message); return false; }
    return Boolean(data);
  } catch (e) {
    console.warn("isUserPremium fail", String((e as any)?.message || e));
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const eventName = String(body?.event || body?.type || body?.eventName || "");
    const instanceName = String(body?.instanceName || body?.instance || INSTANCE);
    const qr = normalizeQrPayload(body?.data ?? body, "webhook");
    const status = readConnectionStatus(body);
    console.log("horus-webhook received", summarizeWebhook(body, eventName));

    if (isQrEvent(eventName) && !qr.pending && (qr.qrcode || qr.code)) {
      await admin.from("horus_qr_cache").upsert({
        instance_name: instanceName || INSTANCE,
        qrcode: qr.qrcode,
        code: qr.code,
        event_name: eventName || "QRCODE",
        status: "qr",
        payload: sanitizePayload(body),
        received_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 70_000).toISOString(),
      });
    }

    if (status) {
      const statusPayload = status === "open"
        ? { qrcode: null, code: null, expires_at: new Date().toISOString() }
        : { expires_at: new Date(Date.now() + 5 * 60_000).toISOString() };

      await admin.from("horus_qr_cache").upsert({
        instance_name: instanceName || INSTANCE,
        event_name: eventName || "CONNECTION",
        status,
        payload: sanitizePayload(body),
        received_at: new Date().toISOString(),
        ...statusPayload,
      });
    }

    // Handle incoming user messages → reply via Gemini
    if (isMessageEvent(eventName, body)) {
      await handleIncomingMessage(admin, body).catch((e) => {
        console.error("horus-webhook reply error", e);
      });
    }

    return json({ ok: true });
  } catch (e) {
    console.error("horus-webhook error", e);
    // Webhooks should acknowledge receipt so Evolution Go does not get stuck retrying.
    return json({ ok: false, error: String(e?.message || e) }, 200);
  }
});

function isQrEvent(eventName: string) {
  return /qr/i.test(eventName);
}

function readConnectionStatus(payload: any) {
  const raw = String(
    payload?.data?.status ||
      payload?.data?.state ||
      payload?.status ||
      payload?.state ||
      payload?.event ||
      "",
  ).toLowerCase();

  if (/connected|pairsuccess|open/.test(raw)) return "open";
  if (/close|disconnect|offline/.test(raw)) return "close";
  if (/connecting|qr/.test(raw)) return "connecting";
  return null;
}

function sanitizePayload(value: any) {
  const clone = JSON.parse(JSON.stringify(value || {}));
  const scrub = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      if (/token|apikey|api_key|secret|authorization/i.test(key)) {
        obj[key] = "[redacted]";
      } else {
        scrub(obj[key]);
      }
    }
  };
  scrub(clone);
  return clone;
}

function summarizeWebhook(body: any, eventName: string) {
  const d = body?.data ?? body;
  const msg = d?.message ?? d?.Message ?? d?.messages?.[0] ?? d?.Messages?.[0] ?? d;
  const keys = (obj: any) => obj && typeof obj === "object" ? Object.keys(obj).slice(0, 12) : [];
  return {
    event: eventName || body?.event || body?.type || null,
    rootKeys: keys(body),
    dataKeys: keys(d),
    msgKeys: keys(msg),
    hasInfo: Boolean(d?.Info || d?.info || msg?.Info || msg?.info),
    hasMessage: Boolean(d?.message || d?.Message || msg?.message || msg?.Message),
    nestedKeys: keys(msg?.message ?? msg?.Message ?? d?.message ?? d?.Message),
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isMessageEvent(eventName: string, body: any) {
  if (/^message$/i.test(eventName)) return true;
  if (/messages?[\._-]?upsert|message\.received|receive.*message|new.*message/i.test(eventName)) return true;
  // Fallback: presence of message payload
  const d = body?.data ?? body;
  return !!(d?.message || d?.Message || d?.messages || d?.Messages || d?.body || d?.text || d?.Info);
}

type ParsedMedia = {
  type: "audio" | "image" | "document";
  mimetype: string;
  caption: string;
  key: { remoteJid: string; id: string; fromMe: boolean; participant?: string };
  base64?: string;
};

type ParsedMessage = {
  from: string;
  remoteJid: string;
  text: string;
  fromMe: boolean;
  media?: ParsedMedia;
};

function extractMessage(body: any): ParsedMessage | null {
  const d = body?.data ?? body;
  const msg = d?.message ?? d?.Message ?? d?.messages?.[0] ?? d?.Messages?.[0] ?? d;
  const nested = msg?.message ?? msg?.Message ?? d?.message ?? d?.Message ?? {};
  const info = msg?.Info ?? msg?.info ?? d?.Info ?? d?.info ?? {};

  const remoteJid =
    msg?.key?.remoteJid ||
    d?.key?.remoteJid ||
    info?.Chat ||
    info?.chat ||
    info?.Sender ||
    info?.sender ||
    msg?.info?.chat ||
    msg?.Info?.Chat ||
    d?.info?.chat ||
    d?.Info?.Chat ||
    msg?.sender ||
    d?.sender ||
    msg?.participant ||
    d?.participant ||
    msg?.remoteJid ||
    d?.remoteJid ||
    msg?.from ||
    d?.from ||
    "";
  const fromMe = Boolean(
    msg?.key?.fromMe ??
      d?.key?.fromMe ??
      info?.IsFromMe ??
      info?.isFromMe ??
      msg?.fromMe ??
      d?.fromMe
  );
  const messageId = String(
    msg?.key?.id || d?.key?.id ||
    info?.Id || info?.id || info?.ID ||
    msg?.id || msg?.Id || msg?.ID ||
    d?.id || d?.Id || d?.ID || "",
  );
  const participant = String(
    msg?.key?.participant || d?.key?.participant || info?.Participant || info?.participant || "",
  ) || undefined;

  // Legado: extrai texto/caption
  const text =
    nested?.conversation ||
    nested?.Conversation ||
    nested?.extendedTextMessage?.text ||
    nested?.ExtendedTextMessage?.Text ||
    nested?.ExtendedTextMessage?.text ||
    nested?.imageMessage?.caption ||
    nested?.ImageMessage?.Caption ||
    nested?.videoMessage?.caption ||
    nested?.VideoMessage?.Caption ||
    nested?.documentMessage?.caption ||
    nested?.DocumentMessage?.Caption ||
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.documentMessage?.caption ||
    msg?.Message?.conversation ||
    msg?.Message?.Conversation ||
    msg?.Message?.extendedTextMessage?.text ||
    msg?.Message?.ExtendedTextMessage?.Text ||
    msg?.conversation ||
    msg?.Conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.ExtendedTextMessage?.Text ||
    msg?.imageMessage?.caption ||
    msg?.ImageMessage?.Caption ||
    msg?.text?.body ||
    msg?.text ||
    msg?.Text ||
    msg?.body ||
    msg?.Body ||
    d?.text ||
    d?.Text ||
    d?.body ||
    d?.Body ||
    "";

  // Detecta mídia (áudio / imagem / documento).
  // Evolution Go às vezes entrega `base64` no nível do Message (irmão de
  // imageMessage/audioMessage/documentMessage), não dentro do nó. Extraímos
  // esse base64 "parent-level" como fallback.
  const parentB64 = String(
    (nested as any)?.base64 || (msg as any)?.base64 || (d as any)?.base64 || ""
  ).trim() || undefined;
  const audioNode = nested?.audioMessage || nested?.AudioMessage || nested?.pttMessage || msg?.audioMessage;
  const imageNode = nested?.imageMessage || nested?.ImageMessage || msg?.imageMessage;
  const docNode = nested?.documentMessage || nested?.DocumentMessage
    || nested?.documentWithCaptionMessage?.message?.documentMessage || msg?.documentMessage;
  let media: ParsedMedia | undefined;
  // Permite mídia sem messageId (base64 inline não precisa de download).
  if (remoteJid && (audioNode || imageNode || docNode)) {
    const key = { remoteJid: String(remoteJid), id: messageId, fromMe, participant };
    const b64 = (node: any) =>
      String(node?.base64 || node?.data || node?.buffer || "").trim() || parentB64;
    if (audioNode) {
      media = { type: "audio", mimetype: String(audioNode.mimetype || audioNode.mimeType || "audio/ogg"), caption: "", key, base64: b64(audioNode) };
    } else if (imageNode) {
      media = { type: "image", mimetype: String(imageNode.mimetype || imageNode.mimeType || "image/jpeg"), caption: String(imageNode.caption || ""), key, base64: b64(imageNode) };
    } else if (docNode) {
      media = { type: "document", mimetype: String(docNode.mimetype || docNode.mimeType || "application/pdf"), caption: String(docNode.caption || docNode.fileName || ""), key, base64: b64(docNode) };
    }
  }

  const hasText = typeof text === "string" && text.trim().length > 0;
  if (!remoteJid || (!hasText && !media)) {
    console.warn("horus-webhook message not parsed", {
      hasRemoteJid: Boolean(remoteJid),
      hasText,
      hasMedia: Boolean(media),
      event: String(body?.event || body?.type || body?.eventName || ""),
    });
    return null;
  }
  if (String(remoteJid).includes("@g.us")) return null;
  const phone = String(remoteJid).replace(/@.*/, "").replace(/\D/g, "");
  if (!phone) return null;
  return {
    from: phone,
    remoteJid: String(remoteJid).trim(),
    text: hasText ? text.trim() : "",
    fromMe,
    media,
  };
}


async function handleIncomingMessage(admin: any, body: any) {
  const parsed = extractMessage(body);
  if (!parsed) return;
  if (parsed.fromMe) return;

  // Animação de "digitando…" desde o primeiro instante e renovada a cada 6s
  // (o WhatsApp expira o estado em ~10s) até a resposta sair.
  const stopTyping = evolution.startTyping(parsed.remoteJid || parsed.from);
  try {
    await processIncomingMessage(admin, body, parsed);
  } finally {
    await stopTyping().catch(() => {});
  }
}

async function processIncomingMessage(admin: any, body: any, parsed: ParsedMessage) {
  const pushName = extractPushName(body);

  // 1) Ensure user row + increment counters (antes da mídia pra podermos checar Premium)
  const userRow = await ensureUser(admin, parsed.from, pushName);
  if (userRow?.blocked) {
    console.log("horus-webhook skip: blocked", { phone: parsed.from });
    return;
  }

  // 1b) Gate Premium: usuários gratuitos só podem enviar TEXTO.
  //     Áudio, imagem e PDF exigem assinatura. Bloqueia antes do enrichWithMedia
  //     (evita gastar tokens de transcrição/OCR) e responde de forma amigável.
  if (parsed.media) {
    const premium = userRow?.linked_user_id
      ? await isUserPremium(admin, userRow.linked_user_id)
      : false;
    if (!premium) {
      const mediaLabel = parsed.media.type === "audio" ? "áudio"
        : parsed.media.type === "image" ? "imagem"
        : "PDF";
      const blockMsg =
        `Vi que você me mandou um *${mediaLabel}* 🦉\n\n` +
        `Você está na *assinatura gratuita* — nela eu só consigo ler *texto*. ` +
        `Pra eu ouvir áudios, ver imagens e ler PDFs, é preciso ter um plano ativo.\n\n` +
        `Se quiser, me manda a dúvida escrita que eu te ajudo agora mesmo. ✍️\n\n` +
        `Pra liberar áudio, PDF e imagem:\n` +
        `1️⃣ Abra o app *Vade Mecum*\n` +
        `2️⃣ Vá em *Perfil → Assinaturas*\n` +
        `3️⃣ Comece com *7 dias grátis* 🎁`;
      try {
        await evolution.sendText(parsed.remoteJid || parsed.from, blockMsg);
        await logOutbound(admin, parsed, "sent", null, { agent: "premium_gate", media_type: parsed.media.type });
      } catch (e) {
        await logOutbound(admin, parsed, "failed", String((e as any)?.message || e), { agent: "premium_gate" });
      }
      await admin.from("horus_conversations").insert([
        { phone_e164: parsed.from, role: "user", content: `[${parsed.media.type}]` },
        { phone_e164: parsed.from, role: "assistant", content: blockMsg },
      ]);
      return;
    }

    // Premium: envia ack imediato ("estou escutando/vendo/lendo…")
    const ackMsg = parsed.media.type === "audio"
      ? "Recebi seu áudio 🦉 Estou escutando, um instante…"
      : parsed.media.type === "image"
      ? "Recebi sua imagem 🦉 Estou analisando, um instante…"
      : "Recebi seu PDF 🦉 Estou lendo, um instante…";
    evolution.sendText(parsed.remoteJid || parsed.from, ackMsg)
      .then(() => logOutbound(admin, parsed, "sent", null, { agent: "media_ack", media_type: parsed.media!.type }))
      .catch((e) => console.warn("horus media_ack fail", String((e as any)?.message || e)));
  }

  // 0) Se veio mídia (áudio, imagem, PDF), transcreve/OCR antes de seguir.
  console.log("horus-webhook enrichWithMedia:in", {
    phone: parsed.from,
    hasMedia: Boolean(parsed.media),
    type: parsed.media?.type,
    mimetype: parsed.media?.mimetype,
    hasBase64: Boolean(parsed.media?.base64),
  });
  await enrichWithMedia(parsed).catch((e) => console.warn("horus media enrich fail", String(e)));
  console.log("horus-webhook enrichWithMedia:out", {
    phone: parsed.from,
    textLen: parsed.text?.length || 0,
  });


  // 2) Persist inbound
  await admin.from("horus_conversations").insert({
    phone_e164: parsed.from,
    role: "user",
    content: parsed.text || (parsed.media ? `[${parsed.media.type}]` : ""),
  });


  // 2b) Onboarding — número sem conta vinculada OU aguardando confirmação de código
  const isVerified = await isPhoneVerified(admin, parsed.from);
  if (!userRow?.linked_user_id && !isVerified) {
    const shouldSend = await shouldSendOnboarding(admin, userRow?.id);
    if (shouldSend) {
      const onboardingMsg = userRow?.onboarding_state === "code_sent"
        ? `Vi que você começou a verificação mas ainda não confirmou o código. 🔐\n\nAbre o *Vade Mecum* → *Assistente Horus* e cole o código de 6 dígitos que te mandei. Se não recebeu, peça um novo por lá.`
        : `Olá! 👋 Sou o *Horus*, assistente jurídico do Vade Mecum.\n\nAinda não te reconheço por aqui. Baixe o app (ou abra no navegador) e verifique este número pra gente conversar. 🦉`;
      try {
        await evolution.sendText(parsed.remoteJid || parsed.from, onboardingMsg);
        await logOutbound(admin, parsed, "sent", null, { agent: "onboarding" });
        await admin.from("horus_conversations").insert({
          phone_e164: parsed.from,
          role: "assistant",
          content: onboardingMsg,
        });
        // Card CTA URL com o link do app (Google Play / web)
        try {
          await evolution.sendCtaUrl(parsed.remoteJid || parsed.from, {
            title: "🦉 Vade Mecum • Horus",
            description:
              userRow?.onboarding_state === "code_sent"
                ? "Abra o app para colar o código de verificação e vincular seu WhatsApp."
                : "Toque abaixo para baixar o app e criar sua conta gratuita. Depois é só voltar aqui e me chamar.",
            footer: "Assistente jurídico no seu bolso",
            buttonLabel: "📲 Baixar / Abrir app",
            url: HORUS_APP_URL,
          });
          await admin.from("horus_conversations").insert({
            phone_e164: parsed.from,
            role: "assistant",
            content: `[card] Baixar app: ${HORUS_APP_URL}`,
          });
        } catch (e) {
          console.warn("onboarding CTA url fail", String(e));
        }
        if (userRow?.id) {
          await admin.from("horus_whatsapp_users")
            .update({ last_onboarding_msg_at: new Date().toISOString() })
            .eq("id", userRow.id);
        }
      } catch (e) {
        await logOutbound(admin, parsed, "failed", String(e?.message || e), { agent: "onboarding" });
      }
    } else {
      console.log("horus-webhook onboarding skipped (recent)", { phone: parsed.from });
    }
    return;
  }

  // 3) Select agent
  const agents = await loadAgents(admin);

  // 2c) Material complementar — resposta à oferta ("PDF"/"vídeo") ou pedido direto
  {
    const pedido = detectarPedidoMaterial(parsed.text);
    const escolha = pedido?.tipo ?? detectarEscolha(parsed.text);
    if (escolha) {
      const hist = await loadHistory(admin, parsed.from, 8);
      let idxOferta = -1;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].role === "assistant" && textoTemOferta(hist[i].content)) { idxOferta = i; break; }
      }

      let tema = pedido?.tema || "";
      let explicacao = "";
      if (!tema && idxOferta >= 0) {
        explicacao = String(hist[idxOferta].content || "").replace(OFERTA_FRASE, "").trim();
        let pergunta = "";
        for (let i = idxOferta - 1; i >= 0; i--) {
          if (hist[i].role === "user") { pergunta = String(hist[i].content || ""); break; }
        }
        tema = (pergunta || explicacao.split("\n")[0] || "").replace(/[*_~`]/g, "").trim();
      }
      if (!tema) {
        // Sem oferta pendente e sem tema no pedido: usa a última pergunta do usuário.
        for (let i = hist.length - 1; i >= 0; i--) {
          if (hist[i].role === "user" && !detectarPedidoMaterial(hist[i].content)) {
            tema = String(hist[i].content || "").replace(/[*_~`]/g, "").trim();
            break;
          }
        }
      }
      tema = tema.slice(0, 120);

      // Só age se houver oferta pendente ou pedido explícito de material.
      if (idxOferta >= 0 || pedido) {
        const target = parsed.remoteJid || parsed.from;
        if (!tema) {
          const msg = "Claro! Sobre qual tema você quer o material? 🦉";
          await evolution.sendText(target, msg).catch(() => {});
          await admin.from("horus_conversations").insert({
            phone_e164: parsed.from, role: "assistant", content: msg,
          });
          return;
        }
        try {
          await evolution.sendPresence(target, "composing").catch(() => {});
          let enviado: string | null = "";
          if (escolha === "pdf") {
            enviado = await enviarPdf(admin, target, tema, explicacao);
            if (!enviado) {
              enviado = "Não consegui achar/gerar o material agora 😕 Tenta de novo em instantes?";
              await evolution.sendText(target, enviado).catch(() => {});
            }
          } else {
            enviado = await enviarVideoaula(target, tema);
          }
          await logOutbound(admin, parsed, "sent", null, { agent: `oferta_${escolha}` });
          await admin.from("horus_conversations").insert({
            phone_e164: parsed.from,
            role: "assistant",
            content: enviado,
          });
        } catch (e: any) {
          console.error("oferta material fail", String(e?.message || e));
          await logOutbound(admin, parsed, "failed", String(e?.message || e), { agent: `oferta_${escolha}` });
          await evolution.sendText(
            parsed.remoteJid || parsed.from,
            "Tive um problema pra te enviar o material agora 😕 Pode pedir de novo?",
          ).catch(() => {});
        }
        return;
      }
    }
  }

  if (!agents.length) {
    console.error("horus-webhook: no active agents configured");
    return;
  }
  const isLinked = Boolean(userRow?.linked_user_id);

  // 3b) Classifica intenção em paralelo (usada para tom + logs + roteamento)
  const classification = await classifyIntent(parsed.text).catch(() => null);
  const intent = classification?.intent || "duvida_juridica";

  const agent = pickAgent(agents, parsed.text, isLinked);
  console.log("horus-webhook", { agent: agent?.nome, intent, conf: classification?.confidence, linked: isLinked, phone: parsed.from });

  // Log da intenção
  admin.from("horus_intent_logs").insert({
    telefone: parsed.from,
    mensagem: parsed.text.slice(0, 500),
    intent,
    confidence: classification?.confidence ?? null,
    redirect: classification?.redirect ?? false,
    agente_id: agent?.id ?? null,
    raw_response: classification?.raw ?? null,
  }).then(() => {}, (e: any) => console.warn("intent log fail", String(e)));

  // Streak de off-topic
  const currentStreak = Number(userRow?.off_topic_streak ?? 0);
  const nextStreak = isOffTopic(intent) ? currentStreak + 1 : 0;

  // 4) Load recent history for multi-turn memory
  const history = await loadHistory(admin, parsed.from, 10);

  // 4b) Carrega stats do usuário (só se agente usa)
  const stats = agent?.usa_estatisticas !== false
    ? await loadUserStatsByPhone(admin, parsed.from).catch(() => null)
    : null;

  // 5) Prompt em 5 camadas
  const displayName = userRow?.display_name || pushName || "";
  let systemPrompt = buildSystemPrompt({
    agent,
    isLinked,
    displayName,
    contextSummary: userRow?.contexto_resumo || null,
    stats,
    offTopicStreak: nextStreak,
    perfilPessoal: (userRow as any)?.perfil_pessoal ?? null,
  });

  // 5b) Poderes — injeta conhecimento em tempo real (Mem0, Wikipedia, BrasilAPI, BCB, Nager)
  const toolsUsed: string[] = [];
  const t0 = Date.now();
  try {
    const poderes = await runPoderes(admin, parsed.from, parsed.text);
    if (poderes.block) systemPrompt += poderes.block;
    for (const t of poderes.tools) toolsUsed.push(t);
  } catch (e) {
    console.warn("poderes runner fail", String(e));
  }

  // A presença "digitando…" já está sendo renovada por handleIncomingMessage.
  const gen: AskGeminiResult = await askGemini(history, systemPrompt, agent, parsed.from);
  let reply = gen.text;
  if (!reply) return;

  // Oferta de material complementar ao final de explicações
  if (deveOferecer(intent, parsed.text, reply)) {
    reply = `${reply}\n\n${OFERTA_FRASE}`;
  }

  const durationMs = Date.now() - t0;
  // Custo aproximado — Gemini 2.5 Flash-Lite: US$ 0,10/M in, US$ 0,40/M out
  const costUsd = (gen.usage.input * 0.10 + gen.usage.output * 0.40) / 1_000_000;

  // 5c) Salva memória de longo prazo em background
  saveMemoryAsync(parsed.from, parsed.text, reply).catch(() => {});


  try {
    const result = await evolution.sendText(parsed.remoteJid || parsed.from, reply);
    await logOutbound(admin, parsed, "sent", null, { result, agent: agent?.nome });
    await admin.from("horus_conversations").insert({
      phone_e164: parsed.from,
      role: "assistant",
      content: reply,
      agent_id: agent?.id ?? null,
      duration_ms: durationMs,
      tokens_in: gen.usage.input || null,
      tokens_out: gen.usage.output || null,
      tokens_total: gen.usage.total || null,
      cost_usd: Number(costUsd.toFixed(6)),
      tools_used: toolsUsed.length ? toolsUsed : null,
      model: gen.model || null,
    });
    // Atualiza streak no usuário
    if (userRow?.id) {
      await admin.from("horus_whatsapp_users")
        .update({ off_topic_streak: nextStreak })
        .eq("id", userRow.id);
    }
  } catch (e) {
    await logOutbound(admin, parsed, "failed", String(e?.message || e), { agent: agent?.nome });
    throw e;
  }
}

function extractPushName(body: any): string {
  const d = body?.data ?? body;
  const msg = d?.message ?? d?.Message ?? d?.messages?.[0] ?? d;
  return String(
    msg?.pushName || msg?.PushName || d?.pushName || d?.PushName ||
    msg?.Info?.PushName || msg?.info?.pushName || ""
  ).trim();
}

async function ensureUser(admin: any, phone: string, pushName: string) {
  // Try find existing
  const { data: existing } = await admin
    .from("horus_whatsapp_users")
    .select("id, phone_e164, blocked, linked_user_id, user_id, display_name, contexto_resumo, msg_count, onboarding_state, off_topic_streak, perfil_pessoal")
    .eq("phone_e164", phone)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const patch: any = { last_seen_at: now, msg_count: (existing.msg_count || 0) + 1 };
    if (pushName && !existing.display_name) patch.display_name = pushName;

    // Se já verificou pelo app (tem user_id) mas linked_user_id ficou vazio, reconcilia
    if (!existing.linked_user_id && existing.user_id) {
      patch.linked_user_id = existing.user_id;
      patch.linked_at = now;
      patch.onboarding_state = "ativo";
      existing.linked_user_id = existing.user_id;
    }

    // Try auto-link if not linked yet: look up profile by phone
    if (!existing.linked_user_id) {
      const linked = await tryLinkProfile(admin, phone);
      if (linked) {
        patch.linked_user_id = linked.id;
        patch.linked_at = now;
        patch.onboarding_state = "ativo";
        if (!patch.display_name && linked.display_name) patch.display_name = linked.display_name;
        existing.linked_user_id = linked.id;
      }
    }

    await admin.from("horus_whatsapp_users").update(patch).eq("id", existing.id);
    return { ...existing, ...patch };
  }

  const linked = await tryLinkProfile(admin, phone);
  const insertRow: any = {
    phone_e164: phone,
    first_seen_at: now,
    last_seen_at: now,
    msg_count: 1,
    display_name: pushName || linked?.display_name || null,
    linked_user_id: linked?.id ?? null,
    linked_at: linked ? now : null,
    onboarding_state: linked ? "ativo" : "novo",
  };
  const { data: inserted } = await admin
    .from("horus_whatsapp_users")
    .insert(insertRow)
    .select("id, phone_e164, blocked, linked_user_id, display_name, contexto_resumo, msg_count, onboarding_state, off_topic_streak, perfil_pessoal")
    .single();
  return inserted;
}

async function tryLinkProfile(admin: any, phone: string): Promise<{ id: string; display_name: string | null } | null> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const variants = new Set<string>([digits]);
  if (digits.length >= 10) variants.add(digits.slice(-11));
  if (digits.length >= 11) variants.add("55" + digits.slice(-11));
  const list = Array.from(variants);
  const { data: rows } = await admin
    .from("profiles")
    .select("id, display_name, telefone")
    .not("telefone", "is", null)
    .limit(500);
  const match = (rows || []).find((r: any) => {
    const d = String(r.telefone || "").replace(/\D/g, "");
    return list.some((v) => d === v || d.endsWith(v) || v.endsWith(d));
  });
  return match ? { id: match.id, display_name: match.display_name } : null;
}

async function loadAgents(admin: any) {
  const { data } = await admin
    .from("horus_funcoes")
    .select("id, nome, descricao, prompt, keywords, ativo, prioridade, requer_cadastro, modelo, temperatura, max_tokens, eh_onboarding, eh_fallback, usar_busca_web, usa_estatisticas")
    .eq("ativo", true)
    .order("prioridade", { ascending: true });
  return data || [];
}

function pickAgent(agents: any[], text: string, isLinked: boolean) {
  // Unlinked users → onboarding agent (or fallback with requer_cadastro respected)
  if (!isLinked) {
    const onboarding = agents.find((a) => a.eh_onboarding);
    if (onboarding) return onboarding;
  }
  const lower = text.toLowerCase();
  // Match by keywords, respecting requer_cadastro
  const candidates = agents.filter((a) => (!a.requer_cadastro || isLinked) && !a.eh_onboarding);
  const byKeyword = candidates.find((a) => (a.keywords || []).some((k: string) => k && lower.includes(String(k).toLowerCase())));
  if (byKeyword) return byKeyword;
  // Fallback agent
  const fallback = candidates.find((a) => a.eh_fallback) || candidates[0];
  return fallback || agents[0];
}

async function loadHistory(admin: any, phone: string, limit: number) {
  const { data } = await admin
    .from("horus_conversations")
    .select("role, content, created_at")
    .eq("phone_e164", phone)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []).reverse();
}

async function logOutbound(admin: any, parsed: { from: string; remoteJid: string }, status: "sent" | "failed", error: string | null, extra: Record<string, unknown> = {}) {
  await admin.from("horus_outbound_log").insert({
    phone_e164: parsed.from,
    kind: "chat_reply",
    tipo: "resposta_ai",
    status,
    error,
    sent_at: status === "sent" ? new Date().toISOString() : null,
    payload: {
      target: parsed.remoteJid || parsed.from,
      ...extra,
    },
  });
}

type AskGeminiResult = { text: string; model: string; usage: { input: number; output: number; total: number } };

async function askGemini(history: Array<{ role: string; content: string }>, systemPrompt: string, agent: any, userPhone?: string): Promise<AskGeminiResult> {
  const key = Deno.env.get("GEMINI_API_KEY") || "";
  const contents = history
    .filter((m) => m && m.content && !isGenericHorusFailure(m.content))
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content) }],
    }));
  const empty: AskGeminiResult = { text: "", model: "", usage: { input: 0, output: 0, total: 0 } };
  if (!contents.length) return empty;

  const { TEXT_MODEL_FALLBACKS } = await import("../_shared/ai-models.ts");
  const models = Array.from(new Set([
    normalizeGeminiTextModel(agent?.modelo),
    normalizeGeminiTextModel(Deno.env.get("GEMINI_MODEL")),
    ...TEXT_MODEL_FALLBACKS,
  ].filter(Boolean) as string[]));

  let lastError = "";
  const useSearch = agent?.usar_busca_web !== false;
  const traceEnabled = langfuseEnabled();
  if (key) {
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const basePayload: any = {
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: Number(agent?.temperatura ?? 0.6),
          maxOutputTokens: Number(agent?.max_tokens ?? 800),
        },
      };
      const payloadWithSearch = useSearch
        ? { ...basePayload, tools: [{ google_search: {} }] }
        : basePayload;

      const startIso = new Date().toISOString();
      let res = await geminiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadWithSearch),
      });

      // Fallback silencioso: se o modelo não suportar a tool google_search, refaz sem tools.
      if (!res.ok && useSearch) {
        const errText = await res.clone().text().catch(() => "");
        if (/google_search|tool|unsupported|invalid|not supported/i.test(errText)) {
          res = await geminiFetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(basePayload),
          });
        }
      }

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") || "";
        const finalText = formatForWhatsApp(text);
        const um = data?.usageMetadata || {};
        const usage = {
          input: Number(um.promptTokenCount || 0),
          output: Number(um.candidatesTokenCount || 0),
          total: Number(um.totalTokenCount || 0),
        };
        await logAiCall({ functionName: "horus-webhook", kind: "text", model, triggerType: "manual", inputUnits: usage.input, outputUnits: usage.output, durationMs: Date.now() - new Date(startIso).getTime() });
        if (traceEnabled) {
          traceGeneration({
            name: "horus.askGemini",
            model: `google/${model}`,
            input: { system: systemPrompt.slice(0, 4000), messages: contents.slice(-6) },
            output: finalText,
            userId: userPhone,
            sessionId: userPhone,
            startTime: startIso,
            endTime: new Date().toISOString(),
            usage,
            metadata: { agent: agent?.nome, useSearch },
          }).catch(() => {});
        }
        return { text: finalText, model, usage };
      }

      lastError = `${res.status} ${await res.text().catch(() => "")}`;
      console.error("gemini error", model, lastError);
      if (traceEnabled) {
        traceGeneration({
          name: "horus.askGemini",
          model: `google/${model}`,
          input: { system: systemPrompt.slice(0, 2000), messages: contents.slice(-4) },
          output: lastError.slice(0, 500),
          userId: userPhone,
          sessionId: userPhone,
          startTime: startIso,
          endTime: new Date().toISOString(),
          level: "ERROR",
          statusMessage: lastError.slice(0, 200),
          metadata: { agent: agent?.nome },
        }).catch(() => {});
      }

      // Try the next configured Gemini model on availability/quota/key errors.
      if (!/404|not_found|not found|no longer available|429|quota|resource_exhausted|400|api key|permission/i.test(lastError)) break;
    }
  } else {
    console.error("gemini error missing GEMINI_API_KEY");
  }

  const gatewayReply = await askLovableGateway(history, systemPrompt, agent).catch((e) => {
    console.error("lovable gateway error", String(e?.message || e));
    return "";
  });
  if (gatewayReply) return { text: gatewayReply, model: "lovable-gateway", usage: { input: 0, output: 0, total: 0 } };

  return { text: "Desculpe, tive um problema para responder agora. Tente novamente em instantes.", model: "", usage: { input: 0, output: 0, total: 0 } };
}

function normalizeGeminiTextModel(model: unknown): string | null {
  const raw = String(model || "").trim();
  if (!raw) return null;
  const bare = raw.replace(/^google\//i, "");
  // Bloqueia aliases -latest, 3.x, 2.5-pro e 2.5-flash "puro" — normaliza p/ lite.
  if (/-latest$/i.test(bare) || /gemini-3(\.|-)/i.test(bare) ||
      /gemini-2\.5-pro/i.test(bare) ||
      /gemini-2\.5-flash(?!-lite)(?!-image)(?!-preview-tts)/i.test(bare)) {
    console.warn(`[horus] modelo "${raw}" bloqueado pela política — usando gemini-flash-latest`);
    return "gemini-flash-latest";
  }
  if (/flash-lite/i.test(bare)) return "gemini-flash-latest";
  return null;
}

async function askLovableGateway(history: Array<{ role: string; content: string }>, systemPrompt: string, agent: any): Promise<string> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  if (!lovableKey) return "";

  const messages = [
    { role: "system", content: systemPrompt },
    ...history
      .filter((m) => m && m.content && !isGenericHorusFailure(m.content))
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content),
      })),
  ];

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lovableKey}`,
      "Lovable-API-Key": lovableKey,
    },
    body: JSON.stringify({
      model: MODELS.textGateway,
      messages,
      temperature: Number(agent?.temperatura ?? 0.6),
      max_tokens: Number(agent?.max_tokens ?? 800),
    }),
  });

  if (!resp.ok) {
    console.error("lovable gateway error", resp.status, await resp.text().catch(() => ""));
    return "";
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return formatForWhatsApp(text);
}

function isGenericHorusFailure(content: unknown): boolean {
  const text = String(content || "").trim().toLowerCase();
  return text === "desculpe, tive um problema para responder agora. tente novamente em instantes." ||
    text === "desculpe, tive um problema pra responder agora, tente novamente em instantes." ||
    text.includes("tive um problema para responder agora") ||
    text.includes("tive um problema pra responder agora");
}

/**
 * Converte markdown estilo Gemini/GPT para o formato aceito pelo WhatsApp.
 * WhatsApp usa: *negrito*, _itálico_, ~riscado~, ```mono```
 */
function formatForWhatsApp(input: string): string {
  if (!input) return "";
  let out = input.trim();

  // Preserva blocos de código ``` intactos
  const codeBlocks: string[] = [];
  out = out.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  // Cabeçalhos markdown → linha em negrito
  out = out.replace(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm, "*$1*");

  // **negrito** ou __negrito__ → *negrito*
  out = out.replace(/\*\*(.+?)\*\*/g, "*$1*");
  out = out.replace(/__(.+?)__/g, "*$1*");

  // Itálico markdown *texto* (single) e _texto_ já batem com WhatsApp, então mantemos.
  // Mas trocamos '* item' de listas por '- item' para não confundir com negrito.
  out = out.replace(/^\s*[\*\+]\s+/gm, "- ");

  // Links [texto](url) → "texto (url)"
  out = out.replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, "$1 ($2)");

  // Restaura blocos de código
  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_m, i) => codeBlocks[Number(i)] ?? "");

  // Colapsa 3+ quebras de linha
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

async function isPhoneVerified(admin: any, phone: string): Promise<boolean> {
  const { data } = await admin
    .from("horus_whatsapp_users")
    .select("verified_at,user_id")
    .eq("phone_e164", phone)
    .maybeSingle();
  return Boolean(data?.verified_at && data?.user_id);
}

async function shouldSendOnboarding(admin: any, userRowId: string | undefined): Promise<boolean> {
  if (!userRowId) return true;
  const { data } = await admin
    .from("horus_whatsapp_users")
    .select("last_onboarding_msg_at")
    .eq("id", userRowId)
    .maybeSingle();
  const last = data?.last_onboarding_msg_at ? new Date(data.last_onboarding_msg_at).getTime() : 0;
  // Reenvia no máximo a cada 24h
  return Date.now() - last > 24 * 60 * 60 * 1000;
}

// Se a mensagem trouxer áudio/imagem/PDF, baixa e enriquece `parsed.text`
// com a transcrição/descrição para que o restante do pipeline funcione igual.
async function enrichWithMedia(parsed: ParsedMessage): Promise<void> {
  const m = parsed.media;
  if (!m) return;

  // 1) Tenta usar base64 embutido no webhook (Evolution pode enviar)
  let base64 = m.base64 || "";
  let mimetype = m.mimetype || "";

  // 2) Caso contrário, baixa via Evolution
  if (!base64) {
    const dl = await evolution.downloadMedia(m.key, mimetype).catch(() => null);
    if (dl?.base64) {
      base64 = dl.base64;
      if (dl.mimetype) mimetype = dl.mimetype;
    }
  }

  if (!base64) {
    if (!parsed.text) {
      parsed.text = `[${m.type} recebido — não consegui baixar a mídia agora, poderia reenviar ou descrever em texto?]`;
    }
    return;
  }

  if (m.type === "audio") {
    const t = await transcribeAudio(base64, mimetype);
    if (t) {
      parsed.text = parsed.text ? `${parsed.text}\n\n[áudio transcrito]\n${t}` : `[áudio transcrito]\n${t}`;
    } else if (!parsed.text) {
      parsed.text = "[áudio recebido — não consegui transcrever no momento.]";
    }
    return;
  }

  if (m.type === "image") {
    const desc = await describeImage(base64, mimetype);
    const caption = m.caption ? `\n\nLegenda do usuário: ${m.caption}` : "";
    if (desc) {
      parsed.text = parsed.text
        ? `${parsed.text}\n\n[imagem analisada]\n${desc}${caption}`
        : `[imagem analisada]\n${desc}${caption}`;
    } else if (!parsed.text) {
      parsed.text = `[imagem recebida — não consegui interpretá-la agora.]${caption}`;
    }
    return;
  }

  if (m.type === "document") {
    // Só processa PDFs; outros documentos avisamos ao usuário.
    if (/pdf/i.test(mimetype)) {
      const t = await extractPdfText(base64, mimetype);
      if (t) {
        parsed.text = parsed.text
          ? `${parsed.text}\n\n[PDF extraído]\n${t}`
          : `[PDF extraído]\n${t}`;
        return;
      }
    }
    if (!parsed.text) {
      parsed.text = `[documento recebido${m.caption ? `: ${m.caption}` : ""} — no momento só consigo ler PDFs. Poderia colar o texto ou enviar em PDF?]`;
    }
  }
}
