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

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGO CIVIL (CC - Lei 10.406/2002) — CAPÍTULOS OFICIAIS
// ─────────────────────────────────────────────────────────────────────────────
const CAPITULOS_CC: CapituloDef[] = [
  // PARTE GERAL
  {
    id: 'cc-pessoas-naturais',
    titulo: 'Pessoas Naturais (Personalidade e Capacidade)',
    subtitulo: 'Início e fim da personalidade civil, nascituro, incapacidade absoluta e relativa',
    artigoInicio: 1,
    artigoFim: 10,
    rotuloFaixa: 'Arts. 1º ao 10',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Parte Geral',
  },
  {
    id: 'cc-direitos-personalidade',
    titulo: 'Direitos da Personalidade',
    subtitulo: 'Inviolabilidade física e moral, direito ao corpo, nome, honra, imagem e privacidade',
    artigoInicio: 11,
    artigoFim: 21,
    rotuloFaixa: 'Arts. 11 ao 21',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Personalidade',
  },
  {
    id: 'cc-ausencia',
    titulo: 'Da Ausência & Sucessão Provisória',
    subtitulo: 'Curadoria dos bens do ausente, abertura da sucessão provisória e definitiva',
    artigoInicio: 22,
    artigoFim: 39,
    rotuloFaixa: 'Arts. 22 ao 39',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Ausência',
  },
  {
    id: 'cc-pessoas-juridicas',
    titulo: 'Pessoas Jurídicas, Associações & Fundações',
    subtitulo: 'Classificação, constituição, desconsideração da personalidade jurídica e extinção',
    artigoInicio: 40,
    artigoFim: 69,
    rotuloFaixa: 'Arts. 40 ao 69',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Pessoas Jurídicas',
  },
  {
    id: 'cc-domicilio',
    titulo: 'Do Domicílio Civil',
    subtitulo: 'Domicílio da pessoa natural, jurídica, pluralidade de domicílios e domicílio necessário',
    artigoInicio: 70,
    artigoFim: 78,
    rotuloFaixa: 'Arts. 70 ao 78',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Domicílio',
  },
  {
    id: 'cc-dos-bens',
    titulo: 'Dos Bens (Móveis, Imóveis e Públicos)',
    subtitulo: 'Bens em si mesmos, principais, acessórios, pertenças, frutos e bens públicos',
    artigoInicio: 79,
    artigoFim: 103,
    rotuloFaixa: 'Arts. 79 ao 103',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Dos Bens',
  },
  {
    id: 'cc-negocio-juridico',
    titulo: 'Fatos e Negócios Jurídicos (Validade & Defeitos)',
    subtitulo: 'Representação, condição, termo, encargo, erro, dolo, coação, fraude e simulação',
    artigoInicio: 104,
    artigoFim: 184,
    rotuloFaixa: 'Arts. 104 ao 184',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Negócio Jurídico',
  },
  {
    id: 'cc-atos-ilicitos',
    titulo: 'Atos Ilícitos & Abuso de Direito',
    subtitulo: 'Culpa, dolo, conduta ilícita, legítima defesa, estado de necessidade e dano',
    artigoInicio: 185,
    artigoFim: 188,
    rotuloFaixa: 'Arts. 185 ao 188',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Ilicitude',
  },
  {
    id: 'cc-prescricao-decadencia',
    titulo: 'Prescrição & Decadência',
    subtitulo: 'Causas que impedem, suspendem ou interrompem a prescrição e prazos especiais',
    artigoInicio: 189,
    artigoFim: 211,
    rotuloFaixa: 'Arts. 189 ao 211',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Prescrição',
  },
  {
    id: 'cc-da-prova',
    titulo: 'Da Prova dos Fatos Jurídicos',
    subtitulo: 'Confissão, documento público e particular, testemunhas, presunção e perícia',
    artigoInicio: 212,
    artigoFim: 232,
    rotuloFaixa: 'Arts. 212 ao 232',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Da Prova',
  },

  // PARTE ESPECIAL - OBRIGAÇÕES
  {
    id: 'cc-modalidades-obrigacoes',
    titulo: 'Modalidades das Obrigações',
    subtitulo: 'Obrigações de dar coisa certa/incerta, fazer, não fazer, alternativas e solidariedade',
    artigoInicio: 233,
    artigoFim: 285,
    rotuloFaixa: 'Arts. 233 ao 285',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Obrigações',
  },
  {
    id: 'cc-transmissao-obrigacoes',
    titulo: 'Transmissão das Obrigações',
    subtitulo: 'Cessão de crédito, assunção de dívida e cessão de posição contratual',
    artigoInicio: 286,
    artigoFim: 303,
    rotuloFaixa: 'Arts. 286 ao 303',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Cessão & Assunção',
  },
  {
    id: 'cc-adimplemento-extincao',
    titulo: 'Adimplemento & Extinção das Obrigações',
    subtitulo: 'Do pagamento, consignação, sub-rogação, imputação, dação, novação, compensação e remissão',
    artigoInicio: 304,
    artigoFim: 388,
    rotuloFaixa: 'Arts. 304 ao 388',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Pagamento',
  },
  {
    id: 'cc-inadimplemento-obrigacoes',
    titulo: 'Inadimplemento, Mora & Cláusula Penal',
    subtitulo: 'Perdas e danos, juros moratórios e compensatórios, cláusula penal e arras/sinal',
    artigoInicio: 389,
    artigoFim: 420,
    rotuloFaixa: 'Arts. 389 ao 420',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Inadimplemento',
  },
  {
    id: 'cc-contratos-geral',
    titulo: 'Contratos em Geral',
    subtitulo: 'Função social do contrato, boa-fé objetiva, estipulação em favor de terceiro, vícios redibitórios e evicção',
    artigoInicio: 421,
    artigoFim: 480,
    rotuloFaixa: 'Arts. 421 ao 480',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Teoria dos Contratos',
  },
  {
    id: 'cc-compra-venda-doacao-locacao',
    titulo: 'Compra e Venda, Doação & Locação',
    subtitulo: 'Disposições gerais, retrovenda, preferência, venda sobre documentos, doação e locação de coisas',
    artigoInicio: 481,
    artigoFim: 578,
    rotuloFaixa: 'Arts. 481 ao 578',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Espécies Contratuais',
  },
  {
    id: 'cc-emprestimos-servicos',
    titulo: 'Empréstimos, Serviços, Empreitada & Depósito',
    subtitulo: 'Comodato, mútuo civil, prestação de serviços, contrato de empreitada e depósito necessário',
    artigoInicio: 579,
    artigoFim: 652,
    rotuloFaixa: 'Arts. 579 ao 652',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Contratos de Utilidade',
  },
  {
    id: 'cc-mandato-comissao-transporte',
    titulo: 'Mandato, Comissão, Corretagem & Transporte',
    subtitulo: 'Procuração, poderes, obrigações do mandatário, comissão mercantil, corretagem e transporte de coisas e pessoas',
    artigoInicio: 653,
    artigoFim: 756,
    rotuloFaixa: 'Arts. 653 ao 756',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Intermediação',
  },
  {
    id: 'cc-seguro-fianca-transacao',
    titulo: 'Contrato de Seguro, Fiança & Transação',
    subtitulo: 'Seguro de dano, seguro de pessoa, obrigações do segurador, fiança civil e transação jurídica',
    artigoInicio: 757,
    artigoFim: 853,
    rotuloFaixa: 'Arts. 757 ao 853',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Garantias & Soluções',
  },
  {
    id: 'cc-atos-unilaterais-titulos',
    titulo: 'Atos Unilaterais, Títulos de Crédito & Pagamento Indevido',
    subtitulo: 'Promessa de recompensa, enriquecimento sem causa, gestão de negócios e regime geral dos títulos',
    artigoInicio: 854,
    artigoFim: 926,
    rotuloFaixa: 'Arts. 854 ao 926',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Atos Unilaterais',
  },
  {
    id: 'cc-responsabilidade-civil',
    titulo: 'Responsabilidade Civil & Liquidação do Dano',
    subtitulo: 'Obrigação de indenizar, responsabilidade objetiva e subjetiva, dano moral, material e lucros cessantes',
    artigoInicio: 927,
    artigoFim: 954,
    rotuloFaixa: 'Arts. 927 ao 954',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Indenização',
  },

  // DIREITO DE EMPRESA
  {
    id: 'cc-direito-empresa-geral',
    titulo: 'Direito de Empresa: Do Empresário & Sociedades Simples',
    subtitulo: 'Conceito de empresário, capacidade, registro, sociedades não personificadas e sociedade simples',
    artigoInicio: 966,
    artigoFim: 1051,
    rotuloFaixa: 'Arts. 966 ao 1.051',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Empresarial',
  },
  {
    id: 'cc-sociedades-limitadas',
    titulo: 'Sociedade Limitada, Dissolução & Estabelecimento',
    subtitulo: 'Quotas sociais, deliberação dos sócios, administração, retirada, dissolução e trespasse do estabelecimento',
    artigoInicio: 1052,
    artigoFim: 1195,
    rotuloFaixa: 'Arts. 1.052 ao 1.195',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Sociedades',
  },

  // DIREITO DAS COISAS
  {
    id: 'cc-posse',
    titulo: 'Da Posse: Aquisição, Efeitos & Interditos',
    subtitulo: 'Classificação da posse, detenção, posse de boa-fé, benfeitorias e interditos possessórios',
    artigoInicio: 1196,
    artigoFim: 1227,
    rotuloFaixa: 'Arts. 1.196 ao 1.227',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Posse',
  },
  {
    id: 'cc-propriedade-usucapiao',
    titulo: 'Da Propriedade, Usucapião & Condomínio',
    subtitulo: 'Faculdades do proprietário, usucapião extraordinária, ordinária, especial urbana e rural, desapropriação e condomínio edilício',
    artigoInicio: 1228,
    artigoFim: 1368,
    rotuloFaixa: 'Arts. 1.228 ao 1.368-F',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Propriedade',
  },
  {
    id: 'cc-direitos-reais-coisa-alheia',
    titulo: 'Direitos Reais sobre Coisas Alheias & Laje',
    subtitulo: 'Superfície, servidões prediais, usufruto, uso, habitação, promessa de compra e venda e direito real de laje',
    artigoInicio: 1369,
    artigoFim: 1418,
    rotuloFaixa: 'Arts. 1.369 ao 1.418',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Direitos Reais',
  },
  {
    id: 'cc-garantias-reais',
    titulo: 'Direitos Reais de Garantia (Hipoteca & Penhor)',
    subtitulo: 'Penhor legal e convencional, hipoteca judiciária e voluntária, anticrese e alienação fiduciária em garantia',
    artigoInicio: 1419,
    artigoFim: 1510,
    rotuloFaixa: 'Arts. 1.419 ao 1.510-E',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Garantias Reais',
  },

  // DIREITO DE FAMÍLIA
  {
    id: 'cc-casamento-dissolucao',
    titulo: 'Do Casamento & Dissolução da Sociedade Conjugal',
    subtitulo: 'Habilitação, celebração, causas suspensivas, invalidade do matrimônio, divórcio e separação',
    artigoInicio: 1511,
    artigoFim: 1590,
    rotuloFaixa: 'Arts. 1.511 ao 1.590',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Família & Casamento',
  },
  {
    id: 'cc-parentesco-filiacao',
    titulo: 'Parentesco, Filiação & Poder Familiar',
    subtitulo: 'Linhas de parentesco, presunção de paternidade, reconhecimento de filhos, adoção e suspensão/perda do poder familiar',
    artigoInicio: 1591,
    artigoFim: 1638,
    rotuloFaixa: 'Arts. 1.591 ao 1.638',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Filiação',
  },
  {
    id: 'cc-regime-bens-alimentos',
    titulo: 'Regime de Bens, Alimentos & União Estável',
    subtitulo: 'Comunhão parcial, universal, separação obrigatória/convencional, obrigação alimentar, exoneração e entidade familiar',
    artigoInicio: 1639,
    artigoFim: 1727,
    rotuloFaixa: 'Arts. 1.639 ao 1.727',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Bens & Alimentos',
  },
  {
    id: 'cc-tutela-curatela',
    titulo: 'Tutela, Curatela & Decisão Apoiada',
    subtitulo: 'Incapacidade, nomeação de tutor e curador, administração patrimonial e processo de tomada de decisão apoiada',
    artigoInicio: 1728,
    artigoFim: 1783,
    rotuloFaixa: 'Arts. 1.728 ao 1.783-A',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Proteção Jurídica',
  },

  // DIREITO DAS SUCESSÕES
  {
    id: 'cc-sucessoes-geral-legitima',
    titulo: 'Sucessão em Geral & Sucessão Legítima',
    subtitulo: 'Abertura da sucessão, aceitação, renúncia, indignidade, deserdados e ordem de vocação hereditária',
    artigoInicio: 1784,
    artigoFim: 1856,
    rotuloFaixa: 'Arts. 1.784 ao 1.856',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Sucessões',
  },
  {
    id: 'cc-sucessao-testamentaria',
    titulo: 'Sucessão Testamentária, Legados & Inventário',
    subtitulo: 'Testamento público, cerrado, particular, codicilo, disposições testamentárias, colação e partilha de bens',
    artigoInicio: 1857,
    artigoFim: 2027,
    rotuloFaixa: 'Arts. 1.857 ao 2.027',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Testamentos & Partilha',
  },
  {
    id: 'cc-disposicoes-finais',
    titulo: 'Disposições Finais e Transitórias',
    subtitulo: 'Regras de transição normativa, prazos em curso e aplicação temporal do Código Civil',
    artigoInicio: 2028,
    artigoFim: 2046,
    rotuloFaixa: 'Arts. 2.028 ao 2.046',
    capaUrl: '/assets/cc-couple.webp',
    badge: 'Disposições Finais',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTITUIÇÃO FEDERAL DE 1988 (CF/88) — CAPÍTULOS OFICIAIS
// ─────────────────────────────────────────────────────────────────────────────
const CAPITULOS_CF88: CapituloDef[] = [
  {
    id: 'cf-principios',
    titulo: 'Princípios Fundamentais',
    subtitulo: 'Fundamentos da República, separação dos poderes, objetivos fundamentais e relações internacionais',
    artigoInicio: 1,
    artigoFim: 4,
    rotuloFaixa: 'Arts. 1º ao 4º',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Princípios',
  },
  {
    id: 'cf-direitos-individuais',
    titulo: 'Direitos e Deveres Individuais e Coletivos',
    subtitulo: 'Artigo 5º e incisos: vida, liberdade, igualdade, segurança, propriedade e remédios constitucionais',
    artigoInicio: 5,
    artigoFim: 5,
    rotuloFaixa: 'Art. 5º (Todos os Incisos)',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Direitos Fundamentais',
  },
  {
    id: 'cf-direitos-sociais-nacionalidade',
    titulo: 'Direitos Sociais, Nacionalidade & Cidadania',
    subtitulo: 'Trabalho, saúde, educação, moradia, segurança, previdência, brasileiros natos e naturalizados',
    artigoInicio: 6,
    artigoFim: 13,
    rotuloFaixa: 'Arts. 6º ao 13',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Cidadania',
  },
  {
    id: 'cf-direitos-politicos',
    titulo: 'Direitos Políticos & Partidos Políticos',
    subtitulo: 'Soberania popular, sufrágio, voto, elegibilidade, inelegibilidades e criação de partidos',
    artigoInicio: 14,
    artigoFim: 17,
    rotuloFaixa: 'Arts. 14 ao 17',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Política',
  },
  {
    id: 'cf-organizacao-estado',
    titulo: 'Organização do Estado & Entes Federativos',
    subtitulo: 'União, Estados, Distrito Federal, Municípios, territórios e repartição de competências',
    artigoInicio: 18,
    artigoFim: 36,
    rotuloFaixa: 'Arts. 18 ao 36',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Federação',
  },
  {
    id: 'cf-administracao-publica',
    titulo: 'Administração Pública & Servidores',
    subtitulo: 'Princípios da legalidade, impessoalidade, moralidade, publicidade, eficiência e estabilidade',
    artigoInicio: 37,
    artigoFim: 43,
    rotuloFaixa: 'Arts. 37 ao 43',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Serviço Público',
  },
  {
    id: 'cf-poder-legislativo',
    titulo: 'Poder Legislativo & Processo Legislativo',
    subtitulo: 'Congresso Nacional, Câmara, Senado, deputados, senadores e elaboração de emendas e leis',
    artigoInicio: 44,
    artigoFim: 75,
    rotuloFaixa: 'Arts. 44 ao 75',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Legislativo',
  },
  {
    id: 'cf-poder-executivo',
    titulo: 'Poder Executivo & Atribuições Presidenciais',
    subtitulo: 'Presidente e Vice-Presidente, eleição, posse, prerrogativas, ministros e Conselho da República',
    artigoInicio: 76,
    artigoFim: 91,
    rotuloFaixa: 'Arts. 76 ao 91',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Executivo',
  },
  {
    id: 'cf-poder-judiciario',
    titulo: 'Poder Judiciário, STF, CNJ & Tribunais',
    subtitulo: 'Garantias da magistratura, competências do STF, STJ, Justiça Federal, Justiça do Trabalho e Tribunais',
    artigoInicio: 92,
    artigoFim: 126,
    rotuloFaixa: 'Arts. 92 ao 126',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Judiciário',
  },
  {
    id: 'cf-funcoes-essenciais',
    titulo: 'Funções Essenciais à Justiça',
    subtitulo: 'Ministério Público, Advocacia Pública, Advocacia Privada e Defensoria Pública',
    artigoInicio: 127,
    artigoFim: 135,
    rotuloFaixa: 'Arts. 127 ao 135',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Funções Essenciais',
  },
  {
    id: 'cf-defesa-seguranca',
    titulo: 'Defesa do Estado & Segurança Pública',
    subtitulo: 'Estado de defesa, estado de sítio, Forças Armadas, Polícia Federal, Polícias Civis e Militares',
    artigoInicio: 136,
    artigoFim: 144,
    rotuloFaixa: 'Arts. 136 ao 144',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Segurança',
  },
  {
    id: 'cf-tributacao-orcamento',
    titulo: 'Sistema Tributário Nacional & Finanças',
    subtitulo: 'Princípios tributários, limitações ao poder de tributar, impostos da União, Estados e Municípios e orçamento',
    artigoInicio: 145,
    artigoFim: 169,
    rotuloFaixa: 'Arts. 145 ao 169',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Tributário',
  },
  {
    id: 'cf-ordem-economica',
    titulo: 'Da Ordem Econômica e Financeira',
    subtitulo: 'Livre iniciativa, função social da propriedade, política urbana, agrícola, fundiária e sistema financeiro',
    artigoInicio: 170,
    artigoFim: 192,
    rotuloFaixa: 'Arts. 170 ao 192',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Economia',
  },
  {
    id: 'cf-ordem-social',
    titulo: 'Da Ordem Social: Seguridade, Saúde & Família',
    subtitulo: 'Previdência, assistência social, saúde pública (SUS), educação, cultura, desporto, meio ambiente e indígenas',
    artigoInicio: 193,
    artigoFim: 250,
    rotuloFaixa: 'Arts. 193 ao 250',
    capaUrl: '/assets/cf88-cover.webp',
    badge: 'Ordem Social',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ESTATUTO DA OAB (Lei 8.906/1994) — CAPÍTULOS OFICIAIS
// ─────────────────────────────────────────────────────────────────────────────
const CAPITULOS_EOAB: CapituloDef[] = [
  {
    id: 'eoab-atividade-advocacia',
    titulo: 'Da Atividade de Advocacia & Postulação',
    subtitulo: 'Atos privativos de advocacia, mandato judicial, procuração e responsabilidade profissional',
    artigoInicio: 1,
    artigoFim: 5,
    rotuloFaixa: 'Arts. 1º ao 5º',
    capaUrl: '/assets/eoab-woman.webp',
    badge: 'Atividade Privativa',
  },
  {
    id: 'eoab-direitos-prerrogativas',
    titulo: 'Direitos e Prerrogativas do Advogado',
    subtitulo: 'Inviolabilidade do escritório, comunicação com clientes presos, presença em audiências e desagravo público',
    artigoInicio: 6,
    artigoFim: 7,
    rotuloFaixa: 'Arts. 6º ao 7º-B',
    capaUrl: '/assets/eoab-woman.webp',
    badge: 'Prerrogativas',
  },
  {
    id: 'eoab-inscricao',
    titulo: 'Da Inscrição nos Quadros da OAB',
    subtitulo: 'Requisitos para inscrição principal e suplementar, cancelamento, licença e estágio profissional',
    artigoInicio: 8,
    artigoFim: 14,
    rotuloFaixa: 'Arts. 8º ao 14',
    capaUrl: '/assets/eoab-woman.webp',
    badge: 'Inscrição',
  },
  {
    id: 'eoab-sociedade-empregado',
    titulo: 'Sociedade de Advogados & Advogado Empregado',
    subtitulo: 'Constituição de sociedade individual e pluripessoal, vínculo empregatício e honorários de sucumbência',
    artigoInicio: 15,
    artigoFim: 21,
    rotuloFaixa: 'Arts. 15 ao 21',
    capaUrl: '/assets/eoab-woman.webp',
    badge: 'Sociedades',
  },
  {
    id: 'eoab-honorarios',
    titulo: 'Dos Honorários Advocatícios',
    subtitulo: 'Honorários convencionados, sucumbenciais, arbitramento judicial, prescrição e execução autônoma',
    artigoInicio: 22,
    artigoFim: 26,
    rotuloFaixa: 'Arts. 22 ao 26',
    capaUrl: '/assets/eoab-woman.webp',
    badge: 'Honorários',
  },
  {
    id: 'eoab-incompatibilidades',
    titulo: 'Das Incompatibilidades & Impedimentos',
    subtitulo: 'Proibição total ou parcial para exercício da advocacia por ocupantes de cargos públicos',
    artigoInicio: 27,
    artigoFim: 30,
    rotuloFaixa: 'Arts. 27 ao 30',
    capaUrl: '/assets/eoab-woman.webp',
    badge: 'Impedimentos',
  },
  {
    id: 'eoab-etica-disciplina',
    titulo: 'Da Ética, Infrações & Sanções Disciplinares',
    subtitulo: 'Deveres éticos, infrações disciplinares, censura, suspensão, exclusão, multa e processo disciplinar',
    artigoInicio: 31,
    artigoFim: 43,
    rotuloFaixa: 'Arts. 31 ao 43',
    capaUrl: '/assets/eoab-woman.webp',
    badge: 'Ética & Disciplina',
  },
  {
    id: 'eoab-orgaos-eleicoes',
    titulo: 'Dos Órgãos da OAB, Eleições & Mandatos',
    subtitulo: 'Conselho Federal, Conselhos Seccionais, Subseções, Caixa de Assistência e processo eleitoral',
    artigoInicio: 44,
    artigoFim: 87,
    rotuloFaixa: 'Arts. 44 ao 87',
    capaUrl: '/assets/eoab-woman.webp',
    badge: 'Organização OAB',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGO DE DEFESA DO CONSUMIDOR (CDC - Lei 8.078/1990) — CAPÍTULOS OFICIAIS
// ─────────────────────────────────────────────────────────────────────────────
const CAPITULOS_CDC: CapituloDef[] = [
  {
    id: 'cdc-direitos-basicos',
    titulo: 'Direitos Básicos do Consumidor',
    subtitulo: 'Conceito de consumidor, fornecedor, produto, serviço e princípios protetivos',
    artigoInicio: 1,
    artigoFim: 7,
    rotuloFaixa: 'Arts. 1º ao 7º',
    capaUrl: '/assets/cdc-girl.webp',
    badge: 'Direitos Básicos',
  },
  {
    id: 'cdc-responsabilidade-defeitos',
    titulo: 'Responsabilidade por Fato & Vício do Produto',
    subtitulo: 'Acidente de consumo, defeito, vício de qualidade/quantidade, prazos decadenciais e garantias',
    artigoInicio: 8,
    artigoFim: 28,
    rotuloFaixa: 'Arts. 8º ao 28',
    capaUrl: '/assets/cdc-girl.webp',
    badge: 'Responsabilidade',
  },
  {
    id: 'cdc-praticas-comerciais',
    titulo: 'Práticas Comerciais, Oferta & Publicidade',
    subtitulo: 'Vinculação da oferta, publicidade enganosa, publicidade abusiva e práticas abusivas vedadas',
    artigoInicio: 29,
    artigoFim: 45,
    rotuloFaixa: 'Arts. 29 ao 45',
    capaUrl: '/assets/cdc-girl.webp',
    badge: 'Publicidade & Oferta',
  },
  {
    id: 'cdc-protecao-contratual',
    titulo: 'Proteção Contratual & Cláusulas Abusivas',
    subtitulo: 'Contratos de adesão, cláusulas nulas de pleno direito e direito de arrependimento',
    artigoInicio: 46,
    artigoFim: 54,
    rotuloFaixa: 'Arts. 46 ao 54',
    capaUrl: '/assets/cdc-girl.webp',
    badge: 'Contratos de Consumo',
  },
  {
    id: 'cdc-superendividamento',
    titulo: 'Prevenção e Tratamento do Superendividamento',
    subtitulo: 'Crédito responsável, mínimo existencial, repactuação de dívidas e conciliação em bloco',
    artigoInicio: 54,
    artigoFim: 54,
    rotuloFaixa: 'Arts. 54-A ao 54-G',
    capaUrl: '/assets/cdc-girl.webp',
    badge: 'Superendividamento',
  },
  {
    id: 'cdc-sancoes-penais',
    titulo: 'Sanções Administrativas & Crimes nas Relações de Consumo',
    subtitulo: 'Multas, apreensão, cassação e crimes contra as relações de consumo com penas privativas',
    artigoInicio: 55,
    artigoFim: 80,
    rotuloFaixa: 'Arts. 55 ao 80',
    capaUrl: '/assets/cdc-girl.webp',
    badge: 'Sanções & Crimes',
  },
  {
    id: 'cdc-defesa-juizo',
    titulo: 'Defesa do Consumidor em Juízo & Ações Coletivas',
    subtitulo: 'Ações individuais, coletivas, tutela de direitos difusos, coletivos e individuais homogêneos',
    artigoInicio: 81,
    artigoFim: 119,
    rotuloFaixa: 'Arts. 81 ao 119',
    capaUrl: '/assets/cdc-girl.webp',
    badge: 'Processo Coletivo',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGO DE PROCESSO PENAL (CPP)
// ─────────────────────────────────────────────────────────────────────────────
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
    titulo: 'Procedimento Comum & Tribunal do Júri',
    subtitulo: 'Instrução criminal, pronúncia, impronúncia, absolvição sumária e julgamento em plenário',
    artigoInicio: 394,
    artigoFim: 497,
    rotuloFaixa: 'Arts. 394 ao 497',
    capaUrl: '/assets/cpp-court.webp',
    badge: 'Solenidade do Júri',
  },
  {
    id: 'cpp-procedimentos-especiais',
    titulo: 'Procedimentos Especiais',
    subtitulo: 'Crimes de funcionários públicos, crimes contra a honra, propriedade imaterial e falimentares',
    artigoInicio: 498,
    artigoFim: 562,
    rotuloFaixa: 'Arts. 498 ao 562',
    capaUrl: capaProcessoPenal,
    badge: 'Ritos Especiais',
  },
  {
    id: 'cpp-nulidades',
    titulo: 'Nulidades Processuais',
    subtitulo: 'Nulidades absolutas e relativas, prejuízo, preclusão e sanação dos atos defeituosos',
    artigoInicio: 563,
    artigoFim: 573,
    rotuloFaixa: 'Arts. 563 ao 573',
    capaUrl: '/assets/homem-preso-novo.webp',
    badge: 'Vícios do Processo',
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
    titulo: 'Habeas Corpus & Revisão Criminal',
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

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGO PENAL (CP - Dec-Lei 2.848/1940)
// ─────────────────────────────────────────────────────────────────────────────
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

  // 1. CÓDIGO CIVIL
  if (slug === 'cc' || slug.includes('codigo-civil') || (slug.includes('civil') && !slug.includes('processo'))) {
    return CAPITULOS_CC;
  }

  // 2. CONSTITUIÇÃO FEDERAL
  if (slug === 'cf' || slug === 'cf88' || slug.includes('constitu')) {
    return CAPITULOS_CF88;
  }

  // 3. CÓDIGO DE PROCESSO PENAL
  if (slug === 'cpp' || slug.includes('processo-penal') || slug.includes('processopenal')) {
    return CAPITULOS_CPP;
  }

  // 4. CÓDIGO PENAL
  if (slug === 'cp' || (slug.includes('penal') && !slug.includes('processo'))) {
    return CAPITULOS_CP;
  }

  // 5. ESTATUTO DA OAB
  if (slug === 'eoab' || slug === 'oab' || slug.includes('estatuto-oab') || slug.includes('advocacia')) {
    return CAPITULOS_EOAB;
  }

  // 6. CÓDIGO DE DEFESA DO CONSUMIDOR
  if (slug === 'cdc' || slug.includes('consumidor')) {
    return CAPITULOS_CDC;
  }

  // Fallback estruturado para leis que não têm mapeamento manual:
  // Em vez de "Parte 1, Parte 2", usa blocos temáticos inteligentes de Título / Capítulo
  const tamanhoBloco = 50;
  const totalBase = totalArtigos > 0 ? totalArtigos : 100;
  const numCapitulos = Math.max(1, Math.ceil(totalBase / tamanhoBloco));
  const fallbackCapitulos: CapituloDef[] = [];
  const capaPadrao = getLeiCover(leiSlug);

  for (let i = 0; i < numCapitulos; i++) {
    const ini = i * tamanhoBloco + 1;
    const fim = Math.min((i + 1) * tamanhoBloco, totalBase);
    fallbackCapitulos.push({
      id: `${slug}-cap-${i + 1}`,
      titulo: `Capítulo ${i + 1}: Artigos ${ini} ao ${fim}`,
      subtitulo: `Disposições normativas e artigos da faixa ${ini} a ${fim}`,
      artigoInicio: ini,
      artigoFim: fim,
      rotuloFaixa: `Arts. ${ini} ao ${fim}`,
      capaUrl: capaPadrao,
      badge: `Capítulo ${i + 1}`,
    });
  }

  return fallbackCapitulos;
}

/**
 * Converte um número textual de artigo (ex: "Art. 155", "155", "Art. 1.000", "Art. 359-A") para número inteiro para conferência
 */
export function extrairNumeroArtigo(artigoStr: string): number {
  if (!artigoStr) return 0;
  const semPontos = String(artigoStr).replace(/\./g, '');
  const match = semPontos.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}
