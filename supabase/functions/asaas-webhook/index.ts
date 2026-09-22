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
    const customerId: string | null = payment.customer ?? null;
    const subscriptionId: string | null = payment.subscription ?? null;
    const dueDate: string | null = payment.dueDate ?? payment.nextDueDate ?? null;
    
    // externalReference is the Supabase auth.users ID
    const userId: string | null = payment.externalReference || body?.customer?.externalReference || null;

    if (!userId) {
      return new Response(JSON.stringify({ ok: true, ignored: 'sem user_id (externalReference)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pago = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_RECEIVED_IN_CASH'].includes(event);
    const atrasado = event === 'PAYMENT_OVERDUE';
    const perdido = [
      'PAYMENT_DELETED', 'PAYMENT_REFUNDED',
      'PAYMENT_CHARGEBACK_REQUESTED', 'SUBSCRIPTION_DELETED',
      'SUBSCRIPTION_INACTIVATED', 'PAYMENT_RECEIVED_IN_CASH_UNDONE',
    ].includes(event);

    let inferredPlan = 'mensal';
    const val = payment.value || 0;
    const desc = (payment.description || '').toLowerCase();
    
    if (val >= 140 || desc.includes('anual') || desc.includes('promocional')) {
      inferredPlan = 'anual';
    }

    const diasCiclo = inferredPlan === 'anual' ? 370 : 34;
    const CARENCIA_MS = 3 * 24 * 3600 * 1000; // 3 dias carência
    const venc = new Date(dueDate ?? Date.now()).getTime();
    
    const proximo = pago
      ? new Date(venc + diasCiclo * 24 * 3600 * 1000).toISOString()
      : atrasado
        ? new Date(venc + CARENCIA_MS).toISOString()
        : null;

    const cortarAgora = perdido || (atrasado && Date.now() > venc + CARENCIA_MS);

    // Upsert manual em assinaturas
    const { data: existingSub } = await admin.from('assinaturas')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    const subData = {
      user_id: userId,
      plano: inferredPlan,
      status: cortarAgora ? 'CANCELED' : 'ACTIVE',
      asaas_customer_id: customerId,
      asaas_subscription_id: subscriptionId,
      expires_at: proximo,
      updated_at: new Date().toISOString(),
    };

    let upsertErr = null;
    if (existingSub) {
      const res = await admin.from('assinaturas').update(subData).eq('id', existingSub.id);
      upsertErr = res.error;
    } else {
      const res = await admin.from('assinaturas').insert(subData);
      upsertErr = res.error;
    }

    if (upsertErr) {
      console.error('Erro ao salvar assinatura', upsertErr);
    }

    // Se confirmou o pagamento, dispara o push de boas vindas
    if (pago) {
      (async () => {
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
            body: JSON.stringify({
              title: '🎉 Premium ativado',
              body: 'Pagamento Asaas confirmado! Todos os recursos já estão liberados.',
              url: '/aprender',
              audience: { user_ids: [userId] },
              data: { motivo: 'premium_ativado' },
            }),
          });
        } catch (e) {
          console.warn('Falha silenciosa no push nativo', e);
        }
      })();
    }

    return new Response(JSON.stringify({ ok: true, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('asaas-webhook falhou:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
