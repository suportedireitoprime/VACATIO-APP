/**
 * Utilitários para formatação e estruturação de Capítulos e Títulos de Legislação.
 * Trata casos onde leis têm Partes, Livros, Títulos ou Capítulos, eliminando qualquer
 * fallback incorreto como '__sem_capitulo__' ou '__no_titulo__'.
 */

export interface FormattedCapitulo {
  tag: string;
  title: string;
}

export function toCleanTitleCase(str: string): string {
  if (!str) return '';
  const clean = str.replace(/\r/g, '').trim();
  const pequenos = new Set([
    'e', 'ou', 'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sob', 'sobre'
  ]);
  return clean
    .split(/\s+/)
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (i > 0 && pequenos.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(' ');
}

/**
 * Normaliza um cabeçalho estrutural (ex: 'TÍTULO I', 'DO TRIBUNAL SUPERIOR')
 * garantindo que não haja repetição do número no início do texto.
 */
export function parseStructuralHeading(num: string, rawText?: string | null): string {
  const cleanNum = (num || '').trim();
  let text = (rawText || '').replace(/<[^>]+>/g, '').replace(/\r/g, '').trim();

  // Se o texto começa com o próprio num (ex: 'TÍTULO I\nDO TRIBUNAL'), remove a repetição
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0 && lines[0].toLowerCase() === cleanNum.toLowerCase()) {
    lines.shift();
  }
  const sub = lines.join(' - ');
  if (!sub) return cleanNum;
  return `${cleanNum} - ${toCleanTitleCase(sub)}`;
}

/**
 * Formata um capítulo/título para exibição em cards de Trilha (Lições, Mapas, Flashcards, etc).
 * Retorna { tag, title } (ex: tag: 'TÍTULO I', title: 'Do Tribunal Superior').
 */
export function formatCapituloDisplay(rawCap?: string, rawTitulo?: string): FormattedCapitulo {
  const cap = (rawCap || '').trim();
  const tit = (rawTitulo || '').trim();

  const isInvalid = (s: string) => !s || /__(sem_capitulo|no_titulo|sem_titulo)__/i.test(s);

  // Se o capítulo for inválido mas o título for válido
  if (isInvalid(cap)) {
    if (!isInvalid(tit)) {
      return formatCapituloDisplay(tit);
    }
    return { tag: 'CAPÍTULO', title: 'Disposições Gerais' };
  }

  // Se contém delimitador " - " (ex: "TÍTULO I - Do Tribunal Superior" ou "CAPÍTULO I - Da Segunda Via")
  const parts = cap.split(' - ');
  if (parts.length >= 2) {
    const head = parts[0].trim();
    const sub = parts.slice(1).join(' - ').trim();
    return {
      tag: head.toUpperCase(),
      title: toCleanTitleCase(sub),
    };
  }

  // Se for "Disposições Gerais" ou similar sem hífen, mas tem título pai com número
  if (!isInvalid(tit) && tit !== cap) {
    const tParts = tit.split(' - ');
    if (tParts.length >= 2) {
      return {
        tag: tParts[0].trim().toUpperCase(),
        title: cap,
      };
    }
  }

  return {
    tag: 'CAPÍTULO',
    title: cap,
  };
}
