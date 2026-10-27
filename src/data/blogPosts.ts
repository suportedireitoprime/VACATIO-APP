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
    subtitulo: 'Das tábuas antigas à Constituição de 1988',
    iconName: 'Hourglass',
    colorGradient: 'from-amber-500 via-amber-600 to-yellow-600',
    accentColor: '#d97706',
    badgeBg: 'rgba(217, 119, 6, 0.18)',
    badgeText: '#f59e0b',
  },
  {
    id: '01 - Leis - o que são e como funcionam',
    numero: '02',
    titulo: 'Leis & Fundamentos',
    subtitulo: 'Conceitos, hierarquia e aplicação prática',
    iconName: 'Scale',
    colorGradient: 'from-red-600 via-rose-600 to-red-700',
    accentColor: '#dc2626',
    badgeBg: 'rgba(220, 38, 38, 0.18)',
    badgeText: '#ef4444',
  },
  {
    id: '02 - Processo legislativo',
    numero: '03',
    titulo: 'Processo Legislativo',
    subtitulo: 'Do projeto de lei à sanção presidencial',
    iconName: 'ScrollText',
    colorGradient: 'from-blue-600 via-blue-700 to-indigo-800',
    accentColor: '#2563eb',
    badgeBg: 'rgba(37, 99, 235, 0.18)',
    badgeText: '#3b82f6',
  },
  {
    id: '03 - Senado Federal',
    numero: '04',
    titulo: 'Senado Federal',
    subtitulo: 'A câmara alta e o pacto federativo',
    iconName: 'Landmark',
    colorGradient: 'from-emerald-500 via-emerald-600 to-teal-700',
    accentColor: '#059669',
    badgeBg: 'rgba(5, 150, 105, 0.18)',
    badgeText: '#10b981',
  },
  {
    id: '04 - Câmara dos Deputados',
    numero: '05',
    titulo: 'Câmara dos Deputados',
    subtitulo: 'A voz popular e os grandes debates',
    iconName: 'Users',
    colorGradient: 'from-orange-500 via-orange-600 to-amber-600',
    accentColor: '#ea580c',
    badgeBg: 'rgba(234, 88, 12, 0.18)',
    badgeText: '#f97316',
  },
  {
    id: '05 - STF',
    numero: '06',
    titulo: 'STF · Supremo Tribunal',
    subtitulo: 'A guarda suprema da Constituição',
    iconName: 'Gavel',
    colorGradient: 'from-purple-600 via-violet-600 to-purple-800',
    accentColor: '#9333ea',
    badgeBg: 'rgba(147, 51, 234, 0.18)',
    badgeText: '#a855f7',
  },
  {
    id: '06 - Judiciário além do STF',
    numero: '07',
    titulo: 'Poder Judiciário',
    subtitulo: 'STJ, tribunais e a justiça do dia a dia',
    iconName: 'Shield',
    colorGradient: 'from-cyan-500 via-teal-500 to-cyan-600',
    accentColor: '#0891b2',
    badgeBg: 'rgba(8, 145, 178, 0.18)',
    badgeText: '#06b6d4',
  },
  {
    id: '07 - Presidência e Poder Executivo',
    numero: '08',
    titulo: 'Presidência & Executivo',
    subtitulo: 'Palácio do Planalto, ministérios e decretos',
    iconName: 'Crown',
    colorGradient: 'from-rose-500 via-pink-600 to-rose-700',
    accentColor: '#e11d48',
    badgeBg: 'rgba(225, 29, 72, 0.18)',
    badgeText: '#f43f5e',
  },
  {
    id: '08 - Direitos do cidadão na prática',
    numero: '09',
    titulo: 'Direitos do Cidadão',
    subtitulo: 'Seus direitos fundamentais na prática',
    iconName: 'HeartHandshake',
    colorGradient: 'from-lime-500 via-emerald-500 to-green-600',
    accentColor: '#16a34a',
    badgeBg: 'rgba(22, 163, 74, 0.18)',
    badgeText: '#22c55e',
  },
  {
    id: '10 - Bastidores do poder',
    numero: '10',
    titulo: 'Bastidores do Poder',
    subtitulo: 'Articulações e bastidores de Brasília',
    iconName: 'Eye',
    colorGradient: 'from-indigo-600 via-blue-900 to-slate-900',
    accentColor: '#4f46e5',
    badgeBg: 'rgba(79, 70, 229, 0.18)',
    badgeText: '#6366f1',
  },
];

export const TEMAS: BlogTema[] = BLOG_CATEGORIAS.map((c) => c.id);

export const TEMA_COLORS: Record<string, { chip: string; chipText: string }> = {
  '09 - História das leis': { chip: '#d97706', chipText: '#ffffff' },
  '01 - Leis - o que são e como funcionam': { chip: '#dc2626', chipText: '#ffffff' },
  '02 - Processo legislativo': { chip: '#2563eb', chipText: '#ffffff' },
  '03 - Senado Federal': { chip: '#059669', chipText: '#ffffff' },
  '04 - Câmara dos Deputados': { chip: '#ea580c', chipText: '#ffffff' },
  '05 - STF': { chip: '#9333ea', chipText: '#ffffff' },
  '06 - Judiciário além do STF': { chip: '#0891b2', chipText: '#ffffff' },
  '07 - Presidência e Poder Executivo': { chip: '#e11d48', chipText: '#ffffff' },
  '08 - Direitos do cidadão na prática': { chip: '#16a34a', chipText: '#ffffff' },
  '10 - Bastidores do poder': { chip: '#4f46e5', chipText: '#ffffff' },
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
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  audio_voice?: string | null;
}

// O acervo agora é 100% carregado dinamicamente do Supabase (blog_edicao_posts)
export const BLOG_POSTS: BlogPost[] = [];
