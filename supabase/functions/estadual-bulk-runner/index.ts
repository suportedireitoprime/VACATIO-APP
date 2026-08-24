// deno-lint-ignore-file
// Processa itens pendentes do catálogo em série, invocando estadual-popular-lei para cada.
// Uma execução processa até `lote` itens; o front chama de novo até acabar (ou usa pg_cron).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { uf = 'SP', lote = 5, run_id = null, reset = false } = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Reset opcional para reprocessar tudo
    if (reset) {
      await supabase
        .from('vade_mecum_leis_estaduais_catalog')
        .update({ status: 'descoberto', erro_populacao: null })
        .eq('uf', uf)
        .in('status', ['erro', 'populando']);
    }

    // Encontra ou cria run
    let run;
    if (run_id) {
      const { data } = await supabase.from('vade_mecum_bulk_runs').select('*').eq('id', run_id).maybeSingle();
      run = data;
    }
    if (!run) {
      const { count: total } = await supabase
        .from('vade_mecum_leis_estaduais_catalog')
        .select('*', { count: 'exact', head: true })
        .eq('uf', uf);
      const { data: nova } = await supabase
        .from('vade_mecum_bulk_runs')
        .insert({ uf, status: 'running', total: total ?? 0, iniciado_em: new Date().toISOString() })
        .select('*').single();
      run = nova;
    }

    // Busca próximos itens pendentes
    const { data: pendentes } = await supabase
      .from('vade_mecum_leis_estaduais_catalog')
      .select('id, uf, tipo, numero, ano, url_fonte')
      .eq('uf', uf)
      .eq('status', 'descoberto')
      .order('ano', { ascending: false })
      .limit(lote);

    if (!pendentes?.length) {
      await supabase
        .from('vade_mecum_bulk_runs')
        .update({ status: 'done', finalizado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', run.id);
      return json({ ok: true, done: true, run_id: run.id });
    }

    let sucessos = 0;
    let falhas = 0;
    let totalMs = 0;
    let ultimoErro: string | null = null;

    for (const item of pendentes) {
      const t0 = Date.now();
      await supabase
        .from('vade_mecum_leis_estaduais_catalog')
        .update({ status: 'populando', erro_populacao: null })
        .eq('id', item.id);

      try {
        const resp = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/estadual-popular-lei`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ catalog_id: item.id }),
          },
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const body = await resp.json();
        if (body?.error) throw new Error(body.error);

        await supabase
          .from('vade_mecum_leis_estaduais_catalog')
          .update({ status: 'populado', erro_populacao: null })
          .eq('id', item.id);
        sucessos++;
      } catch (e) {
        ultimoErro = (e as Error).message;
        await supabase
          .from('vade_mecum_leis_estaduais_catalog')
          .update({ status: 'erro', erro_populacao: ultimoErro })
          .eq('id', item.id);
        falhas++;
      }
      totalMs += Date.now() - t0;
    }

    // Atualiza run
    const processados = (run.processados ?? 0) + pendentes.length;
    const tempoMedio = totalMs > 0 ? Math.round(totalMs / pendentes.length) : run.tempo_medio_ms;
    await supabase
      .from('vade_mecum_bulk_runs')
      .update({
        processados,
        sucessos: (run.sucessos ?? 0) + sucessos,
        falhas: (run.falhas ?? 0) + falhas,
        tempo_medio_ms: tempoMedio,
        ultimo_erro: ultimoErro ?? run.ultimo_erro,
        next_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    return json({
      ok: true,
      done: false,
      run_id: run.id,
      processados,
      sucessos,
      falhas,
      tempo_medio_ms: tempoMedio,
    });
  } catch (e) {
    console.error('[bulk-runner]', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
