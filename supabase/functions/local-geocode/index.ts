// Edge function: local-geocode
// Converte cidade/CEP em coordenadas via Google Geocoding API.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { query } = (await req.json()) as { query: string };
    if (!query || query.trim().length < 3) return json({ error: 'query muito curta' }, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) return json({ error: 'credenciais ausentes' }, 500);

    const url = `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(query + ', Brasil')}&language=pt-BR&region=br`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
      },
    });
    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: 'geocode falhou', details: t }, resp.status);
    }
    const data = await resp.json();
    const first = data?.results?.[0];
    if (!first) return json({ error: 'não encontrado' }, 404);
    return json({
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
      endereco_formatado: first.formatted_address,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
