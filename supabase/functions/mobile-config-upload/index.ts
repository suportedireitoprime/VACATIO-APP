// Edge Function: mobile-config-upload
// Upload/list/delete arquivos do bucket `mobile-config` (ícones, splash,
// google-services.json). Apenas o admin (validado por email) pode gravar.
// O bucket é privado; o workflow do GitHub Actions baixa via service-role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ADMIN_EMAILS = ['wn7corporation@gmail.com', 'suporte.vacatio@gmail.com'];
const BUCKET = 'mobile-config';

// arquivos permitidos + validações
const ALLOWED: Record<string, { mimes: string[]; maxBytes: number }> = {
  'icon.png':                { mimes: ['image/png'], maxBytes: 5_000_000 },
  'icon-foreground.png':     { mimes: ['image/png'], maxBytes: 5_000_000 },
  'icon-background.png':     { mimes: ['image/png'], maxBytes: 5_000_000 },
  'splash.png':              { mimes: ['image/png'], maxBytes: 10_000_000 },
  'splash-dark.png':         { mimes: ['image/png'], maxBytes: 10_000_000 },
  'notification-icon.png':   { mimes: ['image/png'], maxBytes: 5_000_000 },
  'google-services.json':    { mimes: ['application/json', 'text/plain'], maxBytes: 100_000 },
  'GoogleService-Info.plist':{ mimes: ['application/xml', 'text/xml', 'text/plain'], maxBytes: 100_000 },
  'app-name.txt':            { mimes: ['text/plain'], maxBytes: 200 },
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const admin = createClient(url, serviceKey);

  try {
    // valida usuário
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user || !ADMIN_EMAILS.includes((userRes.user.email || '').toLowerCase())) {
      return json({ error: 'forbidden' }, 403);
    }

    const body = await req.json();
    const action = body?.action as string;

    if (action === 'list') {
      const { data, error } = await admin.storage.from(BUCKET).list('', { limit: 100 });
      if (error) return json({ error: error.message }, 500);
      return json({ files: data });
    }

    if (action === 'upload') {
      const { filename, contentBase64, contentType } = body || {};
      if (!filename || !contentBase64) return json({ error: 'missing filename or contentBase64' }, 400);
      const rule = ALLOWED[filename];
      if (!rule) return json({ error: `filename not allowed: ${filename}` }, 400);

      // decode base64 (suporta data URL)
      const b64 = String(contentBase64).replace(/^data:[^;]+;base64,/, '');
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (bytes.byteLength > rule.maxBytes) return json({ error: `file too large (max ${rule.maxBytes} bytes)` }, 400);

      const ct = contentType || rule.mimes[0];
      if (!rule.mimes.includes(ct)) return json({ error: `bad content-type: ${ct}` }, 400);

      const { error } = await admin.storage
        .from(BUCKET)
        .upload(filename, bytes, { contentType: ct, upsert: true });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, filename, size: bytes.byteLength });
    }

    if (action === 'delete') {
      const { filename } = body || {};
      if (!filename || !ALLOWED[filename]) return json({ error: 'invalid filename' }, 400);
      const { error } = await admin.storage.from(BUCKET).remove([filename]);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'signed_url') {
      const { filename } = body || {};
      if (!filename) return json({ error: 'missing filename' }, 400);
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(filename, 60 * 10);
      if (error) return json({ error: error.message }, 500);
      return json({ url: data.signedUrl });
    }

    return json({ error: `unknown action: ${action}` }, 400);
  } catch (e) {
    console.error('mobile-config-upload error', e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
