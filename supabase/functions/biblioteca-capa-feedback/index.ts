// Registra curtida/descurtida de uma capa gerada pela IA
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const b = await req.json();
    const rating = Number(b?.rating);
    if (!b?.tabela || !b?.livro_id || (rating !== 1 && rating !== -1)) {
      return json({ error: 'Parâmetros inválidos' }, 400);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await supabase.from('biblioteca_capa_feedback').insert({
      tabela: String(b.tabela),
      livro_id: String(b.livro_id),
      titulo: b.titulo ?? null,
      autor: b.autor ?? null,
      capa_url: b.capa_url ?? null,
      prompt_used: b.prompt_used ?? null,
      rating,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
