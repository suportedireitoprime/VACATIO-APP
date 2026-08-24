// Allowlist compartilhada de tipos de bloco aceitos em `aprender_blocos`.
// Usada pelas edge functions que geram aulas, flashcards e questões.
export const VALID_BLOCO_TIPOS = new Set([
  // Teoria
  "leitura",
  "citacao",
  "artigo_lei",
  "tabela",
  "mapa_mental",
  "mapa_conceitual",
  "fluxograma",
  "linha_tempo",
  "destaque",
  "infografico",
  "ordenacao",
  "cena_animada",
  "conexao",
  // Prática
  "pergunta",
  "flashcard",
]);

export function normalizeTipo(raw: unknown, fallback = "leitura"): string {
  const t = String(raw ?? fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return VALID_BLOCO_TIPOS.has(t) ? t : fallback;
}

// Hash simples para deduplicação de flashcards ao regerar.
export async function sha1(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
