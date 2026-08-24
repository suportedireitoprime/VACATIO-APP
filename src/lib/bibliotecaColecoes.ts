import { pickAsset } from '@/lib/assetUrl';
import capaAreasAsset from '@/assets/biblioteca/capa-areas.webp.asset.json';
import capaAreasBundled from '@/assets/biblioteca/capa-areas.webp';
import capaClassicosAsset from '@/assets/biblioteca/capa-classicos.webp.asset.json';
import capaClassicosBundled from '@/assets/biblioteca/capa-classicos.webp';
import capaOabAsset from '@/assets/biblioteca/capa-oab.webp.asset.json';
import capaOabBundled from '@/assets/biblioteca/capa-oab.webp';
import capaForaAsset from '@/assets/biblioteca/capa-fora-da-toga.webp.asset.json';
import capaForaBundled from '@/assets/biblioteca/capa-fora-da-toga.webp';
import capaPortuguesAsset from '@/assets/biblioteca/capa-portugues.webp.asset.json';
import capaPortuguesBundled from '@/assets/biblioteca/capa-portugues.webp';
import capaPesquisaAsset from '@/assets/biblioteca/capa-pesquisa.webp.asset.json';
import capaPesquisaBundled from '@/assets/biblioteca/capa-pesquisa.webp';
import capaLiderancaAsset from '@/assets/biblioteca/capa-lideranca.webp.asset.json';
import capaLiderancaBundled from '@/assets/biblioteca/capa-lideranca.webp';
import capaOratoriaAsset from '@/assets/biblioteca/capa-oratoria.jpg.asset.json';
import capaOratoriaBundled from '@/assets/biblioteca/capa-oratoria.jpg';

const capaAreas = pickAsset(capaAreasBundled, capaAreasAsset.url);
const capaClassicos = pickAsset(capaClassicosBundled, capaClassicosAsset.url);
const capaOab = pickAsset(capaOabBundled, capaOabAsset.url);
const capaFora = pickAsset(capaForaBundled, capaForaAsset.url);
const capaPortugues = pickAsset(capaPortuguesBundled, capaPortuguesAsset.url);
const capaPesquisa = pickAsset(capaPesquisaBundled, capaPesquisaAsset.url);
const capaLideranca = pickAsset(capaLiderancaBundled, capaLiderancaAsset.url);
const capaOratoria = pickAsset(capaOratoriaBundled, capaOratoriaAsset.url);

export type ColecaoModo = 'livros' | 'categorias';

export interface ColecaoConfig {
  id: string;
  label: string;
  eyebrow: string;
  subtitle: string;
  cover: string;
  gradient: string; // tailwind classes
  modo: ColecaoModo;
  /** Supabase table name */
  table: string;
  /** SELECT list */
  select: string;
  /** Field mappings from row to normalized book shape */
  tituloField: string;
  autorField?: string;
  capaField: string;
  sobreField: string;
  linkField: string;
  downloadField: string;
  areaField?: string;
  orderBy?: string;
  /** Se true, só aparece para administradores nas telas públicas. */
  adminOnly?: boolean;
}

