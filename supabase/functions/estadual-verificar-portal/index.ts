// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { SP_TIPOS, anosDisponiveisSP, fetchBuscaSP, parseBuscaSP } from '../_shared/estaduais/sp.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { uf = 'SP', anos_max = 0, tipos: tiposFiltro = null } = await req.json().catch(() => ({}));

    if (uf !== 'SP') {
      return json({ error: 'Somente SP suportado nesta versão.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const inicio = Date.now();

    // Descoberta: percorre tipos e anos (opcionalmente limitados)
    const anos = anos_max > 0 ? anosDisponiveisSP().slice(0, anos_max) : anosDisponiveisSP();
    const tipos = tiposFiltro ? SP_TIPOS.filter((t) => tiposFiltro.includes(t.tipo)) : SP_TIPOS;

    const porTipo: Record<string, number> = {};
    const encontrados: Array<{
      tipo: string;
      numero: string;
      ano: number;
      titulo: string;
      ementa: string;
      url: string;
    }> = [];

    for (const t of tipos) {
      porTipo[t.tipo] = 0;
      for (const ano of anos) {
        try {
          const html = await fetchBuscaSP(t.id, ano, 0, 200);
          const itens = parseBuscaSP(html, ano);
          porTipo[t.tipo] += itens.length;
          for (const it of itens) {
            if (!it.numero) continue;
            encontrados.push({
              tipo: t.tipo,
              numero: it.numero,
              ano: it.ano,
              titulo: it.titulo,
              ementa: it.ementa,
              url: it.urlTexto,
            });
          }
          // pequeno rate limit
          await sleep(120);
        } catch (e) {
          console.warn(`[verificar] falha ${t.tipo}/${ano}:`, (e as Error).message);
        }
      }
    }

    const total = encontrados.length;

    // Diff contra catálogo existente
    const { data: existentes } = await supabase
      .from('vade_mecum_leis_estaduais_catalog')
      .select('tipo, numero, ano, status')
      .eq('uf', 'SP');
    const setExistentes = new Set((existentes ?? []).map((e) => `${e.tipo}|${e.numero}|${e.ano}`));
    const setEncontrados = new Set(encontrados.map((e) => `${e.tipo}|${e.numero}|${e.ano}`));

    let novas = 0;
    const upserts: any[] = [];
    for (const e of encontrados) {
      const key = `${e.tipo}|${e.numero}|${e.ano}`;
      if (!setExistentes.has(key)) novas++;
      upserts.push({
        uf: 'SP',
        tipo: e.tipo,
        numero: e.numero,
        ano: e.ano,
        titulo: e.titulo,
        ementa: e.ementa,
        url_original: e.url,
        url_texto_integral: e.url,
        revisao_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
    }
    let removidas = 0;
    for (const key of setExistentes) {
      if (!setEncontrados.has(key)) removidas++;
    }

    // Grava/atualiza catálogo em lotes de 500
    for (let i = 0; i < upserts.length; i += 500) {
      const lote = upserts.slice(i, i + 500);
      const { error } = await supabase
        .from('vade_mecum_leis_estaduais_catalog')
        .upsert(lote, { onConflict: 'uf,tipo,numero,ano', ignoreDuplicates: false });
      if (error) console.error('[verificar] upsert erro:', error.message);
    }

    // ~30 s por lei (média): estimativa de tempo em minutos
    const pendentes = total - (existentes?.filter((e) => e.status === 'populado').length ?? 0);
    const tempoEstimadoMin = Math.ceil((pendentes * 30) / 60);
    const dur = Math.round((Date.now() - inicio) / 1000);

    // Snapshot
    await supabase.from('vade_mecum_portal_snapshots').insert({
      uf: 'SP',
      por_tipo: porTipo,
      total,
      novas,
      removidas,
      tempo_estimado_min: tempoEstimadoMin,
      duracao_verificacao_seg: dur,
    });

    return json({
      ok: true,
      uf,
      total,
      novas,
      removidas,
      por_tipo: porTipo,
      tempo_estimado_min: tempoEstimadoMin,
      duracao_seg: dur,
    });
  } catch (e) {
    console.error('[verificar-portal]', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
