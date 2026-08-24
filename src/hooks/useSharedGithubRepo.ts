import { useEffect, useState } from 'react';

const KEY = 'admin_github_repo';

function normalize(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
    .split('/')
    .slice(0, 2)
    .join('/');
}

/**
 * Repositório GitHub compartilhado entre AdminSecretsDownload e AdminNativeAssets.
 * Mudanças em qualquer uma das telas refletem na outra (mesmo storage + evento).
 */
export function useSharedGithubRepo(defaultValue = '') {
  const [repo, setRepoState] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultValue;
    return localStorage.getItem(KEY) || defaultValue;
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && typeof e.newValue === 'string') setRepoState(e.newValue);
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') setRepoState(detail);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('admin-github-repo-changed', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('admin-github-repo-changed', onCustom as EventListener);
    };
  }, []);

  const setRepo = (value: string, opts: { normalize?: boolean } = {}) => {
    const next = opts.normalize ? normalize(value) : value;
    setRepoState(next);
    if (opts.normalize) {
      localStorage.setItem(KEY, next);
      window.dispatchEvent(new CustomEvent('admin-github-repo-changed', { detail: next }));
    }
  };

  const commit = (value?: string): string => {
    const next = normalize(value ?? repo);
    setRepoState(next);
    localStorage.setItem(KEY, next);
    window.dispatchEvent(new CustomEvent('admin-github-repo-changed', { detail: next }));
    return next;
  };

  return { repo, setRepo, commit, normalize };
}
