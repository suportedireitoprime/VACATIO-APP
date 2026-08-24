import { createClient } from 'npm:@supabase/supabase-js@2';

const CLOUD_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_AUTH_URL = 'https://iftdrbxvekrhzstayjwp.supabase.co';
const APP_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const VALID_TRIBUNAIS = new Set(['STF_VINCULANTE', 'STF', 'STJ']);

async function authenticate(accessToken: string) {
  if (!accessToken) return null;
  const response = await fetch(`${APP_AUTH_URL}/auth/v1/user`, {
    headers: {
      apikey: APP_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user?.id === 'string' ? user : null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const body = await request.json();
    const user = await authenticate(String(body?.access_token ?? ''));
    if (!user) return json({ error: 'Sessão inválida. Entre novamente.' }, 401);

    const tribunal = String(body?.tribunal ?? '');
    if (!VALID_TRIBUNAIS.has(tribunal)) return json({ error: 'Tribunal inválido' }, 400);

    const admin = createClient(CLOUD_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (body?.action === 'list') {
      const { data, error } = await admin
        .from('sumulas_favoritos')
        .select('sumula_numero')
        .eq('user_id', user.id)
        .eq('tribunal', tribunal)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json({ numeros: (data ?? []).map((item) => item.sumula_numero) });
    }

    if (body?.action === 'sync') {
      const numeros = Array.from(new Set(
        (Array.isArray(body?.numeros) ? body.numeros : [])
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isInteger(value) && value > 0),
      ));
      if (numeros.length > 0) {
        const { error } = await admin.from('sumulas_favoritos').upsert(
          numeros.map((numero) => ({ user_id: user.id, tribunal, sumula_numero: numero })),
          { onConflict: 'user_id,tribunal,sumula_numero', ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      return json({ ok: true });
    }

    if (body?.action === 'toggle') {
      const numero = Number(body?.numero);
      if (!Number.isInteger(numero) || numero <= 0) return json({ error: 'Súmula inválida' }, 400);

      const { data: existing, error: findError } = await admin
        .from('sumulas_favoritos')
        .select('sumula_numero')
        .eq('user_id', user.id)
        .eq('tribunal', tribunal)
        .eq('sumula_numero', numero)
        .maybeSingle();
      if (findError) throw findError;

      if (existing) {
        const { error } = await admin
          .from('sumulas_favoritos')
          .delete()
          .eq('user_id', user.id)
          .eq('tribunal', tribunal)
          .eq('sumula_numero', numero);
        if (error) throw error;
        return json({ favoritada: false });
      }

      const { error } = await admin.from('sumulas_favoritos').insert({
        user_id: user.id,
        tribunal,
        sumula_numero: numero,
      });
      if (error) throw error;
      return json({ favoritada: true });
    }

    return json({ error: 'Ação inválida' }, 400);
  } catch (error) {
    console.error('sumulas-favoritos:', error instanceof Error ? error.message : String(error));
    return json({ error: 'Não foi possível atualizar os favoritos.' }, 500);
  }
});