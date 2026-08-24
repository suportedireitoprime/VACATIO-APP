// Evolution GO helper (single instance = Horus)
const BASE = Deno.env.get("EVOLUTION_API_URL")!.replace(/\/$/, "");
const KEY = Deno.env.get("EVOLUTION_API_KEY")!;
export const INSTANCE = Deno.env.get("EVOLUTION_INSTANCE_NAME") || "horus-main";
const WEBHOOK_EVENTS = [
  "ALL",
  "MESSAGE",
  "CONNECTION",
  "QRCODE",
  "READ_RECEIPT",
  "HISTORY_SYNC",
  "CALL",
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
  "PRESENCE_UPDATE",
];

// Status transitórios da Evolution GO: 403/463 (sessão ocupada / rate limit) e 5xx.
const RETRYABLE_STATUS = new Set([403, 408, 425, 429, 463, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function req(path: string, init: RequestInit = {}) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          apikey: KEY,
          ...(init.headers || {}),
        },
      });
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === MAX_RETRIES) break;
      await sleep(600 * Math.pow(2, attempt) + Math.random() * 300);
      continue;
    }

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }

    if (res.ok) return json;

    lastError = new Error(`Evolution ${path} ${res.status}: ${text.slice(0, 500)}`);
    if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_RETRIES) break;

    // backoff exponencial com jitter (0.6s → 1.2s → 2.4s)
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 8000)
      : 600 * Math.pow(2, attempt) + Math.random() * 300;
    console.warn(`Evolution ${path} ${res.status} — retry ${attempt + 1}/${MAX_RETRIES} em ${Math.round(wait)}ms`);
    await sleep(wait);
  }

  throw lastError ?? new Error(`Evolution ${path}: falha desconhecida`);
}

