import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import { COLECOES, getColecoesVisiveis, type ColecaoConfig } from '@/lib/bibliotecaColecoes';

/**
 * Retorna a lista de coleções da biblioteca visíveis para o usuário atual.
 * Admins veem todas; usuários comuns não veem coleções marcadas `adminOnly`.
 */
export function useVisibleColecoes(): ColecaoConfig[] {
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  return useMemo(() => getColecoesVisiveis(isAdmin), [isAdmin]);
}

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return isAdminEmail(user?.email);
}

export { COLECOES };
