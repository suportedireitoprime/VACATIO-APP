import { getLeiCover } from '@/lib/leiTheme';
import capaProcessoPenal from '@/assets/capa-processo-penal.webp';
import capaPenal from '@/assets/capa-lei-penal-especial.webp';

export interface CapituloDef {
  id: string;
  titulo: string;
  subtitulo: string;
  artigoInicio: number;
  artigoFim: number;
  rotuloFaixa: string;
  capaUrl?: string;
  badge?: string;
}

// Capítulos Temáticos Estruturados para o Código de Processo Penal (CPP)
const CAPITULOS_CPP: CapituloDef[] = [
  {
    id: 'cpp-inquerito',
    titulo: 'Inquérito Policial',
    subtitulo: 'Investigação preliminar, instauração, prazos, indiciamento e arquivamento',
    artigoInicio: 1,
    artigoFim: 23,
    rotuloFaixa: 'Arts. 1º ao 23',
    capaUrl: '/assets/homem-preso-novo.webp',
    badge: 'Fase Investigativa',
  },
  {
    id: 'cpp-acao-penal',
    titulo: 'Ação Penal & Civil',
    subtitulo: 'Ação pública, privada, representação, renúncia, perdão e ação reparatória',
    artigoInicio: 24,
    artigoFim: 68,
    rotuloFaixa: 'Arts. 24 ao 68',
    capaUrl: capaProcessoPenal,
    badge: 'Titularidade & Ação',
  },
  {
    id: 'cpp-competencia',
    titulo: 'Jurisdição & Competência',
    subtitulo: 'Lugar do crime, domicílio do réu, conexão, continência, prevenção e prerrogativa de função',
    artigoInicio: 69,
    artigoFim: 91,
    rotuloFaixa: 'Arts. 69 ao 91',
    capaUrl: '/assets/cpp-court.webp',
    badge: 'Fixação de Juízo',
  },
  {
    id: 'cpp-incidentes',
    titulo: 'Processos Incidentes',
    subtitulo: 'Exceções, impedimentos, suspeição, restituição de coisas apreendidas e falsidade documental',
    artigoInicio: 92,
    artigoFim: 154,
    rotuloFaixa: 'Arts. 92 ao 154',
    capaUrl: capaProcessoPenal,
    badge: 'Incidentes',
  },
  {
    id: 'cpp-provas',
    titulo: 'Da Prova Penal',
    subtitulo: 'Perícia, corpo de delito, interrogatório, testemunhas, acareação e busca e apreensão',
    artigoInicio: 155,
    artigoFim: 250,
    rotuloFaixa: 'Arts. 155 ao 250',
    capaUrl: '/assets/homem-preso-novo.webp',
    badge: 'Meios de Prova',
  },
  {
    id: 'cpp-sujeitos',
    titulo: 'Sujeitos do Processo',
    subtitulo: 'Juiz de garantias, Ministério Público, acusado, defensor, assistentes e peritos',
    artigoInicio: 251,
    artigoFim: 281,
    rotuloFaixa: 'Arts. 251 ao 281',
    capaUrl: '/assets/cpp-court.webp',
    badge: 'Partes Processuais',
  },
  {
    id: 'cpp-prisoes',
    titulo: 'Prisões & Cautelares',
    subtitulo: 'Prisão em flagrante, preventiva, temporária, medidas alternativas e liberdade provisória com fiança',
    artigoInicio: 282,
    artigoFim: 350,
    rotuloFaixa: 'Arts. 282 ao 350',
    capaUrl: '/assets/homem-preso-novo.webp',
    badge: 'Liberdade & Custódia',
  },
  {
    id: 'cpp-citacoes',
    titulo: 'Citações & Intimações',
    subtitulo: 'Atos de comunicação, citação pessoal, edital, hora certa e cartas precatórias',
    artigoInicio: 351,
    artigoFim: 393,
    rotuloFaixa: 'Arts. 351 ao 393',
    capaUrl: capaProcessoPenal,
    badge: 'Comunicação dos Atos',
  },
  {
    id: 'cpp-procedimento-juri',
    titulo: 'Procedimento & Júri',
    subtitulo: 'Procedimento ordinário, sumário e as duas fases completas do Tribunal do Júri popular',
    artigoInicio: 394,
    artigoFim: 497,
    rotuloFaixa: 'Arts. 394 ao 497',
    capaUrl: '/assets/cpp-court.webp',
    badge: 'Rito Comum e Especial',
  },
  {
    id: 'cpp-processos-especiais',
    titulo: 'Processos Especiais',
    subtitulo: 'Crimes de funcionários públicos, contra a honra, propriedade imaterial e crimes sumários',
    artigoInicio: 498,
    artigoFim: 562,
    rotuloFaixa: 'Arts. 498 ao 562',
    capaUrl: capaProcessoPenal,
    badge: 'Ritos Especiais',
  },
  {
    id: 'cpp-nulidades',
    titulo: 'Nulidades Processuais',
    subtitulo: 'Invalidades, nulidades absolutas e relativas, prejuízo às partes e saneamento de vícios',
    artigoInicio: 563,
    artigoFim: 573,
    rotuloFaixa: 'Arts. 563 ao 573',
    capaUrl: '/assets/cpp-court.webp',
    badge: 'Nulidades',
  },
  {
    id: 'cpp-recursos',
    titulo: 'Recursos em Geral & Apelação',
    subtitulo: 'Recurso em Sentido Estrito (RESE), apelação, embargos de declaração e carta testemunhável',
    artigoInicio: 574,
    artigoFim: 646,
    rotuloFaixa: 'Arts. 574 ao 646',
    capaUrl: capaProcessoPenal,
    badge: 'Duplo Grau',
  },
  {
    id: 'cpp-habeas-corpus',
    titulo: 'Habeas Corpus & Revisão',
    subtitulo: 'Garantia constitucional contra coação ilegal, cabimento, liminares e ação rescisória penal',
    artigoInicio: 647,
    artigoFim: 667,
    rotuloFaixa: 'Arts. 647 ao 667',
    capaUrl: '/assets/homem-preso-novo.webp',
    badge: 'Remédios Constitucionais',
  },
  {
    id: 'cpp-execucao-finais',
    titulo: 'Execução & Disposições Finais',
    subtitulo: 'Execução de penas e medidas de segurança, graça, indulto e regras de transição processual',
    artigoInicio: 668,
    artigoFim: 811,
    rotuloFaixa: 'Arts. 668 ao 811',
    capaUrl: '/assets/cpp-court.webp',
    badge: 'Execução & Encerramento',
  },
];

