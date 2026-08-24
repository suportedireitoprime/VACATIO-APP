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

    const body = await req.json()
    const { action } = body

    const asaasHeaders = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    }

    // ── ACTION: check-pix-status ──
    if (action === 'check-pix-status') {
      const { paymentId } = body
      if (!paymentId) {
        return new Response(JSON.stringify({ error: 'paymentId obrigatório' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const res = await fetch(`${ASAAS_BASE}/payments/${paymentId}`, { headers: asaasHeaders })
      const data = await res.json()
      return new Response(JSON.stringify({ status: data.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── ACTION: process-payment ──
    const { plano, metodo, cpf, cep, endereco, numero_endereco, telefone, remoteIp, creditCard, installments } = body

    if (!plano || !['mensal', 'anual'].includes(plano)) {
      return new Response(JSON.stringify({ error: 'Plano inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!metodo || !['cartao', 'pix'].includes(metodo)) {
      return new Response(JSON.stringify({ error: 'Método inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (plano === 'mensal' && metodo === 'pix') {
      return new Response(JSON.stringify({ error: 'PIX não disponível para plano mensal' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Create or reuse Asaas customer
    const { data: existingSub } = await supabase
      .from('assinaturas')
      .select('asaas_customer_id')
      .eq('user_id', user.id)
      .not('asaas_customer_id', 'is', null)
      .limit(1)
      .maybeSingle()

    let customerId = existingSub?.asaas_customer_id

    if (!customerId) {
      const customerRes = await fetch(`${ASAAS_BASE}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name: creditCard?.holderName || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          cpfCnpj: cpf?.replace(/\D/g, ''),
          postalCode: cep?.replace(/\D/g, ''),
          addressNumber: numero_endereco || 'S/N',
          phone: telefone?.replace(/\D/g, '') || undefined,
          notificationDisabled: false,
        }),
      })
      const customerData = await customerRes.json()
      if (!customerRes.ok) {
        console.error('Asaas customer error:', customerData)
        return new Response(JSON.stringify({ error: 'Erro ao criar cliente', details: customerData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      customerId = customerData.id
    }

    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 1)
    const dueDateStr = nextDueDate.toISOString().split('T')[0]

    const creditCardHolderInfo = {
      name: creditCard?.holderName || '',
      email: user.email,
      cpfCnpj: cpf?.replace(/\D/g, ''),
      postalCode: cep?.replace(/\D/g, ''),
      addressNumber: numero_endereco || 'S/N',
      phone: telefone?.replace(/\D/g, '') || '00000000000',
    }

    let result: any = {}

    // ── MENSAL + CARTÃO → Subscription ──
    if (plano === 'mensal' && metodo === 'cartao') {
      const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          customer: customerId,
          billingType: 'CREDIT_CARD',
          value: 21.90,
          cycle: 'MONTHLY',
          nextDueDate: dueDateStr,
          description: 'Vacatio - Plano Mensal',
          creditCard: {
            holderName: creditCard.holderName,
            number: creditCard.number.replace(/\s/g, ''),
            expiryMonth: creditCard.expiryMonth,
            expiryYear: creditCard.expiryYear,
            ccv: creditCard.ccv,
          },
          creditCardHolderInfo,
          remoteIp: remoteIp || '0.0.0.0',
        }),
      })
      const subData = await subRes.json()
      if (!subRes.ok) {
        console.error('Asaas subscription error:', subData)
        return new Response(JSON.stringify({ error: 'Erro ao criar assinatura', details: subData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      result = { success: true, type: 'subscription', subscriptionId: subData.id }

      await supabase.from('assinaturas').insert({
        user_id: user.id,
        asaas_customer_id: customerId,
        asaas_subscription_id: subData.id,
        plano: 'mensal',
        status: 'active',
      })
    }

    // ── ANUAL + CARTÃO → Payment (com ou sem parcelas) ──
    if (plano === 'anual' && metodo === 'cartao') {
      const installmentCount = installments && installments > 1 ? installments : undefined
      const payBody: any = {
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value: installmentCount ? undefined : 119.90,
        dueDate: dueDateStr,
        description: 'Vacatio - Plano Anual',
        creditCard: {
          holderName: creditCard.holderName,
          number: creditCard.number.replace(/\s/g, ''),
          expiryMonth: creditCard.expiryMonth,
          expiryYear: creditCard.expiryYear,
          ccv: creditCard.ccv,
        },
        creditCardHolderInfo,
        remoteIp: remoteIp || '0.0.0.0',
      }
      if (installmentCount) {
        payBody.installmentCount = installmentCount
        payBody.totalValue = 119.90
      }

      const payRes = await fetch(`${ASAAS_BASE}/payments`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify(payBody),
      })
      const payData = await payRes.json()
      if (!payRes.ok) {
        console.error('Asaas payment error:', payData)
        return new Response(JSON.stringify({ error: 'Erro ao processar pagamento', details: payData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      result = { success: true, type: 'payment', paymentId: payData.id, status: payData.status }

      await supabase.from('assinaturas').insert({
        user_id: user.id,
        asaas_customer_id: customerId,
        asaas_subscription_id: payData.id,
        plano: 'anual',
        status: payData.status === 'CONFIRMED' ? 'active' : 'pending',
      })
    }

    // ── ANUAL + PIX → Payment + QR Code ──
    if (plano === 'anual' && metodo === 'pix') {
      const payRes = await fetch(`${ASAAS_BASE}/payments`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: 119.90,
          dueDate: dueDateStr,
          description: 'Vacatio - Plano Anual (PIX)',
        }),
      })
      const payData = await payRes.json()
      if (!payRes.ok) {
        console.error('Asaas PIX payment error:', payData)
        return new Response(JSON.stringify({ error: 'Erro ao gerar PIX', details: payData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Get QR Code
      const qrRes = await fetch(`${ASAAS_BASE}/payments/${payData.id}/pixQrCode`, {
        headers: asaasHeaders,
      })
      const qrData = await qrRes.json()

      result = {
        success: true,
        type: 'pix',
        paymentId: payData.id,
        qrCodeImage: qrData.encodedImage || null,
        qrCodePayload: qrData.payload || null,
        expirationDate: qrData.expirationDate || null,
      }

      await supabase.from('assinaturas').insert({
        user_id: user.id,
        asaas_customer_id: customerId,
        asaas_subscription_id: payData.id,
        plano: 'anual',
        status: 'pending',
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('processar-pagamento error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
