// Edge Function: send-push
// Envia notificação push via FCM HTTP v1 (Android + Web) para tokens de device_tokens.
// Suporta segmentação (audience) e integração com push_campaigns.
//
// Body:
// {
//   campaign_id?: string,          // se presente, atualiza contadores e grava eventos
//   title: string, body: string,
//   url?: string, icon?: string, data?: Record<string,string>,
//   audience?: {
//     all?: boolean,
//     platforms?: ("web"|"android"|"ios")[],
//     premium?: "premium"|"free"|"all",
//     user_ids?: string[],
//     emails?: string[],
//   },
//   tokens?: string[],             // envio direto (teste)
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { espelharPushNoCanal } from "../_shared/horusCanal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Audience {
  all?: boolean;
  platforms?: string[];
  premium?: "premium" | "free" | "all";
  user_ids?: string[];
  emails?: string[];
}
interface PushPayload {
  campaign_id?: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  image?: string;
  emoji?: string;
  data?: Record<string, string>;
  audience?: Audience;
  tokens?: string[];
  user_ids?: string[]; // compat legado
  /** Desliga o espelhamento no canal do WhatsApp (default: ligado). */
  mirror_canal?: boolean;
  /** Se true, prefixa "{primeiro_nome}, " no título e substitui placeholders. */
  personalize?: boolean;
}

