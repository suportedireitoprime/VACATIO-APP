// Espelho local do `artigo_ai_cache` (Supabase) em localStorage.
// Faz o conteúdo IA já gerado (explicação, exemplo, termos, grifo mágico)
// ficar disponível offline sem depender de rede.

type Tipo = 'explicacao' | 'exemplo' | 'termos' | 'grifo_magico' | 'sugerir_perguntas' | string;

const PREFIX = 'ai_cache:v1:';

function keyOf(tabela: string, numero: string | number, tipo: Tipo): string {
  return `${PREFIX}${tabela}|${numero}|${tipo}`;
}

export function getLocalAiCache(
  tabela: string | null | undefined,
  numero: string | number | null | undefined,
  tipo: Tipo,
): string | null {
  if (!tabela || numero === null || numero === undefined) return null;
  try {
    return localStorage.getItem(keyOf(tabela, numero, tipo));
  } catch {
    return null;
  }
}

export function setLocalAiCache(
  tabela: string | null | undefined,
  numero: string | number | null | undefined,
  tipo: Tipo,
  conteudo: string | null | undefined,
): void {
  if (!tabela || numero === null || numero === undefined || !conteudo) return;
  try {
    localStorage.setItem(keyOf(tabela, numero, tipo), conteudo);
  } catch {
    // quota — ignore
  }
}

export function deleteLocalAiCache(
  tabela: string | null | undefined,
  numero: string | number | null | undefined,
  tipo: Tipo,
): void {
  if (!tabela || numero === null || numero === undefined) return;
  try {
    localStorage.removeItem(keyOf(tabela, numero, tipo));
  } catch {
    /* ignore */
  }
}