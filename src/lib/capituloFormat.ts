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

  // Remove repetição de cleanNum no início do texto (ex: 'PARTE PRIMEIRA\nINTRODUÇÃO' ou 'PARTE PRIMEIRA INTRODUÇÃO')
  if (cleanNum) {
    const numRe = new RegExp(`^${cleanNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—:]?\\s*`, 'i');
    text = text.replace(numRe, '').trim();
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const sub = lines.join(' - ');
  if (!sub) return cleanNum;
  return `${cleanNum} - ${toCleanTitleCase(sub)}`;
}

/**
 * Extrai a tag estrutural em caixa alta (ex: 'TÍTULO I', 'CAPÍTULO II', 'LIVRO I', 'PARTE GERAL')
 */
export function extractStructuralTag(text?: string | null): string | null {
  if (!text) return null;
  const clean = text.replace(/<[^>]+>/g, '').trim();
  if (!clean || /__(sem_capitulo|no_titulo|sem_titulo)__/i.test(clean)) return null;

  // Se tiver hífen (" - "), o identificador estrutural está antes do hífen
  const parts = clean.split(' - ');
  const head = parts[0].trim();

  // Título único/genérico sintético não deve poluir a tag
  if (/^T[ÍI]TULO\s+[ÚU]NICO$/i.test(head)) return null;

  const match = head.match(/^(PARTE\s+(?:PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|S[EÉ]TIMA|OITAVA|NONA|D[EÉ]CIMA|GERAL|ESPECIAL|[A-Z0-9]+)|LIVRO\s+[A-Z0-9IVXLCDM]+|T[ÍI]TULO\s+[A-Z0-9IVXLCDM]+|SUBT[ÍI]TULO\s+[A-Z0-9IVXLCDM]+|CAP[ÍI]TULO\s+(?:[ÚU]NICO|[A-Z0-9IVXLCDM]+)|SE[ÇC][ÃA]O\s+[A-Z0-9IVXLCDM]+|SUBSE[ÇC][ÃA]O\s+[A-Z0-9IVXLCDM]+)/i);

  if (match) {
    return match[0].toUpperCase().trim();
  }

  return null;
}

/**
 * Formata um capítulo/título para exibição em cards de Trilha (Lições, Mapas, Flashcards, etc).
 * Quando há Título pai e Capítulo filho, inclui a hierarquia com setinha:
 * Ex: 'TÍTULO I → CAPÍTULO I' e título 'Disposições Gerais'.
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

  // Regex para remover prefixos estruturais repetidos no título/subtítulo
  const stripHeadingPrefix = (text: string, heading: string): string => {
    let s = text.trim();
    if (heading) {
      const hRe = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—:]?\\s*`, 'i');
      s = s.replace(hRe, '').trim();
    }
    const genericRe = /^(PARTE\s+(?:PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|S[EÉ]TIMA|OITAVA|NONA|D[EÉ]CIMA|GERAL|ESPECIAL|[A-Z0-9]+)|LIVRO\s+[A-Z0-9IVXLCDM]+|T[ÍI]TULO\s+[A-Z0-9IVXLCDM]+|CAP[ÍI]TULO\s+[A-Z0-9IVXLCDM]+|SE[ÇC][ÃA]O\s+[A-Z0-9IVXLCDM]+)\s*[-–—:]?\\s*/i;
    s = s.replace(genericRe, '').trim();
    return s;
  };

  const capTag = extractStructuralTag(cap);
  const titTag = extractStructuralTag(tit);

  // Extrai o texto do título descritivo do capítulo
  let rawSub = cap;
  if (cap.includes(' - ')) {
    const parts = cap.split(' - ');
    rawSub = parts.slice(1).join(' - ').trim();
  }
  let cleanSub = stripHeadingPrefix(rawSub, capTag || titTag || '');
  if (!cleanSub && tit && tit.includes(' - ')) {
    cleanSub = stripHeadingPrefix(tit.split(' - ').slice(1).join(' - ').trim(), titTag || '');
  }
  if (!cleanSub) cleanSub = rawSub || cap || 'Disposições Gerais';

  // Constrói a tag respeitando a hierarquia Título → Capítulo
  let tag = 'CAPÍTULO';
  if (titTag && capTag && titTag !== capTag) {
    tag = `${titTag} → ${capTag}`;
  } else if (capTag) {
    tag = capTag;
  } else if (titTag) {
    tag = titTag;
  }

  return {
    tag,
    title: toCleanTitleCase(cleanSub),
  };
}
