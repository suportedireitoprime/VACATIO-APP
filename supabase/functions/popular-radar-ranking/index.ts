import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CAMARA_API = 'https://dadosabertos.camara.leg.br/api/v2'

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  return res.json()
}

function countFromPagination(json: any): number {
  if (!json?.dados) return 0
  let count = json.dados.length
  if (json.links) {
    const lastLink = json.links.find((l: any) => l.rel === 'last')
    if (lastLink?.href) {
      const match = lastLink.href.match(/pagina=(\d+)/)
      if (match) count = parseInt(match[1])
    }
  }
  return count
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let offset = 0
    let batchSize = 50
    try {
      const body = await req.json()
      offset = body.offset || 0
      batchSize = body.batchSize || 50
    } catch {}

    const ano = new Date().getFullYear()

    const { data: deputados, error: depError } = await supabase
      .from('radar_deputados')
      .select('id, nome, sigla_partido, sigla_uf, foto_url')
      .order('nome')
      .range(offset, offset + batchSize - 1)

    if (depError || !deputados || deputados.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No more deputados to process', offset }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${deputados.length} deputados starting at offset ${offset}`)

    const results: any[] = []

    for (let i = 0; i < deputados.length; i += 5) {
      const batch = deputados.slice(i, i + 5)
      const batchResults = await Promise.all(batch.map(async (dep) => {
        let totalDespesas = 0
        let totalProposicoes = 0
        let presencaPercentual = 0
        let totalDiscursos = 0
        let totalOrgaos = 0
        let totalFrentes = 0

        // Despesas
        try {
          const despJson = await fetchJson(
            `${CAMARA_API}/deputados/${dep.id}/despesas?ano=${ano}&itens=100&ordem=DESC&ordenarPor=ano`
          )
          if (despJson?.dados) {
            totalDespesas = despJson.dados.reduce((sum: number, d: any) => sum + (d.valorLiquido || 0), 0)
          }
          if (totalDespesas === 0) {
            const despPrevJson = await fetchJson(
              `${CAMARA_API}/deputados/${dep.id}/despesas?ano=${ano - 1}&itens=100&ordem=DESC&ordenarPor=ano`
            )
            if (despPrevJson?.dados) {
              totalDespesas = despPrevJson.dados.reduce((sum: number, d: any) => sum + (d.valorLiquido || 0), 0)
            }
          }
        } catch (e) {
          console.error(`Despesas error for ${dep.id}:`, e)
        }

        // Proposicoes
        try {
          const propJson = await fetchJson(
            `${CAMARA_API}/proposicoes?idDeputadoAutor=${dep.id}&ano=${ano}&itens=1`
          )
          totalProposicoes = countFromPagination(propJson)
          const propPrevJson = await fetchJson(
            `${CAMARA_API}/proposicoes?idDeputadoAutor=${dep.id}&ano=${ano - 1}&itens=1`
          )
          totalProposicoes += countFromPagination(propPrevJson)
        } catch (e) {
          console.error(`Proposicoes error for ${dep.id}:`, e)
        }

        // Presenca (eventos)
        try {
          const eventJson = await fetchJson(
            `${CAMARA_API}/deputados/${dep.id}/eventos?dataInicio=${ano}-01-01&dataFim=${ano}-12-31&itens=100`
          )
          if (eventJson?.dados && eventJson.dados.length > 0) {
            presencaPercentual = Math.min(100, (eventJson.dados.length / 200) * 100)
          }
        } catch (e) {
          console.error(`Eventos error for ${dep.id}:`, e)
        }

        // Discursos
        try {
          const discJson = await fetchJson(
            `${CAMARA_API}/deputados/${dep.id}/discursos?idLegislatura=57&ano=${ano}&itens=1`
          )
          totalDiscursos = countFromPagination(discJson)
          if (totalDiscursos === 0) {
            const discPrevJson = await fetchJson(
              `${CAMARA_API}/deputados/${dep.id}/discursos?idLegislatura=57&ano=${ano - 1}&itens=1`
            )
            totalDiscursos = countFromPagination(discPrevJson)
          }
        } catch (e) {
          console.error(`Discursos error for ${dep.id}:`, e)
        }

        // Orgaos (comissoes)
        try {
          const orgJson = await fetchJson(
            `${CAMARA_API}/deputados/${dep.id}/orgaos?dataInicio=${ano}-01-01&itens=100`
          )
          if (orgJson?.dados) {
            totalOrgaos = orgJson.dados.length
          }
        } catch (e) {
          console.error(`Orgaos error for ${dep.id}:`, e)
        }

        // Frentes parlamentares
        try {
          const frentesJson = await fetchJson(
            `${CAMARA_API}/deputados/${dep.id}/frentes?itens=100`
          )
          if (frentesJson?.dados) {
            totalFrentes = frentesJson.dados.length
          }
        } catch (e) {
          console.error(`Frentes error for ${dep.id}:`, e)
        }

        return {
          deputado_id: dep.id,
          nome: dep.nome,
          sigla_partido: dep.sigla_partido,
          sigla_uf: dep.sigla_uf,
          foto_url: dep.foto_url,
          total_despesas: totalDespesas,
          total_proposicoes: totalProposicoes,
          presenca_percentual: presencaPercentual,
          total_discursos: totalDiscursos,
          total_orgaos: totalOrgaos,
          total_frentes: totalFrentes,
          ano,
          atualizado_em: new Date().toISOString(),
        }
      }))

      results.push(...batchResults)
      
      if (i + 5 < deputados.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    if (results.length > 0) {
      const { error: upsertError } = await supabase
        .from('radar_ranking')
        .upsert(results, { onConflict: 'deputado_id,ano' })

      if (upsertError) {
        console.error('Upsert error:', upsertError.message)
      }
    }

    console.log(`Processed ${results.length} deputados successfully`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length, 
        offset,
        nextOffset: deputados.length === batchSize ? offset + batchSize : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
