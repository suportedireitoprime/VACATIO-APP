import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Fetch recent votações from Câmara
    const url = `https://dadosabertos.camara.leg.br/api/v2/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=50`
    console.log('Fetching votações...')
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    
    const json = await res.json()
    const dados = json.dados || []

    console.log(`Total votações: ${dados.length}`)

    const records = dados.map((v: any) => ({
      id_externo: String(v.id),
      fonte: 'camara',
      data: v.dataHoraRegistro || v.data,
      descricao: v.descricao || v.aprovacao?.toString() || '',
      resultado: v.aprovacao === 1 ? 'Aprovado' : v.aprovacao === 0 ? 'Rejeitado' : null,
      dados_json: v,
      atualizado_em: new Date().toISOString(),
    }))

    await supabase.from('radar_votacoes').delete().eq('fonte', 'camara')

    const batchSize = 50
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error } = await supabase.from('radar_votacoes').upsert(batch, { onConflict: 'id_externo,fonte' })
      if (error) console.error('Insert error:', error.message)
    }

    return new Response(
      JSON.stringify({ success: true, total: records.length }),
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
