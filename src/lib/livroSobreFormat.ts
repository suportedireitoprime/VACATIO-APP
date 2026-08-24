/**
 * Formata o texto "sobre" do livro para leitura confortável:
 * - Se já tiver quebras de parágrafo (\n\n), respeita.
 * - Caso contrário, agrupa em parágrafos de ~3 frases.
 * - Aplica **negrito** em termos-chave (título e autor do livro), quando aparecem.
 * Retorna markdown pronto para <ReactMarkdown remarkPlugins={[remarkGfm]}/>.
 */
export function formatarSobreLivro(
  sobre: string | null | undefined,
  opts: { titulo?: string; autor?: string } = {}
): string {
  if (!sobre) return '';
  const raw = sobre.trim();

  // 1. Se já vem com quebras de parágrafo, respeita.
  let paragrafos: string[];
  if (/\n\s*\n/.test(raw)) {
    paragrafos = raw.split(/\n\s*\n+/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  } else {
    // 2. Quebra em frases, agrupa ~3 por parágrafo.
    const frases = raw
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“])/)
      .map(s => s.trim())
      .filter(Boolean);

    const grupos: string[] = [];
    const porParagrafo = 3;
    for (let i = 0; i < frases.length; i += porParagrafo) {
      grupos.push(frases.slice(i, i + porParagrafo).join(' '));
    }
    paragrafos = grupos.length ? grupos : [raw];
  }

  // 3. Aplica negrito em termos-chave (título, autor).
  const termos: string[] = [];
  if (opts.titulo) termos.push(opts.titulo);
  if (opts.autor) termos.push(opts.autor);

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const aplicaNegrito = (texto: string) => {
    let resultado = texto;
    for (const termo of termos) {
      if (!termo || termo.length < 3) continue;
      // Não substituir se já estiver em negrito
      const re = new RegExp(`(?<!\\*)\\b(${escapeRegex(termo)})\\b(?!\\*)`, 'gi');
      // Substitui apenas a primeira ocorrência para não poluir
      let feito = false;
      resultado = resultado.replace(re, (m) => {
        if (feito) return m;
        feito = true;
        return `**${m}**`;
      });
    }
    return resultado;
  };

  return paragrafos.map(aplicaNegrito).join('\n\n');
}

/**
 * Estima tempo médio de leitura para um livro em PDF.
 * Usa ~2 minutos por página como média para textos jurídicos/acadêmicos.
 */
export function estimarMinutosLeitura(numPages: number | null | undefined): number | null {
  if (!numPages || numPages < 1) return null;
  return Math.round(numPages * 2);
}

/** Formata minutos em "Xh YYmin" ou "Ymin". */
export function formatarDuracao(minutos: number | null | undefined): string {
  if (!minutos || minutos < 1) return '—';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
