import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Voltar seguro: usa o histórico interno quando existe; caso contrário
 * navega para uma rota de fallback (padrão: início do app).
 *
 * Necessário porque `navigate(-1)` não faz nada quando a tela foi aberta
 * direto (deep link, notificação, URL do preview) ou depois de um
 * `navigate(..., { replace: true })` — nesses casos o índice do histórico é 0.
 */
export function useGoBack(fallback: string = '/') {
  const navigate = useNavigate();

  return useCallback(() => {
    const idx =
      typeof window !== 'undefined'
        ? (window.history.state as { idx?: number } | null)?.idx
        : undefined;

    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

export default useGoBack;
