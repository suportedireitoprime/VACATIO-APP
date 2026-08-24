// Retorna o valor de um secret do Android como TXT.
// Exige: usuário logado + e-mail na lista ADMIN_DOWNLOAD_EMAILS + senha ADMIN_DOWNLOAD_PASSWORD.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_ANDROID = [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'GOOGLE_WEB_CLIENT_ID',
] as const;

const ALLOWED_APPLE = [
  'APPLE_TEAM_ID',
  'APPLE_BUNDLE_ID',
  'APPLE_APP_STORE_CONNECT_KEY_ID',
  'APPLE_APP_STORE_CONNECT_ISSUER_ID',
  'APPLE_APP_STORE_CONNECT_KEY_P8_BASE64',
  'APPLE_DISTRIBUTION_CERT_P12_BASE64',
  'APPLE_DISTRIBUTION_CERT_PASSWORD',
  'APPLE_PROVISIONING_PROFILE_BASE64',
  'KEYCHAIN_PASSWORD',
] as const;

const ALLOWED = new Set<string>([...ALLOWED_ANDROID, ...ALLOWED_APPLE]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const email = (claimsData.claims.email as string || '').toLowerCase();
    // Fallback: admins fixos do app (src/lib/adminEmails.ts). O env var
    // ADMIN_DOWNLOAD_EMAILS estende essa lista, mas não é obrigatório.
    const DEFAULT_ADMINS = ['wn7corporation@gmail.com', 'suporte.vacatio@gmail.com'];
    const envAdmins = (Deno.env.get('ADMIN_DOWNLOAD_EMAILS') || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const admins = new Set([...DEFAULT_ADMINS, ...envAdmins]);
    if (!admins.has(email)) return json({ error: 'Forbidden', email }, 403);

    const { password, secretName, listOnly } = await req.json();

    if (listOnly) {
      // Retorna quais existem + fingerprint (últimos 4 chars + tamanho) para conferência.
      const present = [...ALLOWED].filter(n => !!Deno.env.get(n));
      const fingerprints: Record<string, { last4: string; length: number }> = {};
      for (const n of present) {
        const v = Deno.env.get(n) || '';
        fingerprints[n] = { last4: v.slice(-4), length: v.length };
      }
      return json({
        available: present,
        fingerprints,
        groups: {
          android: [...ALLOWED_ANDROID],
          apple: [...ALLOWED_APPLE],
        },
      });
    }

    const expected = Deno.env.get('ADMIN_DOWNLOAD_PASSWORD') || '';
    if (!expected || password !== expected) return json({ error: 'Senha inválida' }, 401);

    if (!secretName || !ALLOWED.has(secretName)) return json({ error: 'Secret não permitido' }, 400);
    const value = Deno.env.get(secretName);
    if (!value) return json({ error: 'Secret vazio' }, 404);

    return new Response(value, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${secretName}.txt"`,
      },
    });
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
