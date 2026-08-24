import { BookOpen, Globe, Landmark } from 'lucide-react';

export interface ArtigoEducacional {
  slug: string;
  titulo: string;
  categoria: string;
  descricao: string;
}

export interface CategoriaEducacional {
  id: string;
  nome: string;
  descricao: string;
  icon: typeof BookOpen;
  cor: string;
  artigos: ArtigoEducacional[];
}

export const CATEGORIAS_EDUCACIONAIS: CategoriaEducacional[] = [
  {
    id: 'historia',
    nome: 'História da Legislação',
    descricao: 'Das primeiras leis da humanidade à Constituição de 1988',
    icon: Globe,
    cor: 'text-amber-400',
    artigos: [
      { slug: 'codigo-de-hamurabi', titulo: 'Código de Hamurabi', categoria: 'História da Legislação', descricao: 'O primeiro código de leis da história da humanidade' },
      { slug: 'direito-romano', titulo: 'Direito Romano', categoria: 'História da Legislação', descricao: 'As bases do direito ocidental moderno' },
      { slug: 'magna-carta', titulo: 'Magna Carta de 1215', categoria: 'História da Legislação', descricao: 'O documento que limitou o poder do rei' },
      { slug: 'revolucao-francesa-codificacao', titulo: 'Revolução Francesa e Codificação', categoria: 'História da Legislação', descricao: 'Como a Revolução mudou o direito para sempre' },
      { slug: 'historia-constituicoes-brasileiras', titulo: 'História das Constituições Brasileiras', categoria: 'História da Legislação', descricao: 'De 1824 a 1988: a evolução constitucional do Brasil' },
      { slug: 'evolucao-direitos-humanos', titulo: 'Evolução dos Direitos Humanos', categoria: 'História da Legislação', descricao: 'Das revoluções liberais à Declaração Universal' },
      { slug: 'common-law-vs-civil-law', titulo: 'Common Law vs Civil Law', categoria: 'História da Legislação', descricao: 'As duas grandes tradições jurídicas do mundo' },
      { slug: 'codigo-napoleonico', titulo: 'Código Napoleônico', categoria: 'História da Legislação', descricao: 'O código que influenciou o direito de dezenas de países' },
      { slug: 'declaracao-universal-direitos-humanos', titulo: 'Declaração Universal dos Direitos Humanos', categoria: 'História da Legislação', descricao: 'O documento de 1948 que definiu direitos universais' },
      { slug: 'historia-voto-brasil', titulo: 'História do Voto no Brasil', categoria: 'História da Legislação', descricao: 'Do voto censitário ao sufrágio universal' },
    ],
  },
  {
    id: 'fundamentos',
    nome: 'Fundamentos da Lei',
    descricao: 'Conceitos essenciais para entender a legislação brasileira',
    icon: BookOpen,
    cor: 'text-emerald-400',
    artigos: [
      { slug: 'o-que-e-uma-lei', titulo: 'O que é uma Lei?', categoria: 'Fundamentos da Lei', descricao: 'Conceito, tipos e como uma lei nasce no Brasil' },
      { slug: 'o-que-e-um-inciso', titulo: 'O que é um Inciso?', categoria: 'Fundamentos da Lei', descricao: 'Estrutura dos artigos de lei: incisos, alíneas e parágrafos' },
      { slug: 'alineas-e-paragrafos', titulo: 'Alíneas e Parágrafos', categoria: 'Fundamentos da Lei', descricao: 'Como ler e interpretar a estrutura de um artigo de lei' },
      { slug: 'hierarquia-das-normas', titulo: 'Hierarquia das Normas Jurídicas', categoria: 'Fundamentos da Lei', descricao: 'Pirâmide de Kelsen e a organização do ordenamento jurídico' },
      { slug: 'diferenca-lei-decreto', titulo: 'Diferença entre Lei e Decreto', categoria: 'Fundamentos da Lei', descricao: 'Quando se usa lei e quando se usa decreto' },
      { slug: 'vigencia-vs-eficacia', titulo: 'Vigência vs Eficácia', categoria: 'Fundamentos da Lei', descricao: 'Quando uma lei começa a valer e quando produz efeitos' },
      { slug: 'vacatio-legis', titulo: 'Vacatio Legis', categoria: 'Fundamentos da Lei', descricao: 'O período entre a publicação e a entrada em vigor da lei' },
      { slug: 'retroatividade-da-lei', titulo: 'Retroatividade da Lei', categoria: 'Fundamentos da Lei', descricao: 'Quando uma lei pode ser aplicada a fatos anteriores' },
      { slug: 'analogia-no-direito', titulo: 'Analogia no Direito', categoria: 'Fundamentos da Lei', descricao: 'Como preencher lacunas na legislação' },
      { slug: 'costume-como-fonte', titulo: 'Costume como Fonte do Direito', categoria: 'Fundamentos da Lei', descricao: 'O papel dos costumes na formação das regras jurídicas' },
      { slug: 'principios-gerais-do-direito', titulo: 'Princípios Gerais do Direito', categoria: 'Fundamentos da Lei', descricao: 'Os pilares que sustentam todo o sistema jurídico' },
      { slug: 'fontes-do-direito', titulo: 'Fontes do Direito Brasileiro', categoria: 'Fundamentos da Lei', descricao: 'Lei, jurisprudência, doutrina, costumes e princípios' },
    ],
  },
  {
    id: 'estrutura-estado',
    nome: 'Estrutura do Estado e Leis',
    descricao: 'Como funciona o governo e como as leis são criadas',
    icon: Landmark,
    cor: 'text-blue-400',
    artigos: [
      { slug: 'o-que-e-o-planalto', titulo: 'O que é o Planalto?', categoria: 'Estrutura do Estado e Leis', descricao: 'O Palácio do Planalto e o Poder Executivo federal' },
      { slug: 'o-que-faz-o-senado', titulo: 'O que faz o Senado?', categoria: 'Estrutura do Estado e Leis', descricao: 'Funções, composição e importância do Senado Federal' },
      { slug: 'o-que-faz-um-deputado', titulo: 'O que faz um Deputado Federal?', categoria: 'Estrutura do Estado e Leis', descricao: 'Atribuições, mandato e atuação parlamentar' },
      { slug: 'como-funciona-o-stf', titulo: 'Como funciona o STF?', categoria: 'Estrutura do Estado e Leis', descricao: 'O guardião da Constituição Federal' },
      { slug: 'o-que-e-o-mpf', titulo: 'O que é o MPF?', categoria: 'Estrutura do Estado e Leis', descricao: 'Ministério Público Federal e suas atribuições' },
      { slug: 'tribunal-de-contas', titulo: 'Tribunal de Contas da União', categoria: 'Estrutura do Estado e Leis', descricao: 'O órgão que fiscaliza o uso do dinheiro público' },
      { slug: 'como-nasce-projeto-de-lei', titulo: 'Como nasce um Projeto de Lei?', categoria: 'Estrutura do Estado e Leis', descricao: 'Da iniciativa à sanção presidencial' },
      { slug: 'processo-legislativo', titulo: 'Processo Legislativo Brasileiro', categoria: 'Estrutura do Estado e Leis', descricao: 'Etapas de criação das leis no Congresso Nacional' },
      { slug: 'sancao-e-veto', titulo: 'Sanção e Veto Presidencial', categoria: 'Estrutura do Estado e Leis', descricao: 'Como o presidente aprova ou rejeita projetos de lei' },
      { slug: 'medidas-provisorias', titulo: 'Medidas Provisórias', categoria: 'Estrutura do Estado e Leis', descricao: 'O instrumento legislativo do Poder Executivo' },
      { slug: 'federalismo-brasileiro', titulo: 'Federalismo Brasileiro', categoria: 'Estrutura do Estado e Leis', descricao: 'União, Estados, Municípios e Distrito Federal' },
      { slug: 'tres-poderes', titulo: 'Os Três Poderes', categoria: 'Estrutura do Estado e Leis', descricao: 'Executivo, Legislativo e Judiciário: separação e harmonia' },
    ],
  },
];

export function findArtigoBySlug(slug: string) {
  for (const cat of CATEGORIAS_EDUCACIONAIS) {
    const artigo = cat.artigos.find(a => a.slug === slug);
    if (artigo) return artigo;
  }
  return null;
}
