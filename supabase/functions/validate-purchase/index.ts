// Valida uma compra do Google Play OU da Apple App Store e faz upsert
// em public.play_subscriptions / public.apple_subscriptions.
// Usado por public.is_premium_user para liberar recursos premium.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  BUNDLE_ID,
  getSubscriptionStatuses,
  mapAppleStatus,
} from '../_shared/apple-storekit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PACKAGE_NAME = Deno.env.get('ANDROID_PACKAGE_NAME') ?? '';
const SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') ?? '';

type PlaySubscriptionStatus =
  | 'SUBSCRIPTION_STATE_UNSPECIFIED'
  | 'SUBSCRIPTION_STATE_PENDING'
  | 'SUBSCRIPTION_STATE_ACTIVE'
  | 'SUBSCRIPTION_STATE_PAUSED'
  | 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
  | 'SUBSCRIPTION_STATE_ON_HOLD'
  | 'SUBSCRIPTION_STATE_CANCELED'
  | 'SUBSCRIPTION_STATE_EXPIRED';

function mapPlayStatus(gJson: any): PlaySubscriptionStatus {
  const expiryMs = Number(gJson.expiryTimeMillis ?? 0);
  const nowMs = Date.now();
  if (gJson.cancelReason != null && expiryMs < nowMs) return 'SUBSCRIPTION_STATE_CANCELED';
  if (expiryMs < nowMs) return 'SUBSCRIPTION_STATE_EXPIRED';
  if (gJson.paymentState === 0) return 'SUBSCRIPTION_STATE_PENDING';
  return 'SUBSCRIPTION_STATE_ACTIVE';
}

// Cache do access token dentro do isolate (economiza ~800ms/compra)
let tokenCache: { token: string; exp: number } | null = null;

async function getGoogleAccessToken(): Promise<string> {
  if (!SERVICE_ACCOUNT_JSON) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON não configurado');
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp - 60 > now) return tokenCache.token;
  const sa = JSON.parse(SERVICE_ACCOUNT_JSON);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64url = (b: Uint8Array) =>
    btoa(String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const enc = new TextEncoder();
  const headerB64 = b64url(enc.encode(JSON.stringify(header)));
  const claimB64 = b64url(enc.encode(JSON.stringify(claim)));
  const toSign = `${headerB64}.${claimB64}`;

  const pem = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(toSign)));
  const jwt = `${toSign}.${b64url(sig)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Google OAuth failed: ${JSON.stringify(json)}`);
  tokenCache = { token: json.access_token as string, exp: now + 3500 };
  return json.access_token as string;
}

/** Side-effects após confirmar assinatura ativa: espelho em user_subscriptions,
 *  cancela trial_reminders pendentes e envia push nativo de "Premium ativado". */
