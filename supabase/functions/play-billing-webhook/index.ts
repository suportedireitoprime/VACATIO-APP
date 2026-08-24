// Recebe Real-time Developer Notifications do Google Play via Pub/Sub push.
// Cobre:
//  - subscriptionNotification (compra, renovação, cancelamento, revogação, expiração)
//  - voidedPurchaseNotification (reembolso do admin, chargeback, refund do usuário)
//  - oneTimeProductNotification (apenas logado por ora)
import { createClient } from 'npm:@supabase/supabase-js@2';

const PACKAGE_NAME = Deno.env.get('ANDROID_PACKAGE_NAME') ?? '';
const SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') ?? '';
const PUBSUB_TOKEN = Deno.env.get('GOOGLE_PLAY_PUBSUB_VERIFICATION_TOKEN') ?? '';

type SubscriptionStatus =
  | 'SUBSCRIPTION_STATE_UNSPECIFIED'
  | 'SUBSCRIPTION_STATE_PENDING'
  | 'SUBSCRIPTION_STATE_ACTIVE'
  | 'SUBSCRIPTION_STATE_PAUSED'
  | 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
  | 'SUBSCRIPTION_STATE_ON_HOLD'
  | 'SUBSCRIPTION_STATE_CANCELED'
  | 'SUBSCRIPTION_STATE_EXPIRED';

// Mapeamento oficial dos notificationType do Google (subscription):
// https://developer.android.com/google/play/billing/rtdn-reference#sub
const SUB_NOTIF_TYPE: Record<number, string> = {
  1: 'SUBSCRIPTION_RECOVERED',
  2: 'SUBSCRIPTION_RENEWED',
  3: 'SUBSCRIPTION_CANCELED',
  4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD',
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
  7: 'SUBSCRIPTION_RESTARTED',
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
  9: 'SUBSCRIPTION_DEFERRED',
  10: 'SUBSCRIPTION_PAUSED',
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
  12: 'SUBSCRIPTION_REVOKED',
  13: 'SUBSCRIPTION_EXPIRED',
  20: 'SUBSCRIPTION_PENDING_PURCHASE_CANCELED',
};

function mapStatus(gJson: any, notificationType?: number): SubscriptionStatus {
  const expiryMs = Number(gJson?.expiryTimeMillis ?? 0);
  const nowMs = Date.now();
  if (notificationType === 12) return 'SUBSCRIPTION_STATE_CANCELED'; // REVOKED
  if (notificationType === 13) return 'SUBSCRIPTION_STATE_EXPIRED';
  if (notificationType === 3 && expiryMs < nowMs) return 'SUBSCRIPTION_STATE_CANCELED';
  if (notificationType === 5) return 'SUBSCRIPTION_STATE_ON_HOLD';
  if (notificationType === 6) return 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
  if (notificationType === 10) return 'SUBSCRIPTION_STATE_PAUSED';
  if (gJson?.cancelReason != null && expiryMs < nowMs) return 'SUBSCRIPTION_STATE_CANCELED';
  if (expiryMs && expiryMs < nowMs) return 'SUBSCRIPTION_STATE_EXPIRED';
  return 'SUBSCRIPTION_STATE_ACTIVE';
}

let tokenCache: { token: string; exp: number } | null = null;

