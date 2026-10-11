import { useCallback, useMemo, useState } from 'react';
import PremiumGate, { type PremiumFeatureKey } from '@/components/PremiumGate';
import { useFeatureLimit, type FeatureLimitPeriod } from '@/hooks/useFeatureLimit';

const PERIODO_LABEL: Record<FeatureLimitPeriod, string> = {
  daily: 'hoje',
  monthly: 'neste mês',
  lifetime: 'no plano gratuito',
};

interface Options {
  /** Escopo (ex.: id do livro/resumo) — o mesmo item não conta duas vezes no período. */
  scope?: string | null;
  /** Chave de referência salva no registro de uso. */
  refKey?: string;
}

/**
 * Gate padrão do plano gratuito.
 * `run(fn)` executa a ação quando há saldo (e registra o uso) ou abre o card
 * de assinatura quando o limite foi atingido / a função é só de assinante.
 */
export function useGatedFeature(
  featureKey: string,
  premiumFeature: PremiumFeatureKey = 'default',
  options: Options = {},
) {
  const limit = useFeatureLimit(featureKey, { scope: options.scope ?? null });
  const [open, setOpen] = useState(false);

  const usageLabel = useMemo(() => {
    const c = limit.config;
    if (!c || !c.enabled || limit.isPremium || limit.isAdmin) return undefined;
    if (c.limit_value <= 0) return undefined;
    return `Você já usou ${Math.min(limit.used, c.limit_value)} de ${c.limit_value} ${PERIODO_LABEL[c.period]}.`;
  }, [limit.config, limit.used, limit.isPremium, limit.isAdmin]);

  const openGate = useCallback(() => setOpen(true), []);

  const run = useCallback(
    async (fn?: () => void | Promise<void>) => {
      if (limit.blocked) {
        setOpen(true);
        return false;
      }
      await fn?.();
      await limit.register(options.refKey ?? options.scope ?? undefined);
      return true;
    },
    [limit, options.refKey, options.scope],
  );

  const gateNode = (
    <PremiumGate
      open={open}
      onClose={() => setOpen(false)}
      feature={premiumFeature}
      usageLabel={usageLabel}
    />
  );

  return { ...limit, run, openGate, gateNode, usageLabel };
}
