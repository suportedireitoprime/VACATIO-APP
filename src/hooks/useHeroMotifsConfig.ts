import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HeroMotifsConfig = {
  slots_count: number;
  interval_ms: number;
};

export const HERO_MOTIFS_DEFAULT: HeroMotifsConfig = {
  slots_count: 12,
  interval_ms: 3000,
};

export const HERO_MOTIFS_LIMITS = {
  slots: { min: 4, max: 12 },
  intervalMs: { min: 500, max: 60000 },
};

export function useHeroMotifsConfig() {
  const [config, setConfig] = useState<HeroMotifsConfig>(HERO_MOTIFS_DEFAULT);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('hero_motifs_config')
      .select('slots_count, interval_ms')
      .eq('id', 1)
      .maybeSingle();
    if (data) {
      setConfig({
        slots_count: data.slots_count ?? HERO_MOTIFS_DEFAULT.slots_count,
        interval_ms: data.interval_ms ?? HERO_MOTIFS_DEFAULT.interval_ms,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('hero-motifs-config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hero_motifs_config' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const save = useCallback(async (next: HeroMotifsConfig) => {
    const clamped: HeroMotifsConfig = {
      slots_count: Math.min(
        HERO_MOTIFS_LIMITS.slots.max,
        Math.max(HERO_MOTIFS_LIMITS.slots.min, Math.round(next.slots_count)),
      ),
      interval_ms: Math.min(
        HERO_MOTIFS_LIMITS.intervalMs.max,
        Math.max(HERO_MOTIFS_LIMITS.intervalMs.min, Math.round(next.interval_ms)),
      ),
    };
    const { error } = await (supabase as any)
      .from('hero_motifs_config')
      .upsert({ id: 1, ...clamped, updated_at: new Date().toISOString() });
    if (!error) setConfig(clamped);
    return { error, config: clamped };
  }, []);

  return { config, loading, save, reload: load };
}
