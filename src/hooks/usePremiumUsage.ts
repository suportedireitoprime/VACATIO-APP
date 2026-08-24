// Compatibility shim — usa o novo sistema `feature_limits` / `feature_usage`.
// Mantém a API antiga (canUse/usageCount/remaining/registerUsage) para as telas
// que ainda não migraram para useFeatureLimit.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { isAdminEmail } from '@/lib/adminEmails';

// Mapa das antigas keys → novas feature_keys do sistema editável
const KEY_MAP: Record<string, string> = {
  narracao: 'narracao',
};

interface LimitRow { feature_key: string; limit_value: number; period: string; enabled: boolean }

let limitsCache: LimitRow[] | null = null;
async function fetchLimits(): Promise<LimitRow[]> {
  if (limitsCache) return limitsCache;
  const { data } = await supabase.from('feature_limits' as any).select('feature_key, limit_value, period, enabled');
  limitsCache = (data || []) as any;
  return limitsCache!;
}

function periodStart(period: string): Date {
  const d = new Date();
  if (period === 'daily') { d.setHours(0,0,0,0); return d; }
  if (period === 'monthly') { d.setDate(1); d.setHours(0,0,0,0); return d; }
  return new Date(0);
}

export function usePremiumUsage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const isAdmin = isAdminEmail(user?.email);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [limits, setLimits] = useState<Record<string, LimitRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const all = await fetchLimits();
      const map: Record<string, LimitRow> = {};
      all.forEach(l => { map[l.feature_key] = l; });
      if (cancelled) return;
      setLimits(map);

      // Contagens por feature (uso mais recente do maior período — usamos monthly como base segura)
      const monthStart = periodStart('monthly').toISOString();
      const { data } = await supabase.from('feature_usage' as any)
        .select('feature_key, used_at')
        .eq('user_id', user.id)
        .gte('used_at', monthStart);
      if (cancelled) return;
      const c: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        const lim = map[r.feature_key];
        if (!lim) return;
        const start = periodStart(lim.period);
        if (new Date(r.used_at) >= start) c[r.feature_key] = (c[r.feature_key] || 0) + 1;
      });
      setCounts(c);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const resolveKey = (feature: string) => KEY_MAP[feature] || feature;

  const canUse = useCallback((feature: string) => {
    if (isAdmin || isPremium) return true;
    const key = resolveKey(feature);
    const lim = limits[key];
    if (!lim || !lim.enabled) return true;
    return (counts[key] || 0) < lim.limit_value;
  }, [counts, limits, isAdmin, isPremium]);

  const usageCount = useCallback((feature: string) => counts[resolveKey(feature)] || 0, [counts]);

  const canUseRef = useCallback(async (feature: string, refKey?: string) => {
    if (isAdmin || isPremium) return true;
    if (!user) return false;

    const key = resolveKey(feature);
    const allLimits = Object.keys(limits).length ? Object.values(limits) : await fetchLimits();
    const lim = Array.isArray(allLimits)
      ? allLimits.find((l) => l.feature_key === key)
      : (allLimits as Record<string, LimitRow>)[key];

    if (!lim || !lim.enabled) return true;

    const since = periodStart(lim.period).toISOString();
    const { data } = await supabase.from('feature_usage' as any)
      .select('ref_key, scope_value, used_at')
      .eq('user_id', user.id)
      .eq('feature_key', key)
      .gte('used_at', since);

    const rows = (data || []) as Array<{ ref_key?: string | null; scope_value?: string | null }>;
    const sameArticleAlreadyUsed = !!refKey && rows.some((row) => row.ref_key === refKey || row.scope_value === refKey);
    if (sameArticleAlreadyUsed) return true;

    return rows.length < lim.limit_value;
  }, [isAdmin, isPremium, limits, user]);

  const remaining = useCallback((feature: string) => {
    const key = resolveKey(feature);
    const lim = limits[key];
    if (!lim) return 999;
    return Math.max(0, lim.limit_value - (counts[key] || 0));
  }, [counts, limits]);

  const registerUsage = useCallback(async (feature: string, refKey?: string) => {
    if (!user || isAdmin || isPremium) return;
    const key = resolveKey(feature);
    const allLimits = Object.keys(limits).length ? Object.values(limits) : await fetchLimits();
    const lim = Array.isArray(allLimits)
      ? allLimits.find((l) => l.feature_key === key)
      : (allLimits as Record<string, LimitRow>)[key];

    if (refKey && lim?.enabled) {
      const since = periodStart(lim.period).toISOString();
      const { data: existing } = await supabase.from('feature_usage' as any)
        .select('id, ref_key, scope_value')
        .eq('user_id', user.id)
        .eq('feature_key', key)
        .gte('used_at', since);

      const alreadyRegistered = (existing || []).some((row: any) => row.ref_key === refKey || row.scope_value === refKey);
      if (alreadyRegistered) return;
    }

    await supabase.from('feature_usage' as any).insert({
      user_id: user.id,
      feature_key: key,
      scope_value: refKey || null,
      ref_key: refKey || null,
    });
    setCounts(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  }, [user, isAdmin, isPremium, limits]);

  return { canUse, canUseRef, usageCount, remaining, registerUsage, loading };
}
