// Classificação leve de leis por área do Direito para o módulo Praticar.
// Mapeamento heurístico por slug/nome — fallback "outras".

import { getAreaCover } from '@/lib/areasDireitoCovers';

export type PraticarArea = {
  slug: string;
  nome: string;
  cover?: string;
  tint: string; // rgba/hex utilizado como cor de fundo do card
  match: (lei: { nome: string; slug: string | null }) => boolean;
};

const has = (haystack: string, needles: string[]) =>
  needles.some((n) => haystack.includes(n));

export const PRATICAR_AREAS: PraticarArea[] = [
  {
    slug: 'constitucional',
    nome: 'Direito Constitucional',
    tint: 'rgba(30, 64, 175, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      return s === 'cf' || has(n, ['constituição', 'constituicao']) ||
        has(n, ['direitos humanos', 'igualdade racial']);
    },
  },
  {
    slug: 'penal',
    nome: 'Direito Penal',
    tint: 'rgba(153, 27, 27, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      if (['cp', 'cpm'].includes(s)) return true;
      if (has(s, ['lei-crimes', 'estatuto-desarmamento'])) return true;
      return has(n, ['penal', 'crimes', 'drogas', 'lavagem', 'organiza']) &&
        !has(n, ['processo', 'processual']);
    },
  },
  {
    slug: 'processo-penal',
    nome: 'Direito Processual Penal',
    tint: 'rgba(120, 53, 15, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      return s === 'cpp' || s === 'cppm' || has(n, ['processo penal', 'processual penal', 'escuta protegida']);
    },
  },
  {
    slug: 'civil',
    nome: 'Direito Civil',
    tint: 'rgba(21, 128, 61, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      if (s === 'cc') return true;
      return (has(n, ['civil']) && !has(n, ['processo', 'processual'])) ||
        has(n, ['registros públicos', 'locação', 'condomínio']);
    },
  },
  {
    slug: 'processo-civil',
    nome: 'Direito Processual Civil',
    tint: 'rgba(4, 120, 87, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      return s === 'cpc' || has(n, ['processo civil', 'processual civil', 'arbitragem', 'mediação']);
    },
  },
  {
    slug: 'trabalho',
    nome: 'Direito do Trabalho',
    tint: 'rgba(180, 83, 9, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      return s === 'clt' || s === 'lc-domestico' ||
        has(n, ['trabalho', 'doméstico', 'estágio', 'sindical']);
    },
  },
  {
    slug: 'tributario',
    nome: 'Direito Tributário',
    tint: 'rgba(88, 28, 135, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      return s === 'ctn' || has(n, ['tributár', 'fiscal', 'icms', 'imposto']);
    },
  },
  {
    slug: 'administrativo',
    nome: 'Direito Administrativo',
    tint: 'rgba(202, 138, 4, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      if (['lei-servidor', 'decreto-etica'].includes(s)) return true;
      return has(n, ['servidor', 'licitações', 'licitacao', 'improbidade', 'processo administrativo', 'administração pública']);
    },
  },
  {
    slug: 'consumidor',
    nome: 'Direito do Consumidor',
    tint: 'rgba(190, 24, 93, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      return s === 'cdc' || s === 'decreto-ecommerce' || has(n, ['consumidor', 'e-commerce']);
    },
  },
  {
    slug: 'empresarial',
    nome: 'Direito Empresarial',
    tint: 'rgba(15, 118, 110, 1)',
    match: ({ nome, slug }) => {
      const n = nome.toLowerCase();
      const s = (slug ?? '').toLowerCase();
      return s === 'ccom' || s === 'cpi' || has(n, ['comercial', 'empresarial', 'propriedade industrial', 'falência', 'sociedade']);
    },
  },
  {
    slug: 'ambiental',
    nome: 'Direito Ambiental',
    tint: 'rgba(22, 101, 52, 1)',
    match: ({ nome, slug }) => {
      const n = nome.toLowerCase();
      const s = (slug ?? '').toLowerCase();
      return ['cflorestal', 'ca', 'ccaca', 'cpesca', 'cdm'].includes(s) ||
        has(n, ['ambiental', 'águas', 'aguas', 'florestal', 'caça', 'pesca', 'mineração', 'minas']);
    },
  },
  {
    slug: 'estatutos',
    nome: 'Estatutos & Proteções',
    tint: 'rgba(126, 34, 206, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      return s.startsWith('estatuto-') || has(n, ['estatuto', 'idoso', 'criança', 'juventude', 'refugiado', 'migração']);
    },
  },
  {
    slug: 'eleitoral',
    nome: 'Direito Eleitoral',
    tint: 'rgba(37, 99, 235, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      return s === 'ce' || nome.toLowerCase().includes('eleitoral') || nome.toLowerCase().includes('partid');
    },
  },
  {
    slug: 'transito-transporte',
    nome: 'Trânsito & Transporte',
    tint: 'rgba(220, 38, 38, 1)',
    match: ({ nome, slug }) => {
      const s = (slug ?? '').toLowerCase();
      const n = nome.toLowerCase();
      return s === 'ctb' || s === 'cba' || s === 'cbt' ||
        has(n, ['trânsito', 'transito', 'aeronáutica', 'aeronautica', 'telecomunicações', 'telecomunicacoes']);
    },
  },
];

export type LeiSimples = { id: string; nome: string; slug: string | null };

const OUTRAS: PraticarArea = {
  slug: 'outras',
  nome: 'Outras normas',
  tint: 'rgba(71, 85, 105, 1)',
  match: () => true,
};

export function classificarLei(lei: LeiSimples): PraticarArea {
  for (const a of PRATICAR_AREAS) if (a.match(lei)) return a;
  return OUTRAS;
}

export function agruparPorArea(leis: LeiSimples[]) {
  const map = new Map<string, { area: PraticarArea; leis: LeiSimples[] }>();
  const areas = [...PRATICAR_AREAS, OUTRAS];
  for (const area of areas) map.set(area.slug, { area, leis: [] });
  for (const l of leis) {
    const a = classificarLei(l);
    map.get(a.slug)!.leis.push(l);
  }
  return [...map.values()].filter((g) => g.leis.length > 0);
}

export function getAreaPraticar(slug: string): PraticarArea | null {
  if (slug === 'outras') return OUTRAS;
  return PRATICAR_AREAS.find((a) => a.slug === slug) ?? null;
}

// Ícone/cover da área — reaproveita mapa da biblioteca por nome equivalente.
export function getPraticarAreaCover(area: PraticarArea): string | null {
  const nomeEquivalente: Record<string, string> = {
    constitucional: 'Direito Constitucional',
    penal: 'Direito Penal',
    'processo-penal': 'Direito Processual Penal',
    civil: 'Direito Civil',
    'processo-civil': 'Direito Processual Civil',
    trabalho: 'Direito do Trabalho',
    tributario: 'Direito Tributário',
    administrativo: 'Direito Administrativo',
    consumidor: 'Direito Empresarial',
    empresarial: 'Direito Empresarial',
    ambiental: 'Direito Ambiental',
    estatutos: 'Direitos Humanos',
    eleitoral: 'Direito Constitucional',
    'transito-transporte': 'Direito Administrativo',
    outras: 'Formação Complementar',
  };
  const nome = nomeEquivalente[area.slug];
  if (!nome) return null;
  return getAreaCover(nome)?.cover ?? null;
}