function withInstanceName(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}instanceName=${encodeURIComponent(INSTANCE)}`;
}

function unwrapData(value: any) {
  return value?.data ?? value;
}

function firstString(...values: any[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function normalizeQrPayload(value: any, source = "evolution") {
  const data = unwrapData(value);
  const nestedQrObject = typeof data?.qr === "object" ? data.qr : null;
  const nestedQr = typeof data?.qrcode === "object" ? data.qrcode : null;
  const nestedUpperQr = typeof data?.QRCode === "object" ? data.QRCode : null;

  const qrcode = firstString(
    data?.Qrcode,
    data?.QRCode,
    data?.qrCode,
    data?.qrcode,
    data?.base64,
    data?.qr,
    nestedQrObject?.Qrcode,
    nestedQrObject?.QRCode,
    nestedQrObject?.qrcode,
    nestedQrObject?.qrCode,
    nestedQrObject?.base64,
    nestedQr?.Qrcode,
    nestedQr?.qrcode,
    nestedQr?.base64,
    nestedUpperQr?.Qrcode,
    nestedUpperQr?.qrcode,
    nestedUpperQr?.base64,
    value?.Qrcode,
    value?.QRCode,
    value?.qrcode,
    value?.base64,
  );

  const code = firstString(
    data?.Code,
    data?.code,
    data?.pairingCode,
    nestedQrObject?.Code,
    nestedQrObject?.code,
    nestedQrObject?.pairingCode,
    nestedQr?.Code,
    nestedQr?.code,
    nestedUpperQr?.Code,
    nestedUpperQr?.code,
    value?.Code,
    value?.code,
  );

  if (qrcode || code) {
    return {
      pending: false,
      qrcode,
      code,
      source,
      raw: value,
    };
  }

  return {
    pending: true,
    message: data?.message || value?.message || "QR ainda não disponível.",
    source,
    raw: value,
  };
}

function normalizeInstance(row: any) {
  const data = unwrapData(row);
  return {
    ...data,
    instanceName: data?.instanceName ?? data?.name ?? INSTANCE,
    state: data?.connected ? "open" : data?.state ?? (data?.connected === false ? "close" : "unknown"),
    token: data?.token ?? data?.apikey,
  };
}

async function getInstanceInfo() {
  let direct: any = null;
  try {
    direct = normalizeInstance(await req(`/instance/info/${INSTANCE}`, { method: "GET" }));
  } catch {
    direct = null;
  }

  const list = unwrapData(await req(`/instance/all`, { method: "GET" }));
  const rows = Array.isArray(list) ? list : [];
  const found = rows.find((item: any) => (item?.name ?? item?.instanceName ?? item?.id) === INSTANCE);

  if (!direct && !found) throw new Error(`Evolution instance not found: ${INSTANCE}`);

  if (!direct && found?.id && found.id !== INSTANCE) {
    try {
      direct = normalizeInstance(await req(`/instance/info/${found.id}`, { method: "GET" }));
    } catch {
      direct = null;
    }
  }

  const listed = found ? normalizeInstance(found) : null;
  if (!direct) return listed;

  return {
    ...listed,
    ...direct,
    token: direct.token || listed?.token,
    webhook: direct.webhook || listed?.webhook,
    events: direct.events || listed?.events,
  };
}

async function getInstanceToken() {
  const direct = Deno.env.get("EVOLUTION_INSTANCE_TOKEN");
  if (direct) return direct;

  try {
    const info = await getInstanceInfo();
    if (info?.token) return info.token;
  } catch {
    // Continue to /instance/all fallback below.
  }

  const list = unwrapData(await req(`/instance/all`, { method: "GET" }));
  const rows = Array.isArray(list) ? list : [];
  const found = rows.find((item: any) => (item?.name ?? item?.instanceName) === INSTANCE);
  if (found?.token) return found.token;

  return KEY;
}

async function getInstanceHeaders() {
  let info: any = null;
  try {
    info = await getInstanceInfo();
  } catch {
    // The global key can still be enough for some Evolution Go deployments.
  }

  const token = Deno.env.get("EVOLUTION_INSTANCE_TOKEN") || info?.token || KEY;
  const instanceId = Deno.env.get("EVOLUTION_INSTANCE_ID") || info?.id || info?.instanceId;
  const headers: Record<string, string> = { apikey: token };
  if (instanceId) headers.instanceId = instanceId;
  return headers;
}

function isQrPendingError(error: any) {
  return /no QR code available|QR ainda não|qr.*not.*available|not.*qr/i.test(String(error?.message || error));
}

async function deleteInstance() {
  const info = await getInstanceInfo().catch(() => null);
  const identifier = Deno.env.get("EVOLUTION_INSTANCE_ID") || info?.id || info?.instanceId || INSTANCE;
  const headers = await getInstanceHeaders();
  const attempts = [
    () => req(`/instance/delete/${encodeURIComponent(identifier)}`, { method: "DELETE", headers }),
    () => req(`/instance/${encodeURIComponent(INSTANCE)}`, { method: "DELETE", headers }),
  ];

  let lastError: unknown = null;
  for (const remove of attempts) {
    try {
      return await remove();
    } catch (e) {
      const msg = String(e?.message || e);
      if (/404|not found/i.test(msg)) return { ok: true, not_found: true };
      lastError = e;
    }
  }
  throw lastError;
}

export const evolution = {
  async listInstances() {
    return req(`/instance/all`, { method: "GET" });
  },
  async createInstance(webhookUrl?: string) {
    return req(`/instance/create`, {
      method: "POST",
      body: JSON.stringify({
        instanceName: INSTANCE,
        name: INSTANCE,
        token: Deno.env.get("EVOLUTION_INSTANCE_TOKEN") || KEY,
        webhookUrl: webhookUrl || "",
        subscribe: webhookUrl ? WEBHOOK_EVENTS : [],
      }),
    });
  },
  async resetInstance(webhookUrl?: string) {
    await deleteInstance().catch((e) => {
      const msg = String(e?.message || e);
      if (!/404|not found/i.test(msg)) throw e;
    });
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await this.createInstance(webhookUrl);
    } catch (e: any) {
      if (!/already exists/i.test(String(e?.message || e))) throw e;
    }
    return this.startConnection(webhookUrl);
  },
  async startConnection(webhookUrl?: string) {
    const headers = await getInstanceHeaders();
    return req(`/instance/connect`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        instanceName: INSTANCE,
        webhookUrl: webhookUrl || "",
        subscribe: webhookUrl ? WEBHOOK_EVENTS : [],
        immediate: true,
        rabbitmqEnable: "",
        websocketEnable: "",
        natsEnable: "",
      }),
    });
  },
  async getQr() {
    const headers = await getInstanceHeaders();
    const attempts = [
      () => req(withInstanceName(`/instance/qr`), { method: "GET", headers }),
      () => req(`/instance/${encodeURIComponent(INSTANCE)}/qrcode`, { method: "GET", headers }),
      () => req(withInstanceName(`/instance/qrcode`), { method: "GET", headers }),
    ];

    let lastError: unknown = null;
    for (const fetchQr of attempts) {
      try {
        const qr = await fetchQr();
        return normalizeQrPayload(qr, "instance/qr");
      } catch (e) {
        if (isQrPendingError(e)) {
          return { pending: true, message: "QR ainda não disponível, aguardando a Evolution Go gerar o código.", source: "instance/qr" };
        }
        lastError = e;
      }
    }

    throw lastError;
  },
  async connect(webhookUrl?: string) {
    await this.startConnection(webhookUrl);

    // QR isn't instantly available after /connect — poll a few times.
    for (let i = 0; i < 6; i++) {
      const qr = await this.getQr();
      if (!qr.pending) return qr;
      await new Promise((r) => setTimeout(r, 1500));
    }
    // Return a pending signal instead of throwing so the UI can retry.
    return { pending: true, message: "QR ainda não disponível, tente novamente em alguns segundos." };
  },
  async connectionState() {
    return getInstanceInfo();
  },
  async setWebhook(url: string) {
    const headers = await getInstanceHeaders();
    return req(`/instance/connect`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        instanceName: INSTANCE,
        webhookUrl: url,
        subscribe: WEBHOOK_EVENTS,
        immediate: false,
        rabbitmqEnable: "",
        websocketEnable: "",
        natsEnable: "",
      }),
    });
  },
  async sendText(phoneE164: string, text: string) {
    const input = String(phoneE164 || "").trim();
    const message = String(text || "").trim();
    if (!input) throw new Error("Evolution /send/text: phone number is required");
    if (!message) throw new Error("Evolution /send/text: message body is required");

    const inputIsJid = /@s\.whatsapp\.net$/i.test(input);
    const number = input.replace(/@.*/, "").replace(/\D/g, "");
    const headers = await getInstanceHeaders();
    const jid = `${number}@s.whatsapp.net`;
    const candidates = Array.from(new Set([
      inputIsJid ? input : "",
      number,
      jid,
      ...brazilianNumberVariants(number),
      ...brazilianNumberVariants(number).map((n) => `${n}@s.whatsapp.net`),
    ].filter(Boolean)));
    // Evolution Go's current /send/text contract is strictly { number, text, formatJid }.
    // Sending legacy keys such as body/message obscures the real delivery error.
    const payloads = candidates.flatMap((candidate) => [
      { number: candidate, text: message, formatJid: candidate.includes("@s.whatsapp.net") ? false : true },
      { number: candidate, text: message, formatJid: false },
    ]);

    let lastError: unknown = null;
    for (const payload of payloads) {
      try {
        const response = await req(`/send/text`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        console.log("Evolution /send/text success", {
          target: String((payload as any).number || (payload as any).phone || (payload as any).to || (payload as any).remoteJid || (payload as any).jid || ""),
          keys: Object.keys(payload),
        });
        return response;
      } catch (e) {
        lastError = e;
        const msg = String(e?.message || e);
        console.warn("Evolution /send/text failed, trying next payload", {
          keys: Object.keys(payload),
          status: msg.match(/\/send\/text \d+/)?.[0] || "unknown",
          target: String((payload as any).number || ""),
          error: msg.slice(0, 180),
        });
        if (!/not registered|jid|number|whatsapp|invalid|formatJid|parse phone/i.test(msg)) break;
      }
    }
    throw lastError;
  },
  async sendButtons(phoneE164: string, title: string, description: string, buttons: { id: string; label: string }[]) {
    const token = await getInstanceToken();
    const number = phoneE164.replace(/\D/g, "");
    return req(`/send/button`, {
      method: "POST",
      headers: { apikey: token },
      body: JSON.stringify({
        number,
        title,
        description,
        footer: "Horus",
        buttons: buttons.map((b) => ({ type: "reply", displayText: b.label, id: b.id })),
      }),
    }).catch((e) => {
      // fallback to plain text if buttons not supported
      const inline = `${title}\n\n${description}\n\n` + buttons.map((b, i) => `${i + 1}) ${b.label}`).join("\n");
      return req(`/send/text`, {
        method: "POST",
        headers: { apikey: token },
        body: JSON.stringify({ number, text: inline }),
      });
    });
  },
  /**
   * Envia mensagem com botão CTA Copy (copia código para área de transferência).
   *
   * Evolution GO expõe isso via POST /send/button com um único botão do
   * tipo `copy` (renderizado no WhatsApp como cta_copy nativo).
   * Ref: pkg/sendMessage/service/send_service.go — ButtonStruct + case "copy".
   *
   * Fallback: texto puro se o servidor rejeitar (versão muito antiga).
   */
  async sendCopyCode(
    phoneE164: string,
    opts: {
      title: string;
      description: string;
      footer?: string;
      buttonLabel: string;
      copyCode: string;
      imageUrl?: string;
    },
  ) {
    const headers = await getInstanceHeaders();
    const number = String(phoneE164 || "").replace(/@.*/, "").replace(/\D/g, "");
    if (!number) throw new Error("Evolution /send/button: phone number is required");

    const variants = Array.from(new Set([number, ...brazilianNumberVariants(number)]));

    let lastError: unknown = null;
    for (const target of variants) {
      const payload: Record<string, unknown> = {
        number: target,
        title: opts.title,
        description: opts.description,
        footer: opts.footer || "Vade Mecum • Horus",
        buttons: [
          {
            type: "copy",
            displayText: opts.buttonLabel,
            id: `copy_${opts.copyCode}`,
            copyCode: opts.copyCode,
          },
        ],
      };
      try {
        const res = await req(`/send/button`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        console.log("Evolution /send/button (copy) success", { number: target, code_len: opts.copyCode.length });
        return res;
      } catch (e: any) {
        const msg = String(e?.message || e);
        console.warn("Evolution /send/button attempt failed", { target, error: msg.slice(0, 400) });
        lastError = e;
        if (!/number|jid|not registered|whatsapp|parse phone|invalid/i.test(msg)) break;
      }
    }
    console.error("Evolution /send/button exhausted, falling back to text", {
      error: String((lastError as any)?.message || lastError).slice(0, 400),
    });
    const fallback =
      `*${opts.title}*\n\n${opts.description}\n\nCódigo: *${opts.copyCode}*\n\n_Toque e segure no código acima para copiar._`;
    return this.sendText(phoneE164, fallback);
  },

  /**
   * Envia um card com botão CTA URL (abre um link no navegador).
   * Evolution GO: POST /send/button, botão com type: "url" + url.
   * Fallback: texto com o link inline.
   */
  async sendCtaUrl(
    phoneE164: string,
    opts: {
      title: string;
      description: string;
      footer?: string;
      buttonLabel: string;
      url: string;
    },
  ) {
    const headers = await getInstanceHeaders();
    const number = String(phoneE164 || "").replace(/@.*/, "").replace(/\D/g, "");
    if (!number) throw new Error("Evolution /send/button: phone number is required");

    const variants = Array.from(new Set([number, ...brazilianNumberVariants(number)]));
    let lastError: unknown = null;
    for (const target of variants) {
      const payload: Record<string, unknown> = {
        number: target,
        title: opts.title,
        description: opts.description,
        footer: opts.footer || "Vade Mecum • Horus",
        buttons: [
          {
            type: "url",
            displayText: opts.buttonLabel,
            id: `url_${Date.now()}`,
            url: opts.url,
          },
        ],
      };
      try {
        const res = await req(`/send/button`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        console.log("Evolution /send/button (url) success", { number: target, url: opts.url });
        return res;
      } catch (e: any) {
        const msg = String(e?.message || e);
        console.warn("Evolution /send/button (url) attempt failed", { target, error: msg.slice(0, 400) });
        lastError = e;
        if (!/number|jid|not registered|whatsapp|parse phone|invalid/i.test(msg)) break;
      }
    }
    console.error("Evolution /send/button (url) exhausted, falling back to text", {
      error: String((lastError as any)?.message || lastError).slice(0, 200),
    });
    const fallback = `*${opts.title}*\n\n${opts.description}\n\n👉 ${opts.url}`;
    return this.sendText(phoneE164, fallback);
  },

  /**
   * Envia uma imagem (URL pública) com legenda e, na sequência, um botão CTA URL.
   * Fluxo:
   *  1. `/send/media` com mediatype=image, url e caption (título + descrição)
   *  2. `/send/button` (via sendCtaUrl) com o botão "Acessar"
   * Fallback: se a mídia falhar, envia apenas o botão CTA URL.
   */
  async sendImageCta(
    phoneE164: string,
    opts: {
      imageUrl: string;
      title: string;
      description: string;
      buttonLabel: string;
      url: string;
      footer?: string;
    },
  ) {
    const headers = await getInstanceHeaders();
    const number = String(phoneE164 || "").replace(/@.*/, "").replace(/\D/g, "");
    if (!number) throw new Error("Evolution /send/media: phone number is required");

    const variants = Array.from(new Set([number, ...brazilianNumberVariants(number)]));
    const caption = `*${opts.title}*\n\n${opts.description}${opts.url ? `\n\n👉 ${opts.buttonLabel || "Abrir"}: ${opts.url}` : ""}`;

    let mediaOk = false;
    for (const target of variants) {
      const payload = {
        number: target,
        mediatype: "image",
        media: opts.imageUrl,
        url: opts.imageUrl,
        caption,
        fileName: "capa.png",
      };
      try {
        await req(`/send/media`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        mediaOk = true;
        console.log("Evolution /send/media (image) success", { number: target });
        break;
      } catch (e: any) {
        const msg = String(e?.message || e);
        console.warn("Evolution /send/media attempt failed", { target, error: msg.slice(0, 200) });
        if (!/number|jid|not registered|whatsapp|parse phone|invalid/i.test(msg)) break;
      }
    }

    // Botão CTA URL (com fallback interno em texto)
    try {
      await this.sendCtaUrl(phoneE164, {
        title: mediaOk ? opts.buttonLabel : opts.title,
        description: mediaOk ? "Toque no botão abaixo para abrir." : opts.description,
        buttonLabel: opts.buttonLabel,
        url: opts.url,
        footer: opts.footer,
      });
    } catch (e) {
      console.warn("sendImageCta: CTA button failed, falling back to text", (e as Error).message);
      const fallback = mediaOk
        ? `👉 ${opts.buttonLabel}: ${opts.url}`
        : `*${opts.title}*\n\n${opts.description}\n\n👉 ${opts.url}`;
      await this.sendText(phoneE164, fallback);
    }
  },

  /**
   * Envia presença "digitando…" (composing) ou "pausado" para o número.
   * Evolution Go: POST /message/presence com { number, state, isAudio }.
   * Docs: https://docs.evolutionfoundation.com.br/evolution-go/set-chat-presence
   * O status expira em ~10s no WhatsApp — reenvie periodicamente enquanto
   * o processamento estiver rolando. Erros são engolidos (best-effort).
   */
  async sendPresence(
    phoneE164: string,
    presence: "composing" | "paused" | "recording" = "composing",
    delayMs = 10000,
  ) {
    // (ver sendDocument abaixo para envio de PDFs gerados pelo Horus)
    const number = String(phoneE164 || "").replace(/@.*/, "").replace(/\D/g, "");
    if (!number) return;
    // whatsmeow aceita apenas "composing" e "paused"; "recording" é composing + isAudio.
    const state = presence === "paused" ? "paused" : "composing";
    const isAudio = presence === "recording";
    const headers = await getInstanceHeaders().catch(() => ({ apikey: KEY }));
    const paths = [`/message/presence`, `/chat/presence`, `/chat/sendPresence`];
    for (const path of paths) {
      try {
        await req(path, {
          method: "POST",
          headers,
          body: JSON.stringify({ number, state, isAudio, presence: state, delay: delayMs }),
        });
        return;
      } catch (e) {
        const msg = String((e as Error)?.message || e);
        if (/404|not found|no route/i.test(msg)) continue;
        console.warn("evolution sendPresence failed", path, msg.slice(0, 160));
        return;
      }
    }
  },

  /**
   * Mantém a animação de "digitando…" viva enquanto o Horus processa.
   * O WhatsApp expira o estado em ~10s, então reenviamos a cada 6s.
   * Retorna uma função `stop()` que envia "paused" e encerra o loop.
   */
  startTyping(phoneE164: string, isAudio = false) {
    const state: "composing" | "recording" = isAudio ? "recording" : "composing";
    let active = true;
    const tick = () => {
      if (!active) return;
      this.sendPresence(phoneE164, state, 10000).catch(() => {});
    };
    tick();
    const timer = setInterval(tick, 6000);
    return async () => {
      if (!active) return;
      active = false;
      clearInterval(timer);
      await this.sendPresence(phoneE164, "paused", 1000).catch(() => {});
    };
  },

  /**
   * Envia um documento (PDF) via Evolution Go — POST /send/media com
   * mediatype "document". `media` aceita URL pública ou base64 puro.
   */
  async sendDocument(
    phoneE164: string,
    opts: { media: string; fileName: string; caption?: string; mimetype?: string },
  ) {
    const headers = await getInstanceHeaders();
    const number = String(phoneE164 || "").replace(/@.*/, "").replace(/\D/g, "");
    if (!number) throw new Error("Evolution /send/media: phone number is required");
    const variants = Array.from(new Set([number, ...brazilianNumberVariants(number)]));

    let lastError: unknown = null;
    for (const target of variants) {
      try {
        return await req(`/send/media`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            number: target,
            mediatype: "document",
            media: opts.media,
            fileName: opts.fileName,
            caption: opts.caption || "",
            mimetype: opts.mimetype || "application/pdf",
          }),
        });
      } catch (e) {
        lastError = e;
        const msg = String((e as Error)?.message || e);
        console.warn("Evolution /send/media (document) failed", { target, error: msg.slice(0, 200) });
        if (!/number|jid|not registered|whatsapp|parse phone|invalid/i.test(msg)) break;
      }
    }
    throw lastError;
  },

  /**
   * === CANAIS (Newsletter) ===
   * Lista os canais dos quais a instância participa (admin ou inscrito).
   * Evolution Go: GET /newsletter/list
   */
  async listNewsletters(): Promise<NewsletterInfo[]> {
    const headers = await getInstanceHeaders().catch(() => ({ apikey: KEY }));
    const paths = [`/newsletter/list`, withInstanceName(`/newsletter/list`)];
    let lastError: unknown = null;
    for (const path of paths) {
      try {
        const res: any = await req(path, { method: "GET", headers });
        const rows = unwrapData(res);
        const list = Array.isArray(rows) ? rows : Array.isArray(rows?.newsletters) ? rows.newsletters : [];
        return list.map(normalizeNewsletter).filter((n: NewsletterInfo) => !!n.jid);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  },

  /** Detalhes de um canal — POST /newsletter/info { jid } */
  async newsletterInfo(jid: string): Promise<NewsletterInfo | null> {
    const headers = await getInstanceHeaders().catch(() => ({ apikey: KEY }));
    const bodies = [
      { jid },
      { jid: jidObject(jid) },
    ];
    for (const body of bodies) {
      try {
        const res: any = await req(`/newsletter/info`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const data = unwrapData(res);
        if (data) return normalizeNewsletter(data);
      } catch (e) {
        console.warn("evolution newsletterInfo failed", String((e as Error)?.message || e).slice(0, 180));
      }
    }
    return null;
  },

  /** Link de convite do canal — POST /newsletter/link { key } */
  async newsletterInvite(inviteKey: string): Promise<string | null> {
    if (!inviteKey) return null;
    const headers = await getInstanceHeaders().catch(() => ({ apikey: KEY }));
    try {
      const res: any = await req(`/newsletter/link`, {
        method: "POST",
        headers,
        body: JSON.stringify({ key: inviteKey }),
      });
      const data = unwrapData(res);
      return firstString(data?.inviteLink, data?.link, res?.inviteLink) ||
        `https://whatsapp.com/channel/${inviteKey}`;
    } catch {
      return `https://whatsapp.com/channel/${inviteKey}`;
    }
  },

  /**
   * Publica texto num canal. O JID do canal (`...@newsletter`) é enviado
   * cru no campo `number` com `formatJid:false` — sem variantes de DDD.
   */
  async sendTextToJid(jid: string, text: string) {
    const target = normalizeJid(jid);
    const message = String(text || "").trim();
    if (!target) throw new Error("Evolution /send/text: jid is required");
    if (!message) throw new Error("Evolution /send/text: message body is required");
    const headers = await getInstanceHeaders();
    return req(`/send/text`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: target, text: message, formatJid: false }),
    });
  },

  /** Publica mídia (imagem/documento/vídeo) num canal. */
  async sendMediaToJid(
    jid: string,
    opts: { media: string; mediatype?: "image" | "video" | "document" | "audio"; caption?: string; fileName?: string; mimetype?: string },
  ) {
    const target = normalizeJid(jid);
    if (!target) throw new Error("Evolution /send/media: jid is required");
    const headers = await getInstanceHeaders();
    return req(`/send/media`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        number: target,
        formatJid: false,
        type: opts.mediatype || "image",
        mediatype: opts.mediatype || "image",
        url: opts.media,
        media: opts.media,
        caption: opts.caption || "",
        filename: opts.fileName || "",
        fileName: opts.fileName || "",
        mimetype: opts.mimetype || "",
      }),
    });
  },

  /**
   * Preview rico de link num canal — POST /send/link
   * { url, title, description, text, imgUrl }.
   */
  async sendLinkToJid(
    jid: string,
    opts: { url: string; title: string; description?: string; text?: string; imgUrl?: string },
  ) {
    const target = normalizeJid(jid);
    if (!target) throw new Error("Evolution /send/link: jid is required");
    const headers = await getInstanceHeaders();
    return req(`/send/link`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        number: target,
        formatJid: false,
        url: opts.url,
        title: opts.title,
        description: opts.description || "",
        text: opts.text || opts.url,
        imgUrl: opts.imgUrl || "",
      }),
    });
  },

  /**
   * Baixa a mídia (áudio/imagem/documento) de uma mensagem já recebida.
   * Evolution Go expõe `POST /chat/getBase64FromMediaMessage/{instance}` com
   * o payload `{ message: { key: {...} } }`, retornando `{ base64, mimetype }`.
   * Tenta variações comuns e devolve `null` se nada funcionar.
   */
  async downloadMedia(
    keyInfo: { remoteJid: string; id: string; fromMe?: boolean; participant?: string },
    hintMime?: string,
  ): Promise<{ base64: string; mimetype: string } | null> {
    const headers = await getInstanceHeaders().catch(() => ({ apikey: KEY }));
    const body = JSON.stringify({
      message: { key: keyInfo },
      convertToMp4: false,
    });
    const paths = [
      `/chat/getBase64FromMediaMessage/${encodeURIComponent(INSTANCE)}`,
      `/chat/getBase64FromMediaMessage`,
      `/message/download`,
      `/message/downloadMedia`,
    ];
    for (const path of paths) {
      try {
        const res: any = await req(path, { method: "POST", headers, body });
        const base64 = res?.base64 || res?.data?.base64 || res?.base64Data || res?.buffer;
        const mimetype = res?.mimetype || res?.mimeType || res?.data?.mimetype || hintMime || "";
        if (base64 && typeof base64 === "string") {
          return { base64: base64.replace(/^data:[^;]+;base64,/, ""), mimetype };
        }
      } catch (e) {
        const msg = String((e as Error)?.message || e);
        if (!/404|not found|no route/i.test(msg)) {
          console.warn("evolution downloadMedia failed", path, msg.slice(0, 200));
        }
      }
    }
    return null;
  },
};

