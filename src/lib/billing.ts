import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { supabase } from '@/integrations/supabase/client';

// ── IDs configurados no Google Play Console → Monetizar → Assinaturas ──
export const PRODUCT_IDS = {
  mensal: 'vade_mecum_mensal',
  anual: 'vade_mecum_anual',
  anual_parcelado: 'vade_mecum_anual',
} as const;

// Base Plan IDs configurados dentro de cada assinatura no Play Console
export const PLAN_IDS = {
  mensal: 'mensal',
  anual: 'anual',
  anual_parcelado: 'anual-parcelado',
} as const;

export type PlanId = keyof typeof PRODUCT_IDS;

export interface PlayProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
}

export function isBillingAvailable() {
  return Capacitor.isNativePlatform();
}

let listenerRegistered = false;

/** Inicializa o listener de transações e retorna as entitulas atuais. */
export async function initBilling(onPurchased?: () => void): Promise<void> {
  if (!isBillingAvailable() || listenerRegistered) return;

  NativePurchases.addListener('transactionUpdated', async (transaction) => {
    const token =
      transaction?.purchaseToken ??
      (transaction as any)?.transactionId ??
      (transaction as any)?.transactionIdentifier ??
      transaction?.receipt;
    const productId = transaction?.productIdentifier;
    if (token && productId) {
      const r = await validateWithServer(productId, token, currentPlatform());
      if (r.ok) onPurchased?.();
    }
  });

  listenerRegistered = true;
}

export async function getProducts(): Promise<PlayProduct[]> {
  if (!isBillingAvailable()) return [];
  try {
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: Object.values(PRODUCT_IDS),
      productType: PURCHASE_TYPE.SUBS,
    });
    return (products ?? []).map((p) => ({
      productId: p.identifier,
      title: p.title,
      description: p.description,
      price: p.priceString,
    }));
  } catch (e) {
    console.warn('getProducts falhou', e);
    return [];
  }
}

function currentPlatform(): 'ios' | 'android' {
  return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
}

export async function purchase(plan: PlanId): Promise<{ ok: boolean; error?: string }> {
  if (!isBillingAvailable()) {
    return { ok: false, error: 'Compras nativas só funcionam no app instalado pela loja.' };
  }
  try {
    const productId = PRODUCT_IDS[plan];
    const planId = PLAN_IDS[plan];
    const platform = currentPlatform();
    // Na App Store da Apple não existe o conceito de "base plan"; enviar somente productIdentifier.
    const args: any = {
      productIdentifier: productId,
      productType: PURCHASE_TYPE.SUBS,
    };
    if (platform === 'android') args.planIdentifier = planId;
    const transaction = await NativePurchases.purchaseProduct(args);
    // Android → purchaseToken; iOS (StoreKit 2) → transactionId; fallback → receipt
    const token =
      transaction?.purchaseToken ??
      (transaction as any)?.transactionId ??
      (transaction as any)?.transactionIdentifier ??
      (transaction as any)?.receipt;
    if (token) {
      const r = await validateWithServer(productId, token, platform);
      if (!r.ok) return { ok: false, error: r.error ?? 'Falha ao validar compra.' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Falha na compra.' };
  }
}

export async function restorePurchases(): Promise<{ ok: boolean; restored: number; error?: string }> {
  if (!isBillingAvailable()) return { ok: false, restored: 0, error: 'Só disponível no app nativo.' };
  try {
    const platform = currentPlatform();
    await NativePurchases.restorePurchases();
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS });
    let restored = 0;
    for (const p of purchases ?? []) {
      const token =
        p.purchaseToken ??
        (p as any).transactionId ??
        (p as any).transactionIdentifier ??
        (p as any).receipt;
      if (token && p.productIdentifier) {
        const r = await validateWithServer(p.productIdentifier, token, platform);
        if (r.ok) restored++;
      }
    }
    return { ok: true, restored };
  } catch (err: any) {
    return { ok: false, restored: 0, error: err?.message ?? 'Falha ao restaurar.' };
  }
}

export async function openManageSubscriptions(): Promise<void> {
  if (!isBillingAvailable()) return;
  await NativePurchases.manageSubscriptions();
}

// Deduplica validate-purchase quando listener `transactionUpdated` e o handler
// direto disparam para o mesmo purchaseToken quase ao mesmo tempo.
const inflightValidations = new Map<string, Promise<{ ok: boolean; error?: string }>>();

async function validateWithServer(productId: string, purchaseToken: string, platform: 'ios' | 'android' = 'android') {
  const key = `${platform}:${purchaseToken}`;
  const existing = inflightValidations.get(key);
  if (existing) return existing;
  const p = (async () => {
    const { data, error } = await supabase.functions.invoke('validate-purchase', {
      body: { productId, purchaseToken, platform },
    });
    if (error) return { ok: false, error: error.message };
    if (!data?.success) return { ok: false, error: data?.error ?? 'Validação falhou.' };
    return { ok: true };
  })();
  inflightValidations.set(key, p);
  // Mantém no cache por 30s para absorver o listener que chega segundos depois
  setTimeout(() => inflightValidations.delete(key), 30_000);
  return p;
}