async function onSubscriptionActivated(admin: ReturnType<typeof createClient>, params: {
  userId: string;
  productId: string;
  platform: 'ios' | 'android';
  purchaseToken: string;
  expiresAtIso: string | null;
}) {
  const { userId, productId, platform, purchaseToken, expiresAtIso } = params;
  try {
    await admin.from('user_subscriptions').upsert({
      user_id: userId,
      product_id: productId,
      purchase_token: purchaseToken,
      status: 'active',
      expires_at: expiresAtIso,
      auto_renewing: true,
      platform,
    }, { onConflict: 'purchase_token' });
  } catch (e) { console.warn('mirror user_subscriptions falhou (não fatal)', e); }

  try {
    await admin.from('trial_reminders')
      .update({ status: 'canceled' })
      .eq('user_id', userId)
      .in('status', ['pending', 'scheduled']);
  } catch (e) { console.warn('cancelar trial_reminders falhou (não fatal)', e); }

  // Push nativo de boas-vindas (via send-push, mesma pipeline do admin_boletim)
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        title: '🎉 Premium ativado',
        body: 'Bem-vindo! Todos os recursos já estão liberados. Bons estudos.',
        url: '/aprender',
        audience: { user_ids: [userId] },
        data: { motivo: 'premium_ativado' },
      }),
    });
  } catch (e) { console.warn('push premium_ativado falhou (não fatal)', e); }
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    const { productId, purchaseToken, platform = 'android' } = await req.json();
    if (!productId || !purchaseToken) {
      return new Response(JSON.stringify({ error: 'productId e purchaseToken obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ─────────────────────────── iOS ───────────────────────────
    if (platform === 'ios') {
      // purchaseToken aqui é o transactionId (StoreKit 2).
      const info = await getSubscriptionStatuses(purchaseToken);
      if (!info) {
        return new Response(JSON.stringify({ success: false, error: 'Transação Apple não encontrada' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const tx = info.transactionInfo ?? {};
      const status = mapAppleStatus(info.autoRenewStatus, tx);
      const expiresMs = Number(tx.expiresDate ?? 0);
      const startMs = Number(tx.purchaseDate ?? 0);
      const originalTxId = String(tx.originalTransactionId ?? purchaseToken);
      const latestTxId = String(tx.transactionId ?? purchaseToken);

      const { error: upErr } = await admin
        .from('apple_subscriptions')
        .upsert({
          user_id: userId,
          product_id: tx.productId ?? productId,
          original_transaction_id: originalTxId,
          latest_transaction_id: latestTxId,
          bundle_id: tx.bundleId ?? BUNDLE_ID,
          environment: info.environment,
          status,
          auto_renewing: info.renewalInfo?.autoRenewStatus === 1,
          start_time: startMs ? new Date(startMs).toISOString() : null,
          expires_at: expiresMs ? new Date(expiresMs).toISOString() : null,
          cancel_reason: tx.revocationReason != null ? String(tx.revocationReason) : null,
          raw_payload: { transactionInfo: tx, renewalInfo: info.renewalInfo, autoRenewStatus: info.autoRenewStatus },
        }, { onConflict: 'original_transaction_id' });
      if (upErr) throw upErr;

      if (status === 'active' || status === 'in_grace') {
        await onSubscriptionActivated(admin, {
          userId,
          productId: (tx.productId ?? productId) as string,
          platform: 'ios',
          purchaseToken: latestTxId,
          expiresAtIso: expiresMs ? new Date(expiresMs).toISOString() : null,
        });
      }

      return new Response(JSON.stringify({ success: true, status, expiresAt: expiresMs, environment: info.environment }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─────────────────────────── Android ───────────────────────────
    const accessToken = await getGoogleAccessToken();
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
    const gRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const gJson = await gRes.json();
    if (!gRes.ok) {
      return new Response(JSON.stringify({ success: false, error: gJson?.error?.message ?? 'Google API error', raw: gJson }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const status = mapPlayStatus(gJson);
    const expiryMs = Number(gJson.expiryTimeMillis ?? 0);

    const { error: upErr } = await admin
      .from('play_subscriptions')
      .upsert({
        user_id: userId,
        product_id: productId,
        base_plan_id: gJson.basePlanId ?? null,
        purchase_token: purchaseToken,
        order_id: gJson.orderId ?? null,
        status,
        auto_renewing: !!gJson.autoRenewing,
        start_time: gJson.startTimeMillis ? new Date(Number(gJson.startTimeMillis)).toISOString() : null,
        expires_at: expiryMs ? new Date(expiryMs).toISOString() : null,
        cancel_reason: gJson.cancelReason != null ? String(gJson.cancelReason) : null,
        raw_payload: gJson,
      }, { onConflict: 'purchase_token' });
    if (upErr) throw upErr;

    try {
      if (gJson.acknowledgementState === 0 && status === 'SUBSCRIPTION_STATE_ACTIVE') {
        const ackUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
        const ackRes = await fetch(ackUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ developerPayload: userId }),
        });
        if (!ackRes.ok) {
          const txt = await ackRes.text();
          console.warn('acknowledge falhou (não fatal)', ackRes.status, txt);
        }
      }
    } catch (ackErr) {
      console.warn('acknowledge exception (não fatal)', ackErr);
    }

    if (status === 'SUBSCRIPTION_STATE_ACTIVE' || status === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') {
      await onSubscriptionActivated(admin, {
        userId,
        productId,
        platform: 'android',
        purchaseToken,
        expiresAtIso: expiryMs ? new Date(expiryMs).toISOString() : null,
      });
    }

    return new Response(JSON.stringify({ success: true, status, expiresAt: expiryMs }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('validate-purchase error', err);
    return new Response(JSON.stringify({ success: false, error: err?.message ?? String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