/** URL padrão do app (Google Play ou web). Configurável por env. */
export const HORUS_APP_URL =
  Deno.env.get("HORUS_PLAY_STORE_URL") ||
  Deno.env.get("HORUS_APP_URL") ||
  "https://vade-mecum-comentado.lovable.app";

/**
 * Envolve uma URL de destino pelo redirect rastreado `horus-click`.
 * Se `campaignId` for nulo/vazio, devolve a URL original (sem tracking).
 * Se SUPABASE_URL não estiver disponível, também devolve a original.
 */
export function buildHorusTrackedUrl(
  targetUrl: string,
  campaignId?: string | null,
  phone?: string | null,
): string {
  if (!campaignId || !targetUrl) return targetUrl;
  const supaUrl = Deno.env.get("SUPABASE_URL");
  if (!supaUrl) return targetUrl;
  const base = `${supaUrl.replace(/\/$/, "")}/functions/v1/horus-click`;
  const params = new URLSearchParams();
  params.set("c", campaignId);
  if (phone) params.set("p", String(phone).replace(/\D/g, ""));
  params.set("url", targetUrl);
  return `${base}?${params.toString()}`;
}

function brazilianNumberVariants(number: string) {
  const variants: string[] = [];
  if (!number.startsWith("55")) return variants;

  const ddd = number.slice(2, 4);
  const local = number.slice(4);
  if (ddd.length !== 2) return variants;

  if (local.length === 8) {
    variants.push(`55${ddd}9${local}`);
  }
  if (local.length === 9 && local.startsWith("9")) {
    variants.push(`55${ddd}${local.slice(1)}`);
  }

  return variants;
}

