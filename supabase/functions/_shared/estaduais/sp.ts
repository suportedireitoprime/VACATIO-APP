// Adapter para o portal legislacao.sp.gov.br
// Endpoint real de descoberta: /norma/busca?idsTipoNorma=X&ano=YYYY&page=0&size=100&tipoPesquisa=E

export const SP_BASE = 'https://www.al.sp.gov.br';

// Mapa: id do portal (tipoNorma) → tipo interno usado no catálogo
export const SP_TIPOS: Array<{ id: number; tipo: string; label: string }> = [
  { id: 9, tipo: 'lei', label: 'Lei' },
  { id: 2, tipo: 'lei_complementar', label: 'Lei Complementar' },
  { id: 55, tipo: 'emenda_constitucional', label: 'Emenda Constitucional' },
  { id: 3, tipo: 'decreto', label: 'Decreto' },
  { id: 28, tipo: 'decreto_legislativo', label: 'Decreto Legislativo' },
  { id: 25, tipo: 'decreto_lei', label: 'Decreto-Lei' },
  { id: 1, tipo: 'decreto_lei_complementar', label: 'Decreto-Lei Complementar' },
];

export interface SPItemBusca {
  numero: string;
  ano: number;
  ementa: string;
  urlTexto: string;      // /repositorio/legislacao/.../*.html
  urlFicha: string;      // /norma/{id}
  publicacaoId?: string; // /norma/publicacao/{id}
  titulo: string;
}

/**
 * Faz o parse da página HTML de resultados de /norma/busca.
 * Retorna array de itens estruturados.
 */
export function parseBuscaSP(html: string, ano: number): SPItemBusca[] {
  const trs = html.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  const itens: SPItemBusca[] = [];

  for (const tr of trs) {
    // Link do texto integral (âncora com href .html)
    const linkTextoMatch = tr.match(
      /href="(https:\/\/www\.al\.sp\.gov\.br\/repositorio\/legislacao\/[^"]+\.html?)"/i,
    );
    // Ficha (link_norma)
    const fichaMatch = tr.match(/class="link_norma"\s+href="(\/norma\/\d+)"[^>]*>\s*<span>([^<]+)<\/span>/i);
    // Publicação (DO)
    const pubMatch = tr.match(/href="\/norma\/publicacao\/(\d+)"/);
    // Ementa: segundo <td> (o primeiro contém o link)
    const emmMatch = tr.match(/<td[^>]*>\s*<span>([\s\S]*?)<\/span>\s*<\/td>\s*<\/tr>/i);

    if (!linkTextoMatch || !fichaMatch) continue;

    const urlTexto = linkTextoMatch[1];
    const urlFicha = fichaMatch[1];
    const titulo = decodeHtml(fichaMatch[2]).trim();

    // Extrai número e ano do título "Lei Complementar nº 1.419, de 27/12/2024"
    const nMatch = titulo.match(/n[º°o.]?\s*([\d\.]+)/i);
    const numero = nMatch ? nMatch[1].replace(/\./g, '') : '';

    const ementaHtmlLimpo = emmMatch
      ? emmMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      : '';

    itens.push({
      numero,
      ano,
      ementa: decodeHtml(ementaHtmlLimpo),
      urlTexto,
      urlFicha,
      publicacaoId: pubMatch?.[1],
      titulo,
    });
  }
  return itens;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&aacute;/g, 'á').replace(/&Aacute;/g, 'Á')
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&iacute;/g, 'í').replace(/&Iacute;/g, 'Í')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/g, 'ú').replace(/&Uacute;/g, 'Ú')
    .replace(/&atilde;/g, 'ã').replace(/&Atilde;/g, 'Ã')
    .replace(/&otilde;/g, 'õ').replace(/&Otilde;/g, 'Õ')
    .replace(/&ccedil;/g, 'ç').replace(/&Ccedil;/g, 'Ç')
    .replace(/&acirc;/g, 'â').replace(/&Acirc;/g, 'Â')
    .replace(/&ecirc;/g, 'ê').replace(/&Ecirc;/g, 'Ê')
    .replace(/&ordm;/g, 'º').replace(/&ordf;/g, 'ª')
    .replace(/&deg;/g, '°')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10)));
}

/**
 * Faz fetch de uma página de busca com retry.
 * Latin-1 (ISO-8859-1) é o encoding do portal.
 */
export async function fetchBuscaSP(tipoId: number, ano: number, page = 0, size = 100): Promise<string> {
  const url = `${SP_BASE}/norma/busca?idsTipoNorma=${tipoId}&ano=${ano}&page=${page}&size=${size}&tipoPesquisa=E`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Vacatio' } });
  if (!res.ok) throw new Error(`SP busca ${res.status}: ${url}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder('iso-8859-1').decode(buf);
}

/**
 * Retorna a lista de anos disponíveis no formulário do portal (do ano corrente até 1891).
 */
export function anosDisponiveisSP(): number[] {
  const anoAtual = new Date().getFullYear();
  const anos: number[] = [];
  for (let y = anoAtual; y >= 1891; y--) anos.push(y);
  return anos;
}

// Legado (usado por estadual-popular-lei)
export const SP_URL_PATTERNS: RegExp[] = [
  /\/repositorio\/legislacao\/[^/]+\/\d{4}\//,
  /\/repositorio\/legislacao\/constituic/,
];

export function classificarTipoSP(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes('/constituic')) return 'constituicao_estadual';
  if (u.includes('lei.complementar') || u.includes('lei-complementar')) return 'lei_complementar';
  if (u.includes('decreto.lei.complementar') || u.includes('decreto-lei-complementar')) return 'decreto_lei_complementar';
  if (u.includes('decreto.lei') || u.includes('decreto-lei')) return 'decreto_lei';
  if (u.includes('/emenda') || u.includes('emenda.constitucional')) return 'emenda_constitucional';
  if (u.includes('/decreto.legislativo') || u.includes('/decreto-legislativo')) return 'decreto_legislativo';
  if (u.includes('/decreto/')) return 'decreto';
  if (u.includes('/lei/')) return 'lei';
  return null;
}

export function extrairNumeroAnoSP(url: string, markdown?: string): { numero?: string; ano?: number } {
  const m1 = url.match(/(?:lei|decreto|emenda|constituicao)[.\-\w]*[.\-](\d+(?:\.\d+)?)[.\-]([\d\.]+\.)?(\d{4})/i);
  if (m1) return { numero: m1[1].replace(/\./g, ''), ano: parseInt(m1[3]) };

  if (markdown) {
    const m2 = markdown.match(/(?:LEI|DECRETO|EMENDA)(?:\s+COMPLEMENTAR|\s+CONSTITUCIONAL|\s+LEGISLATIVO)?\s+N[º°o.]?\s*([\d\.]+),\s*DE[^\d]+(\d{4})/i);
    if (m2) return { numero: m2[1].replace(/\./g, ''), ano: parseInt(m2[2]) };
  }
  return {};
}

export function extrairEmentaSP(markdown: string): string | null {
  const m = markdown.match(/\n([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][^\n]{20,400}\.)\n\s*O GOVERNADOR/);
  if (m) return m[1].trim();
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);
  const idx = lines.findIndex(l => /LEI|DECRETO|EMENDA/i.test(l));
  if (idx >= 0 && idx + 1 < lines.length) {
    const cand = lines[idx + 1];
    if (cand.length > 30 && cand.length < 500) return cand;
  }
  return null;
}
