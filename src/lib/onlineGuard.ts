// Guard universal para chamadas de rede (Edge Functions, APIs externas).
//
// Uso:
//   const data = await withOnlineGuard(
//     () => supabase.functions.invoke('minha-fn', { body }),
//     { fallback: () => carregarLocal(), message: 'Precisa de internet para...' }
//   );
//
// - Se offline e houver `fallback`, chama o fallback.
// - Se offline e não houver fallback, lança Error com `message` traduzida em PT.
// - Se online e a chamada falhar por "Failed to send a request to the Edge
//   Function" (rede caiu no meio), tenta o fallback antes de re-lançar.

export interface OnlineGuardOptions<T> {
  /** Fallback local usado quando offline (ou quando a rede falha no meio da chamada). */
  fallback?: () => Promise<T> | T;
  /** Mensagem em PT mostrada ao usuário quando não há fallback e está offline. */
  message?: string;
}

const DEFAULT_MSG = 'Este recurso precisa de internet. Conecte-se e tente de novo.';

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function isNetworkError(err: unknown): boolean {
  const msg = (err as any)?.message || String(err || '');
  return (
    /Failed to send a request to the Edge Function/i.test(msg) ||
    /Failed to fetch/i.test(msg) ||
    /NetworkError/i.test(msg) ||
    /Network request failed/i.test(msg) ||
    /timeout/i.test(msg)
  );
}

export async function withOnlineGuard<T>(
  fn: () => Promise<T>,
  opts: OnlineGuardOptions<T> = {},
): Promise<T> {
  if (isOffline()) {
    if (opts.fallback) return await opts.fallback();
    throw new Error(opts.message ?? DEFAULT_MSG);
  }
  try {
    return await fn();
  } catch (err) {
    if (isNetworkError(err) && opts.fallback) {
      try {
        return await opts.fallback();
      } catch {
        /* cai pro throw abaixo */
      }
    }
    if (isNetworkError(err)) {
      throw new Error(opts.message ?? DEFAULT_MSG);
    }
    throw err;
  }
}

/** Helper simples para checar "posso chamar rede agora?" sem envolver a chamada. */
export function assertOnline(message?: string): void {
  if (isOffline()) throw new Error(message ?? DEFAULT_MSG);
}