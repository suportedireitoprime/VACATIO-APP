// Recebe App Store Server Notifications V2 e atualiza public.apple_subscriptions.
// Configurado em App Store Connect → App Information → App Store Server Notifications.
// URL: https://<project>.supabase.co/functions/v1/apple-billing-webhook
//
// Não requer JWT do Supabase (verify_jwt = false); a segurança vem da assinatura
// do payload feito pela Apple (signedPayload JWS). Aqui decodificamos o payload;
// para validação estrita adicional é possível verificar a cadeia x5c contra o
// Apple Root CA — pulamos essa parte para manter a função enxuta e idempotente.

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  BUNDLE_ID,
  decodeAppleJws,
  getSubscriptionStatuses,
  mapAppleStatus,
} from '../_shared/apple-storekit.ts';

// Mapeia notificationType + subtype das App Store Server Notifications V2 para
// o status interno da tabela public.apple_subscriptions.
// Durante o billing grace period o usuário MANTÉM acesso premium (status 'in_grace').
function deriveStatusFromNotification(
  notificationType: string,
  subtype: string | undefined,
  autoRenewStatus: number,
  tx: any,
): string {
  switch (notificationType) {
    // Compra nova / renovação bem-sucedida / reativação
    case 'SUBSCRIBED':
    case 'DID_RENEW':
    case 'DID_RECOVER':
      return 'active';

    // Falha na cobrança da renovação. O subtype diz se entrou em grace period.
    case 'DID_FAIL_TO_RENEW':
      if (subtype === 'GRACE_PERIOD') return 'in_grace';
      // Sem grace period (ou grace period desativado) → conta expirará em breve
      return 'on_hold';

    // Saiu do grace period sem regularizar o pagamento
    case 'GRACE_PERIOD_EXPIRED':
      return 'expired';

    // Usuário desativou a renovação automática. Ainda é premium até expiresDate.
    // O status real depende se a assinatura já venceu ou não.
    case 'DID_CHANGE_RENEWAL_STATUS':
      if (subtype === 'AUTO_RENEW_ENABLED') return 'active';
      return mapAppleStatus(autoRenewStatus, tx);

    // Reembolso / revogação
    case 'REFUND':
    case 'REVOKE':
    case 'EXPIRED':
      if (subtype === 'VOLUNTARY') return 'expired';
      if (subtype === 'BILLING_RETRY') return 'on_hold';
      if (subtype === 'PRICE_INCREASE') return 'expired';
      return 'expired';

    // Trial / oferta introdutória convertida
    case 'INTRODUCTORY_OFFER':
      if (subtype === 'ACCEPTED') return 'active';
      return mapAppleStatus(autoRenewStatus, tx);

    default:
      return mapAppleStatus(autoRenewStatus, tx);
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const signedPayload: string | undefined = body?.signedPayload;
    if (!signedPayload) return new Response('no signedPayload', { status: 400 });

    const payload = decodeAppleJws<any>(signedPayload);
    if (!payload) return new Response('invalid payload', { status: 400 });

    const notificationType: string = payload.notificationType ?? '';
    const subtype: string | undefined = payload.subtype;
    const signedTx = payload?.data?.signedTransactionInfo;
    const signedRenewal = payload?.data?.signedRenewalInfo;
    const tx = decodeAppleJws<any>(signedTx) ?? {};
    const renewal = decodeAppleJws<any>(signedRenewal) ?? {};
    const environment: string = payload?.data?.environment ?? tx.environment ?? 'Production';

    const originalTxId = String(tx.originalTransactionId ?? '');
    if (!originalTxId) return new Response('missing originalTransactionId', { status: 200 });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Descobre user_id via linha existente (a compra foi criada por validate-purchase no cliente).
    const { data: existing } = await admin
      .from('apple_subscriptions')
      .select('user_id')
      .eq('original_transaction_id', originalTxId)
      .maybeSingle();

    if (!existing?.user_id) {
      // Sem vínculo ainda — só registramos log e saímos com 200 para não reentregar.
      console.warn('apple webhook: originalTransactionId sem user_id vinculado', originalTxId, notificationType);
      return new Response('ok', { status: 200 });
    }

    // Reconsulta o status oficial para termos autoRenewStatus e datas atualizadas
    let autoRenewStatus = renewal?.autoRenewStatus ?? 1;
    let txFinal = tx;
    try {
      const info = await getSubscriptionStatuses(originalTxId);
      if (info) {
        autoRenewStatus = info.autoRenewStatus ?? autoRenewStatus;
        if (info.transactionInfo) txFinal = info.transactionInfo;
      }
    } catch (e) {
      console.warn('apple webhook: getSubscriptionStatuses falhou', e);
    }

    // Determina o status final. Preferimos a semântica da notificação V2 porque
    // ela reflete eventos de ciclo de vida (grace period, expiração, etc.) com
    // mais precisão do que apenas o autoRenewStatus da API de status.
    const status = deriveStatusFromNotification(notificationType, subtype, autoRenewStatus, txFinal);
    const expiresMs = Number(txFinal.expiresDate ?? 0);
    const startMs = Number(txFinal.purchaseDate ?? 0);

    const { error: upErr } = await admin
      .from('apple_subscriptions')
      .upsert({
        user_id: existing.user_id,
        product_id: txFinal.productId,
        original_transaction_id: originalTxId,
        latest_transaction_id: String(txFinal.transactionId ?? originalTxId),
        bundle_id: txFinal.bundleId ?? BUNDLE_ID,
        environment,
        status,
        auto_renewing: autoRenewStatus === 1,
        start_time: startMs ? new Date(startMs).toISOString() : null,
        expires_at: expiresMs ? new Date(expiresMs).toISOString() : null,
        cancel_reason: txFinal.revocationReason != null ? String(txFinal.revocationReason) : null,
        latest_notification_type: notificationType,
        latest_notification_subtype: subtype ?? null,
        latest_notification_at: new Date().toISOString(),
        raw_payload: { notification: payload, transactionInfo: txFinal, renewalInfo: renewal, autoRenewStatus },
      }, { onConflict: 'original_transaction_id' });
    if (upErr) throw upErr;

    return new Response('ok', { status: 200 });
  } catch (err: any) {
    console.error('apple-billing-webhook error', err);
    // 200 para Apple não reenviar em loop; erros já ficam no log.
    return new Response('ok', { status: 200 });
  }
});
