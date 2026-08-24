// Fonte de verdade dos stats do "Meu Espaço" (interações totais, segundos em tela,
// avatar, bio, capa). Persiste no cache do React Query (PersistQueryClientProvider
// já configurado no App), então na 2ª+ abertura o valor aparece no primeiro paint.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ProfileSummary {
  displayName: string;
  isPremium: boolean;
  avatarUrl: string;
  bio: string;
  capaId: string;
  interacoesTotal: number;
  segundosEmTela: number;
  email: string;
}

const KEY = (uid: string | null | undefined) => ['profile-summary', uid ?? 'anon'] as const;
const LS_KEY = (uid: string) => `vacatio:profile-summary:${uid}`;

function readCache(uid: string): ProfileSummary | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(LS_KEY(uid));
    return raw ? (JSON.parse(raw) as ProfileSummary) : undefined;
  } catch { return undefined; }
}

function writeCache(uid: string, value: ProfileSummary) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(LS_KEY(uid), JSON.stringify(value)); } catch { /* ignore */ }
}

async function fetchProfileSummary(userId: string, fallbackEmail: string, fallbackAvatar: string): Promise<ProfileSummary> {
  // Offline: usa o último snapshot salvo (ou um shape mínimo com o e-mail).
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const cached = readCache(userId);
    if (cached) return cached;
    return {
      displayName: fallbackEmail.split('@')[0] || 'Usuário',
      isPremium: false,
      avatarUrl: fallbackAvatar || '',
      bio: '',
      capaId: 'capa1',
      interacoesTotal: 0,
      segundosEmTela: 0,
      email: fallbackEmail,
    };
  }
  const { data } = await supabase
    .from('profiles')
    .select('display_name,nome_preferido,is_premium,bio,capa_id,interacoes_total,segundos_em_tela,avatar_url')
    .eq('id', userId)
    .maybeSingle();
  const p: any = data ?? {};
  const summary: ProfileSummary = {
    displayName: p.nome_preferido || p.display_name || (fallbackEmail.split('@')[0] || 'Usuário'),
    isPremium: !!p.is_premium,
    avatarUrl: p.avatar_url || fallbackAvatar || '',
    bio: p.bio ?? '',
    capaId: p.capa_id ?? 'capa1',
    interacoesTotal: Number(p.interacoes_total ?? 0),
    segundosEmTela: Number(p.segundos_em_tela ?? 0),
    email: fallbackEmail,
  };
  writeCache(userId, summary);
  return summary;
}

export function useProfileSummary() {
  const { user } = useAuth();
  const fallbackAvatar =
    (user?.user_metadata as any)?.avatar_url ||
    (user?.user_metadata as any)?.picture ||
    '';
  const fallbackEmail = user?.email ?? '';

  return useQuery({
    queryKey: KEY(user?.id),
    enabled: !!user?.id,
    queryFn: () => fetchProfileSummary(user!.id, fallbackEmail, fallbackAvatar),
    initialData: user?.id ? readCache(user.id) : undefined,
    staleTime: 30_000,
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7d — persistido
    // SWR: retorna cache imediatamente; revalida só se stale.
    placeholderData: (prev) => prev,
  });
}

/** Prefetch usado no boot / hover para deixar o cache quente. */
export function usePrefetchProfileSummary() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => {
    if (!user?.id) return;
    const fallbackAvatar =
      (user.user_metadata as any)?.avatar_url ||
      (user.user_metadata as any)?.picture ||
      '';
    qc.prefetchQuery({
      queryKey: KEY(user.id),
      queryFn: () => fetchProfileSummary(user.id, user.email ?? '', fallbackAvatar),
      staleTime: 30_000,
    });
  };
}

export function refreshProfileSummary(qc: ReturnType<typeof useQueryClient>, userId: string | null | undefined) {
  if (!userId) return;
  qc.invalidateQueries({ queryKey: KEY(userId) });
}
