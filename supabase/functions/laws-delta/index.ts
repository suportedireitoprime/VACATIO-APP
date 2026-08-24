/**
 * laws-delta — retorna artigos alterados desde `since`.
 * Uso: GET /functions/v1/laws-delta?since=2026-07-01T00:00:00Z
 *      GET /functions/v1/laws-delta?since=...&slug=cf88_constituicao_federal
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const slug = url.searchParams.get('slug');

    if (!since || Number.isNaN(Date.parse(since))) {
      return json({ error: 'query param `since` (ISO datetime) obrigatório' }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Se slug informado, restringe a uma lei; senão, todas.
    let leiIds: string[] | null = null;
    if (slug) {
      const { data: lei, error } = await sb
        .from('vade_mecum_leis')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      if (!lei) return json({ error: 'lei não encontrada' }, 404);
      leiIds = [lei.id];
    }

    let q = sb
      .from('vade_mecum_artigos')
      .select('id,lei_id,numero,texto,ordem,epigrafe,ult_alteracao_em,revogado')
      .gt('ult_alteracao_em', since)
      .order('ult_alteracao_em', { ascending: true })
      .limit(5000);
    if (leiIds) q = q.in('lei_id', leiIds);

    const { data, error } = await q;
    if (error) throw error;

    const now = new Date().toISOString();
    return json({ server_time: now, since, count: data?.length ?? 0, artigos: data ?? [] });
  } catch (e) {
    console.error('laws-delta error', e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
