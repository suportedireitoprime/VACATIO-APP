// Helpers para tratar "nome preferido" antes de mandar mensagens.
// Evita que áreas do Direito ("Direito", "Penal", "Civil") ou termos
// genéricos ("estudante", "user", "teste") vazem como nome próprio.

const BAD_NAME_RE =
  /^(direito|penal|civil|constitucional|trabalhista|tributario|tribut[aá]rio|administrativo|processual|empresarial|previdenciario|previdenci[aá]rio|estudante|aluno|usuario|usu[aá]rio|user|teste|test|null|undefined|nan|none)(\s|$)/i;

/**
 * Retorna o primeiro nome "limpo" ou string vazia quando o valor
 * for uma palavra que não deveria ser tratada como nome próprio.
 */
export function sanitizeFirstName(raw: unknown): string {
  if (!raw) return "";
  const cleaned = String(raw).trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  if (BAD_NAME_RE.test(cleaned)) return "";
  const first = cleaned.split(" ")[0];
  // Rejeita se o primeiro token tiver menos de 2 letras ou não tiver vogais.
  if (first.length < 2) return "";
  if (!/[aeiouáéíóúâêôãõ]/i.test(first)) return "";
  // Capitaliza (evita "wesley" e "WESLEY").
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function firstNameOrFallback(raw: unknown, fallback = ""): string {
  return sanitizeFirstName(raw) || fallback;
}
