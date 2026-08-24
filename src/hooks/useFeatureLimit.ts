import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export type FeatureLimitPeriod = 'daily' | 'monthly' | 'lifetime';

export interface FeatureLimitConfig {
  feature_key: string;
  label: string;
  description: string | null;
  category: string;
  limit_value: number;
  period: FeatureLimitPeriod;
  scope_key: string | null;
  enabled: boolean;
  sort_order: number;
}

// Cache global simples dos limits (5min)
let cachedLimits: FeatureLimitConfig[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;
const listeners = new Set<(l: FeatureLimitConfig[]) => void>();

async function loadLimits(force = false): Promise<FeatureLimitConfig[]> {
  const now = Date.now();
  if (!force && cachedLimits && now - cachedAt < CACHE_TTL) return cachedLimits;
  const { data } = await supabase.from('feature_limits' as any).select('*');
  cachedLimits = (data || []) as any;
  cachedAt = now;
  listeners.forEach(l => l(cachedLimits!));
  return cachedLimits!;
}

export function invalidateFeatureLimits() {
  cachedLimits = null;
  return loadLimits(true);
}

function periodStart(period: FeatureLimitPeriod): Date {
  const d = new Date();
  if (period === 'daily') {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'monthly') {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(0);
}

import { isAdminEmail } from '@/lib/adminEmails';

interface UseFeatureLimitOptions {
  scope?: string | null;
}

interface UseFeatureLimitResult {
  loading: boolean;
  config: FeatureLimitConfig | null;
  isPremium: boolean;
  isAdmin: boolean;
  used: number;
  remaining: number;
  canUse: boolean;
  /** True quando bloqueado por falta de assinatura ou limite atingido */
  blocked: boolean;
  register: (refKey?: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Hook central de paywall.
 * canUse === true quando: admin, premium, ou (enabled=false), ou uso < limit_value,
 * ou (scope existe e scope atual já foi usado no período).
 */
export function useFeatureLimit(
  featureKey: string,
  options: UseFeatureLimitOptions = {}
): UseFeatureLimitResult {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const isAdmin = isAdminEmail(user?.email);
  const [config, setConfig] = useState<FeatureLimitConfig | null>(null);
  const [used, setUsed] = useState(0);
  const [scopeAlreadyUsed, setScopeAlreadyUsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const scope = options.scope ?? null;

  const refresh = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const update = (list: FeatureLimitConfig[]) => {
      if (cancelled) return;
      const c = list.find(l => l.feature_key === featureKey) || null;
      setConfig(c);
    };
    loadLimits().then(update);
    listeners.add(update);
    return () => { cancelled = true; listeners.delete(update); };
  }, [featureKey]);

  useEffect(() => {
    let cancelled = false;
    if (!user || !config) { setLoading(false); return; }
    if (isPremium || isAdmin || !config.enabled) { setLoading(false); return; }

    (async () => {
      const since = periodStart(config.period).toISOString();
      const q = supabase.from('feature_usage' as any)
        .select('scope_value', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('feature_key', featureKey)
        .gte('used_at', since);
      const { data, count } = await q;
      if (cancelled) return;
      setUsed(count || 0);
      if (config.scope_key && scope) {
        const already = (data || []).some((r: any) => r.scope_value === scope);
        setScopeAlreadyUsed(already);
      } else {
        setScopeAlreadyUsed(false);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, config, featureKey, isPremium, isAdmin, scope, nonce]);

  const limit = config?.limit_value ?? 0;
  const enabled = config?.enabled ?? false;
  const remaining = Math.max(0, limit - used);
  const scopeBypass = !!(config?.scope_key && scope && scopeAlreadyUsed);
  const canUse =
    isAdmin || isPremium || !enabled || scopeBypass || (limit > 0 && used < limit);
  const blocked = !canUse;

  const register = useCallback(async (refKey?: string) => {
    if (!user || isAdmin || isPremium || !config?.enabled) return;
    if (config.scope_key && scope && scopeAlreadyUsed) return;
    await supabase.from('feature_usage' as any).insert({
      user_id: user.id,
      feature_key: featureKey,
      scope_value: scope,
      ref_key: refKey || null,
    });
    setUsed(u => u + 1);
    if (config.scope_key && scope) setScopeAlreadyUsed(true);
  }, [user, isAdmin, isPremium, config, featureKey, scope, scopeAlreadyUsed]);

  return {
    loading,
    config,
    isPremium,
    isAdmin,
    used,
    remaining,
    canUse,
    blocked,
    register,
    refresh,
  };
}