// Capítulos Temáticos Estruturados para o Código Penal (CP)
const CAPITULOS_CP: CapituloDef[] = [
  {
    id: 'cp-parte-geral-aplicacao',
    titulo: 'Aplicação da Lei Penal',
    subtitulo: 'Princípio da legalidade, anterioridade, lei no tempo e no espaço, extraterritorialidade',
    artigoInicio: 1,
    artigoFim: 12,
    rotuloFaixa: 'Arts. 1º ao 12',
    capaUrl: capaPenal,
    badge: 'Parte Geral',
  },
  {
    id: 'cp-do-crime',
    titulo: 'Do Crime & Imputabilidade',
    subtitulo: 'Dolo, culpa, tentativa, desistência voluntária, arrependimento eficaz e causas de exclusão da ilicitude',
    artigoInicio: 13,
    artigoFim: 28,
    rotuloFaixa: 'Arts. 13 ao 28',
    capaUrl: '/assets/homem-preso-novo.webp',
    badge: 'Teoria do Delito',
  },
  {
    id: 'cp-das-penas',
    titulo: 'Das Penas & Dosimetria',
    subtitulo: 'Penas privativas de liberdade, restritivas de direitos, multa, fixação da pena e sursis',
    artigoInicio: 29,
    artigoFim: 106,
    rotuloFaixa: 'Arts. 29 ao 106',
    capaUrl: capaPenal,
    badge: 'Teoria da Pena',
  },
  {
    id: 'cp-extincao-punibilidade',
    titulo: 'Extinção da Punibilidade',
    subtitulo: 'Prescrição, decadência, perempção, anistia, graça, indulto e perdão judicial',
    artigoInicio: 107,
    artigoFim: 120,
    rotuloFaixa: 'Arts. 107 ao 120',
    capaUrl: '/assets/cpp-court.webp',
    badge: 'Prescrição & Extinção',
  },
  {
    id: 'cp-crimes-pessoa',
    titulo: 'Crimes Contra a Pessoa',
    subtitulo: 'Homicídio, infanticídio, aborto, lesões corporais, periclitação da vida e crimes contra a honra',
    artigoInicio: 121,
    artigoFim: 154,
    rotuloFaixa: 'Arts. 121 ao 154',
    capaUrl: '/assets/homem-preso-novo.webp',
    badge: 'Vida & Integridade',
  },
  {
    id: 'cp-crimes-patrimonio',
    titulo: 'Crimes Contra o Patrimônio',
    subtitulo: 'Furto, roubo, extorsão, usurpação, dano, apropriação indébita, estelionato e receptação',
    artigoInicio: 155,
    artigoFim: 183,
    rotuloFaixa: 'Arts. 155 ao 183',
    capaUrl: capaPenal,
    badge: 'Patrimônio',
  },
  {
    id: 'cp-crimes-dignidade-sexual',
    titulo: 'Dignidade Sexual',
    subtitulo: 'Estupro, estupro de vulnerável, assédio sexual, importunação e exploração sexual',
    artigoInicio: 213,
    artigoFim: 234,
    rotuloFaixa: 'Arts. 213 ao 234-B',
    capaUrl: capaPenal,
    badge: 'Crimes Sexuais',
  },
  {
    id: 'cp-crimes-paz-fe',
    titulo: 'Paz Pública & Fé Pública',
    subtitulo: 'Associação criminosa, milícia, moeda falsa, falsificação de documento público e falsidade ideológica',
    artigoInicio: 286,
    artigoFim: 311,
    rotuloFaixa: 'Arts. 286 ao 311-A',
    capaUrl: '/assets/cpp-court.webp',
    badge: 'Coletividade & Fé',
  },
  {
    id: 'cp-crimes-adm-publica',
    titulo: 'Administração Pública',
    subtitulo: 'Peculato, concussão, corrupção passiva, prevaricação, corrupção ativa e desacato',
    artigoInicio: 312,
    artigoFim: 359,
    rotuloFaixa: 'Arts. 312 ao 359-H',
    capaUrl: capaPenal,
    badge: 'Serviço Público',
  },
  {
    id: 'cp-estado-democratico',
    titulo: 'Estado Democrático',
    subtitulo: 'Atentado contra a soberania nacional, golpe de Estado, sabotagem e interrupção eleitoral',
    artigoInicio: 360,
    artigoFim: 380,
    rotuloFaixa: 'Arts. 359-I ao 359-T',
    capaUrl: '/assets/cpp-court.webp',
    badge: 'Ordem Constitucional',
  },
];

