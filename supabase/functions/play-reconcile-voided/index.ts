// Reconcilia reembolsos do Google Play caso a RTDN não chegue.
// Roda em cron diário. Lê a Voided Purchases API das últimas 72h e
// atualiza play_subscriptions para CANCELED + expires_at=now nos tokens
// afetados. Também expira linhas ACTIVE cujo expires_at já passou.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PACKAGE_NAME = Deno.env.get('ANDROID_PACKAGE_NAME') ?? '';
const SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') ?? '';

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const summary = { voided_found: 0, voided_applied: 0, expired_swept: 0, errors: [] as string[] };

  // 1) Voided purchases da API
  try {
    if (!PACKAGE_NAME || !SERVICE_ACCOUNT_JSON) throw new Error('missing android env');
    const startMs = Date.now() - 72 * 3600 * 1000;
    const accessToken = await getGoogleAccessToken();
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/voidedpurchases?startTime=${startMs}&type=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await res.json();
    if (!res.ok) throw new Error(`voidedpurchases ${res.status}: ${JSON.stringify(json)}`);

    const voided: any[] = json.voidedPurchases ?? [];
    summary.voided_found = voided.length;
    const nowIso = new Date().toISOString();

    for (const v of voided) {
      const purchaseToken = v.purchaseToken as string | undefined;
      const orderId = v.orderId as string | undefined;
      if (!purchaseToken && !orderId) continue;

      const patch = {
        status: 'SUBSCRIPTION_STATE_CANCELED',
        cancel_reason: `REFUND_RECONCILE${v.voidedReason != null ? `:${v.voidedReason}` : ''}`,
        auto_renewing: false,
        expires_at: nowIso,
        latest_notification_type: 'VOIDED_PURCHASE_RECONCILE',
        latest_notification_at: nowIso,
      };
      let q = admin.from('play_subscriptions').update(patch);
      if (purchaseToken) q = q.eq('purchase_token', purchaseToken);
      else q = q.eq('order_id', orderId!);
      const { data, error } = await q.select('id');
      if (error) summary.errors.push(`update ${purchaseToken ?? orderId}: ${error.message}`);
      else summary.voided_applied += data?.length ?? 0;
    }
  } catch (e) {
    summary.errors.push(`voided_fetch: ${String(e)}`);
  }

  // 2) Sweep: linhas ACTIVE já vencidas
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from('play_subscriptions')
      .update({
        status: 'SUBSCRIPTION_STATE_EXPIRED',
        latest_notification_type: 'AUTO_EXPIRE_SWEEP',
        latest_notification_at: nowIso,
      })
      .eq('status', 'SUBSCRIPTION_STATE_ACTIVE')
      .lt('expires_at', nowIso)
      .select('id');
    if (error) summary.errors.push(`sweep: ${error.message}`);
    else summary.expired_swept = data?.length ?? 0;
  } catch (e) {
    summary.errors.push(`sweep: ${String(e)}`);
  }

  console.log('play-reconcile-voided', summary);
  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