/** Retorna o primeiro nome capitalizado. Fallback "Estudante". */
function primeiroNome(raw?: string | null): string {
  const s = String(raw || "").trim();
  if (!s) return "Estudante";
  const first = s.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function renderPersonal(template: string, nome: string): string {
  return template
    .replace(/\{primeiro_nome\}/gi, nome)
    .replace(/\{nome\}/gi, nome);
}

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsigned = `${enc(header)}.${enc(claim)}`;
  const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key,
    new TextEncoder().encode(unsigned)));
  const sigB64 = btoa(String.fromCharCode(...sig))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${unsigned}.${sigB64}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`OAuth error: ${JSON.stringify(j)}`);
  return j.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!raw) throw new Error("FCM_SERVICE_ACCOUNT_JSON not configured");
    const sa = JSON.parse(raw);
    const projectId = sa.project_id;

    const payload = (await req.json()) as PushPayload;
    if (!payload.title || !payload.body) throw new Error("title e body são obrigatórios");

    // Prefix emoji no título (se informado e ainda não presente)
    let displayTitle = payload.title;
    if (payload.emoji && !displayTitle.startsWith(payload.emoji)) {
      displayTitle = `${payload.emoji} ${displayTitle}`.trim();
    }

    // 1) Resolver tokens + user_id + platform
    type Row = { token: string; user_id: string; platform: string };
    let rows: Row[] = [];

    if (payload.tokens?.length) {
      const { data } = await supabase.from("device_tokens")
        .select("token,user_id,platform").in("token", payload.tokens);
      rows = (data ?? []) as Row[];
      // include unregistered tokens (test envs)
      const known = new Set(rows.map((r) => r.token));
      for (const t of payload.tokens) if (!known.has(t)) rows.push({ token: t, user_id: "", platform: "unknown" });
    } else {
      const a: Audience = payload.audience ?? { all: true };
      let userIds = a.user_ids ?? [];
      if (payload.user_ids?.length) userIds = userIds.concat(payload.user_ids);

      // resolve emails -> user_ids
      if (a.emails?.length) {
        const emails = a.emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
        // usa auth.admin list
        const { data: uList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const matched = (uList?.users ?? [])
          .filter((u) => u.email && emails.includes(u.email.toLowerCase()))
          .map((u) => u.id);
        userIds = userIds.concat(matched);
      }

      // premium filter
      let premiumUserIds: string[] | null = null;
      if (a.premium && a.premium !== "all") {
        const { data: pf } = await supabase.from("profiles")
          .select("id").eq("is_premium", a.premium === "premium");
        premiumUserIds = (pf ?? []).map((p: any) => p.id);
      }

      let q = supabase.from("device_tokens")
        .select("token,user_id,platform")
        // Ignora tokens invalidados (app desinstalado / dados limpos)
        .is("invalidated_at", null);
      if (a.platforms?.length) q = q.in("platform", a.platforms);
      if (userIds.length) q = q.in("user_id", [...new Set(userIds)]);
      else if (premiumUserIds) q = q.in("user_id", premiumUserIds.length ? premiumUserIds : ["00000000-0000-0000-0000-000000000000"]);
      // se all=true e sem filtros de user, envia para todos
      const { data, error } = await q.limit(50000);
      if (error) throw error;
      rows = (data ?? []) as Row[];

      if (premiumUserIds && !userIds.length) {
        const set = new Set(premiumUserIds);
        rows = rows.filter((r) => set.has(r.user_id));
      }
    }

    // dedupe
    const seen = new Set<string>();
    rows = rows.filter((r) => (seen.has(r.token) ? false : (seen.add(r.token), true)));

    if (!rows.length) {
      if (payload.campaign_id) {
        await supabase.from("push_campaigns").update({
          status: "completed", last_run_at: new Date().toISOString(),
        }).eq("id", payload.campaign_id);
      }
      const canalVazio = (payload.mirror_canal !== false && !payload.tokens?.length)
        ? await espelharPushNoCanal(supabase, {
          title: payload.title, body: payload.body, url: payload.url,
          image: payload.image, emoji: payload.emoji,
          campaign_id: payload.campaign_id,
          automation_key: payload.data?.automation_key,
          tipo: payload.data?.boletim_tipo,
        })
        : { skipped: "desligado" };
      return new Response(JSON.stringify({ sent: 0, failed: 0, total: 0, canal: canalVazio }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Personalização: monta mapa user_id -> primeiro nome.
    // Ativa se `personalize: true` OU se os templates já usam placeholders.
    const hasPlaceholder = /\{(primeiro_)?nome\}/i.test(payload.title) ||
      /\{(primeiro_)?nome\}/i.test(payload.body);
    const personalizeOn = Boolean(payload.personalize) || hasPlaceholder;
    const nomeMap = new Map<string, string>();
    if (personalizeOn) {
      const uids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      if (uids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", uids);
        for (const p of (profs ?? []) as any[]) {
          nomeMap.set(p.id, primeiroNome(p.display_name));
        }
      }
    }

    // 2) Envio FCM v1
    const accessToken = await getAccessToken(sa);
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const dataPayload: Record<string, string> = { ...(payload.data ?? {}) };
    if (payload.url) dataPayload.url = payload.url;
    if (payload.campaign_id) dataPayload.campaign_id = payload.campaign_id;
    if (payload.image) dataPayload.image = payload.image;

    const invalidTokens: { token: string; reason: string }[] = [];
    const events: any[] = [];
    let ok = 0, fail = 0;

    const BATCH = 100;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (r) => {
        const isWeb = r.platform === "web";

        // Título/corpo por usuário quando personalização está ligada.
        let perTitle = displayTitle;
        let perBody = payload.body;
        if (personalizeOn) {
          const nome = nomeMap.get(r.user_id) || "Estudante";
          if (hasPlaceholder) {
            perTitle = renderPersonal(displayTitle, nome);
            perBody = renderPersonal(payload.body, nome);
          } else if (payload.personalize) {
            // Prefixa nome no início do título se ainda não estiver lá.
            const already = perTitle.toLowerCase().startsWith(nome.toLowerCase());
            if (!already) perTitle = `${nome}, ${perTitle.charAt(0).toLowerCase()}${perTitle.slice(1)}`;
          }
        }

        const message: any = {
          token: r.token,
          data: dataPayload,
        };
        if (isWeb) {
          message.webpush = {
            notification: {
              title: perTitle,
              body: perBody,
              icon: payload.icon || "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              ...(payload.image ? { image: payload.image } : {}),
            },
            fcm_options: payload.url ? { link: payload.url } : undefined,
          };
        } else {
          // Android/iOS via Capacitor: notification no root abre a launcher
          // activity padrão no toque, e o Capacitor entrega `data` para o
          // listener `pushNotificationActionPerformed` (nativePush.ts).
          // NÃO usar click_action="FLUTTER_NOTIFICATION_CLICK" — é do Flutter,
          // e sem intent-filter correspondente o toque não abre o app.
          message.notification = {
            title: perTitle,
            body: perBody,
            ...(payload.image ? { image: payload.image } : {}),
          };
          message.android = {
            priority: "HIGH",
            notification: {
              // Canal precisa existir no app (criado em nativeNotificationChannels.ts).
              // Sem channel_id explícito, Android 8+ pode cair em canal "Miscellaneous"
              // com importância baixa e o banner não aparece.
              channel_id: "vacatio-alertas-v2",
              notification_priority: "PRIORITY_HIGH",
              visibility: "PUBLIC",
              sound: "default",
              default_vibrate_timings: true,
              default_light_settings: true,
              // Ícone monocromático (V branco) e cor de accent amarela (#FFD500)
              // — o Android pinta o ícone pequeno na status bar com essa cor.
              // O recurso `notification_icon` é instalado pelo workflow Android
              // (step "FCM default notification icon + color").
              icon: "notification_icon",
              color: "#FFD500",
              ...(payload.image ? { image: payload.image } : {}),
            },
          };
          // Duplica título/corpo em data para o handler em foreground ter
          // acesso mesmo quando o SDK do FCM consome message.notification.
          message.data = {
            ...message.data,
            title: perTitle,
            body: perBody,
          };
          // iOS: alta prioridade e mutable-content para permitir imagem/rich push
          message.apns = {
            ...(message.apns ?? {}),
            headers: {
              ...((message.apns?.headers) ?? {}),
              "apns-priority": "10",
              "apns-push-type": "alert",
            },
            payload: {
              aps: {
                "mutable-content": 1,
                sound: "default",
                ...((message.apns?.payload?.aps) ?? {}),
              },
            },
          };
          if (payload.image) {
            message.apns = {
              ...message.apns,
              fcm_options: { image: payload.image },
            };
          }
        }
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
          });
          if (resp.ok) return { ok: true, r };
          const errText = await resp.text();
          const isInvalid = resp.status === 404 ||
            /UNREGISTERED|INVALID_ARGUMENT|not.*registered/i.test(errText);
          if (isInvalid) {
            invalidTokens.push({
              token: r.token,
              reason: /UNREGISTERED|not.*registered/i.test(errText) || resp.status === 404
                ? "unregistered"
                : "invalid_argument",
            });
          }
          return { ok: false, r, err: `${resp.status}: ${errText.slice(0, 200)}` };
        } catch (e) {
          return { ok: false, r, err: String((e as Error).message) };
        }
      }));

      for (const x of results) {
        if (x.ok) {
          ok++;
          events.push({
            campaign_id: payload.campaign_id ?? null,
            token: x.r.token, user_id: x.r.user_id || null,
            platform: x.r.platform, event_type: "sent",
          });
        } else {
          fail++;
          events.push({
            campaign_id: payload.campaign_id ?? null,
            token: x.r.token, user_id: x.r.user_id || null,
            platform: x.r.platform, event_type: "failed", error: x.err,
          });
        }
      }
    }

    // Tokens inválidos: NÃO apagamos mais — marcamos como invalidados para
    // preservar o histórico de desinstalação (churn/reengajamento).
    // `unregistered` = app desinstalado ou dados do app limpos.
    if (invalidTokens.length) {
      const agora = new Date().toISOString();
      const porMotivo = new Map<string, string[]>();
      for (const it of invalidTokens) {
        const arr = porMotivo.get(it.reason) ?? [];
        arr.push(it.token);
        porMotivo.set(it.reason, arr);
      }
      for (const [reason, tokens] of porMotivo) {
        await supabase.from("device_tokens")
          .update({ invalidated_at: agora, invalid_reason: reason })
          .in("token", tokens);
      }
    }

    // Marca último envio bem-sucedido nos tokens que aceitaram a mensagem
    const okTokens = events.filter((e) => e.event_type === "sent").map((e) => e.token);
    if (okTokens.length) {
      const agora = new Date().toISOString();
      for (let i = 0; i < okTokens.length; i += 500) {
        await supabase.from("device_tokens")
          .update({ last_success_at: agora })
          .in("token", okTokens.slice(i, i + 500));
      }
    }

    // gravar eventos (chunks p/ evitar payload gigante)
    for (let i = 0; i < events.length; i += 500) {
      await supabase.from("push_events").insert(events.slice(i, i + 500));
    }

    if (payload.campaign_id) {
      const { data: current } = await supabase.from("push_campaigns")
        .select("sent_count,failed_count").eq("id", payload.campaign_id).single();
      await supabase.from("push_campaigns").update({
        sent_count: (current?.sent_count ?? 0) + ok,
        failed_count: (current?.failed_count ?? 0) + fail,
        status: "completed",
        last_run_at: new Date().toISOString(),
      }).eq("id", payload.campaign_id);
    }

    // Espelha no canal do WhatsApp (Horus). Não roda em envio de teste por token.
    let canal: unknown = { skipped: "desligado" };
    if (payload.mirror_canal !== false && !payload.tokens?.length) {
      let tipo = payload.data?.boletim_tipo;
      if (payload.campaign_id) {
        const { data: camp } = await supabase.from("push_campaigns")
          .select("tipo, automation_key, image_url").eq("id", payload.campaign_id).maybeSingle();
        if (camp) tipo = camp.tipo || tipo;
        canal = await espelharPushNoCanal(supabase, {
          title: payload.title,
          body: payload.body,
          url: payload.url,
          image: payload.image || camp?.image_url || undefined,
          emoji: payload.emoji,
          campaign_id: payload.campaign_id,
          automation_key: camp?.automation_key || payload.data?.automation_key,
          tipo,
        });
      } else {
        canal = await espelharPushNoCanal(supabase, {
          title: payload.title,
          body: payload.body,
          url: payload.url,
          image: payload.image,
          emoji: payload.emoji,
          automation_key: payload.data?.automation_key,
          tipo,
        });
      }
    }

    return new Response(
      JSON.stringify({ sent: ok, failed: fail, total: rows.length, invalid_removed: invalidTokens.length, canal }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-push error:", e);
    if ((await req.clone().json().catch(() => ({})))?.campaign_id) {
      await supabase.from("push_campaigns").update({ status: "failed" })
        .eq("id", (await req.clone().json().catch(() => ({} as any))).campaign_id);
    }
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
