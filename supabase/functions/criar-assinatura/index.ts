const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const ASAAS_BASE = 'https://api.asaas.com/v3'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY not configured')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { plano } = await req.json()
    if (!plano || !['mensal', 'anual'].includes(plano)) {
      return new Response(JSON.stringify({ error: 'Plano inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const asaasHeaders = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    }

    // Check existing customer
    const { data: existingSub } = await supabase
      .from('assinaturas')
      .select('asaas_customer_id')
      .eq('user_id', user.id)
      .not('asaas_customer_id', 'is', null)
      .limit(1)
      .maybeSingle()

    let customerId = existingSub?.asaas_customer_id

    if (!customerId) {
      // Create customer in Asaas
      const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          notificationDisabled: false,
        }),
      })
      const customerData = await customerRes.json()
      if (!customerRes.ok) {
        console.error('Asaas customer error:', customerData)
        return new Response(JSON.stringify({ error: 'Erro ao criar cliente no Asaas', details: customerData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      customerId = customerData.id
    }

    // Create subscription
    const value = plano === 'mensal' ? 21.90 : 119.90
    const cycle = plano === 'mensal' ? 'MONTHLY' : 'YEARLY'

    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 1)
    const dueDateStr = nextDueDate.toISOString().split('T')[0]

    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // let user choose at checkout
        value,
        cycle,
        nextDueDate: dueDateStr,
        description: `Vacatio - Plano ${plano === 'mensal' ? 'Mensal' : 'Anual'}`,
        maxPayments: plano === 'mensal' ? undefined : 1,
      }),
    })
    const subData = await subRes.json()
    if (!subRes.ok) {
      console.error('Asaas subscription error:', subData)
      return new Response(JSON.stringify({ error: 'Erro ao criar assinatura', details: subData }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get payment link from first invoice
    const invoiceRes = await fetch(`${ASAAS_BASE}/subscriptions/${subData.id}/payments`, {
      headers: asaasHeaders,
    })
    const invoiceData = await invoiceRes.json()
    const firstPayment = invoiceData?.data?.[0]
    const paymentLink = firstPayment
      ? `https://www.asaas.com/i/${firstPayment.id}`
      : null

    // Save to database
    await supabase.from('assinaturas').insert({
      user_id: user.id,
      asaas_customer_id: customerId,
      asaas_subscription_id: subData.id,
      plano,
      status: 'pending',
      payment_link: paymentLink,
    })

    return new Response(JSON.stringify({
      success: true,
      paymentLink,
      subscriptionId: subData.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('criar-assinatura error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
