/**
 * Helpers para URLs amigáveis de legislação.
 *
 * Padrão de rota: /legislacao/<tipoSlug>/<leiSlug>
 * Ex.: /legislacao/codigos/codigo-penal
 *      /legislacao/estatutos/eca
 *      /legislacao/constituicao/cf88
 */

import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';

/** Mapa tipo (interno) -> slug amigável na URL (plural, quando faz sentido). */
export const TIPO_TO_SLUG: Record<string, string> = {
  constituicao: 'constituicao',
  codigo: 'codigos',
  estatuto: 'estatutos',
  'lei-ordinaria': 'leis-ordinarias',
  decreto: 'decretos',
  sumula: 'sumulas',
  'lei-especial': 'leis-especiais',
  previdenciario: 'previdenciario',
};

/** Inverso: aceita tanto plural quanto singular (compat) e devolve tipo interno. */
export const SLUG_TO_TIPO: Record<string, string> = Object.fromEntries(
  Object.entries(TIPO_TO_SLUG).flatMap(([tipo, slug]) => [
    [slug, tipo],
    [tipo, tipo], // aceita também o valor "singular" antigo
  ])
);

export function tipoToSlug(tipo: string): string {
  return TIPO_TO_SLUG[tipo] ?? tipo;
}

export function slugToTipo(slug: string): string {
  return SLUG_TO_TIPO[slug] ?? slug;
}

/** Categorias com catálogo fixo e finito — a "lista intermediária" some. */
export const CATEGORIAS_FIXAS = new Set([
  'constituicao',
  'codigo',
  'estatuto',
  'lei-especial',
  'previdenciario',
]);

/** Normaliza um texto para slug URL-safe. */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Slug preferencial de uma lei do catálogo (baseado no nome; cai no id se preciso). */
export function leiToSlug(lei: Pick<LeiCatalogItem, 'id' | 'nome'>): string {
  const base = lei.nome ? toSlug(lei.nome) : '';
  return base || lei.id;
}

/** Encontra uma lei do catálogo a partir do tipo interno + slug da URL. */
export function findLeiBySlug(
  tipo: string,
  slug: string
): LeiCatalogItem | undefined {
  const candidates = LEIS_CATALOG.filter((l) => l.tipo === tipo);
  const s = slug.toLowerCase();
  return (
    candidates.find((l) => leiToSlug(l) === s) ||
    candidates.find((l) => l.id.toLowerCase() === s) ||
    candidates.find((l) => toSlug(l.sigla) === s)
  );
}

/** Constrói o caminho canônico de uma lei. */
export function leiPath(lei: Pick<LeiCatalogItem, 'id' | 'nome' | 'tipo'>): string {
  // A Constituição é única no seu tipo — evita rota duplicada
  // /legislacao/constituicao/constituicao-federal.
  if (lei.tipo === 'constituicao') {
    return `/legislacao/${tipoToSlug(lei.tipo)}`;
  }
  return `/legislacao/${tipoToSlug(lei.tipo)}/${leiToSlug(lei)}`;
}
