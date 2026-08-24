/**
 * Catálogo de categorias disponíveis para download offline.
 * Cada categoria agrupa tabelas do LEIS_CATALOG por tema.
 */

import { LEIS_CATALOG } from '@/data/leisCatalog';

export interface OfflineCategoryDef {
  id: string;
  label: string;
  description: string;
  /** Bytes estimados (para exibir tamanho antes do download) */
  estimatedBytes: number;
  /** Ícone lucide (nome) */
  icon: string;
  /** Cor do gradiente do card */
  gradient: string;
  /**
   * Função que retorna as tabelas (nomes) a baixar.
   * Se `null`, é uma categoria especial (ex: anotações locais).
   */
  getTabelas: () => string[] | null;
  /** Marca categoria "sempre offline" (não precisa baixar) */
  alwaysOffline?: boolean;
  /** Marca categoria que ainda não é implementável (ex: app-shell) */
  disabled?: boolean;
  disabledReason?: string;
}

const bySlug = (ids: string[]) =>
  LEIS_CATALOG
    .filter((l) => ids.includes(l.id))
    .map((l) => l.tabela_nome);

const byTipo = (tipos: string[]) =>
  LEIS_CATALOG
    .filter((l) => tipos.includes(l.tipo))
    .map((l) => l.tabela_nome);

// Aproximado: ~180 KB de JSON por lei de porte médio.
// Códigos grandes (CC, CPC) pesam mais.
const MB = 1024 * 1024;

export const OFFLINE_CATEGORIES: OfflineCategoryDef[] = [
  {
    id: 'constituicao',
    label: 'Constituição Federal',
    description: 'CF/88 + ADCT completo',
    estimatedBytes: 1.5 * MB,
    icon: 'Landmark',
    gradient: 'from-emerald-500 to-green-600',
    getTabelas: () => bySlug(['cf88']),
  },
  {
    id: 'codigos-principais',
    label: 'Códigos Principais',
    description: 'CC, CP, CPC, CPP, CDC, CLT, CTN, CTB',
    estimatedBytes: 12 * MB,
    icon: 'BookMarked',
    gradient: 'from-blue-500 to-indigo-600',
    getTabelas: () => bySlug(['cc', 'cp', 'cpc', 'cpp', 'cdc', 'clt', 'ctn', 'ctb']),
  },
  {
    id: 'codigos-especiais',
    label: 'Códigos Especiais',
    description: 'CE, CPM, CPPM, Florestal, Comercial, Aeronáutica e outros',
    estimatedBytes: 6 * MB,
    icon: 'Library',
    gradient: 'from-cyan-500 to-teal-600',
    getTabelas: () => bySlug(['ce', 'cpm', 'cppm', 'cflor', 'ccom', 'cba', 'cagua', 'cmin', 'ctel']),
  },
  {
    id: 'estatutos',
    label: 'Estatutos',
    description: 'ECA, Idoso, PCD, OAB, Desarmamento e mais',
    estimatedBytes: 5 * MB,
    icon: 'FileHeart',
    gradient: 'from-rose-500 to-pink-600',
    getTabelas: () => byTipo(['estatuto']),
  },
  {
    id: 'leis-especiais',
    label: 'Leis Especiais',
    description: 'Maria da Penha, Drogas, LGPD, Improbidade, Licitações, etc',
    estimatedBytes: 4 * MB,
    icon: 'Scale',
    gradient: 'from-amber-500 to-orange-600',
    getTabelas: () => byTipo(['lei-especial']),
  },
  {
    id: 'previdenciario',
    label: 'Previdenciário',
    description: 'Legislação previdenciária',
    estimatedBytes: 2 * MB,
    icon: 'ShieldCheck',
    gradient: 'from-violet-500 to-purple-600',
    getTabelas: () => byTipo(['previdenciario']),
  },
  {
    id: 'sumulas',
    label: 'Súmulas',
    description: 'STF e STJ — vinculantes e comuns',
    estimatedBytes: 2 * MB,
    icon: 'Gavel',
    gradient: 'from-yellow-500 to-amber-600',
    getTabelas: () => byTipo(['sumula']),
  },
  {
    id: 'anotacoes',
    label: 'Anotações & Grifos',
    description: 'Suas anotações já ficam salvas localmente',
    estimatedBytes: 0,
    icon: 'PenLine',
    gradient: 'from-slate-500 to-slate-700',
    getTabelas: () => null,
    alwaysOffline: true,
  },
];

export function getCategoryById(id: string): OfflineCategoryDef | undefined {
  return OFFLINE_CATEGORIES.find((c) => c.id === id);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${(bytes / (1024 * MB)).toFixed(2)} GB`;
}
