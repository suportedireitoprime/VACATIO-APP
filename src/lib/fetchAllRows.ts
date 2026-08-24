/**
 * Fetches ALL rows from a Supabase query, bypassing the PostgREST default 1000-row limit.
 * Uses .range() pagination in chunks until the response is smaller than the chunk size.
 *
 * Usage:
 *   const rows = await fetchAllRows(() => supabase.from('t').select('id, name').eq('x', 1));
 */
type QueryBuilder = { range: (from: number, to: number) => Promise<{ data: any; error: any }> };

export async function fetchAllRows<T = any>(
  buildQuery: () => QueryBuilder,
  chunkSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // hard safety cap to avoid runaway loops
  const maxIterations = 1000;
  for (let i = 0; i < maxIterations; i++) {
    const to = from + chunkSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw error;
    const rows = (data as T[]) ?? [];
    all.push(...rows);
    if (rows.length < chunkSize) break;
    from += chunkSize;
  }
  return all;
}
