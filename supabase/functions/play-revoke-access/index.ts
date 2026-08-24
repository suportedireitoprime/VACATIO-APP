// Ação admin para revogar acesso premium de um usuário manualmente
// (usar quando um reembolso foi processado no Play Console mas a RTDN não
// chegou por qualquer motivo). Marca todas as linhas em play_subscriptions
// como CANCELED e expira agora, disparando o realtime que o front assina.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const ADMIN_EMAILS = new Set([
  'wn7corporation@gmail.com',
  'suporte.vacatio@gmail.com',
  'wn7juridico@gmail.com',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const callerEmail = userData?.user?.email?.toLowerCase() ?? null;
    if (userErr || !callerEmail || !ADMIN_EMAILS.has(callerEmail)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    let userId: string | null = body?.userId ?? null;
    const email: string | null = body?.email ?? null;
    const reason: string = body?.reason ?? 'ADMIN_REVOKE';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (!userId && email) {
      // resolve user_id via listUsers (paginado até achar)
      let page = 1;
      while (page <= 20 && !userId) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) { userId = found.id; break; }
        if (data.users.length < 200) break;
        page++;
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: upErr } = await admin
      .from('play_subscriptions')
      .update({
        status: 'SUBSCRIPTION_STATE_CANCELED',
        cancel_reason: reason,
        auto_renewing: false,
        expires_at: nowIso,
        latest_notification_type: 'ADMIN_REVOKE',
        latest_notification_at: nowIso,
      })
      .eq('user_id', userId)
      .select('id, product_id');

    if (upErr) {
      console.error('play-revoke-access update failed', upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('play-revoke-access applied', { userId, rows: updated?.length, by: callerEmail });
    return new Response(JSON.stringify({ ok: true, userId, revoked: updated?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('play-revoke-access error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
