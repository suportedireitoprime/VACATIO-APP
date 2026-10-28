import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const expected = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
  const received = req.headers.get('asaas-access-token') ?? req.headers.get('x-asaas-token');
  if (expected && received !== expected) {
    console.warn('[asaas-webhook] Token de webhook inválido:', { received: received?.slice(0, 5) });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json();
    const event: string = body?.event ?? '';
    const payment = body?.payment ?? {};
    const subscription = body?.subscription ?? {};
    const customer = body?.customer ?? {};

    const customerId: string | null = payment.customer ?? subscription.customer ?? customer.id ?? null;
    const subscriptionId: string | null = payment.subscription ?? subscription.id ?? null;
    const paymentId: string | null = payment.id ?? null;
    const dueDate: string | null = payment.dueDate ?? payment.nextDueDate ?? subscription.nextDueDate ?? null;
    const paymentDate: string | null = payment.paymentDate ?? payment.clientPaymentDate ?? payment.confirmedDate ?? null;

    console.log(`[asaas-webhook] Evento recebido: ${event}`, {
      paymentId,
      subscriptionId,
      customerId,
      billingType: payment.billingType,
      value: payment.value,
    });

    // ── Resolução do userId (auth.users UUID) com fallbacks inteligentes ──
    let userId: string | null =
      payment.externalReference ||
      subscription.externalReference ||
      customer.externalReference ||
      null;

    // 1º Fallback: busca por assinatura existente já registrada com customerId ou subscriptionId/paymentId
    if (!userId && (subscriptionId || paymentId || customerId)) {
      const orClauses: string[] = [];
      if (subscriptionId) orClauses.push(`asaas_subscription_id.eq.${subscriptionId}`);
      if (paymentId) orClauses.push(`asaas_subscription_id.eq.${paymentId}`);
      if (customerId) orClauses.push(`asaas_customer_id.eq.${customerId}`);

      if (orClauses.length > 0) {
        const { data: foundSub } = await admin.from('assinaturas')
          .select('user_id')
          .or(orClauses.join(','))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (foundSub?.user_id) {
          userId = foundSub.user_id;
          console.log('[asaas-webhook] userId recuperado via tabela assinaturas:', userId);
        }
      }
    }

    // 2º Fallback: busca pelo e-mail do cliente no auth.users
    const customerEmail: string | null =
      customer.email ||
      payment.customerEmail ||
      null;

    if (!userId && customerEmail) {
      const cleanEmail = customerEmail.trim().toLowerCase();
      const { data: usersData } = await admin.auth.admin.listUsers();
      const matched = usersData?.users?.find(
        (u) => (u.email || '').trim().toLowerCase() === cleanEmail
      );
      if (matched?.id) {
        userId = matched.id;
        console.log('[asaas-webhook] userId recuperado via e-mail do cliente:', cleanEmail, userId);
      }
    }

    // 3º Fallback: consulta os dados do cliente no Asaas se ainda não temos externalReference
    if (!userId && customerId) {
      const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
      if (asaasApiKey) {
        try {
          const asaasBase = Deno.env.get('ASAAS_API_URL') || 'https://api.asaas.com/v3';
          const cusRes = await fetch(`${asaasBase}/customers/${customerId}`, {
            headers: { access_token: asaasApiKey },
          });
          if (cusRes.ok) {
            const cusData = await cusRes.json();
            if (cusData.externalReference) {
              userId = cusData.externalReference;
              console.log('[asaas-webhook] userId recuperado consultando cliente no Asaas:', userId);
            } else if (cusData.email) {
              const cleanEmail = cusData.email.trim().toLowerCase();
              const { data: usersData } = await admin.auth.admin.listUsers();
              const matched = usersData?.users?.find(
                (u) => (u.email || '').trim().toLowerCase() === cleanEmail
              );
              if (matched?.id) {
                userId = matched.id;
                console.log('[asaas-webhook] userId recuperado via e-mail da API do Asaas:', userId);
              }
            }
          }
        } catch (apiErr) {
          console.warn('[asaas-webhook] Falha ao consultar cliente no Asaas:', apiErr);
        }
      }
    }

    if (!userId) {
      console.warn('[asaas-webhook] Ignorado: não foi possível identificar o usuário para este pagamento/assinatura', {
        paymentId,
        subscriptionId,
        customerId,
      });
      return new Response(JSON.stringify({ ok: true, ignored: 'sem user_id identificável' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Classificação do Evento ──
    const pago = [
      'PAYMENT_CONFIRMED',          // Cartão de Crédito aprovado
      'PAYMENT_RECEIVED',           // PIX compensado
      'PAYMENT_RECEIVED_IN_CASH',   // Recebido em dinheiro
    ].includes(event);

    const atrasado = event === 'PAYMENT_OVERDUE';

    const perdido = [
      'PAYMENT_DELETED',
      'PAYMENT_REFUNDED',
      'PAYMENT_CHARGEBACK_REQUESTED',
      'SUBSCRIPTION_DELETED',
      'SUBSCRIPTION_INACTIVATED',
      'PAYMENT_RECEIVED_IN_CASH_UNDONE',
    ].includes(event);

    // ── Inferência do Plano e Ciclo de Validade ──
    let inferredPlan = 'mensal';
    const val = Number(payment.value || subscription.value || 0);
    const desc = `${payment.description || ''} ${subscription.description || ''}`.toLowerCase();
    const cycle = (subscription.cycle || '').toUpperCase();

    if (
      val >= 80 ||
      desc.includes('anual') ||
      desc.includes('promocional') ||
      cycle === 'YEARLY'
    ) {
      inferredPlan = 'anual';
    }

    const diasCiclo = inferredPlan === 'anual' ? 370 : 34;
    const CARENCIA_MS = 3 * 24 * 3600 * 1000; // 3 dias de carência
    const baseTime = paymentDate
      ? new Date(paymentDate).getTime()
      : dueDate
        ? new Date(dueDate).getTime()
        : Date.now();

    const proximo = pago
      ? new Date(baseTime + diasCiclo * 24 * 3600 * 1000).toISOString()
      : atrasado
        ? new Date(baseTime + CARENCIA_MS).toISOString()
        : null;

    const cortarAgora = perdido || (atrasado && Date.now() > baseTime + CARENCIA_MS);

    // ── Upsert na tabela assinaturas ──
    const { data: existingSub } = await admin.from('assinaturas')
      .select('id, expires_at')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    const subData: any = {
      user_id: userId,
      plano: inferredPlan,
      status: cortarAgora ? 'CANCELED' : (pago ? 'ACTIVE' : 'pending'),
      asaas_customer_id: customerId,
      asaas_subscription_id: subscriptionId || paymentId,
      updated_at: new Date().toISOString(),
    };

    if (proximo) {
      subData.expires_at = proximo;
    }

    let upsertErr = null;
    if (existingSub) {
      const res = await admin.from('assinaturas').update(subData).eq('id', existingSub.id);
      upsertErr = res.error;
    } else {
      const res = await admin.from('assinaturas').insert(subData);
      upsertErr = res.error;
    }

    if (upsertErr) {
      console.error('[asaas-webhook] Erro ao gravar assinatura:', upsertErr);
    } else {
      console.log(`[asaas-webhook] Assinatura atualizada com sucesso para ${userId}:`, {
        plano: inferredPlan,
        status: subData.status,
        expires_at: subData.expires_at,
      });
    }

    // ── Disparo de Push Notification de Boas-Vindas quando pago ──
    if (pago) {
      (async () => {
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              title: '🎉 Assinatura Ativada!',
              body: `Seu pagamento via Asaas foi confirmado com sucesso. Todo o acervo do Vacatio está liberado!`,
              url: '/aprender',
              audience: { user_ids: [userId] },
              data: { motivo: 'premium_ativado', plano: inferredPlan, source: 'asaas' },
            }),
          });
        } catch (e) {
          console.warn('[asaas-webhook] Falha silenciosa no envio do push:', e);
        }
      })();
    }

    return new Response(JSON.stringify({ ok: true, event, userId, status: subData.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[asaas-webhook] Erro fatal:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
