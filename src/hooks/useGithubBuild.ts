import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GhRun = {
  id: number;
  name?: string;
  display_title?: string;
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: 'success' | 'failure' | 'cancelled' | null | string;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
  event?: string;
  head_branch?: string;
  actor?: { login: string; avatar_url: string };
};

export type GhJobStep = { name: string; status: string; conclusion: string | null; number: number; started_at?: string; completed_at?: string };
export type GhJob = { id: number; name: string; status: string; conclusion: string | null; steps: GhJobStep[]; html_url: string };
export type GhArtifact = { id: number; name: string; size_in_bytes: number; expired: boolean; created_at: string; expires_at: string };

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('github-actions', { body });
  if (error) throw new Error(error.message);
  return data;
};

const invokeRaw = async (body: Record<string, unknown>): Promise<Blob> => {
  const { data: sess } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-actions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${sess.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return await res.blob();
};

export function useGithubBuild(repo: string, workflow_file = 'build-android.yml') {
  const [runs, setRuns] = useState<GhRun[]>([]);
  const [current, setCurrent] = useState<{ run: GhRun; jobs: { jobs: GhJob[] } } | null>(null);
  const [artifacts, setArtifacts] = useState<GhArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadRuns = useCallback(async () => {
    try {
      setError(null);
      const data = await call({ action: 'list_runs', repo, workflow_file, per_page: 10 });
      const list: GhRun[] = data.workflow_runs || [];
      setRuns(list);
      return list;
    } catch (e: any) {
      setError(e.message);
      return [];
    }
  }, [repo, workflow_file]);

  const loadRun = useCallback(async (runId: number) => {
    try {
      const data = await call({ action: 'get_run', repo, run_id: runId });
      setCurrent({ run: data.run, jobs: data.jobs });
      if (data.run?.status === 'completed') {
        const arts = await call({ action: 'list_artifacts', repo, run_id: runId });
        setArtifacts(arts.artifacts || []);
      } else {
        setArtifacts([]);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [repo]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const list = await loadRuns();
    if (list[0]) await loadRun(list[0].id);
    setLoading(false);
  }, [loadRuns, loadRun]);

  // polling
  useEffect(() => {
    if (!current) return;
    const active = current.run.status !== 'completed';
    const delay = active ? 10000 : 60000;
    timerRef.current = window.setTimeout(async () => {
      await loadRun(current.run.id);
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, loadRun]);

  const dispatch = useCallback(async (ref = 'main') => {
    setLoading(true);
    try {
      await call({ action: 'dispatch_run', repo, workflow_file, ref });
      // small delay for GitHub to create the run
      await new Promise(r => setTimeout(r, 3500));
      await refreshAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [repo, workflow_file, refreshAll]);

  const download = useCallback(async (artifact: GhArtifact) => {
    const blob = await invokeRaw({ action: 'download_artifact', repo, artifact_id: artifact.id });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.name}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [repo]);

  // ETA from last 5 successful runs
  const avgDurationMs = useMemo(() => {
    const done = runs.filter(r => r.conclusion === 'success' && r.run_started_at);
    const last = done.slice(0, 5);
    if (!last.length) return 12 * 60 * 1000;
    const total = last.reduce((s, r) => s + (new Date(r.updated_at).getTime() - new Date(r.run_started_at!).getTime()), 0);
    return Math.max(60000, total / last.length);
  }, [runs]);

  const stats = useMemo(() => {
    if (!current) return null;
    const start = new Date(current.run.run_started_at || current.run.created_at).getTime();
    const elapsed = current.run.status === 'completed'
      ? new Date(current.run.updated_at).getTime() - start
      : now - start;
    const pct = current.run.status === 'completed'
      ? 100
      : Math.min(98, (elapsed / avgDurationMs) * 100);
    const etaMs = current.run.status === 'completed' ? 0 : Math.max(0, avgDurationMs - elapsed);
    const currentStep = current.jobs?.jobs?.[0]?.steps?.find(s => s.status === 'in_progress')?.name
      || current.jobs?.jobs?.[0]?.steps?.filter(s => s.status === 'completed').slice(-1)[0]?.name;
    return { elapsed, pct, etaMs, currentStep };
  }, [current, now, avgDurationMs]);

  return { runs, current, artifacts, loading, error, stats, refreshAll, loadRun, dispatch, download };
}

export const fmtDuration = (ms: number) => {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, '0')}s`;
};

export const fmtBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};
