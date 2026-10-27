export type BlogTema =
  | '01 - Leis - o que são e como funcionam'
  | '02 - Processo legislativo'
  | '03 - Senado Federal'
  | '04 - Câmara dos Deputados'
  | '05 - STF'
  | '06 - Judiciário além do STF'
  | '07 - Presidência e Poder Executivo'
  | '08 - Direitos do cidadão na prática'
  | '09 - História das leis'
  | '10 - Bastidores do poder'
  | string;

export interface BlogCategoryMeta {
  id: string;
  numero: string;
  titulo: string;
  subtitulo: string;
  iconName: string;
  colorGradient: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
}

export const BLOG_CATEGORIAS: BlogCategoryMeta[] = [
  {
    id: '09 - História das leis',
    numero: '01',
    titulo: 'História das Leis',
    subtitulo: 'De Hamurabi e Roma até a Constituição de 1988',
    iconName: 'Hourglass',
    colorGradient: 'from-orange-500 to-red-600',
    accentColor: '#f97316',
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    badgeText: '#fb923c',
  },
  {
    id: '01 - Leis - o que são e como funcionam',
    numero: '02',
    titulo: 'Leis & Fundamentos',
    subtitulo: 'O que são, hierarquia e como funcionam',
    iconName: 'Scale',
    colorGradient: 'from-amber-500 to-orange-600',
    accentColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeText: '#fbbf24',
  },
  {
    id: '02 - Processo legislativo',
    numero: '03',
    titulo: 'Processo Legislativo',
    subtitulo: 'Como nasce uma lei e o rito em Brasília',
    iconName: 'ScrollText',
    colorGradient: 'from-blue-500 to-indigo-600',
    accentColor: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeText: '#60a5fa',
  },
  {
    id: '03 - Senado Federal',
    numero: '04',
    titulo: 'Senado Federal',
    subtitulo: 'A câmara alta, 81 senadores e sabatinas',
    iconName: 'Landmark',
    colorGradient: 'from-emerald-500 to-teal-600',
    accentColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeText: '#34d399',
  },
  {
    id: '04 - Câmara dos Deputados',
    numero: '05',
    titulo: 'Câmara dos Deputados',
    subtitulo: 'Representação do povo, 513 deputados e plenário',
    iconName: 'Users',
    colorGradient: 'from-sky-500 to-cyan-600',
    accentColor: '#0ea5e9',
    badgeBg: 'rgba(14, 165, 233, 0.15)',
    badgeText: '#38bdf8',
  },
  {
    id: '05 - STF',
    numero: '06',
    titulo: 'STF · Supremo Tribunal',
    subtitulo: 'Guardião da Constituição e decisões históricas',
    iconName: 'Gavel',
    colorGradient: 'from-purple-500 to-violet-600',
    accentColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    badgeText: '#c084fc',
  },
  {
    id: '06 - Judiciário além do STF',
    numero: '07',
    titulo: 'Poder Judiciário',
    subtitulo: 'STJ, TST, juizados e a justiça cotidiana',
    iconName: 'Shield',
    colorGradient: 'from-rose-500 to-pink-600',
    accentColor: '#f43f5e',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    badgeText: '#fb7185',
  },
  {
    id: '07 - Presidência e Poder Executivo',
    numero: '08',
    titulo: 'Presidência & Executivo',
    subtitulo: 'O Palácio do Planalto, ministérios e decretos',
    iconName: 'Crown',
    colorGradient: 'from-yellow-500 to-amber-600',
    accentColor: '#eab308',
    badgeBg: 'rgba(234, 179, 8, 0.15)',
    badgeText: '#fde047',
  },
  {
    id: '08 - Direitos do cidadão na prática',
    numero: '09',
    titulo: 'Direitos do Cidadão',
    subtitulo: 'Seus direitos em consumo, trabalho e saúde',
    iconName: 'HeartHandshake',
    colorGradient: 'from-teal-500 to-emerald-600',
    accentColor: '#14b8a6',
    badgeBg: 'rgba(20, 184, 166, 0.15)',
    badgeText: '#2dd4bf',
  },
  {
    id: '10 - Bastidores do poder',
    numero: '10',
    titulo: 'Bastidores do Poder',
    subtitulo: 'Articulações, gabinetes e o dia a dia em Brasília',
    iconName: 'Eye',
    colorGradient: 'from-fuchsia-500 to-purple-600',
    accentColor: '#d946ef',
    badgeBg: 'rgba(217, 70, 239, 0.15)',
    badgeText: '#e879f9',
  },
];

export const TEMAS: BlogTema[] = BLOG_CATEGORIAS.map((c) => c.id);

export const TEMA_COLORS: Record<string, { chip: string; chipText: string }> = {
  '01 - Leis - o que são e como funcionam': { chip: '#f59e0b', chipText: '#ffffff' },
  '02 - Processo legislativo': { chip: '#3b82f6', chipText: '#ffffff' },
  '03 - Senado Federal': { chip: '#10b981', chipText: '#ffffff' },
  '04 - Câmara dos Deputados': { chip: '#0ea5e9', chipText: '#ffffff' },
  '05 - STF': { chip: '#a855f7', chipText: '#ffffff' },
  '06 - Judiciário além do STF': { chip: '#f43f5e', chipText: '#ffffff' },
  '07 - Presidência e Poder Executivo': { chip: '#eab308', chipText: '#000000' },
  '08 - Direitos do cidadão na prática': { chip: '#14b8a6', chipText: '#ffffff' },
  '09 - História das leis': { chip: '#f97316', chipText: '#ffffff' },
  '10 - Bastidores do poder': { chip: '#d946ef', chipText: '#ffffff' },
};

// Fallback helper for any theme color
export function getTemaColor(tema: string) {
  return TEMA_COLORS[tema] || { chip: '#3b82f6', chipText: '#ffffff' };
}

export interface BlogPost {
  id: string;
  titulo: string;
  resumo: string;
  conteudo_md: string;
  imagem_url: string;
  tema: BlogTema;
  autor: string;
  data_publicacao: string; // ISO
  tempo_leitura_min: number;
}

// O acervo agora é 100% carregado dinamicamente do Supabase (blog_edicao_posts)
export const BLOG_POSTS: BlogPost[] = [];
