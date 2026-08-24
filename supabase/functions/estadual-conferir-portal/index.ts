// deno-lint-ignore-file
// Compara o portal SP com o catálogo — retorna diffs sem gravar nada.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { SP_TIPOS, anosDisponiveisSP, fetchBuscaSP, parseBuscaSP } from '../_shared/estaduais/sp.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { uf = 'SP', anos_max = 5 } = await req.json().catch(() => ({}));
    if (uf !== 'SP') return json({ error: 'Somente SP suportado.' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const anos = anosDisponiveisSP().slice(0, anos_max);
    const portalKeys = new Set<string>();
    const porTipoPortal: Record<string, number> = {};
    const porTipoBanco: Record<string, number> = {};

    for (const t of SP_TIPOS) {
      porTipoPortal[t.tipo] = 0;
      for (const ano of anos) {
        try {
          const html = await fetchBuscaSP(t.id, ano, 0, 200);
          const itens = parseBuscaSP(html, ano);
          porTipoPortal[t.tipo] += itens.length;
          for (const it of itens) {
            if (it.numero) portalKeys.add(`${t.tipo}|${it.numero}|${it.ano}`);
          }
        } catch (e) {
          console.warn('conferir', t.tipo, ano, (e as Error).message);
        }
      }
    }

    const { data: cat } = await supabase
      .from('vade_mecum_leis_estaduais_catalog')
      .select('tipo, numero, ano')
      .eq('uf', 'SP')
      .in('ano', anos);
    const bancoKeys = new Set((cat ?? []).map((c) => `${c.tipo}|${c.numero}|${c.ano}`));
    for (const c of cat ?? []) porTipoBanco[c.tipo] = (porTipoBanco[c.tipo] ?? 0) + 1;

    const faltandoNoBanco: string[] = [];
    for (const k of portalKeys) if (!bancoKeys.has(k)) faltandoNoBanco.push(k);
    const excedendoNoBanco: string[] = [];
    for (const k of bancoKeys) if (!portalKeys.has(k)) excedendoNoBanco.push(k);

    return json({
      ok: true,
      anos_analisados: anos,
      total_portal: portalKeys.size,
      total_banco: bancoKeys.size,
      diferenca: portalKeys.size - bancoKeys.size,
      por_tipo_portal: porTipoPortal,
      por_tipo_banco: porTipoBanco,
      faltando_no_banco: faltandoNoBanco.slice(0, 200),
      excedendo_no_banco: excedendoNoBanco.slice(0, 200),
    });
  } catch (e) {
    console.error('[conferir]', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
