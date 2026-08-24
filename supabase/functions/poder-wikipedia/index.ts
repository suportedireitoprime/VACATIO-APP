import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { query, sentences = 3 } = await req.json();
    if (!query || typeof query !== 'string') {
      return json({ error: 'query required' }, 400);
    }
    // 1. Search
    const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`;
    const s = await fetch(searchUrl).then(r => r.json());
    const first = s?.query?.search?.[0];
    if (!first) return json({ found: false, message: 'nada encontrado' });

    // 2. Summary
    const sumUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(first.title)}`;
    const sum = await fetch(sumUrl).then(r => r.json());
    const extract = (sum?.extract || '').split('. ').slice(0, sentences).join('. ');

    return json({
      found: true,
      title: sum?.title || first.title,
      resumo: extract,
      url: sum?.content_urls?.desktop?.page,
      imagem: sum?.thumbnail?.source ?? null,
    });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