/**
 * Retorna os capítulos organizados para a lei especificada
 */
export function getCapitulosDaLei(leiSlug: string, totalArtigos: number = 0): CapituloDef[] {
  const slug = (leiSlug || '').toLowerCase().trim();

  if (slug === 'cpp' || slug.includes('processo-penal') || slug.includes('processopenal')) {
    return CAPITULOS_CPP;
  }

  if (slug === 'cp' || slug.includes('penal') && !slug.includes('processo')) {
    return CAPITULOS_CP;
  }

  // Fallback Inteligente: Agrupa automaticamente qualquer legislação por blocos lógicos
  const tamanhoBloco = 30;
  const totalBase = totalArtigos > 0 ? totalArtigos : (slug === 'cc' || slug.includes('civil') ? 2046 : 100);
  const numCapitulos = Math.max(1, Math.ceil(totalBase / tamanhoBloco));
  const fallbackCapitulos: CapituloDef[] = [];
  const capaPadrao = getLeiCover(leiSlug);

  for (let i = 0; i < numCapitulos; i++) {
    const ini = i * tamanhoBloco + 1;
    const fim = Math.min((i + 1) * tamanhoBloco, totalBase);
    fallbackCapitulos.push({
      id: `${slug}-cap-${i + 1}`,
      titulo: `Parte ${i + 1}: Arts. ${ini} a ${fim}`,
      subtitulo: `Bloco de artigos numerados de ${ini} a ${fim}`,
      artigoInicio: ini,
      artigoFim: fim,
      rotuloFaixa: `Arts. ${ini} ao ${fim}`,
      capaUrl: capaPadrao,
      badge: `Seção ${i + 1}`,
    });
  }

  return fallbackCapitulos;
}

/**
 * Converte um número textual de artigo (ex: "Art. 155", "155", "Art. 1.000", "Art. 359-A") para número inteiro para conferência
 */
export function extrairNumeroArtigo(artigoStr: string): number {
  if (!artigoStr) return 0;
  // Remove pontos de milhares (ex: 1.000 -> 1000, 2.046 -> 2046) e pontuação de "Art."
  const semPontos = String(artigoStr).replace(/\./g, '');
  const match = semPontos.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}
