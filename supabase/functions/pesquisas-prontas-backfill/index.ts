// Backfill: pega N temas sem resultado em cache e chama pesquisas-prontas-scrape
// para cada um. Chamado repetidamente pela UI até processed=0.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')!;

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function callScrape(pesquisa_id: string): Promise<{ ok: boolean; count: number; err?: string }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/jurisprudencia-prontas-scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pesquisa_id, force: false }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, count: Array.isArray(j?.acordaos) ? j.acordaos.length : 0, err: j?.error };
  } catch (e) {
    return { ok: false, count: 0, err: String((e as Error)?.message ?? e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ error: 'FIRECRAWL_API_KEY ausente' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({} as any));
  const tribunal: string | undefined = body?.tribunal;
  const batch: number = Math.min(Math.max(Number(body?.batch ?? 5), 1), 10);

  // Conta totais
  let totalQ = admin.from('jurisprudencia_prontas').select('id', { count: 'exact', head: true });
  if (tribunal) totalQ = totalQ.eq('tribunal', tribunal);
  const { count: total } = await totalQ;

  // IDs já com resultado dentro do TTL
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data: done } = await admin
    .from('jurisprudencia_prontas_resultados')
    .select('pesquisa_id')
    .gte('fetched_at', cutoff);
  const doneIds = new Set((done ?? []).map((r: any) => r.pesquisa_id as string));

  // Próximos N pendentes
  let q = admin.from('jurisprudencia_prontas').select('id, tribunal, titulo').order('ordem').limit(500);
  if (tribunal) q = q.eq('tribunal', tribunal);
  const { data: all } = await q;
  const pending = (all ?? []).filter((r: any) => !doneIds.has(r.id)).slice(0, batch);

  const results: any[] = [];
  for (const p of pending) {
    const r = await callScrape(p.id as string);
    results.push({ id: p.id, titulo: p.titulo, ...r });
    await sleep(500); // suaviza pressão sobre Firecrawl
  }

  const doneCount = doneIds.size + results.filter(r => r.ok && r.count > 0).length;

  return new Response(JSON.stringify({
    total: total ?? 0,
    done_before: doneIds.size,
    processed: results.length,
    ok_count: results.filter(r => r.ok && r.count > 0).length,
    fail_count: results.filter(r => !r.ok || r.count === 0).length,
    done_now: doneCount,
    remaining: Math.max(0, (total ?? 0) - doneCount),
    results,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
