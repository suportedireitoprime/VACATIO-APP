import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Nager.Date — feriados nacionais (com anos futuros)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { year, country = 'BR' } = await req.json();
    const y = year ?? new Date().getFullYear();
    const resp = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/${country}`);
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'erro nager', status: resp.status }, resp.status);
    return json({
      year: y,
      country,
      feriados: (data || []).map((h: any) => ({
        data: h.date,
        nome: h.localName,
        nome_en: h.name,
        tipo: h.types?.[0],
      })),
    });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