async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp - 60 > now) return tokenCache.token;
  const sa = JSON.parse(SERVICE_ACCOUNT_JSON);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  };
  const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const enc = new TextEncoder();
  const toSign = `${b64url(enc.encode(JSON.stringify(header)))}.${b64url(enc.encode(JSON.stringify(claim)))}`;
  const pem = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(toSign)));
  const jwt = `${toSign}.${b64url(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Google OAuth failed: ${JSON.stringify(json)}`);
  tokenCache = { token: json.access_token, exp: now + 3500 };
  return json.access_token;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!PUBSUB_TOKEN || token !== PUBSUB_TOKEN) {
      console.warn('play-billing-webhook unauthorized (token missing or mismatch)');
      return new Response('unauthorized', { status: 401 });
    }

    const body = await req.json();
    const b64: string | undefined = body?.message?.data;
    if (!b64) {
      console.log('play-billing-webhook no data');
      return new Response('no data', { status: 200 });
    }
    const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))));
    console.log('play-billing-webhook decoded', JSON.stringify(decoded));

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Test notification enviada pelo Play Console — só confirma que o canal está vivo.
    if (decoded.testNotification) {
      console.log('play-billing-webhook TEST notification received', decoded.testNotification);
      return new Response('ok', { status: 200 });
    }

    // === Reembolso / estorno / chargeback ===
    if (decoded.voidedPurchaseNotification) {
      const v = decoded.voidedPurchaseNotification;
      const purchaseToken: string | undefined = v.purchaseToken;
      const orderId: string | undefined = v.orderId;
      // productType: 1 = subscription, 2 = one-time
      // refundType: 1 = full refund, 2 = quantity-based partial refund
      const refundType = v.refundType ?? null;

      if (!purchaseToken && !orderId) {
        console.warn('voidedPurchaseNotification without token/orderId', v);
        return new Response('ok', { status: 200 });
      }

      const patch: Record<string, unknown> = {
        status: 'SUBSCRIPTION_STATE_CANCELED',
        cancel_reason: `REFUND${refundType ? `:${refundType}` : ''}`,
        auto_renewing: false,
        expires_at: new Date().toISOString(), // derruba premium AGORA
        latest_notification_type: 'VOIDED_PURCHASE',
        latest_notification_at: new Date().toISOString(),
        raw_payload: decoded,
      };

      let q = admin.from('play_subscriptions').update(patch);
      if (purchaseToken) q = q.eq('purchase_token', purchaseToken);
      else q = q.eq('order_id', orderId!);

      const { error, count } = await q.select('id', { count: 'exact' });
      if (error) {
        console.error('voidedPurchase update failed', error);
      } else {
        console.log('voidedPurchase applied', { purchaseToken, orderId, refundType, rows: count });
      }
      return new Response('ok', { status: 200 });
    }

    // === Compra única (log apenas) ===
    if (decoded.oneTimeProductNotification) {
      console.log('oneTimeProductNotification', decoded.oneTimeProductNotification);
      return new Response('ok', { status: 200 });
    }

    // === Assinatura ===
    const sub = decoded.subscriptionNotification;
    if (!sub) {
      console.log('play-billing-webhook ignored (no known notification key)');
      return new Response('ignored', { status: 200 });
    }

    const { subscriptionId: productId, purchaseToken, notificationType } = sub;
    const notifTypeLabel = SUB_NOTIF_TYPE[notificationType] ?? String(notificationType ?? '');

    const accessToken = await getGoogleAccessToken();
    const googleUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
    const gRes = await fetch(googleUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const gJson = await gRes.json();
    if (!gRes.ok) {
      console.error('Google API error', gRes.status, gJson);
      return new Response('ok', { status: 200 });
    }

    const status = mapStatus(gJson, notificationType);
    const expiryMs = Number(gJson.expiryTimeMillis ?? 0);
    const nowMs = Date.now();

    // Se foi revoke/cancel/expire e o Google ainda não devolveu expiry no passado,
    // forçamos expiração imediata para não segurar premium com base no relógio do cliente.
    let effectiveExpiryMs = expiryMs;
    if ((notificationType === 12 || notificationType === 13) && (!expiryMs || expiryMs > nowMs)) {
      effectiveExpiryMs = nowMs;
    }

    const developerUserId =
      (typeof gJson.developerPayload === 'string' && gJson.developerPayload) ||
      gJson.obfuscatedExternalAccountId ||
      null;

    const patch: Record<string, unknown> = {
      user_id: developerUserId ?? undefined,
      product_id: productId,
      purchase_token: purchaseToken,
      order_id: gJson.orderId ?? null,
      status,
      auto_renewing: !!gJson.autoRenewing,
      start_time: gJson.startTimeMillis ? new Date(Number(gJson.startTimeMillis)).toISOString() : null,
      expires_at: effectiveExpiryMs ? new Date(effectiveExpiryMs).toISOString() : null,
      cancel_reason: gJson.cancelReason != null ? String(gJson.cancelReason) : null,
      latest_notification_type: notifTypeLabel,
      latest_notification_at: new Date().toISOString(),
      raw_payload: gJson,
    };
    Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);

    const { error: upErr } = await admin
      .from('play_subscriptions')
      .upsert(patch, { onConflict: 'purchase_token' });
    if (upErr) console.error('upsert play_subscriptions falhou', upErr);
    else console.log('subscriptionNotification applied', { productId, notifTypeLabel, status });

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('play-billing-webhook error', err);
    return new Response('error', { status: 200 }); // 200 pra Pub/Sub não reenviar em loop
  }
});
