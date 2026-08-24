// Helpers para App Store Server API (Apple)
// - assinar JWT ES256 com chave .p8 (base64)
// - decodificar JWS de signedTransactionInfo / signedRenewalInfo
// - mapear status para nosso enum interno

const ISSUER_ID = Deno.env.get('APPLE_APP_STORE_CONNECT_ISSUER_ID') ?? '';
const KEY_ID = Deno.env.get('APPLE_APP_STORE_CONNECT_KEY_ID') ?? '';
const KEY_P8_BASE64 = Deno.env.get('APPLE_APP_STORE_CONNECT_KEY_P8_BASE64') ?? '';
export const BUNDLE_ID = Deno.env.get('APPLE_BUNDLE_ID') ?? '';

const b64urlBytes = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const b64urlStr = (s: string) => b64urlBytes(new TextEncoder().encode(s));
const b64urlDecode = (s: string) => {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
};

function pemToDer(p8Base64: string): Uint8Array {
  const pem = atob(p8Base64);
  const body = pem.replace(/-----(BEGIN|END)[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

// JOSE ES256 signature vem em (r,s) IEEE-P1363, 64 bytes. crypto.subtle já retorna nesse formato.
export async function signAppleJwt(): Promise<string> {
  if (!ISSUER_ID || !KEY_ID || !KEY_P8_BASE64 || !BUNDLE_ID) {
    throw new Error('Secrets Apple ausentes (APPLE_APP_STORE_CONNECT_*/APPLE_BUNDLE_ID)');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const claim = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 20 * 60,
    aud: 'appstoreconnect-v1',
    bid: BUNDLE_ID,
  };
  const toSign = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(claim))}`;
  const der = pemToDer(KEY_P8_BASE64);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(toSign)),
  );
  return `${toSign}.${b64urlBytes(sig)}`;
}

// Faz uma request na App Store Server API (produção). Se retornar 4040010 (TransactionIdNotFoundError),
// tenta o ambiente sandbox automaticamente.
export async function appleGet(path: string): Promise<{ status: number; json: any; environment: 'Production' | 'Sandbox' }> {
  const jwt = await signAppleJwt();
  const prodUrl = `https://api.storekit.itunes.apple.com${path}`;
  let res = await fetch(prodUrl, { headers: { Authorization: `Bearer ${jwt}` } });
  let json: any = null;
  try { json = await res.json(); } catch (_) { json = null; }
  if (res.status === 404 && json?.errorCode === 4040010) {
    const sandboxUrl = `https://api.storekit-sandbox.itunes.apple.com${path}`;
    res = await fetch(sandboxUrl, { headers: { Authorization: `Bearer ${jwt}` } });
    try { json = await res.json(); } catch (_) { json = null; }
    return { status: res.status, json, environment: 'Sandbox' };
  }
  return { status: res.status, json, environment: 'Production' };
}

// Decodifica um JWS da Apple sem validar assinatura (payload é confiável pois vem via HTTPS autenticado).
export function decodeAppleJws<T = any>(jws: string | null | undefined): T | null {
  if (!jws) return null;
  const parts = jws.split('.');
  if (parts.length < 2) return null;
  try { return JSON.parse(b64urlDecode(parts[1])); } catch { return null; }
}

// Recupera info da transação (transactionInfo + renewalInfo + status) a partir de uma transactionId.
export async function getSubscriptionStatuses(transactionId: string) {
  const path = `/inApps/v1/subscriptions/${encodeURIComponent(transactionId)}`;
  const { status, json, environment } = await appleGet(path);
  if (status !== 200) {
    throw new Error(`Apple API ${status}: ${JSON.stringify(json)}`);
  }
  // json.data: [{ subscriptionGroupIdentifier, lastTransactions: [{ status, signedTransactionInfo, signedRenewalInfo, originalTransactionId }] }]
  const items = Array.isArray(json?.data) ? json.data : [];
  const last = items[0]?.lastTransactions?.[0];
  if (!last) return null;
  return {
    environment,
    subscriptionGroupIdentifier: items[0]?.subscriptionGroupIdentifier,
    autoRenewStatus: last.status, // 1 active, 2 expired, 3 in retry (billing), 4 grace, 5 revoked
    transactionInfo: decodeAppleJws<any>(last.signedTransactionInfo),
    renewalInfo: decodeAppleJws<any>(last.signedRenewalInfo),
  };
}

// Mapeia estado da Apple para nosso enum simples usado em apple_subscriptions.status
export function mapAppleStatus(autoRenewStatus: number, tx: any): string {
  const nowMs = Date.now();
  const expiresMs = Number(tx?.expiresDate ?? 0);
  const revokedMs = Number(tx?.revocationDate ?? 0);
  if (revokedMs > 0) return 'revoked';
  switch (autoRenewStatus) {
    case 1: return expiresMs && expiresMs < nowMs ? 'expired' : 'active';
    case 2: return 'expired';
    case 3: return 'on_hold';
    case 4: return 'in_grace';
    case 5: return 'revoked';
    default: return 'unknown';
  }
}
