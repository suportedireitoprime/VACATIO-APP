import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing_auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente com auth do usuário para validar identidade
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'invalid_session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // Cliente admin para deletar
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Tabelas com dados do usuário — deletar em cascata
    const tabelas = [
      'artigos_anotacoes',
      'artigos_favoritos',
      'artigos_grifos',
      'artigos_visualizacoes',
      'biblioteca_favoritos',
      'biblioteca_livros',
      'study_sessions',
      'user_activity_log',
      'user_preferences',
      'user_reminders',
      'user_subscriptions',
      'device_tokens',
      'noticias_comentarios',
      'mensagens_suporte',
      'premium_usage',
    ];

    for (const t of tabelas) {
      const { error } = await supabaseAdmin.from(t).delete().eq('user_id', userId);
      if (error) console.warn(`Falha ao limpar ${t}:`, error.message);
    }

    // Profile (id = user_id)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Por último, deletar do auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Erro ao deletar user auth', deleteError);
      return new Response(JSON.stringify({ error: 'auth_delete_failed', details: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('excluir-conta error', e);
    return new Response(JSON.stringify({ error: 'server_error', message: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