export const COLECOES: ColecaoConfig[] = [
  {
    id: 'areas',
    label: 'Áreas do Direito',
    eyebrow: 'ACERVO',
    subtitle: 'Livros organizados pelas grandes áreas do Direito.',
    cover: capaAreas,
    gradient: 'from-slate-900 via-slate-800 to-zinc-950',
    modo: 'categorias',
    table: 'biblioteca_estudos',
    select: 'id, tema, area, capa_livro, sobre, link, download, ordem, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada',
    tituloField: 'tema',
    capaField: 'capa_livro',
    sobreField: 'sobre',
    linkField: 'link',
    downloadField: 'download',
    areaField: 'area',
    orderBy: 'ordem',
  },
  {
    id: 'classicos',
    label: 'Clássicos do Direito',
    eyebrow: 'COLEÇÃO',
    subtitle: 'Obras fundamentais do pensamento jurídico.',
    cover: capaClassicos,
    gradient: 'from-stone-900 via-stone-800 to-neutral-950',
    modo: 'livros',
    table: 'biblioteca_classicos',
    select: 'id, livro, autor, imagem, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada',
    tituloField: 'livro',
    autorField: 'autor',
    capaField: 'imagem',
    sobreField: 'sobre',
    linkField: 'link',
    downloadField: 'download',
    orderBy: 'id',
  },
  {
    id: 'oab',
    label: 'OAB',
    eyebrow: 'PREPARATÓRIO',
    subtitle: 'Obras de referência para o Exame de Ordem.',
    cover: capaOab,
    gradient: 'from-red-900 via-rose-800 to-red-950',
    modo: 'categorias',
    table: 'biblioteca_oab',
    select: 'id, area, ordem, tema, capa_livro, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada',
    tituloField: 'tema',
    capaField: 'capa_livro',
    sobreField: 'sobre',
    linkField: 'link',
    downloadField: 'download',
    areaField: 'area',
    orderBy: 'ordem',
  },
  {
    id: 'fora-da-toga',
    label: 'Fora da Toga',
    eyebrow: 'COLEÇÃO',
    subtitle: 'Leituras além do Direito para expandir sua bagagem.',
    cover: capaFora,
    gradient: 'from-emerald-900 via-emerald-800 to-teal-950',
    modo: 'livros',
    table: 'biblioteca_fora_da_toga',
    select: 'id, area, livro, autor, capa_livro, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada',
    tituloField: 'livro',
    autorField: 'autor',
    capaField: 'capa_livro',
    sobreField: 'sobre',
    linkField: 'link',
    downloadField: 'download',
    orderBy: 'id',
    adminOnly: true,
  },
  {
    id: 'oratoria',
    label: 'Oratória',
    eyebrow: 'COLEÇÃO',
    subtitle: 'Retórica, persuasão e comunicação para falar com autoridade.',
    cover: capaOratoria,
    gradient: 'from-amber-900 via-yellow-800 to-orange-950',
    modo: 'livros',
    table: 'biblioteca_oratoria',
    select: 'id, area, livro, autor, capa_livro, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada',
    tituloField: 'livro',
    autorField: 'autor',
    capaField: 'capa_livro',
    sobreField: 'sobre',
    linkField: 'link',
    downloadField: 'download',
    orderBy: 'id',
  },
  {
    id: 'lideranca',
    label: 'Liderança',
    eyebrow: 'COLEÇÃO',
    subtitle: 'Obras sobre liderança, gestão e alta performance.',
    cover: capaLideranca,
    gradient: 'from-orange-900 via-red-900 to-rose-950',
    modo: 'livros',
    table: 'biblioteca_lideranca',
    select: 'id, livro, autor, area, imagem, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada',
    tituloField: 'livro',
    autorField: 'autor',
    capaField: 'imagem',
    sobreField: 'sobre',
    linkField: 'link',
    downloadField: 'download',
    orderBy: 'id',
  },
  {
    id: 'portugues',
    label: 'Português',
    eyebrow: 'LINGUAGEM',
    subtitle: 'Gramática, redação e interpretação para concursos.',
    cover: capaPortugues,
    gradient: 'from-sky-900 via-blue-800 to-indigo-950',
    modo: 'livros',
    table: 'biblioteca_portugues',
    select: 'id, area, livro, autor, imagem, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada',
    tituloField: 'livro',
    autorField: 'autor',
    capaField: 'imagem',
    sobreField: 'sobre',
    linkField: 'link',
    downloadField: 'download',
    orderBy: 'id',
  },
  {
    id: 'pesquisa',
    label: 'Pesquisa Científica',
    eyebrow: 'MÉTODO',
    subtitle: 'Metodologia, ABNT e produção acadêmica.',
    cover: capaPesquisa,
    gradient: 'from-violet-900 via-purple-800 to-fuchsia-950',
    modo: 'livros',
    table: 'biblioteca_pesquisa_cientifica',
    select: 'id, area, livro, autor, imagem, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada',
    tituloField: 'livro',
    autorField: 'autor',
    capaField: 'imagem',
    sobreField: 'sobre',
    linkField: 'link',
    downloadField: 'download',
    orderBy: 'id',
  },
];

export const findColecao = (id: string) => COLECOES.find((c) => c.id === id);

/** Retorna coleções visíveis. Admin vê todas; usuário comum não vê as `adminOnly`. */
export const getColecoesVisiveis = (isAdmin: boolean): ColecaoConfig[] =>
  isAdmin ? COLECOES : COLECOES.filter((c) => !c.adminOnly);

export interface LivroNormalizado {
  id: string | number;
  titulo: string;
  autor?: string | null;
  sobre?: string | null;
  capa?: string | null;
  link?: string | null;
  download?: string | null;
  area?: string | null;
  colecaoId: string;
  // Novos campos de enriquecimento
  capaHorizontal?: string | null;
  anoLancamento?: string | null;
  editora?: string | null;
  curiosidades?: string[] | null;
  analiseDetalhada?: string | null;
}

export function normalizeLivro(row: any, colecao: ColecaoConfig): LivroNormalizado {
  const cur = row.curiosidades;
  let curiosidades: string[] | null = null;
  if (Array.isArray(cur)) curiosidades = cur.filter((x) => typeof x === 'string');
  else if (typeof cur === 'string' && cur.trim()) {
    try {
      const parsed = JSON.parse(cur);
      if (Array.isArray(parsed)) curiosidades = parsed.filter((x) => typeof x === 'string');
    } catch { /* ignore */ }
  }
  return {
    id: row.id,
    titulo: row[colecao.tituloField] ?? '',
    autor: colecao.autorField ? row[colecao.autorField] ?? null : null,
    sobre: row[colecao.sobreField] ?? null,
    capa: row[colecao.capaField] ?? null,
    link: row[colecao.linkField] ?? null,
    download: row[colecao.downloadField] ?? null,
    area: colecao.areaField ? row[colecao.areaField] ?? null : null,
    colecaoId: colecao.id,
    capaHorizontal: row.capa_horizontal ?? null,
    anoLancamento: row.ano_lancamento ?? null,
    editora: row.editora ?? null,
    curiosidades,
    analiseDetalhada: row.analise_detalhada ?? null,
  };
}
