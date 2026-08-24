// SM-2 lite para flashcards do Aprender.
// Intervalos: erro -> 1d, e escalada 3d -> 7d -> 21d.
// Guardamos apenas `proxima_revisao_em` em aprender_progresso_bloco.

const DIA_MS = 24 * 60 * 60 * 1000;
const ESCALA_DIAS = [1, 3, 7, 21];

export type NivelFlashcard = 'sabia' | 'nao_sabia';

/** Retorna ISO da próxima revisão. */
export function proximaRevisao(
  nivel: NivelFlashcard,
  ultimaProxima?: string | null,
): string {
  if (nivel === 'nao_sabia') {
    return new Date(Date.now() + ESCALA_DIAS[0] * DIA_MS).toISOString();
  }
  // Se já revisou antes, avança para o próximo intervalo maior
  const ultimoMs = ultimaProxima ? Date.parse(ultimaProxima) - Date.now() : 0;
  const ultimoDias = Math.max(0, Math.round(ultimoMs / DIA_MS));
  const proximo = ESCALA_DIAS.find((d) => d > ultimoDias) ?? ESCALA_DIAS[ESCALA_DIAS.length - 1];
  return new Date(Date.now() + proximo * DIA_MS).toISOString();
}

/** Legenda amigável do intervalo escolhido. */
export function rotuloIntervalo(iso: string): string {
  const dias = Math.max(1, Math.round((Date.parse(iso) - Date.now()) / DIA_MS));
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}
