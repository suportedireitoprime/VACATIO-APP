// Endpoint único do fluxo de login por QR-code no desktop.
// action=create → gera token pendente (público). Aceita desktop_id.
// action=poll   → desktop consulta status; devolve otp_hash uma única vez (público)
// action=claim  → celular autenticado vincula seu usuário ao token (Bearer JWT).
//                 Revoga sessões desktop anteriores e cria nova (24h).
// action=session_status → desktop consulta se sua sessão foi revogada/expirou.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const QR_TTL_SECONDS = 60;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').trim();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (action === 'create') {
      // Limpeza oportunista.
      await admin.from('desktop_link_tokens').delete().lt('expires_at', new Date().toISOString());
      await admin
        .from('desktop_sessions')
        .delete()
        .lt('expires_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const desktopId = typeof body?.desktop_id === 'string' ? body.desktop_id.slice(0, 128) : null;
      const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000).toISOString();

      const { data, error } = await admin
        .from('desktop_link_tokens')
        .insert({ desktop_id: desktopId, expires_at: expiresAt })
        .select('token, expires_at')
        .single();
      if (error) throw error;
      return json({ token: data.token, expires_at: data.expires_at, expires_in_seconds: QR_TTL_SECONDS });
    }

    if (action === 'session_status') {
      const sessionId = String(body?.session_id || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return json({ status: 'invalid' }, 400);
      const { data: row } = await admin
        .from('desktop_sessions')
        .select('revoked_at, expires_at')
        .eq('id', sessionId)
        .maybeSingle();
      if (!row) return json({ status: 'not_found' });
      if (row.revoked_at) return json({ status: 'revoked' });
      if (new Date(row.expires_at).getTime() < Date.now()) return json({ status: 'expired' });
      return json({ status: 'active', expires_at: row.expires_at });
    }

    const token = String(body?.token || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: 'invalid_token' }, 400);

    if (action === 'poll') {
      const { data: row, error } = await admin
        .from('desktop_link_tokens')
        .select('status, otp_hash, action_link, email, expires_at')
        .eq('token', token)
        .maybeSingle();
      if (error) throw error;
      if (!row) return json({ status: 'not_found' }, 404);

      if (row.status === 'pending') {
        if (new Date(row.expires_at).getTime() < Date.now()) {
          await admin.from('desktop_link_tokens').delete().eq('token', token);
          return json({ status: 'expired' });
        }
        return json({ status: 'pending' });
      }
      if (row.status === 'claimed' && row.otp_hash) {
        const { data: updated } = await admin
          .from('desktop_link_tokens')
          .update({ status: 'consumed' })
          .eq('token', token)
          .eq('status', 'claimed')
          .select('otp_hash, action_link, email')
          .maybeSingle();
        if (!updated) return json({ status: 'consumed' });
        // Também devolve o session_id ativo mais recente desse email.
        let sessionId: string | null = null;
        if (updated.email) {
          const { data: userRow } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
          void userRow;
          const { data: sess } = await admin
            .from('desktop_sessions')
            .select('id, user_id')
            .is('revoked_at', null)
            .order('created_at', { ascending: false })
            .limit(1);
          if (sess && sess.length > 0) sessionId = sess[0].id;
        }
        return json({
          status: 'claimed',
          token_hash: updated.otp_hash,
          action_link: updated.action_link,
          email: updated.email,
          session_id: sessionId,
        });
      }
      return json({ status: row.status });
    }

    if (action === 'claim') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return json({ error: 'missing_auth' }, 401);

      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !userData?.user?.email) return json({ error: 'invalid_session' }, 401);
      const user = userData.user;

      const { data: row } = await admin
        .from('desktop_link_tokens')
        .select('token, status, expires_at, desktop_id')
        .eq('token', token)
        .maybeSingle();
      if (!row) return json({ error: 'token_not_found' }, 404);
      if (row.status !== 'pending') return json({ error: 'token_already_used' }, 409);
      if (new Date(row.expires_at).getTime() < Date.now())
        return json({ error: 'token_expired' }, 410);

      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email!,
      });
      if (linkErr) throw linkErr;
      const otpHash = linkData?.properties?.hashed_token;
      const actionLink = linkData?.properties?.action_link;
      if (!otpHash) throw new Error('magic_link_missing_hash');

      // Revoga todas as sessões desktop anteriores desse usuário.
      await admin
        .from('desktop_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('revoked_at', null);

      // Cria nova sessão desktop (24h) — só se soubermos o desktop_id.
      let sessionId: string | null = null;
      if (row.desktop_id) {
        const { data: sess } = await admin
          .from('desktop_sessions')
          .insert({
            user_id: user.id,
            desktop_id: row.desktop_id,
            user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
          })
          .select('id')
          .single();
        sessionId = sess?.id ?? null;
      }

      const { error: updErr } = await admin
        .from('desktop_link_tokens')
        .update({
          status: 'claimed',
          user_id: user.id,
          email: user.email,
          otp_hash: otpHash,
          action_link: actionLink,
          claimed_at: new Date().toISOString(),
        })
        .eq('token', token)
        .eq('status', 'pending');
      if (updErr) throw updErr;

      return json({ ok: true, email: user.email, session_id: sessionId });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
