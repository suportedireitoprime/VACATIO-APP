import { GraduationCap, Scale, Landmark, Briefcase, BookOpen, Video, ScrollText, Search, Compass, FileWarning, Gavel, MessageSquareQuote, FileText, ListChecks, Newspaper, Highlighter, FileSignature } from 'lucide-react';
import personaEstudante from '@/assets/onboarding/persona-estudante.webp';
import personaOAB from '@/assets/onboarding/persona-oab-homem.jpg';
import personaConcurseiro from '@/assets/onboarding/persona-concurseiro.webp';
import personaAdvogado from '@/assets/onboarding/persona-advogado.jpg';

// Filósofos silhuetados — usados na abertura cinematográfica
import filKant from '@/assets/filosofos/kant.webp';
import filAristoteles from '@/assets/filosofos/aristoteles.webp';
import filPlatao from '@/assets/filosofos/platao.webp';
import filMontesquieu from '@/assets/filosofos/montesquieu.webp';
import filRousseau from '@/assets/filosofos/rousseau.webp';
import filLocke from '@/assets/filosofos/locke.webp';
import filHegel from '@/assets/filosofos/hegel.webp';
import filCicero from '@/assets/filosofos/cicero.webp';
import filBeccaria from '@/assets/filosofos/beccaria.webp';
import filKelsen from '@/assets/filosofos/kelsen.webp';
import filRuiBarbosa from '@/assets/filosofos/ruibarbosa.webp';
import filAquino from '@/assets/filosofos/aquino.webp';

export const FILOSOFOS = [
  { nome: 'Kant', src: filKant },
  { nome: 'Aristóteles', src: filAristoteles },
  { nome: 'Platão', src: filPlatao },
  { nome: 'Montesquieu', src: filMontesquieu },
  { nome: 'Rousseau', src: filRousseau },
  { nome: 'Locke', src: filLocke },
  { nome: 'Hegel', src: filHegel },
  { nome: 'Cícero', src: filCicero },
  { nome: 'Beccaria', src: filBeccaria },
  { nome: 'Kelsen', src: filKelsen },
  { nome: 'Rui Barbosa', src: filRuiBarbosa },
  { nome: 'Tomás de Aquino', src: filAquino },
];

export type PersonaId = 'faculdade' | 'oab' | 'concurso' | 'advogado';

export type TriagemResult = {
  persona: PersonaId | null;
  personaLabel: string | null;
  faixa: string | null;
  nome: string;
  areas: string[];
  interesses: string[];
  dores: string[];
  whatsapp: string | null;
};

export const PERSONAS: {
  id: PersonaId;
  label: string;
  desc: string;
  icon: any;
  cover: string;
  accent: string;
}[] = [
  { id: 'faculdade', label: 'Estudante de Direito', desc: 'Estou na faculdade.', icon: GraduationCap, cover: personaEstudante, accent: '#F5C518' },
  { id: 'oab', label: 'Estudando pra OAB', desc: 'Foco no Exame de Ordem.', icon: Scale, cover: personaOAB, accent: '#E85D3A' },
  { id: 'concurso', label: 'Concurseiro(a)', desc: 'Magistratura, MP, Delegado.', icon: Landmark, cover: personaConcurseiro, accent: '#2DD4A8' },
  { id: 'advogado', label: 'Advogado(a)', desc: 'Já sou inscrito(a) na OAB.', icon: Briefcase, cover: personaAdvogado, accent: '#C9A84C' },
];

export const AREAS = [
  'Constitucional', 'Penal', 'Civil', 'Trabalho',
  'Tributário', 'Administrativo', 'Processo Civil', 'Empresarial',
  'Ambiental', 'Consumidor',
];

export const INTERESSES: { id: string; label: string; desc: string; icon: any }[] = [
  { id: 'leis', label: 'Leis atualizadas', desc: 'CF, códigos e estatutos vigentes', icon: ScrollText },
  { id: 'leis-comentadas', label: 'Leis comentadas', desc: 'Artigo por artigo, explicado', icon: Highlighter },
  { id: 'jurisprudencia', label: 'Jurisprudência', desc: 'Decisões do STF, STJ e tribunais', icon: Gavel },
  { id: 'sumulas', label: 'Súmulas e teses', desc: 'Entendimentos consolidados', icon: MessageSquareQuote },
  { id: 'livros', label: 'Biblioteca de livros', desc: 'Doutrina e clássicos do Direito', icon: BookOpen },
  { id: 'videoaulas', label: 'Videoaulas', desc: 'Trilhas em vídeo por matéria', icon: Video },
  { id: 'questoes', label: 'Questões e simulados', desc: 'OAB, concursos e provas', icon: ListChecks },
  { id: 'resumos', label: 'Resumos e mapas', desc: 'Sínteses e mapas mentais', icon: FileText },
  { id: 'peticoes', label: 'Peças e petições', desc: 'Modelos com apoio da IA', icon: FileSignature },
  { id: 'radar', label: 'Radar legislativo', desc: 'Novas leis e notícias jurídicas', icon: Newspaper },
];

export const DORES: { id: string; label: string; desc: string; icon: any }[] = [
  { id: 'leis-desatualizadas', label: 'Leis desatualizadas', desc: 'Nunca sei se estou lendo a versão vigente.', icon: FileWarning },
  { id: 'lei-dificil', label: 'Lei difícil de entender', desc: 'Preciso do artigo comentado, sem juridiquês.', icon: Highlighter },
  { id: 'jurisprudencia', label: 'Achar jurisprudência', desc: 'Demoro pra encontrar decisão e súmula.', icon: Gavel },
  { id: 'busca-lenta', label: 'Material espalhado', desc: 'Lei, doutrina e resumo em lugares diferentes.', icon: Search },
  { id: 'onde-comecar', label: 'Não sei por onde começar', desc: 'Muita legislação, pouca direção.', icon: Compass },
];

export const FAIXAS = ['18 a 24', '25 a 30', '31 a 40', '41 a 50', '51 ou mais'];

export const emptyResult = (): TriagemResult => ({
  persona: null,
  personaLabel: null,
  faixa: null,
  nome: '',
  areas: [],
  interesses: [],
  dores: [],
  whatsapp: null,
});
