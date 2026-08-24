// Edge function: local-transporte-publico
// Calcula rota de transporte público (TRANSIT) entre origem e destino via Google Routes API.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  origem: { lat: number; lng: number };
  destino: { lat: number; lng: number };
  destino_nome?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { origem, destino } = (await req.json()) as Body;
    if (!origem?.lat || !destino?.lat) return json({ error: 'origem/destino obrigatórios' }, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) return json({ error: 'credenciais Google Maps ausentes' }, 500);

    const resp = await fetch('https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.navigationInstruction,routes.legs.steps.transitDetails,routes.legs.steps.distanceMeters',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origem.lat, longitude: origem.lng } } },
        destination: { location: { latLng: { latitude: destino.lat, longitude: destino.lng } } },
        travelMode: 'TRANSIT',
        computeAlternativeRoutes: false,
        languageCode: 'pt-BR',
        units: 'METRIC',
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error('routes error', resp.status, t);
      return json({ error: 'Sem rota de transporte público', status: resp.status, details: t }, resp.status);
    }
    const data = await resp.json();
    const route = data?.routes?.[0];
    if (!route) return json({ error: 'Nenhuma rota disponível' }, 404);

    const parseDur = (d?: string) => {
      if (!d) return 0;
      const m = /(\d+)s/.exec(d);
      return m ? Number(m[1]) : 0;
    };

    const passos = (route.legs?.[0]?.steps ?? []).map((step: any) => {
      const t = step.transitDetails;
      return {
        modo: step.travelMode,
        instrucao: step.navigationInstruction?.instructions ?? null,
        duracao_s: parseDur(step.staticDuration),
        distancia_m: step.distanceMeters ?? 0,
        transito: t
          ? {
              linha: t.transitLine?.nameShort ?? t.transitLine?.name ?? null,
              cor: t.transitLine?.color ?? null,
              tipo: t.transitLine?.vehicle?.type ?? null,
              parada_embarque: t.stopDetails?.departureStop?.name ?? null,
              parada_desembarque: t.stopDetails?.arrivalStop?.name ?? null,
              partida: t.stopDetails?.departureTime ?? null,
              chegada: t.stopDetails?.arrivalTime ?? null,
              paradas: t.stopCount ?? null,
              headsign: t.headsign ?? null,
            }
          : null,
      };
    });

    return json({
      duracao_total_s: parseDur(route.duration),
      distancia_total_m: route.distanceMeters ?? 0,
      passos,
    });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
