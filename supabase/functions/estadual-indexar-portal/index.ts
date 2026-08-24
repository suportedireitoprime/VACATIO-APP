// Edge Function: estadual-indexar-portal
// Descobre URLs de leis no portal estadual e faz upsert em vade_mecum_leis_estaduais_catalog.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function firecrawlMap(url: string, search: string, limit = 2000): Promise<string[]> {
  const key = Deno.env.get('FIRECRAWL_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('FIRECRAWL_API_KEY não configurada. Conecte o Firecrawl em Configurações → Conectores.');

  const isGateway = key.startsWith('lovc_');
  const endpoint = isGateway
    ? 'https://connector-gateway.lovable.dev/firecrawl/v2/map'
    : 'https://api.firecrawl.dev/v2/map';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isGateway) {
    if (!lovableKey) throw new Error('LOVABLE_API_KEY ausente');
    headers['Authorization'] = `Bearer ${lovableKey}`;
    headers['X-Connection-Api-Key'] = key;
  } else {
    headers['Authorization'] = `Bearer ${key}`;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, search, limit, includeSubdomains: true }),
  });
  if (!res.ok) throw new Error(`Firecrawl map ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const links: string[] = data?.links ?? data?.data?.links ?? [];
  return links.map((l: any) => typeof l === 'string' ? l : l?.url).filter(Boolean);
}

import { SP_URL_PATTERNS, classificarTipoSP, extrairNumeroAnoSP } from '../_shared/estaduais/sp.ts';

const PORTAIS: Record<string, { url: string; patterns: RegExp[]; classify: (u: string) => string | null; extract: (u: string) => { numero?: string; ano?: number } }> = {
  SP: {
    url: 'https://www.al.sp.gov.br/repositorio/legislacao/',
    patterns: SP_URL_PATTERNS,
    classify: classificarTipoSP,
    extract: (u) => extrairNumeroAnoSP(u),
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { uf, search } = await req.json();
    if (!uf) throw new Error('uf obrigatório');
    const portal = PORTAIS[uf.toUpperCase()];
    if (!portal) throw new Error(`UF ${uf} ainda não tem adapter configurado. Só SP disponível no momento.`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const searches = search ? [search] : ['lei', 'decreto', 'lei complementar', 'constituição'];
    const seen = new Set<string>();
    for (const s of searches) {
      try {
        const links = await firecrawlMap(portal.url, s, 2000);
        for (const l of links) seen.add(l);
      } catch (e) {
        console.error(`firecrawl map failed for ${s}:`, e);
      }
    }

    let novas = 0;
    const rows: any[] = [];
    const constKeys = new Set<string>(); // dedup constituição por UF
    for (const link of seen) {
      if (!portal.patterns.some((p) => p.test(link))) continue;
      const tipo = portal.classify(link);
      if (!tipo) continue;
      const { numero, ano } = portal.extract(link);

      // Constituição Estadual: apenas 1 por UF
      if (tipo === 'constituicao_estadual') {
        const k = `const-${uf.toUpperCase()}`;
        if (constKeys.has(k)) continue;
        constKeys.add(k);
        rows.push({
          uf: uf.toUpperCase(),
          tipo,
          numero: '1',
          ano: 1989,
          url_original: link,
          status: 'descoberto',
          last_seen_at: new Date().toISOString(),
        });
        continue;
      }

      // Leis/decretos sem número ou ano detectado são ruído do crawl
      if (!numero || !ano) continue;

      rows.push({
        uf: uf.toUpperCase(),
        tipo,
        numero,
        ano,
        url_original: link,
        status: 'descoberto',
        last_seen_at: new Date().toISOString(),
      });
    }


    // Upsert em lotes
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error, count } = await supabase
        .from('vade_mecum_leis_estaduais_catalog')
        .upsert(batch, { onConflict: 'uf,tipo,numero,ano', ignoreDuplicates: false, count: 'exact' });
      if (error) console.error('upsert error:', error);
      novas += count ?? 0;
    }

    return new Response(JSON.stringify({
      uf,
      total_encontradas: rows.length,
      descobertas: novas,
      total: rows.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