export type NewsletterInfo = {
  jid: string;
  name: string;
  description: string | null;
  subscribers: number | null;
  role: string | null;
  inviteKey: string | null;
  raw?: unknown;
};

/** Garante o sufixo `@newsletter` num id de canal. */
export function normalizeJid(input: string): string {
  const value = String(input || "").trim();
  if (!value) return "";
  if (value.includes("@")) return value;
  return `${value.replace(/\D/g, "")}@newsletter`;
}

function jidObject(input: string) {
  const value = normalizeJid(input);
  const [user, server] = value.split("@");
  return { user, server: server || "newsletter", device: 0, agent: 0 };
}

function normalizeNewsletter(row: any): NewsletterInfo {
  const data = unwrapData(row) || {};
  const meta = data.thread_metadata || data.threadMetadata || {};
  const viewer = data.viewer_metadata || data.viewerMetadata || {};
  const rawId = firstString(data.id, data.jid, data.JID, typeof data.jid === "object" ? `${data.jid?.user}@${data.jid?.server}` : "") || "";
  return {
    jid: rawId ? normalizeJid(rawId) : "",
    name: firstString(meta?.name?.text, meta?.name, data.name, data.subject) || "(sem nome)",
    description: firstString(meta?.description?.text, meta?.description, data.description),
    subscribers: Number(meta?.subscribers_count ?? meta?.subscribersCount ?? data.subscribers ?? NaN) || null,
    role: firstString(viewer?.role, data.role),
    inviteKey: firstString(meta?.invite, data.invite, data.inviteKey),
    raw: row,
  };
}


export function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  // If Brazil-like (10 or 11 digits), prepend 55
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}