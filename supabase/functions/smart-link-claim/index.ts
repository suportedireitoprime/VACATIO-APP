// deno-lint-ignore-file no-explicit-any
// Deferred deep link claim/consume endpoint (iOS fallback).
//
// POST { action: 'claim', target_path, platform? } → grava com fingerprint do request
// POST { action: 'consume', extra? } → devolve o target_path mais recente pro mesmo fingerprint
//
// Fingerprint = SHA-256(IP + UA + Accept-Language + (extra opcional)).
// TTL: 10 min.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fingerprintOf(req: Request, extra?: string): Promise<string> {
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'ip-unknown';
  const ua = req.headers.get('user-agent') ?? '';
  // Normaliza UA pra família (evita minor version differences entre navegador e app).
  const uaFamily = ua.match(/(iPhone|iPad|iPod|Android|Macintosh|Windows|Linux)/)?.[1] ?? 'unknown';
  const lang = req.headers.get('accept-language')?.split(',')[0]?.trim() ?? '';
  return sha256(`${ip}|${uaFamily}|${lang}|${extra ?? ''}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const action = String(body?.action ?? '');
  const extra = typeof body?.extra === 'string' ? body.extra : undefined;
  const fp = await fingerprintOf(req, extra);

  try {
    if (action === 'claim') {
      const target = String(body?.target_path ?? '');
      const platform = String(body?.platform ?? 'ios');
      if (!target || !target.startsWith('/')) {
        return new Response(JSON.stringify({ error: 'invalid_target' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await supabase.from('smart_link_claims').insert({
        fingerprint_hash: fp,
        target_path: target,
        platform,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'consume') {
      // pega o mais recente dos últimos 10 min ainda não consumido
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('smart_link_claims')
        .select('id,target_path,created_at')
        .eq('fingerprint_hash', fp)
        .is('consumed_at', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      if (!row) {
        return new Response(JSON.stringify({ target_path: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      await supabase
        .from('smart_link_claims')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', row.id);
      return new Response(JSON.stringify({ target_path: row.target_path }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'unknown_action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[smart-link-claim] error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'internal' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
