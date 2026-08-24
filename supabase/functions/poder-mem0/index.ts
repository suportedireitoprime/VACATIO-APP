import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Mem0 via pgvector — memória de longo prazo do Horus
// Ações: 'recall' (busca top-k por embedding) | 'save' (grava um fato) | 'list' (últimas N)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { action, user_phone, texto, kind = 'fact', query, top_k = 3, limit = 20 } = await req.json();
    if (!user_phone) return json({ error: 'user_phone required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (action === 'list') {
      const { data, error } = await supabase
        .from('horus_memoria')
        .select('id, texto, kind, created_at')
        .eq('user_phone', user_phone)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json({ memorias: data || [] });
    }

    if (action === 'save') {
      if (!texto) return json({ error: 'texto required' }, 400);
      const embedding = await embed(texto);
      const { error } = await supabase
        .from('horus_memoria')
        .insert({ user_phone, texto, kind, embedding });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === 'recall') {
      const q = query || texto;
      if (!q) return json({ error: 'query required' }, 400);
      const embedding = await embed(q);
      const { data, error } = await supabase.rpc('match_horus_memoria', {
        _user_phone: user_phone,
        _query_embedding: embedding,
        _match_count: top_k,
      });
      if (error) throw error;
      return json({ memorias: data || [] });
    }

    return json({ error: 'action inválida (recall|save|list)' }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

async function embed(text: string): Promise<number[]> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('LOVABLE_API_KEY não configurado');
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': key },
    body: JSON.stringify({ model: 'google/gemini-embedding-001', input: text }),
  });
  if (!resp.ok) throw new Error(`embedding ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data?.data?.[0]?.embedding;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
